<?php

use App\Http\Middleware\HandleInertiaRequests;
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
        
        $middleware->web(append: [
            SetLocale::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            ShareMenus::class,
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
