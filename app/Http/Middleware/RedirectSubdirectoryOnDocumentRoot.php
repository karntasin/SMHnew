<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Cloudflare quick tunnel (8081 vhost) มี DocumentRoot ที่ public
 * แต่คนมักเปิด URL แบบ XAMPP /sss/my-app/public/login → Laravel 404
 */
class RedirectSubdirectoryOnDocumentRoot
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->getBasePath() !== '') {
            return $next($request);
        }

        $path = $request->getPathInfo() ?: '/';
        $candidates = array_values(array_unique(array_filter([
            rtrim((string) (parse_url((string) config('app.url'), PHP_URL_PATH) ?: ''), '/'),
            '/sss/my-app/public',
        ])));

        foreach ($candidates as $configured) {
            if ($configured === '' || $configured === '/') {
                continue;
            }

            if ($path !== $configured && ! str_starts_with($path, $configured.'/')) {
                continue;
            }

            $stripped = substr($path, strlen($configured)) ?: '/';

            // หากเป็น static asset ที่มีไฟล์อยู่จริงใน public/ (เช่น /build/assets/*.js) ให้ serve ตรงทันที
            // เพื่อป้องกันปัญหา browser ES Module dynamic import ติด 302 redirect หรือ mime-type เพี้ยนจนเกิด ERR_ABORTED
            $staticFile = public_path(ltrim($stripped, '/'));
            if (is_file($staticFile) && ! str_ends_with($staticFile, '.php')) {
                $ext = strtolower(pathinfo($staticFile, PATHINFO_EXTENSION));
                $mimeTypes = [
                    'js' => 'application/javascript; charset=utf-8',
                    'mjs' => 'application/javascript; charset=utf-8',
                    'css' => 'text/css; charset=utf-8',
                    'svg' => 'image/svg+xml',
                    'png' => 'image/png',
                    'jpg' => 'image/jpeg',
                    'jpeg' => 'image/jpeg',
                    'webp' => 'image/webp',
                    'gif' => 'image/gif',
                    'ico' => 'image/x-icon',
                    'woff' => 'font/woff',
                    'woff2' => 'font/woff2',
                    'ttf' => 'font/ttf',
                    'json' => 'application/json; charset=utf-8',
                ];
                $headers = [
                    'Cache-Control' => 'public, max-age=31536000, immutable',
                ];
                if (isset($mimeTypes[$ext])) {
                    $headers['Content-Type'] = $mimeTypes[$ext];
                }

                return response()->file($staticFile, $headers);
            }
            $query = $request->getQueryString();

            return redirect()->away(
                rtrim($request->getSchemeAndHttpHost(), '/').$stripped.($query ? '?'.$query : '')
            );
        }

        return $next($request);
    }
}
