<?php

namespace App\Console\Commands;

use App\Services\Quality\HphQualityIndicatorImportService;
use Illuminate\Console\Command;
use Throwable;

class ImportHphQualityIndicators extends Command
{
    protected $signature = 'hph:import-indicators
        {--path= : ไฟล์ HPH.xlsx}';

    protected $description = 'นำเข้าตัวชี้วัดทีม HPH จาก HPH.xlsx รหัส hph-01 ถึง hph-30';

    public function handle(HphQualityIndicatorImportService $importer): int
    {
        $path = $this->option('path') ?: base_path('excel/HPH.xlsx');

        if (! is_file($path)) {
            $this->error("ไม่พบไฟล์: {$path}");

            return self::FAILURE;
        }

        $this->info("นำเข้าจาก: {$path}");

        try {
            $result = $importer->import($path);
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->table(
            ['รหัส', 'ชื่อ', 'งวด', 'กลุ่ม'],
            collect($result['indicators'])->map(fn (array $row) => [
                $row['code'],
                $row['name'],
                $row['entries'],
                $row['description'] ?? '-',
            ])->all(),
        );

        $this->info("สร้างใหม่ {$result['created']} · อัปเดต {$result['updated']} · งวดใหม่ {$result['entries_created']} · งวดที่อัปเดต {$result['entries_updated']}");

        return self::SUCCESS;
    }
}
