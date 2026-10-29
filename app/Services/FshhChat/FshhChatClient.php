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
            return ['success' => false, 'error' => 'ยังไม่ได้ตั้งค่า S-Chat'];
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
            Log::warning('S-Chat sync failed: '.$e->getMessage(), ['action' => $action]);

            return ['success' => false, 'error' => $e->getMessage()];
        }

        $json = $response->json();
        if (! is_array($json)) {
            return ['success' => false, 'error' => 'S-Chat ตอบกลับไม่ถูกต้อง'];
        }

        if (! $response->successful() || ($json['success'] ?? false) === false) {
            Log::warning('S-Chat rejected', [
                'action' => $action,
                'status' => $response->status(),
                'body' => $json,
            ]);
        }

        return $json;
    }

    /**
     * Proxy audio to Workers AI Whisper via /api/transcribe.
     *
     * @return array{success: bool, text?: string, error?: string, code?: string}
     */
    public function transcribe(string $binary, string $filename = 'audio.webm', string $mime = 'audio/webm', int $timeout = 60): array
    {
        if (! $this->isConfigured()) {
            return ['success' => false, 'error' => 'ยังไม่ได้ตั้งค่า S-Chat / Workers', 'code' => 'NOT_CONFIGURED'];
        }

        try {
            $http = Http::withHeaders([
                'X-Chat-Secret' => (string) config('services.fshh_chat.secret'),
                'Accept' => 'application/json',
            ])->timeout($timeout);

            if (! config('services.fshh_chat.verify_ssl', true)) {
                $http = $http->withoutVerifying();
            }

            $response = $http->attach('audio', $binary, $filename)
                ->post(rtrim((string) config('services.fshh_chat.url'), '/').'/api/transcribe');
        } catch (\Throwable $e) {
            Log::warning('S-Chat transcribe failed: '.$e->getMessage());

            return ['success' => false, 'error' => $e->getMessage(), 'code' => 'NETWORK'];
        }

        $json = $response->json();
        if (! is_array($json)) {
            return ['success' => false, 'error' => 'แปลงเสียงตอบกลับไม่ถูกต้อง', 'code' => 'BAD_RESPONSE'];
        }

        if (! $response->successful()) {
            return [
                'success' => false,
                'error' => (string) ($json['error'] ?? 'แปลงเสียงไม่สำเร็จ'),
                'code' => (string) ($json['code'] ?? ($response->status() === 429 ? 'QUOTA' : 'AI_ERROR')),
            ];
        }

        return $json;
    }
}
