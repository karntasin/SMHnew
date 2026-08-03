<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>รายงานตรวจสอบเบิกจ่ายตรง กรมบัญชีกลาง</title>
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
        @page { margin: 24px 28px; }
        * { box-sizing: border-box; font-family: 'sarabun', sans-serif; }
        body { font-size: 11px; color: #111827; line-height: 1.4; }
        h1 { font-size: 18px; margin: 0 0 2px 0; color: #047857; font-weight: bold; }
        h2 { font-size: 12px; margin: 12px 0 6px; color: #047857; border-bottom: 2px solid #a7f3d0; padding-bottom: 3px; }
        .meta { color: #4b5563; font-size: 10px; margin-bottom: 10px; }
        .kpi { width: 100%; border-collapse: separate; border-spacing: 5px 5px; margin: 0 0 10px; }
        .kpi td { width: 14.28%; vertical-align: top; }
        .box { border: 1px solid #d1d5db; border-radius: 6px; padding: 6px 8px; background: #f0fdfa; overflow: hidden; }
        .label { font-size: 8px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .value { font-size: 11px; font-weight: bold; color: #047857; word-break: break-all; line-height: 1.25; }
        table.data { width: 100%; border-collapse: collapse; table-layout: fixed; }
        table.data th {
            background: #047857; color: #fff; font-size: 8px; padding: 4px 3px; text-align: left;
        }
        table.data td { border-bottom: 1px solid #e5e7eb; padding: 3px; font-size: 8px; vertical-align: top; word-break: break-word; }
        .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
        .short { color: #b91c1c; font-weight: bold; }
        .ok { color: #047857; }
        .footer { margin-top: 10px; font-size: 9px; color: #6b7280; }
    </style>
</head>
<body>
    <h1>รายงานตรวจสอบเบิกจ่ายตรง กรมบัญชีกลาง</h1>
    <div class="meta">
        {{ $hospitalName }} · เอกสาร {{ $batch->document_no ?: $batch->filename }}
        · ช่วง HOSxP {{ $reconciliation->start_date->format('d/m/Y') }} - {{ $reconciliation->end_date->format('d/m/Y') }}
        · สร้างเมื่อ {{ $generatedAt }}
    </div>
    <div class="meta">
        กรองเดือน: <strong>{{ $monthFilterLabel ?? 'ทุกเดือน' }}</strong>
        · กรองสถานะ: <strong>{{ $statusFilterLabel ?? 'ทั้งหมด' }}</strong>
        @if (!empty($search))
            · คำค้น: <strong>{{ $search }}</strong>
        @endif
        · จำนวนในรายงานนี้ {{ number_format($items->count()) }} รายการ
        @if (empty($statusFilter))
            (ไม่รวมสถานะตรงกัน)
        @endif
    </div>

    <table class="kpi">
        <tr>
            <td><div class="box"><div class="label">Visit HOSxP</div><div class="value">{{ number_format($reconciliation->hosxp_count) }}</div></div></td>
            <td><div class="box"><div class="label">รายการ STM</div><div class="value">{{ number_format($reconciliation->stm_count) }}</div></div></td>
            <td><div class="box"><div class="label">ยอด HOSxP รวม</div><div class="value">{{ number_format($reconciliation->total_hosxp, 2) }}</div></div></td>
            <td><div class="box"><div class="label">Payment</div><div class="value">{{ number_format($totalHosxpPaid ?? 0, 2) }}</div></div></td>
            <td><div class="box"><div class="label">หลังหัก Payment</div><div class="value">{{ number_format($totalHosxpNet ?? max(0, (float) $reconciliation->total_hosxp - (float) ($totalHosxpPaid ?? 0)), 2) }}</div></div></td>
            <td><div class="box"><div class="label">พึงรับ STM</div><div class="value">{{ number_format($reconciliation->total_stm_approved, 2) }}</div></div></td>
            <td><div class="box"><div class="label">ยอดขาด</div><div class="value" style="color:#b91c1c">{{ number_format($reconciliation->total_shortfall, 2) }}</div></div></td>
        </tr>
    </table>

    <div class="meta">
        ตรงกัน {{ number_format($reconciliation->matched_ok) }} ·
        ขาดเงิน {{ number_format($reconciliation->matched_short) }} ·
        เกิน {{ number_format($reconciliation->matched_over) }} ·
        มีเฉพาะ HOSxP {{ number_format($reconciliation->only_hosxp) }} ·
        มีเฉพาะ STM {{ number_format($reconciliation->only_stm) }} ·
        STM นอกช่วง {{ number_format($reconciliation->stm_out_of_range ?? 0) }}
    </div>

    <h2>
        @if (!empty($statusFilter))
            รายการสถานะ: {{ $statusFilterLabel }} (สูงสุด 500 รายการ)
        @else
            รายการที่ต้องติดตาม (สูงสุด 500 รายการ)
        @endif
    </h2>
    <table class="data">
        <thead>
            <tr>
                <th>สถานะ</th>
                <th>HN</th>
                <th>PID</th>
                <th>SEQ</th>
                <th>ชื่อ</th>
                <th>สิทธิ</th>
                <th>วันที่</th>
                <th class="num">HOSxP</th>
                <th class="num">Payment</th>
                <th class="num">หลังหัก</th>
                <th class="num">เรียกเก็บ</th>
                <th class="num">พึงรับ</th>
                <th class="num">ขาด</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($items as $item)
                @php
                    $paid = (float) ($item->hosxp_paid ?? 0);
                    $gross = $item->hosxp_total !== null ? (float) $item->hosxp_total : null;
                    $net = $gross !== null ? max(0, $gross - $paid) : null;
                    $adjusted = $paid > 0.009;
                @endphp
                <tr>
                    <td>
                        {{ $statusLabels[$item->status] ?? $item->status }}
                        @if ($adjusted)
                            <strong style="color:#b45309"> ★หักP</strong>
                        @endif
                    </td>
                    <td>{{ $item->hn }}</td>
                    <td>{{ $item->pid }}</td>
                    <td>{{ $item->seq_no }}</td>
                    <td>{{ $item->patient_name ?: 'ไม่พบชื่อใน HOSxP' }}</td>
                    <td>{{ $item->pttype ?: (($item->pttype_code ?? '').($item->hipdata_code ? ' ('.$item->hipdata_code.')' : '')) }}</td>
                    <td>{{ optional($item->visit_date)->format('d/m/Y') }}</td>
                    <td class="num">{{ $gross !== null ? number_format($gross, 2) : '-' }}</td>
                    <td class="num" @if($adjusted) style="color:#b45309;font-weight:bold" @endif>{{ number_format($paid, 2) }}</td>
                    <td class="num">{{ $net !== null ? number_format($net, 2) : '-' }}</td>
                    <td class="num">{{ number_format((float) $item->stm_claim, 2) }}</td>
                    <td class="num">{{ number_format((float) $item->stm_approved, 2) }}</td>
                    <td class="num short">{{ number_format((float) $item->shortfall, 2) }}</td>
                </tr>
            @empty
                <tr><td colspan="13">ไม่พบรายการที่ต้องติดตาม</td></tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        จับคู่ด้วย HN + PID + SEQ NO (และสำรองด้วยวันที่รับบริการ) · เปรียบเทียบ (HOSxP รวม − Payment) กับ STM พึงรับทั้งหมด · ★หักP = มีหัก Payment · เกณฑ์สิทธิ์ pttype LIKE {{ $reconciliation->pttype_like }}
    </div>
</body>
</html>
