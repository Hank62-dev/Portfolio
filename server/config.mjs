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
    sessionTtlMs: 12 * HOUR,
    maxBodyBytes: 64 * 1024,
    maxTaskChars: 20000,
    maxTasks: 200,
    maxEvents: 40,
    loginLimit: { maxFailures: 10, windowMs: 15 * MINUTE },
  };
};
