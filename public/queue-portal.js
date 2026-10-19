(function () {
    var root = document.getElementById('queue-portal');
    if (!root) return;

    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var standalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

    function text(id, value) {
        var node = document.getElementById(id);
        if (node) node.textContent = value;
    }

    function show(id, visible) {
        var node = document.getElementById(id);
        if (node) node.hidden = !visible;
    }

    function renderSteps(steps) {
        var list = document.getElementById('steps');
        if (!list) return;
        list.replaceChildren();
        (steps || []).forEach(function (step) {
            var item = document.createElement('li');
            item.className = 'step step-' + (step.state || 'waiting');
            var name = document.createElement('strong');
            name.textContent = step.label || '';
            var detail = document.createElement('span');
            detail.textContent = step.detail || '';
            item.append(name, detail);
            list.append(item);
        });
    }

    function apply(data) {
        if (!data || data.error === 'unavailable') {
            show('unavailable', true);
            show('board', false);
            return;
        }
        show('unavailable', false);
        if (!data.found) {
            show('missing', true);
            show('board', false);
            return;
        }
        show('missing', false);
        show('board', true);
        text('queue-number', data.oqueue || '');
        text('remaining', data.remaining === null || data.remaining === undefined ? '–' : String(data.remaining));
        text('room-name', data.room_name || '');
        text('calling-room', data.room_name || '');
        text('contact-text', data.contact_text || '');
        text('pharmacy-text', data.pharmacy_text || '');
        show('contact-banner', !!data.contact_text);
        show('calling-banner', !!data.is_calling);
        renderSteps(data.steps);
    }

    function tick() {
        fetch(root.dataset.statusUrl, { headers: { 'Accept': 'application/json' }, cache: 'no-store' })
            .then(function (response) { return response.json(); })
            .then(apply)
            .catch(function () { show('unavailable', true); });
    }

    tick();
    setInterval(tick, 5000);

    function urlBase64ToUint8Array(base64String) {
        var padding = '='.repeat((4 - base64String.length % 4) % 4);
        var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        var raw = atob(base64);
        var output = new Uint8Array(raw.length);
        for (var i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
        return output;
    }

    var button = document.getElementById('enable-push');
    var note = document.getElementById('push-note');
    var iosSteps = document.getElementById('ios-steps');
    if (ios && !standalone) {
        if (button) button.hidden = true;
        if (note) note.hidden = true;
        if (iosSteps) iosSteps.hidden = false;
    } else if (ios && standalone && note && root.dataset.pushConfigured === '1') {
        note.textContent = 'กดอนุญาตเมื่อ iPhone ถาม';
    }
    if (!button || root.dataset.pushConfigured !== '1') return;

    button.addEventListener('click', function () {
        button.disabled = true;
        enablePush().finally(function () { button.disabled = false; });
    });

    function enablePush() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
            if (note) note.textContent = 'เบราว์เซอร์นี้ยังไม่รองรับการแจ้งเตือน กรุณาใช้ Chrome หรือเปิดจากหน้าโฮมบน iPhone';
            return Promise.resolve();
        }

        return Notification.requestPermission().then(function (permission) {
            if (permission !== 'granted') {
                if (note) note.textContent = 'ยังไม่ได้เปิดสิทธิ์แจ้งเตือน';
                return;
            }
            return navigator.serviceWorker.register(root.dataset.swUrl).then(function (registration) {
                return fetch(root.dataset.keyUrl, { headers: { 'Accept': 'application/json' } })
                    .then(function (response) { return response.json(); })
                    .then(function (key) {
                        return registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: urlBase64ToUint8Array(key.key),
                        });
                    });
            }).then(function (subscription) {
                var token = document.querySelector('meta[name="csrf-token"]');
                return fetch(root.dataset.pushUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': token ? token.content : '',
                    },
                    body: JSON.stringify(subscription),
                });
            }).then(function (response) {
                if (!response.ok) throw new Error('subscribe failed');
                if (note) note.textContent = 'เปิดการแจ้งเตือนแล้ว ปิดหน้าจอได้ จะแจ้งเมื่อเหลือไม่เกิน 3 คิวและเมื่อถึงคิว';
            }).catch(function () {
                if (note) note.textContent = 'เปิดการแจ้งเตือนไม่สำเร็จ ลองใหม่อีกครั้ง';
            });
        });
    }
})();
