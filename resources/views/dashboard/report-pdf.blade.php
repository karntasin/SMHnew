<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>Dashboard Summary</title>
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
        @page { margin: 22px 26px 30px 26px; }
        * { box-sizing: border-box; font-family: 'sarabun', sans-serif; }
        body {
            margin: 0;
            color: #0f172a;
            font-size: 10px;
            line-height: 1.42;
            background: #ffffff;
        }
        .hero {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            border-radius: 12px;
            overflow: hidden;
        }
        .hero-left {
            width: 66%;
            padding: 13px 16px;
            color: #ffffff;
            background: #1e3a8a;
        }
        .hero-right {
            width: 34%;
            padding: 12px 14px;
            color: #1e3a8a;
            background: #dbeafe;
            text-align: right;
        }
        .eyebrow {
            font-size: 9px;
            letter-spacing: .08em;
            text-transform: uppercase;
            opacity: .86;
            margin-bottom: 3px;
        }
        h1 { margin: 0; font-size: 21px; font-weight: bold; }
        .hero-sub { margin-top: 4px; font-size: 10px; opacity: .9; }
        .report-date { font-size: 15px; font-weight: bold; }
        .report-meta { margin-top: 3px; font-size: 9px; color: #475569; }
        h2 {
            margin: 0 0 7px 0;
            padding-left: 8px;
            border-left: 4px solid #2563eb;
            color: #1e3a8a;
            font-size: 13px;
            font-weight: bold;
        }
        .section { margin-bottom: 11px; page-break-inside: avoid; }
        .section-break { page-break-before: always; }
        .grid-4, .grid-3, .grid-2 { width: 100%; border-collapse: separate; border-spacing: 7px 0; margin: 0 -7px 10px -7px; }
        .grid-4 td { width: 25%; vertical-align: top; padding: 0; }
        .grid-3 td { width: 33.333%; vertical-align: top; padding: 0; }
        .grid-2 td { width: 50%; vertical-align: top; padding: 0; }
        .card {
            border: 1px solid #dbe3ef;
            border-radius: 10px;
            background: #ffffff;
            padding: 9px 10px;
        }
        .card-blue { background: #eff6ff; border-color: #bfdbfe; }
        .card-green { background: #ecfdf5; border-color: #bbf7d0; }
        .card-amber { background: #fffbeb; border-color: #fde68a; }
        .card-rose { background: #fff1f2; border-color: #fecdd3; }
        .card-violet { background: #f5f3ff; border-color: #ddd6fe; }
        .kpi-label { color: #64748b; font-size: 8.5px; margin-bottom: 3px; }
        .kpi-value { color: #0f172a; font-size: 17px; font-weight: bold; line-height: 1.1; }
        .kpi-sub { color: #64748b; font-size: 8px; margin-top: 3px; }
        .panel {
            border: 1px solid #dbe3ef;
            border-radius: 10px;
            background: #ffffff;
            padding: 10px 11px;
        }
        .panel-soft { background: #f8fafc; }
        .chart-title { font-size: 11px; font-weight: bold; color: #334155; margin-bottom: 6px; }
        .legend { margin-top: 5px; color: #475569; font-size: 8px; }
        .legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 4px; margin-right: 3px; }
        .opd { background: #2563eb; }
        .ipd { background: #7c3aed; }
        .er { background: #dc2626; }
        .low { background: #16a34a; }
        .moderate { background: #eab308; }
        .high { background: #f97316; }
        .very-high { background: #e11d48; }
        .critical { background: #881337; }
        table.data { width: 100%; border-collapse: collapse; margin: 0; }
        table.data th, table.data td { padding: 4px 5px; border: 1px solid #dbe3ef; vertical-align: middle; }
        table.data th { background: #1e3a8a; color: #ffffff; font-size: 8.5px; font-weight: bold; }
        table.data tr:nth-child(even) td { background: #f8fafc; }
        .num { text-align: right; white-space: nowrap; }
        .muted { color: #64748b; font-size: 8px; }
        .mini { font-size: 8px; }
        .bar-track {
            width: 100%;
            height: 8px;
            background: #e2e8f0;
            border-radius: 5px;
            overflow: hidden;
        }
        .bar-fill {
            height: 8px;
            border-radius: 5px;
        }
        .bar-label-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
        .bar-label-table td { padding: 0 0 3px 0; border: 0; }
        .bar-name { color: #334155; font-size: 8.5px; }
        .bar-value { color: #0f172a; font-size: 8.5px; font-weight: bold; text-align: right; }
        .stack { width: 100%; height: 12px; border-radius: 6px; overflow: hidden; background: #e2e8f0; }
        .stack span { display: inline-block; height: 12px; }
        .line-card {
            border: 1px solid #dbe3ef;
            border-radius: 8px;
            background: #f8fafc;
            padding: 6px 7px 4px 7px;
            margin-bottom: 6px;
        }
        .line-head {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 2px;
        }
        .line-head td {
            border: 0;
            padding: 0;
        }
        .line-title {
            font-size: 9px;
            font-weight: bold;
            color: #334155;
        }
        .line-stat {
            text-align: right;
            color: #64748b;
            font-size: 8px;
        }
        .pill {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 999px;
            background: #dbeafe;
            color: #1e40af;
            font-size: 8px;
            margin-right: 3px;
        }
        .footer {
            margin-top: 10px;
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
    $summary = $stats['summary'] ?? [];
    $charts = $stats['charts'] ?? [];
    $today = $summary['today'] ?? [];
    $beds = $today['beds'] ?? [];
    $payment = $today['payment'] ?? [];
    $cv = $charts['cv_risk_summary'] ?? [];
    $visits = collect($charts['visits_year_trend'] ?? [])->values();
    $departments = collect($charts['department_visits_this_month'] ?? [])->values();
    $cvDist = collect($charts['cv_risk_scores_monthly'] ?? [])->values();
    $cvHigh = collect($charts['cv_risk_high_monthly'] ?? [])->values();
    $fmt = fn ($n) => number_format((float) ($n ?? 0));
    $money = fn ($n) => number_format((float) ($n ?? 0), 0).' บาท';
    $get = fn ($row, $key, $default = null) => is_array($row) ? ($row[$key] ?? $default) : ($row->$key ?? $default);
    $pct = fn ($part, $total) => (float) $total > 0 ? max(0, min(100, ((float) $part / (float) $total) * 100)) : 0;
    $maxVisit = max(1, (float) $visits->flatMap(fn ($row) => [
        (float) $get($row, 'opd', 0),
        (float) $get($row, 'ipd', 0),
        (float) $get($row, 'er', 0),
    ])->max());
    $chartLeft = 56;
    $chartRight = 620;
    $chartTop = 32;
    $chartBottom = 170;
    $chartHeight = $chartBottom - $chartTop;
    $plot = function ($key) use ($visits, $get, $maxVisit, $chartLeft, $chartRight, $chartBottom, $chartHeight) {
        $count = max(1, $visits->count());
        return $visits->map(function ($row, $index) use ($key, $count, $get, $maxVisit, $chartLeft, $chartRight, $chartBottom, $chartHeight) {
            $x = $count > 1 ? $chartLeft + (($index / ($count - 1)) * ($chartRight - $chartLeft)) : (($chartLeft + $chartRight) / 2);
            $y = $chartBottom - (((float) $get($row, $key, 0) / $maxVisit) * $chartHeight);
            return round($x, 2).','.round($y, 2);
        })->implode(' ');
    };
    $thaiMonthShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    $monthShortLabel = function ($row) use ($get, $thaiMonthShort) {
        $m = (int) $get($row, 'm', 0);
        if ($m >= 1 && $m <= 12) {
            return $thaiMonthShort[$m - 1];
        }

        $label = (string) $get($row, 'label', '');
        if (preg_match('/(\d{4})-(\d{2})/', $label, $matches)) {
            $month = (int) $matches[2];
            return $thaiMonthShort[$month - 1] ?? $label;
        }

        return explode(' ', $label)[0] ?? $label;
    };
    $seriesMax = fn ($key) => max(1, (float) $visits->max(fn ($row) => (float) $get($row, $key, 0)));
    $seriesSum = fn ($key) => (float) $visits->sum(fn ($row) => (float) $get($row, $key, 0));
    $lineLeft = 36;
    $lineRight = 676;
    $lineTop = 14;
    $lineBottom = 48;
    $lineHeight = $lineBottom - $lineTop;
    $seriesLine = function ($key, $max) use ($visits, $get, $lineLeft, $lineRight, $lineBottom, $lineHeight) {
        $count = max(1, $visits->count());

        return $visits->map(function ($row, $index) use ($key, $max, $count, $get, $lineLeft, $lineRight, $lineBottom, $lineHeight) {
            $x = $count > 1 ? $lineLeft + (($index / ($count - 1)) * ($lineRight - $lineLeft)) : (($lineLeft + $lineRight) / 2);
            $y = $lineBottom - (((float) $get($row, $key, 0) / max(1, $max)) * $lineHeight);

            return round($x, 2).','.round($y, 2);
        })->implode(' ');
    };
    $visitSeries = [
        ['key' => 'opd', 'name' => 'OPD', 'label' => 'ผู้ป่วยนอก', 'color' => '#2563eb', 'max' => $seriesMax('opd'), 'total' => $seriesSum('opd')],
        ['key' => 'ipd', 'name' => 'IPD', 'label' => 'ผู้ป่วยใน', 'color' => '#7c3aed', 'max' => $seriesMax('ipd'), 'total' => $seriesSum('ipd')],
        ['key' => 'er', 'name' => 'ER', 'label' => 'ฉุกเฉิน', 'color' => '#dc2626', 'max' => $seriesMax('er'), 'total' => $seriesSum('er')],
    ];
    $totalVisits = (float) ($summary['opd'] ?? 0) + (float) ($summary['ipd'] ?? 0) + (float) ($summary['er'] ?? 0);
    $departmentTotal = max(1, (float) $departments->sum(fn ($row) => (float) $get($row, 'total', 0)));
    $departmentMax = max(1, (float) $departments->max(fn ($row) => (float) $get($row, 'total', 0)));
    $paymentTotal = max(1, (float) ($payment['total'] ?? 0));
    $freeBeds = (float) ($beds['free'] ?? 0);
    $totalBeds = max(1, (float) ($beds['total'] ?? 0));
@endphp

<table class="hero">
    <tr>
        <td class="hero-left">
            <div class="eyebrow">Hospital Executive Dashboard</div>
            <h1>รายงานสรุปภาพรวมโรงพยาบาล</h1>
            <div class="hero-sub">ข้อมูลจาก HOSxP และระบบสนับสนุนงานบริการ</div>
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

<div class="section">
    <table class="grid-4">
        <tr>
            <td><div class="card card-blue"><div class="kpi-label">OPD ทั้งหมด</div><div class="kpi-value">{{ $fmt($summary['opd'] ?? 0) }}</div><div class="kpi-sub">ครั้งในช่วงที่เลือก</div></div></td>
            <td><div class="card card-violet"><div class="kpi-label">IPD ทั้งหมด</div><div class="kpi-value">{{ $fmt($summary['ipd'] ?? 0) }}</div><div class="kpi-sub">admission/visit</div></div></td>
            <td><div class="card card-rose"><div class="kpi-label">ER ทั้งหมด</div><div class="kpi-value">{{ $fmt($summary['er'] ?? 0) }}</div><div class="kpi-sub">แยกจาก OPD แล้ว</div></div></td>
            <td><div class="card card-green"><div class="kpi-label">ค่ารักษารวม</div><div class="kpi-value">{{ $money($summary['cost_total'] ?? 0) }}</div><div class="kpi-sub">ยอดบริการในช่วงรายงาน</div></div></td>
        </tr>
    </table>
</div>

<div class="section">
    <div class="panel">
        <h2>การเข้ารับบริการปีนี้</h2>
        <div class="chart-title">
            กราฟเส้น OPD / IPD / ER รายเดือน
            <span class="pill">ค่าสูงสุด {{ $fmt($maxVisit) }} ครั้ง</span>
            <span class="pill">LINE-CHART PDF v2</span>
        </div>
        @if (!empty($visitTrendChartUri))
            <img src="{{ $visitTrendChartUri }}" alt="OPD IPD ER line chart" style="display:block;width:100%;height:auto;border:0;margin:4px 0 2px 0;">
        @else
            <div class="muted">ไม่มีข้อมูลสำหรับแสดงกราฟเส้น</div>
        @endif
        <div class="legend">
            <span class="legend-dot opd"></span>OPD
            &nbsp;&nbsp;<span class="legend-dot ipd"></span>IPD
            &nbsp;&nbsp;<span class="legend-dot er"></span>ER
            <span class="muted"> ใช้สเกลเดียวกันเพื่อเทียบปริมาณจริงระหว่างประเภทบริการ</span>
        </div>
    </div>
</div>

<div class="section">
    <div class="panel">
                    <h2>ข้อมูลวันนี้และสถานะเตียง</h2>
                    <table class="grid-3" style="margin-bottom: 8px;">
                        <tr>
                            <td><div class="card card-blue"><div class="kpi-label">ส่งต่อวันนี้</div><div class="kpi-value">{{ $fmt($today['refer_out'] ?? 0) }}</div></div></td>
                            <td><div class="card card-green"><div class="kpi-label">OPD Cost วันนี้</div><div class="kpi-value">{{ $money($today['opd_cost'] ?? 0) }}</div></div></td>
                            <td><div class="card card-amber"><div class="kpi-label">AdjRW เดือนนี้</div><div class="kpi-value">{{ number_format((float) ($beds['adjrw_month'] ?? 0), 2) }}</div></div></td>
                        </tr>
                    </table>
                    <div class="chart-title">เตียงว่าง: {{ $fmt($freeBeds) }} / {{ $fmt($totalBeds) }} เตียง <span class="muted">(ไม่รวม Coward)</span></div>
                    <div class="bar-track"><div class="bar-fill" style="width: {{ $pct($freeBeds, $totalBeds) }}%; background:#f59e0b;"></div></div>
                    <div class="muted" style="margin-top: 3px;">อัตราครองเตียง {{ $beds['occupancy_rate'] ?? '-' }}%</div>

                    <div class="chart-title" style="margin-top: 10px;">สัดส่วนยอดบริการวันนี้</div>
                    <div class="stack">
                        <span style="width: {{ $pct($payment['self_pay'] ?? 0, $paymentTotal) }}%; background:#16a34a;"></span><span style="width: {{ $pct($payment['debt'] ?? 0, $paymentTotal) }}%; background:#2563eb;"></span><span style="width: {{ $pct($payment['unpaid'] ?? 0, $paymentTotal) }}%; background:#e11d48;"></span>
                    </div>
                    <div class="legend">
                        <span class="legend-dot low"></span>ชำระเอง {{ $money($payment['self_pay'] ?? 0) }}
                        &nbsp;&nbsp;<span class="legend-dot opd"></span>ลูกหนี้ {{ $money($payment['debt'] ?? 0) }}
                        &nbsp;&nbsp;<span class="legend-dot very-high"></span>ค้างชำระ {{ $money($payment['unpaid'] ?? 0) }}
                    </div>
    </div>
</div>

<div class="section">
    <table class="grid-2">
        <tr>
            <td>
                <div class="panel">
                    <h2>การเข้ารับบริการเดือนนี้ตามแผนก</h2>
                    @foreach ($departments->take(8) as $row)
                        @php
                            $name = (string) $get($row, 'department', '-');
                            $total = (float) $get($row, 'total', 0);
                        @endphp
                        <table class="bar-label-table">
                            <tr>
                                <td class="bar-name">{{ mb_strimwidth($name, 0, 58, '...') }}</td>
                                <td class="bar-value">{{ $fmt($total) }} ครั้ง</td>
                            </tr>
                        </table>
                        <div class="bar-track" style="margin-bottom: 5px;"><div class="bar-fill" style="width: {{ $pct($total, $departmentMax) }}%; background:#0ea5e9;"></div></div>
                    @endforeach
                    <div class="muted">รวมทุกแผนกเดือนนี้ {{ $fmt($departmentTotal) }} ครั้ง</div>
                </div>
            </td>
            <td>
                <div class="panel">
                    <h2>Top Disease และ NCD</h2>
                    <table class="data">
                        <tr><th>รายการ</th><th class="num">จำนวน</th></tr>
                        @foreach (collect($charts['top10_opd'] ?? [])->take(6) as $row)
                            <tr>
                                <td>OPD ICD-10: {{ $get($row, 'icd10', '-') }}</td>
                                <td class="num">{{ $fmt($get($row, 'total', 0)) }}</td>
                            </tr>
                        @endforeach
                    </table>
                    <table class="grid-2" style="margin-top: 8px;">
                        <tr>
                            <td><div class="card card-violet"><div class="kpi-label">DM</div><div class="kpi-value">{{ $fmt($summary['dm'] ?? 0) }}</div><div class="kpi-sub">ผู้ป่วยไม่ซ้ำ (E10-E19)</div></div></td>
                            <td><div class="card card-amber"><div class="kpi-label">HT</div><div class="kpi-value">{{ $fmt($summary['ht'] ?? 0) }}</div><div class="kpi-sub">ผู้ป่วยไม่ซ้ำ (I10-I19)</div></div></td>
                        </tr>
                    </table>
                </div>
            </td>
        </tr>
    </table>
</div>

<div class="section section-break">
    <h2>Thai ASCVD Risk Assessment</h2>
    <table class="grid-4">
        <tr>
            <td><div class="card card-blue"><div class="kpi-label">ประเมินได้</div><div class="kpi-value">{{ $fmt($cv['total_assessed'] ?? 0) }}</div><div class="kpi-sub">คนไทยอายุ 35-70 ปี</div></div></td>
            <td><div class="card card-rose"><div class="kpi-label">เสี่ยงสูงขึ้นไป</div><div class="kpi-value">{{ $fmt($cv['high_risk'] ?? 0) }}</div><div class="kpi-sub">{{ $cv['high_risk_rate'] ?? 0 }}% ของผู้ที่ประเมินได้</div></div></td>
            <td><div class="card card-rose"><div class="kpi-label">เสี่ยงสูงมาก</div><div class="kpi-value">{{ $fmt($cv['very_high_risk'] ?? 0) }}</div><div class="kpi-sub">&gt;30%</div></div></td>
            <td><div class="card card-green"><div class="kpi-label">ค่าเฉลี่ย / สูงสุด</div><div class="kpi-value">{{ $cv['average_risk'] ?? 0 }}%</div><div class="kpi-sub">สูงสุด {{ $cv['max_risk'] ?? 0 }}%</div></div></td>
        </tr>
    </table>

    <table class="grid-2">
        <tr>
            <td>
                <div class="panel">
                    <div class="chart-title">การกระจายความเสี่ยงรายเดือน</div>
                    @foreach ($cvDist as $dist)
                        @php
                            $label = $get($dist, 'label', '');
                            $total = max(1, (float) $get($dist, 's0_9', 0) + (float) $get($dist, 's10_19', 0) + (float) $get($dist, 's20_29', 0) + (float) $get($dist, 's30_39', 0) + (float) $get($dist, 's40p', 0));
                        @endphp
                        <table class="bar-label-table">
                            <tr>
                                <td class="bar-name">{{ $label }}</td>
                                <td class="bar-value">รวม {{ $fmt($total) }} คน</td>
                            </tr>
                        </table>
                        <div class="stack" style="margin-bottom: 7px;">
                            <span style="width: {{ $pct($get($dist, 's0_9', 0), $total) }}%; background:#16a34a;"></span><span style="width: {{ $pct($get($dist, 's10_19', 0), $total) }}%; background:#eab308;"></span><span style="width: {{ $pct($get($dist, 's20_29', 0), $total) }}%; background:#f97316;"></span><span style="width: {{ $pct($get($dist, 's30_39', 0), $total) }}%; background:#e11d48;"></span><span style="width: {{ $pct($get($dist, 's40p', 0), $total) }}%; background:#881337;"></span>
                        </div>
                    @endforeach
                    <div class="legend">
                        <span class="legend-dot low"></span>0-9%
                        &nbsp;<span class="legend-dot moderate"></span>10-19%
                        &nbsp;<span class="legend-dot high"></span>20-29%
                        &nbsp;<span class="legend-dot very-high"></span>30-39%
                        &nbsp;<span class="legend-dot critical"></span>40%+
                    </div>
                </div>
            </td>
            <td>
                <div class="panel">
                    <div class="chart-title">ผู้ป่วยเสี่ยงสูง (>=20%) รายเดือน</div>
                    @php $maxHigh = max(1, (float) $cvHigh->max(fn ($row) => (float) $get($row, 'total', 0))); @endphp
                    @foreach ($cvHigh as $row)
                        @php $total = (float) $get($row, 'total', 0); @endphp
                        <table class="bar-label-table">
                            <tr>
                                <td class="bar-name">{{ $get($row, 'label', '') }}</td>
                                <td class="bar-value">{{ $fmt($total) }} คน</td>
                            </tr>
                        </table>
                        <div class="bar-track" style="margin-bottom: 6px;"><div class="bar-fill" style="width: {{ $pct($total, $maxHigh) }}%; background:#e11d48;"></div></div>
                    @endforeach

                    <div class="chart-title" style="margin-top: 10px;">วิธีคำนวณที่ใช้</div>
                    @php
                        $methodTotal = max(1, (float) ($cv['method_counts']['lipid'] ?? 0) + (float) ($cv['method_counts']['waist_height'] ?? 0) + (float) ($cv['method_counts']['waist'] ?? 0));
                    @endphp
                    <div class="stack">
                        <span style="width: {{ $pct($cv['method_counts']['lipid'] ?? 0, $methodTotal) }}%; background:#2563eb;"></span><span style="width: {{ $pct($cv['method_counts']['waist_height'] ?? 0, $methodTotal) }}%; background:#7c3aed;"></span><span style="width: {{ $pct($cv['method_counts']['waist'] ?? 0, $methodTotal) }}%; background:#f59e0b;"></span>
                    </div>
                    <div class="legend">
                        <span class="pill">Lipid {{ $fmt($cv['method_counts']['lipid'] ?? 0) }}</span>
                        <span class="pill">Waist/Height {{ $fmt($cv['method_counts']['waist_height'] ?? 0) }}</span>
                        <span class="pill">Waist {{ $fmt($cv['method_counts']['waist'] ?? 0) }}</span>
                    </div>
                </div>
            </td>
        </tr>
    </table>
    <div class="muted">{{ $cv['note'] ?? 'คำนวณด้วยสูตร Thai CV Risk Score จาก Ramathibodi/EGAT' }}</div>
</div>

<div class="footer">
    รายงานนี้เป็นข้อมูลสนับสนุนการบริหารจัดการ ไม่ใช้แทนการวินิจฉัยหรือดุลยพินิจทางคลินิก
</div>
</body>
</html>
