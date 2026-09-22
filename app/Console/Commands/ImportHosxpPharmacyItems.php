<?php

namespace App\Console\Commands;

use App\Services\Pharmacy\PharmacyInventoryService;
use Illuminate\Console\Command;

class ImportHosxpPharmacyItems extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'pharmacy:import-hosxp-items {--limit=0 : จำกัดจำนวนรายการสำหรับทดสอบ}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'นำเข้าและอัปเดต master ยาจาก HOSxP drugitems';

    /**
     * Execute the console command.
     */
    public function handle(PharmacyInventoryService $inventory): int
    {
        $result = $inventory->importHosxpDrugItems((int) $this->option('limit'));
        $this->info("นำเข้า {$result['imported']} · อัปเดต {$result['updated']} · รวม {$result['total']}");

        return self::SUCCESS;
    }
}
