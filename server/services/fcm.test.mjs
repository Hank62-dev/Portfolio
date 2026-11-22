import { generateKeyPairSync } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import { createFcm, fcmMessage, parseServiceAccount } from './fcm.mjs';
import { createPush } from './push.mjs';
import { createSync } from './sync.mjs';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const ACCOUNT = { project_id: 'demo-project', client_email: 'push@demo-project.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
const TOKEN = 'device-token:' + 'x'.repeat(40);

/** A stand-in for Google: hands out an access token and records each message, or refuses as told. */
const google = ({ refuse } = {}) => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (url.includes('oauth2')) return { ok: true, json: async () => ({ access_token: 'access-1', expires_in: 3600 }) };
    if (refuse) return { ok: false, status: refuse.status, json: async () => ({ error: { status: refuse.code, details: [{ errorCode: refuse.code }] } }) };
    return { ok: true, json: async () => ({ name: 'projects/demo-project/messages/1' }) };
  };
  return { calls, fetchImpl };
};

describe('the service account', () => {
  it('is read as JSON or base64, and anything else is no account', () => {
    const json = JSON.stringify(ACCOUNT);
    expect(parseServiceAccount(json).project_id).toBe('demo-project');
    expect(parseServiceAccount(Buffer.from(json).toString('base64')).client_email).toBe(ACCOUNT.client_email);
    expect(parseServiceAccount('{"project_id":"x"}')).toBeNull();
    expect(parseServiceAccount('')).toBeNull();
    expect(createFcm({ account: null }).enabled).toBe(false);
  });
});

describe('a message', () => {
  it('is shown by Android, replaces the same occasion and carries where to go as strings', () => {
    const { message } = fcmMessage(TOKEN, { title: 'Read', body: 'Tonight', tab: 'habits', kind: 'habits', key: 'habits:2026-11-06' });
    expect(message.token).toBe(TOKEN);
    expect(message.notification).toEqual({ title: 'Read', body: 'Tonight' });
    expect(message.data).toEqual({ tab: 'habits', kind: 'habits', key: 'habits:2026-11-06' });
    expect(message.android.notification).toMatchObject({ channel_id: 'reminders', tag: 'habits:2026-11-06' });
  });
});

describe('sending', () => {
  it('signs in once and sends to the project', async () => {
    const g = google();
    const fcm = createFcm({ account: ACCOUNT, fetchImpl: g.fetchImpl });
    await fcm.send(TOKEN, { title: 'One' });
    await fcm.send(TOKEN, { title: 'Two' });
    expect(g.calls.filter((c) => c.url.includes('oauth2'))).toHaveLength(1);
    const sends = g.calls.filter((c) => c.url.includes('messages:send'));
    expect(sends[0].url).toBe('https://fcm.googleapis.com/v1/projects/demo-project/messages:send');
    expect(sends[0].init.headers.authorization).toBe('Bearer access-1');
    // the token sent to Google is a signed JWT with the account as issuer
    const assertion = new URLSearchParams(g.calls[0].init.body.toString()).get('assertion');
    expect(JSON.parse(Buffer.from(assertion.split('.')[1], 'base64url').toString()).iss).toBe(ACCOUNT.client_email);
  });

  it('says a token is gone (404) only when FCM says so', async () => {
    const gone = createFcm({ account: ACCOUNT, fetchImpl: google({ refuse: { status: 404, code: 'UNREGISTERED' } }).fetchImpl });
    await expect(gone.send(TOKEN, { title: 'x' })).rejects.toMatchObject({ statusCode: 404 });
    const bad = createFcm({ account: ACCOUNT, fetchImpl: google({ refuse: { status: 400, code: 'INVALID_ARGUMENT' } }).fetchImpl });
    await expect(bad.send(TOKEN, { title: 'x' })).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('push to the Android app', () => {
  const setup = async ({ refuse, vapid } = {}) => {
    const db = new PGlite();
    const sync = createSync({ db });
    const g = google({ refuse });
    const web = [];
    const push = createPush({
      db,
      sync,
      calendar: { configured: false },
      vapid: vapid ?? { publicKey: '', privateKey: '', subject: '' },
      fcm: createFcm({ account: ACCOUNT, fetchImpl: g.fetchImpl }),
      now: () => Date.UTC(2026, 10, 6, 14, 30), // 21:30 in Ho Chi Minh City
      send: async (sub, payload) => web.push(JSON.parse(payload)),
    });
    await push.init();
    return { db, sync, push, g, web };
  };
  const sent = (g) => g.calls.filter((c) => c.url.includes('messages:send')).map((c) => JSON.parse(c.init.body).message);

  it('works with FCM alone, takes an app token and refuses a web subscription', async () => {
    const { push } = await setup();
    expect(push.enabled).toBe(true);
    expect(push.appEnabled).toBe(true);
    expect(push.webEnabled).toBe(false);
    expect(await push.subscribe({ fcm: TOKEN, kinds: {}, lang: 'vi' })).toEqual({ subscribed: true });
    await expect(push.subscribe({ fcm: 'not a token' })).rejects.toThrow('app token');
    await expect(push.subscribe({ subscription: { endpoint: 'https://push.example/a', keys: { p256dh: 'p'.repeat(20), auth: 'a'.repeat(10) } } })).rejects.toThrow('Web Push is not set up');
  });

  it('sends the due reminders through FCM, in the device’s language', async () => {
    const { push, sync, g } = await setup();
    await push.subscribe({ fcm: TOKEN, kinds: {}, lang: 'vi' });
    await sync.push([{ store: 'habits', id: 'h1', doc: { id: 'h1', name: 'Read', days: [] }, updatedAt: 1 }]);
    await push.tick();
    const messages = sent(g);
    expect(messages.map((m) => m.data.kind)).toContain('habits');
    expect(messages.every((m) => m.token === TOKEN)).toBe(true);
    expect(messages.find((m) => m.data.kind === 'habits').notification.title).not.toMatch(/still to do/); // told in Vietnamese
  });

  it('sends to browsers and the app side by side, and forgets an app FCM says is gone', async () => {
    const { push, sync, g, web, db } = await setup({ refuse: { status: 404, code: 'UNREGISTERED' }, vapid: { publicKey: 'pub', privateKey: 'priv', subject: 'mailto:a@example.com' } });
    await push.subscribe({ fcm: TOKEN, kinds: {}, lang: 'en' });
    await push.subscribe({ subscription: { endpoint: 'https://push.example/a', keys: { p256dh: 'p'.repeat(20), auth: 'a'.repeat(10) } }, kinds: {}, lang: 'en' });
    await sync.push([{ store: 'habits', id: 'h1', doc: { id: 'h1', name: 'Read', days: [] }, updatedAt: 1 }]);
    await push.tick();
    expect(web.length).toBeGreaterThan(0);
    expect(sent(g).length).toBeGreaterThan(0);
    const left = (await db.query(`SELECT channel FROM push_subs`)).rows.map((r) => r.channel);
    expect(left).toEqual(['web']);
  });
});
