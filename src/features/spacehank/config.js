import { profile } from '../../data/profile';

// Everything deployment-specific or tunable about /spacehank lives here.
const env = import.meta.env;

export const spacehankConfig = {
  realtimeApiUrl: env.VITE_SPACEHANK_API_URL || 'http://localhost:8787',
  realtimeWsUrl: env.VITE_SPACEHANK_WS_URL || 'ws://localhost:8787',
  ragApiUrl: env.VITE_HANK_RAG_API_URL || 'http://localhost:8000',
  ragUserId: 'hank62',
  sessionPrefix: 'hank62',
  maxUploadBytes: 25 * 1024 * 1024,
  uploadAccept: '.pdf,.docx,.txt,.md,.csv,.json',
  maxEvents: 40,
  toastMs: 2400,
};

/** "Võ Gia Huy" -> "VH": first and last initial. */
export const initialsOf = (fullName) => {
  const words = fullName.trim().split(/\s+/);
  return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
};

export const owner = { name: profile.handle, initials: initialsOf(profile.name) };

export const greetingFor = (hour) => {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};
