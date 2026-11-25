// Custom service-worker code. next-pwa bundles this into the generated sw.js
// (production builds only). Handles Web Push for new chat messages.

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'ME2 App', body: event.data ? event.data.text() : 'New message' };
  }

  event.waitUntil((async () => {
    // Like WhatsApp: no system notification while the app is open and in front
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (windows.some((w) => w.focused && w.visibilityState === 'visible')) return;

    await self.registration.showNotification(data.title || 'ME2 App', {
      body: data.body || 'New message',
      icon: '/icon-192.png',
      badge: '/icon-96.png',
      tag: data.tag,
      renotify: !!data.tag,
      data: { url: data.url || '/' },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of windows) {
      if (new URL(w.url).origin === self.location.origin) {
        await w.focus();
        if (w.url !== target && 'navigate' in w) await w.navigate(target);
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
