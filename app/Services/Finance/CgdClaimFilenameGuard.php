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

    /**
     * ตรวจจับ Service Type จากชื่อไฟล์:
     * หากมีคำว่า IP (IPCS, IPLGO, STM_..._IP, _IP_) -> 'IPD' (ผู้ป่วยใน)
     * หากมีคำว่า OP (OPCS, OPLGO, STM_..._OP, _OP_) -> 'OPD' (ผู้ป่วยนอก)
     */
    public static function detectServiceType(string $filename): string
    {
        $base = strtoupper(basename(str_replace('\\', '/', $filename)));
        if (preg_match('/(?:IPCS|IPLGO|IPUC|IPUCS|_IP[0-9_]|_IP\b|_IP_|IPD)/i', $base)) {
            return 'IPD';
        }

        return 'OPD';
    }

    public static function detectChannel(string $filename): string
    {
        return self::detectServiceType($filename) === 'IPD' ? 'IP' : 'OP';
    }

    public static function matches(string $filename, string $prefix): bool
    {
        $base = basename(str_replace('\\', '/', $filename));

        return str_starts_with(mb_strtolower($base), mb_strtolower($prefix));
    }

    public static function isAllowedRep(string $filename, ?string $scheme = null): bool
    {
        $scheme = $scheme ?: ClaimScheme::detectFromFilename($filename) ?: ClaimScheme::CGD;
        $base = mb_strtolower(basename(str_replace('\\', '/', $filename)));

        // รองรับทั้ง OP และ IP (OPCS, IPCS, OPLGO, IPLGO, OPUC, IPUC)
        $allowedPatterns = match ($scheme) {
            ClaimScheme::LGO => [
                'eclaim_14689_oplgo', 'rep_eclaim_14689_oplgo',
                'eclaim_14689_iplgo', 'rep_eclaim_14689_iplgo',
            ],
            ClaimScheme::UCS, 'uc' => [
                'eclaim_14689_op_', 'rep_eclaim_14689_op_',
                'eclaim_14689_ip_', 'rep_eclaim_14689_ip_',
                'eclaim_14689_opuc', 'rep_eclaim_14689_opuc',
                'eclaim_14689_ipuc', 'rep_eclaim_14689_ipuc',
                'eclaim_14689_uc', 'rep_eclaim_14689_uc',
            ],
            default => [
                'eclaim_14689_opcs', 'rep_eclaim_14689_opcs',
                'eclaim_14689_ipcs', 'rep_eclaim_14689_ipcs',
            ],
        };

        foreach ($allowedPatterns as $pattern) {
            if (str_starts_with($base, $pattern)) {
                return true;
            }
            $cleanPattern = preg_replace('/^rep_/', '', $pattern) ?? $pattern;
            if (str_contains($base, '_appeal') && str_contains($base, $cleanPattern.'_appeal')) {
                return true;
            }
        }

        return false;
    }

    public static function isAllowedStm(string $filename, ?string $scheme = null): bool
    {
        $scheme = $scheme ?: ClaimScheme::detectFromFilename($filename) ?: ClaimScheme::CGD;
        $base = mb_strtolower(basename(str_replace('\\', '/', $filename)));

        // รองรับทั้ง STM_14689_OP และ STM_14689_IP
        if (str_starts_with($base, 'stm_14689_op') || str_starts_with($base, 'stm_14689_ip')) {
            return true;
        }

        // รองรับรูปแบบ UC: 14689_OPUCS, 14689_IPUCS (ทั้งแบบมีหรือไม่มีคำนำหน้า stm_)
        if (str_starts_with($base, '14689_opucs') || str_starts_with($base, '14689_ipucs') ||
            str_starts_with($base, 'stm_14689_opucs') || str_starts_with($base, 'stm_14689_ipucs')) {
            return true;
        }

        $prefix = self::stmPrefix($scheme);
        if ($prefix) {
            $prefixLower = mb_strtolower($prefix);
            if (str_starts_with($base, $prefixLower) || str_starts_with($base, 'stm_'.$prefixLower)) {
                return true;
            }
        }

        return false;
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

        $coreIp = preg_replace('/_op(?=$|[0-9_a-z])/i', '_ip', $core) ?? $core;
        $prefixIp = preg_replace('/_op(?=$|[0-9_a-z])/i', '_ip', $prefix) ?? $prefix;
        $withRepIp = preg_replace('/_op(?=$|[0-9_a-z])/i', '_ip', $withRep) ?? $withRep;

        $stm = mb_strtolower((string) (ClaimScheme::stmPrefix($scheme) ?? ''));
        $stmIp = $stm ? str_replace(['_op', 'opuc', 'opcs', 'oplgo'], ['_ip', 'ipuc', 'ipcs', 'iplgo'], $stm) : '';

        $query->where(function ($q) use ($prefix, $core, $withRep, $coreIp, $prefixIp, $withRepIp, $stm, $stmIp) {
            $q->whereRaw('LOWER(filename) LIKE ?', [$prefix.'%'])
                ->orWhereRaw('LOWER(filename) LIKE ?', [$core.'%'])
                ->orWhereRaw('LOWER(filename) LIKE ?', [$withRep.'%'])
                ->orWhereRaw('LOWER(filename) LIKE ?', ['%'.$core.'_appeal%'])
                ->orWhereRaw('LOWER(filename) LIKE ?', [$prefixIp.'%'])
                ->orWhereRaw('LOWER(filename) LIKE ?', [$coreIp.'%'])
                ->orWhereRaw('LOWER(filename) LIKE ?', [$withRepIp.'%'])
                ->orWhereRaw('LOWER(filename) LIKE ?', ['%'.$coreIp.'_appeal%']);

            if ($stm) {
                $q->orWhereRaw('LOWER(filename) LIKE ?', [$stm.'%'])
                  ->orWhereRaw('LOWER(filename) LIKE ?', ['%'.$stm.'%']);
            }
            if ($stmIp) {
                $q->orWhereRaw('LOWER(filename) LIKE ?', [$stmIp.'%'])
                  ->orWhereRaw('LOWER(filename) LIKE ?', ['%'.$stmIp.'%']);
            }
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
