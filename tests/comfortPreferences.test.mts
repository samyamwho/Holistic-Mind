import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import test from "node:test";
import { answersSchema } from "../backend/src/checkIn.ts";
import { comfortOptions, getComfortConstraints } from "../backend/src/data/comfortPreferences.ts";
import { recommendationProfiles } from "../backend/src/data/recommendationProfiles.ts";

// Bundle images are irrelevant to ranking; keep this test independent of a native runtime.
const require = createRequire(import.meta.url);
require.extensions[".png"] = (module) => { module.exports = 1; };
const { getRecommendations } = await import("../src/services/recommendations/recommendationEngine.ts");

const base = { state: "Okay", body: "Relaxed", energy: "Steady", stress: "A little", focus: "Clear", support: "Learn" };

test("legacy check-ins and validated preferences survive JSON round trips", () => {
  assert.deepEqual(answersSchema.parse(base).comfortPreferences, []);
  const answers = answersSchema.parse({ ...base, comfortPreferences: ["self_touch", "body_scans"] });
  assert.deepEqual(answersSchema.parse(JSON.parse(JSON.stringify(answers))), answers);
  assert.equal(answersSchema.safeParse({ ...base, comfortPreferences: ["unknown"] }).success, false);
  assert.equal(answersSchema.safeParse({ ...base, comfortPreferences: "self_touch" }).success, false);
});

test("offline rankings honor each preference and combined choices across every support goal", () => {
  const cases = [...comfortOptions.map(option => [option.id]), comfortOptions.map(option => option.id)];
  for (const preferences of cases) {
    const constraints = getComfortConstraints(preferences);
    for (const support of ["Learn", "Focus", "Calm down", "Feel grounded", "Get energy"]) {
      const items = getRecommendations({ ...base, support, comfortPreferences: preferences }, "", "", 14);
      assert.ok(items.length > 0);
      for (const item of items) assert.ok(!constraints.excludedIds.includes(item.id), `${preferences}: ${item.id}`);
    }
  }
});

test("offline metadata constraints and breath-hold restrictions are hard exclusions", () => {
  const ids = getRecommendations({ ...base, state: "Overwhelmed", body: "Disconnected" }, "", "", 14).map(item => item.id);
  assert.ok(!ids.includes("box-breathing"));
  assert.ok(!ids.includes("body-scan"));
});

test("the Python engine enforces preference exclusions even with recency and collaborative signals", () => {
  for (const preferences of [...comfortOptions.map(option => [option.id]), comfortOptions.map(option => option.id)]) {
    const constraints = getComfortConstraints(preferences);
    const context = {
      user_id: "preference-test", check_in_answers: base, limit: 10,
      contraindication_signals: constraints.signals,
      excluded_exercise_ids: [...constraints.excludedIds, "feet-on-floor"],
      recent_recommendation_ids: recommendationProfiles.map(p => p.exerciseId),
      exercises: recommendationProfiles.map(p => ({ id: p.exerciseId, title: p.title, category: p.category,
        support_goals: p.supportGoals, intended_states: p.intendedStates, contraindication_tags: p.contraindicationTags,
        activation_level: p.activationLevel, breath_hold_required: p.breathHoldRequired })),
      interactions: ["preference-test", "neighbor-a", "neighbor-b"].flatMap(user_id =>
        recommendationProfiles.map(p => ({ user_id, exercise_id: p.exerciseId, value: 1 }))),
    };
    const result = spawnSync("recommender/.venv312/bin/python", ["-B", "-c",
      "import json,sys;sys.path.insert(0,'recommender');from app.schemas import RecommendationContext;from app.engine import recommend;c=RecommendationContext.model_validate(json.load(sys.stdin));print(json.dumps([x.exercise_id for x in recommend(c)[0]]))"],
      { input: JSON.stringify(context), encoding: "utf8", env: { ...process.env, RECOMMENDER_EMBEDDING_BACKEND: "lexical" } });
    assert.equal(result.status, 0, result.stderr);
    const ids = JSON.parse(result.stdout) as string[];
    assert.ok(ids.length > 0);
    for (const id of ids) assert.ok(!context.excluded_exercise_ids.includes(id), `${preferences}: ${id}`);
  }
});
