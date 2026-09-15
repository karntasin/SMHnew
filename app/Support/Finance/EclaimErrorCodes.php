<?php

namespace App\Support\Finance;

class EclaimErrorCodes
{
    private static ?array $cache = null;

    public static function sourceUrl(): string
    {
        return (string) (static::catalog()['source'] ?? 'https://www.uckkpho.com/uc/1313/');
    }

    /**
     * @return array{source?:string,source_note?:string,updated_at?:string,count?:int,codes?:array<string,array{code:string,description:string,solution:string}>}
     */
    public static function catalog(): array
    {
        if (static::$cache !== null) {
            return static::$cache;
        }

        $path = app_path('Data/eclaim-error-codes.json');
        if (! is_file($path)) {
            return static::$cache = [
                'source' => 'https://www.uckkpho.com/uc/1313/',
                'source_note' => '',
                'updated_at' => null,
                'count' => 0,
                'codes' => [],
            ];
        }

        $decoded = json_decode((string) file_get_contents($path), true);

        return static::$cache = is_array($decoded) ? $decoded : [
            'source' => 'https://www.uckkpho.com/uc/1313/',
            'codes' => [],
            'count' => 0,
        ];
    }

    /**
     * @return array{code:string,description:string,solution:string}|null
     */
    public static function find(string $code): ?array
    {
        $code = trim($code);
        if ($code === '') {
            return null;
        }

        $codes = static::catalog()['codes'] ?? [];

        return $codes[$code] ?? null;
    }

    /**
     * Map for frontend tooltips: code => {description, solution}
     *
     * @param  list<string>|null  $onlyCodes
     * @return array<string,array{description:string,solution:string}>
     */
    public static function tooltipMap(?array $onlyCodes = null): array
    {
        $codes = static::catalog()['codes'] ?? [];
        if ($onlyCodes !== null) {
            $wanted = array_fill_keys(array_filter(array_map('strval', $onlyCodes)), true);
            $codes = array_filter($codes, fn ($_, $code) => isset($wanted[(string) $code]), ARRAY_FILTER_USE_BOTH);
        }

        $map = [];
        foreach ($codes as $code => $row) {
            $map[(string) $code] = [
                'description' => (string) ($row['description'] ?? ''),
                'solution' => (string) ($row['solution'] ?? ''),
            ];
        }

        return $map;
    }
}
