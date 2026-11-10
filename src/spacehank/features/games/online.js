import { tr } from '../../core/i18n/lang';
import { useCallback, useEffect, useRef, useState } from 'react';
import { spacehankConfig } from '../../core/config';

// The online sea battle's connection. The server (server/services/battle.mjs) keeps the room and is the referee; this hook opens a
// WebSocket to it, remembers which seat in which room is yours so a phone that slept or lost signal can sit back down,
// and hands the screen the room as the server describes it.

const SESSION_KEY = 'hank62.battle.session';
const NAME_KEY = 'hank62.games.name';
const SESSION_MS = 20 * 60 * 1000;
const SLOW_MS = 3500; // after this long the free server is probably waking up
const RETRY_MS = [800, 1600, 3200, 6400];
const GIVE_UP = 30;

// ---- small pure helpers ------------------------------------------------------------------------------------------

/** What someone typed or pasted as a room code: upper case, only the letters and digits a code can hold, at most four. */
export const normalizeCode = (text) => String(text ?? '').toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '').slice(0, 4);

/** The link a friend opens to land in this room (the demo, so they need no password). */
export const inviteLink = (code, origin = typeof window === 'undefined' ? '' : window.location.origin) => `${origin}/spacehank?demo&tab=play&game=boats&room=${code}`;

/** The address of the battle socket, made from the realtime server's own. */
export const battleUrl = (base = spacehankConfig.realtimeWsUrl) => `${String(base).replace(/\/+$/, '')}/battle`;

const SQUARE = (cell) => `${'ABCDEFGHIJ'[Math.floor(cell / 10)]}${(cell % 10) + 1}`;

/** One line about the last shot, from the point of view of seat `me`: "Bạn bắn B4: trúng!". */
export const describeShot = (last, me, names) => {
  if (!last) return '';
  const who = last.by === me ? 'Bạn' : names[last.by] || tr('Đối thủ');
  const result = { miss: 'trượt', hit: 'trúng!', sunk: 'chìm một chiếc!' }[last.outcome] ?? '';
  return tr('{0} bắn {1}: {2}', who, SQUARE(last.cell), result);
};

/** What the status line says, given the room and my seat. */
export const statusOf = (room) => {
  if (!room) return '';
  const { seat, phase, turn, names, present } = room;
  const foe = 1 - seat;
  if (phase === 'wait') return tr('Đang đợi bạn của bạn vào phòng…');
  if (phase === 'place') return room.ready[seat] ? tr('Đợi {0} xếp tàu…', names[foe]) : tr('Xếp hạm đội của bạn, rồi ra khơi.');
  if (phase === 'over') return room.winner === seat ? tr('Bạn thắng rồi!') : tr('{0} thắng', names[foe]);
  if (!present[foe]) return tr('{0} mất kết nối. Đợi một chút…', names[foe]);
  return turn === seat ? tr('Đến lượt bạn: chạm một ô để bắn.') : tr('{0} đang ngắm…', names[foe]);
};

// ---- what is remembered on this device ---------------------------------------------------------------------------

const readSession = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
    return saved?.code && saved?.token && Date.now() - saved.at < SESSION_MS ? saved : null;
  } catch {
    return null;
  }
};
const writeSession = (session) => {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, at: Date.now() }));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* without storage a dropped connection cannot be picked up again */
  }
};

/** Whether a game in progress on this device can still be picked up (so reopening the app drops you back into it). */
export const hasBattleSession = () => Boolean(readSession());

export const savedName = () => {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
};
export const saveName = (name) => {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* the name is just asked for again */
  }
};

// ---- the hook ----------------------------------------------------------------------------------------------------

/**
 * link: 'idle' (not connected, nothing to do), 'connecting', 'open', or 'lost' (trying to get back).
 * room: the server's view of the room, or null. error: the last thing the server refused, or ''.
 */
