import { API_URL } from "../../config/environment";

export type ExerciseMedia = {
  exerciseId: string;
  videoUrl: string;
  posterUrl: string | null;
  captionsUrl: string | null;
  durationSeconds: number | null;
  status: "ready";
  updatedAt: string;
};

export async function getExerciseMedia(exerciseId: string, signal?: AbortSignal) {
  if (!API_URL) {
    return null;
  }

  const response = await fetch(
    `${API_URL}/api/exercise-media/${encodeURIComponent(exerciseId)}`,
    { signal }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Exercise media request failed with ${response.status}`);
  }

  const payload = (await response.json()) as { data?: Partial<ExerciseMedia> };

  if (
    !payload.data ||
    payload.data.status !== "ready" ||
    typeof payload.data.exerciseId !== "string" ||
    typeof payload.data.videoUrl !== "string"
  ) {
    throw new Error("Exercise media response is invalid");
  }

  return payload.data as ExerciseMedia;
}
