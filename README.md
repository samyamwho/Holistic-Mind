# Holistic Mind

Holistic Mind is an Expo React Native wellness app with a Node.js backend.

The app currently includes backend authentication, per-user onboarding, daily check-ins, persistent journals, personalized recommendations, a backend-managed exercise library, a separate curriculum library with audio/video modules, guided breathing, hosted media, an admin dashboard, and a profile screen.

## How It Works

```text
Mobile app
    |
    v
Node backend (port 4000)
    |
    +-- PostgreSQL (port 5433) stores users, wellness data, exercises, courses, and modules
    |
    +-- MinIO (port 9000) stores exercise images and videos
```

PostgreSQL and MinIO run inside Docker during local development.

```text
Admin dashboard (port 5173)
    |
    +-- edits exercise, audio, course, and module records through protected backend APIs
    +-- uploads images, audio, and videos directly to MinIO using temporary URLs
```

## Accounts And Login

Signup and login are connected to the local backend.

When someone creates an account:

1. The backend creates a unique user ID.
2. The password is securely hashed and is never stored as plain text.
3. A profile is created for that user.
4. The app stores the session in iOS Keychain or Android encrypted storage.
5. Profile names and reminder preferences are saved under that user ID.
6. Onboarding answers, check-ins, and journal entries are stored under the same user ID.

Returning users stay logged in after restarting the app. Logout revokes the backend session and removes the encrypted session from the device.

In local development, email delivery uses `EMAIL_DELIVERY_MODE=log`. Verification and password-reset
codes appear in the backend terminal. For production delivery, set the mode to `resend`, configure a
verified `EMAIL_FROM` address, and add `RESEND_API_KEY` in `backend/.env`.

### Real email delivery

Create a Resend API key and add the following to `backend/.env`:

```text
EMAIL_DELIVERY_MODE=resend
EMAIL_FROM=Holistic Mind <hello@your-verified-domain.com>
RESEND_API_KEY=re_your_key
```

The sender domain must be verified in Resend before it can send to arbitrary addresses. Restart the
backend after changing these values. Keep the API key out of `.env.example` and Git.

### Google sign-in

Google sign-in uses native iOS and Android authentication and therefore requires a development build;
it does not run in Expo Go. In Google Cloud Console, configure the OAuth consent screen and create:

- A Web application OAuth client for backend ID-token verification.
- An iOS OAuth client for bundle ID `com.anonymous.holistic-mind`.
- An Android OAuth client for package `com.anonymous.holisticmind` and the signing certificate SHA-1.

Add the Web client ID to both environment files:

```text
# .env.local
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
GOOGLE_IOS_URL_SCHEME=com.googleusercontent.apps.your-reversed-ios-client-id

# backend/.env
GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

Then rebuild the native app so the Google URL scheme and native module are included:

```bash
npx expo run:ios
# or
npx expo run:android
```

The mobile app sends Google's ID token to the backend. The backend verifies its signature, issuer,
expiry, and audience before creating a Holistic Mind session.

New accounts verify their email with a six-digit code. Users can request a forgotten-password code,
change their password from Profile, and permanently delete their account in the app. Google login
is supported on iOS and Android when OAuth client IDs are configured. Apple login and email-address
changes are not implemented yet.

## What You Need

Install these before starting:

- Node.js
- npm
- Docker Desktop
- Xcode and the iOS Simulator

## First-Time Setup

You only need to complete this section once.

### 1. Open the project

```bash
cd /Users/samyamshrestha/Holistic-Mind
```

### 2. Install the app packages

```bash
npm install
```

### 3. Install the backend packages

```bash
npm --prefix backend install
```

### 4. Install the admin dashboard packages

```bash
npm --prefix admin install
```

### 5. Create the environment files

```bash
cp -n .env.example .env.local
cp -n backend/.env.example backend/.env
```

The `-n` option keeps an existing environment file unchanged.

### 6. Start Docker Desktop

Open Docker Desktop and wait until it says the Docker engine is running.

### 7. Start PostgreSQL, MinIO, and pgAdmin

```bash
docker compose -f backend/compose.yaml up -d
```

The first run downloads the required Docker images and may take a few minutes.

### 8. Prepare and seed the database

```bash
npm run api:migrate
npm run api:seed:exercises
npm run api:seed:library
```

You should see:

```text
Database schema is ready.
Seeded 60 exercises.
Seeded 1 library course and 6 modules.
```

## What To Run Each Day

### Terminal 1: Backend

Make sure Docker Desktop is open, then run:

```bash
cd /Users/samyamshrestha/Holistic-Mind
docker compose -f backend/compose.yaml up -d
npm run api:dev
```

Keep this terminal open. The backend runs at:

```text
http://localhost:4000
```

### Terminal 2: Mobile app

Open another terminal and run:

```bash
cd /Users/samyamshrestha/Holistic-Mind
npm run start:local
```

Press `i` in the Expo terminal to open the iOS Simulator.

`start:local` overrides the production Railway URL only for this development process and points the simulator to `http://127.0.0.1:4000`. The regular `npm start` and release builds continue to use the configured production URL. For a physical iPhone, use the Mac's LAN IP instead of `127.0.0.1`.

