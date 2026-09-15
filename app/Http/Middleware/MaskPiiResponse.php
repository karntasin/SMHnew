<?php

namespace App\Http\Middleware;

use App\Support\PiiMask;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Mask CID + นามสกุลผู้ป่วย ในทุก Inertia/JSON ของ web app
 * ระบบใหม่ที่อยู่ใต้ web middleware จะถูก mask อัตโนมัติ
 */
class MaskPiiResponse
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('pii.enabled', true)) {
            return $next($request);
        }

        $routeName = (string) optional($request->route())->getName();
        $rawRoutes = config('pii.raw_route_names', []);
        $allowRaw = $request->attributes->get('pii.allow_raw') === true
            || in_array($routeName, $rawRoutes, true);

        if ($allowRaw) {
            PiiMask::allowRawForRequest(true);
        }

        try {
            /** @var Response $response */
            $response = $next($request);

            if ($allowRaw) {
                return $response;
            }

            $content = $response->getContent();
            if (! is_string($content) || $content === '') {
                return $response;
            }

            // Inertia XHR / JSON page
            if ($this->isInertiaJson($request, $response, $content)) {
                return $this->maskJsonPayload($response, $content, propsOnly: true);
            }

            // API JSON ทั่วไป (รวม mra/search-patient, visit-data ฯลฯ)
            if ($this->isPlainJson($response, $content)) {
                return $this->maskJsonPayload($response, $content, propsOnly: false);
            }

            // First load HTML ของ Inertia
            if (str_contains($content, 'data-page=')) {
                $masked = preg_replace_callback(
                    '/data-page=(["\'])(.*?)\1/s',
                    function (array $matches): string {
                        $quote = $matches[1];
                        $raw = html_entity_decode($matches[2], ENT_QUOTES | ENT_HTML5, 'UTF-8');
                        $page = json_decode($raw, true);
                        if (! is_array($page) || ! isset($page['props']) || ! is_array($page['props'])) {
                            return $matches[0];
                        }
                        $page['props'] = PiiMask::maskTree($page['props']);
                        $encoded = json_encode($page, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                        if (! is_string($encoded)) {
                            return $matches[0];
                        }
                        $escaped = htmlspecialchars($encoded, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');

                        return 'data-page='.$quote.$escaped.$quote;
                    },
                    $content
                );
                if (is_string($masked)) {
                    $response->setContent($masked);
                }
            }

            return $response;
        } finally {
            PiiMask::allowRawForRequest(false);
        }
    }

    private function maskJsonPayload(Response $response, string $content, bool $propsOnly): Response
    {
        $payload = json_decode($content, true);
        if (! is_array($payload)) {
            return $response;
        }

        if ($propsOnly) {
            if (isset($payload['props']) && is_array($payload['props'])) {
                $payload['props'] = PiiMask::maskTree($payload['props']);
            }
        } else {
            $payload = PiiMask::maskTree($payload);
        }

        $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (is_string($encoded)) {
            $response->setContent($encoded);
        }

        return $response;
    }

    private function isInertiaJson(Request $request, Response $response, string $content): bool
    {
        if ($request->header('X-Inertia')) {
            return true;
        }

        $contentType = (string) $response->headers->get('Content-Type', '');

        return str_contains($contentType, 'application/json')
            && str_contains($content, '"component"')
            && str_contains($content, '"props"');
    }

    private function isPlainJson(Response $response, string $content): bool
    {
        $contentType = (string) $response->headers->get('Content-Type', '');
        if (! str_contains($contentType, 'application/json') && ! str_contains($contentType, '+json')) {
            // บาง response ตั้ง charset โดยไม่มี application/json ชัด — ดูจากตัวเนื้อหา
            $trim = ltrim($content);

            return (str_starts_with($trim, '{') || str_starts_with($trim, '['))
                && json_decode($content, true) !== null;
        }

        $trim = ltrim($content);

        return str_starts_with($trim, '{') || str_starts_with($trim, '[');
    }
}
