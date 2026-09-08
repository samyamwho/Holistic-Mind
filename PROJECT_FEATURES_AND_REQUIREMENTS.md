# Holistic Mind — Comprehensive Features & Requirements Specification

> **Document Version:** 1.0.0  
> **Date:** September 2026  
> **Project:** Holistic Mind — Mobile Wellness & Somatic Regulation Platform  
> **Target Audience:** Product Managers, Software Engineers, UI/UX Designers, QA Engineers, Stakeholders  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture & Technology Stack](#2-system-architecture--technology-stack)
3. [User Journeys & Navigation Hierarchy](#3-user-journeys--navigation-hierarchy)
4. [Detailed Functional Requirements & Features](#4-detailed-functional-requirements--features)
   - [4.1 Authentication & Account Management](#41-authentication--account-management)
   - [4.2 Onboarding & Personalization](#42-onboarding--personalization)
   - [4.3 Home Dashboard & Daily Check-In](#43-home-dashboard--daily-check-in)
   - [4.4 Somatic & Grounding Exercises](#44-somatic--grounding-exercises)
   - [4.5 Explore & Audio Library Player](#45-explore--audio-library-player)
   - [4.6 Curriculum & Educational Library (Courses, Modules, Chapters)](#46-curriculum--educational-library-courses-modules-chapters)
   - [4.7 Journaling (Structured Packs & Free-Form)](#47-journaling-structured-packs--free-form)
   - [4.8 History & Timeline Tracking](#48-history--timeline-tracking)
   - [4.9 User Profile & Preference Settings](#49-user-profile--preference-settings)
   - [4.10 Local Hybrid Recommendation Engine (AI/ML)](#410-local-hybrid-recommendation-engine-aiml)
   - [4.11 Administrative Dashboard & Content CMS](#411-administrative-dashboard--content-cms)
   - [4.12 Notifications & Reminder Engine](#412-notifications--reminder-engine)
5. [Data Architecture & Database Schema](#5-data-architecture--database-schema)
6. [API Specifications & Endpoints Directory](#6-api-specifications--endpoints-directory)
7. [Non-Functional Requirements (NFRs)](#7-non-functional-requirements-nfrs)
8. [Deployment & Infrastructure Requirements](#8-deployment--infrastructure-requirements)

---

## 1. Executive Summary

**Holistic Mind** is a comprehensive, privacy-first mobile wellness platform developed to support nervous system regulation, emotional tracking, reflective journaling, and psychoeducation. 

The system pairs a cross-platform mobile application (**Expo React Native**) with a robust **Node.js/Express** backend, a **PostgreSQL** relational database, **S3-compatible Object Storage (MinIO / Cloudflare R2)**, an **Admin Web CMS (Vite React)**, and an isolated **Python FastAPI Machine Learning Microservice** providing on-device/local hybrid recommendations without relying on third-party generative AI APIs.

### Core Value Propositions
- **Somatic & Nervous System Support:** Body-based grounding techniques, interactive visual breath pacers, and high-definition video demonstrations.
- **Privacy-Preserving AI Recommendations:** Multi-signal recommendation engine combining semantic sentence embeddings (`all-MiniLM-L6-v2`), clinical/suitability safety rules, and pseudonymized collaborative filtering.
- **Holistic Habit Building:** Synchronized daily check-ins, guided journal prompts, free-form reflection, and longitudinal timeline history.
- **Multi-Modal Psychoeducation:** Multi-tier curriculum system supporting structured courses, modules, video lectures, audio meditations, PDF reader integrations, and interactive assessments (Q&A/MCQ).

---

## 2. System Architecture & Technology Stack

```
                                  ┌──────────────────────────────────────────────┐
                                  │      Holistic Mind Mobile Client App         │
                                  │  (iOS / Android — React Native / Expo 52)   │
                                  └──────────────────────┬───────────────────────┘
                                                         │ HTTPS / JSON
                                                         ▼
┌────────────────────────────────┐        ┌──────────────────────────────────────┐
│     Admin Web Dashboard        │───────▶│         Backend API Server           │
│   (Vite + React 18 + TS)       │ HTTPS  │      (Node.js 20+ / Express 4)       │
└────────────────────────────────┘        └──────┬──────────────┬──────────────┬─┘
                                                 │              │              │
                                    Internal Net │              │ Internal Net │ S3 Protocol
                                                 ▼              ▼              ▼
                                          ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
                                          │  PostgreSQL  │ │ Python ML    │ │ MinIO / R2   │
                                          │  Database    │ │ Recommender  │ │ Media Bucket │
                                          │ (Port 5433)  │ │ (Port 8000)  │ │ (Port 9000)  │
                                          └──────────────┘ └──────────────┘ └──────────────┘
```

### Technology Matrix

| Layer | Technology | Key Libraries / Modules | Role |
|---|---|---|---|
| **Mobile Client** | React Native 0.76+, Expo 52+ | TypeScript, NativeWind / TailwindCSS, `@bottom-tabs/react-navigation`, `expo-audio`, `expo-video`, `expo-notifications`, `expo-secure-store`, `lucide-react-native` | Native mobile client for iOS and Android |
| **Backend API** | Node.js 20+, Express.js 4.x | TypeScript, `pg` (Connection Pooling), `bcryptjs`, `jsonwebtoken`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `resend`, `google-auth-library` | Core REST API, business logic, auth token management, media presigning |
| **Recommendation Engine** | Python 3.11+, FastAPI, Uvicorn | `sentence-transformers`, ONNX Runtime (`all-MiniLM-L6-v2`), NumPy, Scikit-learn | Local semantic vector search, suitability filtering, and collaborative ranking |
| **Database** | PostgreSQL 16+ | Native UUID generation (`gen_random_uuid`), JSONB indexing, Relational Constraints | Primary persistent relational store |
| **Object Storage** | S3-Compatible API | MinIO (Local Docker), Cloudflare R2 (Cloud Production) | Video demonstrations, audio tracks, course PDFs, and thumbnail storage |
| **Admin Dashboard** | React 18, Vite | TypeScript, Lucide Icons, Custom CSS Design System | Content management system for catalog, audio tracks, curriculum, and media |
| **Infrastructure** | Docker Compose, Railway, Vercel | EAS (Expo Application Services), Resend API | Local containerized orchestration and cloud deployment pipelines |

---

## 3. User Journeys & Navigation Hierarchy

### 3.1 Authentication & Onboarding Flow
```text
Welcome Screen (V1/V2) ──▶ Login / Signup Screen
                                │
                                ├──▶ Email Verification (6-digit OTP)
                                ├──▶ Forgot / Reset Password Flow
                                └──▶ Google OAuth Native Flow
                                        │
                                        ▼ (First-Time User)
                                Onboarding Survey Flow (Goals, Age, Time Preference)
                                        │
                                        ▼
                                Main Tab Navigation
```

### 3.2 Bottom Tab Navigation Structure
The main application features 4 core tabs with an integrated **Global Persistent Mini-Player**:
1. **Home Tab (`HomeScreen`):** Daily wellness status, check-in entry/summary, "For you right now" ML recommendations, quick-start calming tools, and progress streaks.
2. **Explore Tab (`ExploreScreen`):** Dual-segmented catalog:
   - **Somatic Exercises:** Filterable by categories (*Release & Reset, Grounding, Down-Regulating, Breathing, Nervous System*).
   - **Audio Library:** Categorized audio practices (*Meditation, Breathwork, Somatics, Soundscapes*) with real-time stream status.
3. **Journal Tab (`JournalScreen`):** Guided Reflection Prompt Packs (*Stress Relief, Grounding, Emotional Processing, Self-Compassion*) and direct entry for free-form journaling.
4. **Library Tab (`LibraryScreen`):** Comprehensive Psychoeducational Curriculum with Course cards, Modules, Chapter Lessons, PDF readers, and Interactive Quizzes.

### 3.3 Modal & Stack Navigation Hierarchy
- **Profile Modal (`ProfileScreen`):** Account details, notification toggles, haptic controls, change password, account deletion, logout.
- **Exercise Execution Screen (`ExerciseScreen`):** Full-screen player with integrated breath-pacer animation, video playback, step-by-step guidance, and post-session rating modal.
- **Full Audio Player (`AudioPlayerScreen`):** Fullscreen audio player with waveform scrub bar, play/pause/skip (15s), repeat, playback speed control, and background lockscreen playback.
- **Course & Module Screens (`CourseScreen`, `LibraryModuleScreen`):** Progressive lesson view with video player, interactive Q&A, and downloadable PDF viewer (`PdfViewerScreen`).
- **History Modal (`HistoryScreen`):** Consolidated longitudinal logs for Check-Ins, Practices, and Journal Entries with date-range filters.

---

## 4. Detailed Functional Requirements & Features

### 4.1 Authentication & Account Management
- **FR-AUTH-01: Email/Password Registration:**
  - Secure signup with lowercase email normalization and `bcryptjs` password hashing (salt rounds: 10).
  - Validation requires passwords of minimum 8 characters with strength validation.
- **FR-AUTH-02: Email Verification (OTP):**
  - Sends a secure 6-digit verification code via `Resend` (or local debug terminal log).
  - 15-minute token expiry; rate-limited resend triggers.
  - Accounts restricted from accessing main features until email is verified.
- **FR-AUTH-03: Google Sign-In (OAuth2):**
  - Native iOS (`@react-native-google-signin/google-signin`) and Android client credentials.
  - Server-side ID Token signature, audience, and issuer validation with `google-auth-library`.
  - Automatic account provisioning with verified status.
- **FR-AUTH-04: Session Management & Security:**
  - Short-lived JSON Web Tokens (JWT access tokens: 15-60 min).
  - Long-lived cryptographically hashed Refresh Tokens stored in PostgreSQL `auth_sessions`.
  - Tokens stored securely on mobile via `Expo SecureStore` (iOS Keychain / Android EncryptedSharedPreferences).
  - Multi-device session revocation upon logout or password change.
- **FR-AUTH-05: Password Recovery & Account Deletion:**
  - Forgot password flow sending single-use action tokens.
  - In-app password update requiring verification of current credentials.
  - Permanent GDPR-compliant account deletion cascading to all user check-ins, journals, and history.

---

### 4.2 Onboarding & Personalization
- **FR-ONB-01: Support Goal Selection:** Users select primary wellness focus:
  - *Reduce stress and anxiety*
  - *Improve sleep quality*
  - *Process difficult emotions*
  - *Build somatic body awareness*
  - *Daily grounding and mindfulness*
- **FR-ONB-02: Age Range & Demographics:** Captures demographic ranges (e.g., `18-24`, `25-34`, `35-44`, `45-54`, `55+`) for age-appropriate exercise pacing.
- **FR-ONB-03: Daily Schedule Preference:** Captures preferred time of day (*Morning*, *Afternoon*, *Evening*, *Before Bed*) used for local notification scheduling.
- **FR-ONB-04: Persistence:** Stores state to `onboarding_responses` linked directly to `user_id`.

---

### 4.3 Home Dashboard & Daily Check-In
- **FR-HOME-01: Daily Check-In Flow:**
  - Dynamic multi-metric state evaluation modal/card covering:
    1. **Emotional State / Mood:** (*Calm, Anxious, Overwhelmed, Down, Content, Angry, Tired*).
    2. **Physical Body Sensation:** (*Tense shoulders, Tight chest, Heavy, Restless, Relaxed*).
    3. **Energy Level:** (*Depleted, Low, Balanced, High, Agitated*).
    4. **Stress Scale:** 1 to 5 slider.
    5. **Immediate Need:** (*Calm down, Ground myself, Release physical tension, Gentle recharge*).
  - One primary check-in recorded per calendar day in `daily_check_ins` (upserted if updated).
- **FR-HOME-02: Real-time Recommender Integration:**
  - Instantly triggers recommendation generation upon check-in submission.
  - Renders the personalized **"For you right now"** carousel displaying 4 tailored exercises with custom explanations.
- **FR-HOME-03: Quick-Access Calming Tools:** One-tap access to instant regulation tools (*Box Breathing*, *4-7-8 Breathing*, *Grounding 5-4-3-2-1*).
- **FR-HOME-04: Habit Streak & Progress Tracker:** Visual weekly streak calendar displaying completed check-in days and active practice habits.

---

### 4.4 Somatic & Grounding Exercises
- **FR-EX-01: Dynamic Exercise Catalog:** 60+ clinical somatic and grounding exercises fetched dynamically from backend database with local bundled fallback cache.
- **FR-EX-02: Multi-Modal Practice Engine (`ExerciseScreen`):**
  - **Animated Breath Pacer:** Visual pulsing circle with customizable inhalation, retention, exhalation, and hold intervals.
  - **Video Demonstrations:** Seamless H.264/AAC portrait streaming from Cloudflare R2 / MinIO with poster placeholders and play/pause controls.
  - **Audio-Guided Mode:** Integrated narration voice tracks with timing markers.
  - **Step-by-Step Step Reader:** Expandable instructions, benefits, and physiological explanations.
- **FR-EX-03: Haptic Feedback Support:** Native tactile haptics synced to breath phase transitions (*Inhale, Hold, Exhale*).
- **FR-EX-04: Post-Practice Feedback Loop:**
  - Captures completion status, duration practiced, and abandonment.
  - Feedback survey: Helpfulness rating (0-3 scale), state delta (*Better, Same, Worse*), and discomfort flag (*Uncomfortable*).

---

### 4.5 Explore & Audio Library Player
- **FR-AUD-01: Explore Somatic & Audio Library Segments:**
  - Dual-mode tab switcher separating visual exercises from audio soundscapes and meditations.
  - Search bar and category pills (*Release, Grounding, Sleep, Anxiety, Breath*).
- **FR-AUD-02: Persistent Mini-Player:** Floating glassmorphic bottom bar displaying active track, animated equalizer indicator, play/pause toggle, and dismissal swipe.
- **FR-AUD-03: Fullscreen Audio Player:**
  - High-res cover artwork, scrubbable progress bar, elapsed/remaining time.
  - 15-second skip backward / forward, loop toggle, and playback rate selector (0.75x, 1.0x, 1.25x, 1.5x).
  - Background audio playback and iOS/Android lock screen / Control Center media controls via `expo-audio`.

---

### 4.6 Curriculum & Educational Library (Courses, Modules, Chapters)
- **FR-CURR-01: Multi-Tier Curriculum Hierarchy:**
  - **Level 1: Course:** Overarching topic (*e.g., "Nervous System Fundamentals", "Overcoming Somatic Anxiety"*), level (*Beginner, Intermediate, Advanced*), and thumbnail.
  - **Level 2: Module:** Thematic chapters grouping lessons.
  - **Level 3: Chapter / Lesson:** Individual learning unit with classification (*Lesson, Practice, Assessment*).
- **FR-CURR-02: Multi-Format Chapter Delivery:**
  - **Video Chapter:** Streaming video lessons with embedded duration counter.
  - **Audio Chapter:** Voice lectures with synchronized playback.
  - **PDF Reading Chapter:** In-app PDF viewer (`PdfViewerScreen`) supporting offline caching and zoom controls.
  - **Interactive Q&A / MCQ:** In-lesson comprehension quizzes with instant feedback and answer explanations.
- **FR-CURR-03: Lesson Attachments:** Downloadable and viewable supplementary PDF worksheets, reading materials, and somatic guides.

---

### 4.7 Journaling (Structured Packs & Free-Form)
- **FR-JRN-01: Structured Guided Packs:**
  - Curated reflection packs: *Daily Decompression, Untangling Anxiety, Somatic Body Scan, Emotional Release, Bedtime Reflection*.
  - Randomized or sequential prompt cards providing targeted reflection inquiries.
- **FR-JRN-02: Free-Form Journaling (`FreeJournalEntryScreen`):**
  - Open-ended rich-text editor with automatic character/word count.
  - Real-time auto-saving to prevent data loss.
- **FR-JRN-03: Privacy Isolation:** Journal entries are encrypted in transit, isolated per `user_id`, and NEVER sent to external third-party AI APIs.

---

### 4.8 History & Timeline Tracking
- **FR-HIST-01: Unified Longitudinal Timeline:** Consolidated scrollable history displaying:
  - Daily Check-In cards showing full mood and stress snapshots.
  - Completed somatic practices with duration and ratings.
  - Written journal entries with expandable text previews.
- **FR-HIST-02: Filter & Search Capabilities:** Filter timeline by activity type (*All, Check-Ins, Practices, Journals*) and month/year selectors.

---

### 4.9 User Profile & Preference Settings
- **FR-PROF-01: Profile & Preferences Management:**
  - Display name customization and account creation timestamp.
  - Notification switches for Daily Check-In Reminders and Practice Suggestions.
  - Haptic feedback toggle (system-wide disable/enable).
- **FR-PROF-02: Security & Session Control:** Change password, active session logout, and permanent account erasure with confirmation safeguards.

---

### 4.10 Local Hybrid Recommendation Engine (AI/ML)
- **FR-ML-01: Local Inference Architecture:** Self-contained Python FastAPI microservice utilizing ONNX-optimized `sentence-transformers/all-MiniLM-L6-v2` generating 384-dimensional dense vectors.
- **FR-ML-02: Tri-Signal Hybrid Scoring:**
  $$\text{Final Score} = w_{\text{rule}} S_{\text{rule}} + w_{\text{content}} S_{\text{content}} + w_{\text{collab}} S_{\text{collab}}$$
  1. **Semantic Content Score ($S_{\text{content}}$):** Cosine similarity between the synthesized User Context Embedding (check-in signals + recent 3 journal excerpts) and pre-indexed Exercise Profile Embeddings.
  2. **Rule-Based Clinical Suitability Score ($S_{\text{rule}}$):** Dynamic safety heuristics based on activation levels (*down-regulating vs up-regulating*), physical intensity constraints (*penalizing high intensity when energy is depleted*), and contraindications (*avoiding breath holds during acute panic*).
  3. **Collaborative Filtering Score ($S_{\text{collab}}$):** User-user cosine similarity calculated on pseudonymized interaction matrices (repeats, completions, helpfulness ratings).
- **FR-ML-03: Cold-Start Adaptation:**
  - **Cold-Start Phase (< 2 overlapping peer histories):** Weights: 72% Rule Score + 23% Today's Check-in Content + 5% Recent History Content.
  - **Hybrid Warm Phase:** Weights: 65% Rule Score + 20% Today's Check-in Content + 5% History Content + 10% Collaborative Score.
- **FR-ML-04: Privacy & Anonymization:** User IDs are converted to HMAC-SHA256 pseudonyms before entering the ML engine. Journal text is processed in memory and never persisted in recommendation logs.

---

### 4.11 Administrative Dashboard & Content CMS
- **FR-ADM-01: Secure Key Authentication:** Protected via `x-admin-key` header matching server environment variable.
- **FR-ADM-02: Somatic Exercise Management:**
  - Full CRUD capabilities for exercise catalog.
  - Edit metadata: Titles, categories, guidance types, activation levels, physical intensity, recommendation tags, and contraindication flags.
  - Status management: `draft`, `published`, `archived`.
- **FR-ADM-03: Media Direct Upload Engine:**
  - Requests presigned S3/R2 PUT URLs from backend.
  - Browser directly uploads videos (MP4/MOV/WebM up to 500MB), audio (MP3/M4A/WAV up to 250MB), and images (JPEG/PNG/WebP).
  - Verifies object existence before committing URLs to PostgreSQL.
- **FR-ADM-04: Curriculum Management Workspace:**
  - Interactive tree editor for Courses $\rightarrow$ Course Modules $\rightarrow$ Chapters $\rightarrow$ PDF Attachments.
  - Drag/order resequencing, status publishing, and interactive Q&A/MCQ builder.
- **FR-ADM-05: Content Migration & Export Pipeline:**
  - Portable export utility (`npm run content:export`) creating versioned JSON bundle + media assets.
  - Seamless production import utility (`npm run content:import:prod`) with atomic database upsert/replacement guards.

---

### 4.12 Notifications & Reminder Engine
- **FR-NOTIF-01: Local Notification Scheduling:** Uses `expo-notifications` to schedule recurring daily local check-in reminders based on onboarding time preferences.
- **FR-NOTIF-02: Permission Handling:** Graceful OS permission request flow with fallback alerts.

---

## 5. Data Architecture & Database Schema

The database is built on **PostgreSQL 16+** with relational integrity, foreign key cascades, unique constraints, and optimized B-tree indexes.

```
┌──────────────────┐       1:1      ┌──────────────────┐
│      users       │───────────────▶│  user_profiles   │
└────────┬─────────┘                └──────────────────┘
         │
         ├───────────────▶ 1:N  auth_identities (OAuth Google/Apple)
         ├───────────────▶ 1:N  auth_action_tokens (Verify/Reset)
         ├───────────────▶ 1:N  auth_sessions (Refresh tokens)
         ├───────────────▶ 1:1  onboarding_responses
         ├───────────────▶ 1:N  daily_check_ins (Unique per user+date)
         ├───────────────▶ 1:N  journal_entries
         ├───────────────▶ 1:N  practice_events
         ├───────────────▶ 1:N  recommendation_requests
         │                             │
         │                             ├──▶ 1:N recommendation_items
         │                             ├──▶ 1:N recommendation_events
         │                             └──▶ 1:N recommendation_feedback
         │
┌────────┴─────────┐
│ library_courses  │◀──┐
└────────┬─────────┘   │
         │ 1:N         │ 1:N
         ▼             │
┌──────────────────────┴──┐
│ library_course_modules  │
└────────┬────────────────┘
         │ 1:N
         ▼
┌─────────────────────────┐
│     library_modules     │ (Chapters)
└────────┬────────────────┘
         │ 1:N
         ▼
┌─────────────────────────┐
│ library_chapter_attach. │
└─────────────────────────┘
```

### Complete Table Specifications

#### 1. `users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Unique user identifier |
| `email` | TEXT | NOT NULL, UNIQUE, `CHECK (email = LOWER(email))` | Normalized login email |
| `password_hash` | TEXT | NULLABLE | Bcrypt password hash (null for OAuth users) |
| `email_verified_at` | TIMESTAMPTZ | NULLABLE | Verification timestamp |
| `status` | TEXT | NOT NULL, DEFAULT `'active'` | Account status (`active`, `disabled`) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Account creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Record update time |

#### 2. `user_profiles`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `user_id` | UUID | PRIMARY KEY, REFERENCES `users(id)` ON DELETE CASCADE | Linked user |
| `name` | TEXT | NOT NULL | Display name |
| `daily_reminder` | BOOLEAN | NOT NULL, DEFAULT TRUE | Daily check-in notification toggle |
| `practice_reminder`| BOOLEAN | NOT NULL, DEFAULT FALSE | Practice reminder toggle |
| `haptics` | BOOLEAN | NOT NULL, DEFAULT TRUE | In-app tactile feedback toggle |
| `created_at` / `updated_at` | TIMESTAMPTZ | NOT NULL | Timestamps |

#### 3. `auth_identities`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Identity record ID |
| `user_id` | UUID | NOT NULL, REFERENCES `users(id)` ON DELETE CASCADE | Associated user |
| `provider` | TEXT | NOT NULL, `CHECK (provider IN ('google', 'apple'))` | Identity provider |
| `provider_subject` | TEXT | NOT NULL | Provider unique user ID (sub) |
| `provider_email` | TEXT | NULLABLE | Provider returned email |

#### 4. `auth_action_tokens`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Token record ID |
| `user_id` | UUID | NOT NULL, REFERENCES `users(id)` ON DELETE CASCADE | Targeted user |
| `purpose` | TEXT | NOT NULL, `CHECK (purpose IN ('verify_email', 'reset_password'))`| Token intent |
| `token_hash` | TEXT | NOT NULL, UNIQUE | SHA-256 hash of token/OTP |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Expiry threshold |
| `consumed_at`| TIMESTAMPTZ | NULLABLE | Consumed timestamp |

#### 5. `auth_sessions`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Session ID |
| `user_id` | UUID | NOT NULL, REFERENCES `users(id)` ON DELETE CASCADE | Session owner |
| `refresh_token_hash` | TEXT | NOT NULL, UNIQUE | Hashed refresh token |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Refresh session expiry |
| `revoked_at` | TIMESTAMPTZ | NULLABLE | Manual logout revocation timestamp |

#### 6. `onboarding_responses`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `user_id` | UUID | PRIMARY KEY, REFERENCES `users(id)` ON DELETE CASCADE | User ID |
| `support_goal` | TEXT | NOT NULL | Primary goal selection |
| `age_range` | TEXT | NOT NULL | User age bracket |
| `daily_time` | TEXT | NOT NULL | Preferred practice time |

#### 7. `daily_check_ins`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Check-in ID |
| `user_id` | UUID | NOT NULL, REFERENCES `users(id)` ON DELETE CASCADE | User ID |
| `check_in_date` | DATE | NOT NULL | Calendar date (YYYY-MM-DD) |
| `answers` | JSONB | NOT NULL | Structured mood, body, energy, stress data |
| *Constraint* | UNIQUE | `(user_id, check_in_date)` | Enforces single entry per day |

#### 8. `journal_entries`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Entry ID |
| `user_id` | UUID | NOT NULL, REFERENCES `users(id)` ON DELETE CASCADE | Author |
| `pack` | TEXT | NOT NULL | Pack category (*Free*, *Anxiety*, etc.) |
| `prompt` | TEXT | NOT NULL | Journal prompt answered |
| `content` | TEXT | NOT NULL | User reflective writing |

#### 9. `exercises`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Unique string slug (e.g. `shoulder-drop-reset`) |
| `title` | TEXT | NOT NULL | Exercise title |
| `category` | TEXT | NOT NULL | Primary category classification |
| `guidance_type` | TEXT | NOT NULL, `CHECK (guidance_type IN ('breathing', 'video', 'guided', 'grounding', 'audio'))` | Practice modality |
| `source_page` | INTEGER | NOT NULL | Source curriculum reference |
| `linked_exercise_id` | TEXT | NULLABLE | Internal practice link |
| `description` | TEXT | NULLABLE | Exercise description |
| `image_url` | TEXT | NULLABLE | Cover illustration URL |
| `status` | TEXT | NOT NULL, DEFAULT `'published'`, `CHECK (status IN ('draft', 'published', 'archived'))` | Publishing status |
| `display_order` | INTEGER | NOT NULL, DEFAULT 0 | Ordering index |
| `recommendation_tags` | TEXT[] | NOT NULL, DEFAULT `'{}'` | Categorical tags |
| `duration_seconds` | INTEGER | NULLABLE | Standard duration |
| `activation_level` | TEXT | NOT NULL, `CHECK (activation_level IN ('down_regulating', 'neutral', 'up_regulating'))` | Nervous system impact |
| `physical_intensity` | TEXT | NOT NULL, `CHECK (physical_intensity IN ('low', 'moderate', 'high'))` | Movement requirement |
| `support_goals` | TEXT[] | NOT NULL, DEFAULT `'{}'` | Aligned onboarding goals |
| `intended_states` | TEXT[] | NOT NULL, DEFAULT `'{}'` | Targeted check-in states |
| `contraindication_tags`| TEXT[] | NOT NULL, DEFAULT `'{}'` | Clinical exclusion tags |
| `breath_hold_required`| BOOLEAN | NOT NULL, DEFAULT FALSE | Requires breath holding |
| `position_required` | TEXT | NOT NULL, `CHECK (position_required IN ('any', 'seated', 'standing', 'lying'))` | Posture requirement |
| `environment_requirements`| TEXT[] | NOT NULL, DEFAULT `'{}'` | Space requirements |

#### 10. `exercise_media` & `exercise_audio`
| Table | Key Column | Media Columns | Status Column |
|---|---|---|---|
| `exercise_media` | `exercise_id` (PK) | `video_object_key`, `video_url`, `poster_url`, `captions_url`, `duration_seconds` | `status` (`draft`, `ready`) |
| `exercise_audio` | `exercise_id` (PK) | `audio_object_key`, `audio_url`, `content_type`, `duration_seconds` | `status` (`draft`, `ready`) |

#### 11. `library_courses`, `library_course_modules`, `library_modules`, `library_chapter_attachments`
| Table | Hierarchy Level | Key Columns | Supported Types |
|---|---|---|---|
| `library_courses` | 1. Course | `id`, `title`, `subtitle`, `category`, `level`, `cover_image_url`, `status` | Levels: `all_levels`, `beginner`, `intermediate`, `advanced` |
| `library_course_modules` | 2. Course Module | `id`, `course_id` (FK), `title`, `description`, `display_order` | - |
| `library_modules` | 3. Chapter / Lesson | `id`, `course_id` (FK), `course_module_id` (FK), `title`, `chapter_type`, `media_url`, `interactive_content` | Types: `audio`, `video`, `pdf`, `interactive_qna`, `mcq` |
| `library_chapter_attachments`| 4. Attachment | `id`, `chapter_id` (FK), `title`, `file_url`, `file_size` | PDFs, Worksheets |

#### 12. Recommendation Intelligence Tables
- `recommendation_requests`: Records every recommendation computation, containing `user_id`, `model_version`, and `context_snapshot` JSONB.
- `recommendation_items`: 4 ranked outputs per request with `position`, `score`, `score_components` JSONB, `reason`, and `exploration` flag.
- `recommendation_events`: Event telemetry (`impression`, `opened`, `started`, `completed`, `abandoned`, `saved`, `repeated`).
- `recommendation_feedback`: User ratings (`helpfulness` 0-3, `state_change` better/same/worse, `uncomfortable` boolean).

---

## 6. API Specifications & Endpoints Directory

### 6.1 Public & Health Endpoints
| Method | Route | Description |
|---|---|---|
| `GET` | `/health` | Server uptime check (Returns `{"status":"ok"}`) |
| `GET` | `/ready` | Database readiness and connection pool verification |

### 6.2 Authentication Endpoints (`/api/auth`)
| Method | Route | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | No | Create user account with email & password |
| `POST` | `/api/auth/login` | No | Authenticate user, returns Access + Refresh tokens |
| `POST` | `/api/auth/google` | No | Authenticate / register via Google OAuth ID token |
| `POST` | `/api/auth/verify-email` | No | Verify 6-digit OTP email code |
| `POST` | `/api/auth/resend-verification` | No | Resend email verification code |
| `POST` | `/api/auth/forgot-password` | No | Trigger password reset email OTP |
| `POST` | `/api/auth/reset-password` | No | Reset password using verified reset OTP |
| `POST` | `/api/auth/refresh` | No | Exchange refresh token for new access token |
| `POST` | `/api/auth/logout` | Bearer Token | Revoke refresh token and terminate session |
| `GET` | `/api/auth/session` | Bearer Token | Fetch current user profile and preferences |
| `PATCH`| `/api/auth/profile` | Bearer Token | Update name or notification preferences |
| `POST` | `/api/auth/change-password` | Bearer Token | Change password with current password confirmation |
| `DELETE`| `/api/auth/account` | Bearer Token | Permanently delete user account and all data |

### 6.3 Wellness & Activity Endpoints (`/api/wellness`)
| Method | Route | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/wellness/onboarding` | Bearer Token | Fetch user onboarding answers |
| `PUT` | `/api/wellness/onboarding` | Bearer Token | Save/update onboarding answers |
| `GET` | `/api/wellness/check-ins/latest` | Bearer Token | Fetch today's / latest check-in record |
| `PUT` | `/api/wellness/check-ins` | Bearer Token | Submit dated daily check-in |
| `GET` | `/api/wellness/journal` | Bearer Token | List all user journal entries (newest first) |
| `POST` | `/api/wellness/journal` | Bearer Token | Create a new journal entry |
| `GET` | `/api/wellness/history` | Bearer Token | Aggregated chronological logs of all check-ins, journals, practices |
| `POST` | `/api/wellness/practices` | Bearer Token | Record a completed exercise/audio practice event |

### 6.4 Content Catalog & Library Endpoints
| Method | Route | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/exercises` | No | List all published somatic exercises |
| `GET` | `/api/exercises/:id` | No | Fetch single published exercise details |
| `GET` | `/api/exercise-media/:exerciseId` | No | Get streaming video URL and metadata |
| `GET` | `/api/exercise-audio` | No | List all published audio library tracks |
| `GET` | `/api/exercise-audio/:exerciseId` | No | Get single audio track URL and metadata |
| `GET` | `/api/library/courses` | No | List all published curriculum courses |
| `GET` | `/api/library/courses/:id` | No | Fetch full course curriculum tree with modules & chapters |
| `GET` | `/api/library/modules/:id` | No | Fetch single chapter details and attachments |

### 6.5 Recommendation Endpoints (`/api/recommendations`)
| Method | Route | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/recommendations/generate` | Bearer Token | Generates top 4 hybrid recommendations based on latest check-in |
| `POST` | `/api/recommendations/events` | Bearer Token | Logs recommendation telemetry (`opened`, `completed`, etc.) |
| `POST` | `/api/recommendations/feedback` | Bearer Token | Submits post-practice helpfulness and state delta feedback |

### 6.6 Admin Endpoints (Requires `x-admin-key` header)
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/exercises/admin/all` | Fetch all exercises (including drafts/archived) |
| `POST` | `/api/exercises` | Create a new exercise record |
| `PATCH`| `/api/exercises/:id` | Update exercise fields, metadata, and status |
| `POST` | `/api/exercises/:id/image-upload-url` | Generate S3 presigned PUT URL for cover image |
| `POST` | `/api/exercises/:id/image-complete` | Verify image upload and commit URL |
| `POST` | `/api/exercise-media/:exerciseId/upload-url` | Generate S3 presigned PUT URL for video (up to 500MB) |
| `POST` | `/api/exercise-media/:exerciseId/complete` | Verify video upload and commit media row |
| `DELETE`| `/api/exercise-media/:exerciseId` | Delete video from storage and database |
| `POST` | `/api/exercise-audio/:exerciseId/upload-url` | Generate S3 presigned PUT URL for audio (up to 250MB) |
| `POST` | `/api/exercise-audio/:exerciseId/complete` | Verify audio upload and commit audio row |
| `DELETE`| `/api/exercise-audio/:exerciseId` | Delete audio from storage and database |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/library/admin/*` | Complete administrative CRUD for Courses, Modules, Chapters & Attachments |

---

## 7. Non-Functional Requirements (NFRs)

### 7.1 Security & Privacy
- **NFR-SEC-01: Zero Third-Party AI Data Leakage:** User reflections and journals are never sent to external LLMs (e.g. OpenAI, Anthropic).
- **NFR-SEC-02: Cryptographic Pseudonymization:** User IDs sent to the collaborative filtering engine are anonymized with HMAC-SHA256.
- **NFR-SEC-03: Password Security:** All passwords hashed with `bcryptjs` using 10 salt rounds. Plaintext passwords never stored or logged.
- **NFR-SEC-04: Transport Encryption:** Strict HTTPS/TLS enforcement on all public REST API endpoints and storage links.
- **NFR-SEC-05: Direct Storage Uploads:** Large media files upload directly from client browser to S3/R2 using short-lived (15 min) signed URLs, bypassing backend memory overhead.

### 7.2 Performance & Scalability
- **NFR-PERF-01: Recommendation Latency:** Sub-200ms recommendation response time via local in-memory ONNX Runtime sentence embeddings.
- **NFR-PERF-02: Offline Fallback:** Bundled JSON exercise catalog in the mobile app ensures basic functionality during network outages.
- **NFR-PERF-03: Media Streaming:** Zero-egress Cloudflare R2 bucket with byte-range requests for instant video/audio scrubbing.

### 7.3 Accessibility, Aesthetics & Usability
- **NFR-UX-01: Visual Aesthetic:** Calming, non-clinical color palette (`#F6E3C5`, `#673F3F`, warm terracotta, botanical tones), generous border radii (16-24px), and clear typography.
- **NFR-UX-02: Responsive Layouts:** Optimized for iPhone SE through iPhone 16 Pro Max, iPad, and standard Android screen dimensions with Safe Area handling.
- **NFR-UX-03: Native Micro-Animations:** Fluid breath pacers, haptic sync, and tab transitions providing a deeply immersive experience.

---

## 8. Deployment & Infrastructure Requirements

### 8.1 Local Development Environment
- **Runtime:** Node.js 20+, Python 3.11+, Docker Desktop
- **Docker Compose Services:**
  - PostgreSQL 16 on `localhost:5433`
  - MinIO S3 Storage on `localhost:9000` (Console: `localhost:9001`)
  - pgAdmin Database UI on `localhost:5050`
  - Python FastAPI ML Recommender on `localhost:8000`

### 8.2 Production Cloud Architecture
- **Mobile Client:** Expo EAS Build $\rightarrow$ iOS TestFlight & Android APK/AAB distribution.
- **Backend API & Recommender:** Deployed on **Railway / Render** with private networking between Node.js API and Dockerized Python service.
- **Managed Database:** PostgreSQL on **Railway / Neon / Supabase** with SSL connection pooling.
- **Media CDN & Storage:** **Cloudflare R2** with custom public CNAME / `r2.dev` distribution and configured CORS policies.
- **Admin Dashboard:** Hosted on **Vercel** with Vite SPA single-page routing.
- **Email Delivery:** **Resend API** with SPF/DKIM-verified domain.

### 8.3 Environment Variables Reference

#### Mobile App (`.env.local`)
```env
EXPO_PUBLIC_API_URL=https://api.yourdomain.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_IOS_URL_SCHEME=com.googleusercontent.apps.xxx
```

#### Backend API (`backend/.env`)
```env
NODE_ENV=production
PORT=4000
API_BASE_URL=https://api.yourdomain.com
DATABASE_URL=postgresql://user:password@host:5432/holistic_mind?sslmode=require
DATABASE_SSL=auto
AUTO_MIGRATE=true
ACCESS_TOKEN_SECRET=your_super_secret_jwt_access_key
ADMIN_API_KEY=your_secure_admin_api_key_32_chars
RECOMMENDER_URL=http://recommender.internal:8000
RECOMMENDER_TIMEOUT_MS=10000
S3_REGION=auto
S3_BUCKET=holistic-mind-media
S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=your_r2_access_key
S3_SECRET_ACCESS_KEY=your_r2_secret_key
S3_PUBLIC_BASE_URL=https://media.yourdomain.com
EMAIL_DELIVERY_MODE=resend
EMAIL_FROM=Holistic Mind <hello@yourdomain.com>
RESEND_API_KEY=re_your_resend_key
```

#### Admin Dashboard (`admin/.env`)
```env
VITE_API_URL=https://api.yourdomain.com
```

---

## 9. Conclusion

This specification represents the comprehensive architecture, functional capabilities, data schemas, API contracts, and non-functional requirements for the **Holistic Mind** wellness platform. All features described are implemented in code and ready for production deployment, continuous integration, and beta testing.
