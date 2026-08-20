<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ยืนยัน LINE สำเร็จ</title>
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
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">✓</div>
        <h1>ยืนยัน LINE สำเร็จ</h1>
        @if (!empty($displayName))
            <p class="name">{{ $displayName }}</p>
        @endif
        <p style="margin-top: 12px;">กำลังกลับไปหน้าเข้าสู่ระบบ...</p>
        <p style="margin-top: 8px; font-size: 13px;">ถ้าหน้าต่างไม่ปิดเอง ให้ปิดแล้วกลับไปที่คอมพิวเตอร์ที่แสดง QR</p>
    </div>
    <script>
        (function () {
            if (window.opener && !window.opener.closed) {
                try {
                    window.opener.postMessage({ type: 'line-qr-ready' }, '*');
                } catch (e) {}
            }
            setTimeout(function () {
                window.close();
            }, 800);
        })();
    </script>
</body>
</html>
