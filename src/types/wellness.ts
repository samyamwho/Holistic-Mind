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

export type Exercise = {
  id: string;
  title: string;
  section: ExerciseSection;
  duration: string;
  bestFor: string[];
  why: string;
  color: string;
  image: ImageSourcePropType;
};

export type Recommendation = Exercise & {
  score: number;
};
