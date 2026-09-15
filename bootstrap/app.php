<?php

use App\Http\Middleware\ClearEnvSp3UnlockOutside;
use App\Http\Middleware\DetectSuspiciousRequests;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\MaskPiiResponse;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\ShareMenus;
use App\Http\Middleware\SetLocale;
use App\Http\Middleware\CheckMenuPermission;
use App\Http\Middleware\TrustProxies;
use App\Http\Middleware\EnsureProfileIsCompleted;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->trustProxies(at: '*');
        $middleware->redirectGuestsTo(fn () => url('/login'));
        $middleware->redirectUsersTo(fn () => url('/dashboard'));
        $middleware->validateCsrfTokens(except: [
            'line/webhook',
            'organization-chat/api',
        ]);
        
        $middleware->prepend(\App\Http\Middleware\RedirectSubdirectoryOnDocumentRoot::class);
        $middleware->append(SecurityHeaders::class);

        $middleware->web(append: [
            SetLocale::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            ShareMenus::class,
            ClearEnvSp3UnlockOutside::class,
            DetectSuspiciousRequests::class,
            MaskPiiResponse::class,
        ]);

        // Append EnsureProfileIsCompleted after auth middleware
        $middleware->appendToGroup('auth', [
            EnsureProfileIsCompleted::class,
        ]);

        $middleware->alias([
            'menu.permission' => CheckMenuPermission::class,
            'profile.completed' => EnsureProfileIsCompleted::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
