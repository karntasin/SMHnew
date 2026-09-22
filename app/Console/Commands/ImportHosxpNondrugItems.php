<?php

namespace App\Console\Commands;

use App\Services\Pharmacy\PharmacyInventoryService;
use Illuminate\Console\Command;

class ImportHosxpNondrugItems extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'pharmacy:import-hosxp-nondrug {--limit=0 : จำกัดจำนวนรายการสำหรับทดสอบ}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'นำเข้าและอัปเดต master เวชภัณฑ์ที่มิใช่ยาจาก HOSxP nondrugitems (income = "05")';

    /**
     * Execute the console command.
     */
    public function handle(PharmacyInventoryService $inventory): int
    {
        $result = $inventory->importHosxpNondrugItems((int) $this->option('limit'));
        $this->info("นำเข้าเวชภัณฑ์มิใช่ยา {$result['imported']} · อัปเดต {$result['updated']} · รวม {$result['total']}");

        return self::SUCCESS;
    }
}
