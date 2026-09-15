<?php

namespace App\Console\Commands;

use App\Models\EnvAssetLine;
use App\Services\Env\EnvAssetImageImportService;
use App\Services\Env\EnvAssetRegistryImportService;
use Illuminate\Console\Command;

class ImportEnvAssetImages extends Command
{
    protected $signature = 'env:import-registry-images
        {--path= : โฟลเดอร์ไฟล์บัญชีคุม}
        {--link-only : เชื่อมรูปจากโฟลเดอร์ที่ export แล้วเท่านั้น}
        {--skip-lines=medical : รหัสสายที่ข้าม PhpSpreadsheet}';

    protected $description = 'นำเข้ารูปภาพจากไฟล์บัญชีคุมมาประกอบรายการครุภัณฑ์ ENV';

    public function handle(EnvAssetImageImportService $images): int
    {
        $path = $this->option('path') ?: $images->defaultSourceDir();

        if ($this->option('link-only')) {
            $stats = $images->linkExportedDirectories();
            $this->info("เชื่อมรูปจากโฟลเดอร์: files={$stats['files']} linked={$stats['linked']}");

            return self::SUCCESS;
        }

        $skip = array_filter(array_map('trim', explode(',', (string) $this->option('skip-lines'))));
        $totalImages = 0;
        $totalLinked = 0;

        foreach (EnvAssetRegistryImportService::LINE_FILES as $filename => $meta) {
            if (in_array($meta['code'], $skip, true)) {
                $this->warn("ข้าม PhpSpreadsheet: {$meta['name']}");
                continue;
            }

            $file = rtrim($path, '\\/').DIRECTORY_SEPARATOR.$filename;
            $line = EnvAssetLine::where('code', $meta['code'])->first();
            if (! $line || ! is_file($file)) {
                $this->error("ข้าม {$filename}");
                continue;
            }

            $this->info("กำลังดึงรูป: {$meta['name']}");
            try {
                $stats = $images->importFile($file, $line);
                $totalImages += $stats['images'];
                $totalLinked += $stats['linked'];
                $this->line("  รูป {$stats['images']} · เชื่อม {$stats['linked']}");
                foreach ($stats['errors'] as $err) {
                    $this->warn('  '.$err);
                }
            } catch (\Throwable $e) {
                $this->error('  ล้มเหลว: '.$e->getMessage());
            }
        }

        $linkStats = $images->linkExportedDirectories();
        $this->info("PhpSpreadsheet: รูป {$totalImages} · เชื่อม {$totalLinked}");
        $this->info("โฟลเดอร์ export: files={$linkStats['files']} linked={$linkStats['linked']}");
        $this->info('assets with image='.\App\Models\EnvAsset::whereNotNull('image_path')->where('image_path', '!=', '')->count());

        return self::SUCCESS;
    }
}