### Terminal 3: Admin dashboard

Open another terminal and run:

```bash
cd /Users/samyamshrestha/Holistic-Mind
npm run admin:dev -- --host 127.0.0.1
```

Keep this terminal open and visit `http://127.0.0.1:5173`. Copy the `ADMIN_API_KEY` value from `backend/.env` into the login form. The key stays in the current browser session; do not put it in the mobile app or commit it to Git.

## Check That Everything Is Working

Check the backend:

```bash
curl http://localhost:4000/health
```

Expected result:

```json
{"status":"ok"}
```

Check the database connection:

```bash
curl http://localhost:4000/ready
```

Expected result:

```json
{"status":"ready"}
```

Check the Docker services:

```bash
docker compose -f backend/compose.yaml ps
```

PostgreSQL and MinIO should show as healthy. pgAdmin should show as running.

## Local Addresses

| Service | Address | Purpose |
| --- | --- | --- |
| Mobile API | `http://localhost:4000` | Backend requests |
| PostgreSQL | `localhost:5433` | Database |
| pgAdmin | `http://localhost:5050` | View and edit database records |
| MinIO storage | `http://localhost:9000` | Exercise images, videos, and audio |
| MinIO console | `http://localhost:9001` | View stored media |
| Admin dashboard | `http://127.0.0.1:5173` | Manage exercises, curriculum, and media |

Local MinIO console credentials:

```text
Username: minioadmin
Password: minioadmin
```

These credentials are only for local development.

## Viewing And Editing The Database

Open pgAdmin in your browser:

```text
http://localhost:5050
```

Sign in to pgAdmin with:

```text
Email: admin@holisticmind.com
Password: HolisticMind-Local-Admin-5050!
```

In the left sidebar, open:

```text
Servers > Development > Holistic Mind
```

When pgAdmin asks for the database password, enter:

```text
postgres
```

To see the app's tables, open:

```text
Databases > holistic_mind > Schemas > public > Tables
```

Right-click a table, choose **View/Edit Data > All Rows**, and pgAdmin displays its records.

| Table | Stored data |
| --- | --- |
| `users` | Account email, password hash, and account status |
| `user_profiles` | Name and notification preferences |
| `auth_sessions` | Refresh sessions and expiration times |
| `onboarding_responses` | Support goal, age range, and preferred daily time per user |
| `daily_check_ins` | Dated check-in answers per user |
| `journal_entries` | Journal prompt, content, and timestamps per user |
| `exercises` | Backend-managed Explore catalog, images, visibility, order, and tags |
| `exercise_media` | Uploaded video location and media metadata |
| `exercise_audio` | Uploaded audio location, format, duration, and readiness |

These are local development credentials. pgAdmin is bound to `127.0.0.1`, so other devices on the network cannot open it. Changes made in pgAdmin directly affect the app's local database.

## User Data And Recommendations

All private wellness records use the authenticated user's server-verified `user_id`. The mobile app does not submit an arbitrary owner ID.

- Onboarding creates or updates one `onboarding_responses` row per user.
- A daily check-in creates or updates the user's record for that date.
- Journal entries create separate `journal_entries` rows owned by that user.
- The mobile API only returns journal entries and check-ins belonging to the logged-in user.
- Recommendations combine the support goal, latest check-in answers, and themes detected from up to ten recent journal entries.

Journal text is currently stored as readable PostgreSQL text. Do not log journal request bodies or expose direct database access to app users.

