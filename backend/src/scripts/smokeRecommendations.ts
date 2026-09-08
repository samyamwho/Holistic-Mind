import { recommendationProfiles } from "../data/recommendationProfiles.js";
import { requestLocalRecommendations } from "../recommender.js";

const exercises = recommendationProfiles.map((profile) => ({
  id: profile.exerciseId,
  title: profile.title,
  category: profile.category,
  description: profile.description,
  recommendation_tags: profile.recommendationTags,
  support_goals: profile.supportGoals,
  intended_states: profile.intendedStates,
  contraindication_tags: profile.contraindicationTags,
  activation_level: profile.activationLevel,
  physical_intensity: profile.physicalIntensity,
  breath_hold_required: profile.breathHoldRequired,
}));

const scenarios = [
  {
    name: "high activation needing calm",
    answers: {
      state: "Anxious",
      body: "Tense",
      energy: "Steady",
      stress: "Very stressed",
      focus: "Scattered",
      support: "Calm down",
    },
    acceptableTop: new Set([
      "longer-exhale",
      "physiological-sigh",
      "orienting-exercise",
      "shoulder-drop-reset",
      "five-senses",
    ]),
    rejectedTop: new Set(["box-breathing"]),
  },
  {
    name: "disconnected needing grounding",
    answers: {
      state: "Numb",
      body: "Disconnected",
      energy: "Drained",
      stress: "Moderate",
      focus: "Foggy",
      support: "Feel grounded",
    },
    acceptableTop: new Set([
      "feet-on-floor",
      "self-containment-hold",
      "name-what-is-here",
      "five-senses",
    ]),
    rejectedTop: new Set(["box-breathing"]),
  },
  {
    name: "low energy requesting activation",
    answers: {
      state: "Okay",
      body: "Heavy",
      energy: "Drained",
      stress: "A little",
      focus: "Foggy",
      support: "Get energy",
    },
    acceptableTop: new Set(["temperature-reset"]),
    rejectedTop: new Set(["wind-down-breath"]),
  },
  {
    name: "steady and curious",
    answers: {
      state: "Calm",
      body: "Relaxed",
      energy: "Steady",
      stress: "Not stressed",
      focus: "Clear",
      support: "Learn",
    },
    acceptableTop: new Set(["body-scan", "name-what-is-here"]),
    rejectedTop: new Set([]),
  },
  {
    name: "safe focus support",
    answers: {
      state: "Okay",
      body: "Relaxed",
      energy: "Steady",
      stress: "A little",
      focus: "Scattered",
      support: "Focus",
    },
    acceptableTop: new Set(["box-breathing", "five-senses", "name-what-is-here"]),
    rejectedTop: new Set([]),
  },
];

let focusRecommendations: string[] = [];

for (const scenario of scenarios) {
  const generated = await requestLocalRecommendations({
    user_id: `smoke-${scenario.name}`,
    onboarding_goal: "Build a sustainable daily nervous-system practice",
    check_in_answers: scenario.answers,
    journal_texts: [],
    exercises,
    interactions: [],
    excluded_exercise_ids: [],
    limit: 4,
  });
  const ids = generated.items.map((item) => item.exerciseId);
  const top = ids[0];
  if (!generated.modelVersion.startsWith("hybrid-v3:") || generated.strategy !== "content-based-cold-start") {
    throw new Error(`${scenario.name}: unexpected engine ${generated.modelVersion} (${generated.strategy})`);
  }
  if (ids.length !== 4 || new Set(ids).size !== ids.length) {
    throw new Error(`${scenario.name}: expected four unique recommendations, received ${ids.join(", ")}`);
  }
  if (!scenario.acceptableTop.has(top) || scenario.rejectedTop.has(top)) {
    throw new Error(`${scenario.name}: unexpected top recommendation ${top}; received ${ids.join(", ")}`);
  }
  if (scenario.name === "safe focus support") focusRecommendations = ids;
  console.log(`${scenario.name}: ${ids.join(" -> ")}`);
}

const rotatedFocus = await requestLocalRecommendations({
  user_id: "smoke-safe-focus-rotation",
  onboarding_goal: "Build a sustainable daily nervous-system practice",
  check_in_answers: scenarios.find((scenario) => scenario.name === "safe focus support")?.answers,
  journal_texts: [],
  exercises,
  interactions: [],
  excluded_exercise_ids: [],
  recent_recommendation_ids: focusRecommendations,
  limit: 4,
});
const rotatedFocusIds = rotatedFocus.items.map((item) => item.exerciseId);
const focusOverlap = rotatedFocusIds.filter((id) => focusRecommendations.includes(id)).length;
if (focusOverlap === focusRecommendations.length) {
  throw new Error(`focus rotation: all recommendations repeated; received ${rotatedFocusIds.join(", ")}`);
}
console.log(`safe focus rotation: ${rotatedFocusIds.join(" -> ")} (${focusOverlap}/4 repeated)`);

const repeatedFocus = await requestLocalRecommendations({
  user_id: "smoke-repeated-focus-rotation",
  onboarding_goal: "Build a sustainable daily nervous-system practice",
  check_in_answers: scenarios.find((scenario) => scenario.name === "safe focus support")?.answers,
  journal_texts: [],
  exercises,
  interactions: [],
  excluded_exercise_ids: [],
  recent_recommendation_ids: [
    ...rotatedFocusIds,
    ...focusRecommendations,
    ...focusRecommendations,
  ],
  limit: 4,
});
const repeatedFocusIds = repeatedFocus.items.map((item) => item.exerciseId);
if (repeatedFocusIds.includes("box-breathing")) {
  throw new Error(`repeated focus rotation: box-breathing remained after three consecutive appearances; received ${repeatedFocusIds.join(", ")}`);
}
console.log(`repeated focus rotation: ${repeatedFocusIds.join(" -> ")}`);

console.log(`Recommendation smoke test passed for ${scenarios.length} scenarios plus recency rotation.`);
