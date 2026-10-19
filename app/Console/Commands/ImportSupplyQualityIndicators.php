<?php

namespace App\Console\Commands;

use App\Services\Quality\SupplyQualityIndicatorImportService;
use Illuminate\Console\Command;
use Throwable;

class ImportSupplyQualityIndicators extends Command
{
    protected $signature = 'supply:import-indicators
        {--path= : ไฟล์ส่งกำลัง.docx}';

    protected $description = 'นำเข้าตัวชี้วัดแผนกส่งกำลังและบริการ+ยานยนต์ จากส่งกำลัง.docx รหัส ssa-01 ถึง ssa-09';

    public function handle(SupplyQualityIndicatorImportService $importer): int
    {
        $path = $this->option('path') ?: base_path('excel/ส่งกำลัง.docx');

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
            ['รหัส', 'ชื่อ', 'งวด', 'เป้าหมาย'],
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
