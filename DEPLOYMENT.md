# Holistic Mind — Beta Cloud Deployment Guide

This guide walks you step-by-step through deploying **Holistic Mind** to cloud services for your beta release and client testing.

---

## 1. Architecture Overview for Beta

```text
┌────────────────────────────────────────────────────────┐
│             Mobile App (iOS TestFlight / Android APK)  │
│             Connected to: https://api.yourdomain.com   │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS
                            ▼
┌────────────────────────────────────────────────────────┐
│             Backend API (Node.js / Express)            │
│             Hosted on: Railway or Render               │
└───────┬───────────────────┬───────────────────┬────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐     ┌──────────────┐    ┌───────────────────────────┐
│ Managed      │     │ Cloudflare   │    │ Python Recommender        │
│ PostgreSQL   │     │ R2 / S3      │    │ Container (FastAPI, ONNX) │
│ (Railway/Neon│     │ (Zero Egress │    │ (Private internal network)│
│  / Supabase) │     │ Media Store) │    │                           │
└──────────────┘     └──────────────┘    └───────────────────────────┘
```

---

## 2. Step 1: Set Up Cloud PostgreSQL Database

You can use **Railway PostgreSQL**, **Neon**, or **Supabase**.

### Option A: Railway (Fastest All-in-One)
1. Log in to [Railway.app](https://railway.app).
2. Create a **New Project** $\rightarrow$ **Provision PostgreSQL**.
3. Under the Postgres service, go to **Variables** and copy `DATABASE_URL` (or `DATABASE_PUBLIC_URL` for local scripts).

### Option B: Neon (Serverless Postgres)
1. Create a free database at [Neon.tech](https://neon.tech).
2. Copy the connection string (format: `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`).

---

## 3. Step 2: Set Up Media Storage (Cloudflare R2)

Cloudflare R2 is S3-compatible and has **$0 egress fees**, making it ideal for streaming exercise videos and audio.

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com) and navigate to **R2**.
2. Click **Create bucket**:
   - Bucket name: `holistic-mind-media`
3. **Enable Public Access**:
   - Go to bucket **Settings** $\rightarrow$ **Public access**.
   - Either enable the free `r2.dev` subdomain (e.g. `https://pub-xxx.r2.dev`) or connect a custom domain (e.g. `https://media.yourdomain.com`).
4. **Set CORS Policy**:
   Under bucket **Settings** $\rightarrow$ **CORS Policy**, add:
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
5. **Create API Tokens**:
   - In R2, click **Manage R2 API Tokens** $\rightarrow$ **Create API Token**.
   - Permissions: **Object Read & Write**.
   - Save your **Access Key ID**, **Secret Access Key**, and **Endpoint URL** (format: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`).

---

## 4. Step 3: Deploy Backend & Recommender on Railway

### A. Deploy Recommender Service (FastAPI / ONNX)
1. In your Railway project, click **New** $\rightarrow$ **GitHub Repo**.
2. Select your `Holistic-Mind` repository.
3. In service settings:
   - Set **Root Directory**: `recommender`
   - Set **Builder**: Dockerfile (Railway automatically uses `recommender/Dockerfile`).
4. Go to **Settings** $\rightarrow$ **Networking** $\rightarrow$ Generate internal/private domain (e.g. `recommender.railway.internal`). Note the port is `8000`.

### B. Deploy Node.js Backend API
1. In the same Railway project, click **New** $\rightarrow$ **GitHub Repo** (same repo).
2. In service settings:
   - Set **Root Directory**: `backend`
   - Set **Build Command**: `npm run build`
   - Set **Start Command**: `npm run start`
   - Set **Networking**: Generate a public domain (e.g. `https://holistic-mind-api.up.railway.app`).
3. Add **Environment Variables** in the Railway backend service:

| Variable | Recommended Value | Note |
|---|---|---|
| `NODE_ENV` | `production` | Production mode |
| `PORT` | `4000` | Server listening port |
| `API_BASE_URL` | `https://your-backend.up.railway.app` | Live backend URL |
| `APP_ORIGIN` | `*` | Or specify admin/mobile domain |
| `ADMIN_API_KEY` | *(Generate 32+ random characters)* | Protects admin endpoints |
| `ACCESS_TOKEN_SECRET` | *(Generate 32+ random characters)* | Signs user JWT sessions |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Connects to cloud PostgreSQL |
| `DATABASE_SSL` | `auto` | Automatically enables SSL |
| `AUTO_MIGRATE` | `true` | Runs table migrations on startup |
| `S3_REGION` | `auto` | For R2 |
| `S3_BUCKET` | `holistic-mind-media` | Your bucket name |
| `S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` | R2 S3 endpoint |
| `S3_ACCESS_KEY_ID` | `<YOUR_R2_ACCESS_KEY>` | R2 key ID |
| `S3_SECRET_ACCESS_KEY` | `<YOUR_R2_SECRET_KEY>` | R2 secret key |
| `S3_FORCE_PATH_STYLE` | `false` | Virtual hosted style for R2/S3 |
| `S3_PUBLIC_BASE_URL` | `https://pub-xxx.r2.dev` | Public URL for media |
| `RECOMMENDER_URL` | `http://recommender.railway.internal:8000` | Internal recommender address |
| `EMAIL_DELIVERY_MODE` | `resend` | For live email verification |
| `EMAIL_FROM` | `Holistic Mind <hello@yourdomain.com>` | Verified sender address |
| `RESEND_API_KEY` | `re_xxx` | Your Resend API key |

---

## 5. Step 4: Seed Database & Upload Initial Media

Once the backend is live:

### 1. Seed Exercise Catalog
Run the seed script pointing to your cloud database:

```bash
DATABASE_URL="postgresql://user:pass@host:5432/holistic_mind" npm --prefix backend run seed:exercises
```

### 2. Upload Demonstration Videos & Audio
You can upload media either using the **Admin Dashboard** or via CLI:

```bash
npm run api:upload -- \
  --exercise shoulder-drop-reset \
  --file "/path/to/shoulder-drop.mp4" \
  --duration 60
```

---

## 6. Step 5: Deploy the Admin Dashboard (Vercel)

1. Import your repository into [Vercel](https://vercel.com).
2. Set **Root Directory**: `admin`
3. Set **Framework Preset**: `Vite`
4. Add Environment Variable:
   - `VITE_API_URL` = `https://your-backend.up.railway.app`
5. Deploy. You will get a live HTTPS dashboard link (e.g. `https://holistic-mind-admin.vercel.app`).
6. Unlock the dashboard with your `ADMIN_API_KEY`.

---

## 7. Step 6: Build & Distribute Mobile App to Beta Testers

### 1. Configure Mobile Environment
Update `.env.local`:
```env
EXPO_PUBLIC_API_URL=https://your-backend.up.railway.app
```

### 2. Install & Configure EAS CLI
```bash
npm install -g eas-cli
eas login
eas init
```

### 3. Build for Android (Direct APK for Quick Testing)
In `eas.json`, configure a preview profile:
```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://your-backend.up.railway.app"
      }
    }
  }
}
```

Run build:
```bash
eas build --profile preview --platform android
```
EAS provides a direct download link for the `.apk` file that your client can install immediately.

### 4. Build for iOS (Apple TestFlight)
```bash
eas build --profile production --platform ios
```
Submit to TestFlight:
```bash
eas submit --platform ios
```

---

## 8. Step 7: Push Instant Updates with EAS Update

When your client requests UI adjustments, bug fixes, or text changes, you do **not** need to rebuild the entire native binary.

Publish an instant over-the-air update:
```bash
eas update --branch preview --message "Fix styling and updated recommendations"
```
The app on the client's phone will download the update automatically next time it opens!
