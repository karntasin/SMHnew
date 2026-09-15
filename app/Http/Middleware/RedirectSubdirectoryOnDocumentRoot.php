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
            $query = $request->getQueryString();

            return redirect()->away(
                rtrim($request->getSchemeAndHttpHost(), '/').$stripped.($query ? '?'.$query : '')
            );
        }

        return $next($request);
    }
}
