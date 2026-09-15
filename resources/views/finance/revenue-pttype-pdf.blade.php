<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>รายงานรายละเอียดตามสิทธิ์การรักษา</title>
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
        @page { margin: 22px 26px 28px 26px; }
        * { box-sizing: border-box; font-family: 'sarabun', sans-serif; }
        body { font-size: 11px; color: #111827; line-height: 1.4; }

        .header-band {
            background: #0f766e;
            color: #fff;
            padding: 14px 16px 12px;
            border-radius: 8px;
            margin-bottom: 12px;
        }
        .header-band h1 {
            margin: 0 0 4px;
            font-size: 18px;
            font-weight: bold;
        }
        .header-band .sub {
            font-size: 10px;
            opacity: 0.92;
        }
        .meta-row {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }
        .meta-row td {
            font-size: 10px;
            color: #4b5563;
            padding: 2px 0;
            vertical-align: top;
        }
        .meta-row td:last-child { text-align: right; }

        .kpi-row {
            width: 100%;
            border-collapse: separate;
            border-spacing: 6px 0;
            margin: 0 -6px 14px -6px;
        }
        .kpi-row td { width: 25%; vertical-align: top; padding: 0; }
        .kpi {
            border: 1px solid #99f6e4;
            border-radius: 6px;
            padding: 8px 10px;
            background: #f0fdfa;
        }
        .kpi-label {
            font-size: 9px;
            color: #6b7280;
            margin-bottom: 3px;
        }
        .kpi-value {
            font-size: 13px;
            font-weight: bold;
            color: #0f766e;
        }
        .kpi-sub { font-size: 9px; color: #6b7280; margin-top: 2px; }

        h2 {
            font-size: 12px;
            margin: 0 0 8px;
            color: #0f766e;
            font-weight: bold;
            border-left: 4px solid #14b8a6;
            padding-left: 8px;
        }

        table.data {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
        }
        table.data th,
        table.data td {
            border: 1px solid #d1d5db;
            padding: 5px 6px;
            vertical-align: middle;
        }
        table.data th {
            background: #0f766e;
            color: #fff;
            font-weight: bold;
            font-size: 10px;
        }
        table.data tbody tr { page-break-inside: avoid; }
        table.data tbody tr:nth-child(even) td { background: #f9fafb; }
        table.data tbody tr:hover td { background: #ecfdf5; }
        table.data tfoot td {
            background: #ecfdf5;
            font-weight: bold;
            border-top: 2px solid #0f766e;
        }

        .num { text-align: right; white-space: nowrap; }
        .center { text-align: center; }
        .muted { color: #6b7280; font-size: 9px; }
        .code { font-family: 'sarabun', monospace; font-size: 10px; color: #374151; }
        .name { font-weight: bold; color: #111827; }
        .opd { color: #1d4ed8; }
        .ipd { color: #6d28d9; }
        .total { color: #047857; font-weight: bold; }

        .share-wrap { min-width: 72px; }
        .share-bar-bg {
            background: #e5e7eb;
            border-radius: 4px;
            height: 6px;
            margin-bottom: 2px;
            overflow: hidden;
        }
        .share-bar-fill {
            background: #10b981;
            height: 6px;
            border-radius: 4px;
        }
        .share-text { font-size: 9px; color: #047857; text-align: right; }

        .rank {
            display: inline-block;
            min-width: 18px;
            text-align: center;
            background: #ccfbf1;
            color: #0f766e;
            border-radius: 10px;
            font-size: 9px;
            font-weight: bold;
            padding: 1px 4px;
        }
        .rank-top { background: #fef3c7; color: #b45309; }

        .note {
            margin-top: 10px;
            padding: 8px 10px;
            border: 1px dashed #d1d5db;
            border-radius: 6px;
            font-size: 9px;
            color: #6b7280;
            background: #fafafa;
        }
        .footer {
            margin-top: 14px;
            padding-top: 6px;
            border-top: 1px solid #e5e7eb;
            font-size: 9px;
            color: #9ca3af;
            text-align: center;
        }
    </style>
</head>
<body>
    @php
        $summary = $data['summary'] ?? [];
        $rows = $data['by_pttype'] ?? [];
        $rowCount = count($rows);
    @endphp

    <div class="header-band">
        <h1>รายงานรายละเอียดตามสิทธิ์การรักษา</h1>
        <div class="sub">รายได้ตามสิทธิ์การรักษา · เรียงตามรายได้รวมมาก → น้อย · OPD: opitemrece · IPD: an_stat</div>
    </div>

    <table class="meta-row">
        <tr>
            <td>
                <strong>ช่วงวันที่:</strong> {{ $startDateLabel }} — {{ $endDateLabel }}
                ({{ $startDate }} ถึง {{ $endDate }})
            </td>
            <td>
                ออกรายงาน: {{ $generatedAt }}<br>
                @if (!empty($appName)){{ $appName }}@endif
            </td>
        </tr>
    </table>

    <table class="kpi-row">
        <tr>
            <td>
                <div class="kpi">
                    <div class="kpi-label">รายได้รวมทั้งหมด</div>
                    <div class="kpi-value">{{ $formatBaht($summary['total_amount'] ?? 0) }}</div>
                    <div class="kpi-sub">{{ number_format((float) ($summary['total_items'] ?? 0)) }} รายการ</div>
                </div>
            </td>
            <td>
                <div class="kpi">
                    <div class="kpi-label">ผู้ป่วยนอก (OPD)</div>
                    <div class="kpi-value">{{ $formatBaht($summary['opd_amount'] ?? 0) }}</div>
                    <div class="kpi-sub">{{ $formatPercent($summary['opd_share'] ?? 0) }} · {{ number_format((int) ($summary['opd_visits'] ?? 0)) }} ครั้ง</div>
                </div>
            </td>
            <td>
                <div class="kpi">
                    <div class="kpi-label">ผู้ป่วยใน (IPD)</div>
                    <div class="kpi-value">{{ $formatBaht($summary['ipd_amount'] ?? 0) }}</div>
                    <div class="kpi-sub">{{ $formatPercent($summary['ipd_share'] ?? 0) }} · {{ number_format((int) ($summary['ipd_visits'] ?? 0)) }} ครั้ง</div>
                </div>
            </td>
            <td>
                <div class="kpi">
                    <div class="kpi-label">จำนวนสิทธิ์ที่พบ</div>
                    <div class="kpi-value">{{ number_format($rowCount) }} สิทธิ</div>
                    <div class="kpi-sub">เรียงตามรายได้รวมมาก → น้อย</div>
                </div>
            </td>
        </tr>
    </table>

    <h2>ตารางรายละเอียดตามสิทธิ์การรักษา</h2>
    <table class="data">
        <thead>
            <tr>
                <th class="center" style="width:28px">#</th>
                <th style="width:52px">รหัสสิทธิ</th>
                <th>ชื่อสิทธิการรักษา</th>
                <th class="num">OPD (บาท)</th>
                <th class="num">IPD (บาท)</th>
                <th class="num">รวม (บาท)</th>
                <th class="num" style="width:88px">สัดส่วน</th>
                <th class="num">รายการ</th>
                <th class="num">OPD (ครั้ง)</th>
                <th class="num">IPD (ครั้ง)</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($rows as $i => $row)
                @php $share = (float) ($row['share_percent'] ?? 0); @endphp
                <tr>
                    <td class="center">
                        <span class="rank {{ $i < 3 ? 'rank-top' : '' }}">{{ $i + 1 }}</span>
                    </td>
                    <td class="code">{{ $row['pttype_code'] ?? '-' }}</td>
                    <td class="name">{{ $row['pttype_name'] ?? '' }}</td>
                    <td class="num opd">{{ $formatBaht($row['opd_amount'] ?? 0) }}</td>
                    <td class="num ipd">{{ $formatBaht($row['ipd_amount'] ?? 0) }}</td>
                    <td class="num total">{{ $formatBaht($row['total_amount'] ?? 0) }}</td>
                    <td class="num">
                        <div class="share-wrap">
                            <div class="share-bar-bg">
                                <div class="share-bar-fill" style="width: {{ min($share, 100) }}%;"></div>
                            </div>
                            <div class="share-text">{{ $formatPercent($share) }}</div>
                        </div>
                    </td>
                    <td class="num muted">{{ number_format((int) ($row['items'] ?? 0)) }}</td>
                    <td class="num muted">{{ number_format((int) ($row['opd_visits'] ?? 0)) }}</td>
                    <td class="num muted">{{ number_format((int) ($row['ipd_visits'] ?? 0)) }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="10" class="center muted">ไม่มีข้อมูลในช่วงวันที่ที่เลือก</td>
                </tr>
            @endforelse
        </tbody>
        @if ($rowCount > 0)
            <tfoot>
                <tr>
                    <td colspan="3" class="num">รวมทั้งหมด</td>
                    <td class="num opd">{{ $formatBaht($summary['opd_amount'] ?? 0) }}</td>
                    <td class="num ipd">{{ $formatBaht($summary['ipd_amount'] ?? 0) }}</td>
                    <td class="num total">{{ $formatBaht($summary['total_amount'] ?? 0) }}</td>
                    <td class="num">100.00%</td>
                    <td class="num">{{ number_format((float) ($summary['total_items'] ?? 0)) }}</td>
                    <td class="num">{{ number_format((int) ($summary['opd_visits'] ?? 0)) }}</td>
                    <td class="num">{{ number_format((int) ($summary['ipd_visits'] ?? 0)) }}</td>
                </tr>
            </tfoot>
        @endif
    </table>

    <div class="note">
        หมายเหตุ: OPD จาก opitemrece (vstdate) · IPD จาก an_stat.income (วันจำหน่าย dchdate) join ipt
        · สัดส่วนคิดจากรายได้รวมของแต่ละสิทธิเทียบกับรายได้รวมทั้งหมด
    </div>

    <div class="footer">
        {{ $appName ?? 'SMH Hospital Dashboard' }} · รายงานรายละเอียดตามสิทธิ์การรักษา
    </div>
</body>
</html>
