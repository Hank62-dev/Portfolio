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
- Optional owner helpers (Hank DJ, morning note, Image Studio, calendar, the Creator Lab's AI content engine and Discord posting) that switch on when their variable is set. `DISCORD_WEBHOOK_URL` is a webhook address from your own Discord server; it stays on the server. See CREATOR_STRATEGY.md.

The battle and the login use the same `SPACEHANK_ORIGIN`, so one value covers both.

## The installed app (PWA)

- It installs from the production URL over HTTPS. Share-into-app is Android Chrome only; the fingerprint lock for the diary needs HTTPS (or localhost) and a phone with a screen lock.
- A new deploy shows an "Update" notice inside the app. On Chrome Android it can also arrive as a phone notification once the visitor has allowed notifications; that is not guaranteed when the app is fully closed.
- Sync: with `DATABASE_URL` set on the realtime service (a Postgres address; Neon's free tier works) the owner's notes, diary pages and their photos, habits, tasks, money, courses and flashcards, Creator Lab data and AI pictures are kept in that database and appear on every device you sign in on. Each device still works offline and sends its changes when it can; if two devices change the same record the later edit wins. The tables are created by the server on start. The music library is not synced (the files are too big), nor are voice memos or pictures over 4 MB (`SYNC_MAX_BLOB_MB`), and the storage is capped at 300 MB (`SYNC_QUOTA_MB`) so it never fills a free database. Without `DATABASE_URL` the status line says "Sync is off" and each device keeps its own copy, which clearing site data or uninstalling the app erases.
- Focus and flashcard statistics, the diary fingerprint lock and a few per-device settings stay on the device.
- Data in the database is not end-to-end encrypted: the database owner (you) and Neon can read it. The diary fingerprint lock hides the diary on screen only.
- `/spacehank?demo` is the guest mode: the home screen, Habit Garden (two plants), Study Hub (one course, three cards, focus timer) and Games. Every other tab shows a one-line introduction and asks for the password, so a visitor does not see what the workspace holds. It sends nothing to a server and is separate from the real workspace. A signed-in owner never sees sample data.
- Sign-in lasts: a short access token (30 minutes) renewed from a refresh token (30 days, sliding), both signed, so they survive the free Render service sleeping or restarting. If the realtime link drops (phone locked, server asleep) the app reconnects by itself and the status dot turns amber, then green.

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
- Session tokens are signed with a key made from `SPACEHANK_PASSWORD`, so changing the password signs every device out. Set `SPACEHANK_SESSION_SECRET` to sign with a separate key instead. Logging out clears the cookies on that device only; a token cannot be taken back before it runs out (30 min for access, 30 days for refresh).
- Set a long random password and rotate it if exposed.
- Configure database/vector/Redis backups before indexing production documents.

## Push notifications (reminders with the app closed)

The bell inside the app works on its own. To also get reminders when the app is closed (a flashcard review, a task due, an
event in 15 minutes, a habit left for the evening, a budget at 80%), the realtime service sends Web Push. It needs `DATABASE_URL`
(it reads the synced data) and a pair of VAPID keys:

1. Make the keys once, on any computer: `npx web-push generate-vapid-keys`.
2. On the realtime service in Render add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` (`mailto:` and your address).
   `PUSH_TIMEZONE` is optional and defaults to `Asia/Ho_Chi_Minh`: "evening" means evening there.
3. A free Render service sleeps after 15 minutes, and a sleeping server sends nothing. Make a free monitor at cron-job.org or
   UptimeRobot that opens `https://your-realtime-service.onrender.com/health` every 5 minutes. That keeps it awake, and each ping
   also makes it look for what is due.
4. In the app: bell, then the sliders icon, then switch on "On this device" (once per device). "Send a test" checks the whole path.

On iPhone push only works for the app added to the Home Screen (iOS 16.4 or newer). Reminders are sent once each; changing the
keys later means switching the device off and on again.