## Managing Exercises In The Admin Dashboard

Start the backend and admin dashboard, open `http://127.0.0.1:5173`, and enter the `ADMIN_API_KEY` from `backend/.env`.

The dashboard can:

- Search all exercises, including draft and archived records.
- Edit the name, category, guidance type, source page, linked practice ID, description, display order, and recommendation tags.
- Change status between `published`, `draft`, and `archived`.
- Upload or replace JPEG, PNG, and WebP images.
- Upload or replace MP4, MOV, and WebM demonstration videos.
- Create audio-library entries and upload or replace MP3, M4A, AAC, WAV, WebM, and OGG recordings.
- Preview current images, videos, and audio.
- Permanently delete a demonstration video after confirmation.
- Permanently delete an audio recording after confirmation.

Only `published` exercises are returned to Explore. An uploaded image replaces the category icon. Explore refreshes whenever the tab gains focus, supports pull-to-refresh, and checks for updates every 15 seconds while open. Backend-edited names, descriptions, and images also appear on the exercise detail screen. For video exercises, the exercise illustration remains visible until the user presses **Start practice**; then the video player appears.

Image, video, and audio uploads use short-lived signed MinIO URLs. PostgreSQL stores the final public URL and metadata, not the media bytes.

## Adding Audio To The Explore Library

1. Start the backend and admin dashboard, then unlock the dashboard with `ADMIN_API_KEY`.
2. Press **+ New audio**.
3. Enter the title, category, description, duration, and optional cover image. Keep **Guidance type** set to `audio` and keep the linked practice ID unique.
4. Choose an audio file in the **Audio recording** panel.
5. Change **Status** to `published` when the recording is ready for users, then press **Save changes**.

Explore has separate **Somatic exercises** and **Audio library** tabs. Published audio records appear in the audio tab; records without an uploaded file show as **Soon**. Playback continues through the Explore mini-player, the full player, and supported iOS/Android lock-screen controls. Audio uploads are limited to 250 MB.

Because `expo-audio` adds native iOS and Android configuration, rebuild the development app after pulling this change:

```bash
npx expo run:ios
# or
npx expo run:android
```

Metro reloads alone cannot add the native audio module to an already-installed development build.

## Uploading An Exercise Video

Do not add exercise videos to the React Native `assets` folder.

The recommended method is the admin dashboard: select a video exercise, choose the file, and press **Save changes**. The command-line method below remains useful for development and automation.

The video can stay anywhere on your Mac, such as:

```text
/Users/samyamshrestha/Downloads/shoulder-drop.mp4
```

### Video format

Use:

- MP4
- H.264 video
- AAC audio
- Portrait orientation
- 1080x1920 or smaller

### Upload command

Keep the backend running and open another terminal:

```bash
cd /Users/samyamshrestha/Holistic-Mind

npm run api:upload -- \
  --exercise shoulder-drop-reset \
  --file "/Users/samyamshrestha/Downloads/shoulder-drop.mp4" \
  --duration 60
```

Change the file path and duration to match your video.

Available video exercise IDs:

```text
feet-on-floor
shoulder-drop-reset
butterfly-hug
self-containment-hold
```

### What the upload command does

1. Requests secure upload permission from the backend.
2. Uploads the video directly to MinIO.
3. Verifies that the video exists.
4. Saves the exercise ID and video URL in PostgreSQL.
5. Makes the video available to the mobile app.

### Check an uploaded video

For Shoulder Drop Reset, run:

```bash
curl http://localhost:4000/api/exercise-media/shoulder-drop-reset
```

The response should contain `"status":"ready"` and a `videoUrl`.

You can also open `http://localhost:9001`, sign in, and look inside:

```text
holistic-mind-videos/exercises/shoulder-drop-reset/
```

In the app, open **Explore** and select **Shoulder Drop Reset**. Its illustration appears first; press **Start practice** to open and play the uploaded video.

## API Reference

Public endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Process health check |
| `GET` | `/ready` | PostgreSQL readiness check |
| `GET` | `/api/exercises` | Published Explore catalog |
| `GET` | `/api/exercises/:id` | One published catalog record |
| `GET` | `/api/exercise-media/:exerciseId` | Ready video metadata |
| `GET` | `/api/exercise-audio` | All ready audio metadata |
| `GET` | `/api/exercise-audio/:exerciseId` | Ready audio metadata for one library item |

