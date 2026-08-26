import { GetObjectCommand } from "@aws-sdk/client-s3";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { pool } from "../db.js";
import { storage } from "../storage.js";

type Row = Record<string, unknown>;
type AssetRecord = { key: string; file: string; contentType: string | null; size: number };

const tableNames = [
  "exercises",
  "exercise_media",
  "exercise_audio",
  "library_courses",
  "library_course_modules",
  "library_modules",
] as const;

function keyFromPublicUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const prefix = `${config.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/`;
  if (!value.startsWith(prefix)) return null;
  return value.slice(prefix.length).split("/").map(decodeURIComponent).join("/");
}

function assetFileName(key: string) {
  return Buffer.from(key).toString("base64url");
}

const requestedDirectory = process.argv[2];
if (!requestedDirectory) {
  throw new Error("Usage: npm run content:export -- <output-directory>");
}

const outputDirectory = path.resolve(requestedDirectory);
const assetsDirectory = path.join(outputDirectory, "assets");
await mkdir(assetsDirectory, { recursive: true });

try {
  const tables: Record<string, Row[]> = {};
  for (const table of tableNames) {
    const result = await pool.query<Row>(`SELECT * FROM ${table}`);
    tables[table] = result.rows;
  }

  const objectKeys = new Set<string>();
  const addKey = (value: unknown) => { if (typeof value === "string" && value) objectKeys.add(value); };
  const addUrl = (value: unknown) => { const key = keyFromPublicUrl(value); if (key) objectKeys.add(key); };

  for (const row of tables.exercises) addUrl(row.image_url);
  for (const row of tables.exercise_media) {
    addKey(row.video_object_key);
    addUrl(row.poster_url);
    addUrl(row.captions_url);
  }
  for (const row of tables.exercise_audio) addKey(row.audio_object_key);
  for (const row of tables.library_courses) addKey(row.cover_object_key);
  for (const row of tables.library_modules) addKey(row.media_object_key);

  const assets: AssetRecord[] = [];
  const missingAssets: string[] = [];
  for (const key of [...objectKeys].sort()) {
    try {
      const object = await storage.send(new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: key }));
      if (!object.Body) throw new Error("Object body is empty");
      const bytes = Buffer.from(await object.Body.transformToByteArray());
      const file = assetFileName(key);
      await writeFile(path.join(assetsDirectory, file), bytes);
      assets.push({ key, file, contentType: object.ContentType ?? null, size: bytes.length });
    } catch (error) {
      missingAssets.push(key);
      console.error(`Could not export storage object ${key}:`, error instanceof Error ? error.message : error);
    }
  }

  if (missingAssets.length > 0) {
    throw new Error(
      `Content export stopped because ${missingAssets.length} referenced storage object(s) are missing. ` +
      "Restore or remove those media references before promoting content.",
    );
  }

  const bundle = {
    version: 1,
    exportedAt: new Date().toISOString(),
    sourcePublicBaseUrl: config.S3_PUBLIC_BASE_URL.replace(/\/$/, ""),
    tables,
    assets,
  };
  await writeFile(path.join(outputDirectory, "content.json"), `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

  const counts = tableNames.map((table) => `${table}: ${tables[table].length}`).join(", ");
  console.log(`Content exported to ${outputDirectory}`);
  console.log(`${counts}; assets: ${assets.length}`);
} finally {
  await pool.end();
}
