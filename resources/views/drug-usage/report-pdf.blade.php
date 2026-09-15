<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>รายงานยาและการใช้ยา</title>
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
        h1 { font-size: 18px; margin: 0 0 4px 0; color: #0e7490; font-weight: bold; }
        h2 {
            font-size: 12px; margin: 14px 0 6px 0; color: #0e7490; font-weight: bold;
            border-bottom: 1.5px solid #a5f3fc; padding-bottom: 3px;
        }
        .meta { font-size: 9px; color: #4b5563; margin-bottom: 10px; }
        .kpi-row { width: 100%; border-collapse: separate; border-spacing: 6px 0; margin: 0 -6px 10px -6px; }
        .kpi-row td { width: 25%; vertical-align: top; padding: 0; }
        .kpi {
            border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 10px;
            background: #f8fafc;
        }
        .kpi .label { font-size: 9px; color: #6b7280; }
        .kpi .value { font-size: 13px; font-weight: bold; color: #0f172a; margin-top: 2px; }
        table.data { width: 100%; border-collapse: collapse; margin-top: 4px; }
        table.data th {
            background: #ecfeff; color: #0e7490; font-weight: bold; font-size: 9px;
            text-align: left; padding: 5px 4px; border-bottom: 1.5px solid #67e8f9;
        }
        table.data td {
            padding: 4px; border-bottom: 1px solid #e5e7eb; vertical-align: top;
        }
        table.data tr:nth-child(even) td { background: #f9fafb; }
        .num { text-align: right; white-space: nowrap; }
        .section-head td {
            background: #cffafe !important; font-weight: bold; color: #155e75;
            border-top: 1.5px solid #67e8f9; border-bottom: 1px solid #67e8f9;
        }
        .subtotal td {
            background: #f1f5f9 !important; font-weight: bold; border-top: 1px solid #94a3b8;
        }
        .grand td {
            background: #e0f2fe !important; font-weight: bold; border-top: 2px solid #0284c7;
        }
        .footer {
            margin-top: 12px; font-size: 8px; color: #6b7280;
            border-top: 1px solid #e5e7eb; padding-top: 6px;
        }
    </style>
</head>
<body>
    <h1>รายงานข้อมูลยาและการใช้ยา</h1>
    <div class="meta">
        {{ $appName }} · ช่วงวันที่ {{ $startLabel }} – {{ $endLabel }}
        · ประเภท: {{ $formLabel }}
        · สร้างเมื่อ {{ $generatedAt }}
    </div>

    <table class="kpi-row">
        <tr>
            <td><div class="kpi"><div class="label">รายการยา</div><div class="value">{{ number_format($drugCount) }}</div></div></td>
            <td><div class="kpi"><div class="label">จำนวนรวม</div><div class="value">{{ number_format($totalQty, 0) }}</div></div></td>
            <td><div class="kpi"><div class="label">มูลค่ารวม (บาท)</div><div class="value">{{ number_format($totalAmount, 2) }}</div></div></td>
            <td><div class="kpi"><div class="label">ประเภทที่รายงาน</div><div class="value">{{ $formLabel }}</div></div></td>
        </tr>
    </table>

    <h2>สรุปตามประเภทยา</h2>
    <table class="data">
        <thead>
            <tr>
                <th>ประเภท</th>
                <th>รูปแบบ</th>
                <th class="num">รายการยา</th>
                <th class="num">จำนวนรวม</th>
                <th class="num">มูลค่ารวม (บาท)</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($byForm as $item)
                @if (!empty($item['subtypes']))
                    @foreach ($item['subtypes'] as $index => $sub)
                        <tr>
                            @if ($index === 0)
                                <td rowspan="{{ count($item['subtypes']) }}">{{ $item['label'] }}</td>
                            @endif
                            <td>{{ $sub['label'] }}</td>
                            <td class="num">{{ number_format($sub['drug_count']) }}</td>
                            <td class="num">{{ number_format($sub['total_qty'], 0) }}</td>
                            <td class="num">{{ number_format($sub['total_amount'], 2) }}</td>
                        </tr>
                    @endforeach
                @else
                    <tr>
                        <td>{{ $item['label'] }}</td>
                        <td>-</td>
                        <td class="num">{{ number_format($item['drug_count']) }}</td>
                        <td class="num">{{ number_format($item['total_qty'], 0) }}</td>
                        <td class="num">{{ number_format($item['total_amount'], 2) }}</td>
                    </tr>
                @endif
            @endforeach
            <tr class="grand">
                <td colspan="3">รวมทั้งหมด</td>
                <td class="num">{{ number_format($drugCount) }}</td>
                <td class="num">{{ number_format($totalQty, 0) }}</td>
                <td class="num">{{ number_format($totalAmount, 2) }}</td>
            </tr>
        </tbody>
    </table>

    <h2>รายการยาแยกตามประเภท</h2>
    <table class="data">
        <thead>
            <tr>
                <th style="width:4%">#</th>
                <th style="width:10%">รหัส</th>
                <th style="width:28%">ชื่อยา</th>
                <th style="width:12%">ความแรง</th>
                <th style="width:10%">หน่วย</th>
                <th class="num" style="width:12%">ราคา/หน่วย</th>
                <th class="num" style="width:12%">จำนวน</th>
                <th class="num" style="width:12%">มูลค่า</th>
            </tr>
        </thead>
        <tbody>
            @php $i = 0; @endphp
            @foreach ($grouped as $formName => $formRows)
                <tr class="section-head">
                    <td colspan="8">{{ $formName }} ({{ $formRows->count() }} รายการ)</td>
                </tr>
                @php
                    $subQty = 0;
                    $subAmount = 0;
                @endphp
                @foreach ($formRows as $row)
                    @php
                        $i++;
                        $subQty += (float) $row->total_qty;
                        $subAmount += (float) $row->total_amount;
                    @endphp
                    <tr>
                        <td>{{ $i }}</td>
                        <td>{{ $row->icode }}</td>
                        <td>{{ $row->name }}</td>
                        <td>{{ $row->strength ?: '-' }}</td>
                        <td>{{ $row->units }}</td>
                        <td class="num">{{ number_format((float) $row->unitprice, 2) }}</td>
                        <td class="num">{{ number_format((float) $row->total_qty, 0) }}</td>
                        <td class="num">{{ number_format((float) $row->total_amount, 2) }}</td>
                    </tr>
                @endforeach
                <tr class="subtotal">
                    <td colspan="6" class="num">รวม {{ $formName }}</td>
                    <td class="num">{{ number_format($subQty, 0) }}</td>
                    <td class="num">{{ number_format($subAmount, 2) }}</td>
                </tr>
            @endforeach
            <tr class="grand">
                <td colspan="6" class="num">รวมทั้งหมด</td>
                <td class="num">{{ number_format($totalQty, 0) }}</td>
                <td class="num">{{ number_format($totalAmount, 2) }}</td>
            </tr>
        </tbody>
    </table>

    <div class="footer">
        ข้อมูลจาก HOSxP (opitemrece × drugitems) · จัดกลุ่มประเภทจากหน่วยยา (units):
        ยาเม็ด (Tab/แคปซูล/Sachet/กระปุก/กล่อง) · ยาน้ำ (ขวด/ซอง) · ยาฉีด (Amp/Vial/Syringe/หลอด/Unit/Dose/Pen) · ยาใช้ภายนอก (หลอด/Patch)
    </div>
</body>
</html>
