import { readFile } from "node:fs/promises";
import { pool } from "../db.js";

type SeedExercise = {
  id: string;
  title: string;
  category: string;
  guidanceType: string;
  sourcePage: number;
  exerciseId?: string;
  recommendationMetadata?: Partial<RecommendationMetadata>;
};

type RecommendationMetadata = {
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

const categoryDefaults: Record<string, Partial<RecommendationMetadata>> = {
  "Nervous System Reset": {
    activationLevel: "down_regulating",
    supportGoals: ["calm_down", "feel_grounded"],
    intendedStates: ["anxious", "overwhelmed", "tense"],
  },
  Breathwork: {
    activationLevel: "down_regulating",
    supportGoals: ["calm_down", "focus"],
    intendedStates: ["anxious", "scattered"],
    contraindicationTags: ["breathing_discomfort"],
  },
  "Sensory Regulation": {
    activationLevel: "down_regulating",
    supportGoals: ["calm_down", "feel_grounded"],
    intendedStates: ["overwhelmed", "disconnected"],
  },
  "Headache Relief": {
    activationLevel: "down_regulating",
    supportGoals: ["calm_down"],
    intendedStates: ["tense", "tired"],
  },
  "For Children": {
    activationLevel: "neutral",
    supportGoals: ["feel_grounded", "get_energy"],
    intendedStates: ["restless", "scattered"],
  },
  "Kundalini Yoga": {
    activationLevel: "up_regulating",
    physicalIntensity: "moderate",
    supportGoals: ["get_energy", "focus"],
    intendedStates: ["tired", "foggy"],
  },
  "Hip & Pelvic": { physicalIntensity: "moderate", supportGoals: ["feel_grounded"] },
  "Spine & Core": { physicalIntensity: "moderate", supportGoals: ["get_energy"] },
  "Upper Body": { physicalIntensity: "low", supportGoals: ["calm_down"] },
  "Whole Body": {
    physicalIntensity: "moderate",
    supportGoals: ["feel_grounded", "get_energy"],
  },
  "Ancient Practices": {
    activationLevel: "neutral",
    physicalIntensity: "low",
    supportGoals: ["feel_grounded", "focus"],
  },
};

function metadataFor(exercise: SeedExercise): RecommendationMetadata {
  const category = categoryDefaults[exercise.category] ?? {};
  const guidanceDefaults: Partial<RecommendationMetadata> =
    exercise.guidanceType === "audio" || exercise.guidanceType === "guided"
      ? { physicalIntensity: "low", positionRequired: "seated" }
      : exercise.guidanceType === "grounding"
        ? {
            activationLevel: "down_regulating",
            physicalIntensity: "low",
            supportGoals: ["feel_grounded"],
            intendedStates: ["anxious", "overwhelmed", "disconnected"],
          }
        : {};

  return {
    durationSeconds: 180,
    activationLevel: "neutral",
    physicalIntensity: "low",
    supportGoals: [],
    intendedStates: [],
    contraindicationTags: [],
    breathHoldRequired: false,
    positionRequired: "any",
    environmentRequirements: [],
    ...category,
    ...guidanceDefaults,
    ...exercise.recommendationMetadata,
  };
}

const seedUrl = new URL("../data/exercises.json", import.meta.url);
const exercises = JSON.parse(await readFile(seedUrl, "utf8")) as SeedExercise[];
const client = await pool.connect();

try {
  await client.query("BEGIN");
  for (const [displayOrder, exercise] of exercises.entries()) {
    const metadata = metadataFor(exercise);
    await client.query(
      `INSERT INTO exercises (
         id, title, category, guidance_type, source_page, linked_exercise_id,
         display_order, status, duration_seconds, activation_level,
         physical_intensity, support_goals, intended_states, contraindication_tags,
         breath_hold_required, position_required, environment_requirements
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,'published',$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (id) DO UPDATE SET
         title=EXCLUDED.title, category=EXCLUDED.category, guidance_type=EXCLUDED.guidance_type,
         source_page=EXCLUDED.source_page, linked_exercise_id=EXCLUDED.linked_exercise_id,
         display_order=EXCLUDED.display_order, duration_seconds=EXCLUDED.duration_seconds,
         activation_level=EXCLUDED.activation_level, physical_intensity=EXCLUDED.physical_intensity,
         support_goals=EXCLUDED.support_goals, intended_states=EXCLUDED.intended_states,
         contraindication_tags=EXCLUDED.contraindication_tags,
         breath_hold_required=EXCLUDED.breath_hold_required,
         position_required=EXCLUDED.position_required,
         environment_requirements=EXCLUDED.environment_requirements, updated_at=NOW()`,
      [exercise.id, exercise.title, exercise.category, exercise.guidanceType,
       exercise.sourcePage, exercise.exerciseId ?? null, displayOrder,
       metadata.durationSeconds, metadata.activationLevel, metadata.physicalIntensity,
       metadata.supportGoals, metadata.intendedStates, metadata.contraindicationTags,
       metadata.breathHoldRequired, metadata.positionRequired,
       metadata.environmentRequirements]
    );
  }
  await client.query("COMMIT");
  console.log(`Seeded ${exercises.length} exercises.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
