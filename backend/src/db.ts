import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

export type ExerciseMediaStatus = "draft" | "ready";

export type ExerciseMediaRow = {
  exercise_id: string;
  video_object_key: string;
  video_url: string;
  poster_url: string | null;
  captions_url: string | null;
  duration_seconds: number | null;
  status: ExerciseMediaStatus;
  created_at: Date;
  updated_at: Date;
};

export type AuthUserRow = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  daily_reminder: boolean;
  practice_reminder: boolean;
  haptics: boolean;
  created_at: Date;
  updated_at: Date;
};

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
});

export async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (email = LOWER(email))
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      daily_reminder BOOLEAN NOT NULL DEFAULT TRUE,
      practice_reminder BOOLEAN NOT NULL DEFAULT FALSE,
      haptics BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      refresh_token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS exercise_media (
      exercise_id TEXT PRIMARY KEY,
      video_object_key TEXT NOT NULL,
      video_url TEXT NOT NULL,
      poster_url TEXT,
      captions_url TEXT,
      duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds > 0),
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS daily_check_ins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      check_in_date DATE NOT NULL,
      answers JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, check_in_date)
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pack TEXT NOT NULL,
      prompt TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS onboarding_responses (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      support_goal TEXT NOT NULL,
      age_range TEXT NOT NULL,
      daily_time TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      guidance_type TEXT NOT NULL CHECK (guidance_type IN ('breathing', 'video', 'guided', 'grounding', 'audio')),
      source_page INTEGER NOT NULL CHECK (source_page > 0),
      linked_exercise_id TEXT,
      description TEXT,
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
      display_order INTEGER NOT NULL DEFAULT 0,
      recommendation_tags TEXT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions(user_id);
    CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions(expires_at);
    CREATE INDEX IF NOT EXISTS exercise_media_status_idx ON exercise_media(status);
    CREATE INDEX IF NOT EXISTS daily_check_ins_user_date_idx ON daily_check_ins(user_id, check_in_date DESC);
    CREATE INDEX IF NOT EXISTS journal_entries_user_created_idx ON journal_entries(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS exercises_status_order_idx ON exercises(status, display_order, title);
  `);
}

export function serializeAuthUser(row: AuthUserRow) {
  return {
    user: {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.created_at.toISOString(),
    },
    preferences: {
      dailyReminder: row.daily_reminder,
      practiceReminder: row.practice_reminder,
      haptics: row.haptics,
    },
  };
}

export function serializeExerciseMedia(row: ExerciseMediaRow) {
  return {
    exerciseId: row.exercise_id,
    videoUrl: row.video_url,
    posterUrl: row.poster_url,
    captionsUrl: row.captions_url,
    durationSeconds: row.duration_seconds,
    status: row.status,
    updatedAt: row.updated_at.toISOString(),
  };
}
