<?php

namespace App\Services\Finance;

class CgdClaimMatchKey
{
    public static function normalizeHn(?string $hn): string
    {
        $hn = trim((string) $hn);
        if ($hn === '' || $hn === '-') {
            return '';
        }

        return ltrim($hn, '0') !== '' ? ltrim($hn, '0') : '0';
    }

    public static function normalizePid(?string $pid): string
    {
        return preg_replace('/\D+/', '', (string) $pid) ?? '';
    }

    public static function normalizeSeq(?string $seq): string
    {
        $seq = trim((string) $seq);
        if ($seq === '' || $seq === '-') {
            return '';
        }

        return preg_replace('/\D+/', '', $seq) ?? '';
    }

    public static function make(?string $hn, ?string $pid, ?string $seq): string
    {
        return implode('|', [
            self::normalizeHn($hn),
            self::normalizePid($pid),
            self::normalizeSeq($seq),
        ]);
    }

    public static function parseMoney($value): float
    {
        if ($value === null || $value === '' || $value === '-') {
            return 0.0;
        }

        if (is_numeric($value)) {
            return round((float) $value, 2);
        }

        $raw = trim((string) $value);
        $raw = str_replace([',', ' '], '', $raw);

        return round((float) $raw, 2);
    }
}
