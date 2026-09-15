<?php

namespace App\Services\Pharmacy;

use App\Services\Telegram\TelegramBotService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class EgfrDrugAlertTelegramNotifier
{
    public function __construct(
        private readonly EgfrDrugAlertService $alerts,
        private readonly TelegramBotService $telegram,
    ) {}

    public function isEnabled(): bool
    {
        return (bool) config('services.telegram.egfr_alerts.enabled', false)
            && $this->telegram->isConfigured();
    }

    /**
     * @return array{
     *   ok: bool,
     *   skipped: bool,
     *   message: string,
     *   scanned: int,
     *   new: int,
     *   sent: int
     * }
     */
    public function notify(bool $force = false, ?int $lookbackDays = null): array
    {
        if (! $this->isEnabled() && ! $force) {
            return [
                'ok' => false,
                'skipped' => true,
                'message' => 'ยังไม่ได้เปิด TELEGRAM_EGFR_ALERTS_ENABLED หรือยังไม่ตั้งค่า bot/chat',
                'scanned' => 0,
                'new' => 0,
                'sent' => 0,
            ];
        }

        if (! $this->telegram->isConfigured()) {
            return [
                'ok' => false,
                'skipped' => true,
                'message' => 'ยังไม่ได้ตั้งค่า TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID',
                'scanned' => 0,
                'new' => 0,
                'sent' => 0,
            ];
        }

        $days = $lookbackDays ?? (int) config('services.telegram.egfr_alerts.lookback_days', 0);
        $days = max(0, min(30, $days));
        $end = now('Asia/Bangkok')->toDateString();
        $start = now('Asia/Bangkok')->subDays($days)->toDateString();

        $result = $this->alerts->scan($start, $end, null, 500);
        if (! ($result['connected'] ?? false)) {
            $msg = (string) ($result['connection']['message'] ?? 'เชื่อมต่อ HOSxP ไม่ได้');

            return [
                'ok' => false,
                'skipped' => false,
                'message' => $msg,
                'scanned' => 0,
                'new' => 0,
                'sent' => 0,
            ];
        }

        $allowed = $this->severitySet();
        $candidates = array_values(array_filter(
            $result['alerts'] ?? [],
            static fn (array $row) => in_array((string) ($row['severity'] ?? ''), $allowed, true)
        ));

        $fresh = [];
        foreach ($candidates as $row) {
            $key = $this->dedupeKey($row);
            if (! $force && Cache::has($key)) {
                continue;
            }
            $fresh[] = $row;
        }

        if ($fresh === []) {
            return [
                'ok' => true,
                'skipped' => false,
                'message' => 'ไม่มีรายการใหม่ที่ต้องแจ้ง',
                'scanned' => count($candidates),
                'new' => 0,
                'sent' => 0,
            ];
        }

        $maxItems = max(1, min(50, (int) config('services.telegram.egfr_alerts.max_items', 20)));
        $toSend = array_slice($fresh, 0, $maxItems);
        $mode = strtolower((string) config('services.telegram.egfr_alerts.mode', 'per_item'));
        $sent = 0;

        if ($mode === 'digest') {
            $extra = count($fresh) - count($toSend);
            $text = $this->formatDigest($toSend, $extra, $start, $end);
            foreach ($this->telegram->chunkText($text) as $chunk) {
                $res = $this->telegram->sendMessage(null, $chunk);
                if (! ($res['ok'] ?? false)) {
                    Log::warning('Egfr Telegram notify failed: '.($res['message'] ?? ''));

                    return [
                        'ok' => false,
                        'skipped' => false,
                        'message' => (string) ($res['message'] ?? 'ส่งไม่สำเร็จ'),
                        'scanned' => count($candidates),
                        'new' => count($fresh),
                        'sent' => $sent,
                    ];
                }
                $sent++;
            }
            foreach ($toSend as $row) {
                Cache::put($this->dedupeKey($row), now()->toIso8601String(), now()->addDays(14));
            }
        } else {
            // แจ้งทีละใบสั่ง — ใกล้เคียง “ทุกครั้งที่แพทย์สั่งยาแล้วเข้าเงื่อนไข”
            foreach ($toSend as $row) {
                $text = $this->formatSingle($row);
                $res = $this->telegram->sendMessage(null, $text);
                if (! ($res['ok'] ?? false)) {
                    Log::warning('Egfr Telegram notify failed: '.($res['message'] ?? ''));

                    return [
                        'ok' => false,
                        'skipped' => false,
                        'message' => (string) ($res['message'] ?? 'ส่งไม่สำเร็จ'),
                        'scanned' => count($candidates),
                        'new' => count($fresh),
                        'sent' => $sent,
                    ];
                }
                Cache::put($this->dedupeKey($row), now()->toIso8601String(), now()->addDays(14));
                $sent++;
                usleep(200_000);
            }
        }

        $pending = count($fresh) - count($toSend);

        return [
            'ok' => true,
            'skipped' => false,
            'message' => $pending > 0
                ? "ส่ง {$sent} รายการ (เหลือรอรอบถัดไป {$pending})"
                : "ส่งแจ้งเตือน {$sent} รายการ",
            'scanned' => count($candidates),
            'new' => count($fresh),
            'sent' => $sent,
        ];
    }

    /** @return list<string> */
    private function severitySet(): array
    {
        $raw = (string) config('services.telegram.egfr_alerts.severities', 'contraindicated,alert,dose_exceeded');
        $parts = array_values(array_filter(array_map(
            static fn (string $s) => strtolower(trim($s)),
            explode(',', $raw)
        )));

        return $parts !== [] ? $parts : ['contraindicated', 'alert', 'dose_exceeded'];
    }

    /** @param array<string, mixed> $row */
    private function dedupeKey(array $row): string
    {
        return 'pharmacy:egfr:tg:'
            .implode(':', [
                (string) ($row['hn'] ?? ''),
                (string) ($row['vn'] ?? ''),
                (string) ($row['icode'] ?? ''),
                (string) ($row['severity'] ?? ''),
                (string) ($row['vstdate'] ?? ''),
                (string) ($row['daily_mg'] ?? ''),
            ]);
    }

    /** @param array<string, mixed> $row */
    private function formatSingle(array $row): string
    {
        $e = [TelegramBotService::class, 'e'];
        $sev = (string) ($row['severity'] ?? '');
        [$badge, $title, $tone] = match ($sev) {
            'contraindicated' => ['🔴 ห้ามใช้', 'ยาห้ามใช้ตามค่า eGFR', 'ห้ามจ่าย'],
            'alert' => ['🟠 ALERT', 'ต้องปรับขนาดยาตาม eGFR', 'เกินเพดาน (ALERT)'],
            'dose_exceeded' => ['🟡 เกิน Max', 'ขนาดยาเกินเพดานตาม eGFR', 'เกิน Max'],
            'missing_egfr' => ['⚪ ไม่มี eGFR', 'ไม่พบค่า eGFR ก่อนจ่ายยา', 'ตรวจ eGFR'],
            default => ['🔔 แจ้งเตือน', 'แจ้งเตือนการใช้ยาตาม eGFR', 'แจ้งเตือน'],
        };

        $hn = $e((string) ($row['hn'] ?? '—'));
        $name = $e(trim((string) ($row['patient_name'] ?? '—')) ?: '—');
        $vn = $e((string) ($row['vn'] ?? '—'));
        $vstdate = $e((string) ($row['vstdate'] ?? '—'));
        $drug = $e((string) ($row['drug_name'] ?? '—'));
        $strength = trim((string) ($row['strength'] ?? ''));
        $group = $e((string) ($row['drug_group'] ?? '—'));
        $usage = $e(trim((string) ($row['usage_text'] ?? '')) !== '' ? (string) $row['usage_text'] : '—');

        $daily = $row['daily_mg'] !== null ? round((float) $row['daily_mg']).' mg/วัน' : 'คำนวณไม่ได้';
        $max = $row['max_dose_mg'] !== null ? round((float) $row['max_dose_mg']).' mg/วัน' : '—';
        $egfrVal = $row['egfr'] !== null ? (string) $row['egfr'] : 'ไม่พบ';
        $egfrDate = $row['egfr_date'] ? ' · '.$e((string) $row['egfr_date']) : '';

        $lines = [
            "{$badge}",
            '<b>'.$e($title).'</b>',
            '<i>'.$e($tone).'</i>',
            '',
            '👤 <b>ผู้ป่วย</b>',
            "HN <code>{$hn}</code>",
            $name,
            "VN <code>{$vn}</code> · สั่งเมื่อ <code>{$vstdate}</code>",
            '',
            '💊 <b>ยาที่สั่ง</b>',
            $drug.($strength !== '' ? ' · <code>'.$e($strength).'</code>' : ''),
            'กลุ่ม: '.$group,
            '',
            '📋 <b>วิธีใช้</b>',
            $usage,
            '',
            '📏 <b>ขนาดยา / วัน</b>',
            'สั่งจริง: <b>'.$e($daily).'</b>',
            'Max ตาม eGFR: <b>'.$e($max).'</b>',
        ];

        if (! empty($row['dose_calc'])) {
            $lines[] = 'คำนวณ: <code>'.$e((string) $row['dose_calc']).'</code>';
        }

        $lines[] = '';
        $lines[] = '🧬 <b>eGFR ล่าสุด</b>';
        $lines[] = '<code>'.$e($egfrVal).'</code>'.$egfrDate;

        if (! empty($row['note'])) {
            $lines[] = '';
            $lines[] = '📌 <b>เหตุผล</b>';
            $lines[] = '<blockquote>'.$e((string) $row['note']).'</blockquote>';
        }

        $url = $this->alertsUrl();
        if ($url) {
            $lines[] = '';
            $lines[] = '🔗 <a href="'.$e($url).'">เปิดดูในระบบ</a>';
        }

        return implode("\n", $lines);
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    private function formatDigest(array $rows, int $extra, string $start, string $end): string
    {
        $e = [TelegramBotService::class, 'e'];
        $range = $start === $end ? $start : "{$start} → {$end}";
        $lines = [
            '🩺 <b>สรุปแจ้งเตือนยาตาม eGFR</b>',
            'ช่วงสแกน: <code>'.$e($range).'</code>',
            'พบใหม่ <b>'.count($rows).'</b>'.($extra > 0 ? " (+อีก {$extra})" : '').' รายการ',
            '',
        ];

        foreach ($rows as $i => $row) {
            $sev = (string) ($row['severity'] ?? '');
            $badge = match ($sev) {
                'contraindicated' => '🔴',
                'alert' => '🟠',
                'dose_exceeded' => '🟡',
                'missing_egfr' => '⚪',
                default => '•',
            };
            $daily = $row['daily_mg'] !== null ? round((float) $row['daily_mg']).' mg/วัน' : '—';
            $max = $row['max_dose_mg'] !== null ? round((float) $row['max_dose_mg']).' mg/วัน' : '—';
            $egfr = $row['egfr'] !== null ? (string) $row['egfr'] : '—';

            $lines[] = ($i + 1).". {$badge} <b>".$e((string) ($row['severity_label'] ?? $sev)).'</b>';
            $lines[] = 'HN <code>'.$e((string) ($row['hn'] ?? '')).'</code> · '.$e((string) ($row['patient_name'] ?? '—'));
            $lines[] = $e((string) ($row['drug_name'] ?? '—'));
            $lines[] = 'สั่ง <b>'.$e($daily).'</b> / Max <b>'.$e($max).'</b> · eGFR <code>'.$e($egfr).'</code>';
            $lines[] = '';
        }

        $url = $this->alertsUrl();
        if ($url) {
            $lines[] = '🔗 <a href="'.$e($url).'">เปิดดูในระบบ</a>';
        }

        return trim(implode("\n", $lines));
    }

    private function alertsUrl(): ?string
    {
        $host = trim((string) config('cloudflare.public_hostname', ''));
        if ($host !== '') {
            return 'https://'.$host.'/pharmacy/drug-alerts';
        }

        $app = rtrim((string) config('app.url'), '/');
        if ($app === '' || str_contains($app, 'localhost') || str_contains($app, '127.0.0.1')) {
            return $app !== '' ? $app.'/pharmacy/drug-alerts' : null;
        }

        return $app.'/pharmacy/drug-alerts';
    }
}
