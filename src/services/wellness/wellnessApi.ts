import { API_URL } from "../../config/environment";
import { ApiError } from "../auth/authApi";
import type { DailyCheckIn, DailyCheckInAnswers } from "../../types/wellness";
import type { JournalMedia } from "../journal/journalCrypto";

export type StoredJournalEntry = {
  id: string;
  pack: string;
  prompt: string;
  text: string;
  createdAt: string;
  attachments?: JournalMedia[];
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
type FavoriteExerciseListener = (change: { exerciseId: string; favorite: boolean }) => void;
const favoriteExerciseListeners = new Set<FavoriteExerciseListener>();

export function subscribeToPracticeActivity(listener: PracticeActivityListener) {
  practiceActivityListeners.add(listener);
  return () => {
    practiceActivityListeners.delete(listener);
  };
}

export function subscribeToFavoriteExercises(listener: FavoriteExerciseListener) {
  favoriteExerciseListeners.add(listener);
  return () => favoriteExerciseListeners.delete(listener);
}

export async function wellnessRequest<T>(path: string, accessToken: string, options: RequestInit = {}) {
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

export const getLatestCheckIn = (token: string) => wellnessRequest<DailyCheckIn | null>("/check-ins/latest", token);
export const getCheckIns = (token: string) => wellnessRequest<DailyCheckIn[]>("/check-ins", token);
export const getOnboardingResponses = (token: string) => wellnessRequest<OnboardingResponses | null>("/onboarding", token);
export const saveOnboardingResponses = (token: string, answers: Omit<OnboardingResponses, "updatedAt">) =>
  wellnessRequest<OnboardingResponses>("/onboarding", token, { method: "PUT", body: JSON.stringify(answers) });
export const saveCheckIn = (token: string, date: string, answers: DailyCheckInAnswers) =>
  wellnessRequest<DailyCheckIn>("/check-ins", token, { method: "PUT", body: JSON.stringify({ date, answers }) });
export const getPracticeEvents = (token: string) => wellnessRequest<PracticeActivity[]>("/practice-events", token);
export const getFavoriteExerciseIds = (token: string) =>
  wellnessRequest<{ exerciseIds: string[] }>("/favorites", token).then((value) => value.exerciseIds);
export const addFavoriteExercise = async (token: string, exerciseId: string) => {
  const value = await wellnessRequest<{ exerciseId: string; favorite: boolean }>(`/favorites/${encodeURIComponent(exerciseId)}`, token, { method: "PUT" });
  favoriteExerciseListeners.forEach((listener) => listener(value));
  return value;
};
export const removeFavoriteExercise = async (token: string, exerciseId: string) => {
  const value = await wellnessRequest<{ exerciseId: string; favorite: boolean }>(`/favorites/${encodeURIComponent(exerciseId)}`, token, { method: "DELETE" });
  favoriteExerciseListeners.forEach((listener) => listener(value));
  return value;
};
export const recordPracticeEvent = async (
  token: string,
  event: Omit<PracticeActivity, "id" | "createdAt">
) => {
  const recorded = await wellnessRequest<PracticeActivity>("/practice-events", token, {
    method: "POST",
    body: JSON.stringify(event),
  });
  practiceActivityListeners.forEach((listener) => listener(recorded));
  return recorded;
};
