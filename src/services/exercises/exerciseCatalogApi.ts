import { API_URL } from "../../config/environment";
import type { ExerciseCatalogItem, ExerciseCategory } from "../../data/exerciseCatalog";

export type BackendExerciseCatalogItem = ExerciseCatalogItem & {
  description?: string | null;
  imageUrl?: string | null;
  status: "published";
  displayOrder: number;
  recommendationTags: string[];
};

export async function getExerciseCatalog(signal?: AbortSignal) {
  if (!API_URL) throw new Error("Backend API is not configured");
  const response = await fetch(`${API_URL}/api/exercises`, { signal });
  if (!response.ok) throw new Error(`Exercise catalog request failed with ${response.status}`);
  const payload = (await response.json()) as { data?: BackendExerciseCatalogItem[] };
  if (!Array.isArray(payload.data)) throw new Error("Exercise catalog response is invalid");
  return payload.data.filter((item) =>
    typeof item.id === "string" && typeof item.title === "string" && typeof item.category === "string"
  ).map((item) => ({
    ...item,
    category: item.category as ExerciseCategory,
    exerciseId: item.exerciseId ?? undefined,
  }));
}
