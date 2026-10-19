/* S-Chat service worker — push, badge, notification click */
const SW_VERSION = 's-chat-sw-v7';
const ICON_URL = '/icons/s-chat-192.png';
const BADGE_URL = '/icons/badge-96.png?v=3';
let activeConversationId = '';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

async function applyBadge(count) {
  const n = Number(count) || 0;
  try {
    if (n > 0 && self.registration.setAppBadge) {
      await self.registration.setAppBadge(n);
    } else if (self.registration.clearAppBadge) {
      await self.registration.clearAppBadge();
    }
  } catch (_) {
    /* launcher may not support badges */
  }
}

function notificationOptions(data) {
  return {
    body: data.body || '',
    icon: ICON_URL,
    badge: BADGE_URL,
    tag: data.tag || 'org-chat',
    renotify: true,
    silent: false,
    vibrate: [120, 60, 120],
    data: { url: data.url || '/chat' },
  };
}

function clientIsFocused(client) {
  return Boolean(client && client.focused);
}

function shouldShowNotification(data, windowClients) {
  const focused = windowClients.some(clientIsFocused);
  if (!focused) return true;
  const incoming = String(data.conversationId || '');
  if (!incoming) return false;
  return String(activeConversationId) !== incoming;
}

async function showChatNotification(title, data) {
  const full = notificationOptions(data);
  try {
    await self.registration.showNotification(title, full);
  } catch (_) {
    await self.registration.showNotification(title, {
      body: full.body,
      icon: full.icon,
      tag: full.tag,
      data: full.data,
    });
  }
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: 'S-Chat', body: event.data ? event.data.text() : '' };
  }
  const unread = Number.isFinite(Number(data.unread)) ? Number(data.unread) : 1;
  event.waitUntil((async () => {
    if (data.kind === 'unsent') {
      const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      windowClients.forEach((client) => client.postMessage({
        type: 'MESSAGE_UNSENT',
        conversationId: data.conversationId || '',
        messageId: data.messageId || '',
      }));
      if (Number.isFinite(Number(data.unread))) await applyBadge(Number(data.unread));
      return;
    }
    await applyBadge(unread);
    if (unread <= 0) {
      const notes = await self.registration.getNotifications();
      notes.forEach((note) => note.close());
      return;
    }
    const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    windowClients.forEach((client) => client.postMessage({
      type: 'PUSH_MESSAGE',
      conversationId: data.conversationId || '',
      tag: data.tag || '',
    }));
    if (!shouldShowNotification(data, windowClients)) return;
    await showChatNotification(data.title || 'S-Chat', data);
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || '/chat';
  let conversationId = '';
  try {
    conversationId = new URL(targetUrl, self.location.origin).searchParams.get('open') || '';
  } catch (_) {
    conversationId = '';
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({ type: 'OPEN_CHAT', url: targetUrl, conversationId });
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
  if (data.type === 'ACTIVE_CHAT') {
    activeConversationId = String(data.conversationId || '');
  }
  if (data.type === 'SET_BADGE') {
    event.waitUntil(applyBadge(Number(data.count) || 0));
  }
  if (data.type === 'CLOSE_NOTIFY') {
    const tag = String(data.tag || '');
    event.waitUntil((async () => {
      const notes = await self.registration.getNotifications(tag ? { tag } : undefined);
      notes.forEach((note) => note.close());
    })());
  }
  if (data.type === 'SHOW_NOTIFY') {
    event.waitUntil(
      showChatNotification(data.title || 'S-Chat', {
        body: data.body || '',
        tag: data.tag || 'org-chat',
        url: data.url || '/chat',
      })
    );
  }
});

void SW_VERSION;
