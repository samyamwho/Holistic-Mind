import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { authenticate } from "../middleware/authenticate.js";

const answersSchema = z.object({
  state: z.string().min(1).max(80),
  body: z.string().min(1).max(80),
  energy: z.string().min(1).max(80),
  stress: z.string().min(1).max(80),
  focus: z.string().min(1).max(80),
  support: z.string().min(1).max(80),
});
const checkInSchema = z.object({
  date: z.iso.date(),
  answers: answersSchema,
});
const journalSchema = z.object({
  pack: z.string().trim().min(1).max(80),
  prompt: z.string().trim().min(1).max(500),
  text: z.string().trim().min(1).max(20000),
});
const practiceEventSchema = z.object({
  exerciseId: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(120),
  kind: z.enum(["exercise", "audio"]).default("exercise"),
});
const onboardingSchema = z.object({
  support: z.string().trim().min(1).max(100),
  age: z.string().trim().min(1).max(30),
  dailyTime: z.string().trim().min(1).max(30),
});

export const wellnessRouter = Router();
wellnessRouter.use(authenticate);

wellnessRouter.get("/onboarding", async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT support_goal, age_range, daily_time, updated_at
       FROM onboarding_responses WHERE user_id = $1`,
      [response.locals.userId]
    );
    const row = result.rows[0];
    response.json({ data: row ? {
      support: row.support_goal,
      age: row.age_range,
      dailyTime: row.daily_time,
      updatedAt: row.updated_at.toISOString(),
    } : null });
  } catch (error) { next(error); }
});

wellnessRouter.put("/onboarding", async (request, response, next) => {
  const parsed = onboardingSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: "Complete all onboarding questions." }); return; }
  try {
    const result = await pool.query(
      `INSERT INTO onboarding_responses (user_id, support_goal, age_range, daily_time)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         support_goal = EXCLUDED.support_goal,
         age_range = EXCLUDED.age_range,
         daily_time = EXCLUDED.daily_time,
         updated_at = NOW()
       RETURNING support_goal, age_range, daily_time, updated_at`,
      [response.locals.userId, parsed.data.support, parsed.data.age, parsed.data.dailyTime]
    );
    const row = result.rows[0];
    response.json({ data: {
      support: row.support_goal,
      age: row.age_range,
      dailyTime: row.daily_time,
      updatedAt: row.updated_at.toISOString(),
    } });
  } catch (error) { next(error); }
});

wellnessRouter.get("/check-ins/latest", async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT id, check_in_date::text AS date, answers, created_at
       FROM daily_check_ins WHERE user_id = $1
       ORDER BY check_in_date DESC LIMIT 1`,
      [response.locals.userId]
    );
    const row = result.rows[0];
    response.json({ data: row ? { id: row.id, date: row.date, answers: row.answers, createdAt: row.created_at.toISOString() } : null });
  } catch (error) { next(error); }
});

wellnessRouter.get("/check-ins", async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT id, check_in_date::text AS date, answers, created_at
       FROM daily_check_ins WHERE user_id = $1
       ORDER BY check_in_date DESC, created_at DESC
       LIMIT 365`,
      [response.locals.userId]
    );
    response.json({
      data: result.rows.map((row) => ({
        id: row.id,
        date: row.date,
        answers: row.answers,
        createdAt: row.created_at.toISOString(),
      })),
    });
  } catch (error) { next(error); }
});

wellnessRouter.put("/check-ins", async (request, response, next) => {
  const parsed = checkInSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: "Invalid check-in." }); return; }
  try {
    const result = await pool.query(
      `INSERT INTO daily_check_ins (user_id, check_in_date, answers)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, check_in_date) DO UPDATE
       SET answers = EXCLUDED.answers, updated_at = NOW()
       RETURNING id, check_in_date::text AS date, answers, created_at`,
      [response.locals.userId, parsed.data.date, parsed.data.answers]
    );
    const row = result.rows[0];
    response.json({ data: { id: row.id, date: row.date, answers: row.answers, createdAt: row.created_at.toISOString() } });
  } catch (error) { next(error); }
});

wellnessRouter.get("/journal", async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT id, pack, prompt, content AS text, created_at
       FROM journal_entries WHERE user_id = $1 ORDER BY created_at DESC`,
      [response.locals.userId]
    );
    response.json({ data: result.rows.map((row) => ({ ...row, createdAt: row.created_at.toISOString(), created_at: undefined })) });
  } catch (error) { next(error); }
});

