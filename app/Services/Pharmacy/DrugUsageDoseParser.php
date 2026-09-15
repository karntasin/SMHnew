<?php

namespace App\Services\Pharmacy;

/**
 * แปลงวิธีใช้ยา HOSxP (drugusage) เป็นขนาดต่อครั้ง / ครั้งต่อวัน / mg ต่อวัน
 */
final class DrugUsageDoseParser
{
    /**
     * @return array{
     *   usage_text: string,
     *   usage_code: string|null,
     *   tablets_per_dose: float|null,
     *   times_per_day: float|null,
     *   daily_tablets: float|null,
     *   daily_mg: float|null
     * }
     */
    public static function parse(
        ?string $name1,
        ?string $name2,
        ?string $name3,
        ?string $code,
        ?string $shortlist,
        mixed $iperdose,
        mixed $iperday,
        ?float $strengthMg
    ): array {
        $parts = array_values(array_filter([
            trim((string) $name1),
            trim((string) $name2),
            trim((string) $name3),
        ], static fn ($v) => $v !== ''));

        $usageText = $parts !== [] ? implode(' · ', $parts) : trim((string) ($shortlist ?: $code ?: ''));
        $blob = trim(implode(' ', array_filter([
            (string) $code,
            (string) $shortlist,
            (string) $name1,
            (string) $name2,
            (string) $name3,
        ])));

        $perDose = self::positiveFloat($iperdose);
        $times = self::positiveFloat($iperday);

        // เศษส่วนก่อน เช่น 1/2เม็ด * 1, ครึ่งเม็ด
        if ($perDose === null && preg_match('/ครึ่ง\s*เม็ด/u', $blob)) {
            $perDose = 0.5;
        }
        if ($perDose === null && preg_match('/(?<![0-9])(\d+)\s*\/\s*(\d+)\s*เม็ด/u', $blob, $m)) {
            $den = (float) $m[2];
            if ($den > 0) {
                $perDose = ((float) $m[1]) / $den;
            }
        }

        // รูปแบบ "1 เม็ด * 3" — ไม่จับตัวเลขของเศษ 1/2
        if (preg_match('/(?<![0-9.\/])([\d]+(?:\.\d+)?)\s*เม็ด\s*\*\s*([\d]+)/u', $blob, $m)) {
            $perDose ??= (float) $m[1];
            $times ??= (float) $m[2];
        }

        if ($perDose === null && preg_match('/ครั้งละ\s*([\d]+(?:\.\d+)?)/u', $blob, $m)) {
            $perDose = (float) $m[1];
        }
        if ($perDose === null && preg_match('/รับประทาน\s*([\d]+(?:\.\d+)?)\s*เม็ด/u', $blob, $m)) {
            $perDose = (float) $m[1];
        }
        if ($perDose === null && preg_match('/(?<![0-9.\/])([\d]+(?:\.\d+)?)\s*เม็ด/u', (string) $name1, $m)) {
            $perDose = (float) $m[1];
        }

        // .51pt ≈ 0.5 เม็ด × 1 ครั้ง/วัน, .52pt ≈ 0.5 × 2
        if (preg_match('/\.([1-9])([1-4])pt\b/i', $blob, $m)) {
            $perDose ??= ((float) $m[1]) / 10.0;
            $times ??= (float) $m[2];
        }

        if ($times === null && preg_match('/วันละ\s*([\d]+)/u', $blob, $m)) {
            $times = (float) $m[1];
        }
        if ($times === null) {
            if (preg_match('/\b(QID|qid)\b/', $blob)) {
                $times = 4.0;
            } elseif (preg_match('/\b(TID|tid)\b/', $blob)) {
                $times = 3.0;
            } elseif (preg_match('/\b(BID|BD|bid|bd)\b/', $blob)) {
                $times = 2.0;
            } elseif (preg_match('/\b(OD|od|STAT|stat|HS|hs)\b/', $blob)) {
                $times = 1.0;
            }
        }

        // รหัสแบบ 11pt / 12pt / 13pt = ครั้งต่อวัน (ไม่ใช่ .51pt)
        if ($times === null && preg_match('/(?<!\.)\b1([1-4])pt\b/i', $blob, $m)) {
            $times = (float) $m[1];
        }

        $dailyTablets = ($perDose !== null && $times !== null) ? round($perDose * $times, 3) : null;
        $dailyMg = ($dailyTablets !== null && $strengthMg !== null && $strengthMg > 0)
            ? round($dailyTablets * $strengthMg, 2)
            : null;

        return [
            'usage_text' => $usageText !== '' ? $usageText : '—',
            'usage_code' => $code !== null && trim($code) !== '' ? trim($code) : null,
            'tablets_per_dose' => $perDose,
            'times_per_day' => $times,
            'daily_tablets' => $dailyTablets,
            'daily_mg' => $dailyMg,
        ];
    }

    private static function positiveFloat(mixed $value): ?float
    {
        if (! is_numeric($value)) {
            return null;
        }
        $n = (float) $value;

        return $n > 0 ? $n : null;
    }
}
