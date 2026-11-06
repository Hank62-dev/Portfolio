import { tr } from '../lang';
import { pushToast } from '../../../design-system';
import { isDemo } from '../demo/mode';
import { createStore } from '../store';
import { KIND_IDS, kindOf } from './kinds';

// The notification centre: everything the app wants to tell you, kept as a list you can read later (the bell's panel), and
// shown at once where it helps: a toast while the app is in front, the phone's own notification while it is in the background.
// It lives in this browser; the demo keeps its own so a visitor never sees the owner's.

const MAX = 60; // older ones fall off the end
const REMEMBER = 3 * 24 * 3600 * 1000; // a reminder's key is kept this long, so deleting one does not bring it back

const keyOf = () => (isDemo() ? 'hank62.demo.notifications' : 'hank62.notifications');

const fresh = () => ({ items: [], seen: {}, prefs: { push: true, kinds: Object.fromEntries(KIND_IDS.map((id) => [id, true])) } });

const read = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(keyOf()) ?? 'null');
    if (!saved || !Array.isArray(saved.items)) return fresh();
    const base = fresh();
    return { items: saved.items.slice(0, MAX), seen: saved.seen ?? {}, prefs: { push: saved.prefs?.push !== false, kinds: { ...base.prefs.kinds, ...saved.prefs?.kinds } } };
  } catch {
    return fresh();
  }
};

export const center = createStore(read());

const persist = () => {
  const { items, seen, prefs } = center.get();
  try {
    localStorage.setItem(keyOf(), JSON.stringify({ items, seen, prefs }));
  } catch {
    /* storage is blocked: the list lasts until the page closes */
  }
};

const change = (patch) => {
  center.set(patch);
  persist();
};

// ---- the phone's own notification -----------------------------------------------------------------------------------

/** 'granted', 'denied', 'default' (not asked yet) or 'unsupported'. */
export const permission = () => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);

const showSystem = async (item) => {
  if (permission() !== 'granted' || !center.get().prefs.push) return;
  const options = { body: item.body, tag: item.key || item.id, icon: '/icons/logo-192.png', badge: '/icons/logo-192.png', data: { tab: item.tab || kindOf(item.kind).tab } };
  try {
    const registration = await navigator.serviceWorker?.ready;
    if (registration?.showNotification) await registration.showNotification(item.title, options);
    else new Notification(item.title, options);
  } catch {
    /* a browser that refuses still has the list */
  }
};

const announce = (item) => {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') pushToast(item.title, { tone: item.tone });
  else void showSystem(item);
};

// ---- adding and changing ---------------------------------------------------------------------------------------------

/**
 * Adds a notification. `key` makes it happen once: the same key again (even after it was deleted) is ignored.
 * `announce: false` keeps it to the list, for things that already announced themselves. Returns the item, or null when
 * it was a repeat or that kind is switched off.
 */
export const notify = ({ key, kind = 'system', title, body = '', tab, tone = 'info', announce: loud = true }) => {
  const state = center.get();
  if (!state.prefs.kinds[kind] || !title) return null;
  if (key && state.seen[key]) return null;
  const now = Date.now();
  const item = { id: `${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, key, kind, title, body, tab: tab || kindOf(kind).tab, tone, at: now, read: false };
  const seen = Object.fromEntries(Object.entries(state.seen).filter(([, at]) => now - at < REMEMBER));
  if (key) seen[key] = now;
  change({ items: [item, ...state.items].slice(0, MAX), seen });
  if (loud) announce(item);
  return item;
};

/** A notification that proves the whole path works: it lands in the list, shows as a toast, and goes to the phone's own screen too. */
export const sendTest = () => {
  const item = notify({ kind: 'system', title: tr('This is a test'), body: tr('Notifications are working.'), tone: 'success' });
  if (item && document.visibilityState === 'visible') void showSystem(item);
  return item;
};

export const markRead = (id) => change((s) => ({ items: s.items.map((item) => (item.id === id ? { ...item, read: true } : item)) }));
export const markAllRead = () => change((s) => (s.items.every((item) => item.read) ? s : { items: s.items.map((item) => ({ ...item, read: true })) }));
export const remove = (id) => change((s) => ({ items: s.items.filter((item) => item.id !== id) }));
export const clearAll = () => change({ items: [] });

export const setKind = (id, on) => change((s) => ({ prefs: { ...s.prefs, kinds: { ...s.prefs.kinds, [id]: on } } }));

/** Turns the phone's own notifications on or off; turning on asks the browser when it has not been asked yet. */
export const setPush = async (on) => {
  if (on && permission() === 'default') await Notification.requestPermission();
  change((s) => ({ prefs: { ...s.prefs, push: on } }));
};

export const unreadCount = (state) => state.items.filter((item) => !item.read).length;

// ---- showing ---------------------------------------------------------------------------------------------------------

const DAY = 24 * 3600 * 1000;
const startOfDay = (time) => {
  const d = new Date(time);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Items in sections by day, newest first: Today, Yesterday, then Earlier. Empty sections are left out. Pure. */
export const groupByDay = (items, now = Date.now()) => {
  const today = startOfDay(now);
  const sections = [
    { label: tr('Today'), items: [] },
    { label: tr('Yesterday'), items: [] },
    { label: tr('Earlier'), items: [] },
  ];
  for (const item of items) {
    const day = startOfDay(item.at);
    sections[day >= today ? 0 : day >= today - DAY ? 1 : 2].items.push(item);
  }
  return sections.filter((section) => section.items.length);
};

/** "Just now", "5 min ago", "3 h ago", "2 d ago". Pure. */
export const ago = (at, now = Date.now()) => {
  const minutes = Math.floor((now - at) / 60000);
  if (minutes < 1) return tr('Just now');
  if (minutes < 60) return tr('{0} min ago', minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return tr('{0} h ago', hours);
  return tr('{0} d ago', Math.floor(hours / 24));
};
