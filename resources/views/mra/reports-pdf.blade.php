<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>รายงานสรุปผลการตรวจ MRA</title>
    <style>@include('mra.partials.overview-pdf-styles')</style>
</head>
<body>
    <div class="page-header">
        <div class="hospital-name">{{ $hospitalName }}</div>
        <div class="hospital-sub">ศูนย์พัฒนาคุณภาพ · รายงานสรุปผลการตรวจสอบคุณภาพเวชระเบียน</div>
    </div>
    <div class="page-footer">
        {{ $hospitalName }} · รายงานสรุป MRA · พิมพ์เมื่อ {{ $generatedAt }}
    </div>

    @php
        $channel = $filters['channel'] ?? 'all';
        $showOpd = in_array($channel, ['all', 'opd'], true);
        $showIpd = in_array($channel, ['all', 'ipd'], true);
        $accClass = function ($v) {
            $n = (float) $v;
            return $n >= 80 ? 'acc-high' : ($n >= 70 ? 'acc-mid' : 'acc-low');
        };
        $toc = [];
        $n = 1;
        $toc[] = ['num' => (string) $n++, 'title' => 'สรุปภาพรวม · '.$channelLabel];
        if ($showOpd) {
            $toc[] = ['num' => (string) $n++, 'title' => 'ผู้ป่วยนอก (OPD)'];
        }
        if ($showIpd) {
            $toc[] = ['num' => (string) $n++, 'title' => 'ผู้ป่วยใน (IPD)'];
        }
        $toc[] = ['num' => (string) $n, 'title' => 'ลงนาม'];
    @endphp

    <table class="hero">
        <tr>
            <td class="hero-left">
                <div class="eyebrow">รายงานสรุปผลการตรวจสอบเวชระเบียน</div>
                <h1>รายงานสรุป MRA</h1>
                <div class="hero-sub">{{ $channelLabel }} · {{ $fromDateLabel }} – {{ $toDateLabel }}</div>
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
                @foreach ($toc as $item)
                    <tr>
                        <td class="num">{{ $item['num'] }}</td>
                        <td>{{ $item['title'] }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>1. สรุปภาพรวม</h2>
        <table class="kpi">
            <tr>
                <td>
                    <div class="kpi-card">
                        <div class="kpi-label">ตรวจสอบทั้งหมด</div>
                        <div class="kpi-value">{{ number_format($stats['total_audits'] ?? 0) }}</div>
                        <div class="kpi-sub">{{ $channelLabel }}</div>
                    </div>
                </td>
                <td>
                    <div class="kpi-card emerald">
                        <div class="kpi-label">ตรวจเสร็จสิ้น</div>
                        <div class="kpi-value">{{ number_format($stats['completed_audits'] ?? 0) }}</div>
                    </div>
                </td>
                <td>
                    <div class="kpi-card {{ ($stats['avg_accuracy'] ?? 0) >= 80 ? 'emerald' : (($stats['avg_accuracy'] ?? 0) >= 70 ? 'amber' : 'rose') }}">
                        <div class="kpi-label">ความถูกต้องเฉลี่ย</div>
                        <div class="kpi-value">{{ number_format((float) ($stats['avg_accuracy'] ?? 0), 1) }}%</div>
                    </div>
                </td>
                <td>
                    <div class="kpi-card">
                        <div class="kpi-label">เป้าหมายผ่าน</div>
                        <div class="kpi-value">{{ number_format((float) ($stats['target'] ?? 80), 0) }}%</div>
                    </div>
                </td>
                <td>
                    <div class="kpi-card emerald">
                        <div class="kpi-label">ผ่านเกณฑ์ ≥{{ number_format((float) ($stats['target'] ?? 80), 0) }}%</div>
                        <div class="kpi-value">{{ number_format($stats['passed_audits'] ?? 0) }}</div>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    @php $chapter = 1; @endphp

    @foreach ([
        ['key' => 'opd', 'show' => $showOpd, 'title' => 'ผู้ป่วยนอก (OPD)', 'tone' => 'emerald', 'block' => $opd],
        ['key' => 'ipd', 'show' => $showIpd, 'title' => 'ผู้ป่วยใน (IPD)', 'tone' => 'violet', 'block' => $ipd],
    ] as $channelBlock)
        @if ($channelBlock['show'])
            @php $chapter++; @endphp
            <div class="{{ $chapter === 2 && $showOpd && $showIpd ? '' : '' }} section">
                <h2>{{ $chapter }}. {{ $channelBlock['title'] }}</h2>
                <div class="channel-banner {{ $channelBlock['tone'] }}">
                    <div class="name">{{ $channelBlock['title'] }}</div>
                    <div style="font-size:9px;color:#475569;margin-top:2px">
                        ตรวจเสร็จ {{ number_format($channelBlock['block']['stats']['completed_audits'] ?? 0) }} ราย
                        · ความถูกต้องเฉลี่ย {{ number_format((float) ($channelBlock['block']['stats']['avg_accuracy'] ?? 0), 1) }}%
                        · ผ่านเกณฑ์ {{ number_format($channelBlock['block']['stats']['passed_audits'] ?? 0) }} ราย
                    </div>
                </div>

                <h2 style="font-size:10.5px;border-left-color:#94a3b8">{{ $chapter }}.1 ผลตามหมวด</h2>
                @if (collect($channelBlock['block']['categoryStats'])->isEmpty())
                    <div class="empty">ยังไม่มีข้อมูลหมวดในช่วงที่เลือก</div>
                @else
                    <table class="data">
                        <colgroup>
                            <col style="width:12%">
                            <col style="width:40%">
                            <col style="width:12%">
                            <col style="width:12%">
                            <col style="width:12%">
                            <col style="width:12%">
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
                            @foreach ($channelBlock['block']['categoryStats'] as $cat)
                                <tr>
                                    <td class="wrap">{{ $cat['code'] }}</td>
                                    <td class="wrap">{{ $cat['name'] }}</td>
                                    <td class="center">{{ $cat['total'] }}</td>
                                    <td class="center">{{ $cat['passed'] }}</td>
                                    <td class="center">{{ $cat['failed'] }}</td>
                                    <td class="num {{ $accClass($cat['accuracy']) }}">{{ number_format((float) $cat['accuracy'], 1) }}%</td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                @endif

                <h2 style="font-size:10.5px;border-left-color:#94a3b8">{{ $chapter }}.2 ข้อผิดพลาดที่พบบ่อย</h2>
                @if (collect($channelBlock['block']['topErrors'])->isEmpty())
                    <div class="empty">ไม่พบข้อผิดพลาดในช่วงเวลาที่เลือก</div>
                @else
                    <table class="data">
                        <colgroup>
                            <col style="width:8%">
                            <col style="width:16%">
                            <col style="width:46%">
                            <col style="width:20%">
                            <col style="width:10%">
                        </colgroup>
                        <thead>
                            <tr>
                                <th class="center">#</th>
                                <th>รหัส</th>
                                <th>รายการ</th>
                                <th>หมวด</th>
                                <th class="center">ครั้ง</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($channelBlock['block']['topErrors'] as $i => $error)
                                <tr>
                                    <td class="center">{{ $i + 1 }}</td>
                                    <td class="wrap">{{ $error['criteria_code'] }}</td>
                                    <td class="wrap">{{ $error['criteria_name'] }}</td>
                                    <td class="wrap">{{ $error['category_name'] }}</td>
                                    <td class="center">{{ $error['fail_count'] }}</td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                @endif
            </div>
        @endif
    @endforeach

    <table class="sign-row">
        <tr>
            <td>
                {{ $chapter + 1 }}. ผู้จัดทำ<br>
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
