<?php

return [
    'enabled' => (bool) env('NGROK_ENABLED', false),
    'authtoken' => env('NGROK_AUTHTOKEN'),
    'bin' => env('NGROK_BIN', base_path('ngrok.exe')),
    'cloudflared_bin' => env('CLOUDFLARED_BIN', base_path('cloudflared.exe')),
    'driver' => env('TUNNEL_DRIVER', 'cloudflare'),
    'addr' => env('NGROK_ADDR', '8081'),
    'public_url' => env('NGROK_PUBLIC_URL'),
    'api' => env('NGROK_API', 'http://127.0.0.1:4040'),
];
