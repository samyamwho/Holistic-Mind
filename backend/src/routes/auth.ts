import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { hashPassword, performDummyPasswordCheck, verifyPassword } from "../auth/passwords.js";
import {
  issueTokenPair,
  revokeRefreshToken,
  rotateRefreshToken,
} from "../auth/tokens.js";
import {
  getAuthUser,
  getAuthUserByEmail,
  serializeSessionUser,
} from "../auth/users.js";
import { pool, type AuthUserRow } from "../db.js";
import { authenticate } from "../middleware/authenticate.js";
import { hashActionCode, storeActionCode } from "../auth/actionTokens.js";
import { sendPasswordResetCode, sendVerificationCode } from "../auth/email.js";
import { OAuth2Client } from "google-auth-library";
import { config } from "../config.js";

const emailSchema = z.email().max(254).transform((email) => email.trim().toLowerCase());
const passwordSchema = z.string().min(8).max(128);
const nameSchema = z.string().trim().min(1).max(80);

const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(32).max(500),
});
const codeSchema = z.string().regex(/^\d{6}$/);
const verifyEmailSchema = z.object({ code: codeSchema });
const forgotPasswordSchema = z.object({ email: emailSchema });
const resetPasswordSchema = z.object({ email: emailSchema, code: codeSchema, newPassword: passwordSchema });
const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordSchema });
const googleSchema = z.object({ idToken: z.string().min(100).max(10000) });

const profileUpdateSchema = z
  .object({
    name: nameSchema.optional(),
    preferences: z
      .object({
        dailyReminder: z.boolean().optional(),
        practiceReminder: z.boolean().optional(),
        haptics: z.boolean().optional(),
      })
      .optional(),
  })
  .refine((value) => value.name !== undefined || value.preferences !== undefined);

const authAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_request, response) => {
    response.status(429).json({ error: "Too many attempts. Please try again later." });
  },
});

export const authRouter = Router();
const googleClient = new OAuth2Client();

authRouter.post("/google", authAttemptLimiter, async (request, response, next) => {
  const parsed = googleSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: "Invalid Google sign-in response." }); return; }
  if (!config.GOOGLE_WEB_CLIENT_ID) { response.status(503).json({ error: "Google sign-in is not configured." }); return; }
  const client = await pool.connect();
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: parsed.data.idToken, audience: config.GOOGLE_WEB_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || !payload.email_verified) {
      response.status(401).json({ error: "Google could not verify this email address." }); return;
    }
    const email = payload.email.trim().toLowerCase();
    await client.query("BEGIN");
    const identity = await client.query<{ user_id: string }>(
      "SELECT user_id FROM auth_identities WHERE provider = 'google' AND provider_subject = $1 FOR UPDATE",
      [payload.sub]
    );
    let userId = identity.rows[0]?.user_id;
    let createdNewUser = false;
    if (!userId) {
      const existing = await client.query<{ id: string }>("SELECT id FROM users WHERE email = $1 AND status = 'active' FOR UPDATE", [email]);
      if (existing.rows[0]) {
        const googleIsAuthoritative = email.endsWith("@gmail.com") || Boolean(payload.hd);
        if (!googleIsAuthoritative) {
          await client.query("ROLLBACK");
          response.status(409).json({ error: "Log in with your password first before connecting this Google account." }); return;
        }
        userId = existing.rows[0].id;
        await client.query("UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW()), updated_at = NOW() WHERE id = $1", [userId]);
      } else {
        createdNewUser = true;
        const created = await client.query<{ id: string }>(
          "INSERT INTO users (email, password_hash, email_verified_at) VALUES ($1, NULL, NOW()) RETURNING id",
          [email]
        );
        userId = created.rows[0].id;
        await client.query("INSERT INTO user_profiles (user_id, name) VALUES ($1, $2)", [userId, payload.name?.trim() || email.split("@")[0]]);
      }
      await client.query(
        `INSERT INTO auth_identities (user_id, provider, provider_subject, provider_email)
         VALUES ($1, 'google', $2, $3) ON CONFLICT (provider, provider_subject) DO NOTHING`,
        [userId, payload.sub, email]
      );
    }
    const tokens = await issueTokenPair(client, userId);
    await client.query("COMMIT");
    const user = await getAuthUser(userId);
    if (!user) throw new Error("Google user could not be loaded");
    response.json({ data: { ...serializeSessionUser(user), tokens, isNewUser: createdNewUser } });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof Error && /token|audience|issuer|signature/i.test(error.message)) {
      response.status(401).json({ error: "Google sign-in could not be verified." }); return;
    }
    next(error);
  } finally { client.release(); }
});

