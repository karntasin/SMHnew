<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>รายงานเปรียบเทียบผลต่างสิทธิ์จ่ายตรง: {{ $compareA['short_label'] }} VS {{ $compareB['short_label'] }}</title>
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
        h1 { font-size: 17px; margin: 0 0 2px 0; color: #047857; font-weight: bold; }
        h2 { font-size: 12px; margin: 12px 0 6px; color: #047857; border-bottom: 2px solid #a7f3d0; padding-bottom: 3px; }
        .meta { color: #4b5563; font-size: 10px; margin-bottom: 8px; }
        .matrix-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .matrix-table th { background: #047857; color: #fff; font-size: 9px; padding: 5px 6px; text-align: left; }
        .matrix-table td { border: 1px solid #d1d5db; padding: 5px 6px; font-size: 9px; }
        .matrix-table .highlight { background: #f0fdf4; font-weight: bold; }
        .matrix-table .delta-pos { color: #047857; font-weight: bold; }
        .matrix-table .delta-neg { color: #b91c1c; font-weight: bold; }

        .kpi { width: 100%; border-collapse: separate; border-spacing: 3px 3px; margin: 0 0 10px; }
        .kpi td { width: 14.28%; vertical-align: top; }
        .box { border: 1px solid #d1d5db; border-radius: 6px; padding: 4px 5px; background: #f8fafc; }
        .box.active-a { border: 2px solid #2563eb; background: #eff6ff; }
        .box.active-b { border: 2px solid #059669; background: #ecfdf5; }
        .label { font-size: 7.5px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .value { font-size: 9px; font-weight: bold; color: #0f172a; line-height: 1.2; }

        table.data { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 6px; }
        table.data th { background: #0f172a; color: #fff; font-size: 8px; padding: 4px 3px; text-align: left; }
        table.data td { border-bottom: 1px solid #e5e7eb; padding: 3px; font-size: 8px; vertical-align: top; word-break: break-word; }
        .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
        .short { color: #b91c1c; font-weight: bold; }
        .ok { color: #047857; }
        .badge { display: inline-block; padding: 1px 4px; border-radius: 4px; font-size: 7px; font-weight: bold; }
        .footer { margin-top: 10px; font-size: 8.5px; color: #6b7280; }
    </style>
</head>
<body>
    @php
        $doc = $docLabel ?? 'เปรียบเทียบข้อมูล STM กับ HOSxP';
        $summary = $summary ?? [];
    @endphp

    <h1>รายงานเปรียบเทียบผลต่างสิทธิ์จ่ายตรง: {{ $compareA['short_label'] }} VS {{ $compareB['short_label'] }}</h1>
    <div class="meta">
        {{ $hospitalName }} · {{ $doc }}
        @if (!empty($startDateFilter) && !empty($endDateFilter))
            · ช่วงวันที่รับบริการ {{ date('d/m/Y', strtotime($startDateFilter)) }} ถึง {{ date('d/m/Y', strtotime($endDateFilter)) }}
        @endif
        · สร้างเมื่อ {{ $generatedAt }}
    </div>

    <!-- แถบสรุป 7 รายการหลัก (ไฮไลต์ข้อที่เลือกเปรียบเทียบ) -->
    <table class="kpi">
        <tr>
            <td>
                <div class="box {{ $compareA['key'] === 'hosxp_matched' ? 'active-a' : ($compareB['key'] === 'hosxp_matched' ? 'active-b' : '') }}">
                    <div class="label">1. HOSxP (SEQ ตรง) {{ $compareA['key'] === 'hosxp_matched' ? '[ข้อ A]' : ($compareB['key'] === 'hosxp_matched' ? '[ข้อ B]' : '') }}</div>
                    <div class="value">{{ number_format($summary['total_hosxp_net'] ?? 0, 2) }}</div>
                    <div style="font-size: 7.5pt; color: #64748b;">{{ number_format($summary['hosxp_matched_count'] ?? 0) }} รายการ · ชำระเอง {{ number_format($summary['total_hosxp_paid'] ?? 0, 2) }}</div>
                </div>
            </td>
            <td>
                <div class="box {{ $compareA['key'] === 'hosxp_all' ? 'active-a' : ($compareB['key'] === 'hosxp_all' ? 'active-b' : '') }}">
                    <div class="label">2. HOSxP ตามวันบริการ {{ $compareA['key'] === 'hosxp_all' ? '[ข้อ A]' : ($compareB['key'] === 'hosxp_all' ? '[ข้อ B]' : '') }}</div>
                    <div class="value">{{ number_format($summary['total_hosxp_all_net'] ?? 0, 2) }}</div>
                    <div style="font-size: 7.5pt; color: #64748b;">{{ number_format($summary['hosxp_all_count'] ?? 0) }} รายการ · ชำระเอง {{ number_format($summary['total_hosxp_all_paid'] ?? 0, 2) }}</div>
                </div>
            </td>
            <td>
                <div class="box {{ $compareA['key'] === 'stm_matched' ? 'active-a' : ($compareB['key'] === 'stm_matched' ? 'active-b' : '') }}">
                    <div class="label">3. STM (SEQ ตรง) {{ $compareA['key'] === 'stm_matched' ? '[ข้อ A]' : ($compareB['key'] === 'stm_matched' ? '[ข้อ B]' : '') }}</div>
                    <div class="value">{{ number_format($summary['total_stm_claim_matched'] ?? 0, 2) }}</div>
                    <div style="font-size: 7.5pt; color: #64748b;">ชดเชย {{ number_format($summary['total_stm_approved_matched'] ?? 0, 2) }}</div>
                </div>
            </td>
            <td>
                <div class="box {{ $compareA['key'] === 'stm_all' ? 'active-a' : ($compareB['key'] === 'stm_all' ? 'active-b' : '') }}">
                    <div class="label">4. STM ตามวันบริการ {{ $compareA['key'] === 'stm_all' ? '[ข้อ A]' : ($compareB['key'] === 'stm_all' ? '[ข้อ B]' : '') }}</div>
                    <div class="value">{{ number_format($summary['total_claim'] ?? 0, 2) }}</div>
                    <div style="font-size: 7.5pt; color: #64748b;">ชดเชย {{ number_format($summary['total_approved'] ?? 0, 2) }}</div>
                </div>
            </td>
            <td>
                <div class="box {{ $compareA['key'] === 'matched_short' ? 'active-a' : ($compareB['key'] === 'matched_short' ? 'active-b' : '') }}">
                    <div class="label" style="color: #b91c1c;">5. ยอดขาด {{ $compareA['key'] === 'matched_short' ? '[ข้อ A]' : ($compareB['key'] === 'matched_short' ? '[ข้อ B]' : '') }}</div>
                    <div class="value" style="color: #b91c1c;">{{ number_format($summary['total_shortfall'] ?? 0, 2) }}</div>
                    <div style="font-size: 7.5pt; color: #b91c1c;">{{ number_format($summary['shortfall_count'] ?? 0) }} รายการขาดเงิน</div>
                </div>
            </td>
            <td>
                <div class="box {{ $compareA['key'] === 'only_hosxp' ? 'active-a' : ($compareB['key'] === 'only_hosxp' ? 'active-b' : '') }}">
                    <div class="label" style="color: #b45309;">6. HOSxP ไม่มี SEQ {{ $compareA['key'] === 'only_hosxp' ? '[ข้อ A]' : ($compareB['key'] === 'only_hosxp' ? '[ข้อ B]' : '') }}</div>
                    <div class="value" style="color: #b45309;">{{ number_format($summary['total_hosxp_unmatched_net'] ?? 0, 2) }}</div>
                    <div style="font-size: 7.5pt; color: #b45309;">{{ number_format($summary['only_hosxp_count'] ?? 0) }} รายการไม่มีใน STM</div>
                </div>
            </td>
            <td>
                <div class="box {{ $compareA['key'] === 'hosxp_paid' ? 'active-a' : ($compareB['key'] === 'hosxp_paid' ? 'active-b' : '') }}">
                    <div class="label" style="color: #6b21a8;">7. ชำระเอง (Payment) {{ $compareA['key'] === 'hosxp_paid' ? '[ข้อ A]' : ($compareB['key'] === 'hosxp_paid' ? '[ข้อ B]' : '') }}</div>
                    <div class="value" style="color: #6b21a8;">{{ number_format($summary['total_hosxp_all_paid'] ?? 0, 2) }}</div>
                    <div style="font-size: 7.5pt; color: #6b21a8;">{{ number_format($summary['hosxp_paid_count'] ?? 0) }} รายการชำระเอง</div>
                </div>
            </td>
        </tr>
    </table>

    <h2>ตารางเปรียบเทียบผลต่างระหว่างคู่ที่เลือก (Executive Comparison Matrix)</h2>
    <table class="matrix-table">
        <thead>
            <tr>
                <th style="width: 25%;">มิติการเปรียบเทียบ</th>
                <th style="width: 25%; background: #1e40af;">รายการที่ 1 [A]: {{ $compareA['label'] }}</th>
                <th style="width: 25%; background: #047857;">รายการที่ 2 [B]: {{ $compareB['label'] }}</th>
                <th style="width: 25%; background: #334155;">ผลต่างการเปรียบเทียบ (A − B)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>จำนวนรายการ (Visits / Records)</strong></td>
                <td class="num" style="font-weight: bold;">{{ number_format($compareA['count']) }} รายการ</td>
                <td class="num" style="font-weight: bold;">{{ number_format($compareB['count']) }} รายการ</td>
                <td class="num {{ $deltaCount === 0 ? '' : ($deltaCount > 0 ? 'delta-pos' : 'delta-neg') }}">
                    {{ $deltaCount > 0 ? '+' : '' }}{{ number_format($deltaCount) }} รายการ
                    <span style="font-size: 8px; font-weight: normal; color: #64748b;">
                        ({{ $deltaCount === 0 ? 'เท่ากัน' : ($deltaCount > 0 ? 'ฝั่ง A มากกว่า' : 'ฝั่ง B มากกว่า') }})
                    </span>
                </td>
            </tr>
            <tr>
                <td><strong>ยอดเงินรวม (Net Amount หลังหัก Payment)</strong></td>
                <td class="num" style="font-weight: bold;">{{ number_format($compareA['gross'], 2) }} บาท</td>
                <td class="num" style="font-weight: bold;">{{ number_format($compareB['gross'], 2) }} บาท</td>
                <td class="num {{ $deltaGross === 0.0 ? '' : ($deltaGross > 0 ? 'delta-pos' : 'delta-neg') }}">
                    {{ $deltaGross > 0 ? '+' : '' }}{{ number_format($deltaGross, 2) }} บาท
                </td>
            </tr>
            <tr>
                <td>
                    <strong>ยอดเงินสุทธิ / ชดเชย</strong>
                    <div style="font-size: 7.5pt; color: #64748b;">
                        A: {{ $compareA['sub_label'] }} | B: {{ $compareB['sub_label'] }}
                    </div>
                </td>
                <td class="num" style="font-weight: bold; color: #1e40af;">{{ number_format($compareA['net'], 2) }} บาท</td>
                <td class="num" style="font-weight: bold; color: #047857;">{{ number_format($compareB['net'], 2) }} บาท</td>
                <td class="num {{ $deltaNet === 0.0 ? '' : ($deltaNet > 0 ? 'delta-pos' : 'delta-neg') }}">
                    {{ $deltaNet > 0 ? '+' : '' }}{{ number_format($deltaNet, 2) }} บาท
                </td>
            </tr>
            <tr class="highlight">
                <td><strong>อัตราส่วนสอดคล้อง (Ratio B / A)</strong></td>
                <td colspan="3" style="text-align: center; font-size: 9.5pt;">
                    @if ($compareA['count'] > 0)
                        คิดเป็น <strong>{{ number_format(($compareB['count'] / $compareA['count']) * 100, 1) }}%</strong> ของจำนวนรายการ
                        @if ($compareA['gross'] > 0)
                            · และคิดเป็น <strong>{{ number_format(($compareB['gross'] / $compareA['gross']) * 100, 1) }}%</strong> ของมูลค่ายอดเงินหลัก
                        @endif
                    @else
                        -
                    @endif
                </td>
            </tr>
        </tbody>
    </table>

    <h2>รายการข้อมูลที่เกี่ยวข้องและรายการที่มีผลต่าง (ตัวอย่าง 100 รายการแรก)</h2>
    <table class="data">
        <thead>
            <tr>
                <th style="width: 25px;">#</th>
                <th style="width: 55px;">วันที่รับบริการ</th>
                <th style="width: 55px;">HN</th>
                <th style="width: 75px;">เลขบัตร ปชช.</th>
                <th style="width: 105px;">ชื่อ-นามสกุล</th>
                <th style="width: 65px;">SEQ</th>
                <th style="width: 55px;" class="num">HOSxP สุทธิ</th>
                <th style="width: 55px;" class="num">เรียกเก็บ STM</th>
                <th style="width: 55px;" class="num">ชดเชยสุทธิ</th>
                <th style="width: 55px;" class="num">ยอดขาด</th>
                <th style="width: 85px;">สถานะ</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($items as $idx => $item)
                @php
                    $hGross = (float) ($item->hosxp_total ?? 0);
                    $hPaid = (float) ($item->hosxp_paid ?? 0);
                    $hNet = max(0, $hGross - $hPaid);
                    $cClaim = (float) ($item->stm_claim ?? 0);
                    $cAppr = (float) ($item->stm_approved ?? 0);
                    $short = (float) ($item->shortfall ?? 0);

                    $statusBadge = match ($item->status) {
                        'matched_ok' => '<span class="badge" style="background:#d1fae5;color:#065f46;">ตรงกัน</span>',
                        'matched_short' => '<span class="badge" style="background:#fee2e2;color:#991b1b;">ขาดเงิน</span>',
                        'matched_over' => '<span class="badge" style="background:#fef3c7;color:#92400e;">ชดเชยเกิน</span>',
                        'only_hosxp' => '<span class="badge" style="background:#e0f2fe;color:#075985;">มีเฉพาะ HOSxP</span>',
                        'only_stm' => '<span class="badge" style="background:#ede9fe;color:#5b21b6;">มีเฉพาะ STM</span>',
                        default => '<span class="badge" style="background:#f1f5f9;color:#334155;">'.$item->status.'</span>',
                    };
                @endphp
                <tr>
                    <td>{{ $idx + 1 }}</td>
                    <td>{{ optional($item->visit_date)->format('d/m/Y') ?: '-' }}</td>
                    <td>{{ $item->hn ?: '-' }}</td>
                    <td>{{ \App\Support\PiiMask::cid($item->pid) }}</td>
                    <td>{{ \App\Support\PiiMask::patientName($item->patient_name) }}</td>
                    <td>{{ $item->seq_no ?: '-' }}</td>
                    <td class="num">{{ $item->hosxp_total !== null ? number_format($hNet, 2) : '-' }}</td>
                    <td class="num">{{ $item->stm_claim !== null ? number_format($cClaim, 2) : '-' }}</td>
                    <td class="num {{ $cAppr > 0 ? 'ok' : '' }}">{{ $item->stm_approved !== null ? number_format($cAppr, 2) : '-' }}</td>
                    <td class="num {{ $short > 0 ? 'short' : '' }}">{{ $short > 0 ? number_format($short, 2) : '-' }}</td>
                    <td>{!! $statusBadge !!}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="11" style="text-align: center; padding: 12px; color: #64748b;">
                        ไม่พบรายการข้อมูลในเงื่อนไขนี้
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        * เอกสารนี้จัดทำขึ้นเพื่อการตรวจสอบและบริหารการเงินโรงพยาบาล ข้อมูลส่วนบุคคลได้รับการคุ้มครองตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
    </div>
</body>
</html>
