<?php

namespace App\Support;

class ThaiFiscalPeriod
{
    /** @var array<string, int> */
    public const MONTH_MAP = [
        'ม.ค' => 1, 'มค' => 1, 'มกราคม' => 1,
        'ก.พ' => 2, 'กพ' => 2, 'กุมภาพันธ์' => 2,
        'มี.ค' => 3, 'มีค' => 3, 'มีนาคม' => 3,
        'เม.ย' => 4, 'เมย' => 4, 'เมษายน' => 4,
        'พ.ค' => 5, 'พค' => 5, 'พฤษภาคม' => 5,
        'มิ.ย' => 6, 'มิย' => 6, 'มิถุนายน' => 6,
        'ก.ค' => 7, 'กค' => 7, 'กรกฎาคม' => 7,
        'ส.ค' => 8, 'สค' => 8, 'สิงหาคม' => 8,
        'ก.ย' => 9, 'กย' => 9, 'กันยายน' => 9,
        'ต.ค' => 10, 'ตค' => 10, 'ตุลาคม' => 10,
        'พ.ย' => 11, 'พย' => 11, 'พฤศจิกายน' => 11,
        'ธ.ค' => 12, 'ธค' => 12, 'ธันวาคม' => 12,
    ];

    /**
     * @return array{year_be: int, month: int, fiscal_year_be: int}|null
     */
    public static function parse(string $label): ?array
    {
        $label = trim(preg_replace('/\s+/u', ' ', $label) ?? '');
        if ($label === '') {
            return null;
        }

        if (! preg_match('/([ก-๙\.]+)\s*\.?\s*(\d{2,4})/u', $label, $m)) {
            return null;
        }

        $monthKey = rtrim($m[1], '.');
        $monthKey = preg_replace('/\s+/u', '', $monthKey) ?? $monthKey;
        $month = null;
        foreach (self::MONTH_MAP as $key => $num) {
            $norm = preg_replace('/\s+/u', '', rtrim($key, '.')) ?? $key;
            if ($monthKey === $norm || str_starts_with($monthKey, $norm) || str_starts_with($norm, $monthKey)) {
                $month = $num;
                break;
            }
        }

        if (! $month) {
            return null;
        }

        $yearPart = (int) $m[2];
        $yearBe = $yearPart < 100 ? 2500 + $yearPart : $yearPart;
        $fiscal = self::fiscalYearBe($yearBe, $month);

        return [
            'year_be' => $yearBe,
            'month' => $month,
            'fiscal_year_be' => $fiscal,
        ];
    }

    public static function fiscalYearBe(int $yearBe, int $month): int
    {
        // ปีงบประมาณไทย: ต.ค.–ก.ย. → ปีงบ = ปีของ ก.ย. ที่สิ้นสุด
        return $month >= 10 ? $yearBe + 1 : $yearBe;
    }

    public static function label(int $yearBe, int $month): string
    {
        $names = config('env_utility.thai_months', []);

        return ($names[$month] ?? (string) $month).' '.($yearBe % 100);
    }

    /**
     * @return array{year_be: int, month: int, label: string}
     */
    public static function previousMonth(int $yearBe, int $month): array
    {
        if ($month === 1) {
            $yearBe--;
            $month = 12;
        } else {
            $month--;
        }

        return [
            'year_be' => $yearBe,
            'month' => $month,
            'label' => self::label($yearBe, $month),
        ];
    }

    public static function currentFiscalYearBe(): int
    {
        $now = now();
        $yearBe = (int) $now->year + 543;
        $month = (int) $now->month;

        return self::fiscalYearBe($yearBe, $month);
    }

    /**
     * @return list<array{year_be: int, month: int, label: string}>
     */
    public static function monthsInFiscalYear(int $fiscalYearBe): array
    {
        $months = [];
        for ($m = 10; $m <= 12; $m++) {
            $y = $fiscalYearBe - 1;
            $months[] = [
                'year_be' => $y,
                'month' => $m,
                'label' => self::label($y, $m),
            ];
        }
        for ($m = 1; $m <= 9; $m++) {
            $y = $fiscalYearBe;
            $months[] = [
                'year_be' => $y,
                'month' => $m,
                'label' => self::label($y, $m),
            ];
        }

        return $months;
    }
}
