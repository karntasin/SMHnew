/* S-Chat service worker — push, badge, notification click */
const SW_VERSION = 's-chat-sw-v11';
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
  const n = Math.max(0, Number(count) || 0);
  // iOS Home Screen PWA: setAppBadge จาก SW ระหว่าง push event เชื่อถือได้ที่สุด
  try {
    if (n > 0) {
      if (self.registration.setAppBadge) {
        await self.registration.setAppBadge(n);
        return;
      }
      if (self.navigator && self.navigator.setAppBadge) {
        await self.navigator.setAppBadge(n);
        return;
      }
    } else {
      if (self.registration.clearAppBadge) {
        await self.registration.clearAppBadge();
        return;
      }
      if (self.navigator && self.navigator.clearAppBadge) {
        await self.navigator.clearAppBadge();
      }
    }
  } catch (_) {
    // fallback: จุดแดงไม่มีตัวเลข (บางเวอร์ชัน iOS)
    try {
      if (n > 0 && self.registration.setAppBadge) await self.registration.setAppBadge();
      else if (n <= 0 && self.registration.clearAppBadge) await self.registration.clearAppBadge();
    } catch (_2) { /* launcher may not support badges */ }
  }
}

/**
 * iOS Safari ไม่รองรับ vibrate, renotify, silent ใน notification options
 * ต้องตรวจ UA แล้วลบ options ที่ไม่รองรับออก มิฉะนั้น showNotification() จะ throw
 */
function isIosUserAgent() {
  try {
    var ua = (self.navigator && self.navigator.userAgent) || '';
    return /iPhone|iPad|iPod/i.test(ua);
  } catch (_) {
    return false;
  }
}

function notificationOptions(data) {
  const opts = {
    body: data.body || '',
    icon: ICON_URL,
    badge: BADGE_URL,
    tag: data.tag || 'org-chat',
    data: { url: data.url || '/chat' },
  };
  // vibrate, renotify, silent ไม่รองรับบน iOS — ใส่เฉพาะ non-iOS
  if (!isIosUserAgent()) {
    opts.renotify = true;
    opts.silent = false;
    opts.vibrate = [120, 60, 120];
  }
  return opts;
}

/** true เฉพาะเมื่อหน้าต่างกำลังถูกมองอยู่ — iOS PWA อาจค้าง focused=true ตอนอยู่พื้นหลัง */
function clientIsActivelyViewing(client) {
  if (!client) return false;
  if (client.visibilityState === 'hidden') return false;
  return Boolean(client.focused);
}

function shouldShowNotification(data, windowClients) {
  const viewing = windowClients.some(clientIsActivelyViewing);
  if (!viewing) return true;
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
  // หลังโชว์แจ้งเตือน บังคับอัปเดตจุดแดงอีกครั้ง (iOS)
  if (data && data.unread != null) {
    await applyBadge(data.unread);
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
      kind: data.kind || 'message',
      conversationId: data.conversationId || '',
      messageId: data.messageId || '',
      tag: data.tag || '',
      title: data.title || 'S-Chat',
      body: data.body || '',
      unread: Number.isFinite(Number(data.unread)) ? Number(data.unread) : undefined,
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