Authenticated user endpoints require `Authorization: Bearer <access-token>`:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` / `PUT` | `/api/wellness/onboarding` | Read or save onboarding answers |
| `GET` | `/api/wellness/check-ins/latest` | Latest user check-in |
| `PUT` | `/api/wellness/check-ins` | Save the user's dated check-in |
| `GET` / `POST` | `/api/wellness/journal` | List or create the user's journal entries |

Administrator endpoints require the `x-admin-key` header:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/exercises/admin/all` | All exercises, including drafts and archived records |
| `POST` | `/api/exercises` | Create an exercise |
| `PATCH` | `/api/exercises/:id` | Update catalog fields and status |
| `POST` | `/api/exercises/:id/image-upload-url` | Prepare an image upload |
| `POST` | `/api/exercises/:id/image-complete` | Verify image upload and save its URL |
| `POST` | `/api/exercise-media/:exerciseId/upload-url` | Prepare a video upload |
| `POST` | `/api/exercise-media/:exerciseId/complete` | Verify video upload and save metadata |
| `DELETE` | `/api/exercise-media/:exerciseId` | Delete the video object and media record |
| `POST` | `/api/exercise-audio/:exerciseId/upload-url` | Prepare an audio upload (250 MB maximum) |
| `POST` | `/api/exercise-audio/:exerciseId/complete` | Verify audio upload and save metadata |
| `DELETE` | `/api/exercise-audio/:exerciseId` | Delete the audio object and media record |

## Stopping The Project

Stop Expo or the backend by pressing `Control + C` in its terminal.

Stop the Docker services with:

```bash
docker compose -f backend/compose.yaml stop
```

Start them again with:

```bash
docker compose -f backend/compose.yaml up -d
```

Do not use `docker compose down -v` unless you intentionally want to delete the local database and uploaded videos.

## Useful Commands

```bash
# Start the mobile app
npm start

# Start the backend
npm run api:dev

# Prepare or update the database schema
npm run api:migrate

# Import the 60 starter Explore exercises (normally only needed once)
npm run api:seed:exercises

# Start the exercise admin dashboard
npm run admin:dev -- --host 127.0.0.1

# Build the exercise admin dashboard
npm run admin:build

# Check the mobile TypeScript code
npx tsc --noEmit

# Build the backend
npm run api:build

# Test signup, login, user isolation, refresh, and logout
npm --prefix backend run smoke:auth

# See Docker service status
docker compose -f backend/compose.yaml ps

# See backend logs
docker compose -f backend/compose.yaml logs -f
```

## Using A Physical iPhone

`127.0.0.1` works for the iOS Simulator. A physical iPhone must use the Mac's local network address.

Update `.env.local`:

```text
EXPO_PUBLIC_API_URL=http://YOUR_MAC_IP:4000
```

Update `backend/.env`:

```text
S3_PUBLIC_BASE_URL=http://YOUR_MAC_IP:9000/holistic-mind-videos
```

Restart both Expo and the backend after changing environment files. The Mac and iPhone must be on the same Wi-Fi network.

## Troubleshooting

### `docker: command not found`

Open Docker Desktop, close the terminal, and open a new terminal.

If it still fails, run Docker using its full path:

```bash
/Applications/Docker.app/Contents/Resources/bin/docker compose -f backend/compose.yaml up -d
```

### Port `5432` is already in use

Holistic Mind intentionally uses port `5433` because another local project uses `5432`. Do not change it back unless port `5432` becomes available.

### Backend does not start

Check Docker:

```bash
docker compose -f backend/compose.yaml ps
```

Then check the logs:

```bash
docker compose -f backend/compose.yaml logs postgres minio
```

### Video does not appear in the app

Confirm all of these:

- The backend is running on port `4000`.
- The upload command finished successfully.
- The exercise ID is correct.
- The media endpoint returns `"status":"ready"`.
- The video URL opens from the simulator or phone.
- The exercise Guidance type is `video`.
- The exercise has the correct Linked practice ID.
- You pressed **Start practice**; the illustration intentionally appears first.

### Admin dashboard does not open

Confirm it is running:

```bash
npm run admin:dev -- --host 127.0.0.1
```

Then open `http://127.0.0.1:5173`, not port `4000`. If login says `Unauthorized`, copy the exact `ADMIN_API_KEY` value from `backend/.env` and restart the backend after changing it.

