// Extra code for the app's service worker: tapping the Focus notification brings the app (and its timer) to the front.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find((client) => client.url.includes('/spacehank'));
      if (open) return open.focus();
      return self.clients.openWindow('/spacehank?tab=study');
    })()
  );
});
