import { HttpError } from '../http/http.mjs';

// Posting to the owner's OWN Discord server through a webhook (Discord's supported way for an app to post; no bot or user token,
// no automation of an account). The webhook address is a secret, so it lives on the server and the page only ever sees the
// channel's name. Guards: owner-only, one message at a time, no mentions can ping anyone, and a small hourly cap.

const WEBHOOK = /^https:\/\/(?:ptb\.|canary\.)?(?:discord|discordapp)\.com\/api\/webhooks\/\d{15,25}\/[\w-]{20,120}$/;
const MAX_CONTENT = 1900; // Discord allows 2000
const HOUR = 60 * 60 * 1000;

/** The webhooks that are set up, as { name: url }: DISCORD_WEBHOOK_URL (named "main") and DISCORD_WEBHOOKS ('{"dev-log":"https://…"}'). Pure. */
export const parseWebhooks = (env = {}) => {
  const found = {};
  if (env.DISCORD_WEBHOOK_URL && WEBHOOK.test(env.DISCORD_WEBHOOK_URL.trim())) found.main = env.DISCORD_WEBHOOK_URL.trim();
  try {
    const extra = JSON.parse(env.DISCORD_WEBHOOKS || '{}');
    if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
      for (const [name, url] of Object.entries(extra)) {
        if (/^[\w-]{1,32}$/.test(name) && typeof url === 'string' && WEBHOOK.test(url.trim())) found[name] = url.trim();
      }
    }
  } catch {
    /* a bad JSON value just means no extra channels */
  }
  return found;
};

export const createDiscord = ({ webhooks = {}, fetchImpl = fetch, now = Date.now, perHour = 20 } = {}) => {
  let sent = [];

  const recent = () => {
    sent = sent.filter((t) => now() - t < HOUR);
    return sent;
  };

  const channels = () => ({ configured: Object.keys(webhooks).length > 0, channels: Object.keys(webhooks), perHour, left: Math.max(0, perHour - recent().length) });

  /** Posts a message to a named channel. Returns { ok: true, left }. */
  const post = async ({ channel = 'main', content }) => {
    const url = webhooks[channel];
    if (!url) throw new HttpError(503, Object.keys(webhooks).length ? 'That Discord channel is not set up.' : 'Discord is not configured: set DISCORD_WEBHOOK_URL on the server.');
    const text = String(content ?? '').trim();
    if (!text) throw new HttpError(400, 'Write something to post.');
    if (text.length > MAX_CONTENT) throw new HttpError(400, `That is too long for Discord (${MAX_CONTENT} characters at most).`);
    if (recent().length >= perHour) throw new HttpError(429, `That is ${perHour} posts in the last hour. Wait a little before posting again.`);

    let response;
    try {
      response = await fetchImpl(`${url}?wait=false`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // an empty parse list: nothing in the text (@everyone, @here, a role or a user) can ping anybody
        body: JSON.stringify({ content: text, allowed_mentions: { parse: [] } }),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new HttpError(502, 'Discord is unreachable right now.');
    }
    if (response.status === 429) {
      const wait = Number(response.headers?.get?.('retry-after')) || 5;
      throw new HttpError(429, `Discord asked to slow down. Try again in about ${Math.ceil(wait)} seconds.`);
    }
    if (response.status === 401 || response.status === 403 || response.status === 404) throw new HttpError(502, 'Discord refused the webhook (it may have been deleted). Make a new one and update the server.');
    if (!response.ok) throw new HttpError(502, 'Discord could not take the message right now.');
    sent.push(now());
    return { ok: true, left: Math.max(0, perHour - sent.length) };
  };

  return { channels, post };
};
