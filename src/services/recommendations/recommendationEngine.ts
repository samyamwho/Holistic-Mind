import { exerciseLibrary } from "../../data/wellnessContent";
import type { DailyCheckInAnswers, Recommendation } from "../../types/wellness";

export function getRecommendations(
  answers: Partial<DailyCheckInAnswers>,
  limit = 3
): Recommendation[] {
  const signals = Object.values(answers).filter(Boolean);

  return exerciseLibrary
    .map((exercise) => {
      const matchedSignals = exercise.bestFor.filter((tag) => signals.includes(tag));
      const stateMatch = answers.state ? exercise.bestFor.includes(answers.state) : false;
      const supportMatch = answers.support
        ? exercise.bestFor.includes(answers.support)
        : false;

      return {
        ...exercise,
        score: matchedSignals.length + (stateMatch ? 2 : 0) + (supportMatch ? 1 : 0),
      };
    })
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}
