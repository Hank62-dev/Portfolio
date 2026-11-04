import { describe, expect, it, vi } from 'vitest';
import { createAi } from './ai.mjs';
import { createDiscord, parseWebhooks } from './discord.mjs';

const HOOK = 'https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz-_ABCDEFGH';
const geminiReply = (value) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: typeof value === 'string' ? value : JSON.stringify(value) }] } }] }) });
const aiConfig = (extra = {}) => ({ geminiBase: 'https://gemini.test/v1beta', geminiKey: 'k', textModel: 't', imageModel: 'i', hfToken: '', hfImageModel: 'm', dailyLimit: 20, ...extra });

describe('the Discord webhooks that are set up', () => {
  it('reads one default webhook and a JSON list of named ones', () => {
    const found = parseWebhooks({ DISCORD_WEBHOOK_URL: HOOK, DISCORD_WEBHOOKS: JSON.stringify({ 'dev-log': HOOK.replace('1234', '9999') }) });
    expect(Object.keys(found)).toEqual(['main', 'dev-log']);
  });
  it('ignores anything that is not a Discord webhook address', () => {
    expect(parseWebhooks({ DISCORD_WEBHOOK_URL: 'https://evil.example/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz' })).toEqual({});
    expect(parseWebhooks({ DISCORD_WEBHOOK_URL: 'http://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz' })).toEqual({});
    expect(parseWebhooks({ DISCORD_WEBHOOKS: '{"bad name!":"x"}' })).toEqual({});
    expect(parseWebhooks({ DISCORD_WEBHOOKS: 'not json' })).toEqual({});
    expect(parseWebhooks({})).toEqual({});
  });
});

describe('posting to Discord', () => {
  const ok = () => vi.fn().mockResolvedValue({ ok: true, status: 204, headers: new Headers() });

  it('posts one message with every mention switched off', async () => {
    const fetchImpl = ok();
    const discord = createDiscord({ webhooks: { main: HOOK }, fetchImpl });
    const result = await discord.post({ content: '  New video is up @everyone  ' });
    expect(result.ok).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url.startsWith(HOOK)).toBe(true);
    expect(JSON.parse(init.body)).toEqual({ content: 'New video is up @everyone', allowed_mentions: { parse: [] } });
  });

  it('says it is not set up, and never shows the address', async () => {
    const none = createDiscord({ webhooks: {}, fetchImpl: ok() });
    await expect(none.post({ content: 'hi' })).rejects.toMatchObject({ status: 503 });
    expect(none.channels()).toEqual({ configured: false, channels: [], perHour: 20, left: 20 });
    const some = createDiscord({ webhooks: { main: HOOK } });
    expect(JSON.stringify(some.channels())).not.toContain('webhooks/');
    await expect(some.post({ channel: 'other', content: 'hi' })).rejects.toMatchObject({ status: 503 });
  });

  it('refuses an empty or over-long message', async () => {
    const discord = createDiscord({ webhooks: { main: HOOK }, fetchImpl: ok() });
    await expect(discord.post({ content: '   ' })).rejects.toMatchObject({ status: 400 });
    await expect(discord.post({ content: 'x'.repeat(1901) })).rejects.toMatchObject({ status: 400 });
  });

  it('holds back after the hourly cap and lets go an hour later', async () => {
    let clock = 0;
    const discord = createDiscord({ webhooks: { main: HOOK }, fetchImpl: ok(), now: () => clock, perHour: 2 });
    await discord.post({ content: 'one' });
    await discord.post({ content: 'two' });
    await expect(discord.post({ content: 'three' })).rejects.toMatchObject({ status: 429 });
    clock = 60 * 60 * 1000 + 1;
    await expect(discord.post({ content: 'three' })).resolves.toMatchObject({ ok: true });
  });

  it('passes on a slow-down from Discord, and explains a webhook that is gone', async () => {
    const slow = vi.fn().mockResolvedValue({ ok: false, status: 429, headers: new Headers({ 'retry-after': '3' }) });
    await expect(createDiscord({ webhooks: { main: HOOK }, fetchImpl: slow }).post({ content: 'hi' })).rejects.toMatchObject({ status: 429, message: expect.stringContaining('3 seconds') });
    const gone = vi.fn().mockResolvedValue({ ok: false, status: 404, headers: new Headers() });
    await expect(createDiscord({ webhooks: { main: HOOK }, fetchImpl: gone }).post({ content: 'hi' })).rejects.toMatchObject({ status: 502, message: expect.stringContaining('refused') });
    const down = vi.fn().mockRejectedValue(new Error('offline'));
    await expect(createDiscord({ webhooks: { main: HOOK }, fetchImpl: down }).post({ content: 'hi' })).rejects.toMatchObject({ status: 502 });
  });

  it('does not count a failed post against the cap', async () => {
    const discord = createDiscord({ webhooks: { main: HOOK }, fetchImpl: vi.fn().mockResolvedValue({ ok: false, status: 500, headers: new Headers() }), perHour: 1 });
    await expect(discord.post({ content: 'a' })).rejects.toMatchObject({ status: 502 });
    expect(discord.channels().left).toBe(1);
  });
});

