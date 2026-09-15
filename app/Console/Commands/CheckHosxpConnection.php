<?php

namespace App\Console\Commands;

use App\Services\HosxpConnectionService;
use Illuminate\Console\Command;

class CheckHosxpConnection extends Command
{
    protected $signature = 'hosxp:check-connection';

    protected $description = 'ตรวจสอบการเชื่อมต่อฐานข้อมูล HOSxP และแจ้งเตือน admin เมื่อขาด';

    public function handle(HosxpConnectionService $service): int
    {
        $status = $service->check(notifyOnFailure: true);

        $this->info(($status['connected'] ? 'OK' : 'FAIL').': '.$status['message']);

        return $status['connected'] ? self::SUCCESS : self::FAILURE;
    }
}
