<?php

namespace App\Services\Telegram;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramBotService
{
    public function isConfigured(): bool
    {
        return filled(config('services.telegram.bot_token'))
            && filled(config('services.telegram.chat_id'));
    }

    public function defaultChatId(): ?string
    {
        return self::firstFilled((string) config('services.telegram.chat_id', ''));
    }

    public static function firstFilled(string ...$values): ?string
    {
        foreach ($values as $value) {
            $trimmed = trim($value);
            if ($trimmed !== '') {
                return $trimmed;
            }
        }

        return null;
    }

    public static function firstLikelyBotToken(string ...$values): ?string
    {
        foreach ($values as $value) {
            $trimmed = trim($value);
            if (self::isLikelyBotToken($trimmed)) {
                return $trimmed;
            }
        }

        return null;
    }

    public static function firstLikelyChatId(string ...$values): ?string
    {
        foreach ($values as $value) {
            $trimmed = trim($value);
            if (self::isLikelyChatId($trimmed)) {
                return $trimmed;
            }
        }

        return null;
    }

    public static function isLikelyBotToken(?string $token): bool
    {
        $token = trim((string) $token);

        return (bool) preg_match('/^\d{6,}:[A-Za-z0-9_-]{20,}$/', $token);
    }

    public static function isLikelyChatId(?string $chatId): bool
    {
        $chatId = trim((string) $chatId);

        return (bool) preg_match('/^-?\d{5,}$/', $chatId);
    }

    /**
     * @return array{ok: bool, message: string, message_id: ?int}
     */
    public function sendMessage(
        ?string $chatId,
        string $text,
        bool $disablePreview = true,
        ?string $parseMode = 'HTML',
        ?string $botToken = null,
    ): array {
        $chatId = trim((string) ($chatId ?: $this->defaultChatId()));
        $text = trim($text);

        if ($chatId === '' || $text === '') {
            return ['ok' => false, 'message' => 'ไม่มีผู้รับหรือข้อความว่าง', 'message_id' => null];
        }

        $token = self::firstLikelyBotToken(
            (string) ($botToken ?? ''),
            (string) config('services.telegram.bot_token', ''),
        );
        if ($token === null) {
            return ['ok' => false, 'message' => 'ยังไม่ได้ตั้งค่า TELEGRAM_BOT_TOKEN ที่ถูกต้อง', 'message_id' => null];
        }

        $payload = [
            'chat_id' => $chatId,
            'text' => $text,
            'disable_web_page_preview' => $disablePreview,
        ];
        if ($parseMode) {
            $payload['parse_mode'] = $parseMode;
        }

        try {
            $response = Http::asForm()
                ->acceptJson()
                ->timeout(20)
                ->post("https://api.telegram.org/bot{$token}/sendMessage", $payload);
        } catch (\Throwable $e) {
            Log::warning('Telegram send failed: '.$e->getMessage());

            return ['ok' => false, 'message' => 'เชื่อมต่อ Telegram ไม่ได้: '.$e->getMessage(), 'message_id' => null];
        }

        if ($response->successful() && ($response->json('ok') === true)) {
            return [
                'ok' => true,
                'message' => 'ส่งข้อความแล้ว',
                'message_id' => (int) ($response->json('result.message_id') ?? 0) ?: null,
            ];
        }

        // ถ้า HTML พัง ให้ลองส่ง plain text สำรอง
        if ($parseMode && ($response->json('error_code') === 400 || $response->status() === 400)) {
            Log::warning('Telegram HTML rejected, retrying plain', ['body' => $response->body()]);

            return $this->sendMessage($chatId, strip_tags($text), $disablePreview, null, $token);
        }

        $detail = (string) ($response->json('description') ?? $response->body());
        Log::warning('Telegram send rejected', [
            'status' => $response->status(),
            'body' => $response->body(),
        ]);

        if ($response->status() === 404 || strcasecmp($detail, 'Not Found') === 0) {
            $detail = 'Bot Token ไม่ถูกต้องหรือถูกเพิกถอน (Telegram: Not Found)';
        }

        return ['ok' => false, 'message' => $detail, 'message_id' => null];
    }

    public static function e(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    /**
     * @return list<string>
     */
    public function chunkText(string $text, int $limit = 3900): array
    {
        $text = trim($text);
        if ($text === '') {
            return [];
        }
        if (mb_strlen($text) <= $limit) {
            return [$text];
        }

        $chunks = [];
        $parts = preg_split("/\n{2,}/u", $text) ?: [$text];
        $buf = '';
        foreach ($parts as $part) {
            $candidate = $buf === '' ? $part : $buf."\n\n".$part;
            if (mb_strlen($candidate) <= $limit) {
                $buf = $candidate;
                continue;
            }
            if ($buf !== '') {
                $chunks[] = $buf;
            }
            if (mb_strlen($part) <= $limit) {
                $buf = $part;
                continue;
            }
            foreach (mb_str_split($part, $limit) as $slice) {
                $chunks[] = $slice;
            }
            $buf = '';
        }
        if ($buf !== '') {
            $chunks[] = $buf;
        }

        return $chunks;
    }
}
