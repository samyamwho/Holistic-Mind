import { config } from "./config.js";

export type RecommenderItem = {
  exerciseId: string;
  score: number;
  scoreComponents: Record<string, number>;
  reason: string;
  exploration: boolean;
};

type RecommenderResponse = {
  model_version: string;
  strategy: string;
  items: Array<{
    exercise_id: string;
    score: number;
    score_components: Record<string, number>;
    reason: string;
    exploration: boolean;
  }>;
};

export async function requestLocalRecommendations(input: Record<string, unknown>) {
  const response = await fetch(`${config.RECOMMENDER_URL}/recommend`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(config.RECOMMENDER_TIMEOUT_MS),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Local recommender returned ${response.status}: ${detail.slice(0, 300)}`);
  }
  const payload = await response.json() as RecommenderResponse;
  return {
    modelVersion: payload.model_version,
    strategy: payload.strategy,
    items: payload.items.map((item) => ({
      exerciseId: item.exercise_id,
      score: item.score,
      scoreComponents: item.score_components,
      reason: item.reason,
      exploration: item.exploration,
    })),
  };
}
