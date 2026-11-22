import { LocalNotifications } from '@capacitor/local-notifications';
import { isNativeApp } from '../../../shared/lib/platform';
import { createStore } from '../../core/store';

// The phone's own notifications inside the Android app. The WebView has no Notification API and no Web Push, so the app
// shows them through the system instead, and schedules the reminders of the next two days ahead with alarms: they arrive
// on time with the app closed, the phone locked or offline, and come back after a restart (the plugin re-arms them).

const LIMIT = 40; // far below Android's alarm cap, and more than two days ever need

/** What the app may do: show notifications ('granted' / 'denied' / 'prompt') and fire them at the exact minute. */
export const nativeState = createStore({ checked: false, display: 'prompt', exact: 'granted' });

/** A stable notification number for an occasion, so the same reminder replaces itself instead of showing twice. */
export const nativeId = (key) => {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (Math.imul(hash, 31) + key.charCodeAt(i)) | 0;
  return (hash & 0x7fffffff) || 1;
};

const allowed = () => nativeState.get().display === 'granted';

export const refreshNative = async () => {
  if (!isNativeApp()) return;
  try {
    const [{ display }, { exact_alarm: exact }] = await Promise.all([LocalNotifications.checkPermissions(), LocalNotifications.checkExactNotificationSetting()]);
    nativeState.set({ checked: true, display, exact });
  } catch {
    nativeState.set({ checked: true });
  }
};

/** Asks Android for permission to notify (Android 13 and later ask the person; earlier ones just say yes). */
export const askNative = async () => {
  const { display } = await LocalNotifications.requestPermissions();
  nativeState.set({ display });
  return display === 'granted';
};

/** Opens Android's "Alarms & reminders" setting for the app; reminders stay a few minutes late until it is allowed. */
export const askExact = async () => {
  const { exact_alarm: exact } = await LocalNotifications.changeExactNotificationSetting();
  nativeState.set({ exact });
  lastPlan = ''; // what was scheduled inexactly is scheduled again, exactly
};

const toNative = (item, at) => ({
  id: nativeId(item.key || item.id),
  title: item.title,
  body: item.body || '',
  smallIcon: 'ic_stat_hank62',
  iconColor: '#0b0c0e',
  extra: { tab: item.tab, key: item.key },
  ...(at ? { schedule: { at: new Date(at), allowWhileIdle: true } } : {}),
  // never open the exact-alarm settings by surprise: only when the person asks (askExact)
  isExactNotification: nativeState.get().exact === 'granted',
});

/** Shows one notification now. */
export const showNative = async (item) => {
  if (!allowed()) return;
  await LocalNotifications.schedule({ notifications: [toNative(item)] });
};

let lastPlan = '';

/**
 * Replaces the scheduled reminders with `list` (from rules.js `ahead`). Cheap to call often: nothing is touched while the
 * plan is the same as last time.
 */
export const planNative = async (list) => {
  if (!isNativeApp() || !allowed()) return;
  const chosen = list.filter((item) => item.at > Date.now()).slice(0, LIMIT);
  const plan = chosen.map((item) => `${item.key}@${item.at}:${item.title}`).join('|');
  if (plan === lastPlan) return;
  lastPlan = plan;
  const { notifications: pending } = await LocalNotifications.getPending();
  if (pending.length) await LocalNotifications.cancel({ notifications: pending.map(({ id }) => ({ id })) });
  if (chosen.length) await LocalNotifications.schedule({ notifications: chosen.map((item) => toNative(item, item.at)) });
};

/** Calls `open(tab)` when a notification is tapped, also one that started the app. Returns a stop function. */
export const onNativeTap = (open) => {
  if (!isNativeApp()) return () => {};
  const handle = LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
    if (notification?.extra?.tab) open(notification.extra.tab);
  });
  return () => void handle.then((h) => h.remove());
};

// ---- reminders from the server, through Firebase Cloud Messaging ----------------------------------------------------
// With the server set up for it, the app hands the server its FCM token and the server sends the reminders itself (the
// same rules, checked every minute against the synced data), so they come even when the app has not been opened for days
// or the data was changed on another device. The alarms above then stand down, so nothing arrives twice.

const TOKEN_KEY = 'hank62.fcm';

/** The FCM token this install gave the server, or ''. */
export const appToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
};

const keepToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage is blocked: the app asks again next time */
  }
};

/** Registers with FCM (asking permission first) and resolves to the token. */
export const registerApp = async () => {
  const { PushNotifications } = await import('@capacitor/push-notifications');
  const { receive } = await PushNotifications.requestPermissions();
  nativeState.set({ display: receive });
  if (receive !== 'granted') throw new Error('denied');
  // the channel the server's messages name (server/services/fcm.mjs): heads-up, with sound
  await PushNotifications.createChannel({ id: 'reminders', name: 'Reminders', description: 'Tasks, events, habits and the rest', importance: 4, visibility: 1 });
  const token = await new Promise((resolve, reject) => {
    const handles = [];
    const done = (fn, value) => {
      handles.forEach((h) => void h.then((x) => x.remove()));
      fn(value);
    };
    handles.push(PushNotifications.addListener('registration', ({ value }) => done(resolve, value)));
    handles.push(PushNotifications.addListener('registrationError', ({ error }) => done(reject, new Error(error))));
    void PushNotifications.register();
    setTimeout(() => done(reject, new Error('timeout')), 20000);
  });
  keepToken(token);
  lastPlan = ''; // the alarms are re-planned (to none) on the next check
  return token;
};

export const unregisterApp = async () => {
  const { PushNotifications } = await import('@capacitor/push-notifications');
  keepToken('');
  lastPlan = ''; // the phone's own alarms take over again on the next check
  await PushNotifications.unregister().catch(() => {});
};

/**
 * Listens to the server's messages: one that arrives while the app is open goes to `received` (the bell's list), a tapped
 * one to `open(tab)`. Returns a stop function.
 */
export const onAppPush = ({ received, open }) => {
  if (!isNativeApp()) return () => {};
  let stopped = false;
  const handles = [];
  void import('@capacitor/push-notifications').then(({ PushNotifications }) => {
    if (stopped) return;
    handles.push(PushNotifications.addListener('pushNotificationReceived', (message) => received({ ...message.data, title: message.title, body: message.body })));
    handles.push(PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => notification?.data?.tab && open(notification.data.tab)));
  });
  return () => {
    stopped = true;
    handles.forEach((h) => void h.then((x) => x.remove()));
  };
};
