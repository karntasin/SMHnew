<?php

namespace App\Console\Commands;

use App\Services\Quality\DepartmentKpiWorkbookImportService;
use Illuminate\Console\Command;
use Throwable;

class ImportFinanceQualityIndicators extends Command
{
    protected $signature = 'finance:import-indicators
        {--path= : ไฟล์ finance.xlsx}';

    protected $description = 'นำเข้าตัวชี้วัดฝ่ายการเงินจากไฟล์ finance พร้อมสร้างรหัส fs- ตามลำดับ';

    public function handle(DepartmentKpiWorkbookImportService $importer): int
    {
        $path = $this->option('path') ?: base_path('excel/finance.xlsx');

        if (! is_file($path)) {
            $this->error("ไม่พบไฟล์: {$path}");

            return self::FAILURE;
        }

        $this->info("นำเข้าจาก: {$path}");

        try {
            $result = $importer->importFinance($path, 'FS');
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->table(
            ['รหัส', 'ชื่อ', 'งวด', 'คำอธิบาย'],
            collect($result['indicators'])->map(fn (array $row) => [
                $row['code'],
                $row['name'],
                $row['entries'],
                $row['description'] ?? '-',
            ])->all(),
        );

        $this->info($result['department_name']." · สร้างใหม่ {$result['created']} · อัปเดต {$result['updated']} · งวดใหม่ {$result['entries_created']} · งวดที่อัปเดต {$result['entries_updated']}");

        return self::SUCCESS;
    }
}