authRouter.post("/signup", authAttemptLimiter, async (request, response, next) => {
  const parsedBody = signupSchema.safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({ error: "Enter a valid name, email, and password of 8 or more characters." });
    return;
  }

  const client = await pool.connect();

  try {
    const passwordHash = await hashPassword(parsedBody.data.password);
    await client.query("BEGIN");
    const userResult = await client.query<{ id: string }>(
      `
        INSERT INTO users (email, password_hash, email_verified_at)
        VALUES ($1, $2, ${config.AUTO_VERIFY_EMAILS ? "NOW()" : "NULL"})
        RETURNING id
      `,
      [parsedBody.data.email, passwordHash]
    );
    const userId = userResult.rows[0].id;

    await client.query(
      "INSERT INTO user_profiles (user_id, name) VALUES ($1, $2)",
      [userId, parsedBody.data.name]
    );
    const tokens = await issueTokenPair(client, userId);
    const verificationCode = await storeActionCode(client, userId, parsedBody.data.email, "verify_email", 30);
    await client.query("COMMIT");
    await sendVerificationCode(parsedBody.data.email, verificationCode).catch((error) => {
      console.error("Unable to send verification email", error);
    });
    const user = await getAuthUser(userId);

    if (!user) {
      throw new Error("Created user could not be loaded");
    }

    response.status(201).json({ data: { ...serializeSessionUser(user), tokens } });
  } catch (error) {
    await client.query("ROLLBACK");

    if ((error as { code?: string }).code === "23505") {
      response.status(409).json({ error: "An account with this email already exists." });
      return;
    }

    next(error);
  } finally {
    client.release();
  }
});

authRouter.post("/email/resend", authAttemptLimiter, authenticate, async (_request, response, next) => {
  const client = await pool.connect();
  try {
    const user = await getAuthUser(response.locals.userId);
    if (!user) { response.status(404).json({ error: "Account not found." }); return; }
    if (user.email_verified_at) { response.json({ data: { message: "Email is already verified." } }); return; }
    await client.query("BEGIN");
    const code = await storeActionCode(client, user.id, user.email, "verify_email", 30);
    await client.query("COMMIT");
    await sendVerificationCode(user.email, code).catch((error) => {
      console.error("Unable to send verification email", error);
    });
    response.json({ data: { message: "A new verification code has been sent." } });
  } catch (error) { await client.query("ROLLBACK"); next(error); } finally { client.release(); }
});

authRouter.post("/email/verify", authAttemptLimiter, authenticate, async (request, response, next) => {
  const parsed = verifyEmailSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: "Enter the 6-digit verification code." }); return; }
  const client = await pool.connect();
  try {
    const user = await getAuthUser(response.locals.userId);
    if (!user) { response.status(404).json({ error: "Account not found." }); return; }
    await client.query("BEGIN");

    const result = await client.query<{ id: string }>(
      `SELECT id FROM auth_action_tokens WHERE user_id = $1 AND purpose = 'verify_email'
       AND token_hash = $2 AND consumed_at IS NULL AND expires_at > NOW() FOR UPDATE`,
      [user.id, hashActionCode(user.email, parsed.data.code, "verify_email")]
    );

    if (!result.rows[0]) {
      await client.query("ROLLBACK");
      response.status(400).json({ error: "That code is invalid or has expired." });
      return;
    }

    await client.query("UPDATE auth_action_tokens SET consumed_at = NOW() WHERE id = $1", [result.rows[0].id]);
    await client.query("UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW()), updated_at = NOW() WHERE id = $1", [user.id]);
    await client.query("COMMIT");
    const updated = await getAuthUser(user.id);
    response.json({ data: serializeSessionUser(updated!) });
  } catch (error) { await client.query("ROLLBACK"); next(error); } finally { client.release(); }
});

