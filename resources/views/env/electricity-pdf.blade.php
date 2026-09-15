<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>รายงานการใช้ไฟฟ้า</title>
    <style>
        @font-face {
            font-family: 'sarabun';
            font-style: normal;
            font-weight: 400;
            src: url('{{ $fontRegularUri }}') format('truetype');
        }
        @font-face {
            font-family: 'sarabun';
            font-style: normal;
            font-weight: 700;
            src: url('{{ $fontBoldUri }}') format('truetype');
        }
        * { box-sizing: border-box; }
        body {
            font-family: 'sarabun', DejaVu Sans, sans-serif;
            font-size: 12px;
            color: #0f172a;
            margin: 24px;
        }
        h1 { font-size: 18px; margin: 0 0 4px; }
        h2 { font-size: 13px; margin: 16px 0 8px; color: #0f766e; }
        .sub { color: #64748b; font-size: 11px; margin-bottom: 12px; }
        .meta { width: 100%; margin-bottom: 12px; border-collapse: collapse; }
        .meta td { padding: 6px 8px; border: 1px solid #e2e8f0; width: 25%; vertical-align: top; }
        .meta .label { color: #64748b; font-size: 10px; }
        .meta .value { font-size: 14px; font-weight: 700; margin-top: 2px; }
        table.data { width: 100%; border-collapse: collapse; }
        table.data th {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 5px 6px;
            font-size: 10px;
            text-align: left;
        }
        table.data td {
            border: 1px solid #e2e8f0;
            padding: 4px 6px;
            font-size: 11px;
            vertical-align: top;
        }
        .right { text-align: right; }
        .center { text-align: center; }
        .footer { margin-top: 16px; color: #94a3b8; font-size: 10px; }
    </style>
</head>
<body>
    <h1>รายงานการใช้ไฟฟ้า แยกตามแผนก</h1>
    <div class="sub">
        ปี {{ $year + 543 }}
        @if ($monthLabel) · เดือน{{ $monthLabel }} @endif
        @if ($departmentName) · แผนก {{ $departmentName }} @endif
        · ศูนย์พัฒนาคุณภาพ · ENV
    </div>

    <table class="meta">
        <tr>
            <td>
                <div class="label">หน่วยใช้ไฟรวม (kWh)</div>
                <div class="value">{{ number_format($totalKwh, 2) }}</div>
            </td>
            <td>
                <div class="label">ค่าไฟฟ้า รวม (บาท)</div>
                <div class="value">{{ number_format($totalCost, 2) }}</div>
            </td>
            <td>
                <div class="label">จำนวนรายการ</div>
                <div class="value">{{ number_format($usages->count()) }}</div>
            </td>
            <td>
                <div class="label">พิมพ์เมื่อ</div>
                <div class="value" style="font-size:12px;">{{ $generatedAt }}</div>
            </td>
        </tr>
    </table>

    @if (!$month)
        <h2>สรุปเป็นเดือน</h2>
        <table class="data">
            <thead>
                <tr>
                    <th>เดือน</th>
                    <th class="right">kWh</th>
                    <th class="right">ค่าไฟฟ้า (บาท)</th>
                    <th class="center">จำนวนแผนก</th>
                </tr>
            </thead>
            <tbody>
                @foreach (range(1, 12) as $m)
                    @php $row = $byMonth->get($m); @endphp
                    <tr>
                        <td>{{ $monthName($m) }}</td>
                        <td class="right">{{ number_format($row['kwh'] ?? 0, 2) }}</td>
                        <td class="right">{{ number_format($row['cost'] ?? 0, 2) }}</td>
                        <td class="center">{{ number_format($row['count'] ?? 0) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <h2>สรุปแยกแผนก</h2>
    <table class="data">
        <thead>
            <tr>
                <th style="width:40px;">ลำดับ</th>
                <th>แผนก</th>
                <th>รหัส</th>
                <th class="right">kWh</th>
                <th class="right">ค่าไฟฟ้า (บาท)</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($byDept as $i => $dept)
                <tr>
                    <td class="center">{{ $i + 1 }}</td>
                    <td>{{ $dept['name'] }}</td>
                    <td>{{ $dept['code'] ?: '-' }}</td>
                    <td class="right">{{ number_format($dept['kwh'], 2) }}</td>
                    <td class="right">{{ number_format($dept['cost'], 2) }}</td>
                </tr>
            @empty
                <tr><td colspan="5" class="center">ไม่มีข้อมูล</td></tr>
            @endforelse
        </tbody>
    </table>

    <h2>รายละเอียดรายการ</h2>
    <table class="data">
        <thead>
            <tr>
                <th>เดือน</th>
                <th>แผนก</th>
                <th class="right">kWh</th>
                <th class="right">ค่าไฟ (บาท)</th>
                <th class="right">มิเตอร์เริ่ม</th>
                <th class="right">มิเตอร์สิ้น</th>
                <th>หมายเหตุ</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($usages as $row)
                <tr>
                    <td>{{ $monthName((int) $row->month) }}</td>
                    <td>{{ $row->department?->name ?? '-' }}</td>
                    <td class="right">{{ number_format((float) $row->kwh, 2) }}</td>
                    <td class="right">{{ number_format((float) $row->cost, 2) }}</td>
                    <td class="right">{{ $row->meter_start !== null ? number_format((float) $row->meter_start, 2) : '-' }}</td>
                    <td class="right">{{ $row->meter_end !== null ? number_format((float) $row->meter_end, 2) : '-' }}</td>
                    <td>{{ $row->notes ?: '-' }}</td>
                </tr>
            @empty
                <tr><td colspan="7" class="center">ไม่มีข้อมูล</td></tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">{{ $hospitalName }} · รายงานการใช้ไฟฟ้า ENV</div>
</body>
</html>
