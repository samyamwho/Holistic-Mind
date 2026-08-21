import { createHmac } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { recommendableExerciseIds } from "../data/recommendationProfiles.js";
import { pool } from "../db.js";
import { authenticate } from "../middleware/authenticate.js";
import { requestLocalRecommendations } from "../recommender.js";

const eventTypeSchema = z.enum([
  "opened",
  "started",
  "completed",
  "abandoned",
  "saved",
  "repeated",
]);

const createEventSchema = z.object({
  exerciseId: z.string().trim().min(1).max(150),
  eventType: eventTypeSchema,
  metadata: z.record(z.string(), z.unknown()).default({}),
});

const feedbackSchema = z.object({
  exerciseId: z.string().trim().min(1).max(150),
  helpfulness: z.number().int().min(0).max(3).nullable().optional(),
  stateChange: z.enum(["better", "same", "worse"]).nullable().optional(),
  uncomfortable: z.boolean().default(false),
}).refine(
  (value) =>
    value.helpfulness !== undefined ||
    value.stateChange !== undefined ||
    value.uncomfortable,
  { message: "At least one feedback value is required." }
);

async function ownsRecommendedExercise(userId: string, requestId: string, exerciseId: string) {
  const result = await pool.query(
    `SELECT 1
     FROM recommendation_requests request
     JOIN recommendation_items item ON item.request_id = request.id
     WHERE request.id = $1 AND request.user_id = $2 AND item.exercise_id = $3`,
    [requestId, userId, exerciseId]
  );
  return Boolean(result.rows[0]);
}

export const recommendationsRouter = Router();
recommendationsRouter.use(authenticate);

function pseudonymousUserId(userId: string) {
  return createHmac("sha256", config.ACCESS_TOKEN_SECRET)
    .update(`recommendation-user:${userId}`)
    .digest("hex");
}

