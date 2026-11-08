import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createGoogleCalendar, eventBody, seal, unseal } from './gcal.mjs';

// A real Postgres (in-process) for the stored token; Google is a fake that records what it was asked.
const SETTINGS = { clientId: 'cid', clientSecret: 'secret', redirectUri: 'https://api.example/api/calendar/google/callback', key: 'k'.repeat(32) };
const MAIN = { id: 'me@example.com', summary: 'me@example.com', backgroundColor: '#3366cc', primary: true, accessRole: 'owner' };
const WORK = { id: 'work@group.calendar.google.com', summary: 'Work', backgroundColor: '#cc6633', accessRole: 'writer' };
const HOLIDAYS = { id: 'holidays@group.v.calendar.google.com', summary: 'Holidays', backgroundColor: '#22aa66', accessRole: 'reader' };

let db;
let clock;
let calls;
let google;
let answers; // what the fake Google says for a call, keyed `METHOD path`

const reply = (status, data) => ({ ok: status < 400, status, json: async () => data });

const fakeFetch = async (url, init = {}) => {
  const method = init.method ?? 'GET';
  const parsed = new URL(url);
  const record = { method, url, path: parsed.pathname, query: Object.fromEntries(parsed.searchParams), headers: init.headers ?? {}, body: init.body instanceof URLSearchParams ? Object.fromEntries(init.body) : init.body ? JSON.parse(init.body) : undefined };
  calls.push(record);
  const answer = answers[`${method} ${parsed.pathname}`];
  if (typeof answer === 'function') return answer(record);
  if (answer) return reply(200, answer);
  return reply(404, {});
};

const defaults = () => ({
  'POST /token': { access_token: 'access-1', refresh_token: 'refresh-1', expires_in: 3600 },
  'GET /calendar/v3/users/me/calendarList': { items: [MAIN, WORK, HOLIDAYS] },
  'POST /revoke': {},
});

/** Runs the whole sign-in as Google would: the address the owner is sent to, and the page it sends them back to. */
const signIn = async () => {
  const url = new URL(google.authUrl());
  await google.connect({ code: 'the-code', state: url.searchParams.get('state') });
  return url;
};

// one database for the whole file (starting one takes seconds); the table is dropped before each test
beforeAll(() => {
  db = new PGlite();
});
afterAll(() => db.close());

beforeEach(async () => {
  await db.query('DROP TABLE IF EXISTS google_calendar');
  clock = 1_800_000_000_000;
  calls = [];
  answers = defaults();
  google = createGoogleCalendar({ db, settings: SETTINGS, fetchImpl: fakeFetch, now: () => clock, zone: 'Asia/Ho_Chi_Minh' });
});

describe('sealing the refresh token', () => {
  it('opens only with the same key and notices tampering', () => {
    const sealed = seal('key-one', 'refresh-token');
    expect(sealed).not.toContain('refresh-token');
    expect(unseal('key-one', sealed)).toBe('refresh-token');
    expect(unseal('key-two', sealed)).toBeNull();
    expect(unseal('key-one', sealed.slice(0, -3) + 'AAA')).toBeNull();
    expect(unseal('key-one', 'nonsense')).toBeNull();
  });
});

