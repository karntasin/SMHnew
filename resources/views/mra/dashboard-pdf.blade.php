<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>ภาพรวม MRA</title>
    <style>@include('mra.partials.overview-pdf-styles')</style>
</head>
<body>
    <div class="page-header">
        <div class="hospital-name">{{ $hospitalName }}</div>
        <div class="hospital-sub">ศูนย์พัฒนาคุณภาพ · ระบบตรวจสอบคุณภาพเวชระเบียน (MRA 2563)</div>
    </div>
    <div class="page-footer">
        {{ $hospitalName }} · ภาพรวม MRA · พิมพ์เมื่อ {{ $generatedAt }}
    </div>

    @php
        $opdCats = collect($categoryStats)->where('audit_type', 'opd')->values();
        $ipdCats = collect($categoryStats)->where('audit_type', 'ipd')->values();
        $otherCats = collect($categoryStats)->reject(fn ($c) => in_array($c['audit_type'] ?? '', ['opd', 'ipd'], true))->values();
        $accuracyTrend = round(($stats['this_month_accuracy'] ?? 0) - ($stats['last_month_accuracy'] ?? 0), 1);
        $accClass = function ($v) {
            $n = (float) $v;
            return $n >= 90 ? 'acc-high' : ($n >= 70 ? 'acc-mid' : 'acc-low');
        };
    @endphp

    <table class="hero">
        <tr>
            <td class="hero-left">
                <div class="eyebrow">รายงานภาพรวมคุณภาพเวชระเบียน</div>
                <h1>ภาพรวม MRA</h1>
                <div class="hero-sub">{{ $hospitalName }} · ตามเกณฑ์ สรพ. / สปสช. ปี 2563</div>
            </td>
            <td class="hero-right">
                <div class="report-date">{{ $generatedAtDate }}</div>
                <div class="report-meta">สร้างเมื่อ {{ $generatedAt }}</div>
            </td>
        </tr>
    </table>

    <div class="section">
        <h2>สารบัญ</h2>
        <table class="toc">
            <thead>
                <tr>
                    <th class="num">ลำดับ</th>
                    <th>รายการ</th>
                </tr>
            </thead>
            <tbody>
                <tr><td class="num">1</td><td>สรุปสถานะภาพรวม</td></tr>
                <tr><td class="num">2</td><td>ผลตามหมวดหมู่</td></tr>
                <tr><td class="num">3</td><td>ข้อผิดพลาดที่พบบ่อย</td></tr>
                <tr><td class="num">4</td><td>แนวโน้มรายเดือน</td></tr>
                <tr><td class="num">5</td><td>การตรวจสอบล่าสุด</td></tr>
                <tr><td class="num">6</td><td>ลงนาม</td></tr>
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>1. สรุปสถานะภาพรวม</h2>
        <table class="kpi">
            <tr>
                <td>
                    <div class="kpi-card">
                        <div class="kpi-label">ตรวจสอบทั้งหมด</div>
                        <div class="kpi-value">{{ number_format($stats['total_audits'] ?? 0) }}</div>
                        <div class="kpi-sub">เดือนนี้ +{{ number_format($stats['this_month_audits'] ?? 0) }}</div>
                    </div>
                </td>
                <td>
                    <div class="kpi-card amber">
                        <div class="kpi-label">รอการตรวจสอบ</div>
                        <div class="kpi-value">{{ number_format($stats['pending_audits'] ?? 0) }}</div>
                        <div class="kpi-sub">กำลังดำเนินการ {{ number_format($stats['in_progress_audits'] ?? 0) }}</div>
                    </div>
                </td>
                <td>
                    <div class="kpi-card emerald">
                        <div class="kpi-label">ตรวจสอบแล้ว</div>
                        <div class="kpi-value">{{ number_format($stats['completed_audits'] ?? 0) }}</div>
                        <div class="kpi-sub">
                            @if (($stats['total_audits'] ?? 0) > 0)
                                {{ round((($stats['completed_audits'] ?? 0) / $stats['total_audits']) * 100) }}% ของทั้งหมด
                            @else
                                —
                            @endif
                        </div>
                    </div>
                </td>
                <td>
                    <div class="kpi-card {{ ($stats['avg_accuracy'] ?? 0) >= 90 ? 'emerald' : (($stats['avg_accuracy'] ?? 0) >= 70 ? 'amber' : 'rose') }}">
                        <div class="kpi-label">ความถูกต้องเฉลี่ย</div>
                        <div class="kpi-value">{{ number_format((float) ($stats['avg_accuracy'] ?? 0), 1) }}%</div>
                        <div class="kpi-sub">{{ $accuracyTrend >= 0 ? '+' : '' }}{{ number_format($accuracyTrend, 1) }}% จากเดือนก่อน</div>
                    </div>
                </td>
                <td>
                    <div class="kpi-card">
                        <div class="kpi-label">เป้าหมาย</div>
                        <div class="kpi-value">{{ number_format((float) ($stats['target_accuracy'] ?? 90), 0) }}%</div>
                        <div class="kpi-sub">เกณฑ์ สรพ.</div>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <div class="section">
        <h2>2. ผลตามหมวดหมู่</h2>
        @forelse ([
            ['title' => 'ผู้ป่วยนอก (OPD)', 'rows' => $opdCats],
            ['title' => 'ผู้ป่วยใน (IPD)', 'rows' => $ipdCats],
            ['title' => 'หมวดอื่น', 'rows' => $otherCats],
        ] as $block)
            @if ($block['rows']->isNotEmpty())
                <div class="channel-banner {{ $block['title'] === 'ผู้ป่วยนอก (OPD)' ? 'emerald' : ($block['title'] === 'ผู้ป่วยใน (IPD)' ? 'violet' : '') }}">
                    <div class="name">{{ $block['title'] }}</div>
                </div>
                <table class="data">
                    <colgroup>
                        <col style="width:12%">
                        <col style="width:38%">
                        <col style="width:12%">
                        <col style="width:12%">
                        <col style="width:12%">
                        <col style="width:14%">
                    </colgroup>
                    <thead>
                        <tr>
                            <th>รหัส</th>
                            <th>หมวดหมู่</th>
                            <th class="center">ตรวจ</th>
                            <th class="center">ผ่าน</th>
                            <th class="center">ไม่ผ่าน</th>
                            <th class="num">ความถูกต้อง</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($block['rows'] as $cat)
                            <tr>
                                <td class="wrap">{{ $cat['code'] }}</td>
                                <td class="wrap">{{ $cat['name'] }}</td>
                                <td class="center">{{ $cat['pass_count'] + $cat['fail_count'] }}</td>
                                <td class="center">{{ $cat['pass_count'] }}</td>
                                <td class="center">{{ $cat['fail_count'] }}</td>
                                <td class="num {{ $accClass($cat['accuracy']) }}">{{ number_format((float) $cat['accuracy'], 1) }}%</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @endif
        @empty
            <div class="empty">ยังไม่มีข้อมูลหมวดหมู่</div>
        @endforelse
        @if ($opdCats->isEmpty() && $ipdCats->isEmpty() && $otherCats->isEmpty())
            <div class="empty">ยังไม่มีข้อมูลเพียงพอ</div>
        @endif
    </div>

    <div class="section">
        <h2>3. ข้อผิดพลาดที่พบบ่อย</h2>
        @if (collect($topErrors)->isEmpty())
            <div class="empty">ไม่พบข้อผิดพลาดที่พบบ่อย</div>
        @else
            <table class="data">
                <colgroup>
                    <col style="width:8%">
                    <col style="width:14%">
                    <col style="width:38%">
                    <col style="width:22%">
                    <col style="width:10%">
                    <col style="width:8%">
                </colgroup>
                <thead>
                    <tr>
                        <th class="center">#</th>
                        <th>รหัส</th>
                        <th>รายการ</th>
                        <th>หมวด</th>
                        <th class="center">ครั้ง</th>
                        <th class="num">สัดส่วน</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($topErrors as $i => $error)
                        <tr>
                            <td class="center">{{ $i + 1 }}</td>
                            <td class="wrap">{{ $error['criteria_code'] }}</td>
                            <td class="wrap">{{ $error['criteria_name'] }}</td>
                            <td class="wrap">{{ $error['category_name'] }}</td>
                            <td class="center">{{ $error['fail_count'] }}</td>
                            <td class="num">{{ number_format((float) ($error['percentage'] ?? 0), 1) }}%</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    </div>

    <div class="section">
        <h2>4. แนวโน้มรายเดือน</h2>
        @if (collect($monthlyTrends)->isEmpty())
            <div class="empty">ยังไม่มีข้อมูลรายเดือน</div>
        @else
            <table class="data">
                <colgroup>
                    <col style="width:25%">
                    <col style="width:25%">
                    <col style="width:25%">
                    <col style="width:25%">
                </colgroup>
                <thead>
                    <tr>
                        <th>เดือน</th>
                        <th class="center">จำนวนรายการ</th>
                        <th class="num">ความถูกต้อง</th>
                        <th class="center">เทียบเป้าหมาย {{ number_format((float) ($stats['target_accuracy'] ?? 90), 0) }}%</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($monthlyTrends as $trend)
                        <tr>
                            <td class="wrap">{{ $trend['month'] }}</td>
                            <td class="center">{{ $trend['total'] }}</td>
                            <td class="num {{ $accClass($trend['accuracy']) }}">{{ number_format((float) $trend['accuracy'], 1) }}%</td>
                            <td class="center">
                                @if ((float) $trend['accuracy'] >= (float) ($stats['target_accuracy'] ?? 90))
                                    <span class="badge badge-pass">ผ่านเป้าหมาย</span>
                                @else
                                    <span class="badge badge-fail">ต่ำกว่าเป้าหมาย</span>
                                @endif
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    </div>

    <div class="section">
        <h2>5. การตรวจสอบล่าสุด</h2>
        @if (collect($recentAudits)->isEmpty())
            <div class="empty">ยังไม่มีการตรวจสอบ</div>
        @else
            <table class="data">
                <colgroup>
                    <col style="width:14%">
                    <col style="width:24%">
                    <col style="width:16%">
                    <col style="width:14%">
                    <col style="width:12%">
                    <col style="width:20%">
                </colgroup>
                <thead>
                    <tr>
                        <th>HN</th>
                        <th>ชื่อผู้ป่วย</th>
                        <th>วันที่มา</th>
                        <th class="center">สถานะ</th>
                        <th class="num">ความถูกต้อง</th>
                        <th>ผู้ตรวจ</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($recentAudits as $audit)
                        <tr>
                            <td class="wrap">{{ $audit['hn'] }}</td>
                            <td class="wrap">{{ \App\Support\PiiMask::patientName($audit['patient_name'] ?? null) }}</td>
                            <td class="wrap">{{ $formatVisitDate($audit['visit_date']) }}</td>
                            <td class="center">{{ $statusLabel($audit['status'] ?? '') }}</td>
                            <td class="num {{ $accClass($audit['accuracy_percentage'] ?? 0) }}">
                                @if (($audit['status'] ?? '') === 'pending')
                                    —
                                @else
                                    {{ number_format((float) ($audit['accuracy_percentage'] ?? 0), 0) }}%
                                @endif
                            </td>
                            <td class="wrap">{{ $audit['auditor_name'] ?: '—' }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    </div>

    <table class="sign-row">
        <tr>
            <td>
                6. ผู้จัดทำ<br>
                <div class="sign-line">.........................................<br>(.........................................)</div>
            </td>
            <td>
                ผู้ตรวจสอบ<br>
                <div class="sign-line">.........................................<br>(.........................................)</div>
            </td>
            <td>
                ผู้อนุมัติ<br>
                <div class="sign-line">.........................................<br>(.........................................)</div>
            </td>
        </tr>
    </table>
</body>
</html>