recommendationsRouter.post("/generate", async (_request, response, next) => {
  const userId = response.locals.userId as string;
  try {
    const [
      onboardingResult,
      checkInResult,
      journalResult,
      exerciseResult,
      interactionResult,
      excludedResult,
    ] = await Promise.all([
      pool.query(
        `SELECT support_goal FROM onboarding_responses WHERE user_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT id, answers FROM daily_check_ins
         WHERE user_id = $1 ORDER BY check_in_date DESC LIMIT 1`,
        [userId]
      ),
      pool.query(
        `SELECT LEFT(content, 1200) AS content FROM journal_entries
         WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3`,
        [userId]
      ),
      pool.query(
        `SELECT linked_exercise_id AS id, title, category,
                COALESCE(description, '') AS description,
                recommendation_tags, support_goals, intended_states,
                contraindication_tags, activation_level, physical_intensity,
                breath_hold_required
         FROM exercises
         WHERE status = 'published'
           AND linked_exercise_id = ANY($1::text[])
         ORDER BY display_order, title`,
        [recommendableExerciseIds]
      ),
      pool.query(
        `WITH feedback_values AS (
           SELECT user_id, exercise_id,
             CASE
               WHEN uncomfortable THEN -1.0
               WHEN state_change = 'worse' THEN -0.75
               WHEN state_change = 'better' THEN 1.0
               WHEN helpfulness IS NOT NULL THEN (helpfulness::float / 1.5) - 1.0
               ELSE 0.0
             END AS value,
             updated_at AS occurred_at
           FROM recommendation_feedback
         ),
         event_values AS (
           SELECT user_id, exercise_id,
             CASE event_type
               WHEN 'completed' THEN 0.8
               WHEN 'repeated' THEN 1.0
               WHEN 'saved' THEN 0.7
               WHEN 'started' THEN 0.35
               WHEN 'opened' THEN 0.15
               WHEN 'abandoned' THEN -0.4
               ELSE 0.0
             END AS value,
             created_at AS occurred_at
           FROM recommendation_events
           WHERE event_type <> 'impression'
         ),
         combined AS (
           SELECT * FROM feedback_values
           UNION ALL
           SELECT * FROM event_values
         )
         SELECT user_id, exercise_id,
                GREATEST(-1.0, LEAST(1.0, AVG(value))) AS value
         FROM combined
         WHERE occurred_at > NOW() - INTERVAL '180 days'
         GROUP BY user_id, exercise_id
         LIMIT 10000`
      ),
      pool.query(
        `SELECT DISTINCT exercise_id FROM recommendation_feedback
         WHERE user_id = $1 AND uncomfortable = TRUE`,
        [userId]
      ),
    ]);

    if (!checkInResult.rows[0]) {
      response.status(409).json({ error: "Complete a daily check-in before requesting recommendations." });
      return;
    }
    if (exerciseResult.rows.length === 0) {
      response.status(503).json({ error: "No published exercises are available." });
      return;
    }

    const generated = await requestLocalRecommendations({
      user_id: pseudonymousUserId(userId),
      onboarding_goal: onboardingResult.rows[0]?.support_goal ?? "",
      check_in_answers: checkInResult.rows[0].answers,
      journal_texts: journalResult.rows.map((row) => row.content),
      exercises: exerciseResult.rows,
      interactions: interactionResult.rows.map((row) => ({
        user_id: pseudonymousUserId(row.user_id),
        exercise_id: row.exercise_id,
        value: Number(row.value),
      })),
      excluded_exercise_ids: excludedResult.rows.map((row) => row.exercise_id),
      limit: 4,
    });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const created = await client.query(
        `INSERT INTO recommendation_requests (user_id, model_version, context_snapshot)
         VALUES ($1, $2, $3) RETURNING id, created_at`,
        [
          userId,
          generated.modelVersion,
          {
            strategy: generated.strategy,
            checkInId: checkInResult.rows[0].id,
            journalEntryCount: journalResult.rows.length,
            journalTextStored: false,
          },
        ]
      );
      const requestId = created.rows[0].id as string;
      for (const [index, item] of generated.items.entries()) {
        await client.query(
          `INSERT INTO recommendation_items
            (request_id, exercise_id, position, score, score_components, reason, exploration)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            requestId,
            item.exerciseId,
            index + 1,
            item.score,
            item.scoreComponents,
            item.reason,
            item.exploration,
          ]
        );
        await client.query(
          `INSERT INTO recommendation_events
            (request_id, user_id, exercise_id, event_type, metadata)
           VALUES ($1, $2, $3, 'impression', $4)`,
          [requestId, userId, item.exerciseId, { position: index + 1 }]
        );
      }
      await client.query("COMMIT");
      response.status(201).json({
        data: {
          requestId,
          modelVersion: generated.modelVersion,
          strategy: generated.strategy,
          createdAt: created.rows[0].created_at.toISOString(),
          items: generated.items,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

recommendationsRouter.post("/:requestId/events", async (request, response, next) => {
  const requestId = z.uuid().safeParse(request.params.requestId);
  const parsed = createEventSchema.safeParse(request.body);
  if (!requestId.success || !parsed.success) {
    response.status(400).json({ error: "Invalid recommendation event." });
    return;
  }

  try {
    if (!await ownsRecommendedExercise(
      response.locals.userId,
      requestId.data,
      parsed.data.exerciseId
    )) {
      response.status(404).json({ error: "Recommendation not found." });
      return;
    }
    const result = await pool.query(
      `INSERT INTO recommendation_events
        (request_id, user_id, exercise_id, event_type, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [
        requestId.data,
        response.locals.userId,
        parsed.data.exerciseId,
        parsed.data.eventType,
        parsed.data.metadata,
      ]
    );
    response.status(201).json({
      data: {
        id: result.rows[0].id,
        createdAt: result.rows[0].created_at.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

recommendationsRouter.put("/:requestId/feedback", async (request, response, next) => {
  const requestId = z.uuid().safeParse(request.params.requestId);
  const parsed = feedbackSchema.safeParse(request.body);
  if (!requestId.success || !parsed.success) {
    response.status(400).json({ error: "Invalid recommendation feedback." });
    return;
  }

  try {
    if (!await ownsRecommendedExercise(
      response.locals.userId,
      requestId.data,
      parsed.data.exerciseId
    )) {
      response.status(404).json({ error: "Recommendation not found." });
      return;
    }
    const result = await pool.query(
      `INSERT INTO recommendation_feedback
        (request_id, user_id, exercise_id, helpfulness, state_change, uncomfortable)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (request_id, exercise_id) DO UPDATE SET
         helpfulness = EXCLUDED.helpfulness,
         state_change = EXCLUDED.state_change,
         uncomfortable = EXCLUDED.uncomfortable,
         updated_at = NOW()
       RETURNING id, helpfulness, state_change, uncomfortable, updated_at`,
      [
        requestId.data,
        response.locals.userId,
        parsed.data.exerciseId,
        parsed.data.helpfulness ?? null,
        parsed.data.stateChange ?? null,
        parsed.data.uncomfortable,
      ]
    );
    const row = result.rows[0];
    response.json({
      data: {
        id: row.id,
        helpfulness: row.helpfulness,
        stateChange: row.state_change,
        uncomfortable: row.uncomfortable,
        updatedAt: row.updated_at.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});
