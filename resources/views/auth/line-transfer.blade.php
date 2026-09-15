<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>เข้าสู่ระบบ LINE สำเร็จ</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #eff6ff;
            font-family: 'Sarabun', 'Segoe UI', sans-serif;
            padding: 24px;
        }
        .card {
            width: 100%;
            max-width: 420px;
            background: #fff;
            border-radius: 16px;
            padding: 32px 24px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
        }
        h1 { margin: 0 0 8px; font-size: 20px; color: #0f172a; }
        p { margin: 0; color: #64748b; font-size: 14px; line-height: 1.6; }
        a {
            display: inline-block;
            margin-top: 16px;
            padding: 12px 20px;
            border-radius: 10px;
            background: #2563eb;
            color: #fff;
            text-decoration: none;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>ยืนยัน LINE สำเร็จ</h1>
        @if (!empty($displayName))
            <p style="margin-top: 8px; color: #334155; font-weight: 600;">{{ $displayName }}</p>
        @endif
        <p style="margin-top: 12px;">กำลังพากลับไปยังระบบภายในโรงพยาบาล...</p>
        <p style="margin-top: 8px; font-size: 13px;">ต้องเชื่อมต่อ Wi‑Fi โรงพยาบาลเพื่อเข้าใช้งานต่อ</p>
        <a href="{{ $transferUrl }}">กดที่นี่ถ้าไม่เปลี่ยนหน้าอัตโนมัติ</a>
    </div>
    <script>
        window.location.replace(@json($transferUrl));
    </script>
</body>
</html>
