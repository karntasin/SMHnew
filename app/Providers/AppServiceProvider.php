<?php

namespace App\Providers;

use App\Listeners\ForwardDatabaseNotificationToFshhChat;
use App\Models\Menu;
use App\Models\User;
use App\Models\SettingApp;
use Spatie\Permission\Models\Role;
use App\Observers\GlobalActivityLogger;
use App\Support\TlsCaBundle;
use Illuminate\Notifications\Events\NotificationSent;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Http;
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
        TlsCaBundle::apply();
        if ($ca = TlsCaBundle::path()) {
            Http::globalOptions(['verify' => $ca]);
        }

        if ($appUrl = config('app.url')) {
            if ($this->app->runningInConsole()) {
                URL::forceRootUrl($appUrl);
            } else {
                // Keep the browser host (localhost vs LAN IP) and the real subdirectory
                // from SCRIPT_NAME — do not assume trycloudflare is always the 8081 vhost.
                $configuredPath = \App\Support\PublicHost::requestAppPath(request());
                config(['app.asset_url' => null]);
                $root = rtrim(request()->getSchemeAndHttpHost(), '/').$configuredPath;
                URL::forceRootUrl($root);
            }
        }

        // Force HTTPS in production, behind an HTTPS proxy, or on Cloudflare quick tunnel
        $host = strtolower((string) request()->getHost());
        $tunnelHost = \App\Support\PublicHost::isEphemeralTunnelHost($host);
        $namedHost = strtolower((string) (\App\Support\PublicHost::tunnelHostname() ?? ''));
        $namedTunnelHost = $namedHost !== '' && $host === $namedHost;

        if ($this->app->environment('production')
            || request()->header('X-Forwarded-Proto') === 'https'
            || $tunnelHost
            || $namedTunnelHost) {
            URL::forceScheme('https');
        }

        // LAN ใช้ HTTP — อย่าบังคับ Secure cookie จาก .env (TunnelEnv เคยเขียน true ทำให้ POST ได้ 419)
        if (! $this->app->runningInConsole()) {
            config([
                'session.secure' => request()->isSecure()
                    || request()->header('X-Forwarded-Proto') === 'https'
                    || $tunnelHost
                    || $namedTunnelHost,
            ]);

            // trycloudflare hostname เปลี่ยนทุกครั้งที่เปิดอุโมงค์ — อย่าผูก cookie กับโดเมนเก่า
            if ($tunnelHost) {
                config(['session.domain' => null]);
            }
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

        Event::listen(NotificationSent::class, ForwardDatabaseNotificationToFshhChat::class);
    }
}
