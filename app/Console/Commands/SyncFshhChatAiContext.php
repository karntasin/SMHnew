<?php

namespace App\Console\Commands;

use App\Services\FshhChat\FshhChatSyncService;
use Illuminate\Console\Command;

class SyncFshhChatAiContext extends Command
{
    protected $signature = 'fshh-chat:sync-ai';

    protected $description = 'Push a privacy-filtered web-app snapshot to FSHH Chat AI (no HOSxP, no patient PII)';

    public function handle(FshhChatSyncService $sync): int
    {
        $this->info('Syncing sanitized AI context to FSHH Chat...');
        $result = $sync->syncAiContext();
        $error = (string) ($result['error'] ?? '');
        if (($result['success'] ?? false) !== true && str_contains($error, 'SSL certificate')) {
            $this->warn('PHP นี้ไม่มี CA bundle — ส่งอีกครั้งแบบไม่ตรวจใบรับรอง (เฉพาะเครื่องนี้)');
            config(['services.fshh_chat.verify_ssl' => false]);
            $result = $sync->syncAiContext();
        }
        if (($result['success'] ?? false) !== true) {
            $this->error($result['error'] ?? 'ส่งชุดข้อมูล AI ไม่สำเร็จ');

            return self::FAILURE;
        }

        $this->info('OK · '.($result['bytes'] ?? 0).' bytes · '.($result['updated_at'] ?? ''));

        return self::SUCCESS;
    }
}
