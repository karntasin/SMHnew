<?php

namespace App\Console\Commands;

use App\Services\Quality\MplQualityIndicatorImportService;
use Illuminate\Console\Command;
use Throwable;

class ImportMplQualityIndicators extends Command
{
    protected $signature = 'mpl:import-indicators
        {--path= : ไฟล์หมวดพล.xlsx}';

    protected $description = 'นำเข้าตัวชี้วัดแผนกหมวดพลเสนารักษ์จากไฟล์หมวดพล พร้อมสร้างรหัส mp- ตามลำดับ';

    public function handle(MplQualityIndicatorImportService $importer): int
    {
        $path = $this->option('path') ?: base_path('excel/หมวดพล.xlsx');

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
