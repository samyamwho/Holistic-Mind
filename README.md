# Holistic Mind

Holistic Mind is an Expo React Native wellness app with a Node.js backend.

The app currently includes backend authentication, onboarding, daily check-ins, a journal, an exercise library, guided breathing, hosted exercise videos, and a profile screen.

## How It Works

```text
Mobile app
    |
    v
Node backend (port 4000)
    |
    +-- PostgreSQL (port 5433) stores video information
    |
    +-- MinIO (port 9000) stores the actual video files
```

PostgreSQL and MinIO run inside Docker during local development.

## Accounts And Login

Signup and login are connected to the local backend.

When someone creates an account:

1. The backend creates a unique user ID.
2. The password is securely hashed and is never stored as plain text.
3. A profile is created for that user.
4. The app stores the session in iOS Keychain or Android encrypted storage.
5. Profile names and reminder preferences are saved under that user ID.

Returning users stay logged in after restarting the app. Logout revokes the backend session and removes the encrypted session from the device.

Email changes, password reset, email verification, and Google/Apple login are not implemented yet.

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

### 4. Create the environment files

```bash
cp -n .env.example .env.local
cp -n backend/.env.example backend/.env
```

The `-n` option keeps an existing environment file unchanged.

### 5. Start Docker Desktop

Open Docker Desktop and wait until it says the Docker engine is running.

### 6. Start PostgreSQL, MinIO, and pgAdmin

```bash
docker compose -f backend/compose.yaml up -d
```

The first run downloads the required Docker images and may take a few minutes.

### 7. Prepare the database

```bash
npm run api:migrate
```

You should see:

```text
Database schema is ready.
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
npm start
```

Press `i` in the Expo terminal to open the iOS Simulator.

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
| MinIO storage | `http://localhost:9000` | Video files |
| MinIO console | `http://localhost:9001` | View stored videos |

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

Right-click `users`, choose **View/Edit Data > All Rows**, and you can view or edit users in a grid. The same works for `user_profiles`, `auth_sessions`, and `exercise_media`.

These are local development credentials. pgAdmin is bound to `127.0.0.1`, so other devices on the network cannot open it. Changes made in pgAdmin directly affect the app's local database.

## Uploading An Exercise Video

Do not add exercise videos to the React Native `assets` folder.

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

In the app, open **Explore**, select **Shoulder Drop Reset**, and the video will load automatically.

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

## Important Files

| File | Purpose |
| --- | --- |
| `src/data/wellnessContent.ts` | Playable exercise content and IDs |
| `src/data/exerciseCatalog.ts` | Full Explore library |
| `src/screens/exercise/ExerciseScreen.tsx` | Exercise and video player |
| `src/services/exercises/exerciseMediaApi.ts` | Fetches video information |
| `backend/src/routes/auth.ts` | Signup, login, session, and profile API |
| `backend/src/auth/` | Password hashing and token management |
| `backend/src/routes/exerciseMedia.ts` | Video upload and media API |
| `backend/src/storage.ts` | MinIO/S3 connection |
| `backend/src/db.ts` | PostgreSQL connection and schema |
| `backend/compose.yaml` | Local PostgreSQL and MinIO services |

## Current Development Status

Video storage and multi-user authentication are working locally. Signup, login, encrypted session restoration, logout, names, and profile preferences are connected to PostgreSQL.

The next account milestones are password reset, email verification, and Google/Apple login. For production, PostgreSQL and MinIO will be replaced by hosted services, local development credentials will be changed, and all public connections will use HTTPS.
