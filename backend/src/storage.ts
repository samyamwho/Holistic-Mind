import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "./config.js";

export const storage = new S3Client({
  region: config.S3_REGION,
  endpoint: config.S3_ENDPOINT,
  forcePathStyle: config.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY_ID,
    secretAccessKey: config.S3_SECRET_ACCESS_KEY,
  },
});

export async function createVideoUploadUrl(objectKey: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: config.S3_BUCKET,
    Key: objectKey,
    ContentType: contentType,
  });

  return getSignedUrl(storage, command, { expiresIn: 15 * 60 });
}

export async function createAssetUploadUrl(objectKey: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: config.S3_BUCKET,
    Key: objectKey,
    ContentType: contentType,
  });
  return getSignedUrl(storage, command, { expiresIn: 15 * 60 });
}

export async function assertObjectExists(objectKey: string) {
  return storage.send(
    new HeadObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: objectKey,
    })
  );
}

export async function deleteObject(objectKey: string) {
  await storage.send(new DeleteObjectCommand({ Bucket: config.S3_BUCKET, Key: objectKey }));
}

export function getPublicObjectUrl(objectKey: string) {
  const baseUrl = config.S3_PUBLIC_BASE_URL.replace(/\/$/, "");
  const encodedKey = objectKey.split("/").map(encodeURIComponent).join("/");

  return `${baseUrl}/${encodedKey}`;
}
