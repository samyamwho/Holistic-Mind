import { openAsBlob } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

function getArgument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function getContentType(filePath: string) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".mov":
      return "video/quicktime";
    case ".webm":
      return "video/webm";
    default:
      return "video/mp4";
  }
}

async function readJson(response: Response) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

const exerciseId = getArgument("exercise");
const filePath = getArgument("file");
const duration = getArgument("duration");

if (!exerciseId || !filePath) {
  console.error(
    "Usage: npm run upload -- --exercise shoulder-drop-reset --file /path/video.mp4 --duration 60"
  );
  process.exit(1);
}

const fileInfo = await stat(filePath);
if (!fileInfo.isFile()) {
  throw new Error(`Not a file: ${filePath}`);
}

const apiBaseUrl = config.API_BASE_URL.replace(/\/$/, "");
const contentType = getContentType(filePath);
const headers = {
  "content-type": "application/json",
  "x-admin-key": config.ADMIN_API_KEY,
};

const uploadResponse = await fetch(
  `${apiBaseUrl}/api/exercise-media/${encodeURIComponent(exerciseId)}/upload-url`,
  {
    method: "POST",
    headers,
    body: JSON.stringify({ fileName: path.basename(filePath), contentType }),
  }
);
const uploadPayload = (await readJson(uploadResponse)) as {
  data: { uploadUrl: string; objectKey: string };
};

const video = await openAsBlob(filePath, { type: contentType });
const storageResponse = await fetch(uploadPayload.data.uploadUrl, {
  method: "PUT",
  headers: { "content-type": contentType },
  body: video,
});

if (!storageResponse.ok) {
  throw new Error(`Storage upload failed with ${storageResponse.status}`);
}

const completeResponse = await fetch(
  `${apiBaseUrl}/api/exercise-media/${encodeURIComponent(exerciseId)}/complete`,
  {
    method: "POST",
    headers,
    body: JSON.stringify({
      objectKey: uploadPayload.data.objectKey,
      durationSeconds: duration ? Number(duration) : undefined,
    }),
  }
);
const completePayload = await readJson(completeResponse);

console.log("Video is ready:", completePayload);
