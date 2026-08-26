import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

function resolveDatabaseUrl() {
  const tunnelHost = process.env.DATABASE_TUNNEL_HOST?.trim();
  const tunnelPort = process.env.DATABASE_TUNNEL_PORT?.trim();
  if (!tunnelHost && !tunnelPort) return config.DATABASE_URL;
  if (!tunnelHost || !tunnelPort) {
    throw new Error("DATABASE_TUNNEL_HOST and DATABASE_TUNNEL_PORT must be set together.");
  }
  const url = new URL(config.DATABASE_URL);
  url.hostname = tunnelHost;
  url.port = tunnelPort;
  return url.toString();
}

const databaseUrl = resolveDatabaseUrl();

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

export type ExerciseAudioRow = {
  exercise_id: string;
  audio_object_key: string;
  audio_url: string;
  content_type: string;
  duration_seconds: number | null;
  status: ExerciseMediaStatus;
  created_at: Date;
  updated_at: Date;
};

export type LibraryCourseRow = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  category: string;
  level: "all_levels" | "beginner" | "intermediate" | "advanced";
  cover_object_key: string | null;
  cover_image_url: string | null;
  status: "draft" | "published" | "archived";
  display_order: number;
  created_at: Date;
  updated_at: Date;
};

export type LibraryModuleRow = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  display_order: number;
  created_at: Date;
  updated_at: Date;
};

export type LibraryChapterRow = {
  id: string;
  course_id: string;
  course_module_id: string;
  title: string;
  description: string | null;
  classification: string;
  chapter_type: "audio" | "video" | "interactive_qna" | "mcq";
  interactive_content: Record<string, unknown>;
  media_type: "audio" | "video";
  media_object_key: string | null;
  media_url: string | null;
  media_content_type: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  status: "draft" | "published" | "archived";
  display_order: number;
  created_at: Date;
  updated_at: Date;
};

export type AuthUserRow = {
  id: string;
  email: string;
  password_hash: string | null;
  email_verified_at: Date | null;
  name: string;
  daily_reminder: boolean;
  practice_reminder: boolean;
  haptics: boolean;
  created_at: Date;
  updated_at: Date;
};

