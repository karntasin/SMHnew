<?php

namespace App\Providers;

use App\Models\Menu;
use App\Models\User;
use App\Models\SettingApp;
use Spatie\Permission\Models\Role;
use App\Observers\GlobalActivityLogger;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if ($appUrl = config('app.url')) {
            if ($this->app->runningInConsole()) {
                URL::forceRootUrl($appUrl);
            } else {
                // Keep the browser host (localhost vs LAN IP) but preserve the subdirectory from APP_URL.
                $configuredPath = rtrim(parse_url($appUrl, PHP_URL_PATH) ?: '', '/');
                $host = strtolower((string) request()->getHost());
                if (\App\Support\PublicHost::isEphemeralTunnelHost($host)
                    && \App\Support\LineUrls::tunnelServesFromDocumentRoot()) {
                    $configuredPath = '';
                    config(['app.asset_url' => null]);
                }
                $root = rtrim(request()->getSchemeAndHttpHost(), '/').$configuredPath;
                URL::forceRootUrl($root);
            }
        }

        // Force HTTPS in production, behind an HTTPS proxy, or on Cloudflare quick tunnel
        $host = strtolower((string) request()->getHost());
        $tunnelHost = \App\Support\PublicHost::isEphemeralTunnelHost($host);

        if ($this->app->environment('production')
            || request()->header('X-Forwarded-Proto') === 'https'
            || $tunnelHost) {
            URL::forceScheme('https');
        }

        // LAN ใช้ HTTP — อย่าบังคับ Secure cookie จาก .env (TunnelEnv เคยเขียน true ทำให้ POST ได้ 419)
        if (! $this->app->runningInConsole()) {
            config(['session.secure' => request()->isSecure()
                || request()->header('X-Forwarded-Proto') === 'https'
                || $tunnelHost]);
        }

        Gate::before(function ($user, $ability) {
            if ($user?->hasAnyRole(['admin', 'superUser'])) {
                return true;
            }

            return null;
        });

        User::observe(GlobalActivityLogger::class);
        Role::observe(GlobalActivityLogger::class);
        Permission::observe(GlobalActivityLogger::class);
        Menu::observe(GlobalActivityLogger::class);
        SettingApp::observe(GlobalActivityLogger::class);
    }
}
