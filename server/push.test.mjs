import { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPush, parseSubscription } from './push.mjs';
import { createSync } from './sync.mjs';

// A real Postgres (in-process) so the SQL that reads the owner's data is what is tested; the push service is a fake.
const VAPID = { publicKey: 'pub', privateKey: 'priv', subject: 'mailto:me@example.com' };
const SUB = { endpoint: 'https://push.example/abc', keys: { p256dh: 'p'.repeat(20), auth: 'a'.repeat(10) } };

// 2026-11-06 21:30 in Ho Chi Minh City is 14:30 UTC: a server on UTC must still see an evening there
const EVENING = Date.UTC(2026, 10, 6, 14, 30);

let db;
let sync;
let sent;
let gone;
let clock;
let push;

const doc = (store, id, fields) => ({ store, id, doc: { id, ...fields }, updatedAt: 1 });

beforeEach(async () => {
  db = new PGlite();
  sync = createSync({ db });
  sent = [];
  gone = new Set();
  clock = EVENING;
  push = createPush({
    db,
    sync,
    calendar: { configured: false },
    vapid: VAPID,
    zone: 'Asia/Ho_Chi_Minh',
    now: () => clock,
    send: async (subscription, payload) => {
      if (gone.has(subscription.endpoint)) throw Object.assign(new Error('gone'), { statusCode: 410 });
      sent.push({ endpoint: subscription.endpoint, ...JSON.parse(payload) });
    },
  });
  await push.init();
});

describe('subscriptions', () => {
  it('accepts a real subscription and refuses nonsense', () => {
    expect(parseSubscription(SUB).endpoint).toBe(SUB.endpoint);
    expect(() => parseSubscription({ endpoint: 'http://insecure', keys: SUB.keys })).toThrow('push subscription');
    expect(() => parseSubscription({ endpoint: SUB.endpoint, keys: {} })).toThrow('push subscription');
    expect(() => parseSubscription(null)).toThrow('push subscription');
  });

  it('is off without keys or a database', async () => {
    const off = createPush({ db, sync, vapid: { publicKey: '', privateKey: '', subject: '' } });
    expect(off.enabled).toBe(false);
    await expect(off.subscribe({ subscription: SUB })).rejects.toThrow('Push is not set up');
    expect(await off.tick()).toEqual({ sent: 0 });
  });

  it('keeps one row per device and forgets it on request', async () => {
    await push.subscribe({ subscription: SUB, kinds: { wallet: false } });
    await push.subscribe({ subscription: SUB, kinds: { wallet: true } });
    expect((await db.query('SELECT kinds FROM push_subs')).rows).toEqual([{ kinds: { wallet: true } }]);
    await push.unsubscribe(SUB.endpoint);
    expect((await db.query('SELECT 1 FROM push_subs')).rows).toHaveLength(0);
  });
});

describe('what is due', () => {
  it('sends the evening reminders once, whatever the server clock says', async () => {
    await push.subscribe({ subscription: SUB });
    await sync.push([
      doc('habits', 'h1', { name: 'Read', days: [] }),
      doc('habits', 'h2', { name: 'Run', days: ['2026-11-06'] }),
      doc('tasks', 't1', { title: 'Report', column: 'doing', due: '2026-11-06' }),
      doc('tasks', 't2', { title: 'Old', column: 'done', due: '2026-11-01' }),
      doc('cards', 'c1', { due: EVENING - 1000 }),
      doc('cards', 'c2', { due: EVENING + 86400000 }),
      doc('notes', 'n1', { text: 'x', day: '2026-11-05' }),
    ]);
    const first = await push.tick();
    const titles = sent.map((n) => n.title).sort();
    expect(titles).toEqual(['1 flashcard due', '1 habit still to do today', 'Write today’s page?', '“Report” is due today'].sort());
    expect(first.sent).toBe(4);

    sent.length = 0;
    clock += 5 * 60 * 1000;
    expect(await push.tick()).toEqual({ sent: 0 }); // the same occasions are not sent again
    expect(sent).toHaveLength(0);
  });

  it('skips the diary nudge when today already has a page, and the habits when all are done', async () => {
    await push.subscribe({ subscription: SUB });
    await sync.push([doc('habits', 'h1', { name: 'Read', days: ['2026-11-06'] }), doc('notes', 'n1', { text: 'x', day: '2026-11-06' })]);
    await push.tick();
    expect(sent).toHaveLength(0);
  });

  it('warns about a budget from this month’s spending', async () => {
    await push.subscribe({ subscription: SUB });
    await sync.push([
      doc('budgets', 'food', { category: 'food', amount: 1000000 }),
      doc('expenses', 'e1', { type: 'expense', category: 'food', amount: 900000, at: EVENING - 3600000 }),
      doc('expenses', 'e2', { type: 'expense', category: 'food', amount: 900000, at: EVENING - 40 * 86400000 }), // last month
      doc('notes', 'n1', { text: 'x', day: '2026-11-06' }),
    ]);
    await push.tick();
    expect(sent.map((n) => n.title)).toEqual(['Food & drink budget is 80% used']);
  });

  it('only sends the kinds a device asked for', async () => {
    await push.subscribe({ subscription: SUB, kinds: { habits: false } });
    await sync.push([doc('habits', 'h1', { name: 'Read', days: [] }), doc('notes', 'n1', { text: 'x', day: '2026-11-06' })]);
    await push.tick();
    expect(sent).toHaveLength(0);
  });

  it('announces a calendar event that starts soon', async () => {
    const start = new Date(EVENING + 10 * 60 * 1000).toISOString();
    const calendar = { configured: true, between: async () => ({ events: [{ title: 'PRN212', start, end: start, allDay: false, location: 'A2' }] }) };
    const withCalendar = createPush({ db, sync, calendar, vapid: VAPID, zone: 'Asia/Ho_Chi_Minh', now: () => clock, send: async (s, p) => void sent.push(JSON.parse(p)) });
    await withCalendar.subscribe({ subscription: SUB });
    await sync.push([doc('notes', 'n1', { text: 'x', day: '2026-11-06' })]);
    await withCalendar.tick();
    expect(sent).toMatchObject([{ title: 'PRN212 starts in 10 min', body: '21:40 · A2', kind: 'calendar' }]);
  });
});

