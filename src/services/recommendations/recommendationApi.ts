import { API_URL } from "../../config/environment";
import { ApiError } from "../auth/authApi";

export type RecommendationEventType =
  | "opened"
  | "started"
  | "completed"
  | "abandoned"
  | "saved"
  | "repeated";

export type GeneratedRecommendation = {
  exerciseId: string;
  score: number;
  scoreComponents: Record<string, number>;
  reason: string;
  exploration: boolean;
};

async function request<T>(
  path: string,
  accessToken: string,
  options: RequestInit = {}
) {
  const response = await fetch(`${API_URL}/api/recommendations${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as {
    data?: T;
    error?: string;
  };
  if (!response.ok || payload.data === undefined) {
    throw new ApiError(
      payload.error ?? "The recommendation request could not be completed.",
      response.status
    );
  }
  return payload.data;
}

export function generateRecommendations(token: string) {
  return request<{
    requestId: string;
    modelVersion: string;
    strategy: "hybrid" | "content-based-cold-start" | string;
    createdAt: string;
    items: GeneratedRecommendation[];
  }>("/generate", token, { method: "POST" });
}

export function recordRecommendationEvent(
  token: string,
  requestId: string,
  input: {
    exerciseId: string;
    eventType: RecommendationEventType;
    metadata?: Record<string, unknown>;
  }
) {
  return request<{ id: string; createdAt: string }>(
    `/${encodeURIComponent(requestId)}/events`,
    token,
    { method: "POST", body: JSON.stringify(input) }
  );
}

export function saveRecommendationFeedback(
  token: string,
  requestId: string,
  input: {
    exerciseId: string;
    helpfulness?: 0 | 1 | 2 | 3 | null;
    stateChange?: "better" | "same" | "worse" | null;
    uncomfortable?: boolean;
  }
) {
  return request<{
    id: string;
    helpfulness: number | null;
    stateChange: "better" | "same" | "worse" | null;
    uncomfortable: boolean;
    updatedAt: string;
  }>(`/${encodeURIComponent(requestId)}/feedback`, token, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
