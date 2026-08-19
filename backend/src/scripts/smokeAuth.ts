import assert from "node:assert/strict";
import { config } from "../config.js";
import { pool } from "../db.js";
import { hashActionCode } from "../auth/actionTokens.js";

type JsonResponse<T> = {
  status: number;
  data?: T;
  error?: string;
};

type SessionResponse = {
  user: { id: string; email: string; name: string; emailVerified: boolean };
  preferences: {
    dailyReminder: boolean;
    practiceReminder: boolean;
    haptics: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
};

async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<JsonResponse<T>> {
  const response = await fetch(`${config.API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return { status: response.status };
  }

  const payload = (await response.json()) as { data?: T; error?: string };
  return { status: response.status, ...payload };
}

const suffix = Date.now();
const firstEmail = `auth-smoke-a-${suffix}@example.com`;
const secondEmail = `auth-smoke-b-${suffix}@example.com`;
const password = "Secure test password 42";

try {
  const firstSignup = await api<SessionResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name: "First Test User", email: firstEmail, password }),
  });
  assert.equal(firstSignup.status, 201);
  assert.ok(firstSignup.data);

  const secondSignup = await api<SessionResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name: "Second Test User", email: secondEmail, password }),
  });
  assert.equal(secondSignup.status, 201);
  assert.ok(secondSignup.data);
  assert.notEqual(firstSignup.data.user.id, secondSignup.data.user.id);

  const verificationCode = "123456";
  await pool.query(
    `UPDATE auth_action_tokens SET token_hash = $2
     WHERE id = (SELECT id FROM auth_action_tokens WHERE user_id = $1 AND purpose = 'verify_email' AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1)`,
    [firstSignup.data.user.id, hashActionCode(firstEmail, verificationCode, "verify_email")]
  );
  const verified = await api<SessionResponse>("/api/auth/email/verify", {
    method: "POST",
    headers: { authorization: `Bearer ${firstSignup.data.tokens.accessToken}` },
    body: JSON.stringify({ code: verificationCode }),
  });
  assert.equal(verified.status, 200);
  assert.equal(verified.data?.user.emailVerified, true);

  const wrongLogin = await api<SessionResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: firstEmail, password: "incorrect password" }),
  });
  assert.equal(wrongLogin.status, 401);

  const firstProfile = await api<SessionResponse>("/api/auth/me", {
    headers: { authorization: `Bearer ${firstSignup.data.tokens.accessToken}` },
  });
  assert.equal(firstProfile.status, 200);
  assert.equal(firstProfile.data?.user.email, firstEmail);

  const updatedFirstProfile = await api<SessionResponse>("/api/auth/me", {
    method: "PATCH",
    headers: { authorization: `Bearer ${firstSignup.data.tokens.accessToken}` },
    body: JSON.stringify({
      name: "Updated First User",
      preferences: { practiceReminder: true },
    }),
  });
  assert.equal(updatedFirstProfile.status, 200);
  assert.equal(updatedFirstProfile.data?.user.name, "Updated First User");
  assert.equal(updatedFirstProfile.data?.preferences.practiceReminder, true);

  const unchangedSecondProfile = await api<SessionResponse>("/api/auth/me", {
    headers: { authorization: `Bearer ${secondSignup.data.tokens.accessToken}` },
  });
  assert.equal(unchangedSecondProfile.status, 200);
  assert.equal(unchangedSecondProfile.data?.user.name, "Second Test User");
  assert.equal(unchangedSecondProfile.data?.preferences.practiceReminder, false);

  const refreshed = await api<SessionResponse>("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken: firstSignup.data.tokens.refreshToken }),
  });
  assert.equal(refreshed.status, 200);
  assert.ok(refreshed.data);
  assert.notEqual(refreshed.data.tokens.refreshToken, firstSignup.data.tokens.refreshToken);

  const replayedRefresh = await api<SessionResponse>("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken: firstSignup.data.tokens.refreshToken }),
  });
  assert.equal(replayedRefresh.status, 401);

  const logoutResponse = await api<void>("/api/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken: refreshed.data.tokens.refreshToken }),
  });
  assert.equal(logoutResponse.status, 204);

  const revokedRefresh = await api<SessionResponse>("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken: refreshed.data.tokens.refreshToken }),
  });
  assert.equal(revokedRefresh.status, 401);

  const forgot = await api<{ message: string }>("/api/auth/password/forgot", {
    method: "POST",
    body: JSON.stringify({ email: firstEmail }),
  });
  assert.equal(forgot.status, 200);
  const resetCode = "654321";
  await pool.query(
    `UPDATE auth_action_tokens SET token_hash = $2
     WHERE id = (SELECT id FROM auth_action_tokens WHERE user_id = $1 AND purpose = 'reset_password' AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1)`,
    [firstSignup.data.user.id, hashActionCode(firstEmail, resetCode, "reset_password")]
  );
  const newPassword = "New secure password 84";
  const reset = await api<{ message: string }>("/api/auth/password/reset", {
    method: "POST",
    body: JSON.stringify({ email: firstEmail, code: resetCode, newPassword }),
  });
  assert.equal(reset.status, 200);
  const newLogin = await api<SessionResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: firstEmail, password: newPassword }),
  });
  assert.equal(newLogin.status, 200);

  const changedPassword = "Changed secure password 126";
  const changed = await api<{ message: string }>("/api/auth/me/password", {
    method: "PUT",
    headers: { authorization: `Bearer ${newLogin.data!.tokens.accessToken}` },
    body: JSON.stringify({ currentPassword: newPassword, newPassword: changedPassword }),
  });
  assert.equal(changed.status, 200);

  const deleted = await api<void>("/api/auth/me", {
    method: "DELETE",
    headers: { authorization: `Bearer ${secondSignup.data.tokens.accessToken}` },
    body: JSON.stringify({ password }),
  });
  assert.equal(deleted.status, 204);

  console.log("Authentication smoke test passed.");
} finally {
  await pool.query("DELETE FROM users WHERE email = ANY($1::text[])", [
    [firstEmail, secondEmail],
  ]);
  await pool.end();
}
