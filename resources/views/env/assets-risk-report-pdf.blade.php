<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>รายงานครุภัณฑ์ที่เสี่ยง</title>
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
        .kpi-card.sky { background: #f0f9ff; border-color: #7dd3fc; }
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
        .num { text-align: right; white-space: nowrap; }
        .center { text-align: center; }
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
        $fmt = fn ($n) => number_format((float) $n, 2);
        $fmtInt = fn ($n) => number_format((int) $n);
        $lineName = $selectedLine['name'] ?? 'ทุกสาย';
        $totalRows = count($detailRows);
        $chunks = array_chunk($detailRows, 40);
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
                <div>รายงานครุภัณฑ์ที่เสี่ยง</div>
            </td>
        </tr>
    </table>

    <table class="hero">
        <tr>
            <td class="hero-left">
                <div style="font-size:8px;margin-bottom:2px;">Risk Asset Report</div>
                <h1>รายงานครุภัณฑ์ที่เสี่ยง</h1>
                <div class="hero-sub">
                    สาย{{ $lineName }}
                    @if($riskFilterLabel) · ความเสี่ยง: {{ $riskFilterLabel }} @else · ความเสี่ยง A/B/C @endif
                    @if($statusFilterLabel) · สถานะ: {{ $statusFilterLabel }} @endif
                    · รวม {{ $fmtInt($totalRows) }} รายการ
                </div>
            </td>
            <td class="hero-right">
                <div style="font-size:13px;font-weight:bold;">{{ $fmtInt($summary['filtered'] ?? $totalRows) }} รายการ</div>
                <div style="font-size:8px;color:#0f766e;">มูลค่า {{ $fmt($summary['value'] ?? 0) }} บาท</div>
            </td>
        </tr>
    </table>

    <table class="kpi">
        <tr>
            <td><div class="kpi-card rose"><div class="kpi-label">A สูง</div><div class="kpi-value">{{ $fmtInt($riskCounts['A'] ?? 0) }}</div></div></td>
            <td><div class="kpi-card amber"><div class="kpi-label">B กลาง</div><div class="kpi-value">{{ $fmtInt($riskCounts['B'] ?? 0) }}</div></div></td>
            <td><div class="kpi-card sky"><div class="kpi-label">C ต่ำ</div><div class="kpi-value">{{ $fmtInt($riskCounts['C'] ?? 0) }}</div></div></td>
            <td><div class="kpi-card"><div class="kpi-label">รวมเสี่ยง</div><div class="kpi-value">{{ $fmtInt($summary['total'] ?? 0) }}</div></div></td>
        </tr>
    </table>

    <h2>รายละเอียดครุภัณฑ์ที่เสี่ยง</h2>
    <p class="note">แสดงเฉพาะระดับความเสี่ยง A / B / C (ไม่รวม ไม่ระบุ) · ไม่แนบรูป</p>

    @if ($totalRows === 0)
        <div class="empty">ไม่พบรายการตามเงื่อนไขที่เลือก</div>
    @else
        @foreach ($chunks as $chunkIndex => $rows)
            @if ($chunkIndex > 0)
                <div class="note">ต่อ · ชุดที่ {{ $chunkIndex + 1 }} / {{ count($chunks) }}</div>
            @endif
            <table class="data">
                <thead>
                    <tr>
                        <th class="center" style="width:28px;">ลำดับ</th>
                        <th style="width:9%;">ความเสี่ยง</th>
                        <th style="width:8%;">สาย</th>
                        <th style="width:9%;">สถานะ</th>
                        <th style="width:22%;">รายการ</th>
                        <th style="width:11%;">หมายเลข สป.</th>
                        <th style="width:12%;">ยี่ห้อ/รุ่น</th>
                        <th class="num" style="width:9%;">ราคา</th>
                        <th style="width:9%;">SN</th>
                        <th>ที่ตั้ง</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($rows as $item)
                        <tr>
                            <td class="center">{{ $item['no'] }}</td>
                            <td>{{ $item['risk_label'] }}</td>
                            <td>{{ $item['line_name'] }}</td>
                            <td>{{ $item['status_label'] }}</td>
                            <td>{{ $item['name'] }}</td>
                            <td>{{ $item['stock_number'] }}</td>
                            <td>{{ $item['brand_model'] }}</td>
                            <td class="num">{{ $item['price'] }}</td>
                            <td>{{ $item['serial_number'] }}</td>
                            <td>{{ $item['location'] }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endforeach
        <p class="note">สิ้นสุดตาราง · รวมทั้งหมด {{ $fmtInt($totalRows) }} รายการ</p>
    @endif

    <div class="footer">
        <span>{{ $hospitalName }} · ENV · ครุภัณฑ์ที่เสี่ยง</span>
        <span class="right">พิมพ์เมื่อ {{ $generatedAt }}</span>
    </div>
</body>
</html>
