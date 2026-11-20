// SMH & Calendar App Service Worker for Android & iOS PWA
const CACHE_NAME = 'smh-pwa-v4';
const STATIC_ASSETS = [
  '/logosmh.png',
  '/manifest.json',
  '/calendar-manifest.webmanifest',
  '/icons/calendar-192.png',
  '/icons/calendar-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).catch((err) => {
      console.warn('Pre-caching non-critical static assets skipped', err);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-first strategy ONLY for Calendar PWA and basic static assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  // Never intercept Inertia AJAX requests, JSON API calls, or backend ERP modules
  const isInertia = event.request.headers.get('X-Inertia') === 'true';
  const acceptHeader = event.request.headers.get('Accept') || '';
  if (isInertia || acceptHeader.includes('application/json')) {
    return;
  }

  const url = new URL(event.request.url);

  // Skip all dynamic ERP, Finance, RCM, Auth, Dev, and API endpoints
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/rcm') ||
    url.pathname.startsWith('/finance') ||
    url.pathname.startsWith('/tv') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/im') ||
    url.pathname.startsWith('/hrd') ||
    url.pathname.startsWith('/quality') ||
    url.pathname.startsWith('/maintenance') ||
    url.pathname.startsWith('/vehicles') ||
    url.pathname.startsWith('/documents') ||
    url.pathname.startsWith('/rdu') ||
    url.pathname.startsWith('/drug-usage') ||
    url.pathname.startsWith('/firewall') ||
    url.pathname.startsWith('/server-monitor') ||
    url.pathname.startsWith('/dev') ||
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/logout') ||
    url.pathname.startsWith('/sanctum') ||
    url.pathname.startsWith('/calendar/events')
  ) {
    return;
  }

  // Only handle Calendar PWA views and static assets
  const isCalendar = url.pathname.startsWith('/calendar') || url.pathname.startsWith('/cal');
  const isStaticAsset = url.pathname.startsWith('/icons/') ||
                        url.pathname.startsWith('/build/') ||
                        url.pathname.startsWith('/images/') ||
                        /\.(png|jpe?g|svg|ico|webmanifest|json|woff2?|ttf|css|js)$/i.test(url.pathname);

  if (!isCalendar && !isStaticAsset) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful GET requests for offline fallback
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) {
          return cached;
        }
        // Must return a valid Response instance; returning undefined causes "Failed to convert value to 'Response'"
        return new Response('Offline: Resource not available in cache.', {
          status: 504,
          statusText: 'Gateway Timeout',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      })
  );
});

// Push & Notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'แจ้งเตือนกำหนดการ FSHH';
    const options = {
      body: data.message || '',
      icon: '/logosmh.png',
      badge: '/logosmh.png',
      data: data.url || '/calendar',
      vibrate: [200, 100, 200],
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (e) {
    console.error('Error handling push event', e);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data || '/calendar';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
