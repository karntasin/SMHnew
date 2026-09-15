<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>รายงานครุภัณฑ์แยกสาย</title>
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
        .hero-right { width: 30%; background: #ccfbf1; color: #115e59; padding: 8px 10px; text-align: right; vertical-align: middle; }
        .eyebrow { font-size: 8px; margin-bottom: 2px; }
        .hero h1 { margin: 0; font-size: 14px; font-weight: bold; }
        .hero-sub { margin-top: 3px; font-size: 9px; }
        .hero-right .big { font-size: 13px; font-weight: bold; }
        .hero-right .small { font-size: 8px; color: #0f766e; }

        .kpi { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .kpi td { width: 25%; padding: 0 3px 0 0; vertical-align: top; }
        .kpi td:last-child { padding-right: 0; }
        .kpi-card { border: 1px solid #99f6e4; background: #f0fdfa; padding: 6px 7px; }
        .kpi-card.amber { background: #fffbeb; border-color: #fcd34d; }
        .kpi-card.orange { background: #fff7ed; border-color: #fdba74; }
        .kpi-card.slate { background: #f8fafc; border-color: #cbd5e1; }
        .kpi-label { font-size: 8px; color: #64748b; }
        .kpi-value { font-size: 12px; font-weight: bold; color: #134e4a; }

        h2 {
            margin: 10px 0 5px;
            padding-left: 6px;
            border-left: 3px solid #14b8a6;
            color: #0f766e;
            font-size: 11px;
            font-weight: bold;
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
        table.data tr.active td { background: #ccfbf1; font-weight: bold; }
        .num { text-align: right; white-space: nowrap; }
        .center { text-align: center; }
        .muted { color: #64748b; }
        .chunk-note { font-size: 8px; color: #94a3b8; margin: 4px 0 2px; }

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
        $lineShort = $selectedLine['short_name'] ?? null;
        $statusMap = collect($registryStatuses)->keyBy('value');
        $normalCount = $statusMap->get('normal')['count'] ?? 0;
        $repairCount = $statusMap->get('repair')['count'] ?? 0;
        $pendingCount = $statusMap->get('pending_disposal')['count'] ?? 0;
        $disposedCount = $statusMap->get('disposed')['count'] ?? 0;
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
                <div>รายงานทะเบียนครุภัณฑ์ (ไม่มีรูป)</div>
            </td>
        </tr>
    </table>

    <table class="hero">
        <tr>
            <td class="hero-left">
                <div class="eyebrow">Asset Registry Report</div>
                <h1>รายงานครุภัณฑ์แยกสายงาน</h1>
                <div class="hero-sub">
                    สาย{{ $lineName }}@if($lineShort) ({{ $lineShort }})@endif
                    @if($statusFilterLabel) · กรองสถานะ: {{ $statusFilterLabel }} @else · ทุกสถานะ @endif
                    · รวม {{ $fmtInt($totalRows) }} รายการในตาราง
                </div>
            </td>
            <td class="hero-right">
                <div class="big">{{ $fmtInt($summary['total']) }} รายการ</div>
                <div class="small">มูลค่าคงคุม {{ $fmt($summary['value']) }} บาท</div>
            </td>
        </tr>
    </table>

    <table class="kpi">
        <tr>
            <td><div class="kpi-card"><div class="kpi-label">ปกติ</div><div class="kpi-value">{{ $fmtInt($normalCount) }}</div></div></td>
            <td><div class="kpi-card amber"><div class="kpi-label">ส่งซ่อม</div><div class="kpi-value">{{ $fmtInt($repairCount) }}</div></div></td>
            <td><div class="kpi-card orange"><div class="kpi-label">รอจำหน่าย</div><div class="kpi-value">{{ $fmtInt($pendingCount) }}</div></div></td>
            <td><div class="kpi-card slate"><div class="kpi-label">จำหน่าย</div><div class="kpi-value">{{ $fmtInt($disposedCount) }}</div></div></td>
        </tr>
    </table>

    <h2>สรุปทุกสายงาน</h2>
    <table class="data">
        <thead>
            <tr>
                <th class="center" style="width:24px;">#</th>
                <th>สายงาน</th>
                <th class="num">ทั้งหมด</th>
                <th class="num">ปกติ</th>
                <th class="num">ส่งซ่อม</th>
                <th class="num">รอจำหน่าย</th>
                <th class="num">จำหน่าย</th>
                <th class="num">มูลค่าคงคุม</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($lineSummaries as $i => $line)
                <tr class="{{ ($selectedLine['id'] ?? null) === $line['id'] ? 'active' : '' }}">
                    <td class="center">{{ $i + 1 }}</td>
                    <td>
                        {{ $line['name'] }}
                        @if (!empty($line['short_name']))
                            <span class="muted">({{ $line['short_name'] }})</span>
                        @endif
                    </td>
                    <td class="num">{{ $fmtInt($line['total']) }}</td>
                    <td class="num">{{ $fmtInt($line['normal']) }}</td>
                    <td class="num">{{ $fmtInt($line['repair']) }}</td>
                    <td class="num">{{ $fmtInt($line['pending_disposal']) }}</td>
                    <td class="num">{{ $fmtInt($line['disposed']) }}</td>
                    <td class="num">{{ $fmt($line['value']) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <h2>รายละเอียดครุภัณฑ์ · {{ $lineName }}</h2>
    <p class="note">ตารางข้อความอย่างเดียว (ไม่แนบรูป) · แสดงครบทุกสถานะ · ลำดับต่อเนื่องทั้งรายงาน</p>

    @if ($totalRows === 0)
        <div class="empty">ไม่พบรายการครุภัณฑ์ตามเงื่อนไขที่เลือก</div>
    @else
        @foreach ($chunks as $chunkIndex => $rows)
            @if ($chunkIndex > 0)
                <div class="chunk-note">ต่อ · ชุดที่ {{ $chunkIndex + 1 }} / {{ count($chunks) }}</div>
            @endif
            <table class="data">
                <thead>
                    <tr>
                        <th class="center" style="width:28px;">ลำดับ</th>
                        <th style="width:9%;">สถานะ</th>
                        <th style="width:22%;">รายการ</th>
                        <th style="width:11%;">หมายเลข สป.</th>
                        <th class="center" style="width:7%;">สถานภาพ</th>
                        <th style="width:12%;">ยี่ห้อ/รุ่น</th>
                        <th style="width:8%;">ปีงบ</th>
                        <th class="num" style="width:9%;">ราคา</th>
                        <th style="width:9%;">SN</th>
                        <th>ที่ตั้ง</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($rows as $item)
                        <tr>
                            <td class="center">{{ $item['no'] }}</td>
                            <td>{{ $item['status_label'] }}</td>
                            <td>{{ $item['name'] }}</td>
                            <td>{{ $item['stock_number'] }}</td>
                            <td class="center">{{ $item['condition_code'] }}</td>
                            <td>{{ $item['brand_model'] }}</td>
                            <td>{{ $item['fiscal_year'] }}</td>
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
        <span>{{ $hospitalName }} · ENV · บัญชีคุมสิ่งอุปกรณ์</span>
        <span class="right">พิมพ์เมื่อ {{ $generatedAt }}</span>
    </div>
</body>
</html>