describe('asking the database', () => {
  // a free database sleeps when nobody asks, and each question wakes it: between changes the check must not ask at all
  it('stays quiet while nothing changed, and reads again when the data is written', async () => {
    await push.subscribe({ subscription: SUB });
    await sync.push([doc('habits', 'h1', { name: 'Read', days: [] }), doc('notes', 'n1', { text: 'x', day: '2026-11-06' })]);
    await push.tick();
    expect(sent).toHaveLength(1);

    const asked = vi.spyOn(db, 'query');
    for (let minute = 1; minute <= 10; minute += 1) {
      clock += 60 * 1000;
      await push.tick();
    }
    expect(asked).not.toHaveBeenCalled();

    await sync.push([doc('cards', 'c1', { due: EVENING - 1000 })]);
    asked.mockClear();
    clock += 60 * 1000;
    await push.tick();
    expect(asked).toHaveBeenCalled();
    expect(sent.map((n) => n.title)).toContain('1 flashcard due');
  });

  it('notices a flashcard whose time comes while the data stays the same', async () => {
    await push.subscribe({ subscription: SUB });
    await sync.push([doc('cards', 'c1', { due: EVENING + 10 * 60 * 1000 }), doc('notes', 'n1', { text: 'x', day: '2026-11-06' })]);
    await push.tick();
    expect(sent).toHaveLength(0);
    clock += 11 * 60 * 1000;
    await push.tick();
    expect(sent.map((n) => n.title)).toEqual(['1 flashcard due']);
  });

  it('picks up a device that arrives later', async () => {
    await sync.push([doc('cards', 'c1', { due: EVENING - 1000 }), doc('notes', 'n1', { text: 'x', day: '2026-11-06' })]);
    expect(await push.tick()).toEqual({ sent: 0 }); // nobody to tell yet
    await push.subscribe({ subscription: SUB });
    clock += 60 * 1000;
    await push.tick();
    expect(sent.map((n) => n.title)).toEqual(['1 flashcard due']);
  });
});

describe('language', () => {
  it('tells each device in its own language', async () => {
    await push.subscribe({ subscription: SUB, lang: 'vi' });
    await push.subscribe({ subscription: { ...SUB, endpoint: 'https://push.example/en' }, lang: 'en' });
    await sync.push([doc('cards', 'c1', { due: EVENING - 1000 }), doc('notes', 'n1', { text: 'x', day: '2026-11-06' })]);
    await push.tick();
    const byDevice = Object.fromEntries(sent.map((n) => [n.endpoint, n.title]));
    expect(byDevice).toEqual({ [SUB.endpoint]: '1 thẻ ôn đến hạn', 'https://push.example/en': '1 flashcard due' });
  });
});

describe('devices that went away', () => {
  it('forgets a subscription the push service says is gone', async () => {
    await push.subscribe({ subscription: SUB });
    gone.add(SUB.endpoint);
    expect((await push.sendTest()).sent).toBe(0);
    expect((await db.query('SELECT 1 FROM push_subs')).rows).toHaveLength(0);
  });

  it('sends a test to every device', async () => {
    await push.subscribe({ subscription: SUB });
    await push.subscribe({ subscription: { ...SUB, endpoint: 'https://push.example/def' } });
    expect((await push.sendTest()).sent).toBe(2);
  });
});
