<?php

namespace App\Http\Controllers\Rcm;

use App\Http\Controllers\Controller;
use App\Services\Finance\CgdEclaimNhsoPortalService;
use App\Services\Finance\CgdStmImportService;
use App\Services\Rcm\RcmHosxpService;
use App\Services\Rcm\RcmReportService;
use App\Services\Rcm\RcmUcHospitalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RcmUcHospitalController extends Controller
{
    public function __construct(
        protected readonly RcmUcHospitalService $ucHospitalService,
        protected readonly RcmHosxpService $hosxpService,
        protected readonly RcmReportService $reportService,
        protected readonly CgdStmImportService $importService,
        protected readonly CgdEclaimNhsoPortalService $portalService,
    ) {}

    /**
     * หน้าระบบเปรียบเทียบข้อมูลบัตรทอง รพ.ค่าย (03) 3 ฝ่าย (HOSxP vs e-Claim REP vs e-Claim STM)
     */
    public function index(Request $request): InertiaResponse
    {
        $periodMode = $request->query('period_mode', 'since_jan_68');
        $claimType = $request->query('claim_type', 'all');

        $comparisonData = $this->ucHospitalService->getMonthlyComparison($periodMode, $claimType);

        return Inertia::render('Rcm/UcHospitalIndex', [
            'filters' => [
                'period_mode' => $periodMode,
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

        $claimType = (string) $request->query('claim_type', 'all');
        $tab = (string) $request->query('tab', 'hosxp_visits');
        $limit = min(500, max(10, (int) $request->query('limit', 300)));

        $data = $this->ucHospitalService->getMonthlyDrillDown($monthKey, $claimType, $tab, $limit);

        return response()->json($data);
    }

    /**
     * ดึงข้อมูล Statement (STM) ล่าสุดจากเว็บ e-Claim สปสช.
     */
    public function syncStm(Request $request): RedirectResponse|JsonResponse
    {
        $year = (int) $request->input('year', 2570);
        $month = (int) $request->input('month', 10);
        $stmImporter = app(\App\Services\Finance\StmFileImportService::class);
        $portal = $this->portalService->forScheme('ucs');

        try {
            $result = $portal->downloadAndImportAllStmFiles($stmImporter, $year, $month, 'RCM UC Hospital Statement Auto-Sync', true);
            $count = $result['imported'] ?? 0;
            $msg = "ดึงและนำเข้าไฟล์ Statement (STM) จากเว็บ e-Claim สำเร็จ {$count} ไฟล์";

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
                return response()->json(['success' => false, 'message' => $msg], 500);
            }
            return redirect()->back()->with('error', $msg);
        }
    }

    /**
     * ดึงข้อมูล REP จากเว็บ e-Claim Validation Portal
     */
    public function syncPortal(Request $request): RedirectResponse|JsonResponse
    {
        $year = (int) $request->input('year', 2570);
        $month = (int) $request->input('month', 10);
        $force = (bool) $request->input('force', false);
        $portal = $this->portalService->forScheme('ucs');

        try {
            $result = $portal->syncRepForMonth($year, $month, $this->importService, $force);
            $count = $result['downloaded'] ?? 0;
            $msg = "ซิงค์ e-Claim REP สำเร็จ ({$count} ไฟล์)";

            if ($request->wantsJson() || $request->ajax()) {
                return response()->json([
                    'success' => true,
                    'downloaded' => $count,
                    'message' => $msg,
                    'result' => $result,
                ]);
            }
            return redirect()->back()->with('success', $msg);
        } catch (\Throwable $e) {
            $msg = 'เกิดข้อผิดพลาดในการซิงค์ e-Claim Portal: ' . $e->getMessage();
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json(['success' => false, 'message' => $msg], 500);
            }
            return redirect()->back()->with('error', $msg);
        }
    }

    /**
     * ส่งออกรายงาน Excel
     */
    public function exportExcel(Request $request): StreamedResponse
    {
        $periodMode = $request->query('period_mode', 'since_jan_68');
        $claimType = $request->query('claim_type', 'all');

        $comparisonData = $this->ucHospitalService->getMonthlyComparison($periodMode, $claimType);
        $comparisonData['sub_scheme'] = 'camp_hospital';
        $filename = "RCM_UC_Hospital_3Way_Reconciliation_{$periodMode}_{$claimType}";

        return $this->reportService->exportUc3WayExcel($comparisonData, $filename);
    }

    /**
     * ส่งออกรายงาน PDF
     */
    public function exportPdf(Request $request): Response
    {
        $periodMode = $request->query('period_mode', 'since_jan_68');
        $claimType = $request->query('claim_type', 'all');

        $comparisonData = $this->ucHospitalService->getMonthlyComparison($periodMode, $claimType);
        $comparisonData['sub_scheme'] = 'camp_hospital';
        $filename = "RCM_UC_Hospital_3Way_Reconciliation_{$periodMode}_{$claimType}";

        return $this->reportService->exportUc3WayPdf($comparisonData, $filename);
    }
}
