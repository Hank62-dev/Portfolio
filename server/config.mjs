import { parseWebhooks } from './discord.mjs';
// Reads and validates the environment once, so the rest of the server never touches process.env.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export const loadConfig = (env = process.env) => {
  const password = env.SPACEHANK_PASSWORD;
  const origin = env.SPACEHANK_ORIGIN;
  if (!password) throw new Error('SPACEHANK_PASSWORD is required');
  if (!origin) throw new Error('SPACEHANK_ORIGIN is required');

  const normalizedOrigin = origin.replace(/\/+$/, '');

  return {
    env,
    port: Number(env.SPACEHANK_PORT || 8787),
    password,
    origin: normalizedOrigin,
    // Cross-site cookies (Vercel -> Render) need SameSite=None, which browsers only accept with Secure.
    secureCookie: normalizedOrigin.startsWith('https://'),
    workdir: env.SPACEHANK_WORKDIR || process.cwd(),
    // a short access token, and a long refresh token that renews it (see auth.mjs)
    accessTtlMs: 30 * MINUTE,
    refreshTtlMs: 30 * 24 * HOUR,
    sessionSecret: env.SPACEHANK_SESSION_SECRET || '', // empty: the tokens are signed with a key made from the password
    maxBodyBytes: 64 * 1024,
    maxAiBodyBytes: 128 * 1024, // a music library's track list rides along with a DJ request
    ai: {
      geminiKey: env.GEMINI_API_KEY || '',
      geminiBase: (env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, ''), // overridable so tests can point at a fake
      textModel: env.GEMINI_TEXT_MODEL || 'gemini-3.8-flash',
      imageModel: env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
      hfToken: env.HF_TOKEN || '',
      hfImageModel: env.HF_IMAGE_MODEL || 'black-forest-labs/FLUX.1-schnell',
      dailyLimit: Number(env.AI_DAILY_LIMIT || 60),
    },
    calendarIcsUrl: env.CALENDAR_ICS_URL || '',
    discordWebhooks: parseWebhooks(env), // { channelName: webhook url }, kept on the server
    // the database that keeps the owner's data in step across devices; without it the workspace stays on each device
    databaseUrl: env.DATABASE_URL || '',
    sync: {
      maxBlobBytes: Math.max(100 * 1024, Number(env.SYNC_MAX_BLOB_MB || 4) * 1024 * 1024),
      quotaBytes: Math.max(10 * 1024 * 1024, Number(env.SYNC_QUOTA_MB || 300) * 1024 * 1024),
    },
    maxTaskChars: 20000,
    maxTasks: 200,
    maxEvents: 40,
    loginLimit: { maxFailures: 10, windowMs: 15 * MINUTE },
  };
};
