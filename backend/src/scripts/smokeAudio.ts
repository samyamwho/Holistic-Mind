import assert from "node:assert/strict";
import { config } from "../config.js";
import { pool } from "../db.js";
import { deleteObject } from "../storage.js";

type JsonResponse<T> = { status: number; data?: T; error?: string };
type AudioResponse = {
  exerciseId: string;
  audioUrl: string;
  contentType: string;
  durationSeconds: number | null;
  status: "ready";
};
type CatalogResponse = { id: string; audioUrl: string | null; audioDurationSeconds: number | null };

async function api<T>(path: string, options: RequestInit = {}): Promise<JsonResponse<T>> {
  const response = await fetch(`${config.API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      "x-admin-key": config.ADMIN_API_KEY,
      ...options.headers,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as { data?: T; error?: string };
  return { status: response.status, ...payload };
}

function createSilentWav(durationSeconds = 1, sampleRate = 8_000) {
  const dataLength = durationSeconds * sampleRate * 2;
  const buffer = Buffer.alloc(44 + dataLength);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);
  return buffer;
}

const exerciseId = `audio-smoke-${Date.now()}`;
let uploadedObjectKey: string | undefined;

try {
  const created = await api<CatalogResponse>("/api/exercises", {
    method: "POST",
    body: JSON.stringify({
      id: exerciseId,
      title: "Temporary audio smoke test",
      category: "Audio Library",
      guidanceType: "audio",
      sourcePage: 1,
      exerciseId,
      description: "Removed automatically after the smoke test.",
      status: "published",
      displayOrder: 99_999,
      recommendationTags: ["audio"],
      durationSeconds: 1,
      activationLevel: "down_regulating",
      physicalIntensity: "low",
      supportGoals: ["calm"],
      intendedStates: ["stressed"],
      contraindicationTags: [],
      breathHoldRequired: false,
      positionRequired: "any",
      environmentRequirements: ["quiet_space"],
    }),
  });
  assert.equal(created.status, 201, created.error);

  const wav = createSilentWav();
  const prepared = await api<{ uploadUrl: string; objectKey: string }>(
    `/api/exercise-audio/${exerciseId}/upload-url`,
    {
      method: "POST",
      body: JSON.stringify({ fileName: "smoke.wav", contentType: "audio/wav", fileSize: wav.byteLength }),
    }
  );
  assert.equal(prepared.status, 200, prepared.error);
  assert.ok(prepared.data);
  uploadedObjectKey = prepared.data.objectKey;

  const upload = await fetch(prepared.data.uploadUrl, {
    method: "PUT",
    headers: { "content-type": "audio/wav" },
    body: wav,
  });
  assert.equal(upload.status, 200);

  const completed = await api<AudioResponse>(`/api/exercise-audio/${exerciseId}/complete`, {
    method: "POST",
    body: JSON.stringify({ objectKey: uploadedObjectKey, contentType: "audio/wav", durationSeconds: 1 }),
  });
  assert.equal(completed.status, 201, completed.error);
  assert.equal(completed.data?.durationSeconds, 1);
  assert.ok(completed.data?.audioUrl);

  const catalog = await api<CatalogResponse>(`/api/exercises/${exerciseId}`);
  assert.equal(catalog.status, 200, catalog.error);
  assert.equal(catalog.data?.audioUrl, completed.data?.audioUrl);
  assert.equal(catalog.data?.audioDurationSeconds, 1);

  const publicAudio = await fetch(completed.data!.audioUrl);
  assert.equal(publicAudio.status, 200);
  const bytes = Buffer.from(await publicAudio.arrayBuffer());
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF");

  const removed = await api<{ deleted: true }>(`/api/exercise-audio/${exerciseId}`, { method: "DELETE" });
  assert.equal(removed.status, 200, removed.error);
  uploadedObjectKey = undefined;

  console.log("Audio upload, catalog, and public playback smoke test passed.");
} finally {
  if (uploadedObjectKey) await deleteObject(uploadedObjectKey).catch(() => undefined);
  await pool.query("DELETE FROM exercise_audio WHERE exercise_id = $1", [exerciseId]);
  await pool.query("DELETE FROM exercises WHERE id = $1", [exerciseId]);
  await pool.end();
}
