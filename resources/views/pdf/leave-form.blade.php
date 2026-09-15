<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>{{ $meta['title'] }} {{ $leave->request_number }}</title>
    <style>
        @font-face {
            font-family: 'thsarabunnew';
            font-style: normal;
            font-weight: normal;
            src: url('{{ $fontRegularUri }}') format('truetype');
        }
        @font-face {
            font-family: 'thsarabunnew';
            font-style: normal;
            font-weight: bold;
            src: url('{{ $fontBoldUri }}') format('truetype');
        }
        @page { margin: 25mm 20mm 25mm 30mm; }
        * { box-sizing: border-box; font-family: 'thsarabunnew', 'sarabun', DejaVu Sans, sans-serif; }
        body {
            margin: 0;
            padding: 0;
            color: #000;
            font-size: 16pt;
            line-height: 22pt;
        }
        table { border-collapse: collapse; font-size: 16pt; line-height: 22pt; width: 100%; }
        p { margin: 0; padding: 0; max-width: 100%; word-wrap: break-word; }
        .code { width: 100%; margin: 0; }
        .code td { vertical-align: top; font-size: 16pt; line-height: 22pt; }
        .code .left { width: 62%; }
        .code .right { width: 38%; text-align: right; }
        .title {
            text-align: center;
            font-size: 16pt;
            font-weight: bold;
            line-height: 22pt;
            margin: 22pt 0 0;
        }
        .head { width: 100%; margin-top: 22pt; }
        .head td { vertical-align: bottom; padding: 0; font-size: 16pt; line-height: 22pt; }
        .subject { margin-top: 22pt; }
        .field { margin-top: 6pt; }
        .lbl { font-weight: bold; }
        .dot {
            border-bottom: 0.5pt dotted #000;
            padding: 0 3pt 1pt;
        }
        .body {
            text-align: justify;
            margin-top: 6pt;
            text-indent: 25mm;
        }
        .close {
            text-indent: 25mm;
            margin-top: 22pt;
        }
        .sig-wrap { width: 100%; margin-top: 44pt; }
        .sig-wrap td { width: 50%; vertical-align: top; text-align: center; font-size: 16pt; line-height: 22pt; }
        .sig-check { margin-top: 16pt; }
        .stat {
            border: 0.75pt solid #000;
            padding: 6pt 8pt;
            margin-top: 16pt;
        }
        .stat-title {
            text-align: center;
            font-weight: bold;
            margin-bottom: 6pt;
        }
        .stat p { margin-top: 6pt; }
        .stat p:first-of-type { margin-top: 0; }
        table.route { width: 100%; margin-top: 12pt; }
        table.route th, table.route td {
            border: 0.75pt solid #000;
            padding: 4pt 6pt;
            vertical-align: top;
            font-size: 16pt;
            line-height: 22pt;
        }
        table.route th { font-weight: bold; text-align: center; }
        .center { text-align: center; }
        .muted { font-size: 16pt; }
        .note { margin-top: 12pt; text-align: justify; }
        .footer { margin-top: 8pt; }
        .footer-line { width: 100%; }
        .footer-line td { font-size: 16pt; line-height: 22pt; vertical-align: top; }
        .footer-line .right { text-align: right; width: 42%; }
    </style>
