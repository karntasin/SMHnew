<?php

namespace App\Services\Finance;

use App\Support\Finance\ClaimScheme;
use Illuminate\Validation\ValidationException;

class CgdClaimFilenameGuard
{
    public static function repPrefix(?string $scheme = null): string
    {
        $scheme = $scheme ?: ClaimScheme::CGD;

        return ClaimScheme::repPrefix($scheme)
            ?: (string) config('cgd_eclaim.filename_prefixes.rep', 'rep_eclaim_14689_OPCS');
    }

    public static function stmPrefix(?string $scheme = null): string
    {
        $scheme = $scheme ?: ClaimScheme::CGD;

        return ClaimScheme::stmPrefix($scheme)
            ?: (string) config('cgd_eclaim.filename_prefixes.stm', 'STM_14689_OP');
    }

    /**
     * คืนค่า [prefix ที่ตั้งใน config, core โดยตัด rep_ นำหน้า, รูปแบบที่มี rep_]
     *
     * @return array{0:string,1:string,2:string}
     */
    public static function repPrefixVariants(?string $scheme = null): array
    {
        $prefix = mb_strtolower(self::repPrefix($scheme));
        $core = preg_replace('/^rep_/', '', $prefix) ?? $prefix;
        $withRep = str_starts_with($prefix, 'rep_') ? $prefix : 'rep_'.$core;

        return [$prefix, $core, $withRep];
    }

    /** ข้อความ hint สำหรับ UI / log เช่น eclaim_14689_OPLGO / rep_eclaim_14689_OPLGO */
    public static function repPrefixHint(?string $scheme = null): string
    {
        [, $core, $withRep] = self::repPrefixVariants($scheme);

        return $core === $withRep ? $core : $core.' / '.$withRep;
    }

    public static function matches(string $filename, string $prefix): bool
    {
        $base = basename(str_replace('\\', '/', $filename));

        return str_starts_with(mb_strtolower($base), mb_strtolower($prefix));
    }

    public static function isAllowedRep(string $filename, ?string $scheme = null): bool
    {
        $scheme = $scheme ?: ClaimScheme::detectFromFilename($filename) ?: ClaimScheme::CGD;
        [$prefix, $core, $withRep] = self::repPrefixVariants($scheme);
        if ($prefix === '' || $core === '') {
            return false;
        }

        $base = mb_strtolower(basename(str_replace('\\', '/', $filename)));

        // REP ปกติ / APPEAL: รองรับทั้ง eclaim_* และ rep_eclaim_*
        if (str_starts_with($base, $prefix)
            || str_starts_with($base, $core)
            || str_starts_with($base, $withRep)) {
            return true;
        }

        // อุทธรณ์: ชื่ออาจมี token กลางไฟล์
        if (str_contains($base, '_appeal')) {
            return str_contains($base, $core.'_appeal');
        }

        return false;
    }

    public static function isAllowedStm(string $filename, ?string $scheme = null): bool
    {
        $scheme = $scheme ?: ClaimScheme::CGD;
        $prefix = self::stmPrefix($scheme);
        if ($prefix === '') {
            return false;
        }

        return self::matches($filename, $prefix);
    }

    public static function assertRep(string $filename, string $field = 'files', ?string $scheme = null): void
    {
        $scheme = $scheme ?: ClaimScheme::detectFromFilename($filename) ?: ClaimScheme::CGD;

        if (self::isAllowedRep($filename, $scheme)) {
            return;
        }

        [, $core, $withRep] = self::repPrefixVariants($scheme);
        throw ValidationException::withMessages([
            $field => 'ชื่อไฟล์ต้องขึ้นต้นด้วย '.$core
                .' หรือ '.$withRep
                .' (รวมไฟล์อุทธรณ์ '.$core.'_APPEAL) — ได้: '.basename($filename),
        ]);
    }

    public static function assertStm(string $filename, string $field = 'stm_files', ?string $scheme = null): void
    {
        $scheme = $scheme ?: ClaimScheme::CGD;

        if (self::isAllowedStm($filename, $scheme)) {
            return;
        }

        throw ValidationException::withMessages([
            $field => 'ชื่อไฟล์ STM ต้องขึ้นต้นด้วย '.self::stmPrefix($scheme).' (ได้: '.basename($filename).')',
        ]);
    }

    /**
     * กรอง batch ตามชื่อไฟล์ที่อนุญาตของ scheme
     *
     * @param  \Illuminate\Database\Eloquent\Builder|\Illuminate\Database\Query\Builder  $query
     */
    public static function constrainBatchQuery($query, string $scheme): void
    {
        [$prefix, $core, $withRep] = self::repPrefixVariants($scheme);
        if ($prefix === '' || $core === '') {
            return;
        }

        $query->where(function ($q) use ($prefix, $core, $withRep) {
            $q->whereRaw('LOWER(filename) LIKE ?', [$prefix.'%'])
                ->orWhereRaw('LOWER(filename) LIKE ?', [$core.'%'])
                ->orWhereRaw('LOWER(filename) LIKE ?', [$withRep.'%'])
                ->orWhereRaw('LOWER(filename) LIKE ?', ['%'.$core.'_appeal%']);
        });
    }

    /**
     * กรอง batch ที่ชื่อไฟล์ถูกต้องของทุก scheme ที่รู้จัก
     *
     * @param  \Illuminate\Database\Eloquent\Builder|\Illuminate\Database\Query\Builder  $query
     * @param  list<string>|null  $schemes
     */
    public static function constrainBatchQueryAnyScheme($query, ?array $schemes = null): void
    {
        $schemes = $schemes ?: array_keys(config('claim_schemes', []));
        $schemes = array_values(array_filter($schemes, fn ($s) => is_string($s) && ClaimScheme::exists($s)));
        if ($schemes === []) {
            return;
        }

        $query->where(function ($outer) use ($schemes) {
            foreach ($schemes as $scheme) {
                $outer->orWhere(function ($inner) use ($scheme) {
                    $inner->where('scheme', $scheme);
                    self::constrainBatchQuery($inner, $scheme);
                });
            }
        });
    }
}
