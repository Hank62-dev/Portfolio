import webpush from 'web-push';
import { vi } from '../src/spacehank/locale/vi.js';
import { plainT, reminders } from '../src/spacehank/notifications/rules.js';
import { HttpError } from './http.mjs';

// Web Push: reminders that reach a phone or a computer even when the app is closed. The browser gives the app a
// "subscription" (an address at its push service plus two keys); the app hands it to this server, and the server, which is
// the one thing that is awake, looks at the owner's synced data once a minute and sends what is due. The rules for what is
// worth a nudge are the very file the app uses (src/spacehank/notifications/rules.js), so the two always agree.
//
// It needs the database (the data to look at, and a place to remember subscriptions and what was already sent) and a set of
// VAPID keys (the server's identity towards push services). Without either it is simply off.

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS push_subs (
     endpoint   TEXT   PRIMARY KEY,
     p256dh     TEXT   NOT NULL,
     auth       TEXT   NOT NULL,
     kinds      JSONB  NOT NULL DEFAULT '{}',
     created_at BIGINT NOT NULL
   )`,
  // the language of the device, so what it is told is told in it (added later: older rows are English)
  `ALTER TABLE push_subs ADD COLUMN IF NOT EXISTS lang TEXT NOT NULL DEFAULT 'en'`,
  `CREATE TABLE IF NOT EXISTS push_sent (
     key     TEXT   PRIMARY KEY,
     sent_at BIGINT NOT NULL
   )`,
];

const MAX_SUBS = 20;
const TICK_EVERY = 60 * 1000;
const MIN_GAP = 45 * 1000; // an uptime ping may ask for a tick; not more often than this
const KEEP_SENT = 7 * 24 * 3600 * 1000;
const DAY = 24 * 3600 * 1000;

const text = (value, max) => (typeof value === 'string' && value.length > 0 && value.length <= max ? value : '');

/** What a browser hands over, checked. Throws a 400 for anything that is not a push subscription. */
export const parseSubscription = (input) => {
  const endpoint = text(input?.endpoint, 1000);
  const p256dh = text(input?.keys?.p256dh, 200);
  const auth = text(input?.keys?.auth, 100);
  if (!endpoint.startsWith('https://') || !p256dh || !auth) throw new HttpError(400, 'That is not a push subscription.');
  return { endpoint, p256dh, auth };
};

const day = (ms) => new Date(ms).toISOString().slice(0, 10);

/** The translator for a language: the Vietnamese table, or the English text as written. */
const translator = (lang) => (lang === 'vi' ? (text, ...args) => plainT(vi[text] ?? text, ...args) : plainT);

export const createPush = ({ db, sync, calendar, vapid, zone = 'Asia/Ho_Chi_Minh', send, now = Date.now }) => {
  const enabled = Boolean(db && sync && vapid?.publicKey && vapid?.privateKey && vapid?.subject);
  const deliver = send ?? ((subscription, payload) => webpush.sendNotification(subscription, payload, { TTL: 3600, urgency: 'normal', vapidDetails: { subject: vapid.subject, publicKey: vapid.publicKey, privateKey: vapid.privateKey } }));

  // The database is asked as seldom as possible, because a free database goes to sleep when nobody asks and every question
  // keeps it awake (and counted). So the devices and the facts the rules look at are kept here, and read again only when they
  // can have changed: a device came or went, the owner's data was written (sync.version() moves), a flashcard's time came,
  // or many hours passed. Between those the check each minute is plain arithmetic on what is already in memory.
  const REFRESH = 6 * 3600 * 1000;
  let subsCache = null; // { rows, at }
  let factsCache = null; // { data, at, version, nextCard }
  const claimed = new Set(); // occasions already sent, so a reminder that stays due all evening costs no query
  let touched = false; // did this check reach the database?

  let ready = null;
  const init =() => (ready ??= (async () => {
    await sync.init();
    for (const statement of SCHEMA) await db.query(statement);
  })().catch((error) => {
    ready = null;
    throw error;
  }));

  const need = () => {
    if (!enabled) throw new HttpError(503, 'Push is not set up: add DATABASE_URL and the VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT settings to the realtime service.');
  };

  // ---- subscriptions

  const subscribe = async ({ subscription, kinds, lang }) => {
    need();
    await init();
    const { endpoint, p256dh, auth } = parseSubscription(subscription);
    const known = await db.query(`SELECT 1 FROM push_subs WHERE endpoint = $1`, [endpoint]);
    if (!known.rows.length) {
      const count = Number((await db.query(`SELECT COUNT(*) AS n FROM push_subs`)).rows[0].n);
      if (count >= MAX_SUBS) throw new HttpError(400, 'Too many devices are subscribed. Remove one first.');
    }
    const wanted = kinds && typeof kinds === 'object' ? Object.fromEntries(Object.entries(kinds).filter(([, on]) => typeof on === 'boolean').slice(0, 20)) : {};
    await db.query(
      `INSERT INTO push_subs (endpoint, p256dh, auth, kinds, created_at, lang) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, kinds = EXCLUDED.kinds, lang = EXCLUDED.lang`,
      [endpoint, p256dh, auth, JSON.stringify(wanted), now(), lang === 'vi' ? 'vi' : 'en']
    );
    subsCache = null;
    return { subscribed: true };
  };

  const unsubscribe = async (endpoint) => {
    need();
    await init();
    await db.query(`DELETE FROM push_subs WHERE endpoint = $1`, [text(endpoint, 1000)]);
    subsCache = null;
    return { subscribed: false };
  };

  const subscriptions = async () => (await db.query(`SELECT endpoint, p256dh, auth, kinds, lang FROM push_subs`)).rows;

  /** Sends one notification to every device that wants this kind. A device the push service says is gone is forgotten. */
  const sendTo = async (subs, notification) => {
    const payload = JSON.stringify(notification);
    let sent = 0;
    for (const sub of subs) {
      if (notification.kind && sub.kinds?.[notification.kind] === false) continue;
      try {
        await deliver({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
        sent += 1;
      } catch (error) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await db.query(`DELETE FROM push_subs WHERE endpoint = $1`, [sub.endpoint]);
          subsCache = null;
        } else console.warn('Push could not be sent:', error?.statusCode ?? error?.message);
      }
    }
    return sent;
  };

  const sendTest = async () => {
    need();
    await init();
    const subs = await subscriptions();
    let sent = 0;
    for (const lang of new Set(subs.map((s) => s.lang))) {
      const t = translator(lang);
      sent += await sendTo(subs.filter((s) => s.lang === lang), { title: t('This is a test'), body: t('Push is working, even with the app closed.'), tab: 'hank', kind: 'system', tone: 'success', key: `test:${now()}` });
    }
    return { sent };
  };

  // ---- what is due

  /** The few facts the rules need, read straight from the synced data (the cards could be thousands, so only the due ones). */
  const facts = async (at) => {
    const live = `store = $1 AND NOT deleted`;
    const [cards, tasks, habits, spending, budgets, diary] = await Promise.all([
      // how many are due now, and when the next one will be (the copy of the facts is out of date from that moment)
      db.query(
        `SELECT COUNT(*) FILTER (WHERE d <= $2) AS due, MIN(d) FILTER (WHERE d > $2) AS next
         FROM (SELECT CASE WHEN doc->>'due' ~ '^[0-9.]+$' THEN (doc->>'due')::numeric END AS d FROM sync_docs WHERE ${live}) cards`,
        ['cards', at]
      ),
      db.query(`SELECT id, doc->>'title' AS title, doc->>'column' AS "column", doc->>'due' AS due FROM sync_docs WHERE ${live} AND doc->>'column' IS DISTINCT FROM 'done' AND COALESCE(doc->>'due', '') <> ''`, ['tasks']),
      db.query(`SELECT doc->>'name' AS name, doc->'days' AS days FROM sync_docs WHERE ${live}`, ['habits']),
      db.query(`SELECT doc FROM sync_docs WHERE ${live} AND CASE WHEN doc->>'at' ~ '^[0-9]+$' THEN (doc->>'at')::bigint ELSE 0 END >= $2`, ['expenses', at - 32 * DAY]),
      db.query(`SELECT doc FROM sync_docs WHERE ${live}`, ['budgets']),
      db.query(`SELECT doc->>'day' AS day FROM sync_docs WHERE ${live} AND doc->>'day' >= $2`, ['notes', day(at - 3 * DAY)]),
    ]);
    const next = cards.rows[0].next;
    return {
      data: {
        // a card is due once its time has come; the rules only count them
        cards: Array.from({ length: Number(cards.rows[0].due) }, () => ({ due: 0 })),
        tasks: tasks.rows.map((row) => ({ id: row.id, title: row.title ?? 'A task', column: row.column, due: row.due })),
        habits: habits.rows.map((row) => ({ name: row.name ?? 'A habit', days: Array.isArray(row.days) ? row.days : [] })),
        entries: spending.rows.map((row) => row.doc),
        budgets: budgets.rows.map((row) => row.doc),
        notes: diary.rows.map((row) => ({ day: row.day })),
      },
      nextCard: next === null || next === undefined ? null : Number(next),
    };
  };

  /** The devices, from memory unless they may have changed. */
  const devices = async (at) => {
    if (!subsCache || at - subsCache.at > REFRESH) {
      subsCache = { rows: await subscriptions(), at };
      touched = true;
    }
    return subsCache.rows;
  };

  /** The facts, from memory unless the data was written since, a card has become due, or it has been a long while. */
  const current = async (at) => {
    const version = sync.version();
    const stale = !factsCache || factsCache.version !== version || at - factsCache.at > REFRESH || (factsCache.nextCard !== null && at >= factsCache.nextCard);
    if (stale) {
      const { data, nextCard } = await facts(at);
      factsCache = { data, at, version, nextCard };
      touched = true;
    }
    return factsCache.data;
  };

  let busy = false;
  let last = 0;
  let cleaned = 0;

  /** Looks at the data and sends whatever is newly due. Safe to call as often as you like: it never repeats itself. */
  const tick = async () => {
    if (!enabled || busy) return { sent: 0 };
    busy = true;
    try {
      await init();
      last = now();
      touched = false;
      const subs = await devices(last);
      if (!subs.length) return { sent: 0 };

      let events = [];
      if (calendar?.configured) {
        try {
          events = (await calendar.between(new Date(last - 60 * 1000), new Date(last + 20 * 60 * 1000))).events;
        } catch {
          /* the feed is down: the rest still goes out */
        }
      }
      // the version is read before the facts: a write that lands while they are being read makes the next check read them again
      const data = { now: new Date(last), zone, events, ...(await current(last)) };
      const due = reminders(data); // the occasions; each is then told in the language of the device it goes to
      const langs = [...new Set(subs.map((s) => s.lang))];
      const told = Object.fromEntries(langs.map((lang) => [lang, new Map(reminders({ ...data, t: translator(lang) }).map((item) => [item.key, item]))]));

      let sent = 0;
      for (const item of due) {
        if (claimed.has(item.key)) continue;
        // claim the occasion first, so two ticks at once (or a restart) can never send it twice
        const claim = await db.query(`INSERT INTO push_sent (key, sent_at) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING key`, [item.key, last]);
        touched = true;
        claimed.add(item.key);
        if (!claim.rows.length) continue;
        for (const lang of langs) {
          const text = told[lang].get(item.key) ?? item;
          sent += await sendTo(subs.filter((s) => s.lang === lang), { title: text.title, body: text.body, tab: item.tab, kind: item.kind, tone: item.tone ?? 'info', key: item.key });
        }
      }

      // tidying is not worth waking the database for: it waits for a check that reached it anyway
      if (touched && last - cleaned > 3600 * 1000) {
        cleaned = last;
        await db.query(`DELETE FROM push_sent WHERE sent_at < $1`, [last - KEEP_SENT]);
        if (claimed.size > 5000) claimed.clear();
      }
      return { sent };
    } catch (error) {
      console.warn('Push check failed:', error?.message);
      return { sent: 0 };
    } finally {
      busy = false;
    }
  };

  /** Something (an uptime ping) woke the server: look now if it has been a while. */
  const nudge = () => {
    if (enabled && now() - last > MIN_GAP) void tick();
  };

  let timer = null;
  const start = () => {
    if (!enabled || timer) return;
    timer = setInterval(() => void tick(), TICK_EVERY);
    timer.unref();
  };
  const stop = () => {
    clearInterval(timer);
    timer = null;
  };

  return { enabled, publicKey: enabled ? vapid.publicKey : '', init, subscribe, unsubscribe, sendTest, tick, nudge, start, stop };
};
