// Extra code for the app's service worker: the Focus notification, and the "new version" notification.

const UPDATE_TAG = 'hank62-update';

// ---- a new version is ready -------------------------------------------------------------------------------------
// The notification that tells you so appears on the phone's own screen, outside the app. Tapping it opens the app and the
// app switches to the new version by itself. (It only shows if notifications were allowed.)

const vietnamese = () => /^vi/i.test(self.navigator?.language ?? '');

// The newest line of public/changelog.json, so the notification can say what is new. It is asked for fresh from the server (the file
// is not part of the cached app) and given a few seconds: with no answer the notification simply says there is an update.
const newestChange = async (vi) => {
  try {
    const response = await fetch('/changelog.json', { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    const entry = (await response.json())?.[0];
    const text = vi ? entry?.vi : entry?.en;
    return typeof text === 'string' ? text.slice(0, 140) : '';
  } catch {
    return '';
  }
};

const announceUpdate = async () => {
  if (self.Notification?.permission !== 'granted') return;
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (windows.some((client) => client.visibilityState === 'visible')) return; // the app is open in front: it shows its own pill
  const vi = vietnamese();
  const latest = await newestChange(vi);
  await self.registration.showNotification(vi ? 'Hank62 có bản cập nhật mới' : 'Hank62 has an update', {
    body: `${latest ? `${vi ? 'Mới: ' : 'New: '}${latest}
` : ''}${vi ? 'Chạm để mở app và cập nhật.' : 'Tap to open the app and update.'}`,
    tag: UPDATE_TAG,
    icon: '/icons/logo-192.png',
    badge: '/icons/badge-96.png',
    data: { kind: 'update' },
  });
};

// A worker that installs while an older one is running is an update. Wait a little so its files have time to arrive
// (tapping early still works: the app waits for the update and applies it the moment it is ready).
self.addEventListener('install', (event) => {
  if (!self.registration.active) return;
  event.waitUntil(new Promise((done) => setTimeout(done, 6000)).then(announceUpdate).catch(() => {}));
});

// the app, when it finds an update while it is in the background, asks the running worker to say so
self.addEventListener('message', (event) => {
  if (event.data?.type === 'hank62-announce-update') event.waitUntil(announceUpdate().catch(() => {}));
});

// an installed app on Android can wake now and then to look for a new version, even when it is closed
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'hank62-update-check') event.waitUntil(self.registration.update().catch(() => {}));
});

// ---- a push from the server ---------------------------------------------------------------------------------------
// The server (server/services/push.mjs) sends reminders even when the app is closed. If the app is open in front it already shows
// them itself, so it is only told; otherwise the phone's own screen shows it. Tapping it goes to the tab it is about.

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: event.data?.text() };
  }
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      windows.forEach((client) => client.postMessage({ type: 'hank62-push', payload: data }));
      if (windows.some((client) => client.visibilityState === 'visible')) return;
      await self.registration.showNotification(data.title || 'Hank62', {
        body: data.body || '',
        tag: data.key || undefined, // the app's own copy of the same reminder takes this one's place instead of doubling it
        icon: '/icons/logo-192.png',
        badge: '/icons/badge-96.png',
        data: { tab: data.tab },
      });
    })()
  );
});

// ---- tapping a notification -------------------------------------------------------------------------------------
// Each brings the app to the front. The update one also tells it to switch to the new version; a reminder from the
// notification centre takes it to the tab it is about.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const update = event.notification.tag === UPDATE_TAG;
  const tab = String(event.notification.data?.tab ?? '').replace(/[^a-z-]/gi, ''); // a reminder from the notification centre names its tab
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find((client) => client.url.includes('/spacehank'));
      if (open) {
        if (update) open.postMessage({ type: 'hank62-apply-update' });
        else if (tab) open.postMessage({ type: 'hank62-open-tab', tab });
        return open.focus();
      }
      // a full address inside the manifest's scope: Chrome on Android opens that in the installed app, where a bare path can end up in a browser tab
      const target = new URL(update ? '/spacehank?update=1' : `/spacehank?tab=${tab || 'study'}`, self.location.origin).href;
      return self.clients.openWindow(target);
    })()
  );
});

// ---- sharing into the app ---------------------------------------------------------------------------------------
// The manifest lists /spacehank/share as a share target. When another app shares text, a link or pictures to Hank62, the
// phone POSTs them here. They are kept in a cache for the page to pick up (src/spacehank/share/inbox.js), and the
// app opens as /spacehank?share=1 where the person chooses where they go.

const SHARE_CACHE = 'hank62-share';
const SHARE_FILE_LIMIT = 15 * 1024 * 1024;

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'POST' || new URL(request.url).pathname !== '/spacehank/share') return;
  event.respondWith(
    (async () => {
      try {
        const form = await request.formData();
        await caches.delete(SHARE_CACHE); // only the latest share is kept
        const cache = await caches.open(SHARE_CACHE);
        const files = form.getAll('media').filter((file) => typeof file === 'object' && file.size > 0 && file.size <= SHARE_FILE_LIMIT).slice(0, 6);
        const field = (name) => String(form.get(name) ?? '').slice(0, 20000);
        const meta = { at: Date.now(), title: field('title'), text: field('text'), url: field('url'), files: files.map((file) => ({ type: file.type, size: file.size })) };
        await cache.put('/__share/meta', new Response(JSON.stringify(meta), { headers: { 'Content-Type': 'application/json' } }));
        await Promise.all(files.map((file, i) => cache.put(`/__share/file/${i}`, new Response(file, { headers: { 'Content-Type': file.type || 'application/octet-stream' } }))));
      } catch {
        /* the app still opens; it just has nothing waiting */
      }
      return Response.redirect(`${self.location.origin}/spacehank?share=1`, 303);
    })()
  );
});