</head>
<body>
@php
    $d = $form->dateParts(\Carbon\Carbon::parse($leave->submitted_at ?? $leave->created_at));
    $sd = $form->dateParts($leave->start_date);
    $ed = $form->dateParts($leave->end_date);
    $rd = $form->dateParts($leave->return_date ?: ($leave->end_date?->copy()->addDay()));
    $code = $leave->leaveType->code ?? '';
    $name = $leave->user->name ?? '';
    $position = $leave->user->position ?: '';
    $dept = $leave->user->department?->name ?? '';
    $days = $form->thaiDigits(rtrim(rtrim(number_format((float) $leave->total_days, 1, '.', ''), '0'), '.'));
    $written = $leave->written_at ?: ($dept ?: config('app.name'));
    $addressee = $leave->addressee ?: 'ผู้อำนวยการ';
    $reason = $leave->reason ?: '';
    $place = $leave->contact_address ?: '';
    $dest = $leave->destination ?: $leave->contact_address ?: '';
    $phone = $leave->contact_phone ?: '';
    $working = (bool) ($leave->leaveType->counts_working_days ?? false);
    $dayUnit = $working ? 'วันทำการ' : 'วัน';
    $blank = function (?string $value, int $pad = 18) {
        $value = trim((string) $value);
        if ($value === '') {
            return str_repeat('&nbsp;', $pad);
        }
        return e($value);
    };
@endphp

<table class="code">
    <tr>
        <td class="left">เลขที่ {{ $leave->request_number }}</td>
        <td class="right">
            {{ $meta['form_code'] }}<br>
            {{ $meta['form_number'] }}
        </td>
    </tr>
</table>

<div class="title">{{ $meta['title'] }}</div>

<table class="head">
    <tr>
        <td style="width: 52%;">เขียนที่&nbsp;&nbsp;<span class="dot">{!! $blank($written, 28) !!}</span></td>
        <td>วันที่&nbsp;&nbsp;<span class="dot">{{ $d['day'] }}</span>
            เดือน&nbsp;&nbsp;<span class="dot">{{ $d['month'] }}</span>
            พ.ศ.&nbsp;&nbsp;<span class="dot">{{ $d['year'] }}</span>
        </td>
    </tr>
</table>

<p class="subject"><span class="lbl">เรื่อง</span>&nbsp;&nbsp;{{ $meta['subject'] }}</p>
<p class="field"><span class="lbl">เรียน</span>&nbsp;&nbsp;<span class="dot">{!! $blank($addressee, 24) !!}</span></p>

@if($code === 'SICK')
    <p class="body">ด้วยกระผม/ดิฉัน <span class="dot">{!! $blank($name, 22) !!}</span>
        ตำแหน่ง <span class="dot">{!! $blank($position, 18) !!}</span>
        @if($dept) สังกัด <span class="dot">{{ $dept }}</span> @endif
        ป่วยเป็น <span class="dot">{!! $blank($reason, 20) !!}</span>
        จึงขอลาป่วยเพื่อรักษาตัว มีกำหนด <span class="dot">{{ $days }}</span> วัน
        ตั้งแต่วันที่ <span class="dot">{{ $sd['day'] }}</span> เดือน <span class="dot">{{ $sd['month'] }}</span> พ.ศ. <span class="dot">{{ $sd['year'] }}</span>
        จนถึงวันที่ <span class="dot">{{ $ed['day'] }}</span> เดือน <span class="dot">{{ $ed['month'] }}</span> พ.ศ. <span class="dot">{{ $ed['year'] }}</span>
    </p>
    <p class="body">ในระหว่างลาป่วยนี้ได้รักษาตัวอยู่ที่ <span class="dot">{!! $blank($place, 30) !!}</span>
        @if($phone) โทรศัพท์ <span class="dot">{{ $phone }}</span> @endif
    </p>
    <p class="body">กระผม/ดิฉัน ได้ลาป่วยอยู่เดิมแล้วในคราวเดียวกันนี้ <span class="dot">{{ $form->thaiDigits(0) }}</span> ครั้ง
        รวม <span class="dot">{{ $form->thaiDigits(0) }}</span> วัน
    </p>
