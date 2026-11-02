import alarmUrl from '../../../assets/sounds/focus-alarm.mp3';
import { player, bindSystemKeys } from '../music/player';
import { clock } from '../study/model';
import { createStore } from '../store';

// The Focus timer, kept outside any screen so it keeps going wherever you are in the app. While it runs it shows itself
// in four places: a floating widget inside the app, the title of the browser tab, the lock screen / notification card
// (through the Media Session, with a silent audio loop that keeps the page alive), and a notification. When the time is
// up an alarm rings until it is put away.

export const MODES = [
  { id: 'focus', label: 'Focus', minutes: 25 },
  { id: 'short', label: 'Short break', minutes: 5 },
  { id: 'long', label: 'Long break', minutes: 15 },
];

const SESSIONS = 'hank62.study.sessions';
const today = () => new Date().toDateString();
const loadSessions = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSIONS) ?? 'null');
    return saved?.day === today() ? saved.count : 0;
  } catch {
    return 0;
  }
};
const saveSessions = (count) => {
  try {
    localStorage.setItem(SESSIONS, JSON.stringify({ day: today(), count }));
  } catch {
    /* private mode: the count just will not persist */
  }
};

const minutesOf = (mode) => MODES.find((m) => m.id === mode).minutes;

/** status: idle | running | paused | done (the alarm is ringing). `left` is in seconds. */
export const focus = createStore({ mode: 'focus', status: 'idle', total: minutesOf('focus') * 60, left: minutesOf('focus') * 60, endsAt: 0, sessions: loadSessions() });

let loop = 0;
let keepAlive = null;
let alarm = null;
let alarmStop = 0;
let lastMinute = -1;

/** One second of silence as a WAV, played on a loop so the browser treats the page as playing audio (and shows the media card). */
const silence = () => {
  const rate = 8000;
  const bytes = new ArrayBuffer(44 + rate * 2);
  const view = new DataView(bytes);
  const text = (at, value) => [...value].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + rate * 2, true);
  text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, rate * 2, true);
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
};

const musicIsPlaying = () => player.get().playing;
const hasSession = () => typeof navigator !== 'undefined' && 'mediaSession' in navigator;
const label = (mode) => (mode === 'focus' ? 'Focus' : 'Break');

// ---- notification -----------------------------------------------------------------------------------------------

const askToNotify = () => {
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission();
};
const notify = async (title, body, ringing = false) => {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const options = { body, tag: 'hank62-focus', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', silent: !ringing, requireInteraction: ringing, renotify: ringing, vibrate: ringing ? [300, 150, 300, 150, 600] : undefined };
  try {
    const registration = await navigator.serviceWorker?.ready;
    if (registration?.showNotification) await registration.showNotification(title, options);
    else new Notification(title, options);
  } catch {
    /* a browser that refuses notifications still has the widget and the alarm */
  }
};
const clearNotification = async () => {
  try {
    const registration = await navigator.serviceWorker?.ready;
    (await registration?.getNotifications?.({ tag: 'hank62-focus' }))?.forEach((n) => n.close());
  } catch {
    /* nothing to close */
  }
};

// ---- the lock screen / notification card -------------------------------------------------------------------------

const publishCard = () => {
  if (!hasSession() || musicIsPlaying()) return; // while a song plays, the card belongs to the song
  const { mode, left, total, status } = focus.get();
  navigator.mediaSession.metadata = new MediaMetadata({ title: `${label(mode)} · ${clock(left)}`, artist: status === 'running' ? 'Hank62 · keep going' : 'Hank62 · paused', album: 'Focus timer', artwork: [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }] });
  navigator.mediaSession.playbackState = status === 'running' ? 'playing' : 'paused';
  try {
    navigator.mediaSession.setPositionState?.({ duration: total, position: Math.max(0, Math.min(total, total - left)), playbackRate: 1 });
  } catch {
    /* out of range for this browser: the card just shows no bar */
  }
};
const takeKeys = () => {
  if (!hasSession() || musicIsPlaying()) return;
  const set = (action, handler) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      /* this browser does not have that button */
    }
  };
  set('play', () => start());
  set('pause', () => pause());
  set('stop', () => reset());
  set('previoustrack', null);
  set('nexttrack', null);
  set('seekto', null);
  set('seekbackward', null);
  set('seekforward', null);
};
const giveKeysBack = () => {
  if (!hasSession()) return;
  bindSystemKeys();
  if (!musicIsPlaying()) {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
  }
};

