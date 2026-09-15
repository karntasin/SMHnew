<?php

namespace App\Console\Commands;

use App\Services\StaffRosterService;
use Illuminate\Console\Command;

class ImportStaffRoster extends Command
{
    protected $signature = 'staff-roster:import {path? : Path to Excel file (default: Desktop/บทบาท.xlsx)}';

    protected $description = 'Import staff roster (ชื่อ, สกุล, ตำแหน่ง, เบอร์, CID, บทบาท) from Excel';

    public function handle(StaffRosterService $service): int
    {
        $path = $this->argument('path')
            ?: getenv('USERPROFILE').DIRECTORY_SEPARATOR.'Desktop'.DIRECTORY_SEPARATOR.'บทบาท.xlsx';

        if (! is_file($path)) {
            $this->error("ไม่พบไฟล์: {$path}");

            return self::FAILURE;
        }

        $rows = $service->readExcelRows($path);
        $result = $service->importRows($rows, replace: true);

        $this->info("นำเข้าจาก: {$path}");
        $this->info("บันทึก {$result['imported']} รายการ (ข้าม {$result['skipped']})");

        return self::SUCCESS;
    }
}
