<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>รายงานเฉลี่ยผู้มารับบริการต่อวันรายแผนก</title>
    <style>
        @font-face {
            font-family: 'sarabun';
            font-style: normal;
            font-weight: normal;
            src: url('{{ $fontRegularUri }}') format('truetype');
        }
        @font-face {
            font-family: 'sarabun';
            font-style: normal;
            font-weight: bold;
            src: url('{{ $fontBoldUri }}') format('truetype');
        }
        @page { margin: 28px 32px 36px 32px; }
        * { box-sizing: border-box; font-family: 'sarabun', sans-serif; }
        body {
            margin: 0;
            color: #0f172a;
            font-size: 11px;
            line-height: 1.45;
            background: #ffffff;
        }
        .hero {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }
        .hero-left {
            width: 68%;
            padding: 14px 16px;
            color: #ffffff;
            background: #1e3a8a;
        }
        .hero-right {
            width: 32%;
            padding: 12px 14px;
            color: #1e3a8a;
            background: #dbeafe;
            text-align: right;
        }
        .eyebrow {
            font-size: 9px;
            letter-spacing: .06em;
            text-transform: uppercase;
            opacity: .86;
            margin-bottom: 3px;
        }
        h1 { margin: 0; font-size: 18px; font-weight: bold; }
        .hero-sub { margin-top: 4px; font-size: 10px; opacity: .92; }
        .report-date { font-size: 13px; font-weight: bold; }
        .report-meta { margin-top: 3px; font-size: 9px; color: #475569; }
        .grid-3 { width: 100%; border-collapse: separate; border-spacing: 8px 0; margin: 0 -8px 12px -8px; }
        .grid-3 td { width: 33.333%; vertical-align: top; padding: 0; }
        .card {
            border: 1px solid #dbe3ef;
            border-radius: 8px;
            padding: 8px 10px;
        }
        .card-blue { background: #eff6ff; border-color: #bfdbfe; }
        .card-violet { background: #f5f3ff; border-color: #ddd6fe; }
        .card-green { background: #ecfdf5; border-color: #bbf7d0; }
        .kpi-label { color: #64748b; font-size: 9px; margin-bottom: 2px; }
        .kpi-value { color: #0f172a; font-size: 16px; font-weight: bold; line-height: 1.15; }
        .kpi-sub { color: #64748b; font-size: 8px; margin-top: 2px; }
        table.data { width: 100%; border-collapse: collapse; }
        table.data th, table.data td { padding: 5px 6px; border: 1px solid #dbe3ef; vertical-align: middle; }
        table.data th { background: #1e3a8a; color: #ffffff; font-size: 10px; font-weight: bold; }
        table.data tr:nth-child(even) td { background: #f8fafc; }
        table.data tfoot td { background: #e0e7ff; font-weight: bold; }
        .num { text-align: right; white-space: nowrap; }
        .center { text-align: center; }
        .note { margin-top: 8px; color: #64748b; font-size: 9px; }
        .footer {
            margin-top: 12px;
            padding-top: 7px;
            border-top: 1px solid #e2e8f0;
            color: #94a3b8;
            text-align: center;
            font-size: 8px;
        }
    </style>
</head>
<body>
@php
    $rows = collect($daily['departments'] ?? [])->values();
    $days = (int) ($daily['days'] ?? 0);
    $total = (float) ($daily['total'] ?? 0);
    $avg = (float) ($daily['avg_per_day'] ?? 0);
    $fmt = fn ($n) => number_format((float) ($n ?? 0));
    $avgFmt = fn ($n) => number_format((float) ($n ?? 0), 1);
    $pct = fn ($part) => $total > 0 ? ((float) $part / $total) * 100 : 0;
@endphp

<table class="hero">
    <tr>
        <td class="hero-left">
            <div class="eyebrow">Department Daily Average</div>
            <h1>รายงานเฉลี่ยผู้มารับบริการต่อวันรายแผนก</h1>
            <div class="hero-sub">จำนวนครั้งที่มารับบริการ (ovst) ÷ จำนวนวันในช่วงที่เลือก</div>
        </td>
        <td class="hero-right">
            <div class="report-date">{{ $startDate }} - {{ $endDate }}</div>
            <div class="report-meta">ออกรายงาน {{ $generatedAt }}</div>
            @if (!empty($appName))
                <div class="report-meta">{{ $appName }}</div>
            @endif
        </td>
    </tr>
</table>

<table class="grid-3">
    <tr>
        <td><div class="card card-blue"><div class="kpi-label">รวมจำนวนครั้ง</div><div class="kpi-value">{{ $fmt($total) }}</div><div class="kpi-sub">ทุกแผนกในช่วงที่เลือก</div></div></td>
        <td><div class="card card-violet"><div class="kpi-label">จำนวนวัน</div><div class="kpi-value">{{ $fmt($days) }}</div><div class="kpi-sub">นับวันเริ่มและวันสิ้นสุด</div></div></td>
        <td><div class="card card-green"><div class="kpi-label">เฉลี่ยทั้งโรงพยาบาล</div><div class="kpi-value">{{ $avgFmt($avg) }}</div><div class="kpi-sub">ครั้งต่อวัน</div></div></td>
    </tr>
</table>

<table class="data">
    <thead>
        <tr>
            <th class="center" style="width: 42px;">ลำดับ</th>
            <th>แผนก</th>
            <th class="num" style="width: 90px;">จำนวนครั้ง</th>
            <th class="num" style="width: 80px;">เฉลี่ย/วัน</th>
            <th class="num" style="width: 70px;">สัดส่วน</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($rows as $index => $row)
            <tr>
                <td class="center">{{ $index + 1 }}</td>
                <td>{{ $row['department'] ?? '-' }}</td>
                <td class="num">{{ $fmt($row['total'] ?? 0) }}</td>
                <td class="num">{{ $avgFmt($row['avg_per_day'] ?? 0) }}</td>
                <td class="num">{{ number_format($pct($row['total'] ?? 0), 1) }}%</td>
            </tr>
        @empty
            <tr>
                <td colspan="5" class="center">ไม่พบข้อมูลผู้มารับบริการในช่วงวันที่ที่เลือก</td>
            </tr>
        @endforelse
    </tbody>
    @if ($rows->isNotEmpty())
        <tfoot>
            <tr>
                <td colspan="2">รวมทั้งหมด</td>
                <td class="num">{{ $fmt($total) }}</td>
                <td class="num">{{ $avgFmt($avg) }}</td>
                <td class="num">100.0%</td>
            </tr>
        </tfoot>
    @endif
</table>

<div class="note">เฉลี่ยต่อวัน = จำนวนครั้งที่มารับบริการของแผนก ÷ {{ $fmt($days) }} วัน</div>
<div class="footer">รายงานสรุปผู้มารับบริการเฉลี่ยต่อวันรายแผนก · ข้อมูลจาก HOSxP</div>
</body>
</html>
