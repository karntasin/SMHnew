<?php

namespace App\Http\Controllers\Rcm;

use App\Http\Controllers\Controller;
use App\Services\Rcm\RcmAutoSyncService;
use App\Services\Rcm\RcmHistoricalSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RcmAutoSyncController extends Controller
{
    public function __construct(
        protected readonly RcmAutoSyncService $autoSyncService,
        protected readonly RcmHistoricalSyncService $historicalService,
    ) {}

    public function triggerDownload(Request $request): JsonResponse
    {
        try {
            $year = (int) $request->input('year', date('Y'));
            $month = (int) $request->input('month', date('n'));
            $otp = $request->input('otp');
            $scheme = (string) $request->input('scheme', 'cgd');
            $totpSecret = $request->input('totp_secret');

            if (filled($totpSecret)) {
                $cleanSecret = strtoupper(preg_replace('/[\s\-]/', '', trim((string) $totpSecret)));
                \App\Support\EnvFile::set([
                    'CGD_ECLAIM_TOTP_SECRET' => $cleanSecret,
                    'NHSO_TOTP_SECRET' => $cleanSecret,
                ]);
                @\Illuminate\Support\Facades\Artisan::call('config:clear');
            }

            $result = $this->autoSyncService->downloadFromPortal($year, $month, $otp, $scheme, $totpSecret);

            return response()->json($result);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("RCM Trigger Download Error: {$e->getMessage()}");

            return response()->json([
                'success' => false,
                'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage(),
            ], 200);
        }
    }

    /**
     * ซิงค์ครบวงจรในปุ่มเดียว (One-Click Comprehensive Sync)
     */
    public function oneClickSync(Request $request): JsonResponse
    {
        try {
            $year = (int) $request->input('year', date('Y'));
            $month = (int) $request->input('month', date('n'));
            $otp = $request->input('otp');
            $scheme = (string) $request->input('scheme', 'cgd');
            $totpSecret = $request->input('totp_secret');

            if (filled($totpSecret)) {
                $cleanSecret = strtoupper(preg_replace('/[\s\-]/', '', trim((string) $totpSecret)));
                \App\Support\EnvFile::set([
                    'CGD_ECLAIM_TOTP_SECRET' => $cleanSecret,
                    'NHSO_TOTP_SECRET' => $cleanSecret,
                ]);
                @\Illuminate\Support\Facades\Artisan::call('config:clear');
            }

            $result = $this->autoSyncService->runOneClickComprehensiveSync($year, $month, $otp, $scheme, $totpSecret);

            return response()->json($result);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("RCM One-Click Sync Error: {$e->getMessage()}", [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'requires_otp' => false,
                'message' => 'เกิดข้อผิดพลาดในการประมวลผล: ' . $e->getMessage(),
                'error' => $e->getMessage(),
                'steps' => [
                    'error' => $e->getMessage(),
                ],
            ], 200);
        }
    }

    /**
     * ถอดรหัส Google Authenticator Migration URL (otpauth-migration://...)
     */
    public function decodeMigration(Request $request): JsonResponse
    {
        $raw = trim((string) $request->input('migration_url', ''));
        if (empty($raw)) {
            return response()->json([
                'success' => false,
                'message' => 'กรุณาระบุ otpauth-migration URL หรือข้อความจาก QR Code',
            ]);
        }

        $accounts = \App\Support\Auth\GoogleAuthMigration::parse($raw);
        if (empty($accounts)) {
            return response()->json([
                'success' => false,
                'message' => 'ไม่พบข้อมูลบัญชีหรือรูปแบบข้อมูลไม่ถูกต้อง',
            ]);
        }

        // ค้นหาบัญชีที่เกี่ยวกับ NHSO หรือ e-claim หรือใช้ตัวแรก
        $selected = null;
        foreach ($accounts as $acc) {
            $name = strtolower(($acc['name'] ?? '') . ' ' . ($acc['issuer'] ?? ''));
            if (str_contains($name, 'nhso') || str_contains($name, 'eclaim') || str_contains($name, '521043014976')) {
                $selected = $acc;
                break;
            }
        }
        if (! $selected) {
            $selected = $accounts[0];
        }

        return response()->json([
            'success' => true,
            'accounts' => $accounts,
            'selected' => $selected,
            'secret' => $selected['secret_base32'] ?? '',
        ]);
    }

    /**
     * บันทึกรหัสลับ TOTP Secret Key ลงไฟล์ .env เพื่อเปิดใช้งาน Zero-Click Auth
     */
    public function saveTotp(Request $request): JsonResponse
    {
        $secret = trim((string) $request->input('totp_secret', ''));
        if (empty($secret)) {
            return response()->json([
                'success' => false,
                'message' => 'กรุณาระบุ TOTP Secret Key (รหัสลับ 16-32 ตัวอักษร)',
            ]);
        }

        $cleanSecret = strtoupper(preg_replace('/[\s\-]/', '', $secret));

        \App\Support\EnvFile::set([
            'CGD_ECLAIM_TOTP_SECRET' => $cleanSecret,
            'NHSO_TOTP_SECRET' => $cleanSecret,
        ]);
        @\Illuminate\Support\Facades\Artisan::call('config:clear');

        $testOtp = \App\Support\Auth\Totp::generate($cleanSecret);

        return response()->json([
            'success' => true,
            'message' => 'บันทึก TOTP Secret Key เรียบร้อยแล้ว! ระบบเปิดใช้งาน Zero-Click Auth อัตโนมัติ 100% (รหัสทดสอบ: ' . $testOtp . ')',
            'test_otp' => $testOtp,
            'has_totp' => true,
        ]);
    }

    public function scanFolder(Request $request): JsonResponse
    {
        $folder = $request->input('folder_path');
        $autoImport = $request->boolean('auto_import', true);

        $result = $this->autoSyncService->scanAndImportHotFolder($folder, $autoImport);

        return response()->json($result);
    }

    /**
     * ตรวจสอบรายการไฟล์ Statement ย้อนหลัง (สูงสุดถึง ม.ค. 67 / 35 เดือน)
     */
    public function verifyHistorical(Request $request): JsonResponse
    {
        $scheme = (string) $request->input('scheme', 'cgd');
        $rawMonths = $request->input('months', 6);
        $startDate = $request->input('start_date');

        $result = $this->historicalService->verifyHistoricalMonths($scheme, $rawMonths, $startDate);

        return response()->json($result);
    }

    /**
     * เริ่มการทำงานคิวทยอยดาวน์โหลด 6 เดือนย้อนหลัง
     */
    public function startHistoricalSync(Request $request): JsonResponse
    {
        $scheme = (string) $request->input('scheme', 'cgd');

        $result = $this->historicalService->startSync($scheme);

        return response()->json($result);
    }

    /**
     * ดำเนินการดาวน์โหลดทีละ Chunk (สำหรับ Runner เบื้องหลัง)
     */
    public function stepHistoricalSync(Request $request): JsonResponse
    {
        $scheme = (string) $request->input('scheme', 'cgd');
        $batchSize = (int) $request->input('batch_size', 2);

        $result = $this->historicalService->processNextBatch($scheme, $batchSize);

        return response()->json($result);
    }

    /**
     * ติดตามความคืบหน้าการดาวน์โหลด Real-time
     */
    public function getHistoricalStatus(Request $request): JsonResponse
    {
        $scheme = (string) $request->query('scheme', 'cgd');

        $result = $this->historicalService->getProgress($scheme);

        return response()->json($result);
    }

    /**
     * พักการดาวน์โหลดชั่วคราว
     */
    public function pauseHistoricalSync(Request $request): JsonResponse
    {
        $scheme = (string) $request->input('scheme', 'cgd');

        $result = $this->historicalService->pauseSync($scheme);

        return response()->json($result);
    }

    /**
     * ล้างคิวการดาวน์โหลด
     */
    public function resetHistoricalSync(Request $request): JsonResponse
    {
        $scheme = (string) $request->input('scheme', 'cgd');

        $result = $this->historicalService->resetSync($scheme);

        return response()->json($result);
    }
}
