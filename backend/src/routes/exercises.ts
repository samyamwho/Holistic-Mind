import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { assertObjectExists, createAssetUploadUrl, getPublicObjectUrl } from "../storage.js";

const idSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(150);
const exerciseSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(160),
  category: z.string().trim().min(1).max(100),
  guidanceType: z.enum(["breathing", "video", "guided", "grounding", "audio"]),
  sourcePage: z.number().int().positive(),
  exerciseId: idSchema.nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  imageUrl: z.url().nullable().optional(),
  status: z.enum(["draft", "published", "archived"]).default("published"),
  displayOrder: z.number().int().min(0).default(0),
  recommendationTags: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  durationSeconds: z.number().int().positive().nullable().default(null),
  activationLevel: z.enum(["down_regulating", "neutral", "up_regulating"]).default("neutral"),
  physicalIntensity: z.enum(["low", "moderate", "high"]).default("low"),
  supportGoals: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  intendedStates: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  contraindicationTags: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  breathHoldRequired: z.boolean().default(false),
  positionRequired: z.enum(["any", "seated", "standing", "lying"]).default("any"),
  environmentRequirements: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
});
const updateSchema = exerciseSchema.omit({ id: true }).partial().refine((value) => Object.keys(value).length > 0);
const imageUploadSchema = z.object({
  fileName: z.string().min(1).max(180),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});
const imageCompleteSchema = z.object({ objectKey: z.string().min(1).max(500) });

function serialize(row: Record<string, unknown>) {
  return {
    id: row.id, title: row.title, category: row.category,
    guidanceType: row.guidance_type, sourcePage: row.source_page,
    exerciseId: row.linked_exercise_id, description: row.description,
    imageUrl: row.image_url, status: row.status, displayOrder: row.display_order,
    recommendationTags: row.recommendation_tags,
    durationSeconds: row.duration_seconds,
    activationLevel: row.activation_level,
    physicalIntensity: row.physical_intensity,
    supportGoals: row.support_goals,
    intendedStates: row.intended_states,
    contraindicationTags: row.contraindication_tags,
    breathHoldRequired: row.breath_hold_required,
    positionRequired: row.position_required,
    environmentRequirements: row.environment_requirements,
  };
}

export const exercisesRouter = Router();

exercisesRouter.get("/admin/all", requireAdmin, async (_request, response, next) => {
  try {
    const result = await pool.query("SELECT * FROM exercises ORDER BY display_order, title");
    response.json({ data: result.rows.map(serialize) });
  } catch (error) { next(error); }
});

exercisesRouter.get("/", async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT * FROM exercises WHERE status = 'published' ORDER BY display_order, title`
    );
    response.json({ data: result.rows.map(serialize) });
  } catch (error) { next(error); }
});

exercisesRouter.get("/:id", async (request, response, next) => {
  const id = idSchema.safeParse(request.params.id);
  if (!id.success) { response.status(400).json({ error: "Invalid exercise id" }); return; }
  try {
    const result = await pool.query("SELECT * FROM exercises WHERE id = $1 AND status = 'published'", [id.data]);
    if (!result.rows[0]) { response.status(404).json({ error: "Exercise not found" }); return; }
    response.json({ data: serialize(result.rows[0]) });
  } catch (error) { next(error); }
});

exercisesRouter.post("/", requireAdmin, async (request, response, next) => {
  const parsed = exerciseSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: "Invalid exercise" }); return; }
  const value = parsed.data;
  try {
    const result = await pool.query(
      `INSERT INTO exercises (
         id, title, category, guidance_type, source_page, linked_exercise_id,
         description, image_url, status, display_order, recommendation_tags,
         duration_seconds, activation_level, physical_intensity, support_goals,
         intended_states, contraindication_tags, breath_hold_required,
         position_required, environment_requirements
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [value.id, value.title, value.category, value.guidanceType, value.sourcePage, value.exerciseId ?? null,
       value.description ?? null, value.imageUrl ?? null, value.status, value.displayOrder,
       value.recommendationTags, value.durationSeconds, value.activationLevel,
       value.physicalIntensity, value.supportGoals, value.intendedStates,
       value.contraindicationTags, value.breathHoldRequired, value.positionRequired,
       value.environmentRequirements]
    );
    response.status(201).json({ data: serialize(result.rows[0]) });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") { response.status(409).json({ error: "Exercise id already exists" }); return; }
    next(error);
  }
});

