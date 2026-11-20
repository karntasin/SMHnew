<?php

namespace App\Console\Commands;

use App\Services\Rcm\RcmHistoricalSyncService;
use Illuminate\Console\Command;

class RcmSyncHistoricalStmCommand extends Command
{
    protected $signature = 'rcm:sync-historical
                            {--months=6 : จำนวนเดือนย้อนหลังที่ต้องการสแกนและดาวน์โหลด (ค่าเริ่มต้น 6 เดือน)}
                            {--scheme=cgd : กองทุน cgd (กรมบัญชีกลาง) หรือ lgo (อปท.)}
                            {--batch=2 : จำนวนไฟล์ที่ดาวน์โหลดต่อ 1 รอบ}';

    protected $description = 'ตรวจสอบและทยอยดาวน์โหลดไฟล์ Statement (REP/STM) จาก e-Claim Portal ย้อนหลัง 6 เดือนในเบื้องหลัง';

    public function handle(RcmHistoricalSyncService $service): int
    {
        $months = (int) ($this->option('months') ?: 6);
        $scheme = (string) ($this->option('scheme') ?: 'cgd');
        $batch = (int) ($this->option('batch') ?: 2);

        $this->info("=================================================");
        $this->info("  RCM 6-Month Historical STM Sync & Verification ");
        $this->info("  กองทุน: " . strtoupper($scheme) . " | ย้อนหลัง: {$months} เดือน");
        $this->info("=================================================");

        $this->line("1. กำลังสแกนตรวจสอบรายการไฟล์ Statement บน e-Claim Portal...");
        $verify = $service->verifyHistoricalMonths($scheme, $months);

        if (! empty($verify['requires_otp'])) {
            $this->warn("⚠️  " . ($verify['message'] ?? 'ระบบ e-Claim บังคับยืนยันตัวตน 2FA กรุณากรอก OTP'));
            $this->warn("กรุณาเข้าสู่ระบบผ่านหน้าเว็บ /rcm/reconcile และกรอกรหัส OTP ก่อนรันคำสั่งนี้");
            return Command::FAILURE;
        }

        if (! empty($verify['requires_config'])) {
            $this->error("❌  " . ($verify['message'] ?? 'ยังไม่ได้ตั้งค่า e-Claim'));
            return Command::FAILURE;
        }

        $summary = $verify['summary'] ?? [];
        $totalFiles = $summary['total_files'] ?? 0;
        $already = $summary['already_downloaded'] ?? 0;
        $pending = $summary['pending_download'] ?? 0;

        $this->info("ผลการตรวจสอบรอบ {$months} เดือน:");
        $this->line(" - ไฟล์ทั้งหมดบน e-Claim: {$totalFiles} ไฟล์");
        $this->line(" - เคยดาวน์โหลดและนำเข้าแล้ว: {$already} ไฟล์");
        $this->line(" - ไฟล์ใหม่ที่รอการดาวน์โหลด: {$pending} ไฟล์");

        if (! empty($summary['months'])) {
            $this->newLine();
            $tableData = [];
            foreach ($summary['months'] as $m) {
                $tableData[] = [
                    $m['month_label'],
                    $m['total_files'],
                    $m['downloaded_files'],
                    $m['pending_files'],
                    $m['status'] === 'complete' ? 'ครบแล้ว' : ($m['status'] === 'pending' ? 'มีไฟล์ใหม่' : 'ไม่มีไฟล์'),
                ];
            }
            $this->table(['รอบเดือน', 'ทั้งหมด', 'โหลดแล้ว', 'รอโหลด', 'สถานะ'], $tableData);
        }

        if ($pending === 0) {
            $this->info("✅  ข้อมูล Statement ทั้งหมดในรอบ {$months} เดือนเป็นข้อมูลล่าสุดครบถ้วนแล้ว ไม่ต้องดาวน์โหลดเพิ่ม");
            return Command::SUCCESS;
        }

        $this->newLine();
        $this->info("2. เริ่มต้นการทยอยดาวน์โหลดในเบื้องหลัง (รอบละ {$batch} ไฟล์)...");
        $service->startSync($scheme);

        $bar = $this->output->createProgressBar($pending);
        $bar->start();

        $doneCount = 0;
        while (true) {
            $step = $service->processNextBatch($scheme, $batch);
            $status = $step['status'] ?? '';

            if ($status === 'requires_otp') {
                $bar->finish();
                $this->newLine(2);
                $this->warn("⚠️  Session e-Claim หมดอายุ กรุณายืนยันตัวตน OTP ใหม่ผ่านหน้าเว็บ");
                return Command::FAILURE;
            }

            $currentCompleted = $step['completed_count'] ?? 0;
            $newAdvances = $currentCompleted - $doneCount;
            if ($newAdvances > 0) {
                $bar->advance($newAdvances);
                $doneCount = $currentCompleted;
            }

            if ($status === 'completed' || empty($step['remaining_count'])) {
                break;
            }

            // เว้นจังหวะ 1 วินาทีไม่ให้ยิง Server e-Claim ถี่เกินไป
            sleep(1);
        }

        $bar->finish();
        $this->newLine(2);
        $this->info("🎉  ดาวน์โหลดและกระทบยอดไฟล์ Statement ทั้งหมดเสร็จสิ้นสมบูรณ์ 100%");
        return Command::SUCCESS;
    }
}
