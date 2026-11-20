<?php

namespace App\Console\Commands;

use App\Services\Finance\CgdEclaimNhsoPortalService;
use App\Services\Finance\CgdStmImportService;
use App\Services\Finance\NhsoSmtPortalService;
use App\Services\Finance\StmFileImportService;
use App\Services\Rcm\RcmAutoSyncService;
use App\Services\Rcm\RcmQualityIndicatorSyncService;
use App\Services\Rcm\RcmReconcileService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class FinanceAutoSyncClaimsAndSmtCommand extends Command
{
    protected $signature = 'finance:auto-sync-all
                            {--year= : ปี พ.ศ. สำหรับ SMT หรือ ค.ศ. สำหรับ e-Claim}
                            {--month= : เดือน 1-12 สำหรับ e-Claim}
                            {--force : บังคับดาวน์โหลดใหม่ทั้งหมด}';

    protected $description = 'ตรวจสอบและดาวน์โหลด REP/STM ทุกกองทุน และดึงข้อมูลการโอนเงิน/PDF งาน SMT อัตโนมัติ (รอบเที่ยงวัน 12:00 น.)';

    public function handle(
        NhsoSmtPortalService $smtService,
        CgdEclaimNhsoPortalService $nhsoService,
        CgdStmImportService $importer,
        StmFileImportService $stmImporter,
        RcmAutoSyncService $rcmSyncService,
        RcmReconcileService $reconcileService,
        RcmQualityIndicatorSyncService $qiSyncService,
    ): int {
        $startTime = now();
        $this->info("=== เริ่มต้นกระบวนการซิงค์อัตโนมัติ RCM & การเงิน (เวลา: {$startTime->format('d/m/Y H:i:s')}) ===");

        // คำนวณปีงบประมาณไทย (ตุลาคม เป็นต้นไป ถือเป็นปีงบประมาณถัดไป)
        $fiscalYear = ($startTime->month >= 10) ? ($startTime->year + 543 + 1) : ($startTime->year + 543);
        $userYear = $this->option('year');

        if ($userYear) {
            $userYearInt = (int) $userYear;
            $beYear = $userYearInt < 2500 ? $userYearInt + 543 : $userYearInt;
            $ceYear = $userYearInt >= 2500 ? $userYearInt - 543 : $userYearInt;
        } else {
            $beYear = $fiscalYear;
            $ceYear = $startTime->year;
        }

        $currentMonth = (int) ($this->option('month') ?: $startTime->month);
        $force = (bool) $this->option('force');

        $report = [
            'started_at' => $startTime->toIso8601String(),
            'ce_year' => $ceYear,
            'be_fiscal_year' => $beYear,
            'month' => $currentMonth,
            'smt' => [
                'status' => 'pending',
                'synced_count' => 0,
                'total_amount' => 0.0,
                'pdf_downloaded' => 0,
                'summary' => [],
                'error' => null,
            ],
            'schemes' => [],
            'hotfolder' => [
                'status' => 'pending',
                'imported_count' => 0,
            ],
            'c_deny_settled' => 0,
            'c_deny_recovered_amount' => 0.0,
            'errors' => [],
            'stats' => [
                'total_files_scanned' => 0,
                'total_files_imported' => 0,
                'rep_imported' => 0,
                'stm_imported' => 0,
                'smt_synced' => 0,
                'smt_amount' => 0.0,
            ],
        ];

        // -------------------------------------------------------------
        // 1. งาน SMT: ดึงข้อมูลการโอนเงินจริง + ดาวน์โหลด PDF ใบแจ้งโอนเงิน
        // -------------------------------------------------------------
        $this->info("[1/3] เริ่มซิงค์ข้อมูลการโอนเงินจากเว็บ SMT สปสช. (ปีงบ {$beYear})...");
        try {
            // ซิงค์ปีงบประมาณเป้าหมาย (เช่น 2570)
            $defaultFiscalStart = sprintf('%04d-10-01', ($beYear - 543) - 1);
            $defaultFiscalEnd = now()->format('Y-m-d');

            $smtResult = $smtService->syncTransfers([
                'zone_id' => '06',
                'province_id' => '27',
                'hcode' => '14689',
                'budget_year' => (string) $beYear,
                'start_date' => $defaultFiscalStart,
                'end_date' => $defaultFiscalEnd,
                'budget_source' => '',
            ]);

            $totalSmtCount = (int) ($smtResult['synced_count'] ?? 0);
            $totalSmtAmount = (float) ($smtResult['total_amount'] ?? 0.0);
            $this->info("  ✓ ปีงบ {$beYear}: บันทึกข้อมูล SMT สำเร็จ {$totalSmtCount} รายการ (ยอดเงินรวม: " . number_format($totalSmtAmount, 2) . " บาท)");

            // ดาวน์โหลด PDF ใบแจ้งโอนเงิน SMT ที่ยังขาด
            $this->info("  - กำลังตรวจสอบและดาวน์โหลด PDF ใบแจ้งโอนเงิน SMT ปีงบ {$beYear}...");
            $pdfResult = $smtService->syncMissingPdfs((string) $beYear);
            $totalPdfs = (int) ($pdfResult['downloaded'] ?? 0);
            $this->info("  ✓ ดาวน์โหลด PDF สำเร็จ {$totalPdfs} ไฟล์ (จากทั้งหมด {$pdfResult['total_unique_files']} งวด)");

            // หากเพิ่งขึ้นปีงบประมาณใหม่ (ต.ค. - ธ.ค.) ให้ตรวจสอบเก็บตกปีงบประมาณก่อนหน้าด้วย
            if ($startTime->month >= 10 && ! $userYear) {
                $prevBeYear = $beYear - 1;
                $this->info("  - ตรวจสอบเก็บตก SMT ปีงบก่อนหน้า ({$prevBeYear})...");
                try {
                    $prevFiscalStart = sprintf('%04d-10-01', ($prevBeYear - 543) - 1);
                    $prevFiscalEnd = sprintf('%04d-09-30', $prevBeYear - 543);
                    $prevResult = $smtService->syncTransfers([
                        'zone_id' => '06',
                        'province_id' => '27',
                        'hcode' => '14689',
                        'budget_year' => (string) $prevBeYear,
                        'start_date' => $prevFiscalStart,
                        'end_date' => $prevFiscalEnd,
                        'budget_source' => '',
                    ]);
                    $prevCount = (int) ($prevResult['synced_count'] ?? 0);
                    $prevAmount = (float) ($prevResult['total_amount'] ?? 0.0);
                    $this->info("  ✓ ปีงบ {$prevBeYear}: บันทึกข้อมูล SMT สำเร็จ {$prevCount} รายการ (ยอดเงิน: " . number_format($prevAmount, 2) . " บาท)");
                    $smtService->syncMissingPdfs((string) $prevBeYear);
                } catch (\Throwable $prevEx) {
                    Log::warning("SMT Previous Fiscal Year Sync Warning: {$prevEx->getMessage()}");
                }
            }

            $report['smt'] = [
                'status' => 'success',
                'synced_count' => $totalSmtCount,
                'total_amount' => $totalSmtAmount,
                'pdf_downloaded' => $totalPdfs,
                'summary' => $smtResult['summary'] ?? [],
                'error' => null,
            ];
            $report['stats']['smt_synced'] = $totalSmtCount;
            $report['stats']['smt_amount'] = $totalSmtAmount;
        } catch (\Throwable $e) {
            $err = "SMT Sync Error: {$e->getMessage()}";
            $this->error("  ✗ {$err}");
            Log::error($err);
            $report['smt']['status'] = 'error';
            $report['smt']['error'] = $e->getMessage();
            $report['errors'][] = $err;
        }

        // -------------------------------------------------------------
        // 2. งาน e-Claim: ตรวจสอบและทยอยดาวน์โหลด REP / STM ทุกกองทุน
        // -------------------------------------------------------------
        $this->info("[2/3] เริ่มตรวจสอบและดาวน์โหลดไฟล์ REP / STM จาก e-Claim สปสช. ทุกกองทุน...");

        // ตรวจสอบทั้งเดือนปัจจุบัน และเดือนก่อนหน้า (เพื่อเก็บตกไฟล์ REP/STM ที่ สปสช. เพิ่งประกาศออกช่วงกลางเดือน)
        $monthsToScan = [
            ['year' => $ceYear, 'month' => $currentMonth],
        ];
        $prevMonthDate = $startTime->copy()->subMonth();
        if (! ($prevMonthDate->year === $ceYear && $prevMonthDate->month === $currentMonth) && ! $userYear) {
            $monthsToScan[] = ['year' => $prevMonthDate->year, 'month' => $prevMonthDate->month];
        }

        $schemes = array_keys(config('claim_schemes', ['cgd' => [], 'lgo' => [], 'ucs' => []]));

        foreach ($schemes as $schemeKey) {
            $schemeTitle = config("claim_schemes.{$schemeKey}.title", strtoupper($schemeKey));
            $this->line("--- กองทุน: {$schemeTitle} ({$schemeKey}) ---");

            $portal = $nhsoService->forScheme($schemeKey);
            $schemeReport = [
                'scheme' => $schemeKey,
                'title' => $schemeTitle,
                'status' => 'pending',
                'configured' => $portal->isConfigured(),
                'has_totp' => $portal->isTotpConfigured(),
                'scanned_files' => 0,
                'new_files' => 0,
                'downloaded' => 0,
                'imported' => 0,
                'stm_scanned' => 0,
                'stm_downloaded' => 0,
                'stm_imported' => 0,
                'error' => null,
            ];

            if (! $portal->isConfigured()) {
                $this->warn("  ⚠ ยังไม่ได้ตั้งค่า Username/Password สำหรับกองทุน {$schemeKey} — ข้าม");
                $schemeReport['status'] = 'skipped_not_configured';
                $report['schemes'][$schemeKey] = $schemeReport;
                continue;
            }

            if (! $portal->isTotpConfigured() && ! $force) {
                $this->warn("  ⚠ ยังไม่ได้ระบุ TOTP Secret Key สำหรับกองทุน {$schemeKey} — ข้าม");
                $schemeReport['status'] = 'skipped_no_totp';
                $report['schemes'][$schemeKey] = $schemeReport;
                continue;
            }

            try {
                // ตรวจสอบว่ามีเซสชัน SSO ที่เข้าสู่ระบบไว้แล้วหรือไม่ (ลดการล็อกอินซ้ำซ้อนและป้องกัน OTP ชนกัน)
                if (! $portal->isAuthenticated()) {
                    $this->info("  - กำลังเข้าสู่ระบบ e-Claim พร้อมยืนยัน OTP อัตโนมัติ (เดือน {$currentMonth}/{$ceYear})...");
                    $loginResult = $portal->startLogin($ceYear, $currentMonth);

                    if (($loginResult['status'] ?? '') !== 'authenticated') {
                        throw new \RuntimeException($loginResult['message'] ?? 'เข้าสู่ระบบ e-Claim ไม่สำเร็จ (อาจติดขั้นตอน OTP หรือ รหัสผ่านหมดอายุ)');
                    }
                    $this->info("  ✓ เข้าสู่ระบบ e-Claim SSO สำเร็จเรียบร้อย");
                } else {
                    $this->info("  ✓ ใช้เซสชันเดิมที่เข้าสู่ระบบไว้แล้ว (SSO Authenticated)");
                }

                // สแกนและดาวน์โหลดตามงวดเดือนที่กำหนด
                foreach ($monthsToScan as $period) {
                    $pYear = $period['year'];
                    $pMonth = $period['month'];
                    $periodLabel = "{$pMonth}/{$pYear}";

                    // 2.1 สแกนรายการไฟล์ REP
                    $this->info("  - กำลังสแกนรายการไฟล์ REP งวด {$periodLabel}...");
                    $scanSummary = $portal->scanFiles($pYear, $pMonth);
                    $allowed = (int) ($scanSummary['allowed_files'] ?? 0);
                    $new = (int) ($scanSummary['new_files'] ?? 0);
                    $existing = (int) ($scanSummary['existing_files'] ?? 0);
                    $this->info("  ✓ สแกนพบ {$allowed} ไฟล์ (เป็นไฟล์ใหม่ {$new} ไฟล์, นำเข้าแล้ว {$existing} ไฟล์)");

                    $schemeReport['scanned_files'] += $allowed;
                    $schemeReport['new_files'] += $new;
                    $report['stats']['total_files_scanned'] += $allowed;

                    // 2.2 ทยอยดาวน์โหลดเฉพาะไฟล์ใหม่
                    if ($new > 0 || $force) {
                        $this->info("  - กำลังดาวน์โหลดและนำเข้าไฟล์ใหม่ {$new} ไฟล์...");
                        $downloadResult = $portal->downloadAndImport(
                            $importer,
                            "Auto-sync 12:00 ({$startTime->format('Y-m-d H:i')}) [{$periodLabel}]",
                            0,
                            ! $force
                        );

                        $importedCount = count($downloadResult['imported'] ?? []);
                        $downloadedCount = count($downloadResult['downloaded'] ?? []);
                        $this->info("  ✓ ดาวน์โหลดสำเร็จ {$downloadedCount} ไฟล์ และนำเข้าแล้ว {$importedCount} ไฟล์");

                        $schemeReport['downloaded'] += $downloadedCount;
                        $schemeReport['imported'] += $importedCount;
                        $report['stats']['rep_imported'] += $importedCount;
                        $report['stats']['total_files_imported'] += $importedCount;
                    }

                    // 2.3 หากกองทุนรองรับ Statement / STM (เช่น CGD / UCS) ตรวจสอบและดึงไฟล์ STM อัตโนมัติ
                    if (config("claim_schemes.{$schemeKey}.has_stm", false)) {
                        $this->info("  - กำลังตรวจสอบและดาวน์โหลด Statement (STM) งวด {$periodLabel}...");
                        try {
                            $stmResult = $portal->downloadAndImportAllStmFiles(
                                $stmImporter,
                                $pYear,
                                $pMonth,
                                "Auto-sync Statement 12:00 ({$startTime->format('Y-m-d H:i')}) [{$periodLabel}]",
                                ! $force
                            );
                            $stmScanned = (int) ($stmResult['scanned'] ?? 0);
                            $stmDownloaded = (int) ($stmResult['downloaded'] ?? 0);
                            $stmImported = (int) ($stmResult['imported'] ?? 0);

                            $schemeReport['stm_scanned'] += $stmScanned;
                            $schemeReport['stm_downloaded'] += $stmDownloaded;
                            $schemeReport['stm_imported'] += $stmImported;
                            $report['stats']['stm_imported'] += $stmImported;
                            $report['stats']['total_files_imported'] += $stmImported;

                            $this->info("  ✓ Statement (STM): สแกนพบ {$stmScanned} ไฟล์, นำเข้าใหม่ {$stmImported} ไฟล์");
                        } catch (\Throwable $stmErr) {
                            $this->warn("  ⚠ ซิงค์ Statement (STM) งวด {$periodLabel} ไม่สำเร็จ: " . $stmErr->getMessage());
                            $schemeReport['stm_error'] = $stmErr->getMessage();
                        }
                    }
                }

                $schemeReport['status'] = 'success';
            } catch (\Throwable $schemeErr) {
                $err = "กองทุน {$schemeKey} ผิดพลาด: {$schemeErr->getMessage()}";
                $this->error("  ✗ {$err}");
                Log::warning($err);
                $schemeReport['status'] = 'error';
                $schemeReport['error'] = $schemeErr->getMessage();
                $report['errors'][] = $err;
            }

            $report['schemes'][$schemeKey] = $schemeReport;
        }

        // -------------------------------------------------------------
        // 3. Hot-Folder & Auto C-Deny Settlement
        // -------------------------------------------------------------
        $this->info("[3/3] สแกน Hot-Folder บอท Auto4STM และตัดยอดติด C อัตโนมัติ...");
        try {
            $hotRes = $rcmSyncService->scanAndImportHotFolder(null, true);
            $hotImported = (int) ($hotRes['imported_count'] ?? 0);
            $report['hotfolder'] = [
                'status' => 'success',
                'imported_count' => $hotImported,
            ];
            $report['stats']['total_files_imported'] += $hotImported;
            $this->info("  ✓ Hot-Folder: นำเข้าไฟล์ใหม่ {$hotImported} ไฟล์");
        } catch (\Throwable $hfErr) {
            $this->warn("  ⚠ Hot-Folder scan warning: " . $hfErr->getMessage());
        }

        try {
            $settleRes = $reconcileService->runAutoSettlement();
            $settleCount = (int) ($settleRes['affected_stm_rows'] ?? 0);
            $recoveredAmt = (float) ($settleRes['recovered_amount'] ?? 0.0);
            $report['c_deny_settled'] = $settleCount;
            $report['c_deny_recovered_amount'] = $recoveredAmt;
            $this->info("  ✓ Auto C-Deny: ตัดยอดอุทธรณ์สำเร็จ {$settleCount} รายการ (" . number_format($recoveredAmt, 2) . " บาท)");

            try {
                $qiSyncService->syncIm11();
                $this->info("  ✓ ซิงค์ตัวชี้วัดคุณภาพ IM-11 เรียบร้อย");
            } catch (\Throwable $qiErr) {
                // non-fatal
            }
        } catch (\Throwable $setErr) {
            $this->warn("  ⚠ Auto settlement warning: " . $setErr->getMessage());
        }

        $endTime = now();
        $durationSeconds = abs($startTime->diffInSeconds($endTime));
        $report['completed_at'] = $endTime->toIso8601String();
        $report['duration_seconds'] = $durationSeconds;

        // บันทึกรายงานสรุปลง Cache ทั้งสองจุด เพื่อให้หน้า RCM และหน้าการเงินอ่านไปแสดงผลได้ทันที
        Cache::put('finance_last_auto_sync_report', $report, now()->addDays(7));
        Cache::put('rcm_last_one_click_sync', [
            'time' => $endTime->toDateTimeString(),
            'stats' => $report['stats'],
            'results' => $report,
        ], 86400 * 7);

        $this->info("=== สิ้นสุดกระบวนการซิงค์อัตโนมัติ (ใช้เวลา {$durationSeconds} วินาที) ===");

        return count($report['errors']) > 0 ? self::SUCCESS : self::SUCCESS;
    }
}
