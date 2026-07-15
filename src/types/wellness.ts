import type { ImageSourcePropType } from "react-native";

export type NervousSystemState =
  | "Overwhelmed"
  | "Anxious"
  | "Numb"
  | "Okay"
  | "Calm";

export type CheckInAnswerKey =
  | "state"
  | "body"
  | "energy"
  | "stress"
  | "focus"
  | "support";

export type DailyCheckInAnswers = Record<CheckInAnswerKey, string>;

export type DailyCheckIn = {
  id: string;
  date: string;
  answers: DailyCheckInAnswers;
  createdAt: string;
};

export type CheckInQuestion = {
  id: CheckInAnswerKey;
  question: string;
  options: string[];
};

export type ExerciseSection =
  | "Breathwork"
  | "Somatic Tools"
  | "Audio Library"
  | "Anxiety Tools"
  | "Journaling";

export type ExerciseGuidanceType =
  | "breathing"
  | "video"
  | "guided"
  | "grounding"
  | "audio";

export type ExercisePhase = {
  label: string;
  durationSeconds: number;
  instruction: string;
  motion: "expand" | "hold" | "contract";
};

export type Exercise = {
  id: string;
  title: string;
  section: ExerciseSection;
  duration: string;
  durationSeconds: number;
  guidanceType: ExerciseGuidanceType;
  bestFor: string[];
  why: string;
  steps: string[];
  phases?: ExercisePhase[];
  videoUrl?: string;
  safetyNote?: string;
  sourcePage?: number;
  color: string;
  image: ImageSourcePropType;
};

export type Recommendation = Exercise & {
  score: number;
};