describe('what an event is made of', () => {
  const zone = 'Asia/Ho_Chi_Minh';
  it('needs a title and a time that makes sense', () => {
    expect(() => eventBody({ title: '  ', start: '2026-11-08T09:00:00Z' }, { zone })).toThrow('title');
    expect(() => eventBody({ title: 'x', start: 'soon', end: 'later' }, { zone })).toThrow('valid time');
    expect(() => eventBody({ title: 'x', start: '2026-11-08T10:00:00Z', end: '2026-11-08T09:00:00Z' }, { zone })).toThrow('after the start');
    expect(() => eventBody({ title: 'x', allDay: true, start: '8 Nov' }, { zone })).toThrow('valid date');
  });

  it('turns a timed event, an all-day event and a repeat into Google\'s shape', () => {
    expect(eventBody({ title: ' Lunch ', start: '2026-11-08T05:00:00.000Z', end: '2026-11-08T06:00:00.000Z', location: 'Cafe' }, { zone })).toMatchObject({
      summary: 'Lunch',
      location: 'Cafe',
      start: { dateTime: '2026-11-08T05:00:00.000Z', timeZone: zone },
      end: { dateTime: '2026-11-08T06:00:00.000Z', timeZone: zone },
    });
    // an all-day event ends the day after it starts when no end is given (Google's end date is exclusive)
    expect(eventBody({ title: 'Trip', allDay: true, start: '2026-11-30' }, { zone })).toMatchObject({ start: { date: '2026-11-30' }, end: { date: '2026-12-01' } });
    expect(eventBody({ title: 'Gym', start: '2026-11-08T05:00:00Z', end: '2026-11-08T06:00:00Z', repeat: 'weekly' }, { zone }).recurrence).toEqual(['RRULE:FREQ=WEEKLY']);
    expect(eventBody({ title: 'Gym', start: '2026-11-08T05:00:00Z', end: '2026-11-08T06:00:00Z', repeat: 'whenever' }, { zone }).recurrence).toBeUndefined();
  });

  it('changes only the words of a whole series', () => {
    const body = eventBody({ title: 'Gym', start: '2026-11-08T05:00:00Z', end: '2026-11-08T06:00:00Z', repeat: 'daily' }, { zone, series: true });
    expect(body).toEqual({ summary: 'Gym', location: '', description: '' });
  });
});

