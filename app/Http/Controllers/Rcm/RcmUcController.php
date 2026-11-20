<?php

namespace App\Http\Controllers\Rcm;

use App\Http\Controllers\Controller;
use App\Services\Finance\CgdEclaimNhsoPortalService;
use App\Services\Finance\CgdStmImportService;
use App\Services\Finance\NhsoSmtPortalService;
use App\Services\Rcm\RcmHosxpService;
use App\Services\Rcm\RcmReportService;
use App\Services\Rcm\RcmUcService;
use App\Support\Finance\ClaimScheme;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RcmUcController extends Controller
{
    public function __construct(
        protected readonly RcmUcService $ucService,
        protected readonly RcmHosxpService $hosxpService,
        protected readonly NhsoSmtPortalService $smtService,
        protected readonly RcmReportService $reportService,
        protected readonly CgdStmImportService $importService,
        protected readonly CgdEclaimNhsoPortalService $portalService,
    ) {}

    /**
     * หน้าระบบเปรียบเทียบข้อมูลบัตรทอง (UC) 3 ฝ่าย (HOSxP vs e-Claim REP vs NHSO SMT เงินโอนจริง)
     */
    public function index(Request $request): InertiaResponse
    {
        $periodMode = $request->query('period_mode', 'since_jan_68');
        $subScheme = $request->query('sub_scheme', 'all');
        $claimType = $request->query('claim_type', 'all');

        $comparisonData = $this->ucService->getMonthlyComparison($periodMode, $subScheme, $claimType);

        return Inertia::render('Rcm/UcIndex', [
            'filters' => [
                'period_mode' => $periodMode,
                'sub_scheme' => $subScheme,
                'claim_type' => $claimType,
            ],
            'comparison' => $comparisonData,
            'hosxp_ready' => $this->hosxpService->available(),
        ]);
    }

    /**
     * API สำหรับเจาะลึกข้อมูลรายเดือน (Drill-Down)
     */
    public function drillDown(Request $request): JsonResponse
    {
        $monthKey = (string) $request->query('month_key');
        if (! $monthKey || ! preg_match('/^\d{4}-\d{2}$/', $monthKey)) {
            return response()->json(['error' => 'Invalid month_key'], 422);
        }

        $subScheme = (string) $request->query('sub_scheme', 'all');
        $claimType = (string) $request->query('claim_type', 'all');
        $tab = (string) $request->query('tab', 'hosxp_visits');
        $limit = min(500, max(10, (int) $request->query('limit', 300)));

        $data = $this->ucService->getMonthlyDrillDown($monthKey, $subScheme, $claimType, $tab, $limit);

        return response()->json($data);
    }

    /**
     * ดึงข้อมูล Statement (STM) ล่าสุดจากเว็บ e-Claim สปสช. (statementUCSAction.do)
     */
    public function syncStm(Request $request): RedirectResponse|JsonResponse
    {
        $year = (int) $request->input('year', 2570);
        $month = (int) $request->input('month', 10);
        $stmImporter = app(\App\Services\Finance\StmFileImportService::class);
        $portal = $this->portalService->forScheme('ucs');

        try {
            $result = $portal->downloadAndImportAllStmFiles($stmImporter, $year, $month, 'RCM UC Statement Auto-Sync', true);
            $count = $result['imported'] ?? 0;
            $msg = "ดึงและนำเข้าไฟล์ Statement (STM) จากเว็บ e-Claim สปสช. สำเร็จ {$count} ไฟล์";

            if ($request->wantsJson() || $request->ajax()) {
                return response()->json([
                    'success' => true,
                    'count' => $count,
                    'message' => $msg,
                    'result' => $result,
                ]);
            }
            return redirect()->back()->with('success', $msg);
        } catch (\Throwable $e) {
            $msg = 'เกิดข้อผิดพลาดในการดึง Statement e-Claim: ' . $e->getMessage();
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => $msg,
                ], 500);
            }
            return redirect()->back()->with('error', $msg);
        }
    }

    /**
     * ดึงข้อมูลเงินโอนจริงล่าสุดจากเว็บ SMT สปสช.
     */
    public function syncSmt(Request $request): RedirectResponse
    {
        try {
            $budgetYear = (string) $request->input('budget_year', '2570');
            $beYear = (int) $budgetYear ?: 2570;
            $ceYear = $beYear - 543;
            $defaultFiscalStart = sprintf('%04d-10-01', $ceYear - 1);
            $defaultFiscalEnd = now()->format('Y-m-d');

            $result = $this->smtService->syncTransfers([
                'zone_id' => '06',
                'province_id' => '27',
                'hcode' => '14689',
                'budget_year' => $budgetYear,
                'start_date' => $request->input('start_date', $defaultFiscalStart),
                'end_date' => $request->input('end_date', $defaultFiscalEnd),
                'budget_source' => 'UC',
            ], Auth::id());

            $formattedTotal = number_format($result['total_amount'], 2);
            $ucAmt = number_format($result['summary']['total_uc'] ?? 0, 2);
            $pdfCount = $result['pdf_synced_count'] ?? 0;

            $msg = "ดึงข้อมูลการโอนเงินบัตรทอง (UC) จากเว็บ SMT สปสช. สำเร็จ {$result['synced_count']} รายการ (ยอดเงินโอน: {$ucAmt} บาท, แนบไฟล์ PDF แจ้งโอนเงิน {$pdfCount} ไฟล์)";

            return redirect()->back()->with('success', $msg);
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', 'เกิดข้อผิดพลาดในการดึงข้อมูลจากเว็บ SMT: ' . $e->getMessage());
        }
    }

    /**
     * ส่งออกรายงาน Excel
     */
    public function exportExcel(Request $request): StreamedResponse
    {
        $periodMode = $request->query('period_mode', 'since_jan_68');
        $subScheme = $request->query('sub_scheme', 'all');
        $claimType = $request->query('claim_type', 'all');

        $comparisonData = $this->ucService->getMonthlyComparison($periodMode, $subScheme, $claimType);
        $filename = "RCM_UC_3Way_Reconciliation_{$periodMode}_{$subScheme}_{$claimType}";

        return $this->reportService->exportUc3WayExcel($comparisonData, $filename);
    }

    /**
     * ส่งออกรายงาน PDF
     */
    public function exportPdf(Request $request): Response
    {
        $periodMode = $request->query('period_mode', 'since_jan_68');
        $subScheme = $request->query('sub_scheme', 'all');
        $claimType = $request->query('claim_type', 'all');

        $comparisonData = $this->ucService->getMonthlyComparison($periodMode, $subScheme, $claimType);
        $filename = "RCM_UC_3Way_Reconciliation_{$periodMode}_{$subScheme}_{$claimType}";

        return $this->reportService->exportUc3WayPdf($comparisonData, $filename);
    }

    /**
     * นำเข้าไฟล์ REP บัตรทอง (OPUC / IPUC) จากการอัปโหลด
     */
    public function importRep(Request $request): RedirectResponse
    {
        if (! $request->hasFile('files') && $request->hasFile('file')) {
            $request->files->set('files', [$request->file('file')]);
        }

        $data = $request->validate([
            'files' => ['required', 'array', 'min:1', 'max:50'],
            'files.*' => ['required', 'file', 'max:51200'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $imported = [];
        $errors = [];

        foreach ($request->file('files') as $file) {
            $name = $file->getClientOriginalName();
            try {
                $res = $this->importService->import($file, $data['notes'] ?? null, ClaimScheme::UCS);
                $imported[] = [
                    'filename' => $name,
                    'batch_id' => $res['batch']->id,
                    'count' => $res['batch']->total_records,
                    'amount' => $res['batch']->total_amount_claim,
                ];
            } catch (\Throwable $e) {
                $errors[] = "{$name}: " . $e->getMessage();
            }
        }

        $successCount = count($imported);
        if ($successCount > 0 && empty($errors)) {
            return redirect()->back()->with('success', "นำเข้าไฟล์ REP บัตรทองสำเร็จ {$successCount} ไฟล์");
        }

        if ($successCount > 0 && ! empty($errors)) {
            return redirect()->back()->with('warning', "นำเข้าสำเร็จ {$successCount} ไฟล์, แต่พบข้อผิดพลาด " . count($errors) . " ไฟล์: " . implode('; ', $errors));
        }

        return redirect()->back()->with('error', 'ไม่สามารถนำเข้าไฟล์ได้: ' . implode('; ', $errors));
    }

    /**
     * ดึงและนำเข้าไฟล์ REP บัตรทองอัตโนมัติจาก Portal e-Claim NHSO
     */
    public function syncPortal(Request $request): JsonResponse|RedirectResponse
    {
        $year = (int) $request->input('year', now()->year);
        $month = (int) $request->input('month', now()->month);
        $otp = trim((string) $request->input('otp', ''));
        $force = (bool) $request->input('force', false);
        $portal = $this->portalService->forScheme(ClaimScheme::UCS);

        if (! $portal->isConfigured()) {
            $msg = 'ยังไม่ได้ตั้งค่า CGD_ECLAIM_USERNAME / PASSWORD สำหรับเชื่อมต่อ e-Claim สปสช. ใน .env';
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json(['success' => false, 'message' => $msg], 422);
            }
            return redirect()->back()->with('error', $msg);
        }

        try {
            if (filled($otp)) {
                $login = $portal->submitOtp($otp);
            } else {
                $login = $portal->startLogin($year, $month);
            }

            if (($login['status'] ?? '') === 'awaiting_otp') {
                $msg = 'ระบบ e-Claim สปสช. บังคับยืนยันตัวตน 2FA กรุณากรอกรหัส OTP 6 หลัก';
                if ($request->wantsJson() || $request->ajax()) {
                    return response()->json([
                        'success' => false,
                        'requires_otp' => true,
                        'message' => $msg,
                    ]);
                }
                return redirect()->back()->with('warning', $msg);
            }

            $scan = $portal->scanFiles($year, $month);
            $newFiles = (int) ($scan['new_files'] ?? 0);
            $allowed = (int) ($scan['allowed_files'] ?? 0);
            $existing = (int) ($scan['existing_files'] ?? 0);

            if ($newFiles > 0 || $force) {
                $res = $portal->downloadAndImport($this->importService, 'RCM UC Auto-Download', 0, ! $force);
                $count = count($res['imported'] ?? []);
                $msg = "ดาวน์โหลดและนำเข้าไฟล์ REP บัตรทองจาก e-Claim สปสช. สำเร็จ {$count} ไฟล์";

                if ($request->wantsJson() || $request->ajax()) {
                    return response()->json([
                        'success' => true,
                        'requires_otp' => false,
                        'count' => $count,
                        'message' => $msg,
                    ]);
                }
                return redirect()->back()->with('success', $msg);
            }

            if ($allowed > 0) {
                $msg = "ตรวจสอบเว็บ e-Claim สปสช. แล้ว พบไฟล์ REP ทั้งหมด {$allowed} รายการในงวด {$month}/{$year} (นำเข้าในระบบแล้ว {$existing} รายการ, ไม่มีไฟล์ใหม่เพิ่มเติม)";
            } else {
                $msg = "ตรวจสอบเว็บ e-Claim สปสช. แล้ว ไม่พบไฟล์ REP บัตรทองในงวด {$month}/{$year}";
            }

            if ($request->wantsJson() || $request->ajax()) {
                return response()->json([
                    'success' => true,
                    'requires_otp' => false,
                    'count' => 0,
                    'message' => $msg,
                ]);
            }
            return redirect()->back()->with('info', $msg);
        } catch (\Throwable $e) {
            $msg = 'เกิดข้อผิดพลาดในการเชื่อมต่อเว็บ e-Claim: ' . $e->getMessage();
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'requires_otp' => false,
                    'message' => $msg,
                    'error' => $e->getMessage(),
                ], 500);
            }
            return redirect()->back()->with('error', $msg);
        }
    }
}
