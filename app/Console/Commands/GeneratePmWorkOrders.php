<?php

namespace App\Console\Commands;

use App\Services\Env\PmWorkOrderService;
use Illuminate\Console\Command;

class GeneratePmWorkOrders extends Command
{
    protected $signature = 'pm:generate-work-orders';

    protected $description = 'สร้างใบงาน PM ที่ถึงรอบและแจ้งเตือนงานใกล้ครบหรือเลยกำหนด';

    public function handle(PmWorkOrderService $workOrders): int
    {
        $created = $workOrders->generateDue();
        $alerted = $workOrders->alertOpenWorkOrders();

        $this->info("สร้างใบงาน {$created} รายการ แจ้งเตือน {$alerted} รายการ");

        return self::SUCCESS;
    }
}
