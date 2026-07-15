import type { ExerciseGuidanceType } from "../types/wellness";

export type ExerciseCategory =
  | "Nervous System Reset"
  | "Ancient Practices"
  | "Kundalini Yoga"
  | "Breathwork"
  | "Hip & Pelvic"
  | "Spine & Core"
  | "Upper Body"
  | "Sensory Regulation"
  | "Whole Body"
  | "For Children"
  | "Headache Relief";

export type ExerciseCatalogItem = {
  id: string;
  title: string;
  category: ExerciseCategory;
  guidanceType: ExerciseGuidanceType;
  sourcePage: number;
  exerciseId?: string;
};

type CatalogSeed = {
  title: string;
  page?: number;
  guidanceType?: ExerciseGuidanceType;
  exerciseId?: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function createCategory(
  category: ExerciseCategory,
  sourcePage: number,
  guidanceType: ExerciseGuidanceType,
  seeds: Array<string | CatalogSeed>
): ExerciseCatalogItem[] {
  return seeds.map((seed) => {
    const item = typeof seed === "string" ? { title: seed } : seed;

    return {
      id: `${slugify(category)}-${slugify(item.title)}`,
      title: item.title,
      category,
      guidanceType: item.guidanceType ?? guidanceType,
      sourcePage: item.page ?? sourcePage,
      exerciseId: item.exerciseId,
    };
  });
}

const fullExerciseCatalog: ExerciseCatalogItem[] = [
  ...createCategory("Nervous System Reset", 105, "guided", [
    { title: "Physiological Sigh", guidanceType: "breathing", exerciseId: "physiological-sigh" },
    { title: "Longer Exhale Breathing", guidanceType: "breathing", exerciseId: "longer-exhale" },
    { title: "Orienting Exercise", exerciseId: "orienting-exercise" },
    { title: "Ground Through Your Feet", guidanceType: "video", exerciseId: "feet-on-floor" },
    { title: "Shoulder Drop Reset", page: 106, guidanceType: "video", exerciseId: "shoulder-drop-reset" },
    { title: "Butterfly Hug", page: 106, guidanceType: "video", exerciseId: "butterfly-hug" },
    { title: "Humming or Vibration", page: 106, guidanceType: "audio", exerciseId: "humming-vibration" },
    { title: "Temperature Reset", page: 106, exerciseId: "temperature-reset" },
    { title: "Self-Containment Hold", page: 106, guidanceType: "video", exerciseId: "self-containment-hold" },
    { title: "Name 5-4-3-2-1", page: 106, guidanceType: "grounding", exerciseId: "five-senses" },
  ]),
  ...createCategory("Ancient Practices", 111, "video", [
    "Morning Body Tapping",
    "Shoulder Bounce Shake",
    "Arm Swing Qigong",
    "Cloud Hands Movement",
    "Lymph Collarbone Massage",
    "Heel Drop Exercise",
    { title: "Bamboo Breathing", guidanceType: "breathing" },
    { title: "Extended Exhale Breath", page: 112, guidanceType: "breathing", exerciseId: "longer-exhale" },
    { title: "Heart Center Palm Hold", page: 112 },
    { title: "Standing Tree Pose", page: 112 },
    { title: "Soft Eye Gazing", page: 112, guidanceType: "guided" },
    { title: "Humming Breath", page: 112, guidanceType: "audio", exerciseId: "humming-vibration" },
    { title: "Silk Reeling Arms", page: 112 },
    { title: "Shoulder Qi Circles", page: 112 },
    { title: "Wall Palm Stretch", page: 113 },
    { title: "Floating Arms Exercise", page: 113 },
    { title: "Neck and Shoulder Melt", page: 113 },
    { title: "Cat Wave Spine Movement", page: 113 },
    { title: "Spine Rolling Breath", page: 113 },
    { title: "Dragon Tail Twist", page: 113 },
    { title: "Kidney Warming Rub", page: 113 },
    { title: "Seated Forward Fold Rest", page: 113 },
    { title: "Trauma Shake Release", page: 113 },
    { title: "Butterfly Tapping", page: 113, exerciseId: "butterfly-hug" },
    { title: "Safe Grounding Press", page: 113, guidanceType: "grounding" },
    { title: "Rocking Meditation", page: 114 },
    { title: "Inner Smile Practice", page: 114, guidanceType: "guided" },
    { title: "Earth Connection Standing", page: 114, guidanceType: "grounding" },
    { title: "Eight Direction Stretch", page: 114 },
    { title: "Closing Stillness Practice", page: 114, guidanceType: "guided" },
    { title: "Belly Breathing With Hand Warmth", page: 114, guidanceType: "breathing" },
    { title: "Ear Massage Awakening", page: 114 },
    { title: "Third Eye Massage", page: 115 },
    { title: "Heaven and Earth Connection", page: 115 },
    { title: "Qi Ball Holding", page: 115, guidanceType: "guided" },
  ]),
  ...createCategory("Kundalini Yoga", 118, "video", [
    "Ego Eradicator",
    "Shoulder Shrugs",
    "Neck Rolls",
    "Arm Swings (Bear Grip)",
    "Spinal Flex (Camel Ride)",
    { title: "Sufi Grinds", page: 119 },
    { title: "Torso Twist", page: 119 },
    { title: "Stretch Pose", page: 119 },
    { title: "Frog Pose", page: 119 },
    { title: "Archer Pose", page: 119 },
  ]),
  ...createCategory("Breathwork", 143, "breathing", [
    "Expanding Breath Practice",
    { title: "Box Breathing", page: 144, exerciseId: "box-breathing" },
    { title: "Dorsal Vagal Breathing", page: 145 },
    { title: "Lion's Breath", page: 146 },
    { title: "Finger Tracing Breathing", page: 147 },
    { title: "4-7-8 Breathing", page: 148 },
    { title: "Nostril Breathing", page: 149 },
  ]),
  ...createCategory("Hip & Pelvic", 152, "video", [
    "Hip Rocking",
    { title: "Pelvic Tilts", page: 153 },
    { title: "Psoas Release", page: 154 },
    { title: "Hip Rotation", page: 155 },
    { title: "Hip Flexibility", page: 156 },
    { title: "Pelvic Floor Exercise", page: 157 },
    { title: "Butterfly Stretch", page: 158 },
    { title: "Windshield Wiper Legs", page: 159 },
    { title: "Pigeon Pose", page: 160 },
  ]),
  ...createCategory("Spine & Core", 163, "video", [
    "Core Strengthening",
    { title: "Cat-Cow Stretch", page: 164 },
    { title: "Leg Lifts", page: 165 },
    { title: "Spinal Twists", page: 166 },
    { title: "Child's Pose", page: 167 },
    { title: "Foam Rolling", page: 168 },
    { title: "Legs Up the Wall", page: 169 },
    { title: "Seated Forward Bend", page: 170 },
    { title: "Standing Forward Fold", page: 171 },
  ]),
  ...createCategory("Upper Body", 174, "video", [
    "Shoulder Blade Relaxation",
    { title: "Trapezius Relaxation", page: 175 },
    { title: "Heart Opener", page: 176 },
    { title: "Collarbone Stretch", page: 177 },
    { title: "Wall Angels", page: 178 },
    { title: "Shoulder Humming", page: 179, guidanceType: "audio" },
    { title: "Neck Mobility Exercises", page: 180 },
    { title: "Thread the Needle", page: 181 },
  ]),
  ...createCategory("Sensory Regulation", 184, "guided", [
    "Jaw Relaxation",
    { title: "Eye Palming", page: 185 },
    { title: "Tapping (EFT)", page: 186, guidanceType: "video" },
    { title: "Scalp Massage", page: 187, guidanceType: "video" },
  ]),
  ...createCategory("Whole Body", 190, "video", [
    "Gentle Stretching",
    { title: "Body Scanning", page: 191, guidanceType: "audio", exerciseId: "body-scan" },
    { title: "Self-Massage", page: 192 },
    { title: "Self-Hug", page: 193 },
    { title: "Grief Release", page: 194 },
    { title: "Anger Release", page: 195 },
    { title: "Gentle Shaking", page: 196 },
    { title: "Figure-8 Arm Movement", page: 197 },
    { title: "Swaying Side to Side", page: 198 },
    { title: "Healing Movements", page: 199 },
    { title: "Progressive Muscle Relaxation", page: 200, guidanceType: "audio" },
    { title: "Grounding Exercise (Barefoot)", page: 201, guidanceType: "grounding" },
    { title: "Daily Stretch Routine", page: 202 },
    { title: "Heel Drops", page: 203 },
    { title: "Walking Meditation", page: 204, guidanceType: "guided" },
    { title: "Cold Water Face Splash", page: 205, guidanceType: "guided", exerciseId: "temperature-reset" },
    { title: "Rebounding (Mini Trampoline)", page: 206 },
  ]),
  ...createCategory("For Children", 209, "video", [
    "Shake It Out",
    { title: "Cross Crawl", page: 210 },
    { title: "Lazy 8 Tracing", page: 211 },
    { title: "Cat Stretch", page: 212 },
    { title: "Grounding Feet", page: 213, guidanceType: "grounding" },
  ]),
  ...createCategory("Headache Relief", 217, "video", [
    "Suboccipital Release",
    "Neck and Eye Movement",
    "Gentle Pressure Points",
    "Pelvic Rocking",
    "Jaw and Tongue Softening",
  ]),
];

// The source catalog remains intact for future releases. The starter Explore
// experience exposes every other item, keeping exactly 60 of the original 119
// exercises while retaining coverage across every category.
export const exerciseCatalog = fullExerciseCatalog.filter((_, index) => index % 2 === 0);

export const exerciseCategories: Array<"All" | ExerciseCategory> = [
  "All",
  "Nervous System Reset",
  "Breathwork",
  "Whole Body",
  "Hip & Pelvic",
  "Spine & Core",
  "Upper Body",
  "Sensory Regulation",
  "Ancient Practices",
  "Kundalini Yoga",
  "For Children",
  "Headache Relief",
];