@elseif($code === 'MATERNITY')
    <p class="body">ดิฉัน <span class="dot">{!! $blank($name, 22) !!}</span>
        ตำแหน่ง <span class="dot">{!! $blank($position, 18) !!}</span>
        ขอลาคลอดบุตร มีกำหนด <span class="dot">{{ $days }}</span> วัน
        ตั้งแต่วันที่ <span class="dot">{{ $sd['day'] }}</span> เดือน <span class="dot">{{ $sd['month'] }}</span> พ.ศ. <span class="dot">{{ $sd['year'] }}</span>
        จนถึงวันที่ <span class="dot">{{ $ed['day'] }}</span> เดือน <span class="dot">{{ $ed['month'] }}</span> พ.ศ. <span class="dot">{{ $ed['year'] }}</span>
    </p>
    <p class="body">ในระหว่างลานี้ได้รักษาตัวอยู่ที่ <span class="dot">{!! $blank($place, 30) !!}</span></p>
    <p class="body">ดิฉัน ได้ลาคลอดบุตรอยู่เดิมแล้วในคราวเดียวกันนี้ <span class="dot">{{ $form->thaiDigits(0) }}</span> ครั้ง
        รวม <span class="dot">{{ $form->thaiDigits(0) }}</span> วัน
    </p>
@elseif($code === 'VACATION')
    <p class="body">กระผม/ดิฉัน <span class="dot">{!! $blank($name, 22) !!}</span>
        ตำแหน่ง <span class="dot">{!! $blank($position, 18) !!}</span>
        ขออนุญาตลาหยุดราชการเพื่อพักผ่อนประจำปี มีกำหนด <span class="dot">{{ $days }}</span> วันทำการ
        ตั้งแต่วันที่ <span class="dot">{{ $sd['day'] }}</span> เดือน <span class="dot">{{ $sd['month'] }}</span> พ.ศ. <span class="dot">{{ $sd['year'] }}</span>
        จนถึงวันที่ <span class="dot">{{ $ed['day'] }}</span> เดือน <span class="dot">{{ $ed['month'] }}</span> พ.ศ. <span class="dot">{{ $ed['year'] }}</span>
    </p>
    <p class="body">ในระหว่างลานี้ กระผม/ดิฉัน จะไปที่จังหวัด <span class="dot">{!! $blank($dest, 20) !!}</span>
        ในวันที่ <span class="dot">{{ $sd['day'] }}</span> เดือน <span class="dot">{{ $sd['month'] }}</span> พ.ศ. <span class="dot">{{ $sd['year'] }}</span>
        และจะกลับในวันที่ <span class="dot">{{ $rd['day'] }}</span> เดือน <span class="dot">{{ $rd['month'] }}</span> พ.ศ. <span class="dot">{{ $rd['year'] }}</span>
    </p>
@elseif($code === 'PATERNITY')
    <p class="body">ด้วยกระผม/ดิฉัน <span class="dot">{!! $blank($name, 22) !!}</span>
        ตำแหน่ง <span class="dot">{!! $blank($position, 18) !!}</span>
        มีความประสงค์ขอลาไปช่วยเหลือภริยาที่คลอดบุตร <span class="dot">{!! $blank($reason, 18) !!}</span>
        มีกำหนด <span class="dot">{{ $days }}</span> วันทำการ
        ตั้งแต่วันที่ <span class="dot">{{ $sd['day'] }}</span> เดือน <span class="dot">{{ $sd['month'] }}</span> พ.ศ. <span class="dot">{{ $sd['year'] }}</span>
        จนถึงวันที่ <span class="dot">{{ $ed['day'] }}</span> เดือน <span class="dot">{{ $ed['month'] }}</span> พ.ศ. <span class="dot">{{ $ed['year'] }}</span>
    </p>
    <p class="body">ในระหว่างลานี้จะติดต่อได้ที่ <span class="dot">{!! $blank($place, 28) !!}</span></p>
