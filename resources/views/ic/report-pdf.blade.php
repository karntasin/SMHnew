<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="utf-8">
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
        @page { margin: 54px 18px 40px 18px; }
        * { box-sizing: border-box; font-family: 'sarabun', DejaVu Sans, sans-serif; }
        body { margin: 0; color: #1f2937; font-size: 11px; line-height: 1.45; }
        .page-header {
            position: fixed; top: -44px; left: 0; right: 0;
            border-bottom: 2px solid #be123c; padding-bottom: 4px;
        }
        .hospital { font-size: 13px; font-weight: bold; color: #9f1239; }
        .hospital-sub { font-size: 8px; color: #64748b; }
        .page-footer {
            position: fixed; bottom: -26px; left: 0; right: 90px;
            border-top: 1px solid #fecdd3; padding-top: 3px;
            font-size: 8px; color: #64748b;
        }
        .hero { width: 100%; border-collapse: collapse; margin: 0 0 10px 0; }
        .hero-left { width: 68%; background: #9f1239; color: #fff; padding: 10px 12px; }
        .hero-right { width: 32%; background: #ffe4e6; color: #9f1239; padding: 10px 12px; text-align: right; }
        .eyebrow { font-size: 8px; letter-spacing: 0.04em; text-transform: uppercase; opacity: 0.85; }
        h1 { margin: 2px 0 0 0; font-size: 16px; }
        .hero-sub { margin-top: 2px; font-size: 9px; opacity: 0.92; }
        .period { font-size: 12px; font-weight: bold; }
        .section { margin-bottom: 12px; }
        .section-break { page-break-before: always; }
        h2 {
            margin: 0 0 6px 0; padding-left: 8px;
            border-left: 4px solid #e11d48; color: #9f1239;
            font-size: 13px;
        }
        .cards { width: 100%; border-collapse: separate; border-spacing: 6px 0; margin-bottom: 8px; }
        .card { border: 1px solid #fecdd3; background: #fff1f2; border-radius: 6px; padding: 6px 8px; }
        .card-label { color: #64748b; font-size: 8px; }
        .card-value { color: #881337; font-size: 13px; font-weight: bold; }
        .card-hint { color: #64748b; font-size: 8px; }
        .bar-row { margin-bottom: 3px; }
        .bar-label { font-size: 8px; color: #475569; }
        .bar-track { height: 7px; background: #ffe4e6; border-radius: 4px; }
        .bar-fill { height: 7px; background: #e11d48; border-radius: 4px; }
        table.data { width: 100%; border-collapse: collapse; margin-top: 6px; }
        table.data th, table.data td {
            border: 1px solid #e2e8f0; padding: 3px 4px;
            font-size: 8.5px; vertical-align: top; word-wrap: break-word;
        }
        table.data th { background: #fff1f2; color: #9f1239; text-align: left; }
        table.data tr { page-break-inside: avoid; }
        .empty { color: #94a3b8; font-size: 9px; padding: 4px 0; }
    </style>
</head>
<body>
    <div class="page-header">
        <div class="hospital">{{ $hospitalName }}</div>
        <div class="hospital-sub">ศูนย์พัฒนาคุณภาพ · ป้องกันและควบคุมการติดเชื้อ (IC)</div>
    </div>
    <div class="page-footer">จัดทำเมื่อ {{ $document['generated_at'] }} · ใช้ภายในโรงพยาบาล</div>

    <table class="hero">
        <tr>
            <td class="hero-left">
                <div class="eyebrow">Infection Control Report</div>
                <h1>{{ $document['title'] }}</h1>
                <div class="hero-sub">รายงานสำหรับติดตามเฝ้าระวัง อุบัติการณ์ และการปฏิบัติตามมาตรการ IC</div>
            </td>
            <td class="hero-right">
                <div class="eyebrow">ช่วงข้อมูล</div>
                <div class="period">{{ $document['start'] }} – {{ $document['end'] }}</div>
            </td>
        </tr>
    </table>

    @foreach ($document['sections'] as $index => $section)
        <div class="section {{ $index > 0 && $document['module'] === 'overview' ? 'section-break' : '' }}">
            <h2>{{ $section['title'] }}</h2>
            @if (!empty($section['kpis']))
                <table class="cards">
                    <tr>
                        @foreach ($section['kpis'] as $kpi)
                            <td class="card" style="width: {{ round(100 / max(count($section['kpis']), 1), 2) }}%;">
                                <div class="card-label">{{ $kpi['label'] }}</div>
                                <div class="card-value">{{ $kpi['value'] }}</div>
                                <div class="card-hint">{{ $kpi['hint'] }}</div>
                            </td>
                        @endforeach
                    </tr>
                </table>
            @endif

            @if (!empty($section['bars']))
                @php $maxBar = max(collect($section['bars'])->max('value') ?: 0, 1); @endphp
                @foreach ($section['bars'] as $bar)
                    <div class="bar-row">
                        <div class="bar-label">{{ $bar['label'] }} · {{ $bar['value'] }}{{ $bar['suffix'] ?? '' }}</div>
                        <div class="bar-track">
                            <div class="bar-fill" style="width: {{ round(($bar['value'] / $maxBar) * 100, 1) }}%;"></div>
                        </div>
                    </div>
                @endforeach
            @endif

            @if (!empty($section['rows']))
                <table class="data">
                    <thead>
                        <tr>
                            @foreach ($section['columns'] as $column)
                                <th>{{ $column }}</th>
                            @endforeach
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($section['rows'] as $row)
                            <tr>
                                @foreach ($row as $cell)
                                    <td>{{ $cell }}</td>
                                @endforeach
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @else
                <div class="empty">ไม่มีรายการในช่วงวันที่ที่เลือก</div>
            @endif
        </div>
    @endforeach
</body>
</html>
