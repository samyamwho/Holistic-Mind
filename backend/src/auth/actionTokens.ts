import { createHmac, randomInt } from "node:crypto";
import type { PoolClient } from "pg";
import { config } from "../config.js";

export type AuthActionPurpose = "verify_email" | "reset_password";

export function createActionCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashActionCode(email: string, code: string, purpose: AuthActionPurpose) {
  return createHmac("sha256", config.ACCESS_TOKEN_SECRET)
    .update(`${purpose}:${email.trim().toLowerCase()}:${code}`)
    .digest("hex");
}

export async function storeActionCode(
  client: PoolClient,
  userId: string,
  email: string,
  purpose: AuthActionPurpose,
  ttlMinutes: number
) {
  const code = createActionCode();
  await client.query(
    `UPDATE auth_action_tokens SET consumed_at = NOW()
     WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL`,
    [userId, purpose]
  );
  await client.query(
    `INSERT INTO auth_action_tokens (user_id, purpose, token_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + ($4 * INTERVAL '1 minute'))`,
    [userId, purpose, hashActionCode(email, code, purpose), ttlMinutes]
  );
  return code;
}
