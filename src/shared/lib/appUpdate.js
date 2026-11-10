import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { newerThan } from './changelog';

// Keeping the installed app up to date. A phone keeps showing the copy of the site it saved until the app is fully
// closed, so the app asks the server for a newer one on its own, and when there is one it says so and waits to be told.
// It says so in two places: a small pill inside the app, and (if notifications are allowed) a notification on the phone's
// own screen. Tapping either swaps to the new copy and reloads the page; "Later" leaves it for the next visit.

const CHECK_EVERY = 15 * 60 * 1000;
const NOTICE_TAG = 'hank62-update';
const SEEN_KEY = 'hank62-changelog-seen'; // the newest change this device had already been shown
const HERE = import.meta.env.VITE_LATEST_CHANGE || ''; // the newest change this copy of the app was built with

// `changes`: what the waiting version brings; `news`: what the version that was just installed brought
let state = { ready: false, dismissed: false, changes: [], news: [] };
const listeners = new Set();
const set = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

let apply = null;
let wanted = false; // the person already asked for the update (tapped the notification) before it finished arriving

const closeNotice = async (registration) => {
  try {
    (await registration?.getNotifications?.({ tag: NOTICE_TAG }))?.forEach((n) => n.close());
  } catch {
    /* nothing to close */
  }
};

/** Whether the phone's own screen can be used for update notices: 'granted', 'denied', 'default' (not asked yet) or 'unsupported'. */
export const noticePermission = () => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);

/** Asks to be allowed to send notifications, so the next update can reach the phone's own screen. Call from a tap. */
export const enableNotices = () => (typeof Notification === 'undefined' ? Promise.resolve('unsupported') : Notification.requestPermission());

/** Switches to the new version and reloads. Asking for it before it has arrived also works: it happens on arrival. */
export const applyUpdate = () => {
  wanted = true;
  void navigator.serviceWorker?.getRegistration().then(closeNotice);
  apply?.(true);
};
export const later = () => set({ dismissed: true });
export const dismissNews = () => set({ news: [] });

/** The list of changes as the server has it now, or null when it cannot be read (offline, an older deploy). */
const loadChanges = async () => {
  try {
    const response = await fetch('/changelog.json', { cache: 'no-store' });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
};

/** A copy that is newer than the one this device ran last time: say what it brought. The first run ever says nothing. */
const announceWhatChanged = () => {
  let seen = null;
  try {
    seen = localStorage.getItem(SEEN_KEY);
    if (HERE) localStorage.setItem(SEEN_KEY, HERE);
  } catch {
    return;
  }
  if (!seen || !HERE || seen === HERE) return;
  void loadChanges().then((list) => {
    const news = list ? newerThan(list, seen, 6, HERE) : [];
    if (news.length) set({ news });
  });
};

/** Registers the service worker and starts looking for newer versions. Call once, at start. */
export const startUpdates = () => {
  if (typeof window === 'undefined' || apply) return;
  announceWhatChanged();

  // the notification opens the app as /spacehank?update=1 when it was closed
  const params = new URLSearchParams(window.location.search);
  if (params.has('update')) {
    wanted = true;
    params.delete('update');
    const search = params.toString();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`);
  }

  // ...or messages the app, when it was open, to do the same
  navigator.serviceWorker?.addEventListener('message', (event) => {
    if (event.data?.type === 'hank62-apply-update') applyUpdate();
  });
  // The page does not always reload by itself once the new worker takes over (an update found by a plain
  // registration.update() counts as "external" to the library that registers it), so do it here, once.
  let reloading = false;
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (!wanted || reloading) return;
    reloading = true;
    window.location.reload();
  });

  apply = registerSW({
    immediate: true,
    onNeedRefresh: () => {
      set({ ready: true, dismissed: false });
      void loadChanges().then((list) => list && set({ changes: newerThan(list, HERE) }));
      if (wanted) {
        apply?.(true);
        return;
      }
      // found while the app is in the background: tell the phone's screen, not just the app
      if (document.visibilityState === 'hidden') navigator.serviceWorker?.controller?.postMessage({ type: 'hank62-announce-update' });
    },
    onRegisteredSW: (_url, registration) => {
      if (!registration) return;
      if (!registration.waiting) void closeNotice(registration); // an old notice for a version that is already installed
      const check = () => {
        if (navigator.onLine) registration.update().catch(() => {});
      };
      if (wanted) check();
      window.setInterval(check, CHECK_EVERY);
      // coming back to the app, or the network coming back, is the moment a phone most likely missed a release
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
      window.addEventListener('online', check);
      // an installed app on Android may look for updates in the background even while it is closed
      void registration.periodicSync?.register('hank62-update-check', { minInterval: 12 * 60 * 60 * 1000 }).catch(() => {});
    },
  });
};

export const useUpdate = () => useSyncExternalStore(subscribe, () => state);
