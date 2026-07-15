import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import {
  pool,
  serializeExerciseMedia,
  type ExerciseMediaRow,
} from "../db.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import {
  assertObjectExists,
  createVideoUploadUrl,
  deleteObject,
  getPublicObjectUrl,
} from "../storage.js";

const exerciseIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);
const uploadRequestSchema = z.object({
  fileName: z.string().min(1).max(180),
  contentType: z.enum(["video/mp4", "video/quicktime", "video/webm"]),
});
const completeUploadSchema = z.object({
  objectKey: z.string().min(1).max(500),
  durationSeconds: z.number().int().positive().optional(),
  posterUrl: z.url().optional(),
  captionsUrl: z.url().optional(),
});

export const exerciseMediaRouter = Router();

exerciseMediaRouter.get("/", async (_request, response, next) => {
  try {
    const result = await pool.query<ExerciseMediaRow>(
      "SELECT * FROM exercise_media WHERE status = 'ready' ORDER BY updated_at DESC"
    );
    response.json({ data: result.rows.map(serializeExerciseMedia) });
  } catch (error) {
    next(error);
  }
});

exerciseMediaRouter.get("/:exerciseId", async (request, response, next) => {
  const parsedId = exerciseIdSchema.safeParse(request.params.exerciseId);

  if (!parsedId.success) {
    response.status(400).json({ error: "Invalid exercise id" });
    return;
  }

  try {
    const result = await pool.query<ExerciseMediaRow>(
      "SELECT * FROM exercise_media WHERE exercise_id = $1 AND status = 'ready'",
      [parsedId.data]
    );

    if (!result.rows[0]) {
      response.status(404).json({ error: "Exercise video not found" });
      return;
    }

    response.json({ data: serializeExerciseMedia(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

exerciseMediaRouter.delete("/:exerciseId", requireAdmin, async (request, response, next) => {
  const parsedId = exerciseIdSchema.safeParse(request.params.exerciseId);
  if (!parsedId.success) { response.status(400).json({ error: "Invalid exercise id" }); return; }
  try {
    const existing = await pool.query<ExerciseMediaRow>("SELECT * FROM exercise_media WHERE exercise_id = $1", [parsedId.data]);
    if (!existing.rows[0]) { response.status(404).json({ error: "Exercise video not found" }); return; }
    await deleteObject(existing.rows[0].video_object_key);
    await pool.query("DELETE FROM exercise_media WHERE exercise_id = $1", [parsedId.data]);
    response.json({ data: { deleted: true } });
  } catch (error) { next(error); }
});

exerciseMediaRouter.post(
  "/:exerciseId/upload-url",
  requireAdmin,
  async (request, response, next) => {
    const parsedId = exerciseIdSchema.safeParse(request.params.exerciseId);
    const parsedBody = uploadRequestSchema.safeParse(request.body);

    if (!parsedId.success || !parsedBody.success) {
      response.status(400).json({ error: "Invalid upload request" });
      return;
    }

    try {
      const extension =
        parsedBody.data.contentType === "video/quicktime"
          ? ".mov"
          : parsedBody.data.contentType === "video/webm"
            ? ".webm"
            : ".mp4";
      const objectKey = `exercises/${parsedId.data}/${Date.now()}-${randomUUID()}${extension}`;
      const uploadUrl = await createVideoUploadUrl(objectKey, parsedBody.data.contentType);

      response.json({
        data: {
          uploadUrl,
          objectKey,
          expiresInSeconds: 15 * 60,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

exerciseMediaRouter.post(
  "/:exerciseId/complete",
  requireAdmin,
  async (request, response, next) => {
    const parsedId = exerciseIdSchema.safeParse(request.params.exerciseId);
    const parsedBody = completeUploadSchema.safeParse(request.body);

    if (!parsedId.success || !parsedBody.success) {
      response.status(400).json({ error: "Invalid completion request" });
      return;
    }

    const expectedPrefix = `exercises/${parsedId.data}/`;
    if (!parsedBody.data.objectKey.startsWith(expectedPrefix)) {
      response.status(400).json({ error: "Video does not belong to this exercise" });
      return;
    }

    try {
      await assertObjectExists(parsedBody.data.objectKey);
      const videoUrl = getPublicObjectUrl(parsedBody.data.objectKey);
      const result = await pool.query<ExerciseMediaRow>(
        `
          INSERT INTO exercise_media (
            exercise_id,
            video_object_key,
            video_url,
            poster_url,
            captions_url,
            duration_seconds,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, 'ready')
          ON CONFLICT (exercise_id) DO UPDATE SET
            video_object_key = EXCLUDED.video_object_key,
            video_url = EXCLUDED.video_url,
            poster_url = EXCLUDED.poster_url,
            captions_url = EXCLUDED.captions_url,
            duration_seconds = EXCLUDED.duration_seconds,
            status = 'ready',
            updated_at = NOW()
          RETURNING *
        `,
        [
          parsedId.data,
          parsedBody.data.objectKey,
          videoUrl,
          parsedBody.data.posterUrl ?? null,
          parsedBody.data.captionsUrl ?? null,
          parsedBody.data.durationSeconds ?? null,
        ]
      );

      response.status(201).json({ data: serializeExerciseMedia(result.rows[0]) });
    } catch (error) {
      next(error);
    }
  }
);
