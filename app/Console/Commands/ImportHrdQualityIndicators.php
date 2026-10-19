<?php

namespace App\Console\Commands;

use App\Services\Quality\HrdQualityIndicatorImportService;
use Illuminate\Console\Command;
use Throwable;

class ImportHrdQualityIndicators extends Command
{
    protected $signature = 'hrd:import-indicators
        {--path= : ไฟล์ HRD.xlsx}';

    protected $description = 'นำเข้าตัวชี้วัดจากไฟล์ HRD ให้ทีม HRD และแผนกธุรการใช้ข้อมูลชุดเดียวกัน';

    public function handle(HrdQualityIndicatorImportService $importer): int
    {
        $path = $this->option('path') ?: base_path('excel/HRD.xlsx');

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
            ['ทีม HRD', $result['department_name'], 'ชื่อ', 'งวด', 'หัวข้อย่อย'],
            collect($result['indicators'])->map(fn (array $row) => [
                $row['team_code'],
                $row['department_code'],
                $row['name'],
                $row['entries'],
                $row['series'] > 0 ? $row['series'] : '-',
            ])->all(),
        );

        $this->info("สร้างใหม่ {$result['created']} · อัปเดต {$result['updated']} · งวดใหม่ {$result['entries_created']} · งวดที่อัปเดต {$result['entries_updated']}");

        return self::SUCCESS;
    }
}
