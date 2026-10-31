import { spacehankConfig } from '../config';

const { realtimeApiUrl, realtimeWsUrl } = spacehankConfig;

// The session lives in an HttpOnly cookie, so every call must send credentials.
const request = (path, init) => fetch(`${realtimeApiUrl}${path}`, { credentials: 'include', ...init });

export const fetchSession = async () => {
  const response = await request('/api/auth/session');
  return Boolean((await response.json()).authenticated);
};

export const login = async (password) => {
  const response = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (response.status === 429) throw new Error('Too many attempts. Try again later.');
  if (!response.ok) throw new Error('Wrong access key.');
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
