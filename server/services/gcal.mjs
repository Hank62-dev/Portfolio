import crypto from 'node:crypto';
import { HttpError } from '../http/http.mjs';

// The owner's Google Calendar, read and written through Google's own API (OAuth 2.0, "offline" access).
//
// The owner signs in with Google once. Google hands this server a long-lived refresh token, which is kept in the database
// encrypted (AES-256-GCM, with a key that only lives in the server's environment) and is never sent to a browser. With it the
// server asks Google for short access tokens, reads the events of the calendars the owner chose to show, and creates, changes
// and deletes events. It needs the database (for the token) and four settings; without them it is simply off and the secret
// ICS feed (calendar.mjs) keeps doing the read-only briefing.

const API = 'https://www.googleapis.com/calendar/v3';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
// the least that does the job: events of the calendars, and the list of those calendars (no mail, no contacts, no profile)
const SCOPES = ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.calendarlist.readonly'];

const STATE_TTL = 10 * 60 * 1000;
const EVENTS_TTL = 2 * 60 * 1000;
const LIST_TTL = 10 * 60 * 1000;
const MAX_RANGE = 70 * 24 * 60 * 60 * 1000; // a month grid is six weeks
const MAX_BRIEFING_EVENTS = 25;
const HOUR = 60 * 60 * 1000;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS google_calendar (
     id         TEXT   PRIMARY KEY,
     token      TEXT   NOT NULL,
     email      TEXT   NOT NULL DEFAULT '',
     selected   JSONB,
     created_at BIGINT NOT NULL
   )`,
];

const REPEAT = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[A-Za-z0-9_@.\-%+=]{1,1024}$/;

const b64 = (buffer) => Buffer.from(buffer).toString('base64url');
const clip = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/** A sealed string: `v1.iv.tag.data`. Only the same key opens it, and any change to it is noticed. */
export const seal = (secret, text) => {
  const key = crypto.createHash('sha256').update(`hank62-google-calendar:${secret}`).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `v1.${b64(iv)}.${b64(cipher.getAuthTag())}.${b64(data)}`;
};

/** The text inside a sealed string, or null if the key is not the one it was sealed with (or it was tampered with). */
export const unseal = (secret, sealed) => {
  try {
    const [version, iv, tag, data] = String(sealed).split('.');
    if (version !== 'v1') return null;
    const key = crypto.createHash('sha256').update(`hank62-google-calendar:${secret}`).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
};

const validZone = (zone, fallback) => {
  try {
    if (typeof zone === 'string' && zone) {
      new Intl.DateTimeFormat('en', { timeZone: zone });
      return zone;
    }
  } catch {
    /* an unknown zone: the server's own is used */
  }
  return fallback;
};

const addDay = (date) => new Date(Date.parse(`${date}T00:00:00Z`) + 24 * HOUR).toISOString().slice(0, 10);

const instant = (value, what) => {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new HttpError(400, `${what} is not a valid time`);
  return new Date(ms).toISOString();
};

/** What the app sends for an event, checked and turned into Google's shape. */
export const eventBody = (input, { zone, series = false }) => {
  const summary = clip(input.title, 200);
  if (!summary) throw new HttpError(400, 'An event needs a title');
  const body = { summary, location: clip(input.location, 300), description: clip(input.description, 4000) };
  // changing a whole series only changes its words: moving one day of it to another would move the series itself
  if (series) return body;

  if (input.allDay) {
    if (!DATE.test(String(input.start))) throw new HttpError(400, 'Start is not a valid date');
    const end = DATE.test(String(input.end)) && input.end > input.start ? input.end : addDay(input.start);
    body.start = { date: input.start };
    body.end = { date: end };
  } else {
    const start = instant(input.start, 'Start');
    const end = instant(input.end ?? input.start, 'End');
    if (end <= start) throw new HttpError(400, 'The end must be after the start');
    body.start = { dateTime: start, timeZone: zone };
    body.end = { dateTime: end, timeZone: zone };
  }
  if (REPEAT[input.repeat]) body.recurrence = [`RRULE:FREQ=${REPEAT[input.repeat]}`];
  return body;
};

export const createGoogleCalendar = ({ db, settings = {}, fetchImpl = fetch, now = Date.now, zone = 'Asia/Ho_Chi_Minh' }) => {
  const { clientId = '', clientSecret = '', redirectUri = '', key = '' } = settings;
  const enabled = Boolean(db && clientId && clientSecret && redirectUri && key);

  let ready = null;
  let row; // undefined: not read yet, null: not connected, otherwise { refresh, email, selected }
  let lost = false; // Google took the permission back: the owner has to connect again
  let access = null; // { token, until }
  let list = null; // { at, calendars }
  const events = new Map();
  const pending = new Map(); // state nonces that were handed out and not used yet

  const init = () => (ready ??= (async () => {
    for (const statement of SCHEMA) await db.query(statement);
  })());

  const forget = () => {
    events.clear();
    list = null;
  };

  const load = async () => {
    if (!enabled) return null;
    if (row !== undefined) return row;
    await init();
    const { rows } = await db.query(`SELECT token, email, selected FROM google_calendar WHERE id = 'owner'`);
    const refresh = rows[0] ? unseal(key, rows[0].token) : null;
    row = refresh ? { refresh, email: rows[0].email, selected: Array.isArray(rows[0].selected) ? rows[0].selected : null } : null;
    return row;
  };

  const sign = (text) => b64(crypto.createHmac('sha256', key).update(`state:${text}`).digest());

  // ---- signing in
  /** The address that sends the owner to Google's consent screen. */
  const authUrl = () => {
    if (!enabled) throw new HttpError(503, 'Google Calendar is not set up on the server.');
    const nonce = b64(crypto.randomBytes(16));
    const until = now() + STATE_TTL;
    for (const [n, t] of pending) if (t < now()) pending.delete(n);
    pending.set(nonce, until);
    const state = `${until}.${nonce}`;
    const query = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline', // a refresh token, so the server can go on without the owner
      prompt: 'consent', // asked again every time, because Google only hands over a refresh token with consent
      state: `${state}.${sign(state)}`,
    });
    return `${AUTH_URL}?${query}`;
  };

  const tokenCall = async (form) => {
    let response;
    try {
      response = await fetchImpl(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...form }),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new HttpError(502, 'Google could not be reached');
    }
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  };

  /** The page Google sent the owner back to: checks the state, trades the code for tokens and keeps the refresh token. */
  const connect = async ({ code, state }) => {
    if (!enabled) throw new HttpError(503, 'Google Calendar is not set up on the server.');
    const [until, nonce, signature] = String(state ?? '').split('.');
    const expected = sign(`${until}.${nonce}`);
    const same = typeof signature === 'string' && signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!same || !pending.has(nonce) || Number(until) < now()) throw new HttpError(400, 'This sign-in link has expired. Start again.');
    pending.delete(nonce);
    if (!code) throw new HttpError(400, 'Google did not send a code');

    const { ok, data } = await tokenCall({ code: String(code), redirect_uri: redirectUri, grant_type: 'authorization_code' });
    if (!ok || !data.access_token) throw new HttpError(502, 'Google refused the sign-in');
    if (!data.refresh_token) throw new HttpError(400, 'Google did not allow lasting access. Remove this app at myaccount.google.com/permissions and connect again.');

    await init();
    await db.query(
      `INSERT INTO google_calendar (id, token, email, selected, created_at) VALUES ('owner', $1, '', NULL, $2)
       ON CONFLICT (id) DO UPDATE SET token = EXCLUDED.token, email = '', selected = NULL, created_at = EXCLUDED.created_at`,
      [seal(key, data.refresh_token), now()]
    );
    row = { refresh: data.refresh_token, email: '', selected: null };
    lost = false;
    access = { token: data.access_token, until: now() + Math.max(60, Number(data.expires_in) || 3000) * 1000 };
    forget();
    const primary = (await calendars()).find((c) => c.primary);
    if (primary) {
      row.email = primary.id;
      await db.query(`UPDATE google_calendar SET email = $1 WHERE id = 'owner'`, [primary.id]);
    }
  };

  // ---- talking to Google
  const accessToken = async () => {
    const current = await load();
    if (!current) throw new HttpError(409, 'Google Calendar is not connected.');
    if (access && access.until - 60 * 1000 > now()) return access.token;
    const { ok, data } = await tokenCall({ refresh_token: current.refresh, grant_type: 'refresh_token' });
    if (!ok) {
      if (data.error === 'invalid_grant') {
        // revoked, or Google expired it: nothing more can be done without the owner
        await db.query(`DELETE FROM google_calendar WHERE id = 'owner'`);
        row = null;
        lost = true;
        access = null;
        forget();
        throw new HttpError(409, 'Google Calendar needs to be connected again.');
      }
      throw new HttpError(502, 'Google could not renew the sign-in');
    }
    access = { token: data.access_token, until: now() + Math.max(60, Number(data.expires_in) || 3000) * 1000 };
    return access.token;
  };

  const api = async (path, { method = 'GET', query, body } = {}, retried = false) => {
    const token = await accessToken();
    const url = `${API}${path}${query ? `?${new URLSearchParams(query)}` : ''}`;
    let response;
    try {
      response = await fetchImpl(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new HttpError(502, 'Google Calendar could not be reached');
    }
    if (response.status === 401 && !retried) {
      access = null; // the token was cut short: ask for a new one once
      return api(path, { method, query, body }, true);
    }
    if (response.status === 204) return {};
    const data = await response.json().catch(() => ({}));
    if (response.ok) return data;
    // 404 would read as "this server has no such route" in the app, so a missing event is a 422
    if (response.status === 404 || response.status === 410) throw new HttpError(422, 'That event no longer exists.');
    if (response.status === 403) throw new HttpError(403, data.error?.message || 'Google does not let this calendar be changed.');
    if (response.status === 400) throw new HttpError(400, data.error?.message || 'Google did not accept that event.');
    throw new HttpError(502, 'Google Calendar could not answer');
  };

  // ---- the calendars
  /** The calendars of the account: [{ id, name, color, primary, writable, selected }]. By default only the main one is shown. */
  const calendars = async () => {
    const current = await load();
    if (!current) throw new HttpError(409, 'Google Calendar is not connected.');
    if (!list || now() - list.at > LIST_TTL) {
      const data = await api('/users/me/calendarList', { query: { minAccessRole: 'reader', maxResults: '50', fields: 'items(id,summary,summaryOverride,backgroundColor,primary,accessRole)' } });
      list = {
        at: now(),
        calendars: (data.items ?? []).map((item) => ({
          id: item.id,
          name: item.summaryOverride || item.summary || item.id,
          color: item.backgroundColor || '#8a8a8a',
          primary: Boolean(item.primary),
          writable: item.accessRole === 'owner' || item.accessRole === 'writer',
        })),
      };
    }
    const primary = list.calendars.find((c) => c.primary)?.id;
    const chosen = current.selected ?? (primary ? [primary] : []);
    return list.calendars.map((c) => ({ ...c, selected: chosen.includes(c.id) }));
  };

  /** Chooses which calendars are shown. */
  const select = async (ids) => {
    const current = await load();
    if (!current) throw new HttpError(409, 'Google Calendar is not connected.');
    const known = new Set((await calendars()).map((c) => c.id));
    const chosen = [...new Set((Array.isArray(ids) ? ids : []).filter((id) => known.has(id)))].slice(0, 20);
    await db.query(`UPDATE google_calendar SET selected = $1::jsonb WHERE id = 'owner'`, [JSON.stringify(chosen)]);
    current.selected = chosen;
    events.clear();
    return calendars();
  };

  const status = async () => {
    if (!enabled) return { enabled: false, connected: false, lost: false, email: '', calendars: [] };
    const current = await load();
    if (!current) return { enabled: true, connected: false, lost, email: '', calendars: [] };
    try {
      return { enabled: true, connected: true, lost: false, email: current.email, calendars: await calendars() };
    } catch (error) {
      if (error instanceof HttpError && error.status === 409) return { enabled: true, connected: false, lost: true, email: '', calendars: [] };
      // Google is unreachable right now: still connected, just not able to list the calendars
      return { enabled: true, connected: true, lost: false, email: current.email, calendars: [], unreachable: true };
    }
  };

  const disconnect = async () => {
    const current = await load();
    if (!current) return { connected: false };
    // best effort: take the permission back at Google too
    try {
      await fetchImpl(`${REVOKE_URL}?token=${encodeURIComponent(current.refresh)}`, { method: 'POST', signal: AbortSignal.timeout(8000) });
    } catch {
      /* the row is removed anyway; the owner can remove the app at myaccount.google.com/permissions */
    }
    await db.query(`DELETE FROM google_calendar WHERE id = 'owner'`);
    row = null;
    lost = false;
    access = null;
    forget();
    return { connected: false };
  };

  // ---- events
  const shape = (item, calendar) => {
    const allDay = Boolean(item.start?.date);
    const start = allDay ? item.start.date : item.start?.dateTime ? new Date(item.start.dateTime).toISOString() : null;
    const end = allDay ? item.end?.date : item.end?.dateTime ? new Date(item.end.dateTime).toISOString() : start;
    if (!start || !end) return null;
    return {
      id: item.id,
      calendarId: calendar.id,
      calendar: calendar.name,
      color: calendar.color,
      title: clip(item.summary || '', 200),
      start,
      end,
      allDay,
      location: clip(item.location || '', 300),
      description: clip(item.description || '', 4000),
      recurringId: item.recurringEventId || '',
      link: typeof item.htmlLink === 'string' ? item.htmlLink : '',
      // birthdays, focus time and the like cannot be changed like an ordinary event
      writable: calendar.writable && (!item.eventType || item.eventType === 'default'),
    };
  };

  /** Events that overlap [from, to] in the calendars that are shown, soonest first. */
  const range = async (from, to) => {
    if (!(from instanceof Date) || !(to instanceof Date) || Number.isNaN(+from) || Number.isNaN(+to) || to <= from) throw new HttpError(400, 'A valid from/to range is required');
    if (to - from > MAX_RANGE) throw new HttpError(400, 'Range is too long');
    const shown = (await calendars()).filter((c) => c.selected);
    const cacheKey = `${shown.map((c) => c.id).join(',')}|${from.toISOString()}|${to.toISOString()}`;
    const hit = events.get(cacheKey);
    if (hit && now() - hit.at < EVENTS_TTL) return hit.events;
    const perCalendar = await Promise.all(
      shown.map(async (calendar) => {
        const data = await api(`/calendars/${encodeURIComponent(calendar.id)}/events`, {
          query: {
            timeMin: from.toISOString(),
            timeMax: to.toISOString(),
            singleEvents: 'true',
            orderBy: 'startTime',
            maxResults: '250',
            fields: 'items(id,status,summary,location,description,start,end,htmlLink,recurringEventId,eventType)',
          },
        });
        return (data.items ?? []).filter((item) => item.status !== 'cancelled').map((item) => shape(item, calendar)).filter(Boolean);
      })
    );
    const merged = perCalendar.flat().sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
    if (events.size > 40) events.clear();
    events.set(cacheKey, { at: now(), events: merged });
    return merged;
  };

  /** The same events, in the plain shape the briefing and the reminders read. */
  const between = async (from, to) => {
    // the window is widened to whole hours, so a reminder check every minute is answered from what is already held
    const wide = await range(new Date(Math.floor(+from / HOUR) * HOUR), new Date(Math.ceil(+to / HOUR) * HOUR));
    return wide
      .filter((event) => (event.allDay ? Date.parse(`${event.start}T00:00:00Z`) < +to && Date.parse(`${event.end}T00:00:00Z`) > +from : Date.parse(event.start) < +to && Date.parse(event.end) > +from))
      .slice(0, MAX_BRIEFING_EVENTS)
      .map((event) => ({
        title: event.title || 'Untitled',
        start: event.allDay ? new Date(`${event.start}T00:00:00Z`).toISOString() : event.start,
        end: event.allDay ? new Date(`${event.end}T00:00:00Z`).toISOString() : event.end,
        allDay: event.allDay,
        location: event.location,
      }));
  };

  const writable = async (calendarId) => {
    const calendar = (await calendars()).find((c) => c.id === calendarId);
    if (!calendar) throw new HttpError(400, 'That calendar is not in this account.');
    if (!calendar.writable) throw new HttpError(403, 'That calendar is read-only.');
    return calendar;
  };

  const eventId = (value) => {
    if (typeof value !== 'string' || !ID.test(value)) throw new HttpError(400, 'That is not an event.');
    return value;
  };

  const create = async (input) => {
    const calendar = await writable(input.calendarId);
    const body = eventBody(input, { zone: validZone(input.timeZone, zone) });
    const item = await api(`/calendars/${encodeURIComponent(calendar.id)}/events`, { method: 'POST', body });
    events.clear();
    return { event: shape(item, calendar) };
  };

  const update = async (input) => {
    const calendar = await writable(input.calendarId);
    const series = Boolean(input.series) && Boolean(input.recurringId);
    const target = eventId(series ? input.recurringId : input.id);
    const body = eventBody(input, { zone: validZone(input.timeZone, zone), series });
    const item = await api(`/calendars/${encodeURIComponent(calendar.id)}/events/${encodeURIComponent(target)}`, { method: 'PATCH', body });
    events.clear();
    return { event: shape(item, calendar) };
  };

  const remove = async (input) => {
    const calendar = await writable(input.calendarId);
    const series = Boolean(input.series) && Boolean(input.recurringId);
    const target = eventId(series ? input.recurringId : input.id);
    await api(`/calendars/${encodeURIComponent(calendar.id)}/events/${encodeURIComponent(target)}`, { method: 'DELETE' });
    events.clear();
    return { deleted: true };
  };

  /** Reads what is stored at start-up, so `connected` is known without asking the database for it again. */
  const start = () => {
    if (enabled) void load().catch(() => {});
  };

  return {
    enabled,
    start,
    /** Whether the owner has connected (known once start() has read it). */
    get connected() {
      return Boolean(row);
    },
    isConnected: async () => Boolean(await load().catch(() => null)),
    authUrl,
    connect,
    status,
    select,
    disconnect,
    range,
    between,
    create,
    update,
    remove,
  };
};
