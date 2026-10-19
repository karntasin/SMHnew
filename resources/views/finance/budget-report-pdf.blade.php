<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>งานงบประมาณ ปี {{ $fiscalYear }}</title>
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
        @page { margin: 24px 28px 32px 28px; }
        * { box-sizing: border-box; font-family: 'sarabun', sans-serif; }
        body { font-size: 10px; color: #111827; line-height: 1.4; }
        h1 { font-size: 18px; margin: 0 0 2px 0; color: #0f766e; }
        h2 { font-size: 12px; margin: 0 0 6px 0; color: #0f766e; border-bottom: 2px solid #99f6e4; padding-bottom: 3px; }
        .meta { font-size: 9px; color: #4b5563; margin-bottom: 10px; }
        .kpi-row { width: 100%; border-collapse: separate; border-spacing: 6px 0; margin: 0 0 12px 0; }
        .kpi { border: 1px solid #d1d5db; border-radius: 6px; padding: 8px; background: #f0fdfa; }
        .kpi-label { font-size: 8px; color: #6b7280; margin-bottom: 2px; }
        .kpi-value { font-size: 12px; font-weight: bold; color: #0f766e; }
        .section { margin-bottom: 14px; }
        table.data { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        table.data th, table.data td { border: 1px solid #d1d5db; padding: 4px 5px; }
        table.data th { background: #0f766e; color: #fff; font-size: 9px; }
        table.data tr:nth-child(even) td { background: #f9fafb; }
        table.data tfoot td { background: #fef3c7; font-weight: bold; }
        .num { text-align: right; white-space: nowrap; }
        .footer { margin-top: 12px; border-top: 1px solid #e5e7eb; padding-top: 6px; font-size: 8px; color: #9ca3af; text-align: center; }
    </style>
</head>
<body>
    @php
        $summary = $data['summary'] ?? [];
        $money = $formatBaht;
    @endphp

    <h1>งานงบประมาณ — ค่ารักษาพยาบาลตามปีงบประมาณ {{ $fiscalYear }}</h1>
    <div class="meta">
        {{ $startDateLabel }} ถึง {{ $endDateLabel }}
        &nbsp;|&nbsp; ออกรายงาน {{ $generatedAt }}
        @if (!empty($appName))
            &nbsp;|&nbsp; {{ $appName }}
        @endif
        <br>
        แหล่งข้อมูล: opitemrece.sum_price ตามวัน vstdate ทั้ง OPD และ IPD · เงินสด = paidst 01/03 · ลูกหนี้สิทธิ = 02 · ค้างชำระ = 00
    </div>

    <table class="kpi-row">
        <tr>
            <td><div class="kpi"><div class="kpi-label">รวมทั้งปี</div><div class="kpi-value">{{ $money($summary['total_amount'] ?? 0) }}</div></div></td>
            <td><div class="kpi"><div class="kpi-label">OPD</div><div class="kpi-value">{{ $money($summary['opd_amount'] ?? 0) }}</div></div></td>
            <td><div class="kpi"><div class="kpi-label">IPD</div><div class="kpi-value">{{ $money($summary['ipd_amount'] ?? 0) }}</div></div></td>
            <td><div class="kpi"><div class="kpi-label">เงินสด</div><div class="kpi-value">{{ $money($summary['cash_amount'] ?? 0) }}</div></div></td>
            <td><div class="kpi"><div class="kpi-label">ลูกหนี้สิทธิ</div><div class="kpi-value">{{ $money($summary['debt_amount'] ?? 0) }}</div></div></td>
            <td><div class="kpi"><div class="kpi-label">ค้างชำระ</div><div class="kpi-value">{{ $money($summary['unpaid_amount'] ?? 0) }}</div></div></td>
        </tr>
    </table>

    <div class="section">
        <h2>รายเดือน แยก OPD / IPD และประเภทการชำระ</h2>
        <table class="data">
            <thead>
                <tr>
                    <th>เดือน</th>
                    <th class="num">OPD</th>
                    <th class="num">IPD</th>
                    <th class="num">รวม</th>
                    <th class="num">เงินสด</th>
                    <th class="num">ลูกหนี้สิทธิ</th>
                    <th class="num">ค้างชำระ</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($data['monthly'] ?? [] as $row)
                    <tr>
                        <td>{{ $row['label'] }}</td>
                        <td class="num">{{ $money($row['opd']) }}</td>
                        <td class="num">{{ $money($row['ipd']) }}</td>
                        <td class="num">{{ $money($row['total']) }}</td>
                        <td class="num">{{ $money($row['cash']) }}</td>
                        <td class="num">{{ $money($row['debt']) }}</td>
                        <td class="num">{{ $money($row['unpaid']) }}</td>
                    </tr>
                @endforeach
            </tbody>
            <tfoot>
                <tr>
                    <td>รวม</td>
                    <td class="num">{{ $money($summary['opd_amount'] ?? 0) }}</td>
                    <td class="num">{{ $money($summary['ipd_amount'] ?? 0) }}</td>
                    <td class="num">{{ $money($summary['total_amount'] ?? 0) }}</td>
                    <td class="num">{{ $money($summary['cash_amount'] ?? 0) }}</td>
                    <td class="num">{{ $money($summary['debt_amount'] ?? 0) }}</td>
                    <td class="num">{{ $money($summary['unpaid_amount'] ?? 0) }}</td>
                </tr>
            </tfoot>
        </table>
    </div>

    <div class="section">
        <h2>หมวดรายได้</h2>
        <table class="data">
            <thead>
                <tr>
                    <th>รหัส</th>
                    <th>หมวด</th>
                    <th class="num">OPD</th>
                    <th class="num">IPD</th>
                    <th class="num">รวม</th>
                    <th class="num">สัดส่วน</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($data['by_income'] ?? [] as $row)
                    <tr>
                        <td>{{ $row['income_code'] }}</td>
                        <td>{{ $row['income_name'] }}</td>
                        <td class="num">{{ $money($row['opd_amount']) }}</td>
                        <td class="num">{{ $money($row['ipd_amount']) }}</td>
                        <td class="num">{{ $money($row['total_amount']) }}</td>
                        <td class="num">{{ number_format((float) $row['share_percent'], 1) }}%</td>
                    </tr>
                @empty
                    <tr><td colspan="6">ไม่มีข้อมูลหมวดรายได้</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>สิทธิการรักษา</h2>
        <table class="data">
            <thead>
                <tr>
                    <th>รหัส</th>
                    <th>สิทธิ</th>
                    <th class="num">OPD</th>
                    <th class="num">IPD</th>
                    <th class="num">เงินสด</th>
                    <th class="num">ลูกหนี้สิทธิ</th>
                    <th class="num">รวม</th>
                    <th class="num">สัดส่วน</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($data['by_pttype'] ?? [] as $row)
                    <tr>
                        <td>{{ $row['pttype_code'] }}</td>
                        <td>{{ $row['pttype_name'] }}</td>
                        <td class="num">{{ $money($row['opd_amount']) }}</td>
                        <td class="num">{{ $money($row['ipd_amount']) }}</td>
                        <td class="num">{{ $money($row['cash_amount']) }}</td>
                        <td class="num">{{ $money($row['debt_amount']) }}</td>
                        <td class="num">{{ $money($row['total_amount']) }}</td>
                        <td class="num">{{ number_format((float) $row['share_percent'], 1) }}%</td>
                    </tr>
                @empty
                    <tr><td colspan="8">ไม่มีข้อมูลสิทธิการรักษา</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>

    @php
        $expenses = $data['expenses'] ?? null;
        $revenueTotal = (float) ($summary['total_amount'] ?? 0);
        $operatingGap = $expenses ? $revenueTotal - (float) $expenses['operating_expenses'] : 0;
        $netGap = $expenses ? $operatingGap - (float) $expenses['capital_amount'] : 0;
    @endphp
    @if ($expenses)
        <div class="section">
            <h2>ค่าใช้จ่ายภายนอก</h2>
            <table class="data">
                <thead>
                    <tr>
                        <th>ลำดับ</th>
                        <th>รายการ</th>
                        <th class="num">จำนวนเงิน</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($expenses['lines'] as $line)
                        <tr>
                            <td>{{ $line['line_no'] }}</td>
                            <td>{{ $line['name'] }}</td>
                            <td class="num">{{ $money($line['amount']) }}</td>
                        </tr>
                    @endforeach
                </tbody>
                <tfoot>
                    <tr>
                        <td></td>
                        <td>รวมค่าใช้จ่าย</td>
                        <td class="num">{{ $money($expenses['total_amount']) }}</td>
                    </tr>
                </tfoot>
            </table>
            <table class="data">
                <thead>
                    <tr>
                        <th>เทียบรายรับค่ารักษา HOSxP</th>
                        <th class="num">จำนวนเงิน</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>รายรับค่ารักษา HOSxP</td>
                        <td class="num">{{ $money($revenueTotal) }}</td>
                    </tr>
                    <tr>
                        <td>ผลต่างดำเนินงาน</td>
                        <td class="num">{{ $money($operatingGap) }}</td>
                    </tr>
                    <tr>
                        <td>ผลต่างสุทธิ</td>
                        <td class="num">{{ $money($netGap) }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    @endif

    <div class="footer">
        รายงานนี้สร้างจาก HOSxP ตาราง opitemrece · ไม่ใช้ an_stat · {{ $appName ?? '' }}
    </div>
</body>
</html>
