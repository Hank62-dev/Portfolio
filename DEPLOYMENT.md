# Hank62 deployment

## Architecture

- Vercel: Vite frontend.
- Render: hank62-realtime Node/WebSocket service.
- Render: hank62-rag FastAPI service.
- External managed PostgreSQL, Qdrant and Redis are required by Hank RAG in production.

## Before you deploy

Node 22.9 or newer is required (the server script uses `node --env-file-if-exists`). `package.json` pins `22.x` and `render.yaml` sets `NODE_VERSION=22`.

  npm ci
  npm run lint
  npm test
  npm run build

All four must pass. `npm run build` also writes the service worker (`dist/sw.js`); do not edit or delete `public/sw-focus.js`, the worker imports it for notifications, share-into-app and update notices.

## Vercel

1. Import the repository into Vercel.
2. Framework preset: Vite.
3. Build command: npm run build.
4. Output directory: dist.
5. Add these environment variables before deploying:

  VITE_SPACEHANK_API_URL=https://realtime-service.onrender.com
  VITE_SPACEHANK_WS_URL=wss://realtime-service.onrender.com
  VITE_HANK_RAG_API_URL=https://rag-service.onrender.com

vercel.json keeps /spacehank working on refresh. Real files (the service worker, the manifest, assets) are served before the rewrite, so the app still installs and updates.

Use the production domain for everything below. A Vercel preview URL is a different origin: the realtime server (login, sea battle) and the RAG service refuse it unless it is listed in their origin settings.

## Render

Both services use the free plan (512MB RAM, sleep after 15 minutes idle, no persistent disk). See SPACEHANK_SETUP.md section 2 for limitations.

The root render.yaml defines both services. Create a Blueprint from the repository, then set the secret values marked sync: false.

For the realtime service:

  SPACEHANK_PASSWORD=<long-random-secret>
  SPACEHANK_ORIGIN=https://your-vercel-domain
  SPACEHANK_CODEX_CMD=<installed-worker-command-or-empty>
  SPACEHANK_CLAUDE_CMD=<installed-worker-command-or-empty>

The Render Node service cannot execute local desktop CLIs unless they are installed in the image. For production workers, use a dedicated worker image or expose a controlled internal task runner and set only commands that exist on the service.

For Hank RAG:

  GEMINI_API_KEY=<secret>  # also used for embeddings (gemini-embedding-001, 1024 dims)
  DATABASE_URL=<managed-postgres-url>
  QDRANT_URL=<managed-qdrant-url>
  QDRANT_API_KEY=<qdrant-cloud-api-key>
  REDIS_URL=<managed-redis-url>
  CORS_ORIGINS=https://your-vercel-domain

The RAG service must have persistent external services. Do not use local Docker Compose ports or localhost URLs in Render.

## What the realtime service does

- Login and the private workspace (password, session cookie).
- The online sea battle, `wss://<realtime>/battle`. It needs no login (a friend joins with a room code), but it checks the browser origin, caps messages at 4 KB, rate limits, and holds at most 300 rooms. Rooms live in memory: a restart or a sleep ends the games in progress.
- Optional owner helpers (Hank DJ, morning note, Image Studio, calendar) that switch on when their variable is set.

The battle and the login use the same `SPACEHANK_ORIGIN`, so one value covers both.

## The installed app (PWA)

- It installs from the production URL over HTTPS. Share-into-app is Android Chrome only; the fingerprint lock for the diary needs HTTPS (or localhost) and a phone with a screen lock.
- A new deploy shows an "Update" notice inside the app. On Chrome Android it can also arrive as a phone notification once the visitor has allowed notifications; that is not guaranteed when the app is fully closed.
- Notes, diary pages, photos, drafts and Mơ live only in the browser of each device (IndexedDB and localStorage). Clearing site data or uninstalling the app erases them, and nothing is backed up.
- `/spacehank?demo` opens a public demo with made-up data. It sends nothing to a server and is separate from the real workspace.

## Required post-deploy checks

  curl https://realtime-service.onrender.com/health
  curl https://rag-service.onrender.com/health

Expected realtime response includes mode: production. Open the Vercel URL, go to /spacehank, log in with SPACEHANK_PASSWORD, and confirm the realtime pill is online.

Then, on the production URL:

1. Open /spacehank?demo, then Games, Sea Battle, Play online, and create a room. If it says it cannot reach the server, SPACEHANK_ORIGIN does not match the page's origin exactly (scheme, host, no trailing slash). The first connection after the service slept can take about a minute.
2. Install the app on a phone and check that the icon shows in the share list (Android).
3. Deploy a trivial change and confirm the installed app offers the update.

## Security

- Never put SPACEHANK_PASSWORD, GEMINI_API_KEY, database credentials or worker credentials in VITE_* variables.
- Use HTTPS/WSS only.
- Set SPACEHANK_ORIGIN to the exact Vercel origin. It is the only thing that keeps other sites from opening battle rooms from a visitor's browser.
- The diary fingerprint lock only hides the diary on screen. It does not encrypt what is stored on the device.
- Set a long random password and rotate it if exposed.
- Configure database/vector/Redis backups before indexing production documents.
