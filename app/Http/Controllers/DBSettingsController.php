<?php

namespace App\Http\Controllers;

use App\Services\Tunnel\PublicTunnelService;
use App\Support\EnvFile;
use App\Support\LineUrls;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class DBSettingsController extends Controller
{
    public function edit(PublicTunnelService $tunnel)
    {
        return Inertia::render('settingapp/Database', [
            'env' => [
                'DB_HOST' => env('DB_HOST'),
                'DB_PORT' => env('DB_PORT'),
                'DB_DATABASE' => env('DB_DATABASE'),
                'DB_USERNAME' => env('DB_USERNAME'),
                'DB_PASSWORD' => env('DB_PASSWORD'),

                'HOSXP_DB_HOST' => env('HOSXP_DB_HOST'),
                'HOSXP_DB_PORT' => env('HOSXP_DB_PORT'),
                'HOSXP_DB_DATABASE' => env('HOSXP_DB_DATABASE'),
                'HOSXP_DB_USERNAME' => env('HOSXP_DB_USERNAME'),
                'HOSXP_DB_PASSWORD' => env('HOSXP_DB_PASSWORD'),

                'LINE_INTEGRATION_ENABLED' => (bool) config('services.line.enabled'),
                'LINE_LOGIN_CHANNEL_ID' => env('LINE_LOGIN_CHANNEL_ID'),
                'LINE_LOGIN_CHANNEL_SECRET' => env('LINE_LOGIN_CHANNEL_SECRET'),
                'LINE_OAUTH_REDIRECT' => LineUrls::callback(),
                'LINE_MESSAGING_CHANNEL_ACCESS_TOKEN' => env('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN'),
                'LINE_MESSAGING_CHANNEL_SECRET' => env('LINE_MESSAGING_CHANNEL_SECRET'),
                'LINE_WELCOME_MESSAGE' => env('LINE_WELCOME_MESSAGE'),
                'LINE_OA_ADD_FRIEND_URL' => env('LINE_OA_ADD_FRIEND_URL'),

                'NGROK_AUTHTOKEN' => '',
                'NGROK_ADDR' => env('NGROK_ADDR', '8081'),
                'NGROK_BIN' => env('NGROK_BIN', base_path('ngrok.exe')),

                'CLOUDFLARE_TUNNEL_MODE' => env('CLOUDFLARE_TUNNEL_MODE', 'quick'),
                'CLOUDFLARE_PUBLIC_HOSTNAME' => env('CLOUDFLARE_PUBLIC_HOSTNAME', ''),
                'CLOUDFLARE_TUNNEL_CONFIG' => env('CLOUDFLARE_TUNNEL_CONFIG', base_path('deploy/cloudflare/config.yml')),
            ],
            'ngrok' => $tunnel->status(),
            'hasNgrokAuthtoken' => filled(config('ngrok.authtoken')),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'DB_HOST' => 'required|string',
            'DB_PORT' => 'required|string',
            'DB_DATABASE' => 'required|string',
            'DB_USERNAME' => 'required|string',
            'DB_PASSWORD' => 'nullable|string',

            'HOSXP_DB_HOST' => 'nullable|string',
            'HOSXP_DB_PORT' => 'nullable|string',
            'HOSXP_DB_DATABASE' => 'nullable|string',
            'HOSXP_DB_USERNAME' => 'nullable|string',
            'HOSXP_DB_PASSWORD' => 'nullable|string',

            'LINE_INTEGRATION_ENABLED' => 'nullable',
            'LINE_LOGIN_CHANNEL_ID' => 'nullable|string',
            'LINE_LOGIN_CHANNEL_SECRET' => 'nullable|string',
            'LINE_OAUTH_REDIRECT' => 'nullable|string',
            'LINE_MESSAGING_CHANNEL_ACCESS_TOKEN' => 'nullable|string',
            'LINE_MESSAGING_CHANNEL_SECRET' => 'nullable|string',
            'LINE_WELCOME_MESSAGE' => 'nullable|string',
            'LINE_OA_ADD_FRIEND_URL' => 'nullable|string',

            'NGROK_AUTHTOKEN' => 'nullable|string',
            'NGROK_ADDR' => 'nullable|string',
            'NGROK_BIN' => 'nullable|string',

            'CLOUDFLARE_TUNNEL_MODE' => 'nullable|in:quick,named',
            'CLOUDFLARE_PUBLIC_HOSTNAME' => 'nullable|string|max:255',
            'CLOUDFLARE_TUNNEL_CONFIG' => 'nullable|string|max:500',
        ]);

        $data['LINE_INTEGRATION_ENABLED'] = filter_var($request->input('LINE_INTEGRATION_ENABLED'), FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';

        if (! filled($data['NGROK_AUTHTOKEN'] ?? null) && filled(config('ngrok.authtoken'))) {
            unset($data['NGROK_AUTHTOKEN']);
        }

        EnvFile::set($data);

        return redirect()->back()->with('success', 'บันทึกการตั้งค่าแล้ว');
    }

    public function testConnection(Request $request)
    {
        $type = $request->input('type');
        $config = $request->input('config');

        if ($type === 'app') {
            try {
                Config::set('database.connections.test_app', [
                    'driver' => 'mysql',
                    'host' => $config['DB_HOST'],
                    'port' => $config['DB_PORT'],
                    'database' => $config['DB_DATABASE'],
                    'username' => $config['DB_USERNAME'],
                    'password' => $config['DB_PASSWORD'],
                    'charset' => 'utf8mb4',
                    'collation' => 'utf8mb4_unicode_ci',
                    'prefix' => '',
                    'strict' => true,
                    'engine' => null,
                ]);

                DB::connection('test_app')->getPdo();

                return response()->json(['success' => true, 'message' => 'เชื่อมต่อฐานข้อมูลแอปสำเร็จ']);
            } catch (\Exception $e) {
                return response()->json(['success' => false, 'message' => 'เชื่อมต่อไม่สำเร็จ: '.$e->getMessage()]);
            }
        }

        if ($type === 'hosxp') {
            try {
                Config::set('database.connections.test_hosxp', [
                    'driver' => 'mysql',
                    'host' => $config['HOSXP_DB_HOST'],
                    'port' => $config['HOSXP_DB_PORT'],
                    'database' => $config['HOSXP_DB_DATABASE'],
                    'username' => $config['HOSXP_DB_USERNAME'],
                    'password' => $config['HOSXP_DB_PASSWORD'],
                    'charset' => 'utf8',
                    'collation' => 'utf8_general_ci',
                    'prefix' => '',
                    'strict' => false,
                    'engine' => null,
                ]);

                DB::connection('test_hosxp')->getPdo();

                return response()->json(['success' => true, 'message' => 'เชื่อมต่อ HOSxP สำเร็จ']);
            } catch (\Exception $e) {
                return response()->json(['success' => false, 'message' => 'เชื่อมต่อไม่สำเร็จ: '.$e->getMessage()]);
            }
        }

        if ($type === 'line') {
            $token = $config['LINE_MESSAGING_CHANNEL_ACCESS_TOKEN'] ?? config('services.line.messaging_token');
            if (! $token) {
                return response()->json(['success' => false, 'message' => 'ยังไม่มี Messaging Access Token']);
            }

            $response = Http::withHeaders([
                'Authorization' => 'Bearer '.$token,
            ])->get('https://api.line.me/v2/bot/info');

            if ($response->successful()) {
                return response()->json(['success' => true, 'message' => 'LINE Messaging API พร้อมใช้ · Bot: '.$response->json('displayName')]);
            }

            return response()->json(['success' => false, 'message' => 'LINE API ไม่สำเร็จ: '.$response->body()]);
        }

        return response()->json(['success' => false, 'message' => 'Invalid test type.']);
    }

    public function ngrokStatus(PublicTunnelService $tunnel)
    {
        return response()->json($tunnel->status());
    }

    public function ngrokStart(Request $request, PublicTunnelService $tunnel)
    {
        $driver = $request->input('driver', 'cloudflare') === 'ngrok' ? 'ngrok' : 'cloudflare';
        $result = $tunnel->start($driver);
        $ok = empty($result['error']) && ! empty($result['public_url']);

        return response()->json($result + ['success' => $ok]);
    }

    public function ngrokStop(PublicTunnelService $tunnel)
    {
        return response()->json($tunnel->stop() + ['success' => true]);
    }
}