@elseif($code === 'ORDINATION')
    <p class="body">กระผม <span class="dot">{!! $blank($name, 22) !!}</span>
        ตำแหน่ง <span class="dot">{!! $blank($position, 16) !!}</span>
        @if($dept) สังกัด <span class="dot">{{ $dept }}</span> @endif
        มีความศรัทธาจะอุปสมบทในพระพุทธศาสนา ณ <span class="dot">{!! $blank($dest, 18) !!}</span>
        จึงขอลาจากหน้าที่ราชการ มีกำหนด <span class="dot">{{ $days }}</span> วัน
        ตั้งแต่วันที่ <span class="dot">{{ $sd['day'] }}</span> เดือน <span class="dot">{{ $sd['month'] }}</span> พ.ศ. <span class="dot">{{ $sd['year'] }}</span>
        จนถึงวันที่ <span class="dot">{{ $ed['day'] }}</span> เดือน <span class="dot">{{ $ed['month'] }}</span> พ.ศ. <span class="dot">{{ $ed['year'] }}</span>
        เมื่อลาสิกขาแล้วจะรายงานเพื่อทราบ และเข้าปฏิบัติราชการภายใน ๕ วัน นับแต่วันลาสิกขา
    </p>
    @if($reason)
        <p class="body">รายละเอียดเพิ่มเติม <span class="dot">{{ $reason }}</span></p>
    @endif
@elseif($code === 'HAJJ')
    <p class="body">กระผม/ดิฉัน <span class="dot">{!! $blank($name, 22) !!}</span>
        ตำแหน่ง <span class="dot">{!! $blank($position, 16) !!}</span>
        มีความศรัทธาจะไปประกอบพิธีฮัจย์ ณ เมืองเมกกะ ราชอาณาจักรซาอุดีอาระเบีย
        จึงขออนุญาตลาหยุดราชการ มีกำหนด <span class="dot">{{ $days }}</span> วัน
        ตั้งแต่วันที่ <span class="dot">{{ $sd['day'] }}</span> เดือน <span class="dot">{{ $sd['month'] }}</span> พ.ศ. <span class="dot">{{ $sd['year'] }}</span>
        ถึงวันที่ <span class="dot">{{ $ed['day'] }}</span> เดือน <span class="dot">{{ $ed['month'] }}</span> พ.ศ. <span class="dot">{{ $ed['year'] }}</span>
        เมื่อเดินทางกลับถึงประเทศไทยแล้วจะรายงานให้ทราบ และเข้าปฏิบัติราชการภายใน ๕ วัน
    </p>
@else
    <p class="body">ด้วยกระผม/ดิฉัน <span class="dot">{!! $blank($name, 22) !!}</span>
        ตำแหน่ง <span class="dot">{!! $blank($position, 16) !!}</span>
        ขออนุญาตลาหยุดราชการเพื่อ <span class="dot">{!! $blank($reason, 22) !!}</span>
        มีกำหนด <span class="dot">{{ $days }}</span> {{ $dayUnit }}
        ตั้งแต่วันที่ <span class="dot">{{ $sd['day'] }}</span> เดือน <span class="dot">{{ $sd['month'] }}</span> พ.ศ. <span class="dot">{{ $sd['year'] }}</span>
        จนถึงวันที่ <span class="dot">{{ $ed['day'] }}</span> เดือน <span class="dot">{{ $ed['month'] }}</span> พ.ศ. <span class="dot">{{ $ed['year'] }}</span>
    </p>
    <p class="body">ในระหว่างลานี้ กระผม/ดิฉัน จะไปที่ <span class="dot">{!! $blank($dest, 24) !!}</span>
        ในวันที่ <span class="dot">{{ $sd['day'] }}</span> เดือน <span class="dot">{{ $sd['month'] }}</span> พ.ศ. <span class="dot">{{ $sd['year'] }}</span>
        และจะกลับในวันที่ <span class="dot">{{ $rd['day'] }}</span> เดือน <span class="dot">{{ $rd['month'] }}</span> พ.ศ. <span class="dot">{{ $rd['year'] }}</span>
        @if($phone) โทรศัพท์ <span class="dot">{{ $phone }}</span> @endif
    </p>
    <p class="body">กระผม/ดิฉัน ได้ลาอยู่เดิมแล้วในคราวเดียวกันนี้ <span class="dot">{{ $form->thaiDigits(0) }}</span> ครั้ง
        รวม <span class="dot">{{ $form->thaiDigits(0) }}</span> วัน
    </p>
