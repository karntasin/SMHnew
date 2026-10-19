<?php

namespace App\Console\Commands;

use App\Services\QueuePortalPushService;
use Illuminate\Console\Command;

class NotifyQueuePortal extends Command
{
    protected $signature = 'queue-portal:notify';

    protected $description = 'แจ้งเตือนเว็บพุชเมื่อคิวเหลือไม่เกิน 3 และเมื่อถึงคิว';

    public function handle(QueuePortalPushService $push): int
    {
        $result = $push->notifyDue();
        if ($result['skipped']) {
            $this->warn('ยังไม่ได้ตั้งค่า VAPID ของพอร์ทัลคิว');

            return self::SUCCESS;
        }

        $this->info(sprintf(
            'queue-portal: soon=%d called=%d removed=%d',
            $result['soon'],
            $result['called'],
            $result['removed']
        ));

        return self::SUCCESS;
    }
}
