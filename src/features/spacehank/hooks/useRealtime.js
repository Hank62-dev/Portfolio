import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { pushToast } from '../../../shared/ui';
import { fetchSession, login as apiLogin, logout as apiLogout, openSocket, sendTask } from '../api/realtime';
import { spacehankConfig } from '../config';
import { isLocalServer } from '../model/realtime';
import { DEFAULT_AGENT_ID, createInitialAgents } from '../model/agents';
import { applyRealtimeMessage } from '../model/realtime';
import { requestSync } from '../sync';
import { tr } from '../lang';

const { maxEvents } = spacehankConfig;

const reducer = (state, message) => {
  const { agents, events } = applyRealtimeMessage(state, message, maxEvents);
  return agents === state.agents && events === state.events ? state : { agents, events };
};

/** How long to wait before the next try after `attempt` failures in a row: 1 s, 2 s, 4 s… up to 20 s, never in lockstep. Pure. */
export const backoffMs = (attempt, random = Math.random) => Math.min(20000, 1000 * 2 ** Math.min(attempt, 5)) + Math.floor(random() * 400);

const AWAY_MS = 20 * 1000; // after this long out of sight a phone may have dropped the socket without saying so

/**
 * Owns everything that talks to the realtime server: session, socket, live agent state.
 * `authenticated` is null while the session is being checked (or while a sleeping server wakes up: see `waking`).
 * The socket reconnects by itself, with a growing pause, and at once when the app comes back to the screen or the network returns.
 * `link` is 'online', 'connecting' (the first try, or trying again) or 'offline' (signed out or no session).
 */
export function useRealtime() {
  const [authenticated, setAuthenticated] = useState(null);
  const [link, setLink] = useState('connecting');
  const [waking, setWaking] = useState(false);
  const [unreachable, setUnreachable] = useState(false); // a server on this very computer that does not answer: not asleep, wrong
  const [{ agents, events }, dispatchMessage] = useReducer(reducer, undefined, () => ({
    agents: createInitialAgents(),
    events: [],
  }));
  const socketRef = useRef(null);
  const connected = link === 'online';

  const notify = useCallback((message, options) => {
    pushToast(message, options);
  }, []);

  // 1. Is there a session? A free server that was asleep answers with errors for up to a minute: keep asking, do not call that "signed out".
  useEffect(() => {
    let stopped = false;
    let timer = 0;
    let attempt = 0;
    const startedAt = Date.now();
    const ask = async () => {
      try {
        const value = await fetchSession();
        if (!stopped) {
          setWaking(false);
          setUnreachable(false);
          setAuthenticated(value);
        }
      } catch {
        if (stopped) return;
        if (Date.now() - startedAt > 150000) {
          // two and a half minutes of nothing: show the sign-in form rather than a spinner for ever
          setWaking(false);
          setAuthenticated(false);
          return;
        }
        if (Date.now() - startedAt > 3000) setWaking(true);
        // a free server on the internet can be asleep for a minute, but one on localhost is not: say what to check
        if (Date.now() - startedAt > 6000 && isLocalServer(spacehankConfig.realtimeApiUrl)) setUnreachable(true);
        timer = window.setTimeout(ask, backoffMs(attempt++));
      }
    };
    void ask();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, []);

  // 2. The socket, kept open for as long as the owner is signed in.
  useEffect(() => {
    if (authenticated !== true) return undefined;
    let stopped = false;
    let timer = 0;
    let attempt = 0;
    let generation = 0; // a socket that is no longer the current one must not touch the state
    let hiddenAt = 0;
    let everOpened = false;

    const closeCurrent = () => {
      generation += 1;
      const old = socketRef.current;
      socketRef.current = null;
      try {
        old?.close();
      } catch {
        /* already closed */
      }
    };

    const later = () => {
      if (stopped) return;
      setLink('connecting');
      window.clearTimeout(timer);
      timer = window.setTimeout(connect, backoffMs(attempt++));
    };

    async function connect() {
      if (stopped) return;
      window.clearTimeout(timer);
      setLink('connecting');
      try {
        // also renews the access token from the refresh cookie, so the socket's sign-in check passes after a long absence
        const still = await fetchSession();
        if (stopped) return;
        if (!still) {
          setAuthenticated(false);
          setLink('offline');
          return;
        }
      } catch {
        later();
        return;
      }
      const mine = ++generation;
      try {
        socketRef.current = openSocket({
          onOpen: () => {
            if (mine !== generation) return;
            attempt = 0;
            setLink('online');
            if (!everOpened) notify(tr('Connected to the realtime server'), { tone: 'success' });
            everOpened = true;
          },
          onClose: () => {
            if (mine !== generation) return;
            socketRef.current = null;
            later();
          },
          onError: () => {
            /* a failed socket is followed by onClose, which is where the retry is set up */
          },
          onMessage: (message) => {
            if (mine !== generation) return;
            if (message.type === 'task_error') notify(message.error, { tone: 'error' });
            if (message.type === 'sync') requestSync(); // another device changed the owner's data
            dispatchMessage(message);
          },
        });
      } catch {
        later();
      }
    }

    // back on screen (or back online): do not wait for the timer, and doubt a socket that sat unseen for a while
    const wake = () => {
      if (stopped) return;
      const open = socketRef.current?.readyState === WebSocket.OPEN;
      if (open && (!hiddenAt || Date.now() - hiddenAt < AWAY_MS)) return;
      closeCurrent();
      attempt = 0;
      void connect();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now();
      else {
        wake();
        hiddenAt = 0;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', wake);
    window.addEventListener('pageshow', wake);

    void connect();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', wake);
      window.removeEventListener('pageshow', wake);
      closeCurrent();
    };
  }, [authenticated, notify]);

  const login = useCallback(async (password) => {
    await apiLogin(password);
    setAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setAuthenticated(false);
    setLink('offline');
  }, []);

  /** Sends a task to an agent over the socket. Returns whether it was sent. */
  const dispatchTask = useCallback(
    (text, agentId = DEFAULT_AGENT_ID) => {
      const task = String(text || '').trim();
      if (!task) return false;
      if (socketRef.current?.readyState !== WebSocket.OPEN) {
        notify(tr('Realtime server is offline; task was not dispatched'), { tone: 'error' });
        return false;
      }
      sendTask(socketRef.current, { title: task, prompt: task, agentId });
      notify(tr('Task sent to the realtime worker'), { tone: 'success' });
      return true;
    },
    [notify]
  );

  return { authenticated, connected, link, waking, unreachable, agents, events, notify, login, logout, dispatchTask };
}
