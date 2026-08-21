import { exerciseLibrary } from "../../data/wellnessContent";
import type { DailyCheckInAnswers, Recommendation } from "../../types/wellness";

export function getRecommendations(
  answers: Partial<DailyCheckInAnswers>,
  journalText = "",
  onboardingSupport = "",
  limit = 4
): Recommendation[] {
  const normalizedJournal = journalText.toLowerCase();
  const journalSignals = [
    { pattern: /anxious|anxiety|panic|worry|worried|fear/, tags: ["Anxious", "Calm down"] },
    { pattern: /overwhelm|overwhelmed|stress|tense|pressure/, tags: ["Overwhelmed", "Very stressed", "Tense"] },
    { pattern: /sleep|tired|exhausted|rest/, tags: ["Tired", "Drained"] },
    { pattern: /numb|disconnected|empty|distant/, tags: ["Numb", "Disconnected", "Feel grounded"] },
    { pattern: /focus|distracted|scattered|concentrat/, tags: ["Scattered", "Focus"] },
  ].flatMap(({ pattern, tags }) => pattern.test(normalizedJournal) ? tags : []);
  const onboardingSignals: Record<string, string[]> = {
    "Improve mood": ["Okay", "Learn", "Steady"],
    "Reduce stress & anxiety": ["Anxious", "Overwhelmed", "Very stressed", "Calm down"],
    "Improve sleep": ["Tired", "Drained", "Calm down"],
    "Feel more focused": ["Scattered", "Focus"],
  };
  const historicalSignals = [
    ...journalSignals,
    ...(onboardingSignals[onboardingSupport] ?? []),
  ];
  const answerWeights: Partial<Record<keyof DailyCheckInAnswers, number>> = {
    support: 6,
    state: 5,
    body: 3,
    energy: 3,
    stress: 3,
    focus: 2,
  };

  return exerciseLibrary
    .map((exercise) => {
      const answerScore = Object.entries(answers).reduce((score, [key, value]) => {
        if (!value || !exercise.bestFor.includes(value)) return score;
        return score + (answerWeights[key as keyof DailyCheckInAnswers] ?? 1);
      }, 0);
      const historyScore = exercise.bestFor.filter((tag) =>
        historicalSignals.includes(tag)
      ).length * 0.5;
      const usesBreathHolds = exercise.phases?.some((phase) => phase.motion === "hold") ?? false;
      const breathHoldPenalty = usesBreathHolds && (
        answers.state === "Anxious" ||
        answers.state === "Overwhelmed" ||
        answers.stress === "Very stressed"
      ) ? 5 : 0;

      return {
        ...exercise,
        score: answerScore + historyScore - breathHoldPenalty,
      };
    })
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}
