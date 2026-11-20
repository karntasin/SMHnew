<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>รายงานสรุปมูลค่ารายการค่ารักษาพยาบาล{{ $typeLabel }} - โรงพยาบาลค่ายสุรสิงหนาท</title>
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
        @page {
            size: {{ $paperSize ?? 'legal' }} landscape;
            margin: 7mm 7mm 7mm 7mm;
        }
        * {
            box-sizing: border-box;
            font-family: 'sarabun', sans-serif;
        }
        body {
            font-size: 8pt;
            color: #0f172a;
            line-height: 1.25;
            margin: 0;
            padding: 0;
            background: #ffffff;
        }

        /* Hero Banner */
        .hero {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
            background: #1e3a8a;
            border-radius: 6px;
            overflow: hidden;
        }
        .hero td {
            padding: 8px 12px;
            vertical-align: middle;
        }
        .hero-left {
            width: 65%;
            color: #ffffff;
        }
        .hero-right {
            width: 35%;
            text-align: right;
            color: #ffffff;
            background: #172554;
        }
        .hero-org {
            font-size: 8pt;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: #93c5fd;
            font-weight: bold;
            margin-bottom: 2px;
        }
        .hero-title {
            font-size: 13.5pt;
            font-weight: bold;
            margin: 0;
            line-height: 1.2;
            color: #ffffff;
        }
        .hero-sub {
            font-size: 8pt;
            color: #bfdbfe;
            margin-top: 2px;
        }
        .badge-type {
            display: inline-block;
            background: #3b82f6;
            color: #ffffff;
            font-size: 7.5pt;
            font-weight: bold;
            padding: 2px 8px;
            border-radius: 10px;
            margin-bottom: 2px;
        }
        .hero-period {
            font-size: 10pt;
            font-weight: bold;
            color: #f8fafc;
        }
        .hero-meta {
            font-size: 7.2pt;
            color: #94a3b8;
            margin-top: 2px;
        }

        /* KPI Cards Grid */
        .kpi-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 6px 0;
            margin: 0 -6px 8px -6px;
        }
        .kpi-table td {
            width: 25%;
            vertical-align: top;
            padding: 0;
        }
        .kpi-card {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 7px 10px;
            background: #f8fafc;
        }
        .kpi-card-blue {
            background: #eff6ff;
            border-color: #bfdbfe;
            border-left: 4px solid #2563eb;
        }
        .kpi-card-violet {
            background: #f5f3ff;
            border-color: #ddd6fe;
            border-left: 4px solid #7c3aed;
        }
        .kpi-card-emerald {
            background: #ecfdf5;
            border-color: #a7f3d0;
            border-left: 4px solid #059669;
        }
        .kpi-card-amber {
            background: #fffbeb;
            border-color: #fde68a;
            border-left: 4px solid #d97706;
        }
        .kpi-label {
            font-size: 7.5pt;
            color: #64748b;
            font-weight: bold;
            margin-bottom: 2px;
        }
        .kpi-val {
            font-size: 13.5pt;
            font-weight: bold;
            line-height: 1.1;
            color: #0f172a;
        }
        .kpi-sub {
            font-size: 7.2pt;
            color: #64748b;
            margin-top: 2px;
        }

        /* Analytics Section (2 Panels) */
        .analytics-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 7px 0;
            margin: 0 -7px 6px -7px;
        }
        .analytics-table td {
            width: 50%;
            vertical-align: top;
            padding: 0;
        }
        .panel {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 12px;
            background: #ffffff;
        }
        .panel-head {
            font-size: 9.5pt;
            font-weight: bold;
            color: #1e3a8a;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 4px;
            margin-bottom: 7px;
        }
        .panel-head span {
            font-size: 7.5pt;
            font-weight: normal;
            color: #64748b;
            float: right;
        }

        /* Stacked bar */
        .stacked-track {
            width: 100%;
            height: 9px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 7px;
        }
        .stacked-track span {
            display: inline-block;
            height: 9px;
            float: left;
        }

        /* Progress Bar Item */
        .bar-item {
            margin-bottom: 4px;
        }
        .bar-meta {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 2px;
        }
        .bar-meta td {
            padding: 0;
            border: none;
            font-size: 7.2pt;
        }
        .bar-title {
            color: #334155;
            font-weight: bold;
        }
        .bar-val {
            text-align: right;
            color: #0f172a;
            font-weight: bold;
        }
        .bar-bg {
            width: 100%;
            height: 6px;
            background: #e2e8f0;
            border-radius: 3px;
            overflow: hidden;
        }
        .bar-fill {
            height: 6px;
            border-radius: 3px;
        }

        /* Page Break for Detailed Table */
        .page-break {
            page-break-before: always;
        }

        /* Table Section Header */
        .section-header {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 5px;
        }
        .section-header td {
            padding: 0;
            border: none;
        }
        .section-title {
            font-size: 10pt;
            font-weight: bold;
            color: #1e3a8a;
            border-left: 4px solid #1e3a8a;
            padding-left: 6px;
        }
        .section-meta {
            text-align: right;
            font-size: 7.5pt;
            color: #64748b;
        }

        /* Detailed 19-Column Data Table (Fixed Layout strictly within paper width) */
        table.data-table {
            width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
            margin-top: 3px;
        }
        table.data-table thead {
            display: table-header-group;
        }
        table.data-table tr {
            page-break-inside: avoid;
        }
        table.data-table th, table.data-table td {
            border: 1px solid #cbd5e1;
            padding: 2.5px 2px;
            font-size: 6.8pt;
            line-height: 1.15;
            overflow: hidden;
            word-wrap: break-word;
        }
        table.data-table th {
            background-color: #1e3a8a;
            color: #ffffff;
            font-weight: bold;
            text-align: center;
            vertical-align: middle;
        }
        table.data-table tbody tr:nth-child(even) td {
            background-color: #f8fafc;
        }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        
        .total-row td {
            font-weight: bold;
            background-color: #e2e8f0 !important;
            color: #0f172a;
            border-top: 1.5px solid #1e3a8a !important;
            border-bottom: 1.5px solid #1e3a8a !important;
        }

        .footer-note {
            margin-top: 6px;
            font-size: 7pt;
            color: #64748b;
            width: 100%;
            border-collapse: collapse;
        }
        .footer-note td {
            padding: 0;
            border: none;
        }
    </style>