@endif

@if($leave->delegate_name)
    <p class="body">ในระหว่างลา มอบหมายให้ <span class="dot">{{ $leave->delegate_name }}</span> ปฏิบัติราชการแทน</p>
@endif

<p class="close">ควรมิควรแล้วแต่จะกรุณา</p>

<table class="sig-wrap">
    <tr>
        <td></td>
        <td>
            (ลงชื่อ) ....................................<br>
            ( {{ $name ?: '................................' }} )<br>
            ตำแหน่ง {{ $position ?: '................................' }}
        </td>
    </tr>
</table>

<div class="stat">
    <div class="stat-title">สำหรับเจ้าหน้าที่ตรวจสอบ</div>
    @if($code === 'VACATION')
        <p>ในปีงบประมาณที่แล้ว ตั้งแต่ ๑ ต.ค. ถึง ๓๐ ก.ย. ได้ลาพักผ่อนประจำปีรวม
            <span class="dot">{{ $form->thaiDigits($stats['vacation_used'] ?? 0) }}</span> วันทำการ
        </p>
        <p>ในปีงบประมาณนี้ พ.ศ. {{ $form->thaiDigits($stats['fiscal_year_be']) }}
            <span class="dot">{{ $name }}</span> ได้ลาพักผ่อนประจำปีมาแล้ว
            <span class="dot">{{ $form->thaiDigits($stats['same_days']) }}</span> วันทำการ
            ทั้งครั้งนี้รวมเป็น <span class="dot">{{ $form->thaiDigits($stats['same_days_with_this']) }}</span> วันทำการ
        </p>
    @elseif($code === 'SICK')
        <p>ในปีงบประมาณนี้ พ.ศ. {{ $form->thaiDigits($stats['fiscal_year_be']) }}
            <span class="dot">{{ $name }}</span> ได้ลาป่วย <span class="dot">{{ $form->thaiDigits($stats['same_count']) }}</span> ครั้ง
            รวม <span class="dot">{{ $form->thaiDigits($stats['same_days_with_this']) }}</span> วัน
            ทั้งครั้งนี้รวมเป็น <span class="dot">{{ $form->thaiDigits($stats['same_days_with_this']) }}</span> วัน
        </p>
        <p>ในปีงบประมาณนี้ ผู้นี้เคยลากิจมาแล้ว <span class="dot">{{ $form->thaiDigits($stats['personal_count']) }}</span> ครั้ง
            รวม <span class="dot">{{ $form->thaiDigits($stats['personal_days']) }}</span> วันทำการ
        </p>
    @else
        <p>ในปีงบประมาณนี้ พ.ศ. {{ $form->thaiDigits($stats['fiscal_year_be']) }}
            <span class="dot">{{ $name }}</span> ได้{{ $leave->leaveType->name }}
            <span class="dot">{{ $form->thaiDigits($stats['same_count']) }}</span> ครั้ง
            รวม <span class="dot">{{ $form->thaiDigits($stats['same_days_with_this']) }}</span> {{ $dayUnit }}
            ทั้งครั้งนี้รวมเป็น <span class="dot">{{ $form->thaiDigits($stats['same_days_with_this']) }}</span> {{ $dayUnit }}
        </p>
        <p>ในปีงบประมาณนี้ ผู้นี้เคยลาป่วยมาแล้ว <span class="dot">{{ $form->thaiDigits($stats['sick_count']) }}</span> ครั้ง
            รวม <span class="dot">{{ $form->thaiDigits($stats['sick_days']) }}</span> วัน
        </p>
    @endif
    <p>การลาครั้งนี้อยู่ในอำนาจของ <span class="dot">ผู้อำนวยการ</span> อนุญาตได้ตามข้อบังคับ ฯ</p>
    <table class="sig-wrap sig-check">
        <tr>
            <td></td>
            <td>
                (ลงชื่อ) ....................................<br>
                ตำแหน่ง เจ้าหน้าที่ตรวจสอบ<br>
                ฝ่ายธุรการและกำลังพล
            </td>
        </tr>
    </table>
