import { API_URL } from "../../config/environment";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  emailVerified: boolean;
  hasPassword: boolean;
};

export type AuthPreferences = {
  dailyReminder: boolean;
  practiceReminder: boolean;
  haptics: boolean;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
};

export type AuthIdentity = {
  user: AuthUser;
  preferences: AuthPreferences;
};

export type AuthenticatedSession = AuthIdentity & {
  tokens: AuthTokens;
  emailDeliveryWarning?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}) {
  if (!API_URL) {
    throw new ApiError("The backend API is not configured.", 0);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => ({}))) as {
    data?: T;
    error?: string;
  };

  if (!response.ok || payload.data === undefined) {
    throw new ApiError(payload.error ?? "The request could not be completed.", response.status);
  }

  return payload.data;
}

export function signup(name: string, email: string, password: string) {
  return request<AuthenticatedSession>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function login(email: string, password: string) {
  return request<AuthenticatedSession>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function loginWithGoogle(idToken: string) {
  return request<AuthenticatedSession & { isNewUser: boolean }>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}

export function refreshSession(refreshToken: string) {
  return request<AuthenticatedSession>("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export function logout(refreshToken: string) {
  return request<void>("/api/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export function getMe(accessToken: string) {
  return request<AuthIdentity>("/api/auth/me", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
}

export function updateMe(
  accessToken: string,
  update: { name?: string; preferences?: Partial<AuthPreferences> }
) {
  return request<AuthIdentity>("/api/auth/me", {
    method: "PATCH",
    headers: { authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(update),
  });
}

export function resendVerificationEmail(accessToken: string) {
  return request<{ message: string }>("/api/auth/email/resend", {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}` },
  });
}

export function verifyEmail(accessToken: string, code: string) {
  return request<AuthIdentity>("/api/auth/email/verify", {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ code }),
  });
}

export function forgotPassword(email: string) {
  return request<{ message: string }>("/api/auth/password/forgot", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(email: string, code: string, newPassword: string) {
  return request<{ message: string }>("/api/auth/password/reset", {
    method: "POST",
    body: JSON.stringify({ email, code, newPassword }),
  });
}

export function changePassword(accessToken: string, currentPassword: string, newPassword: string) {
  return request<{ message: string }>("/api/auth/me/password", {
    method: "PUT",
    headers: { authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function deleteAccount(accessToken: string, confirmation: { password: string } | { googleIdToken: string }) {
  return request<void>("/api/auth/me", {
    method: "DELETE",
    headers: { authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(confirmation),
  });
}
