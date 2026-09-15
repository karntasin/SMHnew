<?php

namespace App\Support;

class LineUrls
{
    public static function appPath(): string
    {
        return rtrim((string) (parse_url((string) config('app.url'), PHP_URL_PATH) ?: ''), '/');
    }

    /**
     * Quick tunnel ชี้ไป Apache vhost 127.0.0.1:8081 — Laravel อยู่ที่ document root
     * ต้องดูจาก NGROK_ADDR ไม่ใช่ path ของเบราว์เซอร์ LAN (/sss/my-app/public)
     */
    public static function tunnelServesFromDocumentRoot(): bool
    {
        return (string) config('ngrok.addr') === '8081';
    }

    /** Path บน URL สาธารณะของอุโมงค์ — ว่างเมื่ออุโมงค์ชี้ที่ public โดยตรง */
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
        $public = PublicHost::publicHttpsBase();
        if ($public !== null) {
            return self::withoutLanPathOnDocumentRootTunnel(
                rtrim($public, '/').self::tunnelAppPath().'/auth/line/callback'
            );
        }

        $configured = trim((string) config('services.line.redirect'));
        if ($configured !== '') {
            return self::withoutLanPathOnDocumentRootTunnel($configured);
        }

        return rtrim((string) config('app.url'), '/').'/auth/line/callback';
    }

    /** กัน path แบบ XAMPP หลุดไปติด Callback ของ trycloudflare/ngrok */
    private static function withoutLanPathOnDocumentRootTunnel(string $url): string
    {
        if (! self::tunnelServesFromDocumentRoot()) {
            return $url;
        }

        $lanPath = self::appPath();
        if ($lanPath !== '' && str_contains($url, $lanPath)) {
            return str_replace($lanPath, '', $url);
        }

        return $url;
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
