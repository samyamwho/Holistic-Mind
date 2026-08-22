import "dotenv/config";
import { z } from "zod";

const booleanString = z
  .union([z.boolean(), z.string()])
  .default("false")
  .transform((value) => {
    if (typeof value === "boolean") return value;
    const lower = value.toLowerCase().trim();
    return lower === "true" || lower === "1";
  });

const databaseSslString = z
  .union([z.boolean(), z.string()])
  .default("auto")
  .transform((value): boolean | "auto" => {
    if (typeof value === "boolean") return value;
    const lower = value.toLowerCase().trim();
    if (lower === "true" || lower === "1") return true;
    if (lower === "false" || lower === "0") return false;
    return "auto";
  });

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_URL: z.string().url().default("http://localhost:4000"),
  APP_ORIGIN: z.string().default("*"),
  ADMIN_API_KEY: z.string().min(24),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(15 * 60),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().max(90).default(30),
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: databaseSslString,
  AUTO_MIGRATE: booleanString,
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().min(1),
  S3_ENDPOINT: z
    .string()
    .trim()
    .transform((val) => (val === "" ? undefined : val))
    .pipe(z.string().url().optional())
    .optional(),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: booleanString,
  S3_PUBLIC_BASE_URL: z.string().url(),
  RECOMMENDER_URL: z.string().url().default("http://localhost:8000"),
  RECOMMENDER_TIMEOUT_MS: z.coerce.number().int().positive().max(30000).default(10000),
  EMAIL_DELIVERY_MODE: z.enum(["log", "resend"]).default("log"),
  EMAIL_FROM: z.string().default("Holistic Mind <onboarding@resend.dev>"),
  RESEND_API_KEY: z
    .string()
    .trim()
    .transform((val) => (val === "" ? undefined : val))
    .optional(),
  GOOGLE_WEB_CLIENT_ID: z
    .string()
    .trim()
    .transform((val) => (val === "" ? undefined : val))
    .optional(),
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  console.error("Invalid backend environment variables:", z.prettifyError(parsedEnvironment.error));
  process.exit(1);
}

export const config = parsedEnvironment.data;
