<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>{{ $reportTitle }}</title>
    <style>@include('quality-indicators.partials.pdf-styles')</style>
</head>
<body>
    <div class="page-header">
        <div class="hospital-name">{{ $hospitalName }}</div>
        <div class="hospital-sub">ศูนย์พัฒนาคุณภาพ · รายงานสรุปตัวชี้วัดคุณภาพ</div>
    </div>
    <div class="page-footer">
        {{ $hospitalName }} · {{ $reportTitle }} · พิมพ์เมื่อ {{ $generatedAt }}
    </div>

    @php
        $tocItems = [];
        $chapter = 0;
        foreach ($groups as $group) {
            $chapter++;
            $tocItems[] = [
                'level' => 1,
                'num' => (string) $chapter,
                'code' => '',
                'title' => $group['title'],
                'owner' => $group['subtitle'],
                'count' => $group['indicators']->count(),
            ];
            foreach ($group['indicators'] as $i => $row) {
                $tocItems[] = [
                    'level' => 2,
                    'num' => $chapter.'.'.($i + 1),
                    'code' => $row['indicator']->code ?: '—',
                    'title' => $row['indicator']->name,
                    'owner' => $group['title'],
                    'count' => null,
                ];
            }
        }
    @endphp

    <table class="hero">
        <tr>
            <td class="hero-left">
                <div class="eyebrow">รายงานสรุปตัวชี้วัดคุณภาพ</div>
                <h1>{{ $reportTitle }}</h1>
                <div class="hero-sub">{{ $hospitalName }} · {{ $groups->count() }} กลุ่ม · รวม {{ $groups->sum(fn ($g) => $g['indicators']->count()) }} ตัวชี้วัด</div>
            </td>
            <td class="hero-right">
                <div class="report-date">{{ $generatedAtDate }}</div>
                <div class="report-meta">สร้างเมื่อ {{ $generatedAt }}</div>
            </td>
        </tr>
    </table>

    <div class="section toc-wrap">
        <h2>สารบัญ</h2>
        <table class="toc">
            <thead>
                <tr>
                    <th class="num">ลำดับ</th>
                    <th class="code">รหัส</th>
                    <th>รายการ</th>
                    <th class="owner">กลุ่ม / หน่วยงาน</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($tocItems as $item)
                    <tr class="{{ $item['level'] === 1 ? 'toc-group' : '' }}">
                        <td class="num">{{ $item['num'] }}</td>
                        <td class="code wrap">{{ $item['level'] === 1 ? '—' : $item['code'] }}</td>
                        <td class="wrap">
                            {{ $item['title'] }}
                            @if ($item['level'] === 1)
                                <span style="font-weight:normal;color:#64748b"> · {{ $item['count'] }} ตัวชี้วัด</span>
                            @endif
                        </td>
                        <td class="owner wrap">{{ $item['owner'] }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
        <div class="toc-note">หมายเหตุ: รายละเอียดและประวัติการวัดผลของแต่ละตัวชี้วัดอยู่ในบทถัดไปตามลำดับสารบัญ</div>
    </div>

    @foreach ($groups as $gIndex => $group)
        <div class="section-break">
            <table class="hero">
                <tr>
                    <td class="hero-left">
                        <div class="eyebrow">บทที่ {{ $gIndex + 1 }} · รายงานสรุปตัวชี้วัดคุณภาพ</div>
                        <h1>{{ $group['title'] }}</h1>
                        <div class="hero-sub">{{ $group['subtitle'] }} · รวม {{ $group['indicators']->count() }} ตัวชี้วัด</div>
                    </td>
                    <td class="hero-right">
                        <div class="report-date">{{ $generatedAtDate }}</div>
                        <div class="report-meta">สร้างเมื่อ {{ $generatedAt }}</div>
                    </td>
                </tr>
            </table>

            <div class="group-banner">
                <div class="name">{{ $group['title'] }}</div>
                <div class="summary-line">
                    มีข้อมูล {{ $group['with_data'] }} ·
                    ผ่านเป้าหมาย {{ $group['pass_count'] }} ·
                    ไม่ผ่าน {{ $group['fail_count'] }} ·
                    ไม่มีข้อมูล {{ $group['no_data'] }}
                </div>
            </div>

            <div class="section">
                <h2>{{ $gIndex + 1 }}.1 ตารางสรุปตัวชี้วัด</h2>
                @if ($group['indicators']->isEmpty())
                    <div class="empty">ไม่พบตัวชี้วัดในกลุ่มนี้</div>
                @else
                    <table class="data">
                        <colgroup>
                            <col style="width:6%">
                            <col style="width:12%">
                            <col style="width:30%">
                            <col style="width:16%">
                            <col style="width:14%">
                            <col style="width:12%">
                            <col style="width:10%">
                        </colgroup>
                        <thead>
                            <tr>
                                <th class="center">#</th>
                                <th>รหัส</th>
                                <th>ชื่อตัวชี้วัด</th>
                                <th>เป้าหมาย</th>
                                <th class="num">ผลล่าสุด</th>
                                <th>งวดล่าสุด</th>
                                <th class="center">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($group['indicators'] as $i => $row)
                                <tr>
                                    <td class="center">{{ $i + 1 }}</td>
                                    <td class="wrap"><strong>{{ $row['indicator']->code ?: '-' }}</strong></td>
                                    <td class="wrap">
                                        {{ $row['indicator']->name }}
                                        @if ($row['indicator']->category)
                                            <div style="font-size:7.5px;color:#64748b;margin-top:1px">{{ $row['indicator']->category }}</div>
                                        @endif
                                    </td>
                                    <td class="wrap">
                                        {{ $row['indicator']->target_operator }}
                                        {{ $formatNum($row['indicator']->target_value) }}
                                        {{ $row['indicator']->unit }}
                                    </td>
                                    <td class="num wrap">
                                        @if ($row['latest'])
                                            <strong>{{ $formatNum($row['latest']->result_value) }}</strong>
                                            {{ $row['indicator']->unit }}
                                        @else
                                            -
                                        @endif
                                    </td>
                                    <td class="wrap">
                                        @if ($row['latest'])
                                            {{ $formatPeriod($row['latest']->period_date) }}
                                        @else
                                            -
                                        @endif
                                    </td>
                                    <td class="center">
                                        @if ($row['pass'] === null)
                                            <span class="badge badge-na">ไม่มีข้อมูล</span>
                                        @elseif ($row['pass'])
                                            <span class="badge badge-pass">ผ่าน</span>
                                        @else
                                            <span class="badge badge-fail">ไม่ผ่าน</span>
                                        @endif
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                @endif
            </div>

            <div class="section">
                <h2>{{ $gIndex + 1 }}.2 รายละเอียดและประวัติการวัดผล</h2>
                @forelse ($group['indicators'] as $i => $row)
                    @php $ind = $row['indicator']; @endphp
                    <div class="indicator-block">
                        <div class="indicator-head">
                            <span class="code">{{ $gIndex + 1 }}.{{ $i + 1 }} {{ $ind->code ?: '—' }}</span>
                            <span class="iname wrap">{{ $ind->name }}</span>
                            @if ($row['pass'] === null)
                                <span class="badge badge-na" style="float:right">ไม่มีข้อมูล</span>
                            @elseif ($row['pass'])
                                <span class="badge badge-pass" style="float:right">ผ่าน</span>
                            @else
                                <span class="badge badge-fail" style="float:right">ไม่ผ่าน</span>
                            @endif
                        </div>
                        <div class="indicator-body">
                            <div class="mini-meta">
                                เป้าหมาย: {{ $ind->target_operator }} {{ $formatNum($ind->target_value) }} {{ $ind->unit }}
                                · ความถี่: {{ $ind->frequency }}
                                @if ($ind->formula_description)
                                    · สูตร: {{ $ind->formula_description }}
                                @endif
                            </div>

                            @if ($row['entries']->isEmpty())
                                <div class="empty">ยังไม่มีข้อมูลการวัดผล</div>
                            @else
                                <table class="data">
                                    <colgroup>
                                        <col style="width:16%">
                                        <col style="width:14%">
                                        <col style="width:14%">
                                        <col style="width:18%">
                                        <col style="width:12%">
                                        <col style="width:26%">
                                    </colgroup>
                                    <thead>
                                        <tr>
                                            <th>งวด</th>
                                            <th class="num">ตัวตั้ง</th>
                                            <th class="num">ตัวหาร</th>
                                            <th class="num">ผลลัพธ์</th>
                                            <th class="center">สถานะ</th>
                                            <th>หมายเหตุ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @foreach ($row['entries'] as $entry)
                                            @php $p = $isPassFor($ind, $entry->result_value); @endphp
                                            <tr>
                                                <td class="wrap">{{ $formatPeriod($entry->period_date) }}</td>
                                                <td class="num wrap">{{ $formatNum($entry->numerator) }}</td>
                                                <td class="num wrap">{{ $formatNum($entry->denominator) }}</td>
                                                <td class="num wrap"><strong>{{ $formatNum($entry->result_value) }}</strong> {{ $ind->unit }}</td>
                                                <td class="center">
                                                    @if ($p)
                                                        <span class="badge badge-pass">ผ่าน</span>
                                                    @else
                                                        <span class="badge badge-fail">ไม่ผ่าน</span>
                                                    @endif
                                                </td>
                                                <td class="wrap">{{ $entry->notes ?: '-' }}</td>
                                            </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            @endif
                        </div>
                    </div>
                @empty
                    <div class="empty">ไม่พบตัวชี้วัด</div>
                @endforelse
            </div>

            <table class="sign-row">
                <tr>
                    <td>
                        ผู้จัดทำ<br>
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
        </div>
    @endforeach
</body>
</html>
