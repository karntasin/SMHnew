<?php

namespace App\Support\Finance;

class CgdCDenyCodes
{
    private static ?array $cache = null;

    /** @var array<string, array{type:string,code:string,description:string,guide:string}>|null */
    private static ?array $byCode = null;

    public static function source(): string
    {
        return (string) (static::catalog()['source'] ?? 'รายละเอียดคำอธิบาย C Deny.xlsx');
    }

    /**
     * @return array{source?:string,updated?:string,codes?:list<array{type:string,code:string,description:string,guide:string}>}
     */
    public static function catalog(): array
    {
        if (static::$cache !== null) {
            return static::$cache;
        }

        $path = app_path('Data/cgd-c-deny-codes.json');
        if (! is_file($path)) {
            return static::$cache = ['source' => '', 'updated' => null, 'codes' => []];
        }

        $decoded = json_decode((string) file_get_contents($path), true);

        return static::$cache = is_array($decoded) ? $decoded : ['codes' => []];
    }

    /**
     * @return array{type:string,code:string,description:string,guide:string}|null
     */
    public static function find(string $code): ?array
    {
        $code = trim($code);
        if ($code === '') {
            return null;
        }

        if (static::$byCode === null) {
            static::$byCode = [];
            foreach (static::catalog()['codes'] ?? [] as $row) {
                if (! is_array($row) || empty($row['code'])) {
                    continue;
                }
                static::$byCode[(string) $row['code']] = [
                    'type' => (string) ($row['type'] ?? 'Corrective'),
                    'code' => (string) $row['code'],
                    'description' => (string) ($row['description'] ?? ''),
                    'guide' => (string) ($row['guide'] ?? ''),
                ];
            }
        }

        return static::$byCode[$code] ?? null;
    }

    /**
     * @param  list<string>  $codes
     * @return array<string, array{type:string,code:string,description:string,guide:string}>
     */
    public static function map(array $codes): array
    {
        $out = [];
        foreach ($codes as $code) {
            $found = static::find((string) $code);
            if ($found) {
                $out[$found['code']] = $found;
            }
        }

        return $out;
    }
}