wellnessRouter.post("/journal", async (request, response, next) => {
  const parsed = journalSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: "Invalid journal entry." }); return; }
  try {
    const result = await pool.query(
      `INSERT INTO journal_entries (user_id, pack, prompt, content)
       VALUES ($1, $2, $3, $4) RETURNING id, pack, prompt, content AS text, created_at`,
      [response.locals.userId, parsed.data.pack, parsed.data.prompt, parsed.data.text]
    );
    const row = result.rows[0];
    response.status(201).json({ data: { id: row.id, pack: row.pack, prompt: row.prompt, text: row.text, createdAt: row.created_at.toISOString() } });
  } catch (error) { next(error); }
});

wellnessRouter.get("/practice-events", async (_request, response, next) => {
  try {
    const result = await pool.query(
      `WITH all_practice_events AS (
         SELECT id, exercise_id, title, category, practice_kind, created_at
         FROM practice_events
         WHERE user_id = $1

         UNION ALL

         SELECT
           recommendation_events.id,
           recommendation_events.exercise_id,
           COALESCE(exercise_match.title, INITCAP(REPLACE(recommendation_events.exercise_id, '-', ' '))) AS title,
           COALESCE(exercise_match.category, 'Exercise') AS category,
           'exercise' AS practice_kind,
           recommendation_events.created_at
         FROM recommendation_events
         LEFT JOIN LATERAL (
           SELECT title, category
           FROM exercises
           WHERE exercises.id = recommendation_events.exercise_id
              OR exercises.linked_exercise_id = recommendation_events.exercise_id
           ORDER BY CASE WHEN exercises.id = recommendation_events.exercise_id THEN 0 ELSE 1 END
           LIMIT 1
         ) AS exercise_match ON TRUE
         WHERE recommendation_events.user_id = $1
           AND recommendation_events.event_type = 'completed'
           AND NOT EXISTS (
             SELECT 1 FROM practice_events
             WHERE practice_events.user_id = recommendation_events.user_id
               AND practice_events.exercise_id = recommendation_events.exercise_id
               AND ABS(EXTRACT(EPOCH FROM (practice_events.created_at - recommendation_events.created_at))) < 15
           )
       )
       SELECT id, exercise_id, title, category, practice_kind, created_at
       FROM all_practice_events
       ORDER BY created_at DESC
       LIMIT 500`,
      [response.locals.userId]
    );
    response.json({
      data: result.rows.map((row) => ({
        id: row.id,
        exerciseId: row.exercise_id,
        title: row.title,
        category: row.category,
        kind: row.practice_kind,
        createdAt: row.created_at.toISOString(),
      })),
    });
  } catch (error) { next(error); }
});

wellnessRouter.post("/practice-events", async (request, response, next) => {
  const parsed = practiceEventSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: "Invalid practice event." }); return; }
  try {
    const result = await pool.query(
      `INSERT INTO practice_events (user_id, exercise_id, title, category, practice_kind)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, exercise_id, title, category, practice_kind, created_at`,
      [
        response.locals.userId,
        parsed.data.exerciseId,
        parsed.data.title,
        parsed.data.category,
        parsed.data.kind,
      ]
    );
    const row = result.rows[0];
    response.status(201).json({ data: {
      id: row.id,
      exerciseId: row.exercise_id,
      title: row.title,
      category: row.category,
      kind: row.practice_kind,
      createdAt: row.created_at.toISOString(),
    } });
  } catch (error) { next(error); }
});
