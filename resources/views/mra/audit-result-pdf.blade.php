<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>ผลการตรวจสอบเวชระเบียน {{ $audit->hn }}</title>
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
        @page { margin: 56px 24px 36px 24px; }
        * { box-sizing: border-box; font-family: 'sarabun', DejaVu Sans, sans-serif; }
        body { margin: 0; color: #0f172a; font-size: 10.5px; line-height: 1.4; }
        .page-header {
            position: fixed; top: -42px; left: 0; right: 0;
            border-bottom: 2px solid #4338ca; padding-bottom: 6px;
        }
        .hospital-name { font-size: 13px; font-weight: bold; color: #312e81; }
        .hospital-sub { font-size: 8.5px; color: #64748b; margin-top: 1px; }
        .page-footer {
            position: fixed; bottom: -24px; left: 0; right: 0;
            border-top: 1px solid #e2e8f0; padding-top: 5px;
            font-size: 8px; color: #64748b;
        }
        .page-footer .right { float: right; }
        .hero { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        .hero-left {
            width: 68%; padding: 10px 12px; color: #fff;
            background: #312e81; border-radius: 6px 0 0 6px;
        }
        .hero-right {
            width: 32%; padding: 10px 12px; color: #312e81;
            background: #e0e7ff; text-align: right;
            border-radius: 0 6px 6px 0; vertical-align: middle;
        }
        .eyebrow { font-size: 8px; letter-spacing: 0.05em; text-transform: uppercase; opacity: 0.9; margin-bottom: 2px; }
        h1 { margin: 0; font-size: 15px; font-weight: bold; line-height: 1.25; }
        .hero-sub { margin-top: 3px; font-size: 9.5px; opacity: 0.95; }
        .report-date { font-size: 12px; font-weight: bold; }
        .report-meta { font-size: 8.5px; margin-top: 2px; }
        .kpi { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        .kpi td { width: 25%; padding: 0 4px 0 0; vertical-align: top; }
        .kpi td:last-child { padding-right: 0; }
        .kpi-card {
            border: 1px solid #c7d2fe; background: #eef2ff;
            padding: 7px 8px; border-radius: 4px;
        }
        .kpi-card.emerald { background: #ecfdf5; border-color: #6ee7b7; }
        .kpi-card.rose { background: #fff1f2; border-color: #fda4af; }
        .kpi-card.amber { background: #fffbeb; border-color: #fcd34d; }
        .kpi-label { font-size: 8px; color: #64748b; }
        .kpi-value { font-size: 16px; font-weight: bold; color: #1e1b4b; line-height: 1.2; }
        .kpi-card.emerald .kpi-value { color: #047857; }
        .kpi-card.rose .kpi-value { color: #be123c; }
        .kpi-card.amber .kpi-value { color: #b45309; }
        .kpi-sub { font-size: 8px; color: #64748b; margin-top: 1px; }
        h2 {
            margin: 12px 0 6px; padding-left: 7px; border-left: 3px solid #6366f1;
            color: #312e81; font-size: 11.5px; font-weight: bold;
        }
        h3 {
            margin: 10px 0 4px; font-size: 10.5px; font-weight: bold; color: #1e1b4b;
        }
        .meta-grid { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .meta-grid th, .meta-grid td {
            border: 1px solid #e2e8f0; padding: 5px 7px; vertical-align: top; font-size: 9.5px;
        }
        .meta-grid th {
            width: 18%; background: #f8fafc; color: #475569; font-weight: bold; text-align: left;
        }
        table.data { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        table.data th {
            background: #312e81; color: #fff; font-size: 8.5px; font-weight: bold;
            text-align: left; padding: 5px 4px; border: 1px solid #1e1b4b;
        }
        table.data td {
            padding: 4px; border: 1px solid #e2e8f0; vertical-align: top;
            font-size: 9px; color: #0f172a;
        }
        table.data tr.fail-row td { background: #fff1f2; }
        .center { text-align: center; }
        .pass { color: #047857; font-weight: bold; }
        .fail { color: #be123c; font-weight: bold; }
        .na { color: #94a3b8; }
        .pending { color: #b45309; }
        .mono { font-family: 'sarabun', DejaVu Sans, sans-serif; }
        .muted { color: #94a3b8; }
        .comment-cell { color: #9f1239; font-size: 8.5px; }
        .fail-box {
            border: 1px solid #fecdd3; background: #fff1f2;
            border-radius: 4px; padding: 7px 9px; margin-bottom: 6px;
        }
        .fail-box .title { font-weight: bold; color: #9f1239; font-size: 10px; margin-bottom: 2px; }
        .fail-box .meta { font-size: 8.5px; color: #64748b; margin-bottom: 3px; }
        .fail-box .note {
            background: #fff; border-left: 3px solid #e11d48;
            padding: 4px 7px; font-size: 9.5px; color: #881337;
        }
        .fail-box .note.empty { color: #94a3b8; border-left-color: #cbd5e1; font-style: italic; }
        .notes-box {
            border: 1px solid #c7d2fe; background: #eef2ff;
            border-radius: 4px; padding: 8px 10px; white-space: pre-wrap;
            font-size: 10px; color: #1e1b4b;
        }
        .cat-summary { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        .cat-summary th, .cat-summary td {
            border: 1px solid #e2e8f0; padding: 4px 5px; font-size: 9px;
        }
        .cat-summary th { background: #f1f5f9; text-align: left; font-weight: bold; color: #475569; }
        .empty {
            text-align: center; padding: 10px; color: #94a3b8;
            border: 1px dashed #cbd5e1; margin-bottom: 8px;
        }
        .ok-banner {
            border: 1px solid #a7f3d0; background: #ecfdf5; color: #047857;
            padding: 7px 9px; border-radius: 4px; margin-bottom: 8px; font-size: 10px;
        }
        .legend { font-size: 8px; color: #64748b; margin: 0 0 6px; }
    </style>
</head>
<body>
    @php
        $resultLabel = function (string $result): string {
            return match ($result) {
                'pass' => 'ผ่าน',
                'fail' => 'ไม่ผ่าน',
                'na' => 'N/A',
                default => 'รอตรวจ',
            };
        };
        $resultClass = function (string $result): string {
            return match ($result) {
                'pass' => 'pass',
                'fail' => 'fail',
                'na' => 'na',
                default => 'pending',
            };
        };
        $accuracy = (float) ($audit->accuracy_percentage ?? 0);
    @endphp

    <div class="page-header">
        <div class="hospital-name">{{ $hospitalName }}</div>
        <div class="hospital-sub">ศูนย์พัฒนาคุณภาพ · Medical Record Accuracy (MRA) · ตามเกณฑ์ สรพ. 2563</div>
    </div>
    <div class="page-footer">
        <span>{{ $hospitalName }} · MRA #{{ $audit->id }} · HN {{ $audit->hn }}</span>
        <span class="right">พิมพ์เมื่อ {{ $generatedAt }}</span>
    </div>

    <table class="hero">
        <tr>
            <td class="hero-left">
                <div class="eyebrow">รายงานผลการตรวจสอบคุณภาพเวชระเบียน</div>
                <h1>{{ $patientNameMasked ?? \App\Support\PiiMask::patientName($audit->patient_name) }}</h1>
                <div class="hero-sub">
                    HN {{ $audit->hn }} · VN {{ $audit->vn }}
                    @if($audit->an) · AN {{ $audit->an }} @endif
                    · {{ $auditTypeLabel }} · {{ $statusLabel }}
                </div>
            </td>
            <td class="hero-right">
                <div class="report-date">{{ number_format($accuracy, 1) }}%</div>
                <div class="report-meta">ความถูกต้อง · {{ $generatedAtDate }}</div>
            </td>
        </tr>
    </table>

    <table class="kpi">
        <tr>
            <td>
                <div class="kpi-card {{ $accuracy >= 90 ? 'emerald' : ($accuracy >= 70 ? 'amber' : 'rose') }}">
                    <div class="kpi-label">ความถูกต้อง</div>
                    <div class="kpi-value">{{ number_format($accuracy, 1) }}%</div>
                    <div class="kpi-sub">คะแนนรวม</div>
                </div>
            </td>
            <td>
                <div class="kpi-card emerald">
                    <div class="kpi-label">ผ่าน</div>
                    <div class="kpi-value">{{ (int) ($audit->correct_items ?? 0) }}</div>
                    <div class="kpi-sub">รายการ</div>
                </div>
            </td>
            <td>
                <div class="kpi-card rose">
                    <div class="kpi-label">ไม่ผ่าน</div>
                    <div class="kpi-value">{{ (int) $failCount }}</div>
                    <div class="kpi-sub">รายการ</div>
                </div>
            </td>
            <td>
                <div class="kpi-card">
                    <div class="kpi-label">ตรวจทั้งหมด</div>
                    <div class="kpi-value">{{ (int) ($audit->total_items ?? 0) }}</div>
                    <div class="kpi-sub">ไม่นับ N/A</div>
                </div>
            </td>
        </tr>
    </table>

    <h2>ข้อมูลผู้ป่วย / การมาตรวจ</h2>
    <table class="meta-grid">
        <tr>
            <th>วันที่มาตรวจ</th>
            <td>{{ $visitDateLabel }}</td>
            <th>แผนก</th>
            <td>{{ $audit->department ?: '-' }}</td>
        </tr>
        <tr>
            <th>แพทย์</th>
            <td>{{ $audit->doctor_name ?: '-' }}</td>
            <th>ผู้ตรวจสอบ</th>
            <td>
                {{ $audit->auditor?->name ?: '-' }}
                @if($auditedAtLabel)
                    <span class="muted">({{ $auditedAtLabel }})</span>
                @endif
            </td>
        </tr>
        <tr>
            <th>Chief Complaint</th>
            <td colspan="3">{{ $audit->chief_complaint ?: '-' }}</td>
        </tr>
        <tr>
            <th>Principal Dx</th>
            <td colspan="3">
                {{ $audit->pdx ?: '-' }}
                @if($audit->pdx_icd10)
                    <span class="muted">({{ $audit->pdx_icd10 }})</span>
                @endif
            </td>
        </tr>
        @if($audit->bp_systolic)
            <tr>
                <th>Vital Signs</th>
                <td colspan="3">
                    BP {{ $audit->bp_systolic }}/{{ $audit->bp_diastolic }} mmHg,
                    P {{ $audit->pulse }}/min,
                    T {{ $audit->temperature }}°C,
                    RR {{ $audit->respiratory_rate }}/min
                </td>
            </tr>
        @endif
    </table>

    <h2>สรุปคะแนนรายหมวด</h2>
    <table class="cat-summary">
        <thead>
            <tr>
                <th style="width:12%">รหัส</th>
                <th>หมวด</th>
                <th class="center" style="width:10%">ผ่าน</th>
                <th class="center" style="width:10%">ไม่ผ่าน</th>
                <th class="center" style="width:10%">N/A</th>
                <th class="center" style="width:16%">คะแนน</th>
                <th class="center" style="width:12%">%</th>
            </tr>
        </thead>
        <tbody>
            @foreach($categoryBlocks as $block)
                <tr>
                    <td class="mono">{{ $block['code'] }}</td>
                    <td>{{ $block['name'] }}</td>
                    <td class="center pass">{{ $block['pass'] }}</td>
                    <td class="center {{ $block['fail'] > 0 ? 'fail' : '' }}">{{ $block['fail'] }}</td>
                    <td class="center muted">{{ $block['na'] }}</td>
                    <td class="center">{{ rtrim(rtrim(number_format($block['obtained_score'], 1), '0'), '.') }}/{{ rtrim(rtrim(number_format($block['max_score'], 1), '0'), '.') }}</td>
                    <td class="center {{ $block['percent'] >= 90 ? 'pass' : ($block['percent'] >= 70 ? 'pending' : ($block['max_score'] > 0 ? 'fail' : 'muted')) }}">
                        {{ $block['max_score'] > 0 ? number_format($block['percent'], 0).'%' : '-' }}
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <h2>ข้อที่ไม่ผ่านและหมายเหตุชี้แจง</h2>
    @if($failedItems->isEmpty())
        <div class="ok-banner">ไม่พบรายการที่ไม่ผ่าน — ไม่มีหมายเหตุชี้แจงในส่วนนี้</div>
    @else
        <p class="legend">แสดงเฉพาะข้อที่ผลเป็น “ไม่ผ่าน” พร้อมหมายเหตุที่ผู้ตรวจบันทึกไว้</p>
        @foreach($failedItems as $item)
            <div class="fail-box">
                <div class="title">{{ $item['code'] }} — {{ $item['name'] }}</div>
                <div class="meta">
                    หมวด {{ $item['category_code'] }} {{ $item['category_name'] }}
                    @if(!empty($item['hosxp_value']))
                        · ค่าจาก HOSxP: {{ $item['hosxp_value'] }}
                    @endif
                </div>
                @if($item['comment'] !== '')
                    <div class="note">ชี้แจง / หมายเหตุ: {{ $item['comment'] }}</div>
                @else
                    <div class="note empty">ยังไม่มีหมายเหตุชี้แจงสำหรับข้อนี้</div>
                @endif
            </div>
        @endforeach
    @endif

    <h2>หมายเหตุเพิ่มเติม</h2>
    @if(filled($audit->summary_notes))
        <div class="notes-box">{{ $audit->summary_notes }}</div>
    @else
        <div class="empty">ไม่มีหมายเหตุเพิ่มเติม</div>
    @endif

    <h2>รายละเอียดการตรวจสอบทุกหมวด</h2>
    <p class="legend">แถวสีชมพู = ไม่ผ่าน · คอลัมน์หมายเหตุแสดงเฉพาะข้อความที่บันทึกไว้</p>

    @foreach($categoryBlocks as $block)
        <h3>{{ $block['code'] }} · {{ $block['name'] }}
            <span class="muted">
                (ผ่าน {{ $block['pass'] }} · ไม่ผ่าน {{ $block['fail'] }} · {{ number_format($block['percent'], 0) }}%)
            </span>
        </h3>
        @if(count($block['rows']) === 0)
            <div class="empty">ไม่มีเกณฑ์ในหมวดนี้</div>
        @else
            <table class="data">
                <thead>
                    <tr>
                        <th style="width:11%">รหัส</th>
                        <th>รายการ</th>
                        <th style="width:16%">ค่าจาก HOSxP</th>
                        <th class="center" style="width:10%">ผล</th>
                        <th class="center" style="width:10%">คะแนน</th>
                        <th style="width:28%">หมายเหตุ / ชี้แจง</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($block['rows'] as $row)
                        <tr class="{{ $row['result'] === 'fail' ? 'fail-row' : '' }}">
                            <td class="mono">{{ $row['code'] }}</td>
                            <td>{{ $row['name'] }}</td>
                            <td>{{ $row['hosxp_value'] ?: '-' }}</td>
                            <td class="center {{ $resultClass($row['result']) }}">{{ $resultLabel($row['result']) }}</td>
                            <td class="center">
                                @if($row['result'] === 'na' || $row['result'] === 'pending')
                                    -
                                @else
                                    {{ rtrim(rtrim(number_format($row['obtained_score'], 1), '0'), '.') }}/{{ rtrim(rtrim(number_format($row['max_score'], 1), '0'), '.') }}
                                @endif
                            </td>
                            <td class="{{ $row['result'] === 'fail' && $row['comment'] !== '' ? 'comment-cell' : 'muted' }}">
                                {{ $row['comment'] !== '' ? $row['comment'] : '-' }}
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endforeach
</body>
</html>
