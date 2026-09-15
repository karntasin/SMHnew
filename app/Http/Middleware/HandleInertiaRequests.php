<?php

namespace App\Http\Middleware;

use App\Models\SettingApp;
use App\Services\HosxpConnectionService;
use Closure;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Keep Inertia history URLs under the subdirectory (e.g. /sss/my-app/public/...).
     * Without this, browser Back can navigate to /km/dashboard and 404 on XAMPP.
     */
    public function urlResolver(): Closure
    {
        return function (Request $request): string {
            $basePath = \App\Support\PublicHost::requestAppPath($request);
            $pathInfo = $request->getPathInfo() ?: '/';
            $query = $request->getQueryString();

            if ($basePath !== '' && $basePath !== '/') {
                $url = $pathInfo === '/'
                    ? $basePath.'/'
                    : $basePath.$pathInfo;
            } else {
                $url = Str::start(Str::after($request->fullUrl(), $request->getSchemeAndHttpHost()), '/');
                $url = Str::before($url, '?') ?: '/';
            }

            $rawUri = Str::before($request->getRequestUri(), '?');

            if (Str::endsWith($rawUri, '/')) {
                $url = Str::finish($url, '/');
            }

            return $query ? $url.'?'.$query : $url;
        };
    }

    /**
     * Define the props that are shared by default.
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        return array_merge(parent::share($request), [
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user(),
            ],
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
                'import_failures' => session('import_failures'),
            ],
            'setting' => fn() => SettingApp::first(),
            'csrf_token' => csrf_token(),
            'locale' => app()->getLocale(),
            'translations' => function () {
                $locale = app()->getLocale();
                $path = lang_path("{$locale}.json");
                return file_exists($path) ? json_decode(file_get_contents($path), true) : [];
            },
            'hosxp_status' => function () use ($request) {
                if (! $request->user()) {
                    return null;
                }
                $service = app(HosxpConnectionService::class);
                $status = $service->getCachedStatus();
                if (! ($status['checked_at'] ?? null)) {
                    $status = $service->check();
                }
                if ($status['connected'] ?? true) {
                    return null;
                }

                return $status;
            },
            'can_server_monitor' => fn () => (bool) $request->user()?->can('server-monitor.index'),
            'lineLoginEnabled' => (bool) config('services.line.enabled'),
            'fshhChat' => fn () => $request->user() ? [
                'enabled' => filled(config('services.fshh_chat.url')) && filled(config('services.fshh_chat.secret')),
                'openUrl' => url('/fshh-chat/open'),
            ] : null,
        ]);
    }
}
