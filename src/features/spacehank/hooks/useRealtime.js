import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { fetchSession, login as apiLogin, logout as apiLogout, openSocket, sendTask } from '../api/realtime';
import { spacehankConfig } from '../config';
import { DEFAULT_AGENT_ID, createInitialAgents } from '../model/agents';
import { applyRealtimeMessage } from '../model/realtime';

const { maxEvents, toastMs } = spacehankConfig;

const reducer = (state, message) => {
  const { agents, events } = applyRealtimeMessage(state, message, maxEvents);
  return agents === state.agents && events === state.events ? state : { agents, events };
};

/**
 * Owns everything that talks to the realtime server: session, socket, live agent state and toasts.
 * `authenticated` is null while the session is being checked.
 */
export function useRealtime() {
  const [authenticated, setAuthenticated] = useState(null);
  const [connected, setConnected] = useState(false);
  const [toast, setToast] = useState('');
  const [{ agents, events }, dispatchMessage] = useReducer(reducer, undefined, () => ({
    agents: createInitialAgents(),
    events: [],
  }));
  const socketRef = useRef(null);
  const toastTimer = useRef(0);

  const notify = useCallback((message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), toastMs);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useEffect(() => {
    let cancelled = false;
    fetchSession()
      .then((value) => !cancelled && setAuthenticated(value))
      .catch(() => !cancelled && setAuthenticated(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authenticated !== true) return undefined;
    let socket;
    try {
      socket = openSocket({
        onOpen: () => {
          setConnected(true);
          notify('Connected to realtime company server');
        },
        onClose: () => {
          setConnected(false);
          socketRef.current = null;
        },
        onError: () => setConnected(false),
        onMessage: (message) => {
          if (message.type === 'task_error') notify(message.error);
          dispatchMessage(message);
        },
      });
      socketRef.current = socket;
    } catch {
      setConnected(false);
    }
    return () => socket?.close();
  }, [authenticated, notify]);

  const login = useCallback(async (password) => {
    await apiLogin(password);
    setAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setAuthenticated(false);
    setConnected(false);
  }, []);

  /** Sends a task to an agent over the socket. Returns whether it was sent. */
  const dispatchTask = useCallback(
    (text, agentId = DEFAULT_AGENT_ID) => {
      const task = String(text || '').trim();
      if (!task) return false;
      if (socketRef.current?.readyState !== WebSocket.OPEN) {
        notify('Realtime server is offline; task was not dispatched');
        return false;
      }
      sendTask(socketRef.current, { title: task, prompt: task, agentId });
      notify('Task sent to realtime worker');
      return true;
    },
    [notify]
  );

  return { authenticated, connected, agents, events, toast, login, logout, dispatchTask };
}
