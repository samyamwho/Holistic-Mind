import { PutObjectCommand } from "@aws-sdk/client-s3";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PoolClient } from "pg";
import { config } from "../config.js";
import { ensureSchema, pool } from "../db.js";
import { getPublicObjectUrl, storage } from "../storage.js";

type Row = Record<string, unknown>;
type Bundle = {
  version: number;
  sourcePublicBaseUrl: string;
  tables: Record<string, Row[]>;
  assets: Array<{ key: string; file: string; contentType: string | null }>;
};

const tableDefinitions = {
  exercises: ["id", "title", "category", "guidance_type", "source_page", "linked_exercise_id", "description", "image_url", "status", "display_order", "recommendation_tags", "duration_seconds", "activation_level", "physical_intensity", "support_goals", "intended_states", "contraindication_tags", "breath_hold_required", "position_required", "environment_requirements"],
  exercise_media: ["exercise_id", "video_object_key", "video_url", "poster_url", "captions_url", "duration_seconds", "status"],
  exercise_audio: ["exercise_id", "audio_object_key", "audio_url", "content_type", "duration_seconds", "status"],
  library_courses: ["id", "title", "subtitle", "description", "category", "level", "cover_object_key", "cover_image_url", "status", "display_order"],
  library_course_modules: ["id", "course_id", "title", "description", "status", "display_order"],
  library_modules: ["id", "course_id", "course_module_id", "title", "description", "classification", "chapter_type", "interactive_content", "media_type", "media_object_key", "media_url", "media_content_type", "thumbnail_url", "duration_seconds", "status", "display_order"],
} as const;

const conflictColumns: Record<keyof typeof tableDefinitions, string> = {
  exercises: "id",
  exercise_media: "exercise_id",
  exercise_audio: "exercise_id",
  library_courses: "id",
  library_course_modules: "id",
  library_modules: "id",
};

function keyFromSourceUrl(value: unknown, sourceBaseUrl: string) {
  if (typeof value !== "string") return null;
  const prefix = `${sourceBaseUrl.replace(/\/$/, "")}/`;
  if (!value.startsWith(prefix)) return null;
  return value.slice(prefix.length).split("/").map(decodeURIComponent).join("/");
}

function rewriteUrl(value: unknown, sourceBaseUrl: string) {
  const key = keyFromSourceUrl(value, sourceBaseUrl);
  return key ? getPublicObjectUrl(key) : value;
}

async function upsertRows(
  client: PoolClient,
  table: keyof typeof tableDefinitions,
  rows: Row[],
  sourceBaseUrl: string,
) {
  const columns = tableDefinitions[table];
  const conflictColumn = conflictColumns[table];
  const urlColumns = new Set(["image_url", "video_url", "poster_url", "captions_url", "audio_url", "cover_image_url", "media_url", "thumbnail_url"]);
  const updates = columns.filter((column) => column !== conflictColumn).map((column) => `${column}=EXCLUDED.${column}`).join(",");
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(",");
  const sql = `INSERT INTO ${table} (${columns.join(",")}) VALUES (${placeholders}) ON CONFLICT (${conflictColumn}) DO UPDATE SET ${updates}, updated_at=NOW()`;
  for (const row of rows) {
    const values = columns.map((column) => urlColumns.has(column) ? rewriteUrl(row[column], sourceBaseUrl) : row[column] ?? null);
    await client.query(sql, values);
  }
}

const bundleArgument = process.argv.find((argument, index) => index > 1 && argument !== "--replace");
if (!bundleArgument) throw new Error("Usage: npm run content:import -- <bundle-directory> [--replace]");
const replace = process.argv.includes("--replace");
if (replace && process.env.CONFIRM_CONTENT_REPLACE !== "yes") {
  throw new Error("Set CONFIRM_CONTENT_REPLACE=yes to replace target content tables.");
}

const bundleDirectory = path.resolve(bundleArgument);
const bundle = JSON.parse(await readFile(path.join(bundleDirectory, "content.json"), "utf8")) as Bundle;
if (bundle.version !== 1) throw new Error(`Unsupported content bundle version ${bundle.version}`);

for (const table of Object.keys(tableDefinitions)) {
  if (!Array.isArray(bundle.tables[table])) {
    throw new Error(`Content bundle is missing the ${table} table.`);
  }
}

await ensureSchema();

for (const asset of bundle.assets) {
  const body = await readFile(path.join(bundleDirectory, "assets", asset.file));
  await storage.send(new PutObjectCommand({ Bucket: config.S3_BUCKET, Key: asset.key, Body: body, ContentType: asset.contentType ?? undefined }));
}

const client = await pool.connect();
try {
  await client.query("BEGIN");
  if (replace) {
    await client.query("DELETE FROM library_courses");
    await client.query("DELETE FROM exercise_media");
    await client.query("DELETE FROM exercise_audio");
    await client.query("DELETE FROM exercises");
  }
  await upsertRows(client, "exercises", bundle.tables.exercises ?? [], bundle.sourcePublicBaseUrl);
  await upsertRows(client, "exercise_media", bundle.tables.exercise_media ?? [], bundle.sourcePublicBaseUrl);
  await upsertRows(client, "exercise_audio", bundle.tables.exercise_audio ?? [], bundle.sourcePublicBaseUrl);
  await upsertRows(client, "library_courses", bundle.tables.library_courses ?? [], bundle.sourcePublicBaseUrl);
  await upsertRows(client, "library_course_modules", bundle.tables.library_course_modules ?? [], bundle.sourcePublicBaseUrl);
  await upsertRows(client, "library_modules", bundle.tables.library_modules ?? [], bundle.sourcePublicBaseUrl);
  await client.query("COMMIT");
  console.log(`${replace ? "Replaced" : "Upserted"} target content from ${bundleDirectory}; uploaded ${bundle.assets.length} assets.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
