<?php

namespace App\Console\Commands;

use App\Models\Department;
use App\Services\QualityIndicatorImportService;
use Illuminate\Console\Command;
use Throwable;

class ImportErQualityIndicators extends Command
{
    protected $signature = 'er:import-indicators
        {--path= : ไฟล์ตัวชี้วัด ER (.xlsx)}';

    protected $description = 'นำเข้าตัวชี้วัดแผนกอุบัติเหตุและฉุกเฉิน (ER) จาก Service Profile';

    public function handle(QualityIndicatorImportService $importer): int
    {
        $path = $this->option('path') ?: base_path('excel/er-serviceprofile-69.xlsx');

        if (! is_file($path)) {
            $this->error("ไม่พบไฟล์: {$path}");

            return self::FAILURE;
        }

        $department = Department::query()->whereRaw('UPPER(code) = ?', ['ER'])->first();
        if (! $department) {
            $this->error('ไม่พบแผนกที่มีรหัส ER ในระบบ');

            return self::FAILURE;
        }

        $this->info("นำเข้าจาก: {$path} ไปยัง {$department->name} (id: {$department->id})");

        try {
            $log = $importer->importFromFile($path, 'department', (int) $department->id, null);
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info("นำเข้าเสร็จสิ้น (Log ID: {$log->id}): ตัวชี้วัดใหม่ {$log->indicators_create} / อัปเดต {$log->indicators_update} · งวดใหม่ {$log->entries_create} / อัปเดต {$log->entries_update}");

        return self::SUCCESS;
    }
}