export function useBattle() {
  const [link, setLink] = useState('idle');
  const [slow, setSlow] = useState(false);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const socket = useRef(null);
  const session = useRef(readSession());
  const wanted = useRef(false); // whether a connection should be kept up
  const attempts = useRef(0);
  const timers = useRef({ retry: 0, slow: 0 });
  const outbox = useRef([]);

  const clearTimers = () => {
    window.clearTimeout(timers.current.retry);
    window.clearTimeout(timers.current.slow);
  };

  const send = useCallback((message) => {
    if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify(message));
    else outbox.current.push(message);
  }, []);

  const connect = useCallback(() => {
    if (socket.current && socket.current.readyState <= WebSocket.OPEN) return;
    wanted.current = true;
    setLink((previous) => (previous === 'open' ? previous : attempts.current ? 'lost' : 'connecting'));
    window.clearTimeout(timers.current.slow);
    timers.current.slow = window.setTimeout(() => setSlow(true), SLOW_MS);
    let ws;
    try {
      ws = new WebSocket(battleUrl());
    } catch {
      setLink('lost');
      return;
    }
    socket.current = ws;

    ws.onopen = () => {
      attempts.current = 0;
      clearTimers();
      setSlow(false);
      setLink('open');
      if (session.current) ws.send(JSON.stringify({ type: 'resume', code: session.current.code, token: session.current.token }));
      for (const message of outbox.current.splice(0)) ws.send(JSON.stringify(message));
    };

    ws.onmessage = ({ data }) => {
      let message;
      try {
        message = JSON.parse(data);
      } catch {
        return;
      }
      if (message.type === 'joined') {
        session.current = { code: message.code, token: message.token };
        writeSession(session.current);
        setError('');
      } else if (message.type === 'room') {
        setRoom(message);
        if (session.current) writeSession(session.current); // keeps the 20 minutes counting from the last news
      } else if (message.type === 'error') setError(message.error);
      else if (message.type === 'gone') {
        session.current = null;
        writeSession(null);
        setRoom(null);
        setError(tr('Phòng đó đã đóng.'));
      }
    };

    ws.onclose = () => {
      if (socket.current === ws) socket.current = null;
      if (!wanted.current) {
        setLink('idle');
        return;
      }
      attempts.current += 1;
      setLink('lost');
      if (attempts.current > GIVE_UP) {
        wanted.current = false;
        setLink('idle');
        return;
      }
      window.clearTimeout(timers.current.retry);
      timers.current.retry = window.setTimeout(connect, RETRY_MS[Math.min(attempts.current - 1, RETRY_MS.length - 1)]);
    };
    ws.onerror = () => {};
  }, []);

  // a phone that was asleep, or came back from a tunnel: do not wait for the next retry
  useEffect(() => {
    const wake = () => {
      if (wanted.current && !socket.current && document.visibilityState !== 'hidden') {
        window.clearTimeout(timers.current.retry);
        connect();
      }
    };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);
    return () => {
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('online', wake);
    };
  }, [connect]);

  // reopening the app in the middle of a game puts you back in it
  useEffect(() => {
    if (session.current) connect();
    return () => {
      wanted.current = false;
      clearTimers();
      socket.current?.close();
      socket.current = null;
    };
  }, [connect]);

  const create = useCallback(
    (name) => {
      setError('');
      session.current = null; // an old seat must not be picked up again before this new room
      writeSession(null);
      send({ type: 'create', name });
      connect();
    },
    [connect, send]
  );
  const join = useCallback(
    (code, name) => {
      setError('');
      session.current = null;
      writeSession(null);
      send({ type: 'join', code, name });
      connect();
    },
    [connect, send]
  );
  const ready = useCallback((fleet) => send({ type: 'ready', fleet: fleet.map((ship) => ({ cells: ship.cells })) }), [send]);
  const fire = useCallback((cell) => send({ type: 'fire', cell }), [send]);
  const rematch = useCallback(() => send({ type: 'rematch' }), [send]);
  const leave = useCallback(() => {
    send({ type: 'leave' });
    session.current = null;
    writeSession(null);
    wanted.current = false;
    outbox.current = [];
    setRoom(null);
    setError('');
    window.setTimeout(() => socket.current?.close(), 200); // after the goodbye has gone out
  }, [send]);

  return { link, slow, room, error, hasSession: Boolean(session.current), create, join, ready, fire, rematch, leave };
}
