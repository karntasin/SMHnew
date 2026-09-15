<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>รายงานประเมินเจ้าหน้าที่ IT วงรอบ {{ $cycleLabel }}</title>
    <style>@include('im.partials.evaluation-pdf-styles')</style>
</head>
<body>
    <div class="page-header">
        <div class="hospital-name">{{ $hospitalName }}</div>
        <div class="hospital-sub">งานสารสนเทศ (IM) · ประเมินเจ้าหน้าที่ IT ตามมาตรฐาน HA / HAIT</div>
    </div>
    <div class="page-footer">
        {{ $hospitalName }} · วงรอบ {{ $cycleLabel }} · พิมพ์เมื่อ {{ $generatedAt }}
    </div>

    @php
        $accClass = function ($pct) {
            $n = (float) $pct;
            return $n >= 90 ? 'acc-high' : ($n >= 80 ? 'acc-mid' : 'acc-low');
        };
    @endphp

    <table class="hero">
        <tr>
            <td class="hero-left">
                <div class="eyebrow">รายงานผลการประเมินเจ้าหน้าที่ IT</div>
                <h1>วงรอบ 6 เดือน</h1>
                <div class="hero-sub">{{ $cycleLabel }} · {{ $evaluations->count() }} ราย · เกณฑ์ HA (สรพ.) และ HAIT 7 หมวด</div>
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
                <tr><td class="num">1</td><td>สรุปผลทั้งวงรอบ</td></tr>
                @foreach ($blocks as $i => $block)
                    <tr>
                        <td class="num">{{ $i + 2 }}</td>
                        <td>ผลการประเมินรายบุคคล · {{ $block['evaluation']->staff_name }}</td>
                    </tr>
                @endforeach
                <tr><td class="num">{{ $blocks->count() + 2 }}</td><td>ลงนามผู้ตรวจการประเมิน</td></tr>
            </tbody>
        </table>
    </div>

    <h2>1. สรุปผลทั้งวงรอบ</h2>
    <table class="kpi">
        <tr>
            <td>
                <div class="kpi-card">
                    <div class="kpi-label">จำนวนผู้รับการประเมิน</div>
                    <div class="kpi-value">{{ $evaluations->count() }}</div>
                    <div class="kpi-sub">รอบ 6 เดือน</div>
                </div>
            </td>
            <td>
                <div class="kpi-card">
                    <div class="kpi-label">คะแนนเฉลี่ยวงรอบ</div>
                    <div class="kpi-value">{{ number_format((float) $evaluations->avg('percent_score'), 1) }}%</div>
                    <div class="kpi-sub">จากคะแนนเต็ม 100</div>
                </div>
            </td>
            <td>
                <div class="kpi-card">
                    <div class="kpi-label">ช่วงวันที่</div>
                    <div class="kpi-value" style="font-size:11px">{{ $fromDateLabel }} – {{ $toDateLabel }}</div>
                    <div class="kpi-sub">วันที่ประเมินใช้วันสิ้นรอบ</div>
                </div>
            </td>
        </tr>
    </table>

    <table class="data">
        <colgroup>
            <col style="width:8%">
            <col style="width:34%">
            <col style="width:16%">
            <col style="width:14%">
            <col style="width:14%">
            <col style="width:14%">
        </colgroup>
        <thead>
            <tr>
                <th class="center">ลำดับ</th>
                <th>ชื่อ-สกุล ผู้รับการประเมิน</th>
                <th class="center">วันที่ประเมิน</th>
                <th class="num">คะแนนได้</th>
                <th class="num">คะแนนเต็ม</th>
                <th class="num">ร้อยละ</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($evaluations as $i => $evaluation)
                <tr>
                    <td class="center">{{ $i + 1 }}</td>
                    <td class="wrap">{{ $evaluation->staff_name }}</td>
                    <td class="center wrap">{{ $formatDate($evaluation->evaluated_at) }}</td>
                    <td class="num">{{ number_format((float) $evaluation->total_score, 1) }}</td>
                    <td class="num">{{ number_format((float) $evaluation->max_total_score, 1) }}</td>
                    <td class="num {{ $accClass($evaluation->percent_score) }}">{{ number_format((float) $evaluation->percent_score, 1) }}%</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    @foreach ($blocks as $i => $block)
        @php $evaluation = $block['evaluation']; @endphp
        <div class="section-break">
            <h2>{{ $i + 2 }}. {{ $evaluation->staff_name }}</h2>
            <table class="kpi">
                <tr>
                    <td>
                        <div class="kpi-card">
                            <div class="kpi-label">ร้อยละ</div>
                            <div class="kpi-value {{ $accClass($evaluation->percent_score) }}">{{ number_format((float) $evaluation->percent_score, 1) }}%</div>
                        </div>
                    </td>
                    <td>
                        <div class="kpi-card">
                            <div class="kpi-label">คะแนนรวม</div>
                            <div class="kpi-value">{{ number_format((float) $evaluation->total_score, 1) }} / {{ number_format((float) $evaluation->max_total_score, 1) }}</div>
                        </div>
                    </td>
                    <td>
                        <div class="kpi-card">
                            <div class="kpi-label">ผู้ตรวจการประเมิน (ในระบบ)</div>
                            <div class="kpi-value" style="font-size:11px">{{ $evaluation->evaluator_name ?: '—' }}</div>
                            <div class="kpi-sub">ลงลายมือชื่อท้ายรายงาน</div>
                        </div>
                    </td>
                </tr>
            </table>

            @foreach ($block['groups'] as $groupTitle => $rows)
                <div class="group-banner"><div class="name">{{ $groupTitle }}</div></div>
                <table class="data">
                    <colgroup>
                        <col style="width:16%">
                        <col style="width:54%">
                        <col style="width:10%">
                        <col style="width:10%">
                        <col style="width:10%">
                    </colgroup>
                    <thead>
                        <tr>
                            <th>รหัส</th>
                            <th>หัวข้อย่อย / รายละเอียดที่ประเมิน</th>
                            <th class="center">ได้</th>
                            <th class="center">เต็ม</th>
                            <th>หมายเหตุ</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($rows as $row)
                            <tr>
                                <td class="wrap">{{ $row['code'] ?: '—' }}</td>
                                <td class="wrap">
                                    <strong>{{ $row['title'] }}</strong>
                                    @if ($row['description'])
                                        <div style="color:#64748b;font-size:7.5px;margin-top:1px">{{ $row['description'] }}</div>
                                    @endif
                                </td>
                                <td class="center">{{ number_format((float) $row['score'], 1) }}</td>
                                <td class="center">{{ $row['max_score'] }}</td>
                                <td class="wrap">{{ $row['note'] ?: '—' }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @endforeach

            @if ($evaluation->overall_comment)
                <h3>ความเห็นโดยรวม</h3>
                <div class="comment">{{ $evaluation->overall_comment }}</div>
            @endif

            <table class="sign-row">
                <tr>
                    <td>
                        ผู้รับการประเมิน<br>
                        <div class="sign-line">.........................................<br>( {{ $evaluation->staff_name }} )</div>
                    </td>
                    <td>
                        ผู้ตรวจการประเมิน<br>
                        <div class="sign-line">.........................................<br>(.........................................)<br>ตำแหน่ง ................................</div>
                    </td>
                    <td>
                        หัวหน้างานสารสนเทศ<br>
                        <div class="sign-line">.........................................<br>(.........................................)<br>ตำแหน่ง ................................</div>
                    </td>
                </tr>
            </table>
        </div>
    @endforeach

    <div class="section-break">
        <h2>{{ $blocks->count() + 2 }}. ลงนามผู้ตรวจการประเมินทั้งวงรอบ</h2>
        <p style="font-size:9.5px;color:#475569">ข้าพเจ้าได้ตรวจทานผลการประเมินเจ้าหน้าที่ IT ตามเกณฑ์ HA/HAIT ในวงรอบนี้ และรับรองว่าข้อมูลถูกต้องตามที่บันทึก</p>
        <table class="sign-row">
            <tr>
                <td>
                    ผู้จัดทำรายงาน<br>
                    <div class="sign-line">.........................................<br>(.........................................)<br>วันที่ ............../............../..............</div>
                </td>
                <td>
                    ผู้ตรวจการประเมิน<br>
                    <div class="sign-line">.........................................<br>(.........................................)<br>วันที่ ............../............../..............</div>
                </td>
                <td>
                    ผู้อนุมัติ<br>
                    <div class="sign-line">.........................................<br>(.........................................)<br>วันที่ ............../............../..............</div>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
