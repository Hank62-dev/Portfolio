import { parseWebhooks } from './discord.mjs';
// Reads and validates the environment once, so the rest of the server never touches process.env.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export const loadConfig = (env = process.env) => {
  const password = env.SPACEHANK_PASSWORD;
  // the password can be kept as a scrypt hash instead (`npm run spacehank:hash-password`), so it is not sitting in the settings in clear text
  const passwordHash = env.SPACEHANK_PASSWORD_HASH || '';
  const origin = env.SPACEHANK_ORIGIN;
  if (!password && !passwordHash) throw new Error('SPACEHANK_PASSWORD (or SPACEHANK_PASSWORD_HASH) is required');
  if (!origin) throw new Error('SPACEHANK_ORIGIN is required');

  const normalizedOrigin = origin.replace(/\/+$/, '');

  return {
    env,
    port: Number(env.SPACEHANK_PORT || 8787),
    password,
    passwordHash,
    origin: normalizedOrigin,
    // Cross-site cookies (Vercel -> Render) need SameSite=None, which browsers only accept with Secure.
    secureCookie: normalizedOrigin.startsWith('https://'),
    workdir: env.SPACEHANK_WORKDIR || process.cwd(),
    // a short access token, and a long refresh token that renews it (see auth.mjs)
    accessTtlMs: 30 * MINUTE,
    refreshTtlMs: 30 * 24 * HOUR,
    sessionSecret: env.SPACEHANK_SESSION_SECRET || '', // empty: the tokens are signed with a key made from the password
    maxBodyBytes: 64 * 1024,
    maxAudioBytes: 7 * 1024 * 1024, // a recording to be turned into text (see ai.transcribe)
    maxAiBodyBytes: 128 * 1024, // a music library's track list rides along with a DJ request
    ai: {
      geminiKey: env.GEMINI_API_KEY || '',
      geminiBase: (env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, ''), // overridable so tests can point at a fake
      textModel: env.GEMINI_TEXT_MODEL || 'gemini-3.8-flash',
      // asked instead when the text model is overloaded or its free quota for the day is spent; empty turns it off
      textFallbackModel: env.GEMINI_TEXT_FALLBACK_MODEL ?? 'gemini-3.5-flash-lite',
      imageModel: env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
      hfToken: env.HF_TOKEN || '',
      hfImageModel: env.HF_IMAGE_MODEL || 'black-forest-labs/FLUX.1-schnell',
      dailyLimit: Number(env.AI_DAILY_LIMIT || 60),
    },
    calendarIcsUrl: env.CALENDAR_ICS_URL || '',
    // The owner's Google Calendar through Google's own API (see gcal.mjs). The redirect address is the one set on the OAuth client
    // in Google Cloud: this server's /api/calendar/google/callback. The key seals the refresh token in the database; without one
    // of its own it falls back to the key that signs sign-in tokens.
    google: {
      clientId: env.GOOGLE_CLIENT_ID || '',
      clientSecret: env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: env.GOOGLE_REDIRECT_URI || '',
      key: env.CALENDAR_TOKEN_KEY || env.SPACEHANK_SESSION_SECRET || '',
    },
    discordWebhooks: parseWebhooks(env), // { channelName: webhook url }, kept on the server
    // the database that keeps the owner's data in step across devices; without it the workspace stays on each device
    databaseUrl: env.DATABASE_URL || '',
    sync: {
      maxBlobBytes: Math.max(100 * 1024, Number(env.SYNC_MAX_BLOB_MB || 4) * 1024 * 1024),
      quotaBytes: Math.max(10 * 1024 * 1024, Number(env.SYNC_QUOTA_MB || 300) * 1024 * 1024),
    },
    // Web Push: the server's identity towards the browsers' push services (made once with `npx web-push generate-vapid-keys`),
    // and the time zone the reminders keep ("evening" means the owner's evening, not the server's)
    push: {
      publicKey: env.VAPID_PUBLIC_KEY || '',
      privateKey: env.VAPID_PRIVATE_KEY || '',
      subject: env.VAPID_SUBJECT || '',
      zone: env.PUSH_TIMEZONE || 'Asia/Ho_Chi_Minh',
    },
    maxTaskChars: 20000,
    maxTasks: 200,
    maxEvents: 40,
    loginLimit: { maxFailures: 10, maxFailuresGlobal: 50, windowMs: 15 * MINUTE }, // per address, and in all (many addresses guessing together)
    // how many proxies stand in front of this server (Render's edge is one): the client's address is that many entries from the end of X-Forwarded-For
    trustedProxyHops: Math.max(1, Number(env.TRUSTED_PROXY_HOPS || 1)),
    rateLimit: {
      general: { max: 600, windowMs: MINUTE },
      heavy: { max: 40, windowMs: MINUTE },
      auth: { max: 40, windowMs: MINUTE },
    },
    // shared with the Hank RAG service, which only answers a request that carries a ticket signed with it (see ragToken.mjs)
    ragTokenSecret: env.RAG_TOKEN_SECRET || '',
  };
};
