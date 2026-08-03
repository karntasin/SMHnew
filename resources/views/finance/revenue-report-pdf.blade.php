<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>รายงานรายได้ HOSxP</title>
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
        @page { margin: 28px 32px 36px 32px; }
        * {
            box-sizing: border-box;
            font-family: 'sarabun', sans-serif;
        }
        body {
            font-size: 11px;
            color: #111827;
            line-height: 1.45;
        }
        h1 {
            font-size: 20px;
            margin: 0 0 4px 0;
            color: #0f766e;
            font-weight: bold;
        }
        h2 {
            font-size: 13px;
            margin: 0 0 8px 0;
            color: #0f766e;
            font-weight: bold;
            border-bottom: 2px solid #99f6e4;
            padding-bottom: 4px;
        }
        .meta {
            font-size: 10px;
            color: #4b5563;
            margin-bottom: 14px;
        }
        .kpi-row {
            width: 100%;
            border-collapse: separate;
            border-spacing: 8px 0;
            margin: 0 -8px 14px -8px;
        }
        .kpi-row td {
            width: 25%;
            vertical-align: top;
            padding: 0;
        }
        .kpi {
            border: 1px solid #d1d5db;
            border-radius: 6px;
            padding: 10px 12px;
            background: #f0fdfa;
        }
        .kpi-label {
            font-size: 9px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            margin-bottom: 4px;
        }
        .kpi-value {
            font-size: 14px;
            font-weight: bold;
            color: #0f766e;
        }
        .kpi-sub {
            font-size: 9px;
            color: #6b7280;
            margin-top: 2px;
        }
        .highlights {
            border: 1px solid #d1d5db;
            border-radius: 6px;
            padding: 10px 12px;
            margin-bottom: 16px;
            background: #f9fafb;
        }
        .highlights-title {
            font-size: 11px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 8px;
        }
        .highlights table {
            width: 100%;
            border-collapse: collapse;
        }
        .highlights td {
            padding: 4px 0;
            border: none;
            vertical-align: top;
        }
        .highlights td:first-child {
            width: 28%;
            color: #6b7280;
            font-size: 10px;
        }
        .section {
            margin-bottom: 18px;
            page-break-inside: avoid;
        }
        .section-break {
            page-break-before: always;
        }
        table.data {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6px;
        }
        table.data th,
        table.data td {
            border: 1px solid #d1d5db;
            padding: 5px 6px;
        }
        table.data th {
            background: #0f766e;
            color: #fff;
            font-weight: bold;
            font-size: 10px;
        }
        table.data tr:nth-child(even) td {
            background: #f9fafb;
        }
        .num { text-align: right; white-space: nowrap; }
        .center { text-align: center; }
        .muted { color: #6b7280; font-size: 9px; }
        .footer {
            margin-top: 20px;
            padding-top: 8px;
            border-top: 1px solid #e5e7eb;
            font-size: 9px;
            color: #9ca3af;
            text-align: center;
        }
        .badge-opd {
            display: inline-block;
            background: #dbeafe;
            color: #1d4ed8;
            padding: 1px 6px;
            border-radius: 4px;
            font-size: 9px;
        }
        .badge-ipd {
            display: inline-block;
            background: #ede9fe;
            color: #6d28d9;
            padding: 1px 6px;
            border-radius: 4px;
            font-size: 9px;
        }
    </style>
</head>
<body>
    <h1>รายงานรายได้ HOSxP</h1>
    <div class="meta">
        ช่วงวันที่: {{ $startDate }} ถึง {{ $endDate }}
        &nbsp;|&nbsp; ออกรายงาน: {{ $generatedAt }}
        @if (!empty($appName))
            &nbsp;|&nbsp; {{ $appName }}
        @endif
    </div>

    @php
        $summary = $data['summary'] ?? [];
        $topPttype = $data['by_pttype'][0] ?? null;
        $topDepartment = $data['by_department'][0] ?? null;
        $topDisease = $data['top_diseases'][0] ?? null;
        $topDrug = $data['top_drugs'][0] ?? null;
    @endphp

    <table class="kpi-row">
        <tr>
            <td>
                <div class="kpi">
                    <div class="kpi-label">รายได้รวม</div>
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
                    <div class="kpi-label">สัดส่วน OPD / IPD</div>
                    <div class="kpi-value">{{ $formatPercent($summary['opd_share'] ?? 0) }} / {{ $formatPercent($summary['ipd_share'] ?? 0) }}</div>
                    <div class="kpi-sub">จากรายได้รวมทั้งหมด</div>
                </div>
            </td>
        </tr>
    </table>

    <div class="highlights">
        <div class="highlights-title">Executive Highlights</div>
        <table>
            <tr>
                <td>สิทธิ์รายได้สูงสุด</td>
                <td>
                    @if ($topPttype)
                        {{ $topPttype['pttype_name'] ?? '-' }}
                        ({{ $formatBaht($topPttype['total_amount'] ?? 0) }})
                    @else
                        -
                    @endif
                </td>
            </tr>
            <tr>
                <td>แผนก/หอรายได้สูงสุด</td>
                <td>
                    @if ($topDepartment)
                        {{ $topDepartment['department_name'] ?? '-' }}
                        ({{ $formatBaht($topDepartment['total_amount'] ?? 0) }})
                    @else
                        -
                    @endif
                </td>
            </tr>
            <tr>
                <td>โรครายได้สูงสุด</td>
                <td>
                    @if ($topDisease)
                        {{ $topDisease['icd10_code'] ?? '-' }}
                        {{ $topDisease['disease_name'] ?? '' }}
                        ({{ $formatBaht($topDisease['total_amount'] ?? 0) }})
                    @else
                        -
                    @endif
                </td>
            </tr>
            <tr>
                <td>ยารายได้สูงสุด</td>
                <td>
                    @if ($topDrug)
                        {{ $topDrug['drug_code'] ?? '-' }}
                        {{ $topDrug['drug_name'] ?? '' }}
                        ({{ $formatBaht($topDrug['total_amount'] ?? 0) }})
                    @else
                        -
                    @endif
                </td>
            </tr>
        </table>
    </div>

    <div class="section">
        <h2>รายได้ตามสิทธิ์</h2>
        <table class="data">
            <thead>
                <tr>
                    <th>รหัสสิทธิ</th>
                    <th>ชื่อสิทธิ</th>
                    <th>OPD</th>
                    <th>IPD</th>
                    <th>รวม</th>
                    <th>สัดส่วน</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($data['by_pttype'] ?? [] as $row)
                    <tr>
                        <td>{{ $row['pttype_code'] ?? '-' }}</td>
                        <td>{{ $row['pttype_name'] ?? '' }}</td>
                        <td class="num">{{ $formatBaht($row['opd_amount'] ?? 0) }}</td>
                        <td class="num">{{ $formatBaht($row['ipd_amount'] ?? 0) }}</td>
                        <td class="num">{{ $formatBaht($row['total_amount'] ?? 0) }}</td>
                        <td class="num">{{ $formatPercent($row['share_percent'] ?? 0) }}</td>
                    </tr>
                @empty
                    <tr><td colspan="6" class="center muted">ไม่มีข้อมูล</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <div class="section section-break">
        <h2>รายได้ตามแผนก / หอผู้ป่วย</h2>
        <table class="data">
            <thead>
                <tr>
                    <th>ประเภท</th>
                    <th>แผนก/หอผู้ป่วย</th>
                    <th>OPD</th>
                    <th>IPD</th>
                    <th>รวม</th>
                    <th>สัดส่วน</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($data['by_department'] ?? [] as $row)
                    <tr>
                        <td>
                            @if (($row['department_type'] ?? '') === 'ipd')
                                <span class="badge-ipd">IPD</span>
                            @else
                                <span class="badge-opd">OPD</span>
                            @endif
                        </td>
                        <td>{{ $row['department_name'] ?? '' }}</td>
                        <td class="num">{{ $formatBaht($row['opd_amount'] ?? 0) }}</td>
                        <td class="num">{{ $formatBaht($row['ipd_amount'] ?? 0) }}</td>
                        <td class="num">{{ $formatBaht($row['total_amount'] ?? 0) }}</td>
                        <td class="num">{{ $formatPercent($row['share_percent'] ?? 0) }}</td>
                    </tr>
                @empty
                    <tr><td colspan="6" class="center muted">ไม่มีข้อมูล</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <div class="section section-break">
        <h2>Top 10 โรครายได้สูง (Principal ICD-10)</h2>
        <table class="data">
            <thead>
                <tr>
                    <th class="center">อันดับ</th>
                    <th>ICD-10</th>
                    <th>ชื่อโรค</th>
                    <th>OPD</th>
                    <th>IPD</th>
                    <th>รวม</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($data['top_diseases'] ?? [] as $row)
                    <tr>
                        <td class="center">{{ $row['rank'] ?? '' }}</td>
                        <td>{{ $row['icd10_code'] ?? '-' }}</td>
                        <td>{{ $row['disease_name'] ?? '' }}</td>
                        <td class="num">{{ $formatBaht($row['opd_amount'] ?? 0) }}</td>
                        <td class="num">{{ $formatBaht($row['ipd_amount'] ?? 0) }}</td>
                        <td class="num">{{ $formatBaht($row['total_amount'] ?? 0) }}</td>
                    </tr>
                @empty
                    <tr><td colspan="6" class="center muted">ไม่มีข้อมูล</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>Top 10 ยารายได้สูง</h2>
        <table class="data">
            <thead>
                <tr>
                    <th class="center">อันดับ</th>
                    <th>รหัสยา</th>
                    <th>ชื่อยา</th>
                    <th>จำนวน</th>
                    <th>รวม</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($data['top_drugs'] ?? [] as $row)
                    <tr>
                        <td class="center">{{ $row['rank'] ?? '' }}</td>
                        <td>{{ $row['drug_code'] ?? '-' }}</td>
                        <td>{{ $row['drug_name'] ?? '' }}</td>
                        <td class="num">{{ number_format((float) ($row['total_qty'] ?? 0), 2) }}</td>
                        <td class="num">{{ $formatBaht($row['total_amount'] ?? 0) }}</td>
                    </tr>
                @empty
                    <tr><td colspan="5" class="center muted">ไม่มีข้อมูล</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>

    @if (!empty($data['monthly']))
        <div class="section section-break">
            <h2>แนวโน้มรายได้รายเดือน</h2>
            <table class="data">
                <thead>
                    <tr>
                        <th>เดือน</th>
                        <th>OPD</th>
                        <th>IPD</th>
                        <th>รวม</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($data['monthly'] as $row)
                        <tr>
                            <td>{{ $row['label'] ?? '' }}</td>
                            <td class="num">{{ $formatBaht($row['opd'] ?? 0) }}</td>
                            <td class="num">{{ $formatBaht($row['ipd'] ?? 0) }}</td>
                            <td class="num">{{ $formatBaht($row['total'] ?? 0) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    @endif

    <div class="footer">
        รายงานนี้สร้างจากข้อมูล HOSxP (opitemrece) · {{ $appName ?? 'SMH Hospital Dashboard' }}
    </div>
</body>
</html>
