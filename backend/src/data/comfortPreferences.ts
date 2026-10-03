/** Shared by the API and mobile fallback. These are user choices, not diagnoses. */
export const comfortOptions = [
  { id: "self_touch", label: "Self-touch", signal: "touch_discomfort", exerciseIds: ["butterfly-hug", "self-containment-hold"] },
  { id: "breath_holds", label: "Breath holds", signal: "avoid_breath_holds", exerciseIds: ["box-breathing"] },
  { id: "head_scanning", label: "Head or eye scanning", signal: "avoid_head_scanning", exerciseIds: ["orienting-exercise"] },
  { id: "body_scans", label: "Inward body scans", signal: "avoid_body_scans", exerciseIds: ["body-scan"] },
] as const;

export type ComfortPreference = typeof comfortOptions[number]["id"];
export const comfortPreferenceIds = comfortOptions.map(option => option.id);

export function getComfortConstraints(preferences: readonly ComfortPreference[] = []): {
  signals: string[]; excludedIds: string[]; avoidBreathHolds: boolean;
} {
  const selected = comfortOptions.filter(option => preferences.includes(option.id));
  return {
    signals: selected.map(option => option.signal),
    excludedIds: [...new Set(selected.flatMap(option => [...option.exerciseIds]))],
    avoidBreathHolds: preferences.includes("breath_holds"),
  };
}
