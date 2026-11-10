import { tr } from '../lang';
import { spacehankConfig } from '../config';
import { refreshSession } from './realtime';
import { isDemo } from '../demo/mode';
import * as demo from '../demo/mock';

const { realtimeApiUrl } = spacehankConfig;

// Owner-only helpers on the realtime server (AI and calendar). The session cookie authorises them.
const send = (path, method, body, raw) =>
  fetch(`${realtimeApiUrl}${path}`, {
    method,
    credentials: 'include',
    headers: raw ? { 'Content-Type': raw } : body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: raw ? body : body === undefined ? undefined : JSON.stringify(body),
  });

// `raw`: the content type of a body that is sent as it is (a recording) instead of as JSON
const call = async (path, { method = 'GET', body, raw } = {}) => {
  let response;
  try {
    response = await send(path, method, body, raw);
    // the short access token ran out: renew it from the refresh cookie and try once more
    if (response.status === 401 && (await refreshSession())) response = await send(path, method, body, raw);
  } catch {
    throw new Error(tr('The realtime server is unreachable. Check that it is running.'));
  }
  const data = await response.json().catch(() => ({}));
  // An older deploy of the server has no such route: say what to do rather than a bare "Not found".
  if (response.status === 404) throw new Error(tr('The server does not have this helper yet. Redeploy the realtime service on Render.'));
  if (response.status === 401) throw new Error(tr('Your session has ended. Sign in again.'));
  if (!response.ok) throw new Error(data.error || tr('Request failed ({0})', response.status));
  return data;
};

export const aiUsage = () => (isDemo() ? demo.aiUsage() : call('/api/ai/usage'));
export const djPick = ({ mood, tracks }) => (isDemo() ? demo.djPick({ mood, tracks }) : call('/api/ai/dj', { method: 'POST', body: { mood, tracks } }));
export const aiNote = ({ context, language }) => (isDemo() ? demo.aiNote({ context, language }) : call('/api/ai/note', { method: 'POST', body: { context, language } }));
export const askNotes = ({ question, notes }) => (isDemo() ? demo.askNotes({ question, notes }) : call('/api/ai/ask', { method: 'POST', body: { question, notes } }));
export const interpretCommand = ({ text, catalog, context }) => (isDemo() ? demo.interpretCommand({ text, catalog, context }) : call('/api/ai/command', { method: 'POST', body: { text, catalog, context } }));
export const generateCards = ({ text, limit }) => (isDemo() ? demo.generateCards({ text, limit }) : call('/api/ai/cards', { method: 'POST', body: { text, limit } }));
export const generateImage = (prompt) => (isDemo() ? demo.generateImage(prompt) : call('/api/ai/image', { method: 'POST', body: { prompt } }));
export const calendarBetween = (from, to) =>
  call(`/api/briefing/calendar?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`);

const needSignIn = () => {
  if (isDemo()) throw new Error(tr('This needs you to sign in.'));
};

// ---- the owner's Google Calendar (the server holds the sign-in; see server/gcal.mjs)
const iso = (date) => encodeURIComponent(date.toISOString());
/** { enabled, connected, lost, email, calendars: [{ id, name, color, primary, writable, selected }] } */
export const calendarStatus = () => (needSignIn(), call('/api/calendar/status'));
/** The address of Google's consent screen: { url }. */
export const calendarConnect = () => (needSignIn(), call('/api/calendar/google/connect', { method: 'POST', body: {} }));
export const calendarDisconnect = () => (needSignIn(), call('/api/calendar/google/disconnect', { method: 'POST', body: {} }));
/** Which calendars are shown: { calendars }. */
export const calendarSelect = (ids) => (needSignIn(), call('/api/calendar/google/select', { method: 'POST', body: { ids } }));
/** The events overlapping [from, to): { events }. */
export const calendarEvents = (from, to) => (needSignIn(), call(`/api/calendar/events?from=${iso(from)}&to=${iso(to)}`));
export const createEvent = (event) => (needSignIn(), call('/api/calendar/events/create', { method: 'POST', body: event }));
export const updateEvent = (event) => (needSignIn(), call('/api/calendar/events/update', { method: 'POST', body: event }));
export const deleteEvent = (event) => (needSignIn(), call('/api/calendar/events/delete', { method: 'POST', body: event }));

/** base64 from the server to a Blob the browser can show and store. */
export const base64ToBlob = (data, mime) => {
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
};

// ---- Creator Lab: the AI content engine, pitches, and posting to the owner's own Discord server (the webhook stays on the server)
const owner = () => {
  if (isDemo()) throw new Error(tr('The Creator Lab is private. Sign in to use it.'));
};
/** A ticket for the Hank RAG service, which answers nobody without one: { enabled, token, expiresIn (seconds) }. */
export const ragTicket = () => call('/api/rag/token', { method: 'POST', body: {} });

// ---- Podcasts: the directory search and a podcast's episodes, read by the server (a browser cannot read most feeds itself)
const podcastsNeedSignIn = () => {
  if (isDemo()) throw new Error(tr('Podcasts are private. Sign in to use them.'));
};
export const podcastSearch = (term) => (podcastsNeedSignIn(), call(`/api/podcasts/search?q=${encodeURIComponent(term)}`));
export const podcastFeed = (feedUrl) => (podcastsNeedSignIn(), call(`/api/podcasts/feed?url=${encodeURIComponent(feedUrl)}`));

/** The words in a recording (a WAV Blob). `language` is 'vi' or 'en'. */
export const transcribeAudio = (wav, language) => {
  if (isDemo()) throw new Error(tr('Turning speech into text needs you to sign in.'));
  return call(`/api/ai/transcribe?lang=${language === 'en' ? 'en' : 'vi'}`, { method: 'POST', body: wav, raw: 'audio/wav' });
};

// ---- Capture: sorting a typed or spoken text into tasks / spending / notes, reading a receipt, and the weekly review
/** Splits a text into the separate things in it: { items: [{ kind, title, due, amount, category }] }. */
export const organizeText = ({ text, today, language }) => (needSignIn(), call('/api/ai/organize', { method: 'POST', body: { text, today, language } }));
/** Reads a receipt photo (base64 and its type): { amount, merchant, date, category }. */
export const readReceipt = ({ image, mime }) => (needSignIn(), call('/api/ai/receipt', { method: 'POST', body: { image, mime } }));
/** A short written look back at the week, from numbers counted on the device: { text }. */
export const writeReview = ({ stats, language }) => (needSignIn(), call('/api/ai/review', { method: 'POST', body: { stats, language } }));
export const generateContent = (input) => (owner(), call('/api/ai/content', { method: 'POST', body: input }));
export const generatePitch = (input) => (owner(), call('/api/ai/pitch', { method: 'POST', body: input }));
export const discordChannels = () => (owner(), call('/api/discord/channels'));
export const postToDiscord = ({ channel, content }) => (owner(), call('/api/discord/post', { method: 'POST', body: { channel, content } }));

// Web Push (see server/push.mjs): the key to subscribe with, this device's subscription, and a test
export const pushKey = () => (isDemo() ? Promise.resolve({ enabled: false, publicKey: '' }) : call('/api/push/key'));
export const pushSubscribe = ({ subscription, kinds, lang }) => call('/api/push/subscribe', { method: 'POST', body: { subscription, kinds, lang } });
export const pushUnsubscribe = (endpoint) => call('/api/push/unsubscribe', { method: 'POST', body: { endpoint } });
export const pushTest = () => call('/api/push/test', { method: 'POST', body: {} });