exercisesRouter.patch("/:id", requireAdmin, async (request, response, next) => {
  const id = idSchema.safeParse(request.params.id);
  const parsed = updateSchema.safeParse(request.body);
  if (!id.success || !parsed.success) { response.status(400).json({ error: "Invalid exercise update" }); return; }
  const current = await pool.query("SELECT * FROM exercises WHERE id = $1", [id.data]);
  if (!current.rows[0]) { response.status(404).json({ error: "Exercise not found" }); return; }
  const old = serialize(current.rows[0]) as Record<string, unknown>;
  const value = { ...old, ...parsed.data };
  try {
    const result = await pool.query(
      `UPDATE exercises SET title=$2, category=$3, guidance_type=$4, source_page=$5,
       linked_exercise_id=$6, description=$7, image_url=$8, status=$9, display_order=$10,
       recommendation_tags=$11, duration_seconds=$12, activation_level=$13,
       physical_intensity=$14, support_goals=$15, intended_states=$16,
       contraindication_tags=$17, breath_hold_required=$18, position_required=$19,
       environment_requirements=$20, updated_at=NOW() WHERE id=$1 RETURNING *`,
      [id.data, value.title, value.category, value.guidanceType, value.sourcePage, value.exerciseId ?? null,
       value.description ?? null, value.imageUrl ?? null, value.status, value.displayOrder,
       value.recommendationTags, value.durationSeconds, value.activationLevel,
       value.physicalIntensity, value.supportGoals, value.intendedStates,
       value.contraindicationTags, value.breathHoldRequired, value.positionRequired,
       value.environmentRequirements]
    );
    response.json({ data: serialize(result.rows[0]) });
  } catch (error) { next(error); }
});

exercisesRouter.post("/:id/image-upload-url", requireAdmin, async (request, response, next) => {
  const id = idSchema.safeParse(request.params.id);
  const body = imageUploadSchema.safeParse(request.body);
  if (!id.success || !body.success) { response.status(400).json({ error: "Invalid image upload" }); return; }
  const extension = body.data.contentType === "image/png" ? ".png" : body.data.contentType === "image/webp" ? ".webp" : ".jpg";
  const objectKey = `exercise-images/${id.data}/${Date.now()}-${randomUUID()}${extension}`;
  try {
    const uploadUrl = await createAssetUploadUrl(objectKey, body.data.contentType);
    response.json({ data: { uploadUrl, objectKey, expiresInSeconds: 900 } });
  } catch (error) { next(error); }
});

exercisesRouter.post("/:id/image-complete", requireAdmin, async (request, response, next) => {
  const id = idSchema.safeParse(request.params.id);
  const body = imageCompleteSchema.safeParse(request.body);
  if (!id.success || !body.success || !body.data.objectKey.startsWith(`exercise-images/${id.success ? id.data : ""}/`)) {
    response.status(400).json({ error: "Invalid image completion" }); return;
  }
  try {
    await assertObjectExists(body.data.objectKey);
    const imageUrl = getPublicObjectUrl(body.data.objectKey);
    const result = await pool.query("UPDATE exercises SET image_url=$2, updated_at=NOW() WHERE id=$1 RETURNING *", [id.data, imageUrl]);
    if (!result.rows[0]) { response.status(404).json({ error: "Exercise not found" }); return; }
    response.json({ data: serialize(result.rows[0]) });
  } catch (error) { next(error); }
});
