<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>รายงานทะเบียนทรัพยากรคอมพิวเตอร์แยกตาม CPU และ OS - {{ $hospitalName }}</title>
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
        @page {
            margin: 48px 18px 36px 18px;
            size: A4 landscape;
        }
        * {
            box-sizing: border-box;
            font-family: 'sarabun', DejaVu Sans, sans-serif;
        }
        body {
            margin: 0;
            color: #0f172a;
            font-size: 9px;
            line-height: 1.35;
        }
        .page-header {
            position: fixed;
            top: -38px;
            left: 0;
            right: 0;
            border-bottom: 1.5px solid #0284c7;
            padding-bottom: 4px;
        }
        .hospital-name {
            font-size: 12px;
            font-weight: bold;
            color: #0369a1;
        }
        .hospital-sub {
            font-size: 8px;
            color: #64748b;
            margin-top: 1px;
        }
        .page-footer {
            position: fixed;
            bottom: -24px;
            left: 0;
            right: 120px;
            border-top: 1px solid #cbd5e1;
            padding-top: 3px;
            font-size: 7.5px;
            color: #64748b;
        }
        .hero {
            width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        .hero-left {
            width: 72%;
            padding: 8px 12px;
            color: #fff;
            background: #0369a1;
            border-radius: 4px 0 0 4px;
        }
        .hero-right {
            width: 28%;
            padding: 8px 12px;
            color: #0369a1;
            background: #e0f2fe;
            text-align: right;
            vertical-align: middle;
            border-radius: 0 4px 4px 0;
        }
        .eyebrow {
            font-size: 8px;
            letter-spacing: 0.04em;
            opacity: 0.9;
            margin-bottom: 2px;
        }
        h1 {
            margin: 0;
            font-size: 13px;
            font-weight: bold;
            line-height: 1.25;
        }
        .hero-sub {
            margin-top: 2px;
            font-size: 8.5px;
            opacity: 0.95;
        }
        .report-date {
            font-size: 10.5px;
            font-weight: bold;
        }
        .report-meta {
            margin-top: 2px;
            font-size: 7.5px;
            color: #0284c7;
        }
        .filter-tag {
            display: inline-block;
            background: #bae6fd;
            color: #0369a1;
            padding: 1px 5px;
            border-radius: 3px;
            font-size: 7.5px;
            font-weight: bold;
            margin-right: 4px;
        }

        /* KPI Cards */
        .kpi-table {
            width: 100%;
            table-layout: fixed;
            border-collapse: separate;
            border-spacing: 5px 0;
            margin-bottom: 8px;
        }
        .kpi-table td {
            vertical-align: top;
            padding: 0;
        }
        .kpi-card {
            border: 1px solid #7dd3fc;
            background: #f0f9ff;
            padding: 5px 8px;
            border-radius: 5px;
            text-align: center;
        }
        .kpi-label {
            font-size: 7.5px;
            color: #64748b;
        }
        .kpi-value {
            font-size: 12px;
            font-weight: bold;
            color: #0369a1;
            margin: 1px 0;
        }
        .kpi-sub {
            font-size: 7px;
            color: #64748b;
        }

        /* 2-Column Breakdown */
        .summary-cols {
            width: 100%;
            table-layout: fixed;
            border-collapse: separate;
            border-spacing: 6px 0;
            margin-bottom: 12px;
        }
        .summary-cols td {
            vertical-align: top;
            padding: 0;
            width: 50%;
        }

        .section-title {
            margin: 6px 0 4px;
            padding-left: 6px;
            border-left: 3px solid #0284c7;
            color: #0369a1;
            font-size: 10px;
            font-weight: bold;
        }

        /* Tables */
        table.summary-tbl {
            width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
            font-size: 8px;
        }
        table.summary-tbl th, table.summary-tbl td {
            border: 1px solid #cbd5e1;
            padding: 2.5px 5px;
            vertical-align: middle;
        }
        table.summary-tbl th {
            background: #e0f2fe;
            color: #0369a1;
            font-weight: bold;
            text-align: left;
        }
        table.summary-tbl td.num {
            text-align: right;
            font-weight: bold;
        }
        table.summary-tbl td.pct {
            text-align: right;
            color: #64748b;
        }

        .group-banner {
            background: #e0f2fe;
            border: 1px solid #7dd3fc;
            border-left: 4px solid #0284c7;
            padding: 4px 8px;
            margin: 8px 0 4px;
            border-radius: 3px;
            page-break-after: avoid;
        }
        .group-banner-title {
            font-size: 10px;
            font-weight: bold;
            color: #0369a1;
        }
        .group-banner-count {
            float: right;
            font-size: 8.5px;
            color: #0284c7;
            font-weight: bold;
        }

        table.data-tbl {
            width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
            word-wrap: break-word;
            margin-bottom: 6px;
        }
        table.data-tbl thead {
            display: table-header-group;
        }
        table.data-tbl tr {
            page-break-inside: avoid;
        }
        table.data-tbl th, table.data-tbl td {
            border: 1px solid #cbd5e1;
            padding: 2.5px 4px;
            vertical-align: top;
            word-wrap: break-word;
            overflow: hidden;
            font-size: 7.8px;
            line-height: 1.3;
        }
        table.data-tbl th {
            background: #f1f5f9;
            color: #1e293b;
            font-weight: bold;
            text-align: left;
        }
        table.data-tbl td.center, table.data-tbl th.center {
            text-align: center;
        }
        table.data-tbl td.num, table.data-tbl th.num {
            text-align: right;
        }

        .badge-active {
            color: #15803d;
            font-weight: bold;
        }
        .badge-repair {
            color: #b45309;
            font-weight: bold;
        }
        .badge-disposed {
            color: #64748b;
            text-decoration: line-through;
        }

        /* Signatures */
        .sign-table {
            width: 100%;
            table-layout: fixed;
            margin-top: 14px;
            border-collapse: collapse;
            page-break-inside: avoid;
        }
        .sign-table td {
            width: 50%;
            text-align: center;
            vertical-align: top;
            padding: 4px 20px;
            font-size: 8.5px;
            color: #334155;
        }
        .sign-line {
            margin-top: 24px;
            border-top: 1px dotted #94a3b8;
            padding-top: 3px;
        }
    </style>
</head>
<body>
    <div class="page-header">
        <div class="hospital-name">{{ $hospitalName }}</div>
        <div class="hospital-sub">กลุ่มงานสารสนเทศทางการแพทย์ (IM) · แผนกเทคโนโลยีสารสนเทศและการสื่อสาร (ICT) · ทะเบียนทรัพยากร IT</div>
    </div>

    <div class="page-footer">
        {{ $hospitalName }} · รายงานทะเบียนคอมพิวเตอร์และระบบประมวลผลแยกตาม CPU/OS · พิมพ์เมื่อ {{ $generatedAt }}
    </div>

    <table class="hero">
        <tr>
            <td class="hero-left">
                <div class="eyebrow">ระบบทะเบียนทรัพย์สินและทรัพยากร IT (ICT ASSET INVENTORY)</div>
                <h1>รายงานทะเบียนคอมพิวเตอร์ แยกประเภทอุปกรณ์ หน่วยประมวลผล (CPU) และระบบปฏิบัติการ (OS)</h1>
                <div class="hero-sub">
                    จำนวนคอมพิวเตอร์ทั้งสิ้น {{ number_format($totalCount) }} เครื่อง · ปกติ {{ number_format($statusCounts['active']) }} เครื่อง · ส่งซ่อม {{ number_format($statusCounts['repair']) }} เครื่อง · จำหน่าย {{ number_format($statusCounts['disposed']) }} เครื่อง
                    @if(!empty($filtersApplied))
                        <div style="margin-top: 3px;">
                            <span style="font-size: 7.5px; opacity: 0.85;">ตัวกรอง: </span>
                            @foreach($filtersApplied as $flt)
                                <span class="filter-tag">{{ $flt }}</span>
                            @endforeach
                        </div>
                    @endif
                </div>
            </td>
            <td class="hero-right">
                <div class="report-date">{{ $generatedAt }}</div>
                <div class="report-meta">งานสารสนเทศ รพ.ค่ายสุรสิงหนาท</div>
            </td>
        </tr>
    </table>

    <!-- KPI Summary Row -->
    <table class="kpi-table">
        <tr>
            <td>
                <div class="kpi-card">
                    <div class="kpi-label">จำนวนคอมพิวเตอร์ทั้งหมด</div>
                    <div class="kpi-value">{{ number_format($totalCount) }}</div>
                    <div class="kpi-sub">เครื่องในรายงาน</div>
                </div>
            </td>
            <td>
                <div class="kpi-card" style="border-color: #86efac; background: #f0fdf4;">
                    <div class="kpi-label" style="color: #166534;">สถานะปกติ (Active)</div>
                    <div class="kpi-value" style="color: #15803d;">{{ number_format($statusCounts['active']) }}</div>
                    <div class="kpi-sub">พร้อมใช้งาน</div>
                </div>
            </td>
            <td>
                <div class="kpi-card" style="border-color: #fde047; background: #fefce8;">
                    <div class="kpi-label" style="color: #854d0e;">ส่งซ่อม (Repair)</div>
                    <div class="kpi-value" style="color: #a16207;">{{ number_format($statusCounts['repair']) }}</div>
                    <div class="kpi-sub">อยู่ระหว่างดำเนินการ</div>
                </div>
            </td>
            <td>
                <div class="kpi-card" style="border-color: #cbd5e1; background: #f8fafc;">
                    <div class="kpi-label">จำหน่าย (Disposed)</div>
                    <div class="kpi-value" style="color: #475569;">{{ number_format($statusCounts['disposed']) }}</div>
                    <div class="kpi-sub">ตัดจำหน่าย/เลิกใช้</div>
                </div>
            </td>
            <td>
                <div class="kpi-card">
                    <div class="kpi-label">ความหลากหลาย CPU</div>
                    <div class="kpi-value">{{ $cpuCounts->count() }}</div>
                    <div class="kpi-sub">รุ่น/ตระกูลโปรเซสเซอร์</div>
                </div>
            </td>
            <td>
                <div class="kpi-card">
                    <div class="kpi-label">ระบบปฏิบัติการ OS</div>
                    <div class="kpi-value">{{ $osCounts->count() }}</div>
                    <div class="kpi-sub">เวอร์ชัน OS ที่ติดตั้ง</div>
                </div>
            </td>
        </tr>
    </table>

    <!-- 2-Column Summary: CPU Breakdown & OS Breakdown -->
    <table class="summary-cols">
        <tr>
            <td>
                <div class="section-title">สรุปจำนวนเครื่องแยกตามหน่วยประมวลผล (CPU Breakdown)</div>
                <table class="summary-tbl">
                    <colgroup>
                        <col style="width: 8%">
                        <col style="width: 68%">
                        <col style="width: 12%">
                        <col style="width: 12%">
                    </colgroup>
                    <thead>
                        <tr>
                            <th class="num">ลำดับ</th>
                            <th>รุ่น / ตระกูล CPU</th>
                            <th class="num">จำนวน (เครื่อง)</th>
                            <th class="num">สัดส่วน</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse($cpuCounts->take(12) as $idx => $cpu)
                            <tr>
                                <td class="num">{{ $idx + 1 }}</td>
                                <td>{{ $cpu['name'] }}</td>
                                <td class="num">{{ $cpu['count'] }}</td>
                                <td class="pct">{{ number_format($cpu['percentage'], 1) }}%</td>
                            </tr>
                        @empty
                            <tr><td colspan="4" style="text-align: center; color: #94a3b8;">ไม่มีข้อมูล CPU</td></tr>
                        @endforelse
                        @if($cpuCounts->count() > 12)
                            <tr>
                                <td colspan="2" style="text-align: right; color: #64748b; font-style: italic;">รุ่นอื่นๆ อีก {{ $cpuCounts->count() - 12 }} รุ่น</td>
                                <td class="num">{{ $cpuCounts->slice(12)->sum('count') }}</td>
                                <td class="pct">{{ number_format($cpuCounts->slice(12)->sum('percentage'), 1) }}%</td>
                            </tr>
                        @endif
                    </tbody>
                </table>
            </td>
            <td>
                <div class="section-title">สรุปจำนวนเครื่องแยกตามระบบปฏิบัติการ (OS Breakdown)</div>
                <table class="summary-tbl">
                    <colgroup>
                        <col style="width: 8%">
                        <col style="width: 68%">
                        <col style="width: 12%">
                        <col style="width: 12%">
                    </colgroup>
                    <thead>
                        <tr>
                            <th class="num">ลำดับ</th>
                            <th>ระบบปฏิบัติการ (OS)</th>
                            <th class="num">จำนวน (เครื่อง)</th>
                            <th class="num">สัดส่วน</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse($osCounts->take(12) as $idx => $os)
                            <tr>
                                <td class="num">{{ $idx + 1 }}</td>
                                <td>{{ $os['name'] }}</td>
                                <td class="num">{{ $os['count'] }}</td>
                                <td class="pct">{{ number_format($os['percentage'], 1) }}%</td>
                            </tr>
                        @empty
                            <tr><td colspan="4" style="text-align: center; color: #94a3b8;">ไม่มีข้อมูล OS</td></tr>
                        @endforelse
                        @if($osCounts->count() > 12)
                            <tr>
                                <td colspan="2" style="text-align: right; color: #64748b; font-style: italic;">รุ่นอื่นๆ อีก {{ $osCounts->count() - 12 }} รุ่น</td>
                                <td class="num">{{ $osCounts->slice(12)->sum('count') }}</td>
                                <td class="pct">{{ number_format($osCounts->slice(12)->sum('percentage'), 1) }}%</td>
                            </tr>
                        @endif
                    </tbody>
                </table>
            </td>
        </tr>
    </table>

    <!-- Detailed Assets Grouped by Computer Type -->
    <div class="section-title" style="margin-top: 10px;">บัญชีรายละเอียดเครื่องคอมพิวเตอร์แยกตามประเภท (Device Type Classification)</div>

    @forelse($groupedAssets as $group)
        <div class="group-banner">
            <span class="group-banner-title">{{ $group['type_label'] }}</span>
            <span class="group-banner-count">จำนวนรวม {{ number_format($group['count']) }} เครื่อง</span>
        </div>

        <table class="data-tbl">
            <colgroup>
                <col style="width: 3.5%">   {{-- ลำดับ --}}
                <col style="width: 9%">     {{-- รหัสครุภัณฑ์ --}}
                <col style="width: 12%">    {{-- ชื่อเครื่อง --}}
                <col style="width: 8%">     {{-- ยี่ห้อ/รุ่น --}}
                <col style="width: 19%">    {{-- CPU --}}
                <col style="width: 17%">    {{-- OS --}}
                <col style="width: 9%">     {{-- RAM/Spec --}}
                <col style="width: 10%">    {{-- แผนก/ที่ตั้ง --}}
                <col style="width: 8%">     {{-- ผู้รับผิดชอบ --}}
                <col style="width: 4.5%">   {{-- สถานะ --}}
            </colgroup>
            <thead>
                <tr>
                    <th class="center">ลำดับ</th>
                    <th>รหัสครุภัณฑ์</th>
                    <th>ชื่อเครื่อง (Host)</th>
                    <th>ยี่ห้อ</th>
                    <th>หน่วยประมวลผล (CPU)</th>
                    <th>ระบบปฏิบัติการ (OS)</th>
                    <th>RAM / สเปก</th>
                    <th>แผนก / ที่ตั้ง</th>
                    <th>ผู้ใช้งาน</th>
                    <th class="center">สถานะ</th>
                </tr>
            </thead>
            <tbody>
                @forelse($group['items'] as $i => $item)
                    @php
                        $cpuName = trim((string) ($item->cpu ?: ($item->systemSpec?->cpu_name ?: '-')));
                        $osName = trim((string) ($item->os ?: ($item->systemSpec?->os_name ?: '-')));
                        $specRam = $item->systemSpec?->ram_total_gb ? 'RAM ' . $item->systemSpec->ram_total_gb . 'GB' : ($item->spec ?: '-');
                        $statusText = $item->status === 'active' ? 'ปกติ' : ($item->status === 'repair' ? 'ส่งซ่อม' : 'จำหน่าย');
                        $statusClass = $item->status === 'active' ? 'badge-active' : ($item->status === 'repair' ? 'badge-repair' : 'badge-disposed');
                    @endphp
                    <tr>
                        <td class="center">{{ $i + 1 }}</td>
                        <td style="font-family: monospace; font-size: 7.2px;">{{ $item->asset_code ?: '-' }}</td>
                        <td style="font-weight: bold; color: #0f172a;">{{ $item->name }}</td>
                        <td>{{ $item->brand ?: '-' }}</td>
                        <td style="color: #0369a1; font-weight: 500;">{{ $cpuName }}</td>
                        <td style="color: #334155;">{{ $osName }}</td>
                        <td>{{ $specRam }}</td>
                        <td>{{ $item->department ?: ($item->location ?: '-') }}</td>
                        <td>{{ $item->assigned_user ?: '-' }}</td>
                        <td class="center"><span class="{{ $statusClass }}">{{ $statusText }}</span></td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="10" style="text-align: center; color: #94a3b8; padding: 6px;">ไม่พบรายการอุปกรณ์ในประเภทนี้</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    @empty
        <div style="text-align: center; padding: 20px; color: #94a3b8;">
            ไม่พบข้อมูลคอมพิวเตอร์ตามเงื่อนไขที่ระบุ
        </div>
    @endforelse

    <!-- Sign-off Block -->
    <table class="sign-table">
        <tr>
            <td>
                <div>ผู้จัดทำรายงาน</div>
                <div class="sign-line">
                    (...............................................................)<br>
                    เจ้าหน้าที่งานสารสนเทศทางการแพทย์ (IM)<br>
                    วันที่ ...... / ...... / ............
                </div>
            </td>
            <td>
                <div>ผู้ตรวจสอบรายงาน</div>
                <div class="sign-line">
                    (...............................................................)<br>
                    หัวหน้ากลุ่มงานสารสนเทศทางการแพทย์ (IM)<br>
                    วันที่ ...... / ...... / ............
                </div>
            </td>
        </tr>
    </table>
</body>
</html>
