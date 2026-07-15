import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { jwtVerify, SignJWT } from "jose";
import { config } from "../config.js";
import { pool } from "../db.js";

const issuer = "holistic-mind-api";
const audience = "holistic-mind-mobile";
const accessTokenSecret = new TextEncoder().encode(config.ACCESS_TOKEN_SECRET);

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
};

function createRefreshToken() {
  return randomBytes(48).toString("base64url");
}

function hashRefreshToken(refreshToken: string) {
  return createHash("sha256").update(refreshToken).digest("hex");
}

function getRefreshExpiry() {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + config.REFRESH_TOKEN_TTL_DAYS);
  return expiresAt;
}

async function createAccessToken(userId: string) {
  return new SignJWT({ tokenType: "access" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(issuer)
    .setAudience(audience)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${config.ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(accessTokenSecret);
}

export async function issueTokenPair(client: PoolClient, userId: string): Promise<AuthTokens> {
  const refreshToken = createRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);

  await client.query(
    `
      INSERT INTO auth_sessions (user_id, refresh_token_hash, expires_at)
      VALUES ($1, $2, $3)
    `,
    [userId, refreshTokenHash, getRefreshExpiry()]
  );

  return {
    accessToken: await createAccessToken(userId),
    refreshToken,
    accessTokenExpiresInSeconds: config.ACCESS_TOKEN_TTL_SECONDS,
  };
}

export async function rotateRefreshToken(refreshToken: string) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await client.query<{ id: string; user_id: string }>(
      `
        SELECT id, user_id
        FROM auth_sessions
        WHERE refresh_token_hash = $1
          AND revoked_at IS NULL
          AND expires_at > NOW()
        FOR UPDATE
      `,
      [hashRefreshToken(refreshToken)]
    );
    const session = result.rows[0];

    if (!session) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query("UPDATE auth_sessions SET revoked_at = NOW() WHERE id = $1", [session.id]);
    const tokens = await issueTokenPair(client, session.user_id);
    await client.query("COMMIT");

    return { userId: session.user_id, tokens };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function revokeRefreshToken(refreshToken: string) {
  await pool.query(
    `
      UPDATE auth_sessions
      SET revoked_at = COALESCE(revoked_at, NOW())
      WHERE refresh_token_hash = $1
    `,
    [hashRefreshToken(refreshToken)]
  );
}

export async function verifyAccessToken(accessToken: string) {
  const { payload } = await jwtVerify(accessToken, accessTokenSecret, {
    algorithms: ["HS256"],
    issuer,
    audience,
  });

  if (payload.tokenType !== "access" || !payload.sub) {
    throw new Error("Invalid access token");
  }

  return payload.sub;
}