authRouter.post("/password/forgot", authAttemptLimiter, async (request, response, next) => {
  const parsed = forgotPasswordSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: "Enter a valid email address." }); return; }
  try {
    const user = await getAuthUserByEmail(parsed.data.email);
    if (user) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const code = await storeActionCode(client, user.id, user.email, "reset_password", 15);
        await client.query("COMMIT");
        await sendPasswordResetCode(user.email, code).catch((error) => {
          console.error("Unable to send password reset email", error);
        });
      } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    }
    response.json({ data: { message: "If an account exists, a reset code has been sent." } });
  } catch (error) { next(error); }
});

authRouter.post("/password/reset", authAttemptLimiter, async (request, response, next) => {
  const parsed = resetPasswordSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: "Enter a valid code and password of 8 or more characters." }); return; }
  const client = await pool.connect();
  try {
    const user = await getAuthUserByEmail(parsed.data.email);
    if (!user) { await performDummyPasswordCheck(parsed.data.newPassword); response.status(400).json({ error: "That code is invalid or has expired." }); return; }
    await client.query("BEGIN");
    const result = await client.query<{ id: string }>(
      `SELECT id FROM auth_action_tokens WHERE user_id = $1 AND purpose = 'reset_password'
       AND token_hash = $2 AND consumed_at IS NULL AND expires_at > NOW() FOR UPDATE`,
      [user.id, hashActionCode(user.email, parsed.data.code, "reset_password")]
    );
    if (!result.rows[0]) { await client.query("ROLLBACK"); response.status(400).json({ error: "That code is invalid or has expired." }); return; }
    const passwordHash = await hashPassword(parsed.data.newPassword);
    await client.query("UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1", [user.id, passwordHash]);
    await client.query("UPDATE auth_action_tokens SET consumed_at = NOW() WHERE id = $1", [result.rows[0].id]);
    await client.query("UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, NOW()) WHERE user_id = $1", [user.id]);
    await client.query("COMMIT");
    response.json({ data: { message: "Your password has been reset. You can now log in." } });
  } catch (error) { await client.query("ROLLBACK"); next(error); } finally { client.release(); }
});

