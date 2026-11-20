<?php

namespace App\Support\Finance;

use InvalidArgumentException;

class ClaimScheme
{
    public const CGD = 'cgd';

    public const LGO = 'lgo';

    public const UCS = 'ucs';

    /**
     * @return array<string, mixed>
     */
    public static function get(string $key): array
    {
        $all = config('claim_schemes', []);
        if (! isset($all[$key]) || ! is_array($all[$key])) {
            throw new InvalidArgumentException("ไม่รู้จัก claim scheme: {$key}");
        }

        return $all[$key];
    }

    public static function exists(string $key): bool
    {
        return isset(config('claim_schemes')[$key]);
    }

    public static function pttypeLike(string $key): string
    {
        return (string) (self::get($key)['pttype_like'] ?? '12%');
    }

    public static function maininscl(string $key): string
    {
        return (string) (self::get($key)['maininscl'] ?? 'ofc');
    }

    public static function repPrefix(string $key): string
    {
        return (string) (self::get($key)['filename_prefixes']['rep'] ?? '');
    }

    public static function stmPrefix(string $key): ?string
    {
        $prefix = self::get($key)['filename_prefixes']['stm'] ?? null;

        return $prefix !== null && $prefix !== '' ? (string) $prefix : null;
    }

    public static function hasStm(string $key): bool
    {
        return (bool) (self::get($key)['has_stm'] ?? false);
    }

    public static function primarySource(string $key): string
    {
        return (string) (self::get($key)['primary_source'] ?? 'stm');
    }

    public static function route(string $key, string $name): string
    {
        $prefix = (string) (self::get($key)['route_prefix'] ?? 'finance.cgd.');

        return $prefix.$name;
    }

    public static function validationPath(string $key): string
    {
        return (string) (self::get($key)['validation_path']
            ?? '/webComponent/validation/ValidationMainAction.do?maininscl='.self::maininscl($key));
    }

    public static function statementPath(string $key): string
    {
        return (string) (self::get($key)['statement_path']
            ?? '/webComponent/nch/StatementReportWebAction.do');
    }

    public static function storageDir(string $key): string
    {
        return (string) (self::get($key)['storage_dir'] ?? 'finance/cgd-stm');
    }

    public static function seedAppealsFromRep(string $key): bool
    {
        return (bool) (self::get($key)['seed_appeals_from_rep'] ?? false);
    }

    /**
     * ตรวจจากชื่อไฟล์ว่าเป็น scheme ใด (OPLGO ก่อน OPCS ก่อน UCS เพื่อไม่ชนกัน)
     */
    public static function detectFromFilename(string $filename): ?string
    {
        $base = mb_strtolower(basename(str_replace('\\', '/', $filename)));

        // 1. ตรวจจับ LGO ก่อน (OPLGO, IPLGO)
        if (str_contains($base, 'oplgo') || str_contains($base, 'iplgo')) {
            return self::LGO;
        }

        // 2. ตรวจจับ CGD (OPCS, IPCS)
        if (str_contains($base, 'opcs') || str_contains($base, 'ipcs')) {
            return self::CGD;
        }

        // 3. ตรวจจับ UCS บัตรทอง (OPUCS, IPUCS, eclaim_14689_op_, eclaim_14689_ip_, 14689_opucs, OPUC, IPUC)
        if (str_contains($base, 'opucs') || str_contains($base, 'ipucs')
            || str_contains($base, 'opuc') || str_contains($base, 'ipuc')
            || str_starts_with($base, 'eclaim_14689_op_') || str_starts_with($base, 'rep_eclaim_14689_op_')
            || str_starts_with($base, 'eclaim_14689_ip_') || str_starts_with($base, 'rep_eclaim_14689_ip_')
            || str_starts_with($base, '14689_opucs') || str_starts_with($base, '14689_ipucs')
            || str_starts_with($base, 'stm_14689_opucs') || str_starts_with($base, 'stm_14689_ipucs')) {
            return self::UCS;
        }

        foreach (['lgo', 'cgd', 'ucs'] as $key) {
            if (! self::exists($key)) {
                continue;
            }
            $rep = mb_strtolower(self::repPrefix($key));
            if ($rep === '') {
                continue;
            }
            $core = preg_replace('/^rep_/', '', $rep) ?? $rep;
            $coreIp = str_replace(['opcs', 'oplgo', 'opuc'], ['ipcs', 'iplgo', 'ipuc'], $core);
            $repIp = str_replace(['opcs', 'oplgo', 'opuc'], ['ipcs', 'iplgo', 'ipuc'], $rep);
            if (str_starts_with($base, $rep)
                || str_starts_with($base, $core)
                || str_starts_with($base, $repIp)
                || str_starts_with($base, $coreIp)
                || str_contains($base, $core.'_appeal')
                || str_contains($base, $coreIp.'_appeal')) {
                return $key;
            }

            $stm = self::stmPrefix($key);
            if ($stm) {
                $stmLower = mb_strtolower($stm);
                $stmIp = str_replace('_op', '_ip', $stmLower);
                if (str_starts_with($base, $stmLower) || str_starts_with($base, $stmIp)) {
                    return $key;
                }
            }
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    public static function uiMeta(string $key): array
    {
        $cfg = self::get($key);
        $primary = self::primarySource($key);

        return [
            'key' => $key,
            'title' => $cfg['title'] ?? $key,
            'short' => $cfg['short'] ?? $key,
            'has_stm' => self::hasStm($key),
            'primary_source' => $primary,
            'pttype_like' => self::pttypeLike($key),
            'rep_prefix' => self::repPrefix($key),
            'stm_prefix' => self::stmPrefix($key),
            'maininscl' => self::maininscl($key),
            'labels' => [
                'source' => $primary === 'rep' ? 'REP' : 'STM',
                'source_all' => $primary === 'rep' ? 'REP ทั้งหมด' : 'STM',
                'compare_tab' => $primary === 'rep' ? 'เปรียบเทียบ REP–HOSxP' : 'เปรียบเทียบ STM–HOSxP',
                'data_tab' => $primary === 'rep' ? 'ข้อมูลตาม REP' : 'ข้อมูลตาม STM',
                'only_source' => $primary === 'rep' ? 'มีเฉพาะ REP' : 'มีเฉพาะ STM',
                'import_rep' => 'นำเข้าไฟล์ e-Claim / REP',
            ],
            'routes' => array_filter([
                'dashboard' => self::route($key, 'dashboard'),
                'import' => self::route($key, 'import'),
                'import_store' => self::route($key, 'import.store'),
                'summary' => self::route($key, 'summary'),
                'reconcile_all' => self::route($key, 'reconcile-all'),
                'compare' => self::route($key, $primary === 'rep' ? 'compare' : 'stm.compare'),
                'nhso_start' => self::route($key, 'nhso.start'),
                'nhso_otp' => self::route($key, 'nhso.otp'),
                'nhso_download' => self::route($key, 'nhso.download'),
                'nhso_clear' => self::route($key, 'nhso.clear'),
                'show' => self::route($key, 'show'),
                'precheck' => $key === 'cgd' ? self::route($key, 'precheck') : null,
            ]),
        ];
    }
}
