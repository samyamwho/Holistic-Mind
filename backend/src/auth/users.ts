import { pool, serializeAuthUser, type AuthUserRow } from "../db.js";

export async function getAuthUser(userId: string) {
  const result = await pool.query<AuthUserRow>(
    `
      SELECT
        users.id,
        users.email,
        users.password_hash,
        users.created_at,
        users.updated_at,
        user_profiles.name,
        user_profiles.daily_reminder,
        user_profiles.practice_reminder,
        user_profiles.haptics
      FROM users
      INNER JOIN user_profiles ON user_profiles.user_id = users.id
      WHERE users.id = $1 AND users.status = 'active'
    `,
    [userId]
  );

  return result.rows[0] ?? null;
}

export async function getAuthUserByEmail(email: string) {
  const result = await pool.query<AuthUserRow>(
    `
      SELECT
        users.id,
        users.email,
        users.password_hash,
        users.created_at,
        users.updated_at,
        user_profiles.name,
        user_profiles.daily_reminder,
        user_profiles.practice_reminder,
        user_profiles.haptics
      FROM users
      INNER JOIN user_profiles ON user_profiles.user_id = users.id
      WHERE users.email = $1 AND users.status = 'active'
    `,
    [email]
  );

  return result.rows[0] ?? null;
}

export function serializeSessionUser(row: AuthUserRow) {
  return serializeAuthUser(row);
}
