<?php

namespace App\Services\FortiGate;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class FortiGateClient
{
    public function configured(): bool
    {
        return config('fortigate.enabled', true)
            && (string) config('fortigate.host') !== ''
            && (string) config('fortigate.api_token') !== '';
    }

    public function get(string $path, array $query = []): array
    {
        if (! $this->configured()) {
            throw new RuntimeException('FortiGate API is not configured (host/token).');
        }

        $url = rtrim((string) config('fortigate.host'), '/').'/'.ltrim($path, '/');

        /** @var Response $response */
        $response = $this->http()->get($url, $query);

        if ($response->status() === 404) {
            return [
                'ok' => false,
                'status' => 404,
                'body' => $response->json() ?? [],
                'message' => 'Endpoint not found (404)',
            ];
        }

        if (! $response->successful()) {
            Log::warning('FortiGate API error', [
                'path' => $path,
                'status' => $response->status(),
                'body' => mb_substr($response->body(), 0, 500),
            ]);

            throw new RuntimeException('FortiGate API HTTP '.$response->status().' for '.$path);
        }

        return [
            'ok' => true,
            'status' => $response->status(),
            'body' => $response->json() ?? [],
        ];
    }

    private function http(): PendingRequest
    {
        $request = Http::withToken((string) config('fortigate.api_token'))
            ->acceptJson()
            ->timeout(max(5, (int) config('fortigate.timeout_seconds', 20)))
            ->withHeaders(['User-Agent' => 'SMH-FortiGate-Monitor/1.0']);

        if (! config('fortigate.verify_ssl', false)) {
            $request = $request->withoutVerifying();
        }

        return $request;
    }
}
