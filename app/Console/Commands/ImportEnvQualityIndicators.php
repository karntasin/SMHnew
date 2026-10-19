<?php

namespace App\Console\Commands;

use App\Services\Env\EnvQualityIndicatorImportService;
use Illuminate\Console\Command;
use Throwable;

class ImportEnvQualityIndicators extends Command
{
    protected $signature = 'env:import-indicators
        {--path= : ไฟล์ ENV.docx}';

    protected $description = 'นำเข้าตัวชี้วัดทีม ENV จาก ENV.docx พร้อมสร้างรหัส env- ตามเลขหัวข้อ';

    public function handle(EnvQualityIndicatorImportService $importer): int
    {
        $path = $this->option('path') ?: base_path('excel/ENV.docx');

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
            ['รหัส', 'ชื่อ', 'งวด', 'คำอธิบาย'],
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
