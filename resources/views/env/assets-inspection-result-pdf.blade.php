<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>รายงานผลการตรวจสภาพครุภัณฑ์</title>
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
        @page { margin: 14px 16px 18px 16px; }
        * { box-sizing: border-box; font-family: 'sarabun', DejaVu Sans, sans-serif; }
        body { margin: 0; color: #134e4a; font-size: 9px; line-height: 1.3; }
        .topbar { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .topbar td { vertical-align: middle; padding: 0; }
        .brand-mark {
            width: 36px; height: 36px; background: #0f766e; color: #fff;
            text-align: center; font-size: 10px; font-weight: bold; line-height: 36px;
        }
        .brand-text { padding-left: 8px; }
        .brand-text .org { font-size: 12px; font-weight: bold; color: #115e59; margin: 0; }
        .brand-text .unit { font-size: 8px; color: #64748b; margin: 1px 0 0; }
        .doc-meta { text-align: right; font-size: 8px; color: #64748b; }
        .doc-meta .date { font-size: 11px; font-weight: bold; color: #0f766e; }
        .hero { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .hero-left { width: 70%; background: #0f766e; color: #fff; padding: 8px 10px; }
        .hero-right { width: 30%; background: #ccfbf1; color: #115e59; padding: 8px 10px; text-align: right; }
        .hero h1 { margin: 0; font-size: 14px; font-weight: bold; }
        .hero-sub { margin-top: 3px; font-size: 9px; }
        .kpi { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .kpi td { width: 25%; padding: 0 3px 0 0; }
        .kpi td:last-child { padding-right: 0; }
        .kpi-card { border: 1px solid #99f6e4; background: #f0fdfa; padding: 6px 7px; }
        .kpi-card.rose { background: #fff1f2; border-color: #fda4af; }
        .kpi-card.amber { background: #fffbeb; border-color: #fcd34d; }
        .kpi-card.emerald { background: #ecfdf5; border-color: #6ee7b7; }
        .kpi-label { font-size: 8px; color: #64748b; }
        .kpi-value { font-size: 12px; font-weight: bold; color: #134e4a; }
        h2 {
            margin: 10px 0 5px; padding-left: 6px; border-left: 3px solid #14b8a6;
            color: #0f766e; font-size: 11px; font-weight: bold;
        }
        .note { font-size: 8px; color: #64748b; margin: 0 0 5px; }
        table.data { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        table.data th {
            background: #134e4a; color: #fff; font-size: 8px; font-weight: bold;
            text-align: left; padding: 4px 3px; border: 1px solid #115e59;
        }
        table.data td {
            padding: 3px; border: 1px solid #d1d5db; vertical-align: top;
            font-size: 8.5px; color: #0f172a;
        }
        .center { text-align: center; }
        .pass { color: #047857; font-weight: bold; }
        .fail { color: #be123c; font-weight: bold; }
        .pending { color: #b45309; font-weight: bold; }
        .footer {
            margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 4px;
            font-size: 8px; color: #94a3b8;
        }
        .footer .right { float: right; }
        .empty {
            text-align: center; padding: 12px; color: #94a3b8;
            border: 1px dashed #cbd5e1;
        }
    </style>
</head>
<body>
    @php
        $fmtInt = fn ($n) => number_format((int) $n);
        $chunks = array_chunk($detailRows, 35);
    @endphp

    <table class="topbar">
        <tr>
            <td style="width:40px;"><div class="brand-mark">ENV</div></td>
            <td class="brand-text">
                <p class="org">{{ $hospitalName }}</p>
                <p class="unit">ศูนย์พัฒนาคุณภาพ · สิ่งแวดล้อมและความปลอดภัย (ENV)</p>
            </td>
            <td class="doc-meta">
                <div class="date">{{ $generatedDate }}</div>
                <div>รายงานผลการตรวจสภาพ</div>
            </td>
        </tr>
    </table>

    <table class="hero">
        <tr>
            <td class="hero-left">
                <div style="font-size:8px;margin-bottom:2px;">Inspection Result Report</div>
                <h1>รายงานผลการตรวจสภาพครุภัณฑ์</h1>
                <div class="hero-sub">
                    วงรอบ: {{ $cycle['name'] }}
                    @if(!empty($cycle['fiscal_year'])) · ปีงบ {{ $cycle['fiscal_year'] }} @endif
                    @if(!empty($cycle['period_label'])) · ช่วงตรวจ {{ $cycle['period_label'] }} @endif
                    · สถานะ {{ $cycle['status_label'] }}
                </div>
            </td>
            <td class="hero-right">
                <div style="font-size:13px;font-weight:bold;">{{ $fmtInt($total) }} รายการ</div>
                <div style="font-size:8px;color:#0f766e;">สรุปผลการตรวจ</div>
            </td>
        </tr>
    </table>

    <table class="kpi">
        <tr>
            <td><div class="kpi-card emerald"><div class="kpi-label">ผ่าน</div><div class="kpi-value">{{ $fmtInt($counts['pass'] ?? 0) }}</div></div></td>
            <td><div class="kpi-card rose"><div class="kpi-label">ไม่ผ่าน</div><div class="kpi-value">{{ $fmtInt($counts['fail'] ?? 0) }}</div></div></td>
            <td><div class="kpi-card amber"><div class="kpi-label">รอตรวจ</div><div class="kpi-value">{{ $fmtInt($counts['pending'] ?? 0) }}</div></div></td>
            <td><div class="kpi-card"><div class="kpi-label">รวม</div><div class="kpi-value">{{ $fmtInt($total) }}</div></div></td>
        </tr>
    </table>

    @if(!empty($cycle['notes']))
        <p class="note">หมายเหตุวงรอบ: {{ $cycle['notes'] }}</p>
    @endif

    <h2>รายละเอียดผลการตรวจ</h2>

    @if ($total === 0)
        <div class="empty">ยังไม่มีรายการในวงรอบนี้</div>
    @else
        @foreach ($chunks as $chunkIndex => $rows)
            @if ($chunkIndex > 0)
                <div class="note">ต่อ · ชุดที่ {{ $chunkIndex + 1 }} / {{ count($chunks) }}</div>
            @endif
            <table class="data">
                <thead>
                    <tr>
                        <th class="center" style="width:26px;">ลำดับ</th>
                        <th style="width:8%;">ผล</th>
                        <th style="width:18%;">รายการ</th>
                        <th style="width:10%;">หมายเลข สป.</th>
                        <th style="width:10%;">ยี่ห้อ/รุ่น</th>
                        <th style="width:9%;">SN</th>
                        <th style="width:12%;">แผนก/ที่ตั้ง</th>
                        <th style="width:8%;">วันนัด</th>
                        <th style="width:8%;">วันตรวจ</th>
                        <th>หมายเหตุ</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($rows as $item)
                        <tr>
                            <td class="center">{{ $item['no'] }}</td>
                            <td class="{{ $item['result'] }}">{{ $item['result_label'] }}</td>
                            <td>{{ $item['name'] }}</td>
                            <td>{{ $item['stock_number'] }}</td>
                            <td>{{ $item['brand_model'] }}</td>
                            <td>{{ $item['serial_number'] }}</td>
                            <td>{{ $item['department'] }}</td>
                            <td>{{ $item['scheduled_date'] }}</td>
                            <td>{{ $item['inspected_at'] }}</td>
                            <td>{{ $item['notes'] }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endforeach
        <p class="note">สิ้นสุดตาราง · รวมทั้งหมด {{ $fmtInt($total) }} รายการ</p>
    @endif

    <div class="footer">
        <span>{{ $hospitalName }} · ENV · รายงานผลการตรวจสภาพ</span>
        <span class="right">พิมพ์เมื่อ {{ $generatedAt }}</span>
    </div>
</body>
</html>
