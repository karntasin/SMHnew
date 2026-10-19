<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="utf-8">
    <title>เกียรติบัตร {{ $course }}</title>
    <style>
        body { font-family: Tahoma, "Segoe UI", sans-serif; background: #f8fafc; color: #0f172a; }
        .sheet { max-width: 820px; margin: 32px auto; padding: 48px 40px; background: #fff; border: 10px solid #0f766e; text-align: center; }
        h1 { letter-spacing: 2px; color: #0f766e; margin-bottom: 8px; }
        .name { font-size: 32px; margin: 18px 0; }
        .meta { color: #475569; margin-top: 24px; }
    </style>
</head>
<body>
    <div class="sheet">
        <p>โรงพยาบาล</p>
        <h1>เกียรติบัตร</h1>
        <p>มอบให้เพื่อแสดงว่า</p>
        <div class="name">{{ $name }}</div>
        <p>ได้ผ่านการพัฒนาบุคลากรหลักสูตร</p>
        <h2>{{ $course }}</h2>
        <p class="meta">
            จำนวน {{ $hours }} ชั่วโมง<br>
            สำเร็จเมื่อ {{ optional($completedAt)->format('d/m/Y') ?? '-' }}
            @if($expiresAt)
                <br>ใช้ได้ถึง {{ \Illuminate\Support\Carbon::parse($expiresAt)->format('d/m/Y') }}
            @endif
        </p>
    </div>
</body>
</html>
