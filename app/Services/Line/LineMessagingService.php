<?php

namespace App\Services\Line;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class LineMessagingService
{
    public function isConfigured(): bool
    {
        return filled(config('services.line.messaging_token'));
    }

    /**
     * @return array{ok: bool, message: string}
     */
    public function pushText(string $lineUserId, string $text): array
    {
        if ($lineUserId === '' || trim($text) === '') {
            return ['ok' => false, 'message' => 'ไม่มีผู้รับหรือข้อความว่าง'];
        }

        if (! $this->isConfigured()) {
            return ['ok' => false, 'message' => 'ยังไม่ได้ตั้งค่า Messaging Channel Access Token'];
        }

        try {
            $response = Http::withToken((string) config('services.line.messaging_token'))
                ->acceptJson()
                ->timeout(15)
                ->post('https://api.line.me/v2/bot/message/push', [
                    'to' => $lineUserId,
                    'messages' => [
                        ['type' => 'text', 'text' => $text],
                    ],
                ]);
        } catch (\Throwable $e) {
            Log::warning('LINE push failed: '.$e->getMessage());

            return ['ok' => false, 'message' => 'เชื่อมต่อ LINE ไม่ได้: '.$e->getMessage()];
        }

        if ($response->successful()) {
            return ['ok' => true, 'message' => 'ส่งข้อความแล้ว'];
        }

        $body = $response->json();
        $detail = is_array($body) ? ($body['message'] ?? $response->body()) : $response->body();

        Log::warning('LINE push rejected', ['status' => $response->status(), 'body' => $response->body()]);

        return ['ok' => false, 'message' => (string) $detail];
    }

    public function welcomeText(string $name): string
    {
        $custom = trim((string) config('services.line.welcome_message'));
        if ($custom !== '') {
            return str_replace('{name}', $name, $custom);
        }

        $app = (string) config('app.name', 'ระบบ');

        return "สวัสดี คุณ{$name}\nสมัครสมาชิก {$app} สำเร็จแล้ว";
    }
}
