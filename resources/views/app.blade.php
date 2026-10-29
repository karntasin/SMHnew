<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    @php
        $setting = $page['props']['setting'] ?? null;
        $appName = $setting['nama_app'] ?? config('app.name', 'Laravel');
        $favicon = $setting['favicon'] ?? null;
    @endphp

    <title inertia>{{ $appName }}</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet">

    @if (!empty($favicon))
        <link rel="icon" href="{{ asset('storage/' . $favicon) }}" type="image/png">
    @else
        <link rel="icon" href="{{ asset('logosmh.png') }}" type="image/png">
    @endif

    <meta name="app-base-url" content="{{ rtrim(asset(''), '/') }}">

    <!-- PWA & Mobile Web App: Dynamic Manifest & Identity separation for Calendar vs SMH -->
    @if (request()->is('calendar*') || request()->is('cal*'))
        <meta name="theme-color" content="#0284c7">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="default">
        <meta name="apple-mobile-web-app-title" content="ปฏิทิน SMH">
        <link rel="apple-touch-icon" href="{{ asset('icons/calendar-192.png') }}">
        <link rel="manifest" href="{{ asset('calendar-manifest.webmanifest') }}">
    @else
        <meta name="theme-color" content="#7c3aed">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="default">
        <meta name="apple-mobile-web-app-title" content="SMH">
        <link rel="apple-touch-icon" href="{{ asset('logosmh.png') }}">
        <link rel="manifest" href="{{ asset('manifest.json') }}">
    @endif

    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(err => {
                    console.log('SW registration skipped or error:', err);
                });
            });
        }
    </script>


    @routes
    @viteReactRefresh
    @vite(['resources/js/app.tsx'])
    @inertiaHead
</head>

<body class="font-sans">
    @inertia
</body>

</html>
