import { spacehankConfig } from '../config';
import { tr } from '../lang';

const { realtimeApiUrl, realtimeWsUrl } = spacehankConfig;

// The session lives in an HttpOnly cookie, so every call must send credentials.
const request = (path, init) => fetch(`${realtimeApiUrl}${path}`, { credentials: 'include', ...init });

/**
 * Whether the owner is signed in. The server renews a lapsed access token from the refresh cookie while it answers, so a page
 * that wakes up later is still signed in. Throws when the server cannot be reached (a free server that is still waking up
 * answers 502/503), which is not the same as "not signed in".
 */
export const fetchSession = async () => {
  const response = await request('/api/auth/session');
  if (!response.ok) throw new Error(tr('Server not ready ({0})', response.status));
  const data = await response.json().catch(() => null);
  if (!data) throw new Error(tr('Server not ready'));
  return Boolean(data.authenticated);
};

/** Asks for a new access token from the refresh cookie. Resolves true when the session is renewed. */
export const refreshSession = async () => {
  try {
    return (await request('/api/auth/refresh', { method: 'POST' })).ok;
  } catch {
    return false;
  }
};

export const login = async (password) => {
  const response = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (response.status === 429) throw new Error(tr('Too many attempts. Try again later.'));
  if (!response.ok) throw new Error(tr('Wrong access key.'));
};

export const logout = () => request('/api/auth/logout', { method: 'POST' }).catch(() => {});

/** Opens the authenticated realtime socket. Handlers: onOpen, onClose, onError, onMessage(parsedMessage). */
export const openSocket = ({ onOpen, onClose, onError, onMessage }) => {
  const socket = new WebSocket(realtimeWsUrl);
  socket.onopen = onOpen;
  socket.onclose = onClose;
  socket.onerror = onError;
  socket.onmessage = ({ data }) => {
    try {
      onMessage(JSON.parse(data));
    } catch {
      /* keep the UI alive if a stale worker sends malformed data */
    }
  };
  return socket;
};

export const sendTask = (socket, { title, prompt, agentId }) => {
  socket.send(JSON.stringify({ type: 'task', title, prompt, agentId }));
};
