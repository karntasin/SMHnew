self.addEventListener('push', function (event) {
    var data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = { title: 'คิวของท่าน', body: event.data ? event.data.text() : '' };
    }

    event.waitUntil(self.registration.showNotification(data.title || 'คิวของท่าน', {
        body: data.body || '',
        data: { url: data.url || '/q' },
        tag: data.tag || 'queue-portal',
        renotify: true,
    }));
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    var target = (event.notification.data && event.notification.data.url) || '/queue';
    event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
        for (var i = 0; i < windowClients.length; i++) {
            var client = windowClients[i];
            if (client.url.indexOf(target) !== -1 && 'focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(target);
    }));
});
