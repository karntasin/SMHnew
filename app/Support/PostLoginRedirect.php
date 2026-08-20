<?php

namespace App\Support;

use Illuminate\Http\Request;

class PostLoginRedirect
{
    public static function isTunnelHost(?string $host): bool
    {
        return PublicHost::isEphemeralTunnelHost($host);
    }

    /**
     * Base URL users should land on after login (LAN / APP_URL), never the tunnel host.
     */
    public static function preferredBase(?Request $request = null): string
    {
        $request ??= request();
        $appUrl = rtrim((string) config('app.url'), '/');
        $appHost = strtolower((string) (parse_url($appUrl, PHP_URL_HOST) ?: ''));

        if ($request && ! self::isTunnelHost($request->getHost())) {
            $path = LineUrls::appPath();
            $base = rtrim($request->getSchemeAndHttpHost(), '/').$path;
            if ($base !== '') {
                return $base;
            }
        }

        if ($appUrl !== '' && ! self::isTunnelHost($appHost)) {
            return $appUrl;
        }

        return $appUrl !== '' ? $appUrl : rtrim((string) $request?->root(), '/');
    }

    public static function to(string $path = 'dashboard', ?Request $request = null): string
    {
        $path = '/'.ltrim($path, '/');

        return self::preferredBase($request).$path;
    }

    public static function sanitizeIntended(?string $intended, string $fallbackPath = 'dashboard', ?Request $request = null): string
    {
        $fallback = self::to($fallbackPath, $request);

        if (! is_string($intended) || $intended === '') {
            return $fallback;
        }

        if (str_starts_with($intended, '/')) {
            $basePath = LineUrls::appPath();
            if ($basePath !== '' && $intended !== $basePath && ! str_starts_with($intended, $basePath.'/')) {
                $intended = $basePath.$intended;
            }

            return self::preferredBase($request).$intended;
        }

        $host = parse_url($intended, PHP_URL_HOST);
        if (self::isTunnelHost($host)) {
            return $fallback;
        }

        $appHost = parse_url((string) config('app.url'), PHP_URL_HOST);
        $requestHost = $request?->getHost();
        if ($host && $appHost && strcasecmp((string) $host, (string) $appHost) !== 0
            && $requestHost && strcasecmp((string) $host, (string) $requestHost) !== 0) {
            return $fallback;
        }

        return $intended;
    }
}
