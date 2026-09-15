<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ยืนยัน LINE สำเร็จ</title>
    @if (!empty($continueUrl))
        <meta http-equiv="refresh" content="2;url={{ $continueUrl }}">
    @endif
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ecfdf5;
            font-family: 'Sarabun', 'Segoe UI', sans-serif;
            padding: 24px;
        }
        .card {
            width: 100%;
            max-width: 360px;
            background: #fff;
            border-radius: 16px;
            padding: 32px 24px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
        }
        .icon {
            width: 56px;
            height: 56px;
            margin: 0 auto 16px;
            border-radius: 50%;
            background: #d1fae5;
            color: #059669;
            font-size: 28px;
            line-height: 56px;
        }
        h1 { margin: 0 0 8px; font-size: 20px; color: #0f172a; }
        p { margin: 0; color: #64748b; font-size: 14px; line-height: 1.6; }
        .name { margin-top: 8px; color: #334155; font-weight: 600; }
        a.continue {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 20px;
            border-radius: 10px;
            background: #06C755;
            color: #fff;
            text-decoration: none;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">✓</div>
        <h1>ยืนยัน LINE สำเร็จ</h1>
        @if (!empty($displayName))
            <p class="name">{{ $displayName }}</p>
        @endif
        <p id="status" style="margin-top: 12px;">
            @if (($intent ?? '') === 'register')
                กำลังไปหน้ากรอกข้อมูลผู้ใช้...
            @else
                กำลังเข้าสู่ระบบ...
            @endif
        </p>
        @if (!empty($continueUrl))
            <a class="continue" href="{{ $continueUrl }}">ไปต่อที่นี่</a>
        @endif
    </div>
    <script>
        (function () {
            var continueUrl = @json($continueUrl ?? '');
            var hasOpener = false;
            try {
                hasOpener = !!(window.opener && !window.opener.closed && window.opener.location.origin === window.location.origin);
            } catch (e) {
                hasOpener = false;
            }

            if (hasOpener) {
                try {
                    window.opener.postMessage({ type: 'line-qr-ready' }, '*');
                } catch (e) {}
                document.getElementById('status').textContent = 'ยืนยันแล้ว สามารถปิดหน้านี้ได้';
                setTimeout(function () {
                    window.close();
                }, 800);
                return;
            }

            if (continueUrl) {
                window.location.replace(continueUrl);
            }
        })();
    </script>
</body>
</html>
