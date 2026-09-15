<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>แจ้งเตรียมครุภัณฑ์เพื่อตรวจสภาพ</title>
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
        .footer {
            margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 4px;
            font-size: 8px; color: #94a3b8;
        }
        .footer .right { float: right; }
        .empty {
            text-align: center; padding: 12px; color: #94a3b8;
            border: 1px dashed #cbd5e1;
        }
        .dept-box {
            background: #f0fdfa; border: 1px solid #99f6e4; padding: 5px 7px; margin: 8px 0 4px;
            font-weight: bold; color: #115e59; font-size: 10px;
        }
    </style>
</head>
<body>
    @php
        $fmtInt = fn ($n) => number_format((int) $n);
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
                <div>แจ้งเตรียมครุภัณฑ์เพื่อตรวจสภาพ</div>
            </td>
        </tr>
    </table>

    <table class="hero">
        <tr>
            <td class="hero-left">
                <div style="font-size:8px;margin-bottom:2px;">Inspection Preparation Notice</div>
                <h1>แจ้งเตรียมครุภัณฑ์เพื่อตรวจสภาพ</h1>
                <div class="hero-sub">
                    วงรอบ: {{ $cycle['name'] }}
                    @if(!empty($cycle['fiscal_year'])) · ปีงบ {{ $cycle['fiscal_year'] }} @endif
                    @if(!empty($cycle['period_label'])) · ช่วงตรวจ {{ $cycle['period_label'] }}
                    @elseif(!empty($cycle['default_scheduled_date'])) · วันตรวจหลัก {{ $cycle['default_scheduled_date'] }}
                    @endif
                </div>
            </td>
            <td class="hero-right">
                <div style="font-size:13px;font-weight:bold;">{{ $fmtInt($total) }} รายการ</div>
                <div style="font-size:8px;color:#0f766e;">{{ count($groups) }} แผนก/จุดติดตั้ง</div>
            </td>
        </tr>
    </table>

    <p class="note">
        กรุณาแผนก/หน่วยงานที่เป็นเจ้าของเตรียมครุภัณฑ์ให้อยู่ในสภาพพร้อมตรวจตามวันนัดหมายด้านล่าง
        @if(!empty($cycle['notes'])) · หมายเหตุวงรอบ: {{ $cycle['notes'] }} @endif
    </p>

    @if ($total === 0)
        <div class="empty">ยังไม่มีรายการในวงรอบนี้</div>
    @else
        @foreach ($groups as $dept => $rows)
            <div class="dept-box">{{ $dept }} · {{ $fmtInt(count($rows)) }} รายการ</div>
            <table class="data">
                <thead>
                    <tr>
                        <th class="center" style="width:28px;">ลำดับ</th>
                        <th style="width:8%;">สาย</th>
                        <th style="width:26%;">รายการ</th>
                        <th style="width:12%;">หมายเลข สป.</th>
                        <th style="width:14%;">ยี่ห้อ/รุ่น</th>
                        <th style="width:12%;">SN</th>
                        <th style="width:10%;">วันนัดตรวจ</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($rows as $item)
                        <tr>
                            <td class="center">{{ $item['no'] }}</td>
                            <td>{{ $item['line_name'] }}</td>
                            <td>{{ $item['name'] }}</td>
                            <td>{{ $item['stock_number'] }}</td>
                            <td>{{ $item['brand_model'] }}</td>
                            <td>{{ $item['serial_number'] }}</td>
                            <td>{{ $item['scheduled_date'] }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endforeach
        <p class="note">สิ้นสุดเอกสาร · รวมทั้งหมด {{ $fmtInt($total) }} รายการ</p>
    @endif

    <div class="footer">
        <span>{{ $hospitalName }} · ENV · แจ้งเตรียมครุภัณฑ์</span>
        <span class="right">พิมพ์เมื่อ {{ $generatedAt }}</span>
    </div>
</body>
</html>