function resolveDatabaseSsl(databaseUrl: string) {
  if (config.DATABASE_SSL === true) {
    return { rejectUnauthorized: false };
  }
  if (config.DATABASE_SSL === false) {
    return undefined;
  }
  const isRemote =
    !databaseUrl.includes("localhost") &&
    !databaseUrl.includes("127.0.0.1");
  const hasSslQuery = databaseUrl.includes("sslmode=");
  if (isRemote || hasSslQuery) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: resolveDatabaseSsl(databaseUrl),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      email_verified_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (email = LOWER(email))
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

    CREATE TABLE IF NOT EXISTS auth_identities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL CHECK (provider IN ('google', 'apple')),
      provider_subject TEXT NOT NULL,
      provider_email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (provider, provider_subject),
      UNIQUE (user_id, provider)
    );

    CREATE TABLE IF NOT EXISTS auth_action_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      purpose TEXT NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

    CREATE TABLE IF NOT EXISTS exercise_audio (
      exercise_id TEXT PRIMARY KEY,
      audio_object_key TEXT NOT NULL,
      audio_url TEXT NOT NULL,
      content_type TEXT NOT NULL,
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

    CREATE TABLE IF NOT EXISTS practice_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      practice_kind TEXT NOT NULL DEFAULT 'exercise'
        CHECK (practice_kind IN ('exercise', 'audio')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
      duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds > 0),
      activation_level TEXT NOT NULL DEFAULT 'neutral'
        CHECK (activation_level IN ('down_regulating', 'neutral', 'up_regulating')),
      physical_intensity TEXT NOT NULL DEFAULT 'low'
        CHECK (physical_intensity IN ('low', 'moderate', 'high')),
      support_goals TEXT[] NOT NULL DEFAULT '{}',
      intended_states TEXT[] NOT NULL DEFAULT '{}',
      contraindication_tags TEXT[] NOT NULL DEFAULT '{}',
      breath_hold_required BOOLEAN NOT NULL DEFAULT FALSE,
      position_required TEXT NOT NULL DEFAULT 'any'
        CHECK (position_required IN ('any', 'seated', 'standing', 'lying')),
      environment_requirements TEXT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS library_courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT,
      description TEXT,
      category TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'all_levels'
        CHECK (level IN ('all_levels', 'beginner', 'intermediate', 'advanced')),
      cover_object_key TEXT,
      cover_image_url TEXT,
      status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),
      display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS library_course_modules (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES library_courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),
      display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS library_modules (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES library_courses(id) ON DELETE CASCADE,
      course_module_id TEXT REFERENCES library_course_modules(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      classification TEXT NOT NULL DEFAULT 'lesson',
      media_type TEXT NOT NULL CHECK (media_type IN ('audio', 'video')),
      media_object_key TEXT,
      media_url TEXT,
      media_content_type TEXT,
      thumbnail_url TEXT,
      duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds > 0),
      status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),
      display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE exercises
      ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
      ADD COLUMN IF NOT EXISTS activation_level TEXT NOT NULL DEFAULT 'neutral',
      ADD COLUMN IF NOT EXISTS physical_intensity TEXT NOT NULL DEFAULT 'low',
      ADD COLUMN IF NOT EXISTS support_goals TEXT[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS intended_states TEXT[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS contraindication_tags TEXT[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS breath_hold_required BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS position_required TEXT NOT NULL DEFAULT 'any',
      ADD COLUMN IF NOT EXISTS environment_requirements TEXT[] NOT NULL DEFAULT '{}';

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'exercises_duration_seconds_check'
      ) THEN
        ALTER TABLE exercises ADD CONSTRAINT exercises_duration_seconds_check
          CHECK (duration_seconds IS NULL OR duration_seconds > 0);
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'exercises_activation_level_check'
      ) THEN
        ALTER TABLE exercises ADD CONSTRAINT exercises_activation_level_check
          CHECK (activation_level IN ('down_regulating', 'neutral', 'up_regulating'));
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'exercises_physical_intensity_check'
      ) THEN
        ALTER TABLE exercises ADD CONSTRAINT exercises_physical_intensity_check
          CHECK (physical_intensity IN ('low', 'moderate', 'high'));
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'exercises_position_required_check'
      ) THEN
        ALTER TABLE exercises ADD CONSTRAINT exercises_position_required_check
          CHECK (position_required IN ('any', 'seated', 'standing', 'lying'));
      END IF;
    END
    $$;

    CREATE TABLE IF NOT EXISTS recommendation_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      model_version TEXT NOT NULL,
      context_snapshot JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS recommendation_items (
      request_id UUID NOT NULL REFERENCES recommendation_requests(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL,
      position INTEGER NOT NULL CHECK (position > 0),
      score DOUBLE PRECISION NOT NULL,
      score_components JSONB NOT NULL DEFAULT '{}',
      reason TEXT,
      exploration BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (request_id, exercise_id),
      UNIQUE (request_id, position)
    );

    CREATE TABLE IF NOT EXISTS recommendation_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      request_id UUID NOT NULL REFERENCES recommendation_requests(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK (
        event_type IN ('impression', 'opened', 'started', 'completed', 'abandoned', 'saved', 'repeated')
      ),
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS recommendation_feedback (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      request_id UUID NOT NULL REFERENCES recommendation_requests(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL,
      helpfulness INTEGER CHECK (helpfulness IS NULL OR helpfulness BETWEEN 0 AND 3),
      state_change TEXT CHECK (state_change IS NULL OR state_change IN ('better', 'same', 'worse')),
      uncomfortable BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (request_id, exercise_id)
    );

    CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions(user_id);
    CREATE INDEX IF NOT EXISTS auth_identities_user_id_idx ON auth_identities(user_id);
    CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions(expires_at);
    CREATE INDEX IF NOT EXISTS auth_action_tokens_lookup_idx
      ON auth_action_tokens(token_hash, purpose, expires_at);
    CREATE INDEX IF NOT EXISTS exercise_media_status_idx ON exercise_media(status);
    CREATE INDEX IF NOT EXISTS exercise_audio_status_idx ON exercise_audio(status);
    CREATE INDEX IF NOT EXISTS daily_check_ins_user_date_idx ON daily_check_ins(user_id, check_in_date DESC);
    CREATE INDEX IF NOT EXISTS journal_entries_user_created_idx ON journal_entries(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS practice_events_user_created_idx ON practice_events(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS practice_events_user_exercise_idx ON practice_events(user_id, exercise_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS exercises_status_order_idx ON exercises(status, display_order, title);
    CREATE INDEX IF NOT EXISTS library_courses_status_order_idx
      ON library_courses(status, display_order, title);
    ALTER TABLE library_modules
      ADD COLUMN IF NOT EXISTS course_module_id TEXT REFERENCES library_course_modules(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS chapter_type TEXT NOT NULL DEFAULT 'video',
      ADD COLUMN IF NOT EXISTS interactive_content JSONB NOT NULL DEFAULT '{}';

    UPDATE library_modules SET chapter_type = media_type
      WHERE chapter_type = 'video' AND media_type = 'audio';

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'library_modules_chapter_type_check') THEN
        ALTER TABLE library_modules ADD CONSTRAINT library_modules_chapter_type_check
          CHECK (chapter_type IN ('audio', 'video', 'interactive_qna', 'mcq'));
      END IF;
    END
    $$;

    CREATE INDEX IF NOT EXISTS library_course_modules_course_order_idx
      ON library_course_modules(course_id, status, display_order, title);
    CREATE INDEX IF NOT EXISTS library_modules_course_order_idx
      ON library_modules(course_id, status, display_order, title);
    CREATE INDEX IF NOT EXISTS library_modules_module_order_idx
      ON library_modules(course_module_id, status, display_order, title);
    CREATE INDEX IF NOT EXISTS recommendation_requests_user_created_idx
      ON recommendation_requests(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS recommendation_events_user_created_idx
      ON recommendation_events(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS recommendation_events_request_idx
      ON recommendation_events(request_id, exercise_id, created_at);
    CREATE INDEX IF NOT EXISTS recommendation_feedback_user_created_idx
      ON recommendation_feedback(user_id, created_at DESC);
  `);
}

export function serializeAuthUser(row: AuthUserRow) {
  return {
    user: {
      id: row.id,
      email: row.email,
      emailVerified: row.email_verified_at !== null,
      hasPassword: row.password_hash !== null,
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

export function serializeExerciseAudio(row: ExerciseAudioRow) {
  return {
    exerciseId: row.exercise_id,
    audioUrl: row.audio_url,
    contentType: row.content_type,
    durationSeconds: row.duration_seconds,
    status: row.status,
    updatedAt: row.updated_at.toISOString(),
  };
}
