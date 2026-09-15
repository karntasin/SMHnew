<?php

namespace App\Console\Commands;

use App\Services\Env\EnvAssetRegistryImportService;
use Illuminate\Console\Command;

class VerifyEnvAssetRegistry extends Command
{
    protected $signature = 'env:verify-registry
        {--path= : โฟลเดอร์ไฟล์บัญชีคุม (ค่าเริ่มต้น E:\\บัญชีคุม)}';

    protected $description = 'ตรวจสอบข้อมูลทะเบียนครุภัณฑ์ ENV กับไฟล์ Excel ต้นฉบับ';

    public function handle(EnvAssetRegistryImportService $importer): int
    {
        $path = $this->option('path') ?: $importer->defaultSourceDir();
        $report = $importer->verify($path);

        $this->table(
            ['สายงาน', 'แท็บ', 'Excel', 'DB', 'ตัวอย่างตรวจ', 'ไม่ตรง', 'ผล'],
            collect($report)->map(fn ($r) => [
                $r['line'] ?? '-',
                $r['sheet'] ?? '-',
                $r['excel_count'] ?? '-',
                $r['db_count'] ?? '-',
                $r['sample_checked'] ?? '-',
                $r['sample_mismatches'] ?? '-',
                ($r['ok'] ?? false) ? 'OK' : 'FAIL',
            ])->all()
        );

        $failed = collect($report)->where('ok', false);
        foreach ($failed as $row) {
            $this->error(($row['line'] ?? '').' / '.($row['sheet'] ?? '').': '.($row['message'] ?? 'จำนวนหรือรายละเอียดไม่ตรง'));
            foreach ($row['mismatch_examples'] ?? [] as $ex) {
                $this->line('  - '.$ex);
            }
        }

        if ($failed->isEmpty()) {
            $this->info('ผ่านการตรวจสอบ: จำนวนแถวและตัวอย่างรายละเอียดตรงกับไฟล์ต้นฉบับ');

            return self::SUCCESS;
        }

        return self::FAILURE;
    }
}
