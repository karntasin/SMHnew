<?php

namespace App\Console\Commands;

use App\Services\Hosxp\HosxpDesktopNotifyService;
use Illuminate\Console\Command;

class HosxpNotifyTest extends Command
{
    protected $signature = 'hosxp:notify-test
                            {computer=192.168.1.214 : IP/computername ใน onlineuser}
                            {--message= : ข้อความทดสอบ (สั้น)}
                            {--force-offline : ส่งแม้เครื่องไม่ออนไลน์}';

    protected $description = 'ทดสอบส่งข้อความ HOSxP desktop chat ผ่าน ksklog (NOTIFYMESSAGE) เท่านั้น';

    public function handle(HosxpDesktopNotifyService $notify): int
    {
        $computer = (string) $this->argument('computer');
        $message = (string) ($this->option('message') ?: 'ทดสอบแจ้งเตือน eGFR จากระบบ FSHH');

        $this->info("ตรวจ onlineuser: {$computer}");
        $online = $notify->findOnlineByComputer($computer);
        $this->line($online['online']
            ? 'ออนไลน์: '.json_encode($online['user'], JSON_UNESCAPED_UNICODE)
            : 'ไม่ออนไลน์');

        $result = $notify->sendToComputer(
            $computer,
            $message,
            requireOnline: ! (bool) $this->option('force-offline')
        );

        if ($result['skipped'] ?? false) {
            $this->warn($result['message']);

            return self::SUCCESS;
        }

        if (! ($result['ok'] ?? false)) {
            $this->error($result['message']);

            return self::FAILURE;
        }

        $this->info($result['message']);
        $this->line('detail: '.$result['detail']);
        if (! empty($result['sender'])) {
            $this->line('sender: '.json_encode($result['sender'], JSON_UNESCAPED_UNICODE));
        }

        return self::SUCCESS;
    }
}
