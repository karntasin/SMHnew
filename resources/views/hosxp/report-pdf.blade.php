<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>{{ $title }}</title>
    <style>
        @font-face {
            font-family: 'sarabun';
            font-weight: normal;
            src: url('{{ $fontRegularUri }}') format('truetype');
        }
        @font-face {
            font-family: 'sarabun';
            font-weight: bold;
            src: url('{{ $fontBoldUri }}') format('truetype');
        }
        @page { margin: 24px 28px; }
        * { font-family: 'sarabun', sans-serif; box-sizing: border-box; }
        body { font-size: 10px; color: #111827; }
        h1 { font-size: 16px; margin: 0 0 6px; color: #0f766e; font-weight: bold; }
        .meta { font-size: 9px; color: #6b7280; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #d1d5db; padding: 4px 6px; text-align: left; vertical-align: top; }
        th { background: #dbeafe; font-weight: bold; font-size: 9px; }
        td { font-size: 9px; word-break: break-word; }
        .note { margin-top: 10px; font-size: 9px; color: #6b7280; }
    </style>
</head>
<body>
    <h1>{{ $title }}</h1>
    <div class="meta">
        ช่วงวันที่: {{ $startDate }} ถึง {{ $endDate }} |
        ออกรายงาน: {{ $generatedAt }} |
        จำนวน: {{ number_format($total) }} รายการ
    </div>

    <table>
        <thead>
            <tr>
                @foreach ($headers as $header)
                    <th>{{ $header }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse ($rows as $row)
                <tr>
                    @foreach ($row as $cell)
                        <td>{{ $cell }}</td>
                    @endforeach
                </tr>
            @empty
                <tr><td colspan="{{ count($headers) }}">ไม่พบข้อมูล</td></tr>
            @endforelse
        </tbody>
    </table>

    @if ($truncated)
        <p class="note">* แสดงสูงสุด 500 แถวใน PDF — ใช้ Excel สำหรับข้อมูลเต็ม</p>
    @endif
</body>
</html>
