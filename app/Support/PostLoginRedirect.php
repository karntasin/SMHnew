<?php

namespace App\Support;

use Illuminate\Http\Request;

class PostLoginRedirect
{
    public static function isTunnelHost(?string $host): bool
    {
        return PublicHost::isEphemeralTunnelHost($host);
    }

    public static function isPublicTunnelHost(?string $host): bool
    {
        $host = strtolower((string) $host);
        if ($host === '') {
            return false;
        }

        if (PublicHost::isEphemeralTunnelHost($host)) {
            return true;
        }

        $named = PublicHost::tunnelHostname();

        return $named !== null && $host === strtolower($named);
    }

    /** Origin + path ที่เบราว์เซอร์นี้เปิดอยู่ (LAN ต้องมี /sss/my-app/public) */
    public static function normalizeBase(?string $base, ?Request $request = null): string
    {
        $request ??= request();
        $appUrl = rtrim((string) config('app.url'), '/');
        $appPath = LineUrls::appPath();
        $appHost = strtolower((string) (parse_url($appUrl, PHP_URL_HOST) ?: ''));

        $base = is_string($base) ? rtrim($base, '/') : '';
        if ($base === '') {
            return self::preferredBase($request);
        }

        $parts = parse_url($base);
        if (! is_array($parts) || empty($parts['host'])) {
            return self::preferredBase($request);
        }

        $scheme = $parts['scheme'] ?? 'http';
        $host = strtolower((string) $parts['host']);
        $port = isset($parts['port']) ? ':'.$parts['port'] : '';
        $path = rtrim((string) ($parts['path'] ?? ''), '/');

        if (self::isPublicTunnelHost($host)) {
            if ($appPath !== '' && ($path === $appPath || str_starts_with($path, $appPath.'/'))) {
                $path = substr($path, strlen($appPath)) ?: '';
            }

            return $scheme.'://'.$host.$port.$path;
        }

        if ($appPath !== '' && ($host === $appHost || $path === '')) {
            if ($path === '' || $path === '/' || ($path !== $appPath && ! str_starts_with($path, $appPath.'/'))) {
                $path = $appPath;
            }
        }

        return $scheme.'://'.$host.$port.$path;
    }

    public static function join(?string $base, string $path, ?Request $request = null): string
    {
        return self::normalizeBase($base, $request).'/'.ltrim($path, '/');
    }

    /**
     * Base URL for this browser request: LAN keeps /sss/my-app/public,
     * named tunnel stays on fshh-app.online, quick tunnel falls back to APP_URL.
     */
    public static function preferredBase(?Request $request = null): string
    {
        $request ??= request();
        $appUrl = rtrim((string) config('app.url'), '/');

        if ($request && self::isTunnelHost($request->getHost())) {
            if ($appUrl !== '' && ! self::isTunnelHost(parse_url($appUrl, PHP_URL_HOST))) {
                return $appUrl;
            }

            return $appUrl !== '' ? $appUrl : rtrim((string) $request->root(), '/');
        }

        if ($request) {
            $path = PublicHost::requestAppPath($request);
            if ($path === '' && ! self::isPublicTunnelHost($request->getHost())) {
                $path = LineUrls::appPath();
            }

            return rtrim($request->getSchemeAndHttpHost(), '/').$path;
        }

        return $appUrl;
    }

    /**
     * Host ที่ผู้ใช้เปิดอยู่ตอนนี้ — login จากอุโมงค์ต้องอยู่บนอุโมงค์ (Inertia XHR ข้าม origin ไม่ได้)
     */
    public static function currentBase(?Request $request = null): string
    {
        $request ??= request();
        if (! $request) {
            return self::preferredBase();
        }

        $path = PublicHost::requestAppPath($request);
        if ($path === '' && ! self::isPublicTunnelHost($request->getHost())) {
            $path = LineUrls::appPath();
        }

        return rtrim($request->getSchemeAndHttpHost(), '/').$path;
    }

    public static function to(string $path = 'dashboard', ?Request $request = null): string
    {
        return self::join(self::preferredBase($request), $path, $request);
    }

    public static function toCurrent(string $path = 'dashboard', ?Request $request = null): string
    {
        $path = '/'.ltrim($path, '/');

        return self::currentBase($request).$path;
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

    /**
     * After email/password login on the same browser tab (including trycloudflare).
     */
    public static function sanitizeIntendedOnCurrentHost(?string $intended, string $fallbackPath = 'dashboard', ?Request $request = null): string
    {
        $request ??= request();
        $fallback = self::toCurrent($fallbackPath, $request);

        if (! is_string($intended) || $intended === '') {
            return $fallback;
        }

        $requestPath = PublicHost::requestAppPath($request);
        $appPath = LineUrls::appPath();

        if (str_starts_with($intended, '/')) {
            if ($requestPath === '' && $appPath !== '' && ($intended === $appPath || str_starts_with($intended, $appPath.'/'))) {
                $intended = substr($intended, strlen($appPath)) ?: '/';
            } elseif ($requestPath !== '' && $intended !== $requestPath && ! str_starts_with($intended, $requestPath.'/')) {
                $intended = $requestPath.$intended;
            }

            return self::currentBase($request).$intended;
        }

        $host = parse_url($intended, PHP_URL_HOST);
        $requestHost = $request?->getHost();
        if ($host && $requestHost && strcasecmp((string) $host, (string) $requestHost) === 0) {
            return $intended;
        }

        return $fallback;
    }

    public static function isGeneralUser(object $user): bool
    {
        if (method_exists($user, 'hasAnyRole') && $user->hasAnyRole(['admin', 'superUser'])) {
            return false;
        }

        if (method_exists($user, 'hasRole')) {
            return $user->hasRole('user');
        }

        return true;
    }

    public static function destinationAfterRegistration(object $user, ?Request $request = null): string
    {
        return self::toCurrent('dashboard', $request);
    }
}
