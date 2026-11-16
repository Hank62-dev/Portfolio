import { HttpError } from '../http/http.mjs';
import { createLimiter } from '../http/limits.mjs';

// The portfolio's guestbook: visitors leave a small flame with a short line on a night sky. Open to anyone, so it is
// kept small on purpose: only the newest MAX_LIVE are kept at all, a line is short and plain (no links), each visitor may
// light one every few minutes, and the owner can put any of them out. Stored in Postgres when there is one, otherwise in
// memory (gone on restart, which is fine for something this light).

export const MAX_LIVE = 30;
export const MAX_LENGTH = 80;
const POST_WINDOW_MS = 10 * 60 * 1000;

const SCHEMA = `CREATE TABLE IF NOT EXISTS portfolio_whispers (
  id          TEXT     PRIMARY KEY,
  message     TEXT     NOT NULL,
  country     TEXT,
  x           REAL     NOT NULL,
  y           REAL     NOT NULL,
  created_at  BIGINT   NOT NULL
)`;

// links, addresses and handles: a guestbook is not a place to advertise
const LINKISH = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|xyz|ru|cn|vn|info|biz|top|ly|gg|me|co)\b|@[a-z0-9_]{3,})/i;

/** Cleans what a visitor sent into a whisper, or throws a 400 saying what is wrong with it. */
export const parseWhisper = (body) => {
  const raw = typeof body?.message === 'string' ? body.message : '';
  // control and invisible formatting characters (zero-width, direction overrides) out, any run of white space down to one space
  const message = raw.replace(/[\p{Cc}\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!message) throw new HttpError(400, 'Write a few words first.');
  if ([...message].length > MAX_LENGTH) throw new HttpError(400, `Keep it under ${MAX_LENGTH} characters.`);
  if (LINKISH.test(message)) throw new HttpError(400, 'No links, please.');
  const x = Number(body?.x);
  const y = Number(body?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) throw new HttpError(400, 'Somewhere on the sky, please.');
  const country = typeof body?.country === 'string' && /^[A-Za-z]{2}$/.test(body.country) ? body.country.toUpperCase() : null;
  return { message, country, x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 };
};

const fromRow = (r) => ({ id: r.id, message: r.message, country: r.country ?? null, x: Number(r.x), y: Number(r.y), at: Number(r.created_at) });

export const createWhispers = ({ db = null, now = Date.now, random = Math.random } = {}) => {
  const memory = [];
  const limiter = createLimiter({ max: 1, windowMs: POST_WINDOW_MS, now });
  let ready = null;
  const schema = () => (ready ??= db.query(SCHEMA).catch((error) => {
    ready = null;
    throw error;
  }));

  const list = async () => {
    if (!db) return memory.slice(0, MAX_LIVE);
    await schema();
    const { rows } = await db.query('SELECT id, message, country, x, y, created_at FROM portfolio_whispers ORDER BY created_at DESC LIMIT $1', [MAX_LIVE]);
    return rows.map(fromRow);
  };

  const add = async (who, body) => {
    const whisper = parseWhisper(body);
    const allowed = limiter.hit(who);
    if (!allowed.ok) throw new HttpError(429, 'One flame every ten minutes. Come back a little later.');
    const item = { id: `${now().toString(36)}${Math.floor(random() * 1e9).toString(36)}`, ...whisper, at: now() };
    if (!db) {
      memory.unshift(item);
      memory.length = Math.min(memory.length, MAX_LIVE);
      return item;
    }
    await schema();
    await db.query('INSERT INTO portfolio_whispers (id, message, country, x, y, created_at) VALUES ($1, $2, $3, $4, $5, $6)', [item.id, item.message, item.country, item.x, item.y, item.at]);
    // only the newest are ever shown, so the rest are not kept
    await db.query('DELETE FROM portfolio_whispers WHERE id NOT IN (SELECT id FROM portfolio_whispers ORDER BY created_at DESC LIMIT $1)', [MAX_LIVE]);
    return item;
  };

  const remove = async (id) => {
    if (typeof id !== 'string' || !id) throw new HttpError(400, 'Which one?');
    if (!db) {
      const i = memory.findIndex((w) => w.id === id);
      if (i >= 0) memory.splice(i, 1);
      return;
    }
    await schema();
    await db.query('DELETE FROM portfolio_whispers WHERE id = $1', [id]);
  };

  return { list, add, remove };
};
