<?php

namespace App\Support;

class EnvFile
{
    public static function set(array $values): void
    {
        $path = base_path('.env');
        if (! is_file($path)) {
            return;
        }

        $env = file_get_contents($path) ?: '';

        foreach ($values as $key => $value) {
            $key = (string) $key;
            $value = $value === null ? '' : (string) $value;
            $value = self::escape($value);

            if (preg_match("/^{$key}=.*/m", $env)) {
                $env = preg_replace("/^{$key}=.*/m", "{$key}={$value}", $env) ?? $env;
            } else {
                $env = rtrim($env)."\n{$key}={$value}\n";
            }
        }

        file_put_contents($path, $env);
    }

    public static function escape(string $value): string
    {
        if ($value === '') {
            return '';
        }

        if (preg_match('/[\s#"\\\\]/', $value) || str_contains($value, "\n") || str_contains($value, "\r")) {
            $value = str_replace(['\\', '"'], ['\\\\', '\\"'], $value);
            $value = str_replace(["\r\n", "\r", "\n"], '\n', $value);

            return '"'.$value.'"';
        }

        return $value;
    }
}
