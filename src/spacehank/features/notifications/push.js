import { isNativeApp } from '../../../shared/lib/platform';
import { getLang, tr } from '../../core/i18n/lang';
import { pushKey, pushSubscribe, pushTest, pushUnsubscribe } from '../../core/api/owner';
import { createStore } from '../../core/store';
import { center, permission, sendTest, setPush } from './center';
import { appToken, registerApp, unregisterApp } from './native';

// Web Push from the server, on this device: subscribing to it, and what the settings page needs to show. The server side is
// server/services/push.mjs; the worker that shows what arrives is public/sw-focus.js.

export const pushState = createStore({ checked: false, available: false, subscribed: false, busy: false, error: '' });

// Web Push does not reach an Android WebView, so inside the app it is not offered (the app's own notifications come later)
const supported = () => !isNativeApp() && typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined';

/** The app's service worker, or a clear error when there is none (a dev server has none). */
const worker = () =>
  Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => setTimeout(() => reject(new Error(tr('The app’s service worker is not running here. Push works in the deployed or installed app.'))), 4000)),
  ]);

const toKey = (base64) => {
  const raw = atob((base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const kinds = () => center.get().prefs.kinds;

// ---- the Android app: the same switches, through FCM (see native.js) ----

const refreshApp = async () => {
  try {
    const { app } = await pushKey();
    const token = appToken();
    pushState.set({ checked: true, available: Boolean(app), subscribed: Boolean(app && token), error: '' });
    // tokens can change (a reinstall, Google rotating them): hand the server the current one at each start
    if (app && token) {
      const fresh = await registerApp();
      if (fresh !== token) await pushSubscribe({ fcm: fresh, kinds: kinds(), lang: getLang() });
    }
  } catch {
    pushState.set({ checked: true, available: false, subscribed: false });
  }
};

const enableApp = async () => {
  pushState.set({ busy: true, error: '' });
  try {
    const { app } = await pushKey();
    if (!app) throw new Error(tr('Push is not set up on the server yet.'));
    let token;
    try {
      token = await registerApp();
    } catch (error) {
      throw new Error(error?.message === 'denied' ? tr('Notifications are off for Hank62. Turn them on in Android’s settings for the app.') : tr('Push could not be turned on.'));
    }
    await pushSubscribe({ fcm: token, kinds: kinds(), lang: getLang() });
    await setPush(true);
    pushState.set({ subscribed: true, busy: false });
  } catch (error) {
    pushState.set({ busy: false, error: error?.message || tr('Push could not be turned on.') });
  }
};

const disableApp = async () => {
  pushState.set({ busy: true, error: '' });
  const token = appToken();
  if (token) await pushUnsubscribe(token).catch(() => {});
  await unregisterApp();
  pushState.set({ subscribed: false, busy: false });
};

/** Asks the server whether push is set up, and whether this device is already subscribed. */
export const refreshPush = async () => {
  if (isNativeApp()) return refreshApp();
  if (!supported()) return pushState.set({ checked: true, available: false, subscribed: false });
  try {
    const { enabled } = await pushKey();
    const sub = enabled ? await (await worker()).pushManager.getSubscription() : null;
    pushState.set({ checked: true, available: enabled, subscribed: Boolean(sub) && permission() === 'granted', error: '' });
  } catch {
    pushState.set({ checked: true, available: false, subscribed: false });
  }
  return undefined;
};

/** Subscribes this device (asking permission first if needed). */
export const enablePush = async (again = true) => {
  if (isNativeApp()) return enableApp();
  pushState.set({ busy: true, error: '' });
  try {
    if (permission() === 'default') await Notification.requestPermission();
    if (permission() !== 'granted') throw new Error(tr('Notifications are blocked for this site. Allow them in the browser’s site settings.'));
    const { enabled, publicKey } = await pushKey();
    if (!enabled) throw new Error(tr('Push is not set up on the server yet.'));
    const registration = await worker();
    const subscribe = () => registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) });
    let sub = await registration.pushManager.getSubscription();
    if (!sub) sub = await subscribe();
    await pushSubscribe({ subscription: sub.toJSON(), kinds: kinds(), lang: getLang() });
    await setPush(true);
    pushState.set({ subscribed: true, busy: false });
  } catch (error) {
    // a subscription made with another server key (the keys were replaced) cannot be reused: start again with the new one
    if (again && error?.name === 'InvalidStateError') {
      try {
        const registration = await worker();
        await (await registration.pushManager.getSubscription())?.unsubscribe();
        pushState.set({ busy: false });
        return enablePush(false);
      } catch {
        /* fall through to the message below */
      }
    }
    pushState.set({ busy: false, error: error?.message || tr('Push could not be turned on.') });
  }
  return undefined;
};

/** Unsubscribes this device, here and on the server. */
export const disablePush = async () => {
  if (isNativeApp()) return disableApp();
  pushState.set({ busy: true, error: '' });
  try {
    const sub = await (await worker()).pushManager.getSubscription();
    if (sub) {
      await pushUnsubscribe(sub.endpoint).catch(() => {});
      await sub.unsubscribe();
    }
    pushState.set({ subscribed: false, busy: false });
  } catch (error) {
    pushState.set({ busy: false, error: error?.message || tr('Push could not be turned off.') });
  }
};

/** The kinds this device wants changed: tells the server, so it stops (or starts) sending them. */
export const syncPushKinds = async () => {
  if (!pushState.get().subscribed) return;
  if (isNativeApp()) {
    await pushSubscribe({ fcm: appToken(), kinds: kinds(), lang: getLang() }).catch(() => {});
    return;
  }
  try {
    const sub = await (await worker()).pushManager.getSubscription();
    if (sub) await pushSubscribe({ subscription: sub.toJSON(), kinds: kinds(), lang: getLang() });
  } catch {
    /* the next change tries again */
  }
};

/** A real round trip when subscribed (server, push service, this device); otherwise the local test. */
export const testNotification = async () => {
  if (!pushState.get().subscribed) return sendTest();
  try {
    const { sent } = await pushTest();
    if (!sent) pushState.set({ error: tr('The server sent it, but no device is subscribed to this kind.') });
  } catch (error) {
    pushState.set({ error: error?.message || tr('The test could not be sent.') });
  }
  return undefined;
};
