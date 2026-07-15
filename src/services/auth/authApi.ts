import { API_URL } from "../../config/environment";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
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
