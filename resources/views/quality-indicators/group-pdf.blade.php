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
        <div class="hospital-sub">ศูนย์พัฒนาคุณภาพ · รายงานตัวชี้วัดคุณภาพ</div>
    </div>
    <div class="page-footer">
        {{ $hospitalName }} · {{ $reportTitle }} · พิมพ์เมื่อ {{ $generatedAt }}
    </div>

    @if ($groups->count() > 1)
        {{-- Cover / Multi-Group TOC --}}
        <table class="hero">
            <tr>
                <td class="hero-left">
                    <div class="eyebrow">รายงานสรุปตัวชี้วัดคุณภาพ</div>
                    <h1>{{ $reportTitle }}</h1>
                    <div class="hero-sub">{{ $hospitalName }} · รวม {{ $groups->count() }} กลุ่ม · {{ $groups->sum(fn ($g) => $g['indicators']->count()) }} ตัวชี้วัด</div>
                </td>
                <td class="hero-right">
                    <div class="report-date">{{ $generatedAtDate }}</div>
                    <div class="report-meta">สร้างเมื่อ {{ $generatedAt }}</div>
                </td>
            </tr>
        </table>

        <div class="section toc-wrap">
            <h2>สารบัญกลุ่มตัวชี้วัด</h2>
            <table class="toc">
                <thead>
                    <tr>
                        <th class="num">ลำดับ</th>
                        <th>กลุ่ม / หน่วยงาน</th>
                        <th class="owner">ประเภท</th>
                        <th class="num">จำนวน</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($groups as $gIndex => $grp)
                        <tr class="toc-group">
                            <td class="num">{{ $gIndex + 1 }}</td>
                            <td class="wrap"><strong>{{ $grp['title'] }}</strong></td>
                            <td class="owner wrap">{{ $grp['subtitle'] }}</td>
                            <td class="num">{{ $grp['indicators']->count() }} ตัวชี้วัด</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    @endif

    @foreach ($groups as $gIndex => $group)
        <div class="{{ $groups->count() > 1 ? 'section-break' : '' }}">
            <table class="hero">
                <tr>
                    <td class="hero-left">
                        <div class="eyebrow">
                            @if ($groups->count() > 1)
                                กลุ่มที่ {{ $gIndex + 1 }} ·
                            @endif
                            รายงานตัวชี้วัดคุณภาพ
                        </div>
                        <h1>{{ $group['title'] }}</h1>
                        <div class="hero-sub">{{ $group['subtitle'] }} · รวม {{ $group['indicators']->count() }} ตัวชี้วัด (ข้อมูลย้อนหลัง 5 ปี{{ ($type ?? '') === 'organization' ? '' : 'งบประมาณ' }})</div>
                    </td>
                    <td class="hero-right">
                        <div class="report-date">{{ $generatedAtDate }}</div>
                        <div class="report-meta">
                            มีข้อมูล {{ $group['with_data'] }} · ผ่าน {{ $group['pass_count'] }} · ไม่ผ่าน {{ $group['fail_count'] }} · ไม่มีข้อมูล {{ $group['no_data'] }}
                        </div>
                    </td>
                </tr>
            </table>

            @if ($group['categories']->isEmpty())
                <div class="empty">ไม่พบตัวชี้วัดในกลุ่มนี้</div>
            @else
                @foreach ($group['categories'] as $cat)
                    <div class="ha-table-wrap {{ $cat['indicators']->count() <= 10 ? 'keep-together' : '' }}">
                        <div class="ha-category-bar">
                            {{ $cat['name'] !== 'ตัวชี้วัดทั่วไป' ? $cat['name'] : ($groups->count() > 1 ? $group['title'] : 'ตัวชี้วัดคุณภาพ') }}
                        </div>
                        <table class="ha-table">
                            <thead>
                                <tr class="ha-header-row">
                                    <th class="col-code">รหัส</th>
                                    <th class="col-indicator">ชื่อตัวชี้วัด</th>
                                    <th class="col-target">เป้าหมาย</th>
                                    @foreach ($years as $yr)
                                        <th class="col-year">{!! $yearHeaders[$yr] !!}</th>
                                    @endforeach
                                    <th class="col-status">ประเมินผล</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($cat['indicators'] as $row)
                                    <tr>
                                        <td class="cell-code">{{ $row['code'] ?: '-' }}</td>
                                        <td class="cell-indicator">{{ $row['name'] }}</td>
                                        <td class="cell-target">{{ $row['target_display'] }}</td>
                                        @foreach ($years as $yr)
                                            <td class="cell-year">
                                                {{ $row['yearly_values'][$yr]['value'] }}
                                            </td>
                                        @endforeach
                                        <td class="cell-status">
                                            @if ($row['latest_status'] === true)
                                                <span class="status-badge status-pass">ผ่าน</span>
                                            @elseif ($row['latest_status'] === false)
                                                <span class="status-badge status-fail">ไม่ผ่าน</span>
                                            @else
                                                <span class="status-none">-</span>
                                            @endif
                                        </td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @endforeach
            @endif

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
