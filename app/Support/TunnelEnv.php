<?php

namespace App\Support;

class TunnelEnv
{
    public static function persistPublicUrl(?string $public, string $driver = 'cloudflare'): void
    {
        if (! $public) {
            return;
        }

        $callback = rtrim($public, '/').LineUrls::tunnelAppPath().'/auth/line/callback';
        $host = parse_url($public, PHP_URL_HOST) ?: '';
        $stateful = (string) env('SANCTUM_STATEFUL_DOMAINS');
        if ($host !== '' && $stateful !== '' && ! str_contains($stateful, $host)) {
            $stateful = $host.','.$stateful;
        } elseif ($host !== '' && $stateful === '') {
            $stateful = $host;
        }

        EnvFile::set([
            'NGROK_ENABLED' => 'true',
            'NGROK_ADDR' => (string) config('ngrok.addr', '8081'),
            'NGROK_PUBLIC_URL' => $public,
            'TUNNEL_DRIVER' => $driver,
            'CLOUDFLARE_TUNNEL_MODE' => 'quick',
            'LINE_OAUTH_REDIRECT' => $callback,
            'SANCTUM_STATEFUL_DOMAINS' => $stateful,
        ]);

        config([
            'ngrok.enabled' => true,
            'ngrok.public_url' => $public,
            'ngrok.driver' => $driver,
            'services.line.redirect' => $callback,
            'cloudflare.tunnel_mode' => 'quick',
        ]);
    }

    public static function syncNamedTunnel(string $public): void
    {
        $public = rtrim($public, '/');
        $host = parse_url($public, PHP_URL_HOST) ?: '';
        $callback = $public.LineUrls::tunnelAppPath().'/auth/line/callback';
        $stateful = (string) env('SANCTUM_STATEFUL_DOMAINS');
        if ($host !== '' && $stateful !== '' && ! str_contains($stateful, $host)) {
            $stateful = $host.','.$stateful;
        } elseif ($host !== '' && $stateful === '') {
            $stateful = $host.',localhost,127.0.0.1';
        }

        EnvFile::set([
            'CLOUDFLARE_TUNNEL_MODE' => 'named',
            'CLOUDFLARE_PUBLIC_HOSTNAME' => $host,
            'NGROK_ENABLED' => 'true',
            'NGROK_PUBLIC_URL' => $public,
            'TUNNEL_DRIVER' => 'cloudflare',
            'LINE_OAUTH_REDIRECT' => $callback,
            'SANCTUM_STATEFUL_DOMAINS' => $stateful,
        ]);

        config([
            'ngrok.enabled' => true,
            'ngrok.public_url' => $public,
            'services.line.redirect' => $callback,
            'cloudflare.public_hostname' => $host,
            'cloudflare.tunnel_mode' => 'named',
        ]);
    }

    public static function clear(): void
    {
        EnvFile::set([
            'NGROK_ENABLED' => 'false',
            'NGROK_PUBLIC_URL' => '',
        ]);
        config(['ngrok.enabled' => false, 'ngrok.public_url' => '']);
    }
}
