<?php

namespace App\Support;

class LineUrls
{
    public static function appPath(): string
    {
        return rtrim((string) (parse_url((string) config('app.url'), PHP_URL_PATH) ?: ''), '/');
    }

    /** Quick tunnel ชี้ไป Apache vhost 127.0.0.1:8081 — Laravel อยู่ที่ document root */
    public static function tunnelServesFromDocumentRoot(): bool
    {
        return (string) config('ngrok.addr') === '8081';
    }

    /** Path segment ที่ใช้กับ URL สาธารณะ (tunnel) — ว่างเมื่อใช้ vhost 8081 */
    public static function tunnelAppPath(): string
    {
        if (self::tunnelServesFromDocumentRoot()) {
            return '';
        }

        return self::appPath();
    }

    public static function publicBase(): string
    {
        $public = PublicHost::publicHttpsBase();
        if ($public !== null) {
            $path = self::tunnelAppPath();
            if (PublicHost::isNamedTunnelMode() || $path === '') {
                return $public;
            }

            return $public.$path;
        }

        return rtrim((string) config('app.url'), '/');
    }

    public static function callback(): string
    {
        $configured = trim((string) config('services.line.redirect'));
        if ($configured !== '') {
            return $configured;
        }

        return self::publicBase().'/auth/line/callback';
    }

    public static function webhook(): string
    {
        return self::publicBase().'/line/webhook';
    }

    public static function loginStart(string $query = ''): string
    {
        $url = self::publicBase().'/auth/line';

        return $query !== '' ? $url.'?'.$query : $url;
    }
}