</div>

<table class="route">
    <thead>
        <tr>
            <th style="width: 18%;">นำเสนอ</th>
            <th style="width: 22%;">วัน เดือน ปี ที่นำเสนอ</th>
            <th>ผู้นำเสนอ<br><span class="muted">ยศและชื่อ / ตำแหน่ง</span></th>
            <th style="width: 26%;">หมายเหตุ</th>
        </tr>
    </thead>
    <tbody>
        @php
            $rows = $leave->approvals;
            if ($rows->isEmpty()) {
                $rows = collect([
                    (object) ['role_label' => 'หัวหน้าแผนก', 'acted_at' => null, 'approver' => null, 'action' => 'pending', 'comment' => null],
                    (object) ['role_label' => 'ฝ่ายธุรการและกำลังพล', 'acted_at' => null, 'approver' => null, 'action' => 'pending', 'comment' => null],
                    (object) ['role_label' => 'ผู้อำนวยการ', 'acted_at' => null, 'approver' => null, 'action' => 'pending', 'comment' => null],
                ]);
            }
        @endphp
        @foreach($rows as $approval)
            <tr>
                <td class="center">{{ $approval->role_label }}</td>
                <td class="center">
                    {{ $approval->acted_at ? $form->officialDate(\Carbon\Carbon::parse($approval->acted_at)) : '' }}
                </td>
                <td>
                    {{ $approval->approver->name ?? '' }}
                    @if(!empty($approval->approver?->position))
                        <br><span class="muted">{{ $approval->approver->position }}</span>
                    @endif
                    @if(($approval->action ?? '') === 'approved')
                        <br>เห็นควรอนุญาต
                    @elseif(($approval->action ?? '') === 'rejected')
                        <br>ไม่อนุญาต
                    @endif
                </td>
                <td>{{ $approval->comment ?? '' }}</td>
            </tr>
        @endforeach
    </tbody>
</table>

<p class="note">
    หมายเหตุ ตามระเบียบกองทัพบก ว่าด้วยการลา พ.ศ. ๒๕๕๖ ข้อ ๖ ให้เสนอใบลาต่อผู้บังคับบัญชาตามลำดับชั้นจนถึงผู้มีอำนาจอนุญาตให้ลา
    @if($code === 'SICK')
        การเขียนใบลาป่วยต้องกล่าวถึงอาการป่วย กำหนดวันลา และสถานที่ซึ่งพักรักษาตัว (ข้อ ๑๔)
    @elseif($code === 'PERSONAL')
        การเขียนใบลากิจต้องกล่าวถึงความประสงค์ของการลา กำหนดวันลา และสถานที่ซึ่งทางราชการจะติดต่อได้เสมอ (ข้อ ๓๑)
    @endif
    การนับวันลาให้นับตามปีงบประมาณ
    @if($working)
        โดยนับเฉพาะวันทำการ
    @else
        โดยนับต่อเนื่องรวมวันหยุดราชการที่อยู่ระหว่างวันลาประเภทเดียวกัน
    @endif
    (ข้อ ๑๐)
</p>

<table class="footer-line">
    <tr>
        <td>ตามระเบียบกองทัพบก ว่าด้วยการลา พ.ศ. ๒๕๕๖</td>
        <td class="right">พิมพ์เมื่อ {{ $form->officialDate(now()) }}</td>
    </tr>
</table>
</body>
</html>
