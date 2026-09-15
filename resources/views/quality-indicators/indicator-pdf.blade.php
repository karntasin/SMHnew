<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>รายงานตัวชี้วัด {{ $indicator->code }}</title>
    <style>@include('quality-indicators.partials.pdf-styles')</style>
</head>
<body>
    <div class="page-header">
        <div class="hospital-name">{{ $hospitalName }}</div>
        <div class="hospital-sub">ศูนย์พัฒนาคุณภาพ · รายงานตัวชี้วัดคุณภาพ</div>
    </div>
    <div class="page-footer">
        {{ $hospitalName }} · ตัวชี้วัด {{ $indicator->code }} · พิมพ์เมื่อ {{ $generatedAt }}
    </div>

    <table class="hero">
        <tr>
            <td class="hero-left">
                <div class="eyebrow">รายงานตัวชี้วัดคุณภาพ</div>
                <h1>{{ $indicator->code }}: {{ $indicator->name }}</h1>
                <div class="hero-sub">{{ $ownerLabel }} · หน่วย: {{ $indicator->unit }} · ความถี่: {{ $indicator->frequency }}</div>
            </td>
            <td class="hero-right">
                <div class="report-date">{{ $generatedAtDate }}</div>
                <div class="report-meta">สร้างเมื่อ {{ $generatedAt }}</div>
            </td>
        </tr>
    </table>

    <div class="mini-toc">
        <div class="title">สารบัญ</div>
        <ol>
            <li>สรุปสถานะ</li>
            <li>รายละเอียดตัวชี้วัด</li>
            <li>ตารางผลการวัดผล ({{ $entries->count() }} งวด)</li>
            <li>ลงนาม</li>
        </ol>
    </div>

    <div class="section">
        <h2>1. สรุปสถานะ</h2>
        <table class="meta-grid">
            <tr>
                <td>
                    <div class="card">
                        <div class="card-label">เป้าหมาย</div>
                        <div class="card-value">{{ $indicator->target_operator }} {{ $formatNum($indicator->target_value) }}</div>
                        <div class="card-sub">{{ $indicator->unit }}</div>
                    </div>
                </td>
                <td>
                    <div class="card">
                        <div class="card-label">ผลล่าสุด</div>
                        <div class="card-value">
                            @if ($latest)
                                {{ $formatNum($latest->result_value) }}
                            @else
                                -
                            @endif
                        </div>
                        <div class="card-sub">
                            @if ($latest)
                                {{ $formatPeriod($latest->period_date) }}
                            @else
                                ยังไม่มีข้อมูล
                            @endif
                        </div>
                    </div>
                </td>
                <td>
                    <div class="card">
                        <div class="card-label">ผลการประเมิน</div>
                        <div class="card-value">
                            @if ($latestPass === null)
                                <span class="badge badge-na">ไม่มีข้อมูล</span>
                            @elseif ($latestPass)
                                <span class="badge badge-pass">ผ่าน</span>
                            @else
                                <span class="badge badge-fail">ไม่ผ่าน</span>
                            @endif
                        </div>
                        <div class="card-sub">เทียบกับเป้าหมาย</div>
                    </div>
                </td>
                <td>
                    <div class="card">
                        <div class="card-label">จำนวนงวด</div>
                        <div class="card-value">{{ $entries->count() }}</div>
                        <div class="card-sub">ผ่าน {{ $passCount }} · ไม่ผ่าน {{ $failCount }}</div>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="panel">
            <div class="panel-title">2. รายละเอียดตัวชี้วัด</div>
            <table class="data">
                <colgroup>
                    <col style="width:22%">
                    <col style="width:28%">
                    <col style="width:22%">
                    <col style="width:28%">
                </colgroup>
                <tr>
                    <th>หมวดหมู่</th>
                    <td class="wrap">{{ $indicator->category ?: '-' }}</td>
                    <th>ระดับ</th>
                    <td class="wrap">{{ $typeLabel }}</td>
                </tr>
                <tr>
                    <th>หน่วยงาน/ทีม</th>
                    <td colspan="3" class="wrap">{{ $ownerLabel }}</td>
                </tr>
                <tr>
                    <th>คำอธิบาย</th>
                    <td colspan="3" class="wrap">{{ $indicator->description ?: '-' }}</td>
                </tr>
                <tr>
                    <th>สูตรการคำนวณ</th>
                    <td colspan="3" class="wrap">{{ $indicator->formula_description ?: '-' }}</td>
                </tr>
            </table>
        </div>
    </div>

    <div class="section">
        <h2>3. ตารางผลการวัดผล</h2>
        @if ($entries->isEmpty())
            <div class="empty">ยังไม่มีข้อมูลการวัดผล</div>
        @else
            <table class="data">
                <colgroup>
                    <col style="width:8%">
                    <col style="width:14%">
                    <col style="width:14%">
                    <col style="width:14%">
                    <col style="width:16%">
                    <col style="width:12%">
                    <col style="width:22%">
                </colgroup>
                <thead>
                    <tr>
                        <th class="center">ลำดับ</th>
                        <th>งวด</th>
                        <th class="num">ตัวตั้ง</th>
                        <th class="num">ตัวหาร</th>
                        <th class="num">ผลลัพธ์ ({{ $indicator->unit }})</th>
                        <th class="center">สถานะ</th>
                        <th>หมายเหตุ</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($entries as $i => $entry)
                        @php $pass = $isPass($entry->result_value); @endphp
                        <tr>
                            <td class="center">{{ $i + 1 }}</td>
                            <td class="wrap">{{ $formatPeriod($entry->period_date) }}</td>
                            <td class="num wrap">{{ $formatNum($entry->numerator) }}</td>
                            <td class="num wrap">{{ $formatNum($entry->denominator) }}</td>
                            <td class="num wrap"><strong>{{ $formatNum($entry->result_value) }}</strong></td>
                            <td class="center">
                                @if ($pass)
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

    <table class="sign-row">
        <tr>
            <td>
                4. ผู้จัดทำ<br>
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
