# Hank62 deployment

## Architecture

- Vercel: Vite frontend.
- Render: hank62-realtime Node/WebSocket service.
- Render: hank62-rag FastAPI service.
- External managed PostgreSQL, Qdrant and Redis are required by Hank RAG in production.

## Vercel

1. Import the repository into Vercel.
2. Framework preset: Vite.
3. Build command: npm run build.
4. Output directory: dist.
5. Add these environment variables before deploying:

  VITE_SPACEHANK_API_URL=https://realtime-service.onrender.com
  VITE_SPACEHANK_WS_URL=wss://realtime-service.onrender.com
  VITE_HANK_RAG_API_URL=https://rag-service.onrender.com

vercel.json keeps /spacehank working on refresh.

## Render

The root render.yaml defines both services. Create a Blueprint from the repository, then set the secret values marked sync: false.

For the realtime service:

  SPACEHANK_PASSWORD=<long-random-secret>
  SPACEHANK_ORIGIN=https://your-vercel-domain
  SPACEHANK_CODEX_CMD=<installed-worker-command-or-empty>
  SPACEHANK_CLAUDE_CMD=<installed-worker-command-or-empty>

The Render Node service cannot execute local desktop CLIs unless they are installed in the image. For production workers, use a dedicated worker image or expose a controlled internal task runner and set only commands that exist on the service.

For Hank RAG:

  GEMINI_API_KEY=<secret>
  DATABASE_URL=<managed-postgres-url>
  QDRANT_URL=<managed-qdrant-url>
  REDIS_URL=<managed-redis-url>

The RAG service must have persistent external services. Do not use local Docker Compose ports or localhost URLs in Render.

## Required post-deploy checks

  curl https://realtime-service.onrender.com/health
  curl https://rag-service.onrender.com/health

Expected realtime response includes mode: production. Open the Vercel URL, go to /spacehank, log in with SPACEHANK_PASSWORD, and confirm the realtime pill is online.

## Security

- Never put SPACEHANK_PASSWORD, GEMINI_API_KEY, database credentials or worker credentials in VITE_* variables.
- Use HTTPS/WSS only.
- Set SPACEHANK_ORIGIN to the exact Vercel origin.
- Set a long random password and rotate it if exposed.
- Configure database/vector/Redis backups before indexing production documents.
