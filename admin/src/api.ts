export type ExerciseStatus = "draft" | "published" | "archived";
export type Exercise = {
  id: string;
  title: string;
  category: string;
  guidanceType: "breathing" | "video" | "guided" | "grounding" | "audio";
  sourcePage: number;
  exerciseId?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  status: ExerciseStatus;
  displayOrder: number;
  recommendationTags: string[];
  durationSeconds: number | null;
  activationLevel: "down_regulating" | "neutral" | "up_regulating";
  physicalIntensity: "low" | "moderate" | "high";
  supportGoals: string[];
  intendedStates: string[];
  contraindicationTags: string[];
  breathHoldRequired: boolean;
  positionRequired: "any" | "seated" | "standing" | "lying";
  environmentRequirements: string[];
};
export type ExerciseMedia = {
  exerciseId: string;
  videoUrl: string;
  posterUrl: string | null;
  captionsUrl: string | null;
  durationSeconds: number | null;
  status: "ready";
  updatedAt: string;
};

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");

async function request<T>(path: string, adminKey: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "content-type": "application/json", "x-admin-key": adminKey, ...options.headers },
  });
  const payload = await response.json().catch(() => ({})) as { data?: T; error?: string };
  if (!response.ok || payload.data === undefined) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload.data;
}

export const listExercises = (key: string) => request<Exercise[]>("/api/exercises/admin/all", key);
export const updateExercise = (key: string, id: string, update: Partial<Omit<Exercise, "id">>) =>
  request<Exercise>(`/api/exercises/${encodeURIComponent(id)}`, key, { method: "PATCH", body: JSON.stringify(update) });

export async function uploadExerciseImage(key: string, exerciseId: string, file: File) {
  const prepared = await request<{ uploadUrl: string; objectKey: string }>(
    `/api/exercises/${encodeURIComponent(exerciseId)}/image-upload-url`, key,
    { method: "POST", body: JSON.stringify({ fileName: file.name, contentType: file.type }) }
  );
  const upload = await fetch(prepared.uploadUrl, { method: "PUT", headers: { "content-type": file.type }, body: file });
  if (!upload.ok) throw new Error(`Image upload failed (${upload.status})`);
  return request<Exercise>(`/api/exercises/${encodeURIComponent(exerciseId)}/image-complete`, key, {
    method: "POST", body: JSON.stringify({ objectKey: prepared.objectKey }),
  });
}

export async function getExerciseVideo(exerciseId: string) {
  const response = await fetch(`${API_URL}/api/exercise-media/${encodeURIComponent(exerciseId)}`);
  if (response.status === 404) return null;
  const payload = await response.json().catch(() => ({})) as { data?: ExerciseMedia; error?: string };
  if (!response.ok || !payload.data) throw new Error(payload.error || "Unable to load exercise video");
  return payload.data;
}

export async function uploadExerciseVideo(key: string, exerciseId: string, file: File) {
  const prepared = await request<{ uploadUrl: string; objectKey: string }>(
    `/api/exercise-media/${encodeURIComponent(exerciseId)}/upload-url`, key,
    { method: "POST", body: JSON.stringify({ fileName: file.name, contentType: file.type }) }
  );
  const upload = await fetch(prepared.uploadUrl, { method: "PUT", headers: { "content-type": file.type }, body: file });
  if (!upload.ok) throw new Error(`Video upload failed (${upload.status})`);
  return request<ExerciseMedia>(`/api/exercise-media/${encodeURIComponent(exerciseId)}/complete`, key, {
    method: "POST", body: JSON.stringify({ objectKey: prepared.objectKey }),
  });
}

export const deleteExerciseVideo = (key: string, exerciseId: string) =>
  request<{ deleted: true }>(`/api/exercise-media/${encodeURIComponent(exerciseId)}`, key, { method: "DELETE" });
