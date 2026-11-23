import { useEffect } from 'react';
import { isNativeApp } from '../../../shared/lib/platform';
import { tr } from '../../core/i18n/lang';
import { createStore } from '../../core/store';
import { notify } from '../notifications/center';
import { SHARE_CACHE } from '../share/inbox';
import { appInfo, Hank62, refreshInfo } from './bridge';

// The Android app's side of the workspace: a widget row that opens a tab, something shared from another app (put where the
// browser's share target puts it, so the same sheet asks where it goes), and a newer APK to offer.

/** A newer shell than this one: { shell, url } once known, else null. */
export const apkUpdate = createStore({ latest: null });

const LAUNCH_SEEN = 'hank62.launchSeen';
const RELEASES = 'https://github.com/Hank62-dev/Portfolio/releases/latest';

/** What Google's sign-in came back with, from the link that opened the app (hank62://calendar?google=connected), or null. Pure. */
export const calendarReturn = (url) => {
  const match = /^hank62:\/\/calendar\/?\?(.*)$/.exec(String(url ?? ''));
  const result = match ? new URLSearchParams(match[1]).get('google') : null;
  return ['connected', 'denied', 'failed'].includes(result) ? result : null;
};

/** Is the published shell (public/android.json) newer than this install's? */
export const newerShell = (latest, info) => Boolean(latest?.shell && info?.shell && latest.shell > info.shell);

const checkUpdate = async () => {
  try {
    const response = await fetch('/android.json', { cache: 'no-store' });
    if (!response.ok) return;
    const latest = await response.json();
    if (!newerShell(latest, appInfo.get())) return;
    apkUpdate.set({ latest: { shell: latest.shell, url: latest.url || RELEASES } });
    notify({ key: `apk:${latest.shell}`, kind: 'system', title: tr('A new version of the Android app is out'), body: tr('Tap Update at the top of the screen: it downloads and installs over this one.'), tone: 'info' });
  } catch {
    /* offline: asked again next start */
  }
};

const fromBase64 = (data, type) => {
  const raw = atob(data);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return new Blob([bytes], { type });
};

/** Writes a share from Android where the service worker writes one from the browser (see public/sw-focus.js). */
export const keepShare = async (share) => {
  await caches.delete(SHARE_CACHE);
  const cache = await caches.open(SHARE_CACHE);
  const files = (share.files ?? []).map((file) => fromBase64(file.data, file.type));
  const meta = { at: Date.now(), title: share.title ?? '', text: share.text ?? '', url: share.url ?? '', files: files.map((file) => ({ type: file.type, size: file.size })) };
  await cache.put('/__share/meta', new Response(JSON.stringify(meta), { headers: { 'Content-Type': 'application/json' } }));
  await Promise.all(files.map((file, i) => cache.put(`/__share/file/${i}`, new Response(file, { headers: { 'Content-Type': file.type || 'application/octet-stream' } }))));
};

export function useAndroid({ guest, onTab, onShare }) {
  useEffect(() => {
    if (!isNativeApp() || guest) return undefined;
    let stopped = false;

    // what a widget row or another app's "Share" brought, also when it started the app
    const takePending = async () => {
      try {
        const { tab } = await Hank62.takeTab();
        if (tab && !stopped) onTab(tab);
        const share = await Hank62.takeShare();
        if (!share.none && !stopped) {
          await keepShare(share);
          onShare();
        }
      } catch {
        /* an APK from before these existed */
      }
    };

    // hank62://calendar?google=…: the browser tab of Google's sign-in, sent back by the server (also when it started the app)
    const openUrl = (url) => {
      const result = calendarReturn(url);
      if (result && !stopped) window.location.assign(`/spacehank?tab=calendar&google=${encodeURIComponent(result)}`);
    };
    const links = import('@capacitor/app')
      .then(({ App }) => {
        // the link that started the app is still the launch link after the reload it causes: once is enough
        void App.getLaunchUrl()
          .then((launch) => {
            if (!launch?.url || sessionStorage.getItem(LAUNCH_SEEN) === launch.url) return;
            sessionStorage.setItem(LAUNCH_SEEN, launch.url);
            openUrl(launch.url);
          })
          .catch(() => {});
        return App.addListener('appUrlOpen', ({ url }) => openUrl(url));
      })
      .catch(() => null);

    void refreshInfo().then(() => !stopped && checkUpdate());
    void takePending();
    const listener = Hank62.addListener('pending', () => void takePending()).catch(() => null);
    // the battery answer is given in Android's own dialog: read it again when the app comes back
    const back = () => document.visibilityState === 'visible' && void refreshInfo();
    document.addEventListener('visibilitychange', back);
    return () => {
      stopped = true;
      void listener.then((handle) => handle?.remove());
      void links.then((handle) => handle?.remove());
      document.removeEventListener('visibilitychange', back);
    };
  }, [guest, onTab, onShare]);
}