describe('connecting', () => {
  it('is off without the settings or the database', async () => {
    const off = createGoogleCalendar({ db, settings: { ...SETTINGS, clientSecret: '' }, fetchImpl: fakeFetch });
    expect(off.enabled).toBe(false);
    expect(() => off.authUrl()).toThrow('not set up');
    expect(await off.status()).toMatchObject({ enabled: false, connected: false });
    const noDb = createGoogleCalendar({ db: null, settings: SETTINGS, fetchImpl: fakeFetch });
    expect(noDb.enabled).toBe(false);
  });

  it('sends the owner to Google asking for lasting, narrow access', () => {
    const url = new URL(google.authUrl());
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('cid');
    expect(url.searchParams.get('redirect_uri')).toBe(SETTINGS.redirectUri);
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('prompt')).toBe('consent');
    expect(url.searchParams.get('scope')).toContain('calendar.events');
    expect(url.searchParams.get('scope')).not.toContain('auth/calendar ');
  });

  it('trades the code for tokens and keeps the refresh token sealed in the database', async () => {
    await signIn();
    const exchange = calls.find((call) => call.path === '/token');
    expect(exchange.body).toMatchObject({ code: 'the-code', grant_type: 'authorization_code', client_secret: 'secret', redirect_uri: SETTINGS.redirectUri });
    const { rows } = await db.query('SELECT token, email FROM google_calendar');
    expect(rows[0].token).not.toContain('refresh-1');
    expect(unseal(SETTINGS.key, rows[0].token)).toBe('refresh-1');
    expect(rows[0].email).toBe('me@example.com');
    expect(google.connected).toBe(true);
  });

  it('refuses a state it did not hand out, a tampered one, a used one and an old one', async () => {
    await expect(google.connect({ code: 'c', state: 'x.y.z' })).rejects.toThrow('expired');
    const state = new URL(google.authUrl()).searchParams.get('state');
    await expect(google.connect({ code: 'c', state: state.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')) })).rejects.toThrow('expired');
    await google.connect({ code: 'c', state });
    await expect(google.connect({ code: 'c', state })).rejects.toThrow('expired'); // only once
    const late = new URL(google.authUrl()).searchParams.get('state');
    clock += 11 * 60 * 1000;
    await expect(google.connect({ code: 'c', state: late })).rejects.toThrow('expired');
  });

  it('says so when Google gives no refresh token', async () => {
    answers['POST /token'] = { access_token: 'a', expires_in: 3600 };
    await expect(signIn()).rejects.toThrow('lasting access');
    expect(await google.isConnected()).toBe(false);
  });

  it('remembers the connection after a restart', async () => {
    await signIn();
    const again = createGoogleCalendar({ db, settings: SETTINGS, fetchImpl: fakeFetch, now: () => clock });
    expect(await again.isConnected()).toBe(true);
    // the same database with another key cannot read the token
    const stranger = createGoogleCalendar({ db, settings: { ...SETTINGS, key: 'z'.repeat(32) }, fetchImpl: fakeFetch, now: () => clock });
    expect(await stranger.isConnected()).toBe(false);
  });
});

describe('the calendars', () => {
  it('shows only the main calendar until the owner chooses more', async () => {
    await signIn();
    const status = await google.status();
    expect(status).toMatchObject({ enabled: true, connected: true, email: 'me@example.com' });
    expect(status.calendars.map((c) => [c.name, c.selected, c.writable])).toEqual([
      ['me@example.com', true, true],
      ['Work', false, true],
      ['Holidays', false, false],
    ]);
    const chosen = await google.select([WORK.id, 'not-mine@example.com', MAIN.id]);
    expect(chosen.filter((c) => c.selected).map((c) => c.id)).toEqual([MAIN.id, WORK.id]);
    expect((await google.status()).calendars.filter((c) => c.selected)).toHaveLength(2);
  });
});

describe('events', () => {
  const from = new Date('2026-11-01T00:00:00Z');
  const to = new Date('2026-11-30T00:00:00Z');

  beforeEach(signIn);

  const serve = (main, work = []) => {
    answers[`GET /calendar/v3/calendars/${encodeURIComponent(MAIN.id)}/events`] = () => reply(200, { items: main });
    answers[`GET /calendar/v3/calendars/${encodeURIComponent(WORK.id)}/events`] = () => reply(200, { items: work });
  };

  it('merges the shown calendars, soonest first, and skips cancelled events', async () => {
    serve(
      [
        { id: 'a', summary: 'Dentist', start: { dateTime: '2026-11-10T09:00:00+07:00' }, end: { dateTime: '2026-11-10T10:00:00+07:00' }, location: 'Clinic' },
        { id: 'gone', status: 'cancelled', summary: 'Cancelled', start: { dateTime: '2026-11-09T09:00:00Z' }, end: { dateTime: '2026-11-09T10:00:00Z' } },
        { id: 'trip', summary: 'Trip', start: { date: '2026-11-12' }, end: { date: '2026-11-14' } },
      ],
      [{ id: 'w', summary: 'Standup', start: { dateTime: '2026-11-10T01:30:00Z' }, end: { dateTime: '2026-11-10T01:45:00Z' } }]
    );
    await google.select([MAIN.id, WORK.id]);
    const events = await google.range(from, to);
    expect(events.map((e) => e.title)).toEqual(['Standup', 'Dentist', 'Trip']);
    expect(events[0]).toMatchObject({ calendarId: WORK.id, color: '#cc6633', writable: true, allDay: false });
    expect(events[1]).toMatchObject({ start: '2026-11-10T02:00:00.000Z', end: '2026-11-10T03:00:00.000Z', location: 'Clinic' });
    expect(events[2]).toMatchObject({ allDay: true, start: '2026-11-12', end: '2026-11-14' });
    const asked = calls.filter((c) => c.path.endsWith('/events'));
    expect(asked[0].query).toMatchObject({ singleEvents: 'true', orderBy: 'startTime', timeMin: from.toISOString() });
    expect(asked[0].headers.Authorization).toBe('Bearer access-1');
  });

  it('marks birthdays and read-only calendars as not changeable', async () => {
    serve([{ id: 'b', eventType: 'birthday', summary: 'Mai', start: { date: '2026-11-20' }, end: { date: '2026-11-21' } }, { id: 'ok', summary: 'Ok', start: { date: '2026-11-21' }, end: { date: '2026-11-22' } }]);
    const events = await google.range(from, to);
    expect(events.find((e) => e.id === 'b').writable).toBe(false);
    expect(events.find((e) => e.id === 'ok').writable).toBe(true);
  });

  it('asks Google once for the same range within a couple of minutes', async () => {
    serve([]);
    await google.range(from, to);
    await google.range(from, to);
    expect(calls.filter((c) => c.path.endsWith('/events'))).toHaveLength(1);
    clock += 3 * 60 * 1000;
    await google.range(from, to);
    expect(calls.filter((c) => c.path.endsWith('/events'))).toHaveLength(2);
  });

  it('refuses a range that is backwards or too long', async () => {
    await expect(google.range(to, from)).rejects.toThrow('from/to');
    await expect(google.range(new Date('2026-01-01'), new Date('2026-12-31'))).rejects.toThrow('too long');
  });

  it('answers the briefing in its plain shape, only what overlaps', async () => {
    serve([
      { id: 'a', summary: 'Call', start: { dateTime: '2026-11-10T09:00:00Z' }, end: { dateTime: '2026-11-10T09:30:00Z' }, location: 'Meet' },
      { id: 'b', summary: 'Later', start: { dateTime: '2026-11-10T15:00:00Z' }, end: { dateTime: '2026-11-10T16:00:00Z' } },
    ]);
    const plain = await google.between(new Date('2026-11-10T08:50:00Z'), new Date('2026-11-10T09:10:00Z'));
    expect(plain).toEqual([{ title: 'Call', start: '2026-11-10T09:00:00.000Z', end: '2026-11-10T09:30:00.000Z', allDay: false, location: 'Meet' }]);
    // a second check a minute later is answered from what is held
    await google.between(new Date('2026-11-10T08:51:00Z'), new Date('2026-11-10T09:11:00Z'));
    expect(calls.filter((c) => c.path.endsWith('/events'))).toHaveLength(1);
  });

  it('renews the access token when it runs out, and asks again once if Google cuts it short', async () => {
    serve([]);
    await google.range(from, to);
    clock += 2 * 60 * 60 * 1000; // past the hour the token lived
    answers['POST /token'] = { access_token: 'access-2', expires_in: 3600 };
    await google.range(from, new Date('2026-11-29T00:00:00Z'));
    const renewal = calls.filter((c) => c.path === '/token').at(-1);
    expect(renewal.body).toMatchObject({ grant_type: 'refresh_token', refresh_token: 'refresh-1' });
    expect(calls.filter((c) => c.path.endsWith('/events')).at(-1).headers.Authorization).toBe('Bearer access-2');

    let first = true;
    answers[`GET /calendar/v3/calendars/${encodeURIComponent(MAIN.id)}/events`] = () => {
      if (first) {
        first = false;
        return reply(401, {});
      }
      return reply(200, { items: [] });
    };
    answers['POST /token'] = { access_token: 'access-3', expires_in: 3600 };
    await expect(google.range(from, new Date('2026-11-28T00:00:00Z'))).resolves.toEqual([]);
  });

  it('forgets the connection when Google has taken the permission back', async () => {
    clock += 2 * 60 * 60 * 1000;
    answers['POST /token'] = () => reply(400, { error: 'invalid_grant' });
    await expect(google.range(from, to)).rejects.toMatchObject({ status: 409 });
    expect(await google.status()).toMatchObject({ connected: false, lost: true });
    expect((await db.query('SELECT 1 FROM google_calendar')).rows).toHaveLength(0);
  });

  it('turns a missing event into a 422, never a 404 (which the app reads as a missing route)', async () => {
    answers[`PATCH /calendar/v3/calendars/${encodeURIComponent(MAIN.id)}/events/gone`] = () => reply(404, {});
    await expect(google.update({ calendarId: MAIN.id, id: 'gone', title: 'x', start: '2026-11-10T09:00:00Z', end: '2026-11-10T10:00:00Z' })).rejects.toMatchObject({ status: 422 });
  });
});

describe('changing events', () => {
  const path = (calendar, id = '') => `/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events${id ? `/${encodeURIComponent(id)}` : ''}`;

  beforeEach(signIn);

  it('creates an event in a calendar that can be written to, with the owner\'s time zone', async () => {
    answers[`POST ${path(WORK)}`] = (request) => reply(200, { id: 'new', summary: request.body.summary, start: request.body.start, end: request.body.end });
    const result = await google.create({ calendarId: WORK.id, title: 'Review', start: '2026-11-12T03:00:00.000Z', end: '2026-11-12T04:00:00.000Z', timeZone: 'Europe/Paris', repeat: 'weekly' });
    const sent = calls.find((c) => c.method === 'POST' && c.path.endsWith('/events'));
    expect(sent.body).toMatchObject({ summary: 'Review', start: { timeZone: 'Europe/Paris' }, recurrence: ['RRULE:FREQ=WEEKLY'] });
    expect(result.event).toMatchObject({ id: 'new', title: 'Review', calendarId: WORK.id });
  });

  it('falls back to the server\'s zone for one it does not know', async () => {
    answers[`POST ${path(MAIN)}`] = { id: 'n', summary: 'x', start: { dateTime: '2026-11-12T03:00:00Z' }, end: { dateTime: '2026-11-12T04:00:00Z' } };
    await google.create({ calendarId: MAIN.id, title: 'x', start: '2026-11-12T03:00:00Z', end: '2026-11-12T04:00:00Z', timeZone: 'Mars/Olympus' });
    expect(calls.find((c) => c.method === 'POST' && c.path.endsWith('/events')).body.start.timeZone).toBe('Asia/Ho_Chi_Minh');
  });

  it('refuses a read-only calendar and one that is not in the account', async () => {
    await expect(google.create({ calendarId: HOLIDAYS.id, title: 'x', start: '2026-11-12T03:00:00Z', end: '2026-11-12T04:00:00Z' })).rejects.toMatchObject({ status: 403 });
    await expect(google.create({ calendarId: 'stranger@example.com', title: 'x', start: '2026-11-12T03:00:00Z', end: '2026-11-12T04:00:00Z' })).rejects.toMatchObject({ status: 400 });
  });

  it('updates one day of a repeating event, or the words of the whole series', async () => {
    answers[`PATCH ${path(MAIN, 'abc_20261110')}`] = { id: 'abc_20261110', summary: 'Moved', start: { dateTime: '2026-11-10T04:00:00Z' }, end: { dateTime: '2026-11-10T05:00:00Z' } };
    answers[`PATCH ${path(MAIN, 'abc')}`] = { id: 'abc', summary: 'Renamed', start: { dateTime: '2026-11-03T04:00:00Z' }, end: { dateTime: '2026-11-03T05:00:00Z' } };
    await google.update({ calendarId: MAIN.id, id: 'abc_20261110', recurringId: 'abc', title: 'Moved', start: '2026-11-10T04:00:00Z', end: '2026-11-10T05:00:00Z' });
    await google.update({ calendarId: MAIN.id, id: 'abc_20261110', recurringId: 'abc', series: true, title: 'Renamed', start: '2026-11-10T04:00:00Z', end: '2026-11-10T05:00:00Z' });
    const patches = calls.filter((c) => c.method === 'PATCH');
    expect(patches[0].path).toContain('abc_20261110');
    expect(patches[0].body.start).toBeDefined();
    expect(patches[1].path.endsWith('/abc')).toBe(true);
    expect(patches[1].body.start).toBeUndefined(); // moving a day must not move the series
  });

  it('deletes an event, or a whole series', async () => {
    answers[`DELETE ${path(MAIN, 'e1')}`] = () => reply(204, {});
    answers[`DELETE ${path(MAIN, 'abc')}`] = () => reply(204, {});
    expect(await google.remove({ calendarId: MAIN.id, id: 'e1' })).toEqual({ deleted: true });
    await google.remove({ calendarId: MAIN.id, id: 'abc_20261110', recurringId: 'abc', series: true });
    expect(calls.filter((c) => c.method === 'DELETE').map((c) => c.path.split('/').pop())).toEqual(['e1', 'abc']);
    await expect(google.remove({ calendarId: MAIN.id, id: '../../etc' })).rejects.toThrow('not an event');
  });

  it('forgets held events after a change, so the next look is fresh', async () => {
    const list = `GET ${path(MAIN)}`;
    answers[list] = () => reply(200, { items: [] });
    const from = new Date('2026-11-01T00:00:00Z');
    const to = new Date('2026-11-30T00:00:00Z');
    await google.range(from, to);
    answers[`POST ${path(MAIN)}`] = { id: 'n', summary: 'x', start: { dateTime: '2026-11-12T03:00:00Z' }, end: { dateTime: '2026-11-12T04:00:00Z' } };
    await google.create({ calendarId: MAIN.id, title: 'x', start: '2026-11-12T03:00:00Z', end: '2026-11-12T04:00:00Z' });
    await google.range(from, to);
    expect(calls.filter((c) => c.method === 'GET' && c.path.endsWith('/events'))).toHaveLength(2);
  });
});

describe('disconnecting', () => {
  it('takes the permission back at Google and forgets the token', async () => {
    await signIn();
    expect(await google.disconnect()).toEqual({ connected: false });
    expect(calls.some((c) => c.path === '/revoke' && c.query.token === 'refresh-1')).toBe(true);
    expect((await db.query('SELECT 1 FROM google_calendar')).rows).toHaveLength(0);
    expect(await google.status()).toMatchObject({ enabled: true, connected: false, lost: false });
    await expect(google.range(new Date('2026-11-01'), new Date('2026-11-02'))).rejects.toMatchObject({ status: 409 });
  });
});
