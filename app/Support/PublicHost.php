<?php

namespace App\Support;

class PublicHost
{
    public static function tunnelHostname(): ?string
    {
        $host = strtolower(trim((string) config('cloudflare.public_hostname')));

        return $host !== '' ? $host : null;
    }

    public static function isNamedTunnelMode(): bool
    {
        return strtolower((string) config('cloudflare.tunnel_mode', 'quick')) === 'named';
    }

    /** ลิงก์ชั่วคราว ngrok / trycloudflare — ไม่ใช่ subdomain ของโดเมนคุณ */
    public static function isEphemeralTunnelHost(?string $host): bool
    {
        $host = strtolower((string) $host);

        if ($host === '') {
            return false;
        }

        return str_ends_with($host, '.trycloudflare.com')
            || str_contains($host, 'ngrok-free.app')
            || str_contains($host, 'ngrok-free.dev')
            || str_contains($host, 'ngrok.io')
            || str_contains($host, 'ngrok.app');
    }

    public static function publicHttpsBase(): ?string
    {
        if ($named = self::tunnelHostname()) {
            return 'https://'.$named;
        }

        $public = rtrim((string) config('ngrok.public_url'), '/');
        if ($public !== '' && self::isEphemeralTunnelHost(parse_url($public, PHP_URL_HOST))) {
            return $public;
        }

        $appUrl = rtrim((string) config('app.url'), '/');
        if ($appUrl !== '' && str_starts_with(strtolower($appUrl), 'https://')) {
            return $appUrl;
        }

        return null;
    }
}
