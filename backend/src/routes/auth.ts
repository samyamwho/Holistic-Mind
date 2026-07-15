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
        INSERT INTO users (email, password_hash)
        VALUES ($1, $2)
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
    await client.query("COMMIT");
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

    const passwordMatches = await verifyPassword(user.password_hash, parsedBody.data.password);
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
