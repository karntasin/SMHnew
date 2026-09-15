/* FSHH Chat service worker — badge + notification click (no full offline cache) */
const SW_VERSION = 'fshh-chat-sw-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || '/chat';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if (client.url && 'navigate' in client) {
            try {
              client.navigate(targetUrl);
            } catch (_) {
              /* ignore */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SET_BADGE') {
    const n = Number(data.count) || 0;
    if (n > 0 && self.registration.setAppBadge) {
      self.registration.setAppBadge(n).catch(() => {});
    } else if (self.registration.clearAppBadge) {
      self.registration.clearAppBadge().catch(() => {});
    }
  }
  if (data.type === 'SHOW_NOTIFY') {
    const title = data.title || 'FSHH Chat';
    const options = {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'org-chat',
      renotify: true,
      vibrate: [120, 60, 120],
      data: { url: data.url || '/chat' },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});
