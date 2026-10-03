import { z } from "zod";
import { comfortPreferenceIds } from "./data/comfortPreferences.js";

export const answersSchema = z.object({
  state: z.string().min(1).max(80),
  body: z.string().min(1).max(80),
  energy: z.string().min(1).max(80),
  stress: z.string().min(1).max(80),
  focus: z.string().min(1).max(80),
  support: z.string().min(1).max(80),
  comfortPreferences: z.array(z.enum(comfortPreferenceIds)).max(4).default([]),
});
