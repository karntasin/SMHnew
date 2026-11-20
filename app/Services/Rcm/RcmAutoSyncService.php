<?php

namespace App\Services\Rcm;

use App\Services\Finance\CgdEclaimNhsoPortalService;
use App\Services\Finance\CgdStmImportService;
use App\Services\Finance\NhsoSmtPortalService;
use App\Services\Finance\StmFileImportService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class RcmAutoSyncService
{
    public function __construct(
        protected readonly CgdEclaimNhsoPortalService $portalService,
        protected readonly RcmReconcileService $reconcileService,
        protected readonly RcmQualityIndicatorSyncService $qiSyncService,
        protected readonly CgdStmImportService $repImporter,
        protected readonly StmFileImportService $stmImporter,
        protected readonly NhsoSmtPortalService $smtService,
        protected readonly RcmMonthlyComparisonService $monthlyComparisonService,
    ) {}

    /**
     * ดึงไฟล์ REP / STM อัตโนมัติผ่าน Portal e-Claim / สกส.
     */
    public function downloadFromPortal(int $year, int $month, ?string $otp = null, string $scheme = 'cgd', ?string $totpSecret = null, bool $force = false): array
    {
        try {
            $supportedSchemes = array_keys(config('claim_schemes', ['cgd' => [], 'lgo' => [], 'ucs' => []]));
            $scheme = in_array(strtolower($scheme), $supportedSchemes, true) ? strtolower($scheme) : 'cgd';
            $portal = $this->portalService->forScheme($scheme);

            if (! $portal->isConfigured()) {
                return [
                    'success' => false,
                    'requires_config' => true,
                    'message' => 'ยังไม่ได้ตั้งค่า CGD_ECLAIM_USERNAME / PASSWORD ในไฟล์ .env ของระบบ SMH',
                ];
            }

            $isAuthenticated = $portal->isAuthenticated();
            if (! $isAuthenticated) {
                $hasTotp = $portal->isTotpConfigured($totpSecret);
                if ($hasTotp || empty($otp)) {
                    $loginResult = $portal->startLogin($year, $month, null, null, $totpSecret, true);
                    if (($loginResult['status'] ?? '') === 'awaiting_otp' && ! $portal->isTotpConfigured($totpSecret)) {
                        return [
                            'success' => true,
                            'requires_otp' => true,
                            'status' => 'awaiting_otp',
                            'message' => $loginResult['message'] ?? 'ระบบ e-Claim บังคับยืนยันตัวตน 2FA กรุณากรอกรหัส OTP 6 หลักจาก Google Authenticator / SMS หรือระบุ TOTP Secret Key',
                        ];
                    }
                } else {
                    $otpResult = $portal->submitOtp($otp);
                    if (($otpResult['status'] ?? '') === 'otp_failed') {
                        return [
                            'success' => false,
                            'requires_otp' => true,
                            'message' => $otpResult['message'] ?? 'รหัส OTP ไม่ถูกต้อง กรุณากรอกใหม่อีกครั้ง',
                        ];
                    }
                }
            }

            // สแกนลิงก์ไฟล์ Statement ที่พร้อมให้ดาวน์โหลด
            $scanResult = $portal->scanFiles($year, $month);
            $allowed = (int) ($scanResult['allowed_files'] ?? 0);
            $newFiles = (int) ($scanResult['new_files'] ?? 0);

            $importResult = [];
            if ($newFiles > 0 || $force) {
                $importResult = $portal->downloadAndImport($this->repImporter, 'RCM Portal Auto-Download', 0, ! $force);
            }

            // ดึงไฟล์ Statement (STM) หากกองทุนรองรับ
            if (config("claim_schemes.{$scheme}.has_stm", true)) {
                try {
                    $portal->downloadAndImportAllStmFiles($this->stmImporter, $year, $month, 'RCM Portal Auto-Download');
                } catch (\Throwable $stmErr) {
                    Log::warning('RCM downloadFromPortal STM error: '.$stmErr->getMessage());
                }
            }

            // ตรวจสอบและตัดยอดติด C / อุทธรณ์อัตโนมัติ
            $this->reconcileService->runAutoSettlement();

            // ซิงค์สถิติติด C เข้าสู่ตัวชี้วัดคุณภาพ IM-11
            try {
                $this->qiSyncService->syncIm11();
            } catch (\Throwable $e) {
                Log::warning('Auto sync IM-11 indicator failed: '.$e->getMessage());
            }

            return [
                'success' => true,
                'requires_otp' => false,
                'message' => "ดาวน์โหลดและนำเข้าไฟล์เข้าสู่ระบบ RCM สำเร็จ (พบทั้งหมด {$allowed} ไฟล์, นำเข้าใหม่ {$newFiles} ไฟล์)",
                'details' => $importResult,
            ];
        } catch (\Throwable $e) {
            Log::error('Auto Download Portal failed: '.$e->getMessage());

            return [
                'success' => false,
                'message' => 'เกิดข้อผิดพลาดในการเชื่อมต่อ Portal: '.$e->getMessage(),
            ];
        }
    }

    /**
     * ดึงข้อมูลครบวงจรทุกสิทธิอัตโนมัติ (All Claim Schemes Auto-Sync)
     * วนลูปดึง e-Claim REP และ STM ของทุกสิทธิใน config('claim_schemes') (CGD, LGO, UCS, และสิทธิใหม่ในอนาคต)
     * พร้อมซิงค์เงินโอน SMT, สแกน Hot-Folder, และตัดยอดติด C
     */
    public function runComprehensiveSyncAllSchemes(
        int $year,
        int $month,
        ?string $otp = null,
        bool $force = false,
        ?string $totpSecret = null
    ): array {
        @set_time_limit(1800);
        $ceYear = $year >= 2500 ? $year - 543 : $year;
        $beYear = $year < 2500 ? $year + 543 : $year;

        $schemes = array_keys(config('claim_schemes', ['cgd' => [], 'lgo' => [], 'ucs' => []]));

        $results = [
            'success' => true,
            'requires_otp' => false,
            'message' => '',
            'schemes' => [],
            'stats' => [
                'total_files_scanned' => 0,
                'total_files_imported' => 0,
                'stm_imported' => 0,
                'rep_imported' => 0,
                'hotfolder_imported' => 0,
                'smt_synced' => 0,
                'smt_amount' => 0.0,
                'c_deny_settled' => 0,
                'c_deny_recovered_amount' => 0.0,
            ],
            'steps' => [],
        ];

        // 1. หมุนวนดึงข้อมูล e-Claim แยกตามสิทธิ
        foreach ($schemes as $schemeKey) {
            $schemeTitle = config("claim_schemes.{$schemeKey}.title", strtoupper($schemeKey));
            $portal = $this->portalService->forScheme($schemeKey);

            $schemeStat = [
                'scheme' => $schemeKey,
                'title' => $schemeTitle,
                'status' => 'pending',
                'rep_scanned' => 0,
                'rep_imported' => 0,
                'stm_scanned' => 0,
                'stm_imported' => 0,
                'message' => '',
            ];

            if (! $portal->isConfigured()) {
                $schemeStat['status'] = 'skipped_not_configured';
                $schemeStat['message'] = 'ยังไม่ได้ตั้งค่า Username/Password';
                $results['schemes'][$schemeKey] = $schemeStat;
                continue;
            }

            try {
                if (! $portal->isAuthenticated()) {
                    $login = $portal->startLogin($ceYear, $month, null, null, $totpSecret, true);
                    if (($login['status'] ?? '') === 'awaiting_otp') {
                        if (filled($otp)) {
                            $portal->submitOtp($otp);
                        } else {
                            $results['requires_otp'] = true;
                            $schemeStat['status'] = 'awaiting_otp';
                            $schemeStat['message'] = 'ต้องกรอกรหัส OTP 2FA';
                            $results['schemes'][$schemeKey] = $schemeStat;
                            continue;
                        }
                    }
                }

                // 1.1 สแกนและดาวน์โหลด REP
                $scan = $portal->scanFiles($ceYear, $month);
                $newFiles = (int) ($scan['new_files'] ?? 0);
                $allowed = (int) ($scan['allowed_files'] ?? 0);
                $schemeStat['rep_scanned'] = $allowed;
                $results['stats']['total_files_scanned'] += $allowed;

                if ($newFiles > 0 || $force) {
                    $repRes = $portal->downloadAndImport($this->repImporter, "RCM Auto-Sync All ({$schemeTitle})", 0, ! $force);
                    $repCount = count($repRes['imported'] ?? []);
                    $schemeStat['rep_imported'] = $repCount;
                    $results['stats']['rep_imported'] += $repCount;
                    $results['stats']['total_files_imported'] += $repCount;
                }

                // 1.2 สแกนและดาวน์โหลด STM (ถ้ามี)
                if (config("claim_schemes.{$schemeKey}.has_stm", true)) {
                    try {
                        $stmRes = $portal->downloadAndImportAllStmFiles($this->stmImporter, $ceYear, $month, "RCM Auto-Sync All ({$schemeTitle})");
                        $stmCount = (int) ($stmRes['imported'] ?? 0);
                        $schemeStat['stm_scanned'] = (int) ($stmRes['scanned'] ?? 0);
                        $schemeStat['stm_imported'] = $stmCount;
                        $results['stats']['stm_imported'] += $stmCount;
                        $results['stats']['total_files_imported'] += $stmCount;
                    } catch (\Throwable $stmEx) {
                        Log::warning("STM sync error for {$schemeKey}: " . $stmEx->getMessage());
                    }
                }

                $schemeStat['status'] = 'success';
                $schemeStat['message'] = "นำเข้า REP {$schemeStat['rep_imported']} ไฟล์, STM {$schemeStat['stm_imported']} ไฟล์";
            } catch (\Throwable $ex) {
                $schemeStat['status'] = 'error';
                $schemeStat['message'] = $ex->getMessage();
                Log::warning("Auto-sync error for {$schemeKey}: " . $ex->getMessage());
            }

            $results['schemes'][$schemeKey] = $schemeStat;
            $results['steps'][] = "{$schemeTitle}: {$schemeStat['message']}";
        }

        // 2. ซิงค์ยอดเงินโอนจริงจาก SMT สปสช.
        try {
            $smtResult = $this->smtService->syncTransfers(['budget_year' => $beYear]);
            $results['stats']['smt_synced'] = (int) ($smtResult['synced'] ?? 0);
            $results['stats']['smt_amount'] = (float) ($smtResult['summary']['total_all'] ?? 0.0);
            $results['steps'][] = "SMT โอนเงินจริง: ซิงค์ {$results['stats']['smt_synced']} รายการ (" . number_format($results['stats']['smt_amount'], 2) . ' บาท)';
        } catch (\Throwable $smtErr) {
            Log::warning('RCM Auto-Sync SMT error: ' . $smtErr->getMessage());
        }

        // 3. สแกน Hot-Folder บอท Auto4STM
        try {
            $hotRes = $this->scanAndImportHotFolder(null, true);
            $results['stats']['hotfolder_imported'] = (int) ($hotRes['imported_count'] ?? 0);
            $results['steps'][] = "Hot-Folder Auto4STM: นำเข้า {$results['stats']['hotfolder_imported']} ไฟล์";
        } catch (\Throwable $hfErr) {
            Log::warning('RCM Auto-Sync Hot-Folder error: ' . $hfErr->getMessage());
        }

        // 4. ตัดยอดติด C และอุทธรณ์อัตโนมัติ
        try {
            $settleRes = $this->reconcileService->runAutoSettlement();
            $results['stats']['c_deny_settled'] = (int) ($settleRes['affected_stm_rows'] ?? 0);
            $results['stats']['c_deny_recovered_amount'] = (float) ($settleRes['recovered_amount'] ?? 0.0);
            $results['steps'][] = "ตัดยอดติด C: สำเร็จ {$results['stats']['c_deny_settled']} รายการ";
            try {
                $this->qiSyncService->syncIm11();
            } catch (\Throwable) {}
        } catch (\Throwable $setErr) {
            Log::warning('RCM Auto-Sync Settle error: ' . $setErr->getMessage());
        }

        $results['message'] = "ซิงค์ครบวงจรทุกสิทธิสำเร็จ (นำเข้าทั้งหมด {$results['stats']['total_files_imported']} ไฟล์, ซิงค์ SMT {$results['stats']['smt_synced']} รายการ, ตัดยอดติด C {$results['stats']['c_deny_settled']} รายการ)";

        Cache::put('rcm_last_one_click_sync', [
            'time' => now()->toDateTimeString(),
            'stats' => $results['stats'],
            'results' => $results,
        ], 86400 * 7);

        return $results;
    }

    /**
     * ซิงค์ครบวงจรในปุ่มเดียว (One-Click Comprehensive Sync):
     * 1. ยืนยันตัวตนอัตโนมัติกับ NHSO IAM (Zero-Click TOTP 2FA)
     * 2. สแกนและดาวน์โหลด Statement (STM) ล่าสุดจาก e-Claim Statement Report
     * 3. สแกนและดาวน์โหลดผลการตรวจ (REP) ล่าสุดจาก e-Claim Validation
     * 4. สแกน Hot-Folder บอท Auto4STM
     * 5. ซิงค์ยอดเงินโอนจริงจาก SMT สปสช.
     * 6. ตรวจสอบและตัดยอดติด C / อุทธรณ์ (Auto C-Deny Settlement) พร้อมบันทึกตัวชี้วัด IM-11
     * 7. ปรับปรุงข้อมูลเปรียบเทียบ 3 ฝ่าย (HOSxP vs REP vs STM)
     */
    public function runOneClickComprehensiveSync(
        int $year,
        int $month,
        ?string $otp = null,
        string $scheme = 'cgd',
        ?string $totpSecret = null
    ): array {
        @set_time_limit(1800);
        $scheme = in_array(strtolower($scheme), ['lgo', 'cgd']) ? strtolower($scheme) : 'cgd';
        $portal = $this->portalService->forScheme($scheme);

        $ceYear = $year >= 2500 ? $year - 543 : $year;
        $beYear = $year < 2500 ? $year + 543 : $year;

        $results = [
            'success' => false,
            'requires_otp' => false,
            'requires_config' => false,
            'message' => '',
            'steps' => [],
            'stats' => [
                'stm_scanned' => 0,
                'stm_imported' => 0,
                'rep_scanned' => 0,
                'rep_imported' => 0,
                'hotfolder_imported' => 0,
                'smt_synced' => 0,
                'smt_amount' => 0.0,
                'c_deny_settled' => 0,
                'c_deny_recovered_amount' => 0.0,
                'monthly_comparison_updated' => false,
            ],
        ];

        // 1. ตรวจสอบการตั้งค่า Credential & การเข้าสู่ระบบ
        $isAuthenticated = false;
        if (! $portal->isConfigured()) {
            $results['steps']['auth'] = 'ข้ามการเชื่อมต่อ Portal (ยังไม่ได้ตั้งค่า CGD_ECLAIM_USERNAME / PASSWORD ใน .env)';
        } else {
            // 2. ตรวจสอบการ Login / ยืนยันตัวตน
            $isAuthenticated = $portal->isAuthenticated();
            if (! $isAuthenticated) {
                $hasTotp = $portal->isTotpConfigured($totpSecret);

                // หากมี TOTP Secret Key หรือไม่มี OTP จากหน้าเว็บ ให้เริ่มขั้นตอนล็อกอินใหม่แบบอัตโนมัติ (Zero-Click)
                if ($hasTotp || empty($otp)) {
                    try {
                        $loginResult = $portal->startLogin($ceYear, $month, null, null, $totpSecret, true);
                        if (($loginResult['status'] ?? '') === 'authenticated') {
                            $isAuthenticated = true;
                        } elseif (($loginResult['status'] ?? '') === 'awaiting_otp') {
                            if (! empty($otp)) {
                                $otpResult = $portal->submitOtp($otp);
                                if (($otpResult['status'] ?? '') === 'authenticated') {
                                    $isAuthenticated = true;
                                } else {
                                    $results['requires_otp'] = true;
                                    $results['message'] = $otpResult['message'] ?? 'รหัส OTP ไม่ถูกต้อง กรุณากรอกใหม่อีกครั้ง';

                                    return $results;
                                }
                            } else {
                                $results['requires_otp'] = true;
                                $results['message'] = 'ระบบ e-Claim บังคับยืนยันตัวตน 2FA กรุณาระบุ TOTP Secret Key ในระบบ หรือกรอกรหัส OTP 6 หลัก';

                                return $results;
                            }
                        } else {
                            $results['steps']['auth_error'] = $loginResult['message'] ?? 'ไม่สามารถเข้าสู่ระบบ e-Claim ได้ (ข้ามการดาวน์โหลด Portal)';
                        }
                    } catch (\Throwable $authEx) {
                        Log::warning('RCM One-Click Auth error: '.$authEx->getMessage());
                        $results['steps']['auth_error'] = 'เข้าสู่ระบบ e-Claim ไม่สำเร็จ: '.$authEx->getMessage();
                    }
                } else {
                    // กรณีไม่มี TOTP Secret แต่มี OTP 6 หลักที่กรอกมาเอง
                    try {
                        $otpResult = $portal->submitOtp($otp);
                        if (($otpResult['status'] ?? '') === 'otp_failed') {
                            $results['requires_otp'] = true;
                            $results['message'] = $otpResult['message'] ?? 'รหัส OTP ไม่ถูกต้อง กรุณากรอกใหม่อีกครั้ง';

                            return $results;
                        }
                        $isAuthenticated = true;
                    } catch (\Throwable $e) {
                        Log::warning('RCM manual submitOtp error, trying fresh login: '.$e->getMessage());
                        try {
                            $loginResult = $portal->startLogin($ceYear, $month, null, null, $totpSecret, true);
                            if (($loginResult['status'] ?? '') === 'authenticated') {
                                $isAuthenticated = true;
                            } else {
                                $results['requires_otp'] = true;
                                $results['message'] = 'เซสชันเดิมหมดอายุ กรุณากรอกรหัส OTP ใหม่อีกครั้ง';

                                return $results;
                            }
                        } catch (\Throwable $ex2) {
                            $results['steps']['auth_error'] = 'เข้าสู่ระบบไม่สำเร็จ: '.$ex2->getMessage();
                        }
                    }
                }
            }

            if ($isAuthenticated) {
                $results['steps']['auth'] = 'เข้าสู่ระบบ e-Claim สำเร็จ (Zero-Click Authenticated)';

                // 3. ดึงไฟล์ Statement (STM) ล่าสุดจาก e-Claim
                try {
                    $stmSync = $portal->downloadAndImportAllStmFiles($this->stmImporter, $ceYear, $month, 'RCM One-Click Sync');
                    $results['stats']['stm_scanned'] = (int) ($stmSync['scanned'] ?? 0);
                    $results['stats']['stm_imported'] = (int) ($stmSync['imported'] ?? 0);
                    $results['steps']['stm'] = "Statement (STM): สแกนพบ {$results['stats']['stm_scanned']} ไฟล์, นำเข้าใหม่ {$results['stats']['stm_imported']} ไฟล์";
                } catch (\Throwable $e) {
                    Log::warning('RCM One-Click STM sync error: '.$e->getMessage());
                    $results['steps']['stm_error'] = $e->getMessage();
                }

                // 4. ดึงไฟล์ผลการตรวจสอบ (REP) ล่าสุดจาก e-Claim
                try {
                    $scanResult = $portal->scanFiles($ceYear, $month);
                    $newFiles = (int) ($scanResult['new_files'] ?? 0);
                    $allowedFiles = (int) ($scanResult['allowed_files'] ?? 0);
                    $results['stats']['rep_scanned'] = $allowedFiles;

                    if ($newFiles > 0) {
                        $repSync = $portal->downloadAndImport($this->repImporter, 'RCM One-Click Sync', 0, true);
                        $results['stats']['rep_imported'] = count($repSync['imported'] ?? []);
                    }
                    $results['steps']['rep'] = "ผลการตรวจ (REP): สแกนพบ {$allowedFiles} ไฟล์, นำเข้าใหม่ {$results['stats']['rep_imported']} ไฟล์";
                } catch (\Throwable $e) {
                    Log::warning('RCM One-Click REP sync error: '.$e->getMessage());
                    $results['steps']['rep_error'] = $e->getMessage();
                }
            }
        }

        // 5. สแกน Hot-Folder บอท Auto4STM เพิ่มเติม
        try {
            $hotFolderResult = $this->scanAndImportHotFolder(null, true);
            $results['stats']['hotfolder_imported'] = (int) ($hotFolderResult['imported_count'] ?? 0);
            $results['steps']['hotfolder'] = "Hot-Folder Auto4STM: นำเข้า {$results['stats']['hotfolder_imported']} ไฟล์";
        } catch (\Throwable $e) {
            Log::warning('RCM One-Click Hot-Folder error: '.$e->getMessage());
        }

        // 6. ซิงค์ข้อมูลการโอนเงินจริงจาก SMT สปสช.
        try {
            $smtResult = $this->smtService->syncTransfers(['budget_year' => $beYear]);
            $results['stats']['smt_synced'] = (int) ($smtResult['synced'] ?? 0);
            $results['stats']['smt_amount'] = (float) ($smtResult['summary']['total_all'] ?? 0.0);
            $results['steps']['smt'] = "SMT โอนเงินจริง: ซิงค์สำเร็จ {$results['stats']['smt_synced']} รายการ (ยอดเงิน ".number_format($results['stats']['smt_amount'], 2).' บาท)';
        } catch (\Throwable $e) {
            Log::warning('RCM One-Click SMT sync error: '.$e->getMessage());
            $results['steps']['smt_error'] = $e->getMessage();
        }

        // 7. ตรวจสอบและตัดยอดติด C / อุทธรณ์ (Auto C-Deny Settlement) & IM-11
        $settleResult = [];
        try {
            $settleResult = $this->reconcileService->runAutoSettlement();
            $results['stats']['c_deny_settled'] = (int) ($settleResult['affected_stm_rows'] ?? 0);
            $results['stats']['c_deny_recovered_amount'] = (float) ($settleResult['recovered_amount'] ?? 0.0);
            $results['steps']['c_deny'] = $settleResult['message'] ?? 'ตัดยอดติด C และอุทธรณ์เรียบร้อย';

            try {
                $this->qiSyncService->syncIm11();
            } catch (\Throwable $qiErr) {
                Log::warning('Sync IM-11 error: '.$qiErr->getMessage());
            }
        } catch (\Throwable $e) {
            Log::warning('RCM One-Click Auto-Settle error: '.$e->getMessage());
            $results['steps']['c_deny_error'] = $e->getMessage();
        }

        // 8. คำนวณและปรับปรุงข้อมูลเปรียบเทียบ 3 ฝ่าย (HOSxP vs REP vs STM)
        $comparison = [];
        try {
            $comparison = $this->monthlyComparisonService->getMonthlyComparison($beYear, $scheme, 'opd', 'all');
            $results['stats']['monthly_comparison_updated'] = true;
            $results['steps']['monthly_comparison'] = 'ปรับปรุงข้อมูลสรุปเปรียบเทียบ 3 ฝ่ายเรียบร้อยแล้ว';
        } catch (\Throwable $e) {
            Log::warning('RCM One-Click Monthly Comparison error: '.$e->getMessage());
            $results['steps']['monthly_comparison_error'] = $e->getMessage();
        }

        $results['success'] = true;
        $results['message'] = "ซิงค์ครบวงจรสำเร็จ: นำเข้า STM {$results['stats']['stm_imported']} ไฟล์, REP {$results['stats']['rep_imported']} ไฟล์, ตัดยอดติด C {$results['stats']['c_deny_settled']} รายการ, อัปเดตเปรียบเทียบ 3 ฝ่ายเรียบร้อย";

        $results['summary'] = [
            'stm_files_imported' => $results['stats']['stm_imported'],
            'rep_files_imported' => $results['stats']['rep_imported'],
            'hotfolder_files_imported' => $results['stats']['hotfolder_imported'],
            'c_deny_settled_count' => $results['stats']['c_deny_settled'],
            'c_deny_settled_amount' => $results['stats']['c_deny_recovered_amount'],
            'appeal_settled_count' => $settleResult['appeal_settled_count'] ?? 0,
            'monthly_comparison_count' => is_countable($comparison) ? count($comparison) : 12,
        ];

        $results['phases'] = [];
        foreach ($results['steps'] as $k => $msg) {
            $results['phases'][$k] = [
                'name' => match ($k) {
                    'auth' => 'ยืนยันตัวตน Zero-Click Auth',
                    'stm' => 'ดึง Statement (STM)',
                    'rep' => 'ดึงรายงานตรวจ (REP)',
                    'hotfolder' => 'สแกน Hot-Folder บอท',
                    'smt' => 'ซิงค์ข้อมูลชดเชย SMT',
                    'c_deny' => 'ตัดยอดติด C / อุทธรณ์',
                    'im11' => 'ตัวชี้วัด IM-11',
                    'monthly_comparison' => 'เปรียบเทียบ 3 ฝ่าย',
                    default => $k
                },
                'message' => $msg,
                'status' => str_contains($k, 'error') ? 'error' : 'success',
            ];
        }

        Cache::put('rcm_last_one_click_sync', [
            'time' => now()->toDateTimeString(),
            'stats' => $results['stats'],
            'results' => $results,
        ], 86400 * 7);

        return $results;
    }

    /**
     * สแกน Hot-Folder สำหรับไฟล์ REP / STM ที่ดาวน์โหลดมาโดยโปรแกรม Auto4STM.exe หรือ Auto4Rep.exe
     * และทำการ Auto-Import เข้าสู่ระบบทันทีหากพบไฟล์ใหม่
     */
    public function scanAndImportHotFolder(?string $folderPath = null, bool $autoImport = true): array
    {
        // รายการโฟลเดอร์ที่อาจเก็บไฟล์
        $candidateDirs = [
            $folderPath,
            'C:\\Users\\Karntasin\\Downloads\\RCM291069\\RCM291069\\RCM',
            storage_path('app/rcm_sync'),
            storage_path('app/finance_stm'),
        ];

        $targetDir = null;
        foreach (array_filter($candidateDirs) as $dir) {
            if (File::exists($dir)) {
                $targetDir = $dir;
                break;
            }
        }

        if (! $targetDir) {
            $targetDir = storage_path('app/rcm_sync');
            File::makeDirectory($targetDir, 0755, true);
        }

        $files = File::files($targetDir);
        $scanned = [];
        $importedCount = 0;

        foreach ($files as $file) {
            $name = $file->getFilename();
            $ext = strtolower($file->getExtension());

            if (in_array($ext, ['txt', 'csv', 'stm', 'rep', 'xlsx', 'xls'])) {
                // ถ้าเป็นไฟล์ STM หรือ REP
                $isStm = str_contains(strtolower($name), 'stm') || str_contains(strtolower($name), 'rep') || str_contains(strtolower($name), 'appeal') || $ext === 'txt';
                
                $scanned[] = [
                    'filename' => $name,
                    'path' => $file->getPathname(),
                    'size' => $file->getSize(),
                    'modified_at' => date('Y-m-d H:i:s', $file->getMTime()),
                    'is_stm' => $isStm,
                ];

                // Auto-import if requested and size is reasonable
                if ($autoImport && $isStm && $file->getSize() > 0 && $file->getSize() < 5000000) {
                    try {
                        $uploaded = new UploadedFile($file->getPathname(), $name, null, null, true);
                        $claimType = str_contains(strtolower($name), 'cipn') || str_contains(strtolower($name), 'ipd') ? 'CIPN' : 'CSOP';
                        $this->reconcileService->processStmFile($uploaded, $claimType);
                        $importedCount++;
                    } catch (\Throwable $e) {
                        Log::warning("Hot-folder auto-import skipped for {$name}: " . $e->getMessage());
                    }
                }
            }
        }

        if ($importedCount > 0) {
            try {
                $this->qiSyncService->syncIm11();
            } catch (\Throwable $e) {
                Log::warning('HotFolder auto sync IM-11 indicator failed: ' . $e->getMessage());
            }
        }

        Cache::put('rcm_last_auto_sync_at', now()->toDateTimeString(), 86400 * 30);
        Cache::put('rcm_last_auto_sync_count', $importedCount, 86400 * 30);
        Cache::put('rcm_last_auto_sync_folder', $targetDir, 86400 * 30);

        return [
            'success' => true,
            'folder' => $targetDir,
            'total_files' => count($scanned),
            'imported_count' => $importedCount,
            'files' => array_slice($scanned, 0, 50),
            'last_sync_at' => now()->toDateTimeString(),
            'message' => "สแกนพบ {$importedCount} ไฟล์ Statement จากโฟลเดอร์ {$targetDir} และนำเข้ากระทบยอดอัตโนมัติแล้ว",
        ];
    }

    /**
     * ดึงข้อมูลสถานะการซิงค์ล่าสุด
     */
    public function getLastSyncInfo(): array
    {
        return [
            'last_sync_at' => Cache::get('rcm_last_auto_sync_at'),
            'last_sync_count' => Cache::get('rcm_last_auto_sync_count', 0),
            'last_sync_folder' => Cache::get('rcm_last_auto_sync_folder', 'C:\\Users\\Karntasin\\Downloads\\RCM291069\\RCM291069\\RCM'),
            'is_active' => true,
        ];
    }
}