const startKeepAlive = () => {
  if (musicIsPlaying()) return;
  if (!keepAlive) {
    keepAlive = new Audio(silence());
    keepAlive.loop = true;
  }
  void keepAlive.play().catch(() => {});
};
const stopKeepAlive = () => keepAlive?.pause();

// ---- the alarm -----------------------------------------------------------------------------------------------------

const ring = () => {
  const element = keepAlive && !musicIsPlaying() ? keepAlive : (alarm ??= new Audio());
  element.loop = true;
  element.src = alarmUrl;
  element.currentTime = 0;
  void element.play().catch(() => {});
  alarm = element;
  navigator.vibrate?.([300, 150, 300, 150, 600]);
  window.clearTimeout(alarmStop);
  alarmStop = window.setTimeout(silenceAlarm, 45000); // it does not ring forever
};
const silenceAlarm = () => {
  window.clearTimeout(alarmStop);
  if (alarm) {
    alarm.pause();
    alarm.removeAttribute('src');
    alarm.load?.();
    if (alarm === keepAlive) keepAlive = null; // that element held the alarm now; a fresh silent one is made next time
    alarm = null;
  }
  navigator.vibrate?.(0);
};

// ---- the clock ------------------------------------------------------------------------------------------------------

const setTitle = (text) => {
  document.title = text ? `${text} · Hank62` : document.title.replace(/^\d\d:\d\d · /, '');
};

const finish = () => {
  window.clearInterval(loop);
  loop = 0;
  const { mode, sessions } = focus.get();
  const next = mode === 'focus' ? sessions + 1 : sessions;
  if (mode === 'focus') saveSessions(next);
  focus.set({ status: 'done', left: 0, sessions: next });
  setTitle('');
  ring();
  void notify(mode === 'focus' ? 'Focus session done' : 'Break over', mode === 'focus' ? 'Time for a short break.' : 'Ready for the next round?', true);
  if (hasSession() && !musicIsPlaying()) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: mode === 'focus' ? 'Focus done' : 'Break over', artist: 'Hank62', album: 'Focus timer', artwork: [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }] });
    navigator.mediaSession.playbackState = 'playing';
  }
};

const tick = () => {
  const { status, endsAt, left } = focus.get();
  if (status !== 'running') return;
  const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
  if (remaining !== left) focus.set({ left: remaining });
  if (remaining === 0) {
    finish();
    return;
  }
  setTitle(clock(remaining));
  const minute = Math.ceil(remaining / 60);
  if (minute !== lastMinute) {
    lastMinute = minute;
    publishCard();
    void notify(`${label(focus.get().mode)} · ${minute} min left`, 'Stay with one thing.');
  }
};

export const start = () => {
  const { status, left } = focus.get();
  if (status === 'running' || status === 'done') return;
  askToNotify();
  silenceAlarm();
  focus.set({ status: 'running', endsAt: Date.now() + left * 1000 });
  lastMinute = -1;
  window.clearInterval(loop);
  loop = window.setInterval(tick, 250);
  startKeepAlive();
  takeKeys();
  publishCard();
  tick();
};

export const pause = () => {
  if (focus.get().status !== 'running') return;
  tick();
  window.clearInterval(loop);
  loop = 0;
  focus.set({ status: 'paused' });
  setTitle('');
  stopKeepAlive();
  publishCard();
  void notify(`${label(focus.get().mode)} paused`, `${clock(focus.get().left)} left.`);
};

export const reset = () => {
  window.clearInterval(loop);
  loop = 0;
  silenceAlarm();
  stopKeepAlive();
  const { total } = focus.get();
  focus.set({ status: 'idle', left: total, endsAt: 0 });
  setTitle('');
  void clearNotification();
  giveKeysBack();
};

export const setMode = (mode) => {
  const total = minutesOf(mode) * 60;
  window.clearInterval(loop);
  loop = 0;
  silenceAlarm();
  stopKeepAlive();
  focus.set({ mode, total, left: total, status: 'idle', endsAt: 0 });
  setTitle('');
  void clearNotification();
  giveKeysBack();
};

/** Puts the alarm away and moves on: a break after a focus session, a focus session after a break. */
export const dismiss = () => {
  const { mode } = focus.get();
  silenceAlarm();
  void clearNotification();
  giveKeysBack();
  setMode(mode === 'focus' ? 'short' : 'focus');
};

// a phone that slept may have missed the end: look at the clock again the moment the page is back
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && tick());
