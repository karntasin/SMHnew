<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>รายงานข้อมูลรายแผนก</title>
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
        @page { margin: 22px 26px 30px 26px; }
        * { box-sizing: border-box; font-family: 'sarabun', sans-serif; }
        body { font-size: 10px; color: #0f172a; line-height: 1.45; }
        .hero {
            background: linear-gradient(135deg, #0f172a 0%, #0c4a6e 55%, #115e59 100%);
            color: #fff; border-radius: 10px; padding: 14px 16px; margin-bottom: 12px;
        }
        .hero .badge {
            display: inline-block; background: rgba(255,255,255,0.12); border-radius: 999px;
            padding: 2px 10px; font-size: 9px; margin-bottom: 6px;
        }
        .hero h1 { font-size: 18px; margin: 0 0 4px 0; font-weight: bold; }
        .hero .sub { font-size: 10px; color: #bae6fd; margin: 0; }
        .meta { font-size: 9px; color: #64748b; margin-bottom: 10px; }
        h2 {
            font-size: 12px; margin: 14px 0 6px 0; color: #0e7490; font-weight: bold;
            border-bottom: 1.5px solid #a5f3fc; padding-bottom: 3px;
        }
        .zone {
            border-radius: 8px; padding: 8px 12px; margin: 12px 0 8px 0;
            border: 1px solid #cbd5e1;
        }
        .zone-qi {
            background: #fffbeb; border-color: #fcd34d;
        }
        .zone-ops {
            background: #f0f9ff; border-color: #7dd3fc;
        }
        .zone .ztitle { font-size: 12px; font-weight: bold; margin: 0 0 2px 0; }
        .zone-qi .ztitle { color: #92400e; }
        .zone-ops .ztitle { color: #0c4a6e; }
        .zone .znote { font-size: 9px; color: #64748b; margin: 0; }
        .kpi-row { width: 100%; border-collapse: separate; border-spacing: 6px 0; margin: 0 -6px 8px -6px; }
        .kpi-row td { width: 25%; vertical-align: top; padding: 0; }
        .kpi {
            border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 10px; background: #f8fafc;
        }
        .kpi .label { font-size: 9px; color: #6b7280; }
        .kpi .value { font-size: 13px; font-weight: bold; color: #0f172a; margin-top: 2px; }
        table.data { width: 100%; border-collapse: collapse; margin-top: 4px; }
        table.data th {
            background: #ecfeff; color: #0e7490; font-weight: bold; font-size: 9px;
            text-align: left; padding: 5px 4px; border-bottom: 1.5px solid #67e8f9;
        }
        table.data td { padding: 4px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
        table.data tr:nth-child(even) td { background: #f9fafb; }
        .num { text-align: right; white-space: nowrap; }
        .footer {
            margin-top: 14px; font-size: 8px; color: #6b7280;
            border-top: 1px solid #e5e7eb; padding-top: 6px;
        }
        .muted { color: #94a3b8; font-style: italic; }
    </style>
</head>
<body>
    @php
        $showAll = blank($section);
        $show = fn (string $key) => $showAll || $section === $key;
        $src = $source ?? 'ovst';
        $isIpd = $src === 'ipt';
        $isLab = $src === 'lab';
        $isXray = $src === 'xray';
        $isCheckup = $src === 'checkup';
        $isOpdScreen = $src === 'opd_screen';
        $waitMode = $waitMode ?? null;
        $isEr = $waitMode === 'er';
        $isClinic = $waitMode === 'clinic';
        $isVisitLayout = $isOpdScreen || $isEr || $isClinic;
        $visitLabel = $isIpd ? 'Admit (AN)' : ($isLab ? 'ใบสั่งแล็บ' : ($isXray ? 'รายการตรวจ' : ($isCheckup ? 'ผู้รับบริการ' : ($isOpdScreen ? 'ครั้งคัดกรอง' : ($isEr ? 'ครั้งรับบริการ ER' : 'ครั้งรับบริการ (VN)')))));
        $visitUnit = $isIpd ? 'admit' : ($isLab ? 'order' : ($isXray ? 'exam' : ($isCheckup ? 'คน' : 'ครั้ง')));
        $resolvedWards = $department['resolved_wards'] ?? [];
        $sourceBadge = match ($src) {
            'ipt' => 'IPD (ipt)',
            'lab' => 'LAB (lab_head)',
            'xray' => 'XRAY (xray_head/report)',
            'checkup' => 'CHECKUP (ovst pttype=40)',
            'opd_screen' => 'OPD SCREEN (ovst+opdscreen)',
            default => $waitMode === 'er' ? 'ER (ovst+service_time)' : ($waitMode === 'clinic' ? 'CLINIC (ovst+service_time)' : 'OPD (ovst)'),
        };
        $regiments = $regiments ?? [];
        $personnel = $personnel ?? [];
        $ages = $ages ?? [];
        $labStatus = $labStatus ?? [];
        $labMarkers = $labMarkers ?? [];
        $waitBands = $waitBands ?? [];
        $waitStages = $waitStages ?? [];
        $waitQueue = $waitQueue ?? [];
        $waitLabQueue = $waitLabQueue ?? [];
        $waitPharmacyQueue = $waitPharmacyQueue ?? [];
        $waitEnabled = $isVisitLayout || $waitMode || ! empty($waitQueue) || ! empty($waitStages);
        $vitals = $vitals ?? [];
        $erTypes = $erTypes ?? [];
        $erPtTypes = $erPtTypes ?? [];
        $specialties = $specialties ?? [];
        $visitStatus = $visitStatus ?? [];
        $destinations = $destinations ?? [];
        $complaints = $complaints ?? [];
        $weekdays = $weekdays ?? [];
        $formatTat = function ($minutes) {
            $m = (float) $minutes;
            if ($m <= 0) return '-';
            if ($m < 60) return number_format($m, 1).' นาที';
            return floor($m / 60).' ชม. '.round($m % 60).' นาที';
        };
        $forms = $forms ?? [];
        $items = $items ?? [];
        $groups = $groups ?? [];
        $requestDepartments = $requestDepartments ?? [];
    @endphp

    <div class="hero">
        <div class="badge">{{ $hospitalName }} · ข้อมูลรายแผนก · {{ $sourceBadge }}</div>
        <h1>
            @if ($sectionLabel)
                {{ $sectionLabel }} — {{ $department['name'] }}
            @else
                รายงานรวมแผนก {{ $department['name'] }}
            @endif
        </h1>
        <p class="sub">
            รหัส {{ $department['code'] }} · ช่วงวันที่ {{ $startLabel }} – {{ $endLabel }}
            @if ($isIpd && count($resolvedWards))
                · หอ
                @foreach ($resolvedWards as $w)
                    {{ $w['name'] }}@if (!$loop->last), @endif
                @endforeach
            @endif
        </p>
    </div>

    <div class="meta">สร้างเมื่อ {{ $generatedAt }}</div>

    @if ($isVisitLayout && ($show('wait_time') || $show('vitals') || $show('er_types')))
        <div class="zone zone-qi">
            <p class="ztitle">โซนตัวชี้วัดคุณภาพ {{ $isOpdScreen ? '(QI-OPD)' : ($isEr ? '(ER)' : '') }}</p>
            <p class="znote">ระยะเวลารอคอยจากตาราง service_time ตามแนวทาง HOSxP · เป้า ≤ {{ $summary['wait_target_minutes'] ?? 60 }} นาที</p>
        </div>
        <table class="kpi-row">
            <tr>
                <td><div class="kpi"><div class="label">% มีบันทึกคัดกรอง</div><div class="value">{{ $formatBaht($summary['screen_rate'] ?? 0) }}%</div></div></td>
                <td><div class="kpi"><div class="label">% ตามเป้า ≤{{ $summary['wait_target_minutes'] ?? 60 }} นาที</div><div class="value">{{ $formatBaht($summary['within_wait_rate'] ?? 0) }}%</div></div></td>
                <td><div class="kpi"><div class="label">เวลารอเฉลี่ย</div><div class="value">{{ $formatBaht($summary['avg_los_minutes'] ?? 0) }}</div></div></td>
                <td><div class="kpi"><div class="label">รอเกิน 60 นาทีวันนี้</div><div class="value">{{ $formatNum($summary['waiting_over_60'] ?? 0) }}</div></div></td>
            </tr>
        </table>
    @endif

    @if ($waitEnabled && $show('wait_time'))
        <h2>{{ $sectionLabels['wait_time'] ?? 'ระยะเวลารอคอย' }}</h2>
        <p class="muted">
            ข้อมูลจากตาราง service_time ของ HOSxP
            · OPD นับรอพบแพทย์จาก service4 ถึง service5 เป้า ≤ {{ $summary['wait_target_minutes'] ?? 60 }} นาที
            · ชั่วโมงอยู่ใน รพ. นับจาก service20 ถึงเวลาปัจจุบัน
            · กำลังรอวันนี้ {{ $formatNum($summary['waiting_now'] ?? 0) }} ราย
            · รอ LAB {{ $formatNum($summary['waiting_lab'] ?? 0) }} ราย (service13 → 14)
            · รอจ่ายยา {{ $formatNum($summary['waiting_pharmacy'] ?? 0) }} ราย (service6 → 16)
            · รอเกินเกณฑ์ {{ $formatNum($summary['waiting_over_60'] ?? 0) }} ราย
        </p>
        @if (!empty($waitStages))
            <table class="data">
                <thead><tr><th>ขั้นตอน</th><th class="num">เฉลี่ย (นาที)</th><th class="num">จำนวนที่วัดได้</th><th class="num">เกินเป้า</th></tr></thead>
                <tbody>
                    @foreach ($waitStages as $row)
                        <tr>
                            <td>{{ $row['name'] }}</td>
                            <td class="num">{{ $formatBaht($row['avg'] ?? 0) }}</td>
                            <td class="num">{{ $formatNum($row['measured'] ?? 0) }}</td>
                            <td class="num">{{ $formatNum($row['over_target'] ?? 0) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
        @if (empty($waitBands))
            <p class="muted">ไม่มีข้อมูลระยะเวลาในช่วงที่เลือก</p>
        @else
            <table class="data">
                <thead><tr><th>ช่วงเวลารอ</th><th class="num">จำนวน</th></tr></thead>
                <tbody>
                    @foreach ($waitBands as $row)
                        <tr>
                            <td>{{ $row['name'] }}</td>
                            <td class="num">{{ $formatNum($row['total']) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
        @if (!empty($waitQueue))
            <h2>คิวที่กำลังรอวันนี้</h2>
            <table class="data">
                <thead><tr><th>HN</th><th>ผู้ป่วย</th><th>มาถึง</th><th>สถานะ</th><th class="num">อยู่ใน รพ. (นาที)</th><th class="num">รอพบแพทย์ (นาที)</th></tr></thead>
                <tbody>
                    @foreach ($waitQueue as $row)
                        <tr>
                            <td>{{ $row['hn'] }}</td>
                            <td>{{ $row['name'] }}</td>
                            <td>{{ $row['arrived_at'] }}</td>
                            <td>{{ $row['stage'] }}{{ !empty($row['er_type']) ? ' · '.$row['er_type'] : '' }}</td>
                            <td class="num">{{ $row['in_hospital'] !== null ? $formatNum($row['in_hospital']) : '-' }}</td>
                            <td class="num">{{ $row['waited'] !== null ? $formatNum($row['waited']) : '-' }}{{ !empty($row['alert']) ? ' *' : '' }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
        @if (!empty($waitLabQueue))
            <h2>กำลังรอผล LAB วันนี้</h2>
            <table class="data">
                <thead><tr><th>HN</th><th>ผู้ป่วย</th><th>รับ LAB</th><th class="num">รอผล (นาที)</th></tr></thead>
                <tbody>
                    @foreach ($waitLabQueue as $row)
                        <tr>
                            <td>{{ $row['hn'] }}</td>
                            <td>{{ $row['name'] }}</td>
                            <td>{{ $row['lab_start'] ?? $row['arrived_at'] ?? '-' }}</td>
                            <td class="num">{{ $formatNum($row['waited'] ?? 0) }}{{ !empty($row['alert']) ? ' *' : '' }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
        @if (!empty($waitPharmacyQueue))
            <h2>กำลังรอจ่ายยาวันนี้</h2>
            <table class="data">
                <thead><tr><th>HN</th><th>ผู้ป่วย</th><th>เริ่ม Key ยา</th><th class="num">รอจ่ายยา (นาที)</th></tr></thead>
                <tbody>
                    @foreach ($waitPharmacyQueue as $row)
                        <tr>
                            <td>{{ $row['hn'] }}</td>
                            <td>{{ $row['name'] }}</td>
                            <td>{{ $row['lab_start'] ?? $row['arrived_at'] ?? '-' }}</td>
                            <td class="num">{{ $formatNum($row['waited'] ?? 0) }}{{ !empty($row['alert']) ? ' *' : '' }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endif

    @if ($isVisitLayout && $show('er_types') && (!empty($erTypes) || !empty($erPtTypes)))
        <h2>{{ $sectionLabels['er_types'] ?? 'ระดับความฉุกเฉิน / ประเภทผู้ป่วย ER' }}</h2>
        @if (!empty($erTypes))
            <table class="data">
                <thead><tr><th>ระดับความฉุกเฉิน</th><th class="num">จำนวน</th></tr></thead>
                <tbody>
                    @foreach ($erTypes as $row)
                        <tr>
                            <td>{{ $row['name'] }}</td>
                            <td class="num">{{ $formatNum($row['total']) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
        @if (!empty($erPtTypes))
            <table class="data">
                <thead><tr><th>ประเภทผู้ป่วย ER</th><th class="num">จำนวน</th></tr></thead>
                <tbody>
                    @foreach ($erPtTypes as $row)
                        <tr>
                            <td>{{ $row['name'] }}</td>
                            <td class="num">{{ $formatNum($row['total']) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endif

    @if ($isVisitLayout && $show('vitals'))
        <h2>{{ $sectionLabels['vitals'] ?? 'สัญญาณชีพและการคัดกรอง' }}</h2>
        @if (empty($vitals))
            <p class="muted">ไม่มีข้อมูลสัญญาณชีพในช่วงที่เลือก</p>
        @else
            <table class="data">
                <thead><tr><th>รายการ</th><th class="num">จำนวน</th><th class="num">%</th></tr></thead>
                <tbody>
                    @foreach ($vitals as $row)
                        <tr>
                            <td>{{ $row['name'] }}</td>
                            <td class="num">{{ $formatNum($row['total']) }}</td>
                            <td class="num">{{ $formatBaht($row['rate'] ?? 0) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endif

    @if ($isVisitLayout && ($show('summary') || $show('trend') || $show('ages') || $show('specialties') || $show('visit_status') || $show('destinations') || $show('complaints') || $show('diagnoses') || $show('rights') || $show('weekdays') || $show('hourly')))
        <div class="zone zone-ops">
            <p class="ztitle">โซนรายงานทั่วไป / ปฏิบัติการ</p>
            <p class="znote">ปริมาณงาน แนวโน้ม การไหลเวียนผู้ป่วย และสิทธิการรักษา — ไม่ใช่ตัวชี้วัด QI โดยตรง</p>
        </div>
    @endif

    @if ($show('summary'))
        <h2>{{ $sectionLabels['summary'] ?? 'สรุปภาพรวม' }}</h2>
        @if ($isVisitLayout)
            <table class="kpi-row">
                <tr>
                    <td><div class="kpi"><div class="label">{{ $visitLabel }}</div><div class="value">{{ $formatNum($summary['visits'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">ผู้ป่วย (HN)</div><div class="value">{{ $formatNum($summary['patients'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">คัดกรองแล้ว</div><div class="value">{{ $formatNum($summary['screened'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">มูลค่ารวม (บาท)</div><div class="value">{{ $formatBaht($summary['revenue'] ?? 0) }}</div></div></td>
                </tr>
            </table>
        @elseif ($isCheckup)
            <table class="kpi-row">
                <tr>
                    <td><div class="kpi"><div class="label">ผู้รับบริการ (VN)</div><div class="value">{{ $formatNum($summary['visits'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">ผู้ป่วย (HN)</div><div class="value">{{ $formatNum($summary['patients'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">มีผล Lab</div><div class="value">{{ $formatNum($summary['with_lab'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">ผล Lab ปกติ</div><div class="value">{{ $formatNum($summary['lab_normal'] ?? 0) }}</div></div></td>
                </tr>
            </table>
            <table class="kpi-row">
                <tr>
                    <td><div class="kpi"><div class="label">ผล Lab ผิดปกติ</div><div class="value">{{ $formatNum($summary['lab_abnormal'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">ยังไม่มีผล Lab</div><div class="value">{{ $formatNum($summary['lab_pending'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">หน่วยงาน/หน่วย</div><div class="value">{{ $formatNum($summary['regiment_count'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">มูลค่ารวม (บาท)</div><div class="value">{{ $formatBaht($summary['revenue'] ?? 0) }}</div></div></td>
                </tr>
            </table>
        @elseif ($isLab)
            <table class="kpi-row">
                <tr>
                    <td><div class="kpi"><div class="label">ใบสั่งแล็บ</div><div class="value">{{ $formatNum($summary['orders'] ?? $summary['visits'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">ผู้ป่วย (HN)</div><div class="value">{{ $formatNum($summary['patients'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">รายงานแล้ว</div><div class="value">{{ $formatNum($summary['confirmed'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">รอผล</div><div class="value">{{ $formatNum($summary['pending'] ?? 0) }}</div></div></td>
                </tr>
            </table>
            <table class="kpi-row">
                <tr>
                    <td><div class="kpi"><div class="label">OPD / IPD</div><div class="value">{{ $formatNum($summary['opd'] ?? 0) }} / {{ $formatNum($summary['ipd'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">TAT เฉลี่ย</div><div class="value">{{ $formatTat($summary['avg_tat_minutes'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">มูลค่ารวม (บาท)</div><div class="value">{{ $formatBaht($summary['revenue'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">รายการในผล</div><div class="value">{{ $formatNum($summary['items'] ?? 0) }}</div></div></td>
                </tr>
            </table>
        @elseif ($isXray)
            <table class="kpi-row">
                <tr>
                    <td><div class="kpi"><div class="label">รายการตรวจ</div><div class="value">{{ $formatNum($summary['exams'] ?? $summary['visits'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">ผู้ป่วย (HN)</div><div class="value">{{ $formatNum($summary['patients'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">Visit (VN)</div><div class="value">{{ $formatNum($summary['orders'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">ยืนยันผลแล้ว</div><div class="value">{{ $formatNum($summary['confirmed'] ?? 0) }}</div></div></td>
                </tr>
            </table>
            <table class="kpi-row">
                <tr>
                    <td><div class="kpi"><div class="label">OPD / IPD</div><div class="value">{{ $formatNum($summary['opd'] ?? 0) }} / {{ $formatNum($summary['ipd'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">TAT เฉลี่ย</div><div class="value">{{ $formatTat($summary['avg_tat_minutes'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">มูลค่ารวม (บาท)</div><div class="value">{{ $formatBaht($summary['revenue'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">เฉลี่ยต่อ Visit</div><div class="value">{{ $formatBaht($summary['avg_revenue'] ?? 0) }}</div></div></td>
                </tr>
            </table>
        @elseif ($isIpd)
            <table class="kpi-row">
                <tr>
                    <td><div class="kpi"><div class="label">Admit (AN)</div><div class="value">{{ $formatNum($summary['admissions'] ?? $summary['visits'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">ผู้ป่วย (HN)</div><div class="value">{{ $formatNum($summary['patients'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">จำหน่ายแล้ว</div><div class="value">{{ $formatNum($summary['discharges'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">ยัง admit อยู่</div><div class="value">{{ $formatNum($summary['active'] ?? 0) }}</div></div></td>
                </tr>
            </table>
            <table class="kpi-row">
                <tr>
                    <td><div class="kpi"><div class="label">วันนอนเฉลี่ย</div><div class="value">{{ $formatBaht($summary['avg_los'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">Bed days</div><div class="value">{{ $formatNum($summary['bed_days'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">มูลค่ารวม (บาท)</div><div class="value">{{ $formatBaht($summary['revenue'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">เฉลี่ยต่อ Admit</div><div class="value">{{ $formatBaht($summary['avg_revenue'] ?? 0) }}</div></div></td>
                </tr>
            </table>
        @else
            <table class="kpi-row">
                <tr>
                    <td><div class="kpi"><div class="label">{{ $visitLabel }}</div><div class="value">{{ $formatNum($summary['visits'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">จำนวนผู้ป่วย (HN)</div><div class="value">{{ $formatNum($summary['patients'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">มูลค่ารวม (บาท)</div><div class="value">{{ $formatBaht($summary['revenue'] ?? 0) }}</div></div></td>
                    <td><div class="kpi"><div class="label">เฉลี่ยต่อครั้ง</div><div class="value">{{ $formatBaht($summary['avg_revenue'] ?? 0) }}</div></div></td>
                </tr>
            </table>
        @endif
        <table class="kpi-row">
            <tr>
                <td><div class="kpi"><div class="label">ชาย</div><div class="value">{{ $formatNum($summary['male'] ?? 0) }}</div></div></td>
                <td><div class="kpi"><div class="label">หญิง</div><div class="value">{{ $formatNum($summary['female'] ?? 0) }}</div></div></td>
                <td><div class="kpi"><div class="label">ไม่ระบุเพศ</div><div class="value">{{ $formatNum($summary['unknown_sex'] ?? 0) }}</div></div></td>
                <td><div class="kpi"><div class="label">แหล่งข้อมูล</div><div class="value">{{ $src }}</div></div></td>
            </tr>
        </table>
    @endif

    @if ($show('trend'))
        <h2>{{ $sectionLabels['trend'] ?? 'แนวโน้มรายวัน' }}</h2>
        @if (empty($trend))
            <p class="muted">ไม่มีข้อมูลในช่วงที่เลือก</p>
        @else
            <table class="data">
                <thead>
                    <tr>
                        <th>วันที่</th>
                        <th class="num">{{ $visitLabel }}</th>
                        <th class="num">ผู้ป่วย (HN)</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($trend as $row)
                        <tr>
                            <td>{{ $row['label'] }}</td>
                            <td class="num">{{ $formatNum($row['visits']) }}</td>
                            <td class="num">{{ $formatNum($row['patients']) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endif

    @if (($isVisitLayout || $isCheckup) && $show('ages'))
        <h2>{{ $sectionLabels['ages'] ?? 'ช่วงอายุ' }}</h2>
        @if (empty($ages))
            <p class="muted">ไม่มีข้อมูลช่วงอายุในช่วงที่เลือก</p>
        @else
            <table class="data">
                <thead><tr><th>ช่วงอายุ</th><th class="num">จำนวน</th></tr></thead>
                <tbody>
                    @foreach ($ages as $row)
                        <tr>
                            <td>{{ $row['name'] }}</td>
                            <td class="num">{{ $formatNum($row['total']) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endif

    @if ($isVisitLayout && $show('specialties'))
        <h2>{{ $sectionLabels['specialties'] ?? 'คลินิกที่ส่งต่อ' }}</h2>
        @if (empty($specialties))
            <p class="muted">ไม่มีข้อมูลคลินิกในช่วงที่เลือก</p>
        @else
            <table class="data">
                <thead><tr><th>คลินิก</th><th class="num">VN</th></tr></thead>
                <tbody>
                    @foreach ($specialties as $row)
                        <tr>
                            <td>{{ $row['name'] }}</td>
                            <td class="num">{{ $formatNum($row['total']) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endif

    @if ($isVisitLayout && $show('visit_status'))
        <h2>{{ $sectionLabels['visit_status'] ?? 'สถานะการรับบริการ' }}</h2>
        @if (empty($visitStatus))
            <p class="muted">ไม่มีข้อมูลสถานะในช่วงที่เลือก</p>
        @else
            <table class="data">
                <thead><tr><th>สถานะ</th><th class="num">VN</th></tr></thead>
                <tbody>
                    @foreach ($visitStatus as $row)
                        <tr>
                            <td>{{ $row['name'] }}</td>
                            <td class="num">{{ $formatNum($row['total']) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endif

    @if ($isVisitLayout && $show('destinations'))
        <h2>{{ $sectionLabels['destinations'] ?? 'ปลายทางหลังคัดกรอง' }}</h2>
        @if (empty($destinations))
            <p class="muted">ไม่มีข้อมูลปลายทางในช่วงที่เลือก</p>
        @else
            <table class="data">
                <thead><tr><th>ปลายทาง</th><th class="num">VN</th></tr></thead>
                <tbody>
                    @foreach ($destinations as $row)
                        <tr>
                            <td>{{ $row['name'] }}</td>
                            <td class="num">{{ $formatNum($row['total']) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endif

    @if ($isVisitLayout && $show('complaints'))
        <h2>{{ $sectionLabels['complaints'] ?? 'อาการสำคัญ (CC)' }}</h2>
        @if (empty($complaints))
            <p class="muted">ไม่มีข้อมูลอาการในช่วงที่เลือก</p>
        @else
            <table class="data">
                <thead><tr><th>อาการสำคัญ</th><th class="num">จำนวน</th></tr></thead>
                <tbody>
                    @foreach ($complaints as $row)
                        <tr>
                            <td>{{ $row['name'] }}</td>
                            <td class="num">{{ $formatNum($row['total']) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endif

    @if ($isVisitLayout && $show('weekdays'))
        <h2>{{ $sectionLabels['weekdays'] ?? 'แยกตามวันในสัปดาห์' }}</h2>
        @if (empty($weekdays))
            <p class="muted">ไม่มีข้อมูลวันในช่วงที่เลือก</p>
        @else
            <table class="data">
                <thead><tr><th>วัน</th><th class="num">VN</th></tr></thead>
                <tbody>
                    @foreach ($weekdays as $row)
                        <tr>
                            <td>{{ $row['name'] }}</td>
                            <td class="num">{{ $formatNum($row['total']) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endif

    @if ($isCheckup && $show('regiments'))
        <h2>{{ $sectionLabels['regiments'] ?? 'แยกตามหน่วยงาน/หน่วยทหาร' }}</h2>
        @if (empty($regiments))
            <p class="muted">ไม่มีข้อมูลหน่วยงานในช่วงที่เลือก</p>
        @else
            <table class="data">
                <thead><tr><th>หน่วยงาน/หน่วย</th><th class="num">VN</th><th class="num">HN</th></tr></thead>
                <tbody>
                    @foreach ($regiments as $row)
                        <tr>
                            <td>{{ $row['name'] }}</td>
                            <td class="num">{{ $formatNum($row['total']) }}</td>
                            <td class="num">{{ $formatNum($row['patients'] ?? 0) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endif

    @if ($isCheckup && $show('personnel'))
        <h2>{{ $sectionLabels['personnel'] ?? 'แยกตามประเภทบุคลากร' }}</h2>
        @if (empty($personnel))
            <p class="muted">ไม่มีข้อมูลประเภทบุคลากรในช่วงที่เลือก</p>
        @else
            <table class="data">
                <thead><tr><th>ประเภท</th><th class="num">VN</th><th class="num">HN</th></tr></thead>
                <tbody>
                    @foreach ($personnel as $row)
                        <tr>
                            <td>{{ $row['name'] }}</td>
                            <td class="num">{{ $formatNum($row['total']) }}</td>
                            <td class="num">{{ $formatNum($row['patients'] ?? 0) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endif

    @if ($isCheckup && $show('lab_overview'))
        <h2>{{ $sectionLabels['lab_overview'] ?? 'สรุปผล Lab' }}</h2>
        @if (empty($labStatus))
            <p class="muted">ไม่มีข้อมูล Lab ในช่วงที่เลือก</p>
        @else
            <table class="data">
                <thead><tr><th>สถานะ</th><th class="num">จำนวนผู้ป่วย</th></tr></thead>
                <tbody>
                    @foreach ($labStatus as $row)
                        <tr>
                            <td>{{ $row['name'] }}</td>
                            <td class="num">{{ $formatNum($row['total']) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endif

    @if ($isCheckup && $show('lab_markers'))
        <h2>{{ $sectionLabels['lab_markers'] ?? 'ผลตรวจ Lab สำคัญ' }}</h2>
        @if (empty($labMarkers))
            <p class="muted">ไม่มีข้อมูลผลตรวจสำคัญในช่วงที่เลือก</p>
        @else
            <table class="data">
                <thead>
                    <tr>
                        <th>รายการ</th>
                        <th class="num">ทั้งหมด</th>
                        <th class="num">ปกติ</th>
                        <th class="num">ผิดปกติ</th>
                        <th class="num">ค่าเฉลี่ย</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($labMarkers as $row)
                        <tr>
                            <td>{{ $row['name'] }}@if (!empty($row['unit'])) ({{ $row['unit'] }}) @endif</td>
                            <td class="num">{{ $formatNum($row['total']) }}</td>
                            <td class="num">{{ $formatNum($row['normal']) }}</td>
                            <td class="num">{{ $formatNum($row['abnormal']) }}</td>
                            <td class="num">{{ $formatBaht($row['avg_value'] ?? 0) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endif

    @if ($isLab && $show('forms'))
        <h2>{{ $sectionLabels['forms'] ?? 'ฟอร์มตรวจยอดนิยม' }}</h2>
        @if (empty($forms))
            <p class="muted">ไม่มีข้อมูลฟอร์มในช่วงที่เลือก</p>
        @else
            <table class="data">
                <thead><tr><th>ฟอร์ม</th><th class="num">จำนวน</th></tr></thead>
                <tbody>
                    @foreach ($forms as $row)
                        <tr>
                            <td>{{ $row['name'] }}</td>
                            <td class="num">{{ $formatNum($row['total']) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endif

    @if (($isLab || $isXray) && $show('items'))
        <h2>{{ $sectionLabels['items'] ?? 'รายการตรวจยอดนิยม' }}</h2>
        @if (empty($items))
            <p class="muted">ไม่มีข้อมูลรายการในช่วงที่เลือก</p>
        @else
            <table class="data">
                <thead>
                    <tr>
                        <th style="width:70px">รหัส</th>
                        <th>ชื่อรายการ</th>
                        <th class="num">จำนวน</th>
                        <th class="num">มูลค่า</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($items as $row)
                        <tr>
                            <td>{{ $row['code'] }}</td>
                            <td>{{ $row['name'] }}</td>
                            <td class="num">{{ $formatNum($row['total']) }}</td>
                            <td class="num">{{ $formatBaht($row['revenue'] ?? 0) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endif

    @if (($isLab || $isXray) && $show('groups'))
        <h2>{{ $sectionLabels['groups'] ?? 'กลุ่มการตรวจ' }}</h2>
        @if (empty($groups))
            <p class="muted">ไม่มีข้อมูลกลุ่มในช่วงที่เลือก</p>
        @else
            <table class="data">
                <thead><tr><th>กลุ่ม</th><th class="num">จำนวน</th></tr></thead>
                <tbody>
                    @foreach ($groups as $row)
                        <tr>
                            <td>{{ $row['name'] }}</td>
                            <td class="num">{{ $formatNum($row['total']) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endif

    @if (($isLab || $isXray) && $show('departments'))
        <h2>{{ $sectionLabels['departments'] ?? 'หน่วยงานที่ส่งตรวจ' }}</h2>
        @if (empty($requestDepartments))
            <p class="muted">ไม่มีข้อมูลหน่วยงานในช่วงที่เลือก</p>
        @else
            <table class="data">
                <thead>
                    <tr>
                        <th style="width:70px">รหัส</th>
                        <th>หน่วยงาน</th>
                        <th class="num">{{ $visitUnit }}</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($requestDepartments as $row)
                        <tr>
                            <td>{{ $row['code'] }}</td>
                            <td>{{ $row['name'] }}</td>
                            <td class="num">{{ $formatNum($row['total']) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endif

    @if (! $isLab && ! $isXray && ! $isCheckup && $show('diagnoses'))
        <h2>{{ $sectionLabels['diagnoses'] ?? 'วินิจฉัยโรคยอดนิยม' }}</h2>
        @if (empty($diagnoses))
            <p class="muted">ไม่มีข้อมูลวินิจฉัยในช่วงที่เลือก</p>
        @else
            <table class="data">
                <thead>
                    <tr>
                        <th style="width:70px">ICD-10</th>
                        <th>ชื่อโรค</th>
                        <th class="num" style="width:70px">จำนวน</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($diagnoses as $row)
                        <tr>
                            <td>{{ $row['icd10'] }}</td>
                            <td>{{ $row['name'] }}</td>
                            <td class="num">{{ $formatNum($row['total']) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endif

    @if (! $isLab && ! $isXray && ! $isCheckup && $show('rights'))
        <h2>{{ $sectionLabels['rights'] ?? 'สิทธิการรักษา' }}</h2>
        @if (empty($rights))
            <p class="muted">ไม่มีข้อมูลสิทธิในช่วงที่เลือก</p>
        @else
            <table class="data">
                <thead>
                    <tr>
                        <th style="width:60px">รหัส</th>
                        <th>สิทธิ</th>
                        <th class="num">{{ $visitUnit }}</th>
                        <th class="num">มูลค่า (บาท)</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($rights as $row)
                        <tr>
                            <td>{{ $row['code'] }}</td>
                            <td>{{ $row['name'] }}</td>
                            <td class="num">{{ $formatNum($row['visits']) }}</td>
                            <td class="num">{{ $formatBaht($row['revenue']) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endif

    @if ($isIpd && $show('wards'))
        <h2>{{ $sectionLabels['wards'] ?? 'แยกตามหอผู้ป่วย' }}</h2>
        @if (empty($wards))
            <p class="muted">ไม่มีข้อมูลหอผู้ป่วยในช่วงที่เลือก</p>
        @else
            <table class="data">
                <thead>
                    <tr>
                        <th style="width:60px">รหัสหอ</th>
                        <th>ชื่อหอ</th>
                        <th class="num">Admit</th>
                        <th class="num">ผู้ป่วย</th>
                        <th class="num">ค้างอยู่</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($wards as $row)
                        <tr>
                            <td>{{ $row['code'] }}</td>
                            <td>{{ $row['name'] }}</td>
                            <td class="num">{{ $formatNum($row['admissions']) }}</td>
                            <td class="num">{{ $formatNum($row['patients']) }}</td>
                            <td class="num">{{ $formatNum($row['active']) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endif

    @if ($show('hourly'))
        <h2>{{ $sectionLabels['hourly'] ?? 'ช่วงเวลามาใช้บริการ' }}</h2>
        @if (empty($hourly) || collect($hourly)->sum('visits') === 0)
            <p class="muted">ไม่มีข้อมูลช่วงเวลาในช่วงที่เลือก</p>
        @else
            <table class="data">
                <thead>
                    <tr>
                        <th>ช่วงเวลา</th>
                        <th class="num">{{ $visitLabel }}</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($hourly as $row)
                        @if (($row['visits'] ?? 0) > 0)
                            <tr>
                                <td>{{ $row['hour'] }}</td>
                                <td class="num">{{ $formatNum($row['visits']) }}</td>
                            </tr>
                        @endif
                    @endforeach
                </tbody>
            </table>
        @endif
    @endif

    <div class="footer">
        {{ $hospitalName }} · ระบบข้อมูลรายแผนก
        · แหล่งข้อมูล
        @if ($isOpdScreen)
            ovst / opdscreen (QI-OPD)
        @elseif ($isEr)
            ovst / er_regist / opdscreen / service_time
        @elseif ($isClinic)
            ovst / opdscreen / service_time
        @elseif ($isCheckup)
            ovst (pttype=40) / patient_regiment / lab_head / lab_order
        @elseif ($isLab)
            lab_head / lab_order_service / lab_items
        @elseif ($isXray)
            xray_head / xray_report / xray_items
        @elseif ($isIpd)
            ipt / ward / iptdiag
        @else
            ovst / main_dep
        @endif
        · สร้างอัตโนมัติจากระบบ SMH
    </div>
</body>
</html>