authRouter.post("/login", authAttemptLimiter, async (request, response, next) => {
  const parsedBody = loginSchema.safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({ error: "Enter a valid email and password." });
    return;
  }

  try {
    const user = await getAuthUserByEmail(parsedBody.data.email);

    if (!user) {
      await performDummyPasswordCheck(parsedBody.data.password);
      response.status(401).json({ error: "Email or password is incorrect." });
      return;
    }

    const passwordMatches = user.password_hash
      ? await verifyPassword(user.password_hash, parsedBody.data.password)
      : (await performDummyPasswordCheck(parsedBody.data.password), false);
    if (!passwordMatches) {
      response.status(401).json({ error: "Email or password is incorrect." });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const tokens = await issueTokenPair(client, user.id);
      await client.query("COMMIT");
      response.json({ data: { ...serializeSessionUser(user), tokens } });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

authRouter.post("/refresh", async (request, response, next) => {
  const parsedBody = refreshSchema.safeParse(request.body);

  if (!parsedBody.success) {
    response.status(401).json({ error: "Invalid refresh session." });
    return;
  }

  try {
    const rotated = await rotateRefreshToken(parsedBody.data.refreshToken);
    if (!rotated) {
      response.status(401).json({ error: "Refresh session expired." });
      return;
    }

    const user = await getAuthUser(rotated.userId);
    if (!user) {
      response.status(401).json({ error: "Account is unavailable." });
      return;
    }

    response.json({ data: { ...serializeSessionUser(user), tokens: rotated.tokens } });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", async (request, response, next) => {
  const parsedBody = refreshSchema.safeParse(request.body);

  if (!parsedBody.success) {
    response.status(204).end();
    return;
  }

  try {
    await revokeRefreshToken(parsedBody.data.refreshToken);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", authenticate, async (_request, response, next) => {
  try {
    const user = await getAuthUser(response.locals.userId);
    if (!user) {
      response.status(404).json({ error: "Account not found." });
      return;
    }

    response.json({ data: serializeSessionUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.patch("/me", authenticate, async (request, response, next) => {
  const parsedBody = profileUpdateSchema.safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({ error: "Invalid profile update." });
    return;
  }

  try {
    const values = parsedBody.data;
    await pool.query(
      `
        UPDATE user_profiles
        SET
          name = COALESCE($2, name),
          daily_reminder = COALESCE($3, daily_reminder),
          practice_reminder = COALESCE($4, practice_reminder),
          haptics = COALESCE($5, haptics),
          updated_at = NOW()
        WHERE user_id = $1
      `,
      [
        response.locals.userId,
        values.name ?? null,
        values.preferences?.dailyReminder ?? null,
        values.preferences?.practiceReminder ?? null,
        values.preferences?.haptics ?? null,
      ]
    );
    const user = await getAuthUser(response.locals.userId);

    if (!user) {
      response.status(404).json({ error: "Account not found." });
      return;
    }

    response.json({ data: serializeSessionUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.put("/me/password", authAttemptLimiter, authenticate, async (request, response, next) => {
  const parsed = changePasswordSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: "Enter your current password and a new password of 8 or more characters." }); return; }
  try {
    const user = await getAuthUser(response.locals.userId);
    if (!user || !user.password_hash || !(await verifyPassword(user.password_hash, parsed.data.currentPassword))) {
      response.status(401).json({ error: "Current password is incorrect." }); return;
    }
    await pool.query("UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1", [user.id, await hashPassword(parsed.data.newPassword)]);
    response.json({ data: { message: "Password updated." } });
  } catch (error) { next(error); }
});

authRouter.delete("/me", authAttemptLimiter, authenticate, async (request, response, next) => {
  const parsed = z.union([
    z.object({ password: z.string().min(1).max(128) }),
    z.object({ googleIdToken: z.string().min(100).max(10000) }),
  ]).safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: "Confirm your identity to delete your account." }); return; }
  try {
    const user = await getAuthUser(response.locals.userId);
    if (!user) { response.status(404).json({ error: "Account not found." }); return; }
    let confirmed = false;
    if ("password" in parsed.data && user.password_hash) {
      confirmed = await verifyPassword(user.password_hash, parsed.data.password);
    } else if ("googleIdToken" in parsed.data && config.GOOGLE_WEB_CLIENT_ID) {
      const ticket = await googleClient.verifyIdToken({ idToken: parsed.data.googleIdToken, audience: config.GOOGLE_WEB_CLIENT_ID });
      const subject = ticket.getPayload()?.sub;
      const identity = subject ? await pool.query(
        "SELECT 1 FROM auth_identities WHERE user_id = $1 AND provider = 'google' AND provider_subject = $2",
        [user.id, subject]
      ) : null;
      confirmed = Boolean(identity?.rows[0]);
    }
    if (!confirmed) { response.status(401).json({ error: "Identity confirmation failed." }); return; }
    await pool.query("DELETE FROM users WHERE id = $1", [user.id]);
    response.status(204).end();
  } catch (error) { next(error); }
});