describe('a content pack', () => {
  const pack = {
    hooks: [{ text: 'Why your bot keeps crashing at 3am', formula: 'curiosity' }, { text: 'x'.repeat(300), formula: 'number' }, { text: '' }, 'A plain string hook', { text: 'e' }, { text: 'f' }, { text: 'seventh is cut' }],
    script: { title: 'Fix it', beats: [{ at: '0-3s', say: 'Hook line', show: 'face' }, { at: '3-10s', say: '' }, { at: '10-20s', say: 'Do this [your number]', show: 'screen' }], cta: 'Follow for more' },
    caption: 'A caption',
    hashtags: ['#discordbot', 'discordbot', 'dev tips', '#', ''],
    discord: 'Hey everyone!\nNew video',
    thread: ['one', 'two', '', 'three'],
  };

  it('is cleaned up: six hooks at most, short, no empty beats, tidy hashtags', async () => {
    const ai = createAi({ ai: aiConfig(), fetchImpl: vi.fn().mockResolvedValue(geminiReply(pack)) });
    const result = await ai.content({ topic: 'Why Discord bots crash', niche: 'dev', language: 'vi', seconds: 45 });
    expect(result.hooks).toHaveLength(6);
    expect(result.hooks.every((h) => h.text && h.text.length <= 160)).toBe(true);
    expect(result.hooks[2].text).toBe('A plain string hook');
    expect(result.script.beats.map((b) => b.say)).toEqual(['Hook line', 'Do this [your number]']);
    expect(result.hashtags).toEqual(['discordbot', 'devtips']);
    expect(result.discord).toContain('\n');
    expect(result.thread).toEqual(['one', 'two', 'three']);
  });

  it('asks for the right language and length, and forbids income claims', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(geminiReply(pack));
    await createAi({ ai: aiConfig(), fetchImpl }).content({ topic: 'a topic', language: 'en', seconds: 60 });
    const prompt = JSON.parse(fetchImpl.mock.calls[0][1].body).contents[0].parts[0].text;
    expect(prompt).toContain('English');
    expect(prompt).toContain('about 60 seconds');
    expect(prompt).toMatch(/never promise income/i);
    expect(prompt).toContain('[like this]');
  });

  it('needs a topic, and reports a pack that came back empty or broken', async () => {
    await expect(createAi({ ai: aiConfig(), fetchImpl: vi.fn() }).content({ topic: ' ' })).rejects.toMatchObject({ status: 400 });
    await expect(createAi({ ai: aiConfig(), fetchImpl: vi.fn().mockResolvedValue(geminiReply({ hooks: [], script: { beats: [] } })) }).content({ topic: 'abc' })).rejects.toMatchObject({ status: 502 });
    await expect(createAi({ ai: aiConfig(), fetchImpl: vi.fn().mockResolvedValue(geminiReply('nope')) }).content({ topic: 'abc' })).rejects.toMatchObject({ status: 502 });
  });
});

describe('a pitch', () => {
  it('returns a subject and a message, trimmed', async () => {
    const ai = createAi({ ai: aiConfig(), fetchImpl: vi.fn().mockResolvedValue(geminiReply({ subject: 'Hello', message: 'Hi [name],\n\nI would like to…' })) });
    expect(await ai.pitch({ kind: 'sponsor', who: 'Acme', offer: 'a video' })).toEqual({ subject: 'Hello', message: 'Hi [name],\n\nI would like to…' });
  });
  it('needs a name and an offer, and a message back', async () => {
    const ai = createAi({ ai: aiConfig(), fetchImpl: vi.fn().mockResolvedValue(geminiReply({ subject: 'x' })) });
    await expect(ai.pitch({ kind: 'client', who: '', offer: 'x' })).rejects.toMatchObject({ status: 400 });
    await expect(ai.pitch({ kind: 'client', who: 'x', offer: 'y' })).rejects.toMatchObject({ status: 502 });
  });
});

