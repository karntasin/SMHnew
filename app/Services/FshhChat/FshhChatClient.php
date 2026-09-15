<?php

namespace App\Services\FshhChat;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FshhChatClient
{
    public function isConfigured(): bool
    {
        return filled(config('services.fshh_chat.url')) && filled(config('services.fshh_chat.secret'));
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function call(string $action, array $payload = [], int $timeout = 12): array
    {
        if (! $this->isConfigured()) {
            return ['success' => false, 'error' => 'ยังไม่ได้ตั้งค่า FSHH Chat'];
        }

        try {
            $http = Http::withHeaders([
                'X-Chat-Secret' => (string) config('services.fshh_chat.secret'),
                'Accept' => 'application/json',
            ])->timeout($timeout);

            if (! config('services.fshh_chat.verify_ssl', true)) {
                $http = $http->withoutVerifying();
            }

            $response = $http->post(rtrim((string) config('services.fshh_chat.url'), '/').'/api/internal', array_merge(
                ['action' => $action],
                $payload
            ));
        } catch (\Throwable $e) {
            Log::warning('FSHH Chat sync failed: '.$e->getMessage(), ['action' => $action]);

            return ['success' => false, 'error' => $e->getMessage()];
        }

        $json = $response->json();
        if (! is_array($json)) {
            return ['success' => false, 'error' => 'FSHH Chat ตอบกลับไม่ถูกต้อง'];
        }

        if (! $response->successful() || ($json['success'] ?? false) === false) {
            Log::warning('FSHH Chat rejected', [
                'action' => $action,
                'status' => $response->status(),
                'body' => $json,
            ]);
        }

        return $json;
    }
}
