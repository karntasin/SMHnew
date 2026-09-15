<?php

namespace App\Services\Leave;

use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Support\ThaiFiscalPeriod;
use Carbon\Carbon;

class LeaveFormService
{
    private const MONTHS = [
        1 => 'มกราคม', 2 => 'กุมภาพันธ์', 3 => 'มีนาคม', 4 => 'เมษายน',
        5 => 'พฤษภาคม', 6 => 'มิถุนายน', 7 => 'กรกฎาคม', 8 => 'สิงหาคม',
        9 => 'กันยายน', 10 => 'ตุลาคม', 11 => 'พฤศจิกายน', 12 => 'ธันวาคม',
    ];

    public function calculateDays(string $start, string $end, ?LeaveType $type = null): float
    {
        $s = Carbon::parse($start)->startOfDay();
        $e = Carbon::parse($end)->startOfDay();
        if ($e->lt($s)) {
            return 0.5;
        }

        $workingOnly = (bool) ($type?->counts_working_days);
        $days = 0;

        while ($s->lte($e)) {
            if (! $workingOnly || ! $s->isWeekend()) {
                $days++;
            }
            $s->addDay();
        }

        return max((float) $days, 0.5);
    }

    public function fiscalYearRange(?Carbon $date = null): array
    {
        $date ??= now();
        $yearBe = (int) $date->year + 543;
        $fiscalBe = ThaiFiscalPeriod::fiscalYearBe($yearBe, (int) $date->month);
        $start = Carbon::create($fiscalBe - 543 - 1, 10, 1)->startOfDay();
        $end = Carbon::create($fiscalBe - 543, 9, 30)->endOfDay();

        return [$fiscalBe, $start, $end];
    }

    public function fiscalStats(LeaveRequest $leave): array
    {
        [$fiscalBe, $start, $end] = $this->fiscalYearRange($leave->start_date ?? now());

        $base = LeaveRequest::query()
            ->where('user_id', $leave->user_id)
            ->where('id', '!=', $leave->id)
            ->whereNotIn('status', ['draft', 'cancelled', 'rejected'])
            ->whereBetween('start_date', [$start->toDateString(), $end->toDateString()]);

        $sameType = (clone $base)->where('leave_type_id', $leave->leave_type_id)->get();
        $sick = LeaveType::query()->where('code', 'SICK')->value('id');
        $personal = LeaveType::query()->where('code', 'PERSONAL')->value('id');

        $sickRows = $sick
            ? (clone $base)->where('leave_type_id', $sick)->get()
            : collect();
        $personalRows = $personal
            ? (clone $base)->where('leave_type_id', $personal)->get()
            : collect();

        $sameIncluding = $sameType->sum('total_days') + (float) $leave->total_days;

        return [
            'fiscal_year_be' => $fiscalBe,
            'same_count' => $sameType->count() + 1,
            'same_days' => (float) $sameType->sum('total_days'),
            'same_days_with_this' => (float) $sameIncluding,
            'sick_count' => $sickRows->count(),
            'sick_days' => (float) $sickRows->sum('total_days'),
            'personal_count' => $personalRows->count(),
            'personal_days' => (float) $personalRows->sum('total_days'),
            'vacation_used' => $leave->leaveType?->code === 'VACATION'
                ? (float) $sameType->sum('total_days')
                : (float) (clone $base)->whereHas('leaveType', fn ($q) => $q->where('code', 'VACATION'))->sum('total_days'),
        ];
    }

    public function thaiDigits(string|int|float|null $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        return strtr((string) $value, [
            '0' => '๐', '1' => '๑', '2' => '๒', '3' => '๓', '4' => '๔',
            '5' => '๕', '6' => '๖', '7' => '๗', '8' => '๘', '9' => '๙',
        ]);
    }

    public function dateParts(?Carbon $date): array
    {
        if (! $date) {
            return ['day' => '', 'month' => '', 'year' => ''];
        }

        return [
            'day' => $this->thaiDigits($date->day),
            'month' => self::MONTHS[(int) $date->month] ?? '',
            'year' => $this->thaiDigits($date->year + 543),
        ];
    }

    public function officialDate(?Carbon $date): string
    {
        if (! $date) {
            return '';
        }
        $p = $this->dateParts($date);

        return "{$p['day']} {$p['month']} พ.ศ. {$p['year']}";
    }

    public function pronoun(?string $name): string
    {
        return 'กระผม/ดิฉัน';
    }

    public function formMeta(LeaveType $type): array
    {
        return [
            'form_code' => preg_replace('/\s*-\s*/u', ' - ', $type->form_code ?: 'ทบ.๑๐๐-๐๐๖') ?: 'ทบ.๑๐๐ - ๐๐๖',
            'form_number' => $type->form_number ?: 'แบบ ๕',
            'title' => match ($type->code) {
                'SICK' => 'ใบลาป่วย',
                'MATERNITY' => 'ใบลาคลอดบุตร',
                'PERSONAL' => 'ใบลากิจ',
                'VACATION' => 'ใบลาพักผ่อนประจำปี',
                'PATERNITY' => 'ใบลาไปช่วยเหลือภริยาที่คลอดบุตร',
                'ORDINATION' => 'ใบขออนุญาตลาอุปสมบท',
                'HAJJ' => 'ใบลาขออนุญาตไปประกอบพิธีฮัจย์',
                'ABROAD' => 'ใบลาติดตามคู่สมรส',
                'REHAB' => 'ใบลาไปฟื้นฟูสมรรถภาพด้านอาชีพ',
                default => 'ใบลา'.$type->name,
            },
            'subject' => $type->subject ?: ('ขอ'.$type->name),
        ];
    }
}
