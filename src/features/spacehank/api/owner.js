import { spacehankConfig } from '../config';
import { isDemo } from '../demo/mode';
import * as demo from '../demo/mock';

const { realtimeApiUrl } = spacehankConfig;

// Owner-only helpers on the realtime server (AI and calendar). The session cookie authorises them.
const call = async (path, { method = 'GET', body } = {}) => {
  let response;
  try {
    response = await fetch(`${realtimeApiUrl}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('The realtime server is unreachable. Check that it is running.');
  }
  const data = await response.json().catch(() => ({}));
  // An older deploy of the server has no such route: say what to do rather than a bare "Not found".
  if (response.status === 404) throw new Error('The server does not have this helper yet. Redeploy the realtime service on Render.');
  if (response.status === 401) throw new Error('Your session has ended. Sign in again.');
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
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

/** base64 from the server to a Blob the browser can show and store. */
export const base64ToBlob = (data, mime) => {
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
};
