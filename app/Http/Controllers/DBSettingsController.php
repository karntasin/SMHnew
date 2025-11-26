<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;
use Inertia\Inertia;
use Illuminate\Support\Facades\Http;

class DBSettingsController extends Controller
{
    public function edit()
    {
        return Inertia::render('settingapp/Database', [
            'env' => [
                'DB_HOST' => env('DB_HOST'),
                'DB_PORT' => env('DB_PORT'),
                'DB_DATABASE' => env('DB_DATABASE'),
                'DB_USERNAME' => env('DB_USERNAME'),
                'DB_PASSWORD' => env('DB_PASSWORD'), // Be careful exposing this, maybe mask it?
                
                'HOSXP_DB_HOST' => env('HOSXP_DB_HOST'),
                'HOSXP_DB_PORT' => env('HOSXP_DB_PORT'),
                'HOSXP_DB_DATABASE' => env('HOSXP_DB_DATABASE'),
                'HOSXP_DB_USERNAME' => env('HOSXP_DB_USERNAME'),
                'HOSXP_DB_PASSWORD' => env('HOSXP_DB_PASSWORD'),

                'LINE_LOGIN_CHANNEL_ID' => env('LINE_LOGIN_CHANNEL_ID'),
                'LINE_LOGIN_CHANNEL_SECRET' => env('LINE_LOGIN_CHANNEL_SECRET'),
                'LINE_MESSAGING_CHANNEL_ACCESS_TOKEN' => env('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN'),
            ]
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

            'LINE_LOGIN_CHANNEL_ID' => 'nullable|string',
            'LINE_LOGIN_CHANNEL_SECRET' => 'nullable|string',
            'LINE_MESSAGING_CHANNEL_ACCESS_TOKEN' => 'nullable|string',
        ]);

        $this->updateEnv($data);

        return redirect()->back()->with('success', 'Database settings updated successfully.');
    }

    public function testConnection(Request $request)
    {
        $type = $request->input('type');
        $config = $request->input('config');

        if ($type === 'app') {
            try {
                // Create a temporary connection config
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
                return response()->json(['success' => true, 'message' => 'Connection successful!']);
            } catch (\Exception $e) {
                return response()->json(['success' => false, 'message' => 'Connection failed: ' . $e->getMessage()]);
            }
        } elseif ($type === 'hosxp') {
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
                return response()->json(['success' => true, 'message' => 'Connection successful!']);
            } catch (\Exception $e) {
                return response()->json(['success' => false, 'message' => 'Connection failed: ' . $e->getMessage()]);
            }
        } elseif ($type === 'line') {
             // Test LINE Messaging API
             $token = $config['LINE_MESSAGING_CHANNEL_ACCESS_TOKEN'];
             if (!$token) {
                 return response()->json(['success' => false, 'message' => 'Token is missing.']);
             }

             $response = Http::withHeaders([
                 'Authorization' => 'Bearer ' . $token,
             ])->get('https://api.line.me/v2/bot/info');

             if ($response->successful()) {
                 return response()->json(['success' => true, 'message' => 'LINE API Connection successful! Bot Name: ' . $response->json('displayName')]);
             } else {
                 return response()->json(['success' => false, 'message' => 'LINE API Connection failed: ' . $response->body()]);
             }
        }

        return response()->json(['success' => false, 'message' => 'Invalid test type.']);
    }

    protected function updateEnv($data)
    {
        $path = base_path('.env');

        if (file_exists($path)) {
            $env = file_get_contents($path);

            foreach ($data as $key => $value) {
                // If value contains spaces, quote it
                if (strpos($value, ' ') !== false && strpos($value, '"') === false) {
                    $value = '"' . $value . '"';
                }
                
                // If null, set to empty
                if ($value === null) {
                    $value = '';
                }

                // Check if key exists
                if (strpos($env, $key . '=') !== false) {
                    // Update existing key
                    $env = preg_replace("/^{$key}=.*/m", "{$key}={$value}", $env);
                } else {
                    // Add new key
                    $env .= "\n{$key}={$value}";
                }
            }

            file_put_contents($path, $env);
        }
    }
}
