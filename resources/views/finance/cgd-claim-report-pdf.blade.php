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
        .meta { color: #4b5563; font-size: 10px; margin-bottom: 8px; }
        .kpi { width: 100%; border-collapse: separate; border-spacing: 5px 5px; margin: 0 0 8px; }
        .kpi td { width: 12.5%; vertical-align: top; }
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
    @php
        $summary = $summary ?? [];
        $monthly = $monthly ?? [];
        $byStatus = $byStatus ?? [];
        $doc = $docLabel ?? ($batch->document_no ?? $batch->filename ?? 'สรุปทุกไฟล์');
    @endphp

    <h1>รายงานสรุปเปรียบเทียบข้อมูลเรียกเก็บ STM กับ ชดเชยสุทธิ และ HOSxP ตามวันที่มารับบริการ</h1>
    <div class="meta">
        {{ $hospitalName }} · {{ $doc }}
        @if (!empty($startDateFilter) && !empty($endDateFilter))
            · ช่วงวันที่รับบริการ {{ date('d/m/Y', strtotime($startDateFilter)) }} - {{ date('d/m/Y', strtotime($endDateFilter)) }}
        @elseif (!empty($reconciliation->start_date) && !empty($reconciliation->end_date))
            · ช่วง HOSxP {{ $reconciliation->start_date->format('d/m/Y') }} - {{ $reconciliation->end_date->format('d/m/Y') }}
        @endif
        · สร้างเมื่อ {{ $generatedAt }}
    </div>
    <div class="meta">
        กรองสถานะ: <strong>{{ $statusFilterLabel ?? 'ทั้งหมด' }}</strong>
        · กรองเดือน: <strong>{{ $monthFilterLabel ?? 'ทุกเดือน' }}</strong>
        · กรอง Error: <strong>{{ $errorFilterLabel ?? 'ทุก Error Code' }}</strong>
        · กรองยอดเงิน: <strong>{{ $amountFilterLabel ?? 'ทุกยอดเงิน' }}</strong>
        @if (!empty($search))
            · คำค้น: <strong>{{ $search }}</strong>
        @endif
        · รายการตามตัวกรอง {{ number_format($summary['item_count'] ?? $items->count()) }} รายการ
    </div>

    <h2>สรุปการเปรียบเทียบตามวันที่ผู้ป่วยมารับบริการ (สิทธิจ่ายตรง 12)</h2>
    <table class="kpi">
        <tr>
            <td style="width: 16.66%;">
                <div class="box">
                    <div class="label">1. HOSxP (SEQ ตรง) (12)</div>
                    <div class="value">{{ number_format($summary['total_hosxp'] ?? 0, 2) }}</div>
                    <div style="font-size: 8pt; color: #64748b;">{{ number_format($summary['hosxp_matched_count'] ?? 0) }} visits · สุทธิ {{ number_format($summary['total_hosxp_net'] ?? 0, 2) }}</div>
                </div>
            </td>
            <td style="width: 16.66%;">
                <div class="box">
                    <div class="label">2. HOSxP ตามวันที่บริการ (12)</div>
                    <div class="value">{{ number_format($summary['total_hosxp_all_net'] ?? $summary['total_hosxp_all'] ?? 0, 2) }}</div>
                    <div style="font-size: 8pt; color: #64748b;">{{ number_format($summary['hosxp_all_count'] ?? 0) }} visits ทั้งหมด</div>
                </div>
            </td>
            <td style="width: 16.66%;">
                <div class="box">
                    <div class="label">3. STM (SEQ ตรง)</div>
                    <div class="value">{{ number_format($summary['total_stm_claim_matched'] ?? 0, 2) }}</div>
                    <div style="font-size: 8pt; color: #64748b;">ชดเชย {{ number_format($summary['total_stm_approved_matched'] ?? 0, 2) }}</div>
                </div>
            </td>
            <td style="width: 16.66%;">
                <div class="box">
                    <div class="label">4. STM ตามวันที่บริการ</div>
                    <div class="value">{{ number_format($summary['total_claim'] ?? 0, 2) }}</div>
                    <div style="font-size: 8pt; color: #64748b;">ชดเชย {{ number_format($summary['total_approved'] ?? 0, 2) }}</div>
                </div>
            </td>
            <td style="width: 16.66%;">
                <div class="box">
                    <div class="label">5. ยอดขาด</div>
                    <div class="value" style="color:#b91c1c">{{ number_format($summary['total_shortfall'] ?? 0, 2) }}</div>
                    <div style="font-size: 8pt; color: #b91c1c;">{{ number_format($summary['shortfall_count'] ?? 0) }} รายการ</div>
                </div>
            </td>
            <td style="width: 16.66%;">
                <div class="box">
                    <div class="label">6. HOSxP ไม่มี SEQ ตรง (12)</div>
                    <div class="value" style="color:#b45309">{{ number_format($summary['total_hosxp_unmatched_net'] ?? 0, 2) }}</div>
                    <div style="font-size: 8pt; color: #b45309;">{{ number_format($summary['only_hosxp_count'] ?? 0) }} visits (หลังหัก Payment)</div>
                </div>
            </td>
        </tr>
    </table>

    @if (!empty($byStatus))
        <h2>แยกตามสถานะ</h2>
        <table class="data">
            <thead>
                <tr>
                    <th>สถานะ</th>
                    <th class="num">จำนวน</th>
                    <th class="num">เรียกเก็บ</th>
                    <th class="num">ชดเชยสุทธิ</th>
                    <th class="num">ยอดขาด</th>
                    <th class="num">HOSxP หลังหัก</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($byStatus as $row)
                    <tr>
                        <td>{{ $row['label'] }}</td>
                        <td class="num">{{ number_format($row['count']) }}</td>
                        <td class="num">{{ number_format($row['total_claim'], 2) }}</td>
                        <td class="num">{{ number_format($row['total_approved'], 2) }}</td>
                        <td class="num short">{{ number_format($row['total_shortfall'], 2) }}</td>
                        <td class="num">{{ number_format($row['total_hosxp_net'], 2) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    @if (!empty($monthly))
        <h2>แยกตามเดือน</h2>
        <table class="data">
            <thead>
                <tr>
                    <th>เดือน</th>
                    <th class="num">รายการ</th>
                    <th class="num">HOSxP (SEQ)</th>
                    <th class="num">หลังหัก</th>
                    <th class="num">เรียกเก็บ</th>
                    <th class="num">ชดเชยสุทธิ</th>
                    <th class="num">ยอดขาด</th>
                    <th class="num">HOSxP ไม่มี SEQ</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($monthly as $m)
                    <tr>
                        <td>{{ $m['label'] }}</td>
                        <td class="num">{{ number_format($m['item_count']) }}</td>
                        <td class="num">{{ number_format($m['total_hosxp'], 2) }}</td>
                        <td class="num">{{ number_format($m['total_hosxp_net'], 2) }}</td>
                        <td class="num">{{ number_format($m['total_stm_claim'], 2) }}</td>
                        <td class="num">{{ number_format($m['total_stm_approved'], 2) }}</td>
                        <td class="num short">{{ number_format($m['total_shortfall'], 2) }}</td>
                        <td class="num">{{ number_format($m['total_hosxp_unmatched_net'] ?? 0, 2) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <h2>
        @if (!empty($statusFilter))
            รายการสถานะ: {{ $statusFilterLabel }}
        @else
            รายการที่ต้องติดตาม
        @endif
        (แสดง {{ number_format($items->count()) }}
        @if (!empty($detailTotal))
            จาก {{ number_format($detailTotal) }}
        @endif
        รายการ
        @if (!empty($detailCapped))
            · จำกัด 500 แถว
        @endif
        )
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
                <th class="num">ชดเชยสุทธิ</th>
                <th class="num">ผลต่าง</th>
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
                    $diff = (float) ($item->diff_approved ?? 0);
                @endphp
                <tr>
                    <td>
                        {{ $statusLabels[$item->status] ?? $item->status }}
                        @if ($adjusted)
                            <strong style="color:#b45309"> ★หักP</strong>
                        @endif
                    </td>
                    <td>{{ $item->hn }}</td>
                    <td>{{ \App\Support\PiiMask::cid($item->pid) }}</td>
                    <td>{{ $item->seq_no }}</td>
                    <td>{{ $item->patient_name ? \App\Support\PiiMask::patientName($item->patient_name) : 'ไม่พบชื่อใน HOSxP' }}</td>
                    <td>{{ $item->pttype ?: (($item->pttype_code ?? '').($item->hipdata_code ? ' ('.$item->hipdata_code.')' : '')) }}</td>
                    <td>{{ optional($item->visit_date)->format('d/m/Y') }}</td>
                    <td class="num">{{ $gross !== null ? number_format($gross, 2) : '-' }}</td>
                    <td class="num" @if($adjusted) style="color:#b45309;font-weight:bold" @endif>{{ number_format($paid, 2) }}</td>
                    <td class="num">{{ $net !== null ? number_format($net, 2) : '-' }}</td>
                    <td class="num">{{ number_format((float) $item->stm_claim, 2) }}</td>
                    <td class="num">{{ number_format((float) $item->stm_approved, 2) }}</td>
                    <td class="num {{ $diff > 0.009 ? 'short' : ($diff < -0.009 ? '' : 'ok') }}">{{ number_format($diff, 2) }}</td>
                    <td class="num short">{{ number_format((float) $item->shortfall, 2) }}</td>
                </tr>
            @empty
                <tr><td colspan="14">ไม่พบรายการตามตัวกรอง</td></tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        รายงานตามตัวกรองปัจจุบัน · จับคู่ HN+PID+SEQ · ยอดขาด = เรียกเก็บ − ชดเชยสุทธิ · HOSxP นับเฉพาะ SEQ ตรง · ★หักP = มีหัก Payment · pttype LIKE {{ $reconciliation->pttype_like }}
    </div>
</body>
</html>
