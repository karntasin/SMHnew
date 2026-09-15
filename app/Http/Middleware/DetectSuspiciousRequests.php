<?php

namespace App\Http\Middleware;

use App\Services\Security\SecurityMonitor;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class DetectSuspiciousRequests
{
    public function __construct(
        protected readonly SecurityMonitor $monitor,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $haystack = strtolower(implode(' ', [
            $request->getRequestUri(),
            $request->header('User-Agent', ''),
            urldecode((string) $request->getQueryString()),
        ]));

        $patterns = [
            'union select' => 'SQL injection pattern',
            'information_schema' => 'SQL injection pattern',
            'sleep(' => 'SQL injection pattern',
            '../' => 'path traversal',
            '..\\' => 'path traversal',
            '<script' => 'XSS probe',
            'wp-admin' => 'scanner probe',
            'phpmyadmin' => 'scanner probe',
            '/.env' => 'secrets probe',
            'actuator' => 'scanner probe',
        ];

        foreach ($patterns as $needle => $reason) {
            if (str_contains($haystack, $needle)) {
                $this->monitor->recordSuspiciousRequest(
                    (string) $request->ip(),
                    $request->path(),
                    $reason,
                    $request->user()?->id,
                );
                break;
            }
        }

        /** @var Response $response */
        $response = $next($request);

        if ($response->getStatusCode() === 403 && $request->user()) {
            $this->monitor->recordForbidden(
                (string) $request->ip(),
                $request->path(),
                $request->user()->id,
            );
        }

        if ($this->looksLikeExport($request) && $response->isSuccessful()) {
            $this->monitor->recordExport(
                (string) $request->ip(),
                $request->path(),
                $request->user()?->id,
            );
        }

        return $response;
    }

    private function looksLikeExport(Request $request): bool
    {
        $path = strtolower($request->path());
        $name = strtolower((string) optional($request->route())->getName());

        return str_contains($path, 'export')
            || str_contains($path, 'download')
            || str_contains($name, 'export')
            || str_contains($name, 'download')
            || $request->query('export') !== null
            || $request->query('format') === 'xlsx'
            || $request->query('format') === 'csv';
    }
}
