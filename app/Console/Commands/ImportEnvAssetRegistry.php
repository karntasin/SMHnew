<?php

namespace App\Console\Commands;

use App\Services\Env\EnvAssetRegistryImportService;
use Illuminate\Console\Command;

class ImportEnvAssetRegistry extends Command
{
    protected $signature = 'env:import-registry
        {--path= : โฟลเดอร์ไฟล์บัญชีคุม (ค่าเริ่มต้น E:\\บัญชีคุม)}
        {--keep : ไม่ลบรายการที่นำเข้าไว้ก่อนหน้า}';

    protected $description = 'นำเข้าทะเบียนครุภัณฑ์ ENV จากไฟล์บัญชีคุมสิ่งอุปกรณ์ แยกตามสายงาน';

    public function handle(EnvAssetRegistryImportService $importer): int
    {
        $path = $this->option('path') ?: $importer->defaultSourceDir();
        $this->info("นำเข้าจาก: {$path}");

        $result = $importer->importFromDirectory($path, ! $this->option('keep'));

        $this->table(
            ['สายงาน', 'แท็บ', 'สถานะ', 'นำเข้า', 'ข้าม', 'แถวข้อมูล Excel'],
            collect($result['sheets'])->map(fn ($s) => [
                $s['line'],
                $s['sheet'],
                $s['registry_status'],
                $s['imported'],
                $s['skipped'],
                $s['excel_data_rows'],
            ])->all()
        );

        $this->info("สายงาน: {$result['lines']} · นำเข้า: {$result['imported']} · ข้าม: {$result['skipped']}");

        foreach ($result['errors'] as $error) {
            $this->warn($error);
        }

        return $result['errors'] === [] ? self::SUCCESS : self::FAILURE;
    }
}