### Image or video upload fails

Confirm Docker Desktop, MinIO, PostgreSQL, and the backend are running. The MinIO bucket must exist and be publicly readable. Also confirm the file type is supported:

- Images: JPEG, PNG, or WebP.
- Videos: MP4, MOV, or WebM.

For a physical iPhone, `S3_PUBLIC_BASE_URL` must use the Mac's local network IP rather than `localhost`.

### Explore shows zero exercises

Run:

```bash
npm run api:migrate
npm run api:seed:exercises
```

Restart the backend and mobile app. Explore keeps a bundled fallback catalog, but the normal source is `GET /api/exercises`.

## Important Files

| File | Purpose |
| --- | --- |
| `src/data/wellnessContent.ts` | Playable exercise content and IDs |
| `src/data/exerciseCatalog.ts` | Bundled Explore fallback catalog |
| `src/screens/exercise/ExerciseScreen.tsx` | Exercise and video player |
| `src/services/exercises/exerciseCatalogApi.ts` | Fetches the backend exercise catalog |
| `src/services/exercises/exerciseMediaApi.ts` | Fetches video information |
| `src/services/wellness/wellnessApi.ts` | Onboarding, check-in, and journal APIs |
| `src/services/recommendations/recommendationEngine.ts` | Combines wellness signals into recommendations |
| `admin/src/App.tsx` | Exercise administrator interface |
| `admin/src/api.ts` | Admin catalog and media requests |
| `backend/src/routes/auth.ts` | Signup, login, session, and profile API |
| `backend/src/auth/` | Password hashing and token management |
| `backend/src/routes/wellness.ts` | Per-user onboarding, check-in, and journal API |
| `backend/src/routes/exercises.ts` | Public exercise catalog and protected admin API |
| `backend/src/routes/exerciseMedia.ts` | Video upload and media API |
| `backend/src/scripts/seedExercises.ts` | Imports the starter catalog into PostgreSQL |
| `backend/src/storage.ts` | MinIO/S3 connection |
| `backend/src/db.ts` | PostgreSQL connection and schema |
| `backend/compose.yaml` | Local PostgreSQL and MinIO services |

## Current Development Status

Multi-user authentication and wellness persistence are working locally. Signup, login, encrypted session restoration, logout, onboarding, daily check-ins, journal entries, names, and profile preferences are connected to PostgreSQL. Each user's recommendation inputs are isolated by authenticated `user_id`.

The 60-item Explore starter catalog is managed through PostgreSQL. The admin dashboard can edit records and upload or delete exercise media through MinIO. Explore loads published records from the backend and falls back to its bundled catalog during temporary connection failures.

The next account milestones are password reset, email verification, and Google/Apple login. For production, PostgreSQL and MinIO will be replaced by hosted services, local development credentials will be changed, and all public connections will use HTTPS.
# Local recommendation engine

Holistic Mind uses a local Python recommendation service rather than an external
AI API. The service combines:

- semantic content similarity from `sentence-transformers/all-MiniLM-L6-v2`;
- onboarding goals, the latest check-in, and up to ten recent journal entries;
- rule-based suitability signals from exercise metadata; and
- pseudonymised completion and helpfulness data for collaborative filtering.

Collaborative filtering activates after the current user has overlapping exercise
history with at least two other users. Before that threshold, the service reports
`content-based-cold-start` and uses semantic content plus suitability rules.
Exercises marked uncomfortable by the current user are excluded.

Journal text is sent only from the Node backend to the locally hosted Python
container. It is not sent to an external API and is not stored in recommendation
request history. User identifiers are HMAC-pseudonymised before reaching the
Python service.

Start the local infrastructure:

```bash
docker compose -f backend/compose.yaml up -d --build
```

The first recommender build downloads the pretrained model into the Docker image.
The service is available locally at `http://127.0.0.1:8000`, and its health endpoint
is `GET /health`. Configure the Node backend with:

```env
RECOMMENDER_URL=http://localhost:8000
RECOMMENDER_TIMEOUT_MS=10000
```

The authenticated mobile flow calls `POST /api/recommendations/generate`. The
backend collects the user's context, requests a local ranking, stores the ranked
items and score components, and returns the recommendation request ID used for
interaction and helpfulness feedback.
