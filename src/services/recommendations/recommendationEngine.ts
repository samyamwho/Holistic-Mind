import { exerciseLibrary } from "../../data/wellnessContent";
import type { DailyCheckInAnswers, Recommendation } from "../../types/wellness";

export function getRecommendations(
  answers: Partial<DailyCheckInAnswers>,
  journalText = "",
  onboardingSupport = "",
  limit = 3
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
  const signals = [
    ...Object.values(answers).filter(Boolean),
    ...journalSignals,
    ...(onboardingSignals[onboardingSupport] ?? []),
  ];

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
