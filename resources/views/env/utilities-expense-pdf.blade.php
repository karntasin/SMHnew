<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>{{ $title }}</title>
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
        h2 {
            margin: 12px 0 5px; padding-left: 6px; border-left: 3px solid #14b8a6;
            color: #0f766e; font-size: 11px; font-weight: bold;
        }
        table.data { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        table.data th {
            background: #134e4a; color: #fff; font-size: 8px; font-weight: bold;
            text-align: left; padding: 4px 3px; border: 1px solid #115e59;
        }
        table.data th.num, table.data td.num { text-align: right; }
        table.data th.sub {
            background: #f1f5f9; color: #64748b; font-weight: normal; font-size: 7px;
        }
        table.data td {
            padding: 3px; border: 1px solid #d1d5db; vertical-align: top;
            font-size: 8.5px; color: #0f172a;
        }
        table.data tr.sub td { background: #f8fafc; }
        table.data tr.total td { background: #ecfdf5; font-weight: bold; }
        .num { text-align: right; white-space: nowrap; }
        .footer {
            margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 4px;
            font-size: 8px; color: #94a3b8;
        }
        .footer .right { float: right; }
        .empty {
            text-align: center; padding: 12px; color: #94a3b8;
            border: 1px dashed #cbd5e1;
        }
        .group { page-break-inside: avoid; margin-bottom: 10px; }
    </style>
</head>
<body>
    @php
        $fmt = fn ($n) => $n === null || $n === '' ? '-' : number_format((float) $n, 2);
        $fmtOrDash = function ($n) {
            if ($n === null) return '-';
            return number_format((float) $n, 2);
        };
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
                <div>{{ $title }}</div>
            </td>
        </tr>
    </table>

    <table class="hero">
        <tr>
            <td class="hero-left">
                <div style="font-size:8px;margin-bottom:2px;">Utility Expense Report</div>
                <h1>{{ $title }}</h1>
                <div style="margin-top:3px;font-size:9px;">ปีงบประมาณ {{ $fiscalYear }}
                    @if(!$includeSp3) · ไม่รวม สป.3 / มิเตอร์แอร์ (ดู PDF แยก) @endif
                </div>
            </td>
            <td class="hero-right">
                <div style="font-size:13px;font-weight:bold;">{{ $fmt($grandTotal) }}</div>
                <div style="font-size:8px;color:#0f766e;">บาท</div>
            </td>
        </tr>
    </table>

    @if (count($groups) === 0)
        <div class="empty">ไม่พบข้อมูลในปีงบนี้</div>
    @else
        @foreach ($groups as $group)
            @php
                $ledger = $group['ledger'] ?? null;
                $hasInvoice = $group['has_invoice'] ?? false;
                $hasMedical = $group['has_medical'] ?? false;
                $hasRevenue = $group['has_revenue'] ?? false;
                $hasAdmin = $group['has_admin'] ?? false;
            @endphp
            <div class="group">
                <h2>{{ $group['name'] }} · รวม {{ $fmt($group['total']) }} บาท</h2>
                @if (!$ledger)
                    <div class="empty">ไม่มีข้อมูล</div>
                @else
                    <table class="data">
                        <thead>
                            <tr>
                                <th style="width:12%;">เดือนปี</th>
                                @if ($hasInvoice)<th class="num">ใบแจ้งหนี้</th>@endif
                                @if ($hasMedical)<th class="num">งบการแพทย์</th>@endif
                                @if ($hasRevenue)<th class="num">งบรายรับ</th>@endif
                                @if ($hasAdmin)<th class="num">งบบริหารหน่วย</th>@endif
                                <th>หมายเหตุ</th>
                            </tr>
                            <tr>
                                <th class="sub"></th>
                                @if ($hasInvoice)<th class="sub num">จำนวนเงิน(บาท)</th>@endif
                                @if ($hasMedical)<th class="sub num">จำนวนเงิน(บาท)</th>@endif
                                @if ($hasRevenue)<th class="sub num">จำนวนเงิน(บาท)</th>@endif
                                @if ($hasAdmin)<th class="sub num">จำนวนเงิน(บาท)</th>@endif
                                <th class="sub"></th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($ledger['periods'] as $period)
                                @if (!($period['has_data'] ?? false))
                                    <tr>
                                        <td>{{ $period['label'] }}</td>
                                        @if ($hasInvoice)<td class="num">-</td>@endif
                                        @if ($hasMedical)<td class="num">-</td>@endif
                                        @if ($hasRevenue)<td class="num">-</td>@endif
                                        @if ($hasAdmin)<td class="num">-</td>@endif
                                        <td>-</td>
                                    </tr>
                                @else
                                    @foreach ($period['rows'] as $idx => $row)
                                        <tr class="{{ !empty($row['is_sub']) ? 'sub' : '' }}">
                                            <td>{{ $idx === 0 ? $period['label'] : '' }}</td>
                                            @if ($hasInvoice)<td class="num">{{ $fmtOrDash($row['invoice_amount'] ?? null) }}</td>@endif
                                            @if ($hasMedical)<td class="num">{{ $fmtOrDash($row['budget_medical'] ?? null) }}</td>@endif
                                            @if ($hasRevenue)<td class="num">{{ $fmtOrDash($row['budget_revenue'] ?? null) }}</td>@endif
                                            @if ($hasAdmin)<td class="num">{{ $fmtOrDash($row['budget_admin'] ?? null) }}</td>@endif
                                            <td>{{ $row['note'] ?: ($row['line_label'] ?? '') }}</td>
                                        </tr>
                                    @endforeach
                                @endif
                            @endforeach
                            <tr class="total">
                                <td>รวมเงิน</td>
                                @if ($hasInvoice)<td class="num">{{ $fmt($ledger['grand_totals']['invoice'] ?? 0) }}</td>@endif
                                @if ($hasMedical)<td class="num">{{ $fmt($ledger['grand_totals']['medical'] ?? 0) }}</td>@endif
                                @if ($hasRevenue)<td class="num">{{ $fmt($ledger['grand_totals']['revenue'] ?? 0) }}</td>@endif
                                @if ($hasAdmin)<td class="num">{{ $fmt($ledger['grand_totals']['admin'] ?? 0) }}</td>@endif
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                @endif
            </div>
        @endforeach
    @endif

    <div class="footer">
        <span>{{ $hospitalName }} · ENV · สาธารณูปโภค</span>
        <span class="right">พิมพ์เมื่อ {{ $generatedAt }}</span>
    </div>
</body>
</html>