</head>
<body>
    @php
        $totals = $data['totals'] ?? [];
        $totalAmount = (float) ($totals['total_amount'] ?? 0);
        $totalPatients = (int) ($totals['patient_count'] ?? 0);
        $avgPerPatient = $totalPatients > 0 ? $totalAmount / $totalPatients : 0;
        
        $edAmount = (float) ($totals['inc03'] ?? 0);
        $nedAmount = (float) ($totals['inc17'] ?? 0);
        $totalDrug = $edAmount + $nedAmount;
        $drugShare = $totalAmount > 0 ? ($totalDrug / $totalAmount) * 100 : 0;
        $edPct = $totalDrug > 0 ? ($edAmount / $totalDrug) * 100 : 0;
        $nedPct = $totalDrug > 0 ? ($nedAmount / $totalDrug) * 100 : 0;

        $chartData = collect($data['chart_data'] ?? []);
        $topCategory = $chartData->first();
        $top5Categories = $chartData->take(6);
        $maxCatVal = max(1, (float) ($topCategory['value'] ?? 1));

        $topPttypes = collect($data['top_pttypes'] ?? [])->take(5);
        $maxPtVal = max(1, (float) ($topPttypes->first()['total_amount'] ?? 1));
    @endphp

    <!-- PAGE 1: EXECUTIVE DASHBOARD & ANALYTICS -->
    <table class="hero">
        <tr>
            <td class="hero-left">
                <div class="hero-org">Fort Surasinghanat Hospital &bull; โรงพยาบาลค่ายสุรสิงหนาท</div>
                <h1 class="hero-title">รายงานสรุปมูลค่ารายการค่ารักษาพยาบาล{{ $typeLabel }}</h1>
                <div class="hero-sub">ระบบสารสนเทศทางการเงินและเวชระเบียน (HOSxP Financial Analytics)</div>
            </td>
            <td class="hero-right">
                <div class="badge-type">{{ $visitType === 'ipd' ? 'ผู้ป่วยใน (IPD)' : 'ผู้ป่วยนอก (OPD)' }}</div>
                <div class="hero-period">ช่วงวันที่ {{ $startDateLabel }} - {{ $endDateLabel }}</div>
                <div class="hero-meta">ออกรายงาน: {{ $generatedAt }} | {{ $appName }} (กระดาษยาว Legal Landscape)</div>
            </td>
        </tr>
    </table>

    <!-- 4 KPI Summary Cards -->
    <table class="kpi-table">
        <tr>
            <td>
                <div class="kpi-card kpi-card-blue">
                    <div class="kpi-label">มูลค่ารักษาพยาบาลรวม</div>
                    <div class="kpi-val">{{ number_format($totalAmount, 2) }}</div>
                    <div class="kpi-sub">บาท (ทุกสิทธิการรักษา)</div>
                </div>
            </td>
            <td>
                <div class="kpi-card kpi-card-violet">
                    <div class="kpi-label">จำนวนผู้รับบริการ</div>
                    <div class="kpi-val">{{ number_format($totalPatients) }}</div>
                    <div class="kpi-sub">เฉลี่ย {{ number_format($avgPerPatient, 2) }} บาท/ราย</div>
                </div>
            </td>
            <td>
                <div class="kpi-card kpi-card-emerald">
                    <div class="kpi-label">ค่ายารวม (ED + NED)</div>
                    <div class="kpi-val">{{ number_format($totalDrug, 2) }}</div>
                    <div class="kpi-sub">
                        ในบัญชี {{ number_format($edPct, 1) }}% | นอกบัญชี {{ number_format($nedPct, 1) }}%
                    </div>
                </div>
            </td>
            <td>
                <div class="kpi-card kpi-card-amber">
                    <div class="kpi-label">หมวดค่าใช้จ่ายสูงสุด</div>
                    <div class="kpi-val" style="font-size: 11pt; padding-top: 2px;">{{ $topCategory['name'] ?? '-' }}</div>
                    <div class="kpi-sub">
                        {{ number_format((float) ($topCategory['value'] ?? 0), 2) }} บาท ({{ $totalAmount > 0 ? number_format((((float)($topCategory['value'] ?? 0)) / $totalAmount) * 100, 1) : 0 }}%)
                    </div>
                </div>
            </td>
        </tr>
    </table>

    <!-- Analytics Charts (2 Columns) -->
    <table class="analytics-table">
        <tr>
            <!-- Left Column: Category Breakdown -->
            <td>
                <div class="panel">
                    <div class="panel-head">
                        สัดส่วนมูลค่าตามหมวดค่ารักษาพยาบาล
                        <span>ยอดรวมหมวดค่ายา {{ number_format($drugShare, 1) }}%</span>
                    </div>

                    <!-- 100% Stacked Proportion Bar -->
                    <div class="stacked-track">
                        @foreach($top5Categories as $cat)
                            @php
                                $w = $totalAmount > 0 ? (((float) $cat['value']) / $totalAmount) * 100 : 0;
                            @endphp
                            <span style="width: {{ $w }}%; background-color: {{ $cat['color'] }};" title="{{ $cat['name'] }}"></span>
                        @endforeach
                    </div>

                    <!-- Top Categories Progress Bars -->
                    @foreach($top5Categories as $cat)
                        @php
                            $cVal = (float) $cat['value'];
                            $cPct = $totalAmount > 0 ? ($cVal / $totalAmount) * 100 : 0;
                            $barWidth = ($cVal / $maxCatVal) * 100;
                        @endphp
                        <div class="bar-item">
                            <table class="bar-meta">
                                <tr>
                                    <td class="bar-title">
                                        <span style="display:inline-block;width:7px;height:7px;border-radius:2px;background:{{ $cat['color'] }};margin-right:3px;"></span>
                                        {{ $cat['name'] }}
                                    </td>
                                    <td class="bar-val">
                                        {{ number_format($cVal, 2) }} บาท <span style="color:#64748b;font-weight:normal;">({{ number_format($cPct, 1) }}%)</span>
                                    </td>
                                </tr>
                            </table>
                            <div class="bar-bg">
                                <div class="bar-fill" style="width: {{ $barWidth }}%; background-color: {{ $cat['color'] }};"></div>
                            </div>
                        </div>
                    @endforeach

                    <!-- Drug ED vs NED Split Box -->
                    <div style="margin-top: 6px; padding: 5px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="width: 50%; font-size: 7.2pt; border: none; padding: 0;">
                                    <strong style="color: #059669;">&#9632; ยาในบัญชี (ED):</strong> {{ number_format($edAmount, 2) }} บ. ({{ number_format($edPct, 1) }}%)
                                </td>
                                <td style="width: 50%; text-align: right; font-size: 7.2pt; border: none; padding: 0;">
                                    <strong style="color: #d97706;">&#9632; ยานอกบัญชี (NED):</strong> {{ number_format($nedAmount, 2) }} บ. ({{ number_format($nedPct, 1) }}%)
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            </td>

            <!-- Right Column: Top 5 Rights / Schemes -->
            <td>
                <div class="panel">
                    <div class="panel-head">
                        Top 5 สิทธิการรักษาที่มีมูลค่ารักษาสูงสุด
                        <span>เรียงตามยอดรวมมูลค่า</span>
                    </div>

                    @forelse($topPttypes as $pt)
                        @php
                            $ptVal = (float) ($pt['total_amount'] ?? 0);
                            $ptPct = $totalAmount > 0 ? ($ptVal / $totalAmount) * 100 : 0;
                            $barWidth = ($ptVal / $maxPtVal) * 100;
                            $ptPatients = (int) ($pt['patient_count'] ?? 0);
                            $ptAvg = $ptPatients > 0 ? $ptVal / $ptPatients : 0;
                        @endphp
                        <div class="bar-item" style="margin-bottom: 5px;">
                            <table class="bar-meta">
                                <tr>
                                    <td class="bar-title">
                                        <span style="color:#2563eb;font-weight:bold;">[{{ $pt['pttype_code'] }}]</span>
                                        {{ mb_strimwidth($pt['pttype_name'], 0, 42, '...') }}
                                    </td>
                                    <td class="bar-val">
                                        {{ number_format($ptVal, 2) }} บาท <span style="color:#64748b;font-weight:normal;">({{ number_format($ptPct, 1) }}%)</span>
                                    </td>
                                </tr>
                            </table>
                            <div class="bar-bg">
                                <div class="bar-fill" style="width: {{ $barWidth }}%; background-color: #2563eb;"></div>
                            </div>
                            <div style="font-size: 6.8pt; color: #64748b; margin-top: 1px;">
                                ผู้รับบริการ {{ number_format($ptPatients) }} ราย &bull; เฉลี่ย {{ number_format($ptAvg, 2) }} บาท/ราย
                            </div>
                        </div>
                    @empty
                        <div style="color: #64748b; text-align: center; padding: 15px;">ไม่มีข้อมูลสิทธิการรักษา</div>
                    @endforelse
                </div>
            </td>
        </tr>
    </table>

    <table class="footer-note">
        <tr>
            <td>* รายงานนี้จัดทำขึ้นสำหรับผู้บริหารและการเงิน ข้อมูลเปรียบเทียบในหน้านี้เป็นภาพรวมเชิงวิเคราะห์</td>
            <td style="text-align: right;">หน้า 1 / ตารางรายละเอียดอยู่หน้าถัดไป &rarr;</td>
        </tr>
    </table>

    <!-- PAGE 2: DETAILED 19-COLUMN TABLE -->
    <div class="page-break"></div>

    <table class="section-header">
        <tr>
            <td>
                <div class="section-title">
                    ตารางแจกแจงมูลค่าค่ารักษาพยาบาล{{ $typeLabel }} (19 หมวดรายการมาตรฐาน)
                </div>
            </td>
            <td class="section-meta">
                ช่วงวันที่ {{ $startDateLabel }} ถึง {{ $endDateLabel }} &bull; โรงพยาบาลค่ายสุรสิงหนาท &bull; ขนาดกระดาษยาว (Legal Landscape)
            </td>
        </tr>
    </table>

    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 2.2%;">ลำดับ</th>
                <th style="width: 14.2%;">รายการสิทธิ</th>
                <th style="width: 3.8%;">จำนวน<br>ผู้ป่วย</th>
                <th style="width: 5.2%;">ค่ายา<br>ในบัญชี</th>
                <th style="width: 5.4%;">ค่ายา<br>นอกบัญชี</th>
                <th style="width: 4.8%;">ค่าเวชภัณฑ์</th>
                <th style="width: 4.8%;">ค่าพยาธิ</th>
                <th style="width: 4.2%;">ค่าเลือด</th>
                <th style="width: 4.5%;">ค่ารังสี</th>
                <th style="width: 4.8%;">ค่าหัตถการ</th>
                <th style="width: 4.5%;">ค่าวินิจฉัย<br>อื่น</th>
                <th style="width: 4.5%;">ค่าทันตกรรม</th>
                <th style="width: 5.0%;">ค่าบริการ<br>ทางพยาบาล</th>
                <th style="width: 5.0%;">{!! $visitType === 'ipd' ? 'ค่าห้อง/<br>ค่าอาหาร' : 'ค่าเตียง<br>สังเกตอาการ' !!}</th>
                <th style="width: 4.6%;">ค่าเครื่องมือ<br>แพทย์</th>
                <th style="width: 4.5%;">ค่านวด</th>
                <th style="width: 4.5%;">ค่าบริการ<br>อื่นๆ</th>
                <th style="width: 7.5%;">รวม</th>
                <th style="width: 6.0%;">หมายเหตุ</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['rows'] as $r)
                <tr>
                    <td class="text-center">{{ $r['index'] }}</td>
                    <td class="text-left font-bold" style="word-wrap: break-word; line-height: 1.1;">{{ $r['pttype_name'] }}</td>
                    <td class="text-right">{{ number_format($r['patient_count']) }}</td>
                    <td class="text-right" style="white-space: nowrap;">{{ $formatNumber($r['inc03']) }}</td>
                    <td class="text-right" style="white-space: nowrap;">{{ $formatNumber($r['inc17']) }}</td>
                    <td class="text-right" style="white-space: nowrap;">{{ $formatNumber($r['inc05']) }}</td>
                    <td class="text-right" style="white-space: nowrap;">{{ $formatNumber($r['inc07']) }}</td>
                    <td class="text-right" style="white-space: nowrap;">{{ $formatNumber($r['inc06']) }}</td>
                    <td class="text-right" style="white-space: nowrap;">{{ $formatNumber($r['inc08']) }}</td>
                    <td class="text-right" style="white-space: nowrap;">{{ $formatNumber($r['inc11']) }}</td>
                    <td class="text-right" style="white-space: nowrap;">{{ $formatNumber($r['inc09']) }}</td>
                    <td class="text-right" style="white-space: nowrap;">{{ $formatNumber($r['inc13']) }}</td>
                    <td class="text-right" style="white-space: nowrap;">{{ $formatNumber($r['inc12']) }}</td>
                    <td class="text-right" style="white-space: nowrap;">{{ $formatNumber($r['inc01']) }}</td>
                    <td class="text-right" style="white-space: nowrap;">{{ $formatNumber($r['inc10']) }}</td>
                    <td class="text-right" style="white-space: nowrap;">{{ $formatNumber($r['inc15']) }}</td>
                    <td class="text-right" style="white-space: nowrap;">{{ $formatNumber($r['inc16']) }}</td>
                    <td class="text-right font-bold" style="white-space: nowrap;">{{ number_format($r['total_amount'], 2) }}</td>
                    <td class="text-center">{{ $r['remark'] }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="19" class="text-center" style="padding: 15px;">ไม่พบข้อมูลในช่วงเวลาที่เลือก</td>
                </tr>
            @endforelse
            <tr class="total-row">
                <td class="text-center font-bold" colspan="2">รวมทั้งสิ้น</td>
                <td class="text-right font-bold">{{ number_format($totals['patient_count'] ?? 0) }}</td>
                <td class="text-right font-bold" style="white-space: nowrap;">{{ $formatNumber($totals['inc03'] ?? 0) }}</td>
                <td class="text-right font-bold" style="white-space: nowrap;">{{ $formatNumber($totals['inc17'] ?? 0) }}</td>
                <td class="text-right font-bold" style="white-space: nowrap;">{{ $formatNumber($totals['inc05'] ?? 0) }}</td>
                <td class="text-right font-bold" style="white-space: nowrap;">{{ $formatNumber($totals['inc07'] ?? 0) }}</td>
                <td class="text-right font-bold" style="white-space: nowrap;">{{ $formatNumber($totals['inc06'] ?? 0) }}</td>
                <td class="text-right font-bold" style="white-space: nowrap;">{{ $formatNumber($totals['inc08'] ?? 0) }}</td>
                <td class="text-right font-bold" style="white-space: nowrap;">{{ $formatNumber($totals['inc11'] ?? 0) }}</td>
                <td class="text-right font-bold" style="white-space: nowrap;">{{ $formatNumber($totals['inc09'] ?? 0) }}</td>
                <td class="text-right font-bold" style="white-space: nowrap;">{{ $formatNumber($totals['inc13'] ?? 0) }}</td>
                <td class="text-right font-bold" style="white-space: nowrap;">{{ $formatNumber($totals['inc12'] ?? 0) }}</td>
                <td class="text-right font-bold" style="white-space: nowrap;">{{ $formatNumber($totals['inc01'] ?? 0) }}</td>
                <td class="text-right font-bold" style="white-space: nowrap;">{{ $formatNumber($totals['inc10'] ?? 0) }}</td>
                <td class="text-right font-bold" style="white-space: nowrap;">{{ $formatNumber($totals['inc15'] ?? 0) }}</td>
                <td class="text-right font-bold" style="white-space: nowrap;">{{ $formatNumber($totals['inc16'] ?? 0) }}</td>
                <td class="text-right font-bold" style="white-space: nowrap;">{{ number_format($totals['total_amount'] ?? 0, 2) }}</td>
                <td></td>
            </tr>
        </tbody>
    </table>

    <table class="footer-note" style="margin-top: 8px;">
        <tr>
            <td>ข้อมูล ณ วันที่ {{ $generatedAt }} &bull; ระบบบริหารโรงพยาบาล ({{ $appName }})</td>
            <td style="text-align: right;">รายงานสรุปมูลค่ารักษาพยาบาล (HOSxP Finance Module) &bull; Legal Landscape</td>
        </tr>
    </table>
</body>
</html>