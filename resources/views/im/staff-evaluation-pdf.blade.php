<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>แบบประเมิน {{ $evaluation->staff_name }}</title>
    <style>@include('im.partials.evaluation-pdf-styles')</style>
</head>
<body>
    <div class="page-header">
        <div class="hospital-name">{{ $hospitalName }}</div>
        <div class="hospital-sub">งานสารสนเทศ (IM) · แบบประเมินเจ้าหน้าที่ IT รายบุคคล</div>
    </div>
    <div class="page-footer">
        {{ $hospitalName }} · {{ $evaluation->staff_name }} · พิมพ์เมื่อ {{ $generatedAt }}
    </div>

    @php
        $pct = (float) $evaluation->percent_score;
        $accClass = $pct >= 90 ? 'acc-high' : ($pct >= 80 ? 'acc-mid' : 'acc-low');
    @endphp

    <table class="hero">
        <tr>
            <td class="hero-left">
                <div class="eyebrow">แบบประเมินเจ้าหน้าที่ IT · รอบ 6 เดือน</div>
                <h1>{{ $evaluation->staff_name }}</h1>
                <div class="hero-sub">{{ $cycleLabel }} · ตามเกณฑ์ HA (สรพ.) และ HAIT</div>
            </td>
            <td class="hero-right">
                <div class="report-date">{{ $generatedAtDate }}</div>
                <div class="report-meta">สร้างเมื่อ {{ $generatedAt }}</div>
            </td>
        </tr>
    </table>

    <table class="kpi">
        <tr>
            <td>
                <div class="kpi-card">
                    <div class="kpi-label">ร้อยละ</div>
                    <div class="kpi-value {{ $accClass }}">{{ number_format($pct, 1) }}%</div>
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
                </div>
            </td>
        </tr>
    </table>

    @foreach ($groups as $groupTitle => $rows)
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
        <h2>ความเห็นโดยรวม</h2>
        <div class="comment">{{ $evaluation->overall_comment }}</div>
    @endif

    <table class="sign-row">
        <tr>
            <td>
                ผู้รับการประเมิน<br>
                <div class="sign-line">.........................................<br>( {{ $evaluation->staff_name }} )<br>วันที่ ............../............../..............</div>
            </td>
            <td>
                ผู้ตรวจการประเมิน<br>
                <div class="sign-line">.........................................<br>(.........................................)<br>ตำแหน่ง ................................<br>วันที่ ............../............../..............</div>
            </td>
            <td>
                หัวหน้างานสารสนเทศ<br>
                <div class="sign-line">.........................................<br>(.........................................)<br>ตำแหน่ง ................................<br>วันที่ ............../............../..............</div>
            </td>
        </tr>
    </table>
</body>
</html>
