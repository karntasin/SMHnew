<?php

if (! function_exists('app_route_url')) {
    function app_route_url(?string $route): ?string
    {
        if (! $route || $route === '#') {
            return $route === '#' ? '#' : null;
        }

        if (str_starts_with($route, 'http://') || str_starts_with($route, 'https://')) {
            return $route;
        }

        $path = str_starts_with($route, '/')
            ? $route
            : (function (string $route) {
                try {
                    return route($route, [], false);
                } catch (\Throwable) {
                    return null;
                }
            })($route);

        if (! $path) {
            return null;
        }

        $basePath = rtrim(parse_url(config('app.url'), PHP_URL_PATH) ?: '', '/');

        if ($basePath !== '' && $basePath !== '/' && ! str_starts_with($path, $basePath.'/') && $path !== $basePath) {
            $path = $basePath.(str_starts_with($path, '/') ? $path : '/'.$path);
        }

        return $path;
    }
}
