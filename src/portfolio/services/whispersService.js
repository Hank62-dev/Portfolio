// The guestbook lives on the same small server as the SpaceHank workspace (server/routes/whispers.routes.mjs).
const API = (import.meta.env.VITE_SPACEHANK_API_URL || 'http://localhost:8787').replace(/\/+$/, '');

const request = async (path, init = {}) => {
  // a plain GET needs no content type (and so no preflight); a POST carries JSON
  const res = await fetch(`${API}${path}`, init.body ? { ...init, headers: { 'Content-Type': 'application/json' } } : init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(body.error || `HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return body;
};

export const fetchWhispers = async () => (await request('/api/whispers')).whispers ?? [];

export const sendWhisper = async ({ message, x, y, country }) => (await request('/api/whispers', { method: 'POST', body: JSON.stringify({ message, x, y, country }) })).whisper;

/** The visitor's country as their browser states it (the region of their language setting), or null. */
export const guessCountry = () => {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region;
    return region && /^[A-Z]{2}$/.test(region) ? region : null;
  } catch {
    return null;
  }
};

/** A two-letter country code as its flag. */
export const flagOf = (code) => (code && /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((ch) => 0x1f1a5 + ch.charCodeAt(0))) : '✦');
