import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { pool, serializeExerciseAudio, type ExerciseAudioRow } from "../db.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { assertObjectExists, createAssetUploadUrl, deleteObject, getPublicObjectUrl } from "../storage.js";

const exerciseIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);
const maxAudioBytes = 250 * 1024 * 1024;
const audioContentType = z.enum(["audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/webm", "audio/aac", "audio/ogg"]);
const uploadSchema = z.object({
  fileName: z.string().min(1).max(180),
  contentType: audioContentType,
  fileSize: z.number().int().positive().max(maxAudioBytes),
});
const completeSchema = z.object({ objectKey: z.string().min(1).max(500), contentType: audioContentType, durationSeconds: z.number().int().positive().optional() });

async function isAudioExercise(exerciseId: string) {
  const result = await pool.query(
    "SELECT 1 FROM exercises WHERE linked_exercise_id = $1 AND guidance_type = 'audio' LIMIT 1",
    [exerciseId]
  );
  return Boolean(result.rows[0]);
}

export const exerciseAudioRouter = Router();

exerciseAudioRouter.get("/", async (_request, response, next) => {
  try {
    response.set("Cache-Control", "no-store");
    const result = await pool.query<ExerciseAudioRow>("SELECT * FROM exercise_audio WHERE status = 'ready' ORDER BY updated_at DESC");
    response.json({ data: result.rows.map(serializeExerciseAudio) });
  } catch (error) { next(error); }
});

exerciseAudioRouter.get("/:exerciseId", async (request, response, next) => {
  const id = exerciseIdSchema.safeParse(request.params.exerciseId);
  if (!id.success) { response.status(400).json({ error: "Invalid exercise id" }); return; }
  try {
    response.set("Cache-Control", "no-store");
    const result = await pool.query<ExerciseAudioRow>("SELECT * FROM exercise_audio WHERE exercise_id = $1 AND status = 'ready'", [id.data]);
    if (!result.rows[0]) { response.status(404).json({ error: "Exercise audio not found" }); return; }
    response.json({ data: serializeExerciseAudio(result.rows[0]) });
  } catch (error) { next(error); }
});

exerciseAudioRouter.post("/:exerciseId/upload-url", requireAdmin, async (request, response, next) => {
  const id = exerciseIdSchema.safeParse(request.params.exerciseId);
  const body = uploadSchema.safeParse(request.body);
  if (!id.success || !body.success) { response.status(400).json({ error: "Invalid audio upload request" }); return; }
  const extensions: Record<z.infer<typeof audioContentType>, string> = {
    "audio/mpeg": ".mp3", "audio/mp3": ".mp3", "audio/mp4": ".m4a", "audio/x-m4a": ".m4a",
    "audio/wav": ".wav", "audio/webm": ".webm", "audio/aac": ".aac", "audio/ogg": ".ogg",
  };
  try {
    if (!(await isAudioExercise(id.data))) {
      response.status(404).json({ error: "Create an audio catalog item with this linked practice ID before uploading" });
      return;
    }
    const objectKey = `exercise-audio/${id.data}/${Date.now()}-${randomUUID()}${extensions[body.data.contentType]}`;
    const uploadUrl = await createAssetUploadUrl(objectKey, body.data.contentType);
    response.json({ data: { uploadUrl, objectKey, expiresInSeconds: 900 } });
  } catch (error) { next(error); }
});

exerciseAudioRouter.post("/:exerciseId/complete", requireAdmin, async (request, response, next) => {
  const id = exerciseIdSchema.safeParse(request.params.exerciseId);
  const body = completeSchema.safeParse(request.body);
  if (!id.success || !body.success || !body.data.objectKey.startsWith(`exercise-audio/${id.success ? id.data : ""}/`)) {
    response.status(400).json({ error: "Invalid audio completion request" }); return;
  }
  try {
    if (!(await isAudioExercise(id.data))) {
      response.status(404).json({ error: "Audio catalog item not found" });
      return;
    }
    const object = await assertObjectExists(body.data.objectKey);
    if (typeof object.ContentLength === "number" && object.ContentLength > maxAudioBytes) {
      await deleteObject(body.data.objectKey).catch(() => undefined);
      response.status(413).json({ error: "Audio files must be 250 MB or smaller" });
      return;
    }
    if (object.ContentLength === 0) {
      await deleteObject(body.data.objectKey).catch(() => undefined);
      response.status(400).json({ error: "Uploaded audio file is empty" });
      return;
    }
    if (object.ContentType && object.ContentType !== body.data.contentType) {
      await deleteObject(body.data.objectKey).catch(() => undefined);
      response.status(400).json({ error: "Uploaded audio content type does not match" });
      return;
    }
    const audioUrl = getPublicObjectUrl(body.data.objectKey);
    const previous = await pool.query<ExerciseAudioRow>("SELECT * FROM exercise_audio WHERE exercise_id=$1", [id.data]);
    const result = await pool.query<ExerciseAudioRow>(
      `INSERT INTO exercise_audio (exercise_id, audio_object_key, audio_url, content_type, duration_seconds, status)
       VALUES ($1,$2,$3,$4,$5,'ready')
       ON CONFLICT (exercise_id) DO UPDATE SET audio_object_key=EXCLUDED.audio_object_key,
       audio_url=EXCLUDED.audio_url, content_type=EXCLUDED.content_type,
       duration_seconds=EXCLUDED.duration_seconds, status='ready', updated_at=NOW() RETURNING *`,
      [id.data, body.data.objectKey, audioUrl, body.data.contentType, body.data.durationSeconds ?? null]
    );
    if (previous.rows[0] && previous.rows[0].audio_object_key !== body.data.objectKey) {
      await deleteObject(previous.rows[0].audio_object_key).catch((error) => console.error("Unable to remove replaced audio object", error));
    }
    response.status(201).json({ data: serializeExerciseAudio(result.rows[0]) });
  } catch (error) { next(error); }
});

exerciseAudioRouter.delete("/:exerciseId", requireAdmin, async (request, response, next) => {
  const id = exerciseIdSchema.safeParse(request.params.exerciseId);
  if (!id.success) { response.status(400).json({ error: "Invalid exercise id" }); return; }
  try {
    const result = await pool.query<ExerciseAudioRow>("SELECT * FROM exercise_audio WHERE exercise_id=$1", [id.data]);
    if (!result.rows[0]) { response.status(404).json({ error: "Exercise audio not found" }); return; }
    await deleteObject(result.rows[0].audio_object_key);
    await pool.query("DELETE FROM exercise_audio WHERE exercise_id=$1", [id.data]);
    response.json({ data: { deleted: true } });
  } catch (error) { next(error); }
});
