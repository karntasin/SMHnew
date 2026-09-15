<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>รายงานมิเตอร์แอร์</title>
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
        @page { margin: 12px 14px 16px 14px; }
        * { box-sizing: border-box; font-family: 'sarabun', DejaVu Sans, sans-serif; }
        body { margin: 0; color: #0f172a; font-size: 10px; line-height: 1.35; }
        .block { page-break-after: always; margin-bottom: 8px; }
        .block:last-child { page-break-after: auto; }
        .title {
            text-align: center; font-size: 14px; font-weight: bold;
            color: #134e4a; margin: 0 0 4px;
        }
        .meta { text-align: center; font-size: 9px; color: #64748b; margin: 0 0 10px; }
        .summary {
            width: 100%; border-collapse: collapse; margin-bottom: 10px;
        }
        .summary td {
            width: 50%; padding: 8px 10px; border: 1px solid #99f6e4;
            background: #f0fdfa; text-align: center;
        }
        .summary .label { font-size: 8px; color: #0f766e; }
        .summary .value { font-size: 13px; font-weight: bold; color: #134e4a; margin-top: 2px; }
        table.data { width: 100%; border-collapse: collapse; }
        table.data th {
            background: #134e4a; color: #fff; font-size: 9px; font-weight: bold;
            text-align: center; padding: 6px 4px; border: 1px solid #115e59;
        }
        table.data th.name, table.data td.name { text-align: left; }
        table.data td {
            padding: 5px 6px; border: 1px solid #cbd5e1; vertical-align: middle;
            font-size: 9.5px;
        }
        .num { text-align: right; white-space: nowrap; }
        .center { text-align: center; }
        .total-row td { background: #ecfdf5; font-weight: bold; }
        .footer {
            margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 4px;
            font-size: 7px; color: #94a3b8;
        }
        .footer .right { float: right; }
        .empty {
            text-align: center; padding: 16px; color: #94a3b8;
            border: 1px dashed #cbd5e1;
        }
        .sign {
            width: 100%; border-collapse: collapse; margin-top: 18px;
        }
        .sign td { width: 50%; text-align: center; font-size: 8px; color: #334155; padding-top: 18px; }
        .sign .line { margin-top: 22px; }
    </style>
</head>
<body>
    @php
        $fmt = fn ($n) => $n === null ? '-' : number_format((float) $n, 2);
        $fmtU = fn ($n) => $n === null ? '-' : number_format((float) $n, 0);
    @endphp

    @if (empty($report['periods']))
        <div class="empty">ไม่พบข้อมูลมิเตอร์แอร์ในปีงบ {{ $fiscalYear }}</div>
    @else
        @foreach ($report['periods'] as $period)
            <div class="block">
                <p class="title">รายงานมิเตอร์แอร์</p>
                <p class="meta">{{ $hospitalName }} · ปีงบประมาณ {{ $fiscalYear }} · เดือน {{ $period['label'] ?? $period['curr_label'] }}</p>

                <table class="summary">
                    <tr>
                        <td>
                            <div class="label">รวมหน่วยที่ใช้</div>
                            <div class="value">{{ $fmtU($period['total_units']) }} หน่วย</div>
                        </td>
                        <td>
                            <div class="label">รวมเป็นเงิน</div>
                            <div class="value">{{ $fmt($period['total_cost']) }} บาท</div>
                        </td>
                    </tr>
                </table>

                <table class="data">
                    <thead>
                        <tr>
                            <th style="width:10%;">ลำดับ</th>
                            <th class="name" style="width:50%;">มิเตอร์ประจำแผนก</th>
                            <th style="width:20%;">ใช้ไฟ (หน่วย)</th>
                            <th style="width:20%;">คิดเป็นเงิน (บาท)</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($period['rows'] as $row)
                            <tr>
                                <td class="center">{{ $row['no'] }}</td>
                                <td class="name">{{ $row['name'] }}</td>
                                <td class="num">{{ $fmtU($row['units']) }}</td>
                                <td class="num">{{ $fmt($row['cost']) }}</td>
                            </tr>
                        @endforeach
                        <tr class="total-row">
                            <td colspan="2" class="name">รวม</td>
                            <td class="num">{{ $fmtU($period['total_units']) }}</td>
                            <td class="num">{{ $fmt($period['total_cost']) }}</td>
                        </tr>
                    </tbody>
                </table>

                <table class="sign">
                    <tr>
                        <td>
                            <div>ตรวจถูกต้อง</div>
                            <div class="line">..............................................</div>
                            <div>(..............................................)</div>
                        </td>
                        <td>
                            <div>{{ $period['label'] ?? $period['curr_label'] }}</div>
                            <div class="line">..............................................</div>
                            <div>หน.หน่วยที่เกี่ยวข้อง</div>
                        </td>
                    </tr>
                </table>

                <div class="footer">
                    <span>{{ $hospitalName }} · ENV · มิเตอร์แอร์</span>
                    <span class="right">พิมพ์เมื่อ {{ $generatedAt }}</span>
                </div>
            </div>
        @endforeach
    @endif
</body>
</html>