describe('a Gemini text model whose quota is spent', () => {
  const spent = (seconds = 11808) => ({ ok: false, status: 429, json: async () => ({ error: { code: 429, details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: `${seconds}s` }] } }) });
  const busy = { ok: false, status: 503, json: async () => ({}) };
  const modelOf = (call) => /models\/([^:]+):/.exec(call[0])[1];
  const withSpare = (extra = {}) => aiConfig({ textFallbackModel: 'lite', ...extra });

  it('hands the question to the lighter model at once, for the price of one unit', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(spent()).mockResolvedValueOnce(geminiReply('A note.'));
    const sleep = vi.fn();
    const ai = createAi({ ai: withSpare(), fetchImpl, sleep });
    await expect(ai.note({ context: {}, language: 'en' })).resolves.toEqual({ text: 'A note.' });
    expect(fetchImpl.mock.calls.map(modelOf)).toEqual(['t', 'lite']);
    expect(sleep).not.toHaveBeenCalled();
    expect(ai.usage().used).toBe(1);
  });

  it('leaves the spent model alone until it says it is back', async () => {
    let clock = 1_000_000;
    const fetchImpl = vi.fn().mockResolvedValueOnce(spent(600)).mockResolvedValue(geminiReply('A note.'));
    const ai = createAi({ ai: withSpare(), fetchImpl, now: () => clock });
    await ai.note({ context: {}, language: 'en' });
    await ai.note({ context: {}, language: 'en' });
    expect(fetchImpl.mock.calls.map(modelOf)).toEqual(['t', 'lite', 'lite']);
    clock += 601_000;
    await ai.note({ context: {}, language: 'en' });
    expect(modelOf(fetchImpl.mock.calls[3])).toBe('t');
  });

  it('also takes over when the main model stays overloaded', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(busy).mockResolvedValueOnce(busy).mockResolvedValueOnce(busy).mockResolvedValueOnce(geminiReply('A note.'));
    const ai = createAi({ ai: withSpare(), fetchImpl, sleep: vi.fn().mockResolvedValue() });
    await expect(ai.note({ context: {}, language: 'en' })).resolves.toEqual({ text: 'A note.' });
    expect(fetchImpl.mock.calls.map(modelOf)).toEqual(['t', 't', 't', 'lite']);
  });

  it('says the quota is reached when there is no stand-in, or the stand-in is spent too', async () => {
    const alone = createAi({ ai: aiConfig(), fetchImpl: vi.fn().mockResolvedValue(spent()) });
    await expect(alone.note({ context: {} })).rejects.toMatchObject({ status: 429 });
    const both = createAi({ ai: withSpare(), fetchImpl: vi.fn().mockResolvedValue(spent()) });
    await expect(both.note({ context: {} })).rejects.toMatchObject({ status: 429 });
  });

  it('does not swap the image model', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(spent());
    const ai = createAi({ ai: withSpare(), fetchImpl });
    await expect(ai.image({ prompt: 'a lighthouse' })).rejects.toMatchObject({ status: 429 });
    expect(fetchImpl.mock.calls.map(modelOf)).toEqual(['i']);
  });
});

describe('an overloaded Gemini', () => {
  const busy = { ok: false, status: 503, json: async () => ({}) };

  it('is asked again after a pause and succeeds on the second try, costing one unit of the budget', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(busy).mockResolvedValueOnce(geminiReply('A note.'));
    const sleep = vi.fn().mockResolvedValue();
    const ai = createAi({ ai: aiConfig(), fetchImpl, sleep });
    await expect(ai.note({ context: {}, language: 'en' })).resolves.toEqual({ text: 'A note.' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1200);
    expect(ai.usage().used).toBe(1);
  });

  it('gives up after three tries with a plain message', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(busy);
    const ai = createAi({ ai: aiConfig(), fetchImpl, sleep: vi.fn().mockResolvedValue() });
    await expect(ai.note({ context: {} })).rejects.toMatchObject({ status: 502 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('does not retry a refusal such as a bad key', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) });
    const sleep = vi.fn();
    await expect(createAi({ ai: aiConfig(), fetchImpl, sleep }).note({ context: {} })).rejects.toMatchObject({ status: 502 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
