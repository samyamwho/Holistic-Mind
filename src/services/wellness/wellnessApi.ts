import { API_URL } from "../../config/environment";
import { ApiError } from "../auth/authApi";
import type { DailyCheckIn, DailyCheckInAnswers } from "../../types/wellness";

export type StoredJournalEntry = {
  id: string;
  pack: string;
  prompt: string;
  text: string;
  createdAt: string;
};
export type OnboardingResponses = {
  support: string;
  age: string;
  dailyTime: string;
  updatedAt?: string;
};
export type PracticeActivity = {
  id: string;
  exerciseId: string;
  title: string;
  category: string;
  kind: "exercise" | "audio";
  createdAt: string;
};

type PracticeActivityListener = (activity: PracticeActivity) => void;
const practiceActivityListeners = new Set<PracticeActivityListener>();

export function subscribeToPracticeActivity(listener: PracticeActivityListener) {
  practiceActivityListeners.add(listener);
  return () => {
    practiceActivityListeners.delete(listener);
  };
}

async function request<T>(path: string, accessToken: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}/api/wellness${path}`, {
    ...options,
    headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}`, ...options.headers },
  });
  const payload = (await response.json().catch(() => ({}))) as { data?: T; error?: string };
  if (!response.ok || payload.data === undefined) {
    throw new ApiError(payload.error ?? "The request could not be completed.", response.status);
  }
  return payload.data;
}

export const getLatestCheckIn = (token: string) => request<DailyCheckIn | null>("/check-ins/latest", token);
export const getCheckIns = (token: string) => request<DailyCheckIn[]>("/check-ins", token);
export const getOnboardingResponses = (token: string) => request<OnboardingResponses | null>("/onboarding", token);
export const saveOnboardingResponses = (token: string, answers: Omit<OnboardingResponses, "updatedAt">) =>
  request<OnboardingResponses>("/onboarding", token, { method: "PUT", body: JSON.stringify(answers) });
export const saveCheckIn = (token: string, date: string, answers: DailyCheckInAnswers) =>
  request<DailyCheckIn>("/check-ins", token, { method: "PUT", body: JSON.stringify({ date, answers }) });
export const getJournalEntries = (token: string) => request<StoredJournalEntry[]>("/journal", token);
export const createJournalEntry = (token: string, entry: Omit<StoredJournalEntry, "id" | "createdAt">) =>
  request<StoredJournalEntry>("/journal", token, { method: "POST", body: JSON.stringify(entry) });
export const getPracticeEvents = (token: string) => request<PracticeActivity[]>("/practice-events", token);
export const recordPracticeEvent = async (
  token: string,
  event: Omit<PracticeActivity, "id" | "createdAt">
) => {
  const recorded = await request<PracticeActivity>("/practice-events", token, {
    method: "POST",
    body: JSON.stringify(event),
  });
  practiceActivityListeners.forEach((listener) => listener(recorded));
  return recorded;
};
