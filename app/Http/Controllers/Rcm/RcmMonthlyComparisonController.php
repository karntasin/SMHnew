<?php

namespace App\Http\Controllers\Rcm;

use App\Http\Controllers\Controller;
use App\Services\Rcm\RcmHosxpService;
use App\Services\Rcm\RcmMonthlyComparisonService;
use App\Services\Rcm\RcmReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RcmMonthlyComparisonController extends Controller
{
    public function __construct(
        protected readonly RcmMonthlyComparisonService $monthlyService,
        protected readonly RcmHosxpService $hosxpService,
        protected readonly RcmReportService $reportService,
    ) {}

    /**
     * หน้าระบบเปรียบเทียบข้อมูลรายเดือน 3 ฝ่าย (HOSxP vs REP vs STM)
     */
    public function index(Request $request): InertiaResponse
    {
        $budgetYear = (int) $request->query('budget_year', 2570);
        $scheme = $request->query('scheme', 'all');
        $claimType = $request->query('claim_type', 'opd');
        $serviceScope = $request->query('service_scope', 'all'); // 'all', 'general', 'hemodialysis'

        $comparisonData = $this->monthlyService->getMonthlyComparison($budgetYear, $scheme, $claimType, $serviceScope);

        return Inertia::render('Rcm/MonthlyReconcileIndex', [
            'filters' => [
                'budget_year' => $budgetYear,
                'scheme' => $scheme,
                'claim_type' => $claimType,
                'service_scope' => $serviceScope,
            ],
            'comparison' => $comparisonData,
            'hosxp_ready' => $this->hosxpService->available(),
        ]);
    }

    /**
     * API สำหรับดึงข้อมูลเจาะลึกรายเคสของเดือนที่เลือก (Drill-Down)
     */
    public function drillDown(Request $request): JsonResponse
    {
        $monthKey = $request->query('month_key');
        if (! $monthKey || ! preg_match('/^\d{4}-\d{2}$/', $monthKey)) {
            return response()->json(['error' => 'Invalid month_key'], 422);
        }

        $scheme = $request->query('scheme', 'all');
        $claimType = $request->query('claim_type', 'opd');
        $serviceScope = $request->query('service_scope', 'all');
        $tab = $request->query('tab', 'c_deny');
        $limit = min(200, max(10, (int) $request->query('limit', 100)));

        $data = $this->monthlyService->getMonthlyDrillDown($monthKey, $scheme, $claimType, $serviceScope, $tab, $limit);

        return response()->json($data);
    }

    /**
     * ส่งออกรายงาน Excel สรุปเปรียบเทียบรายเดือน 3 ฝ่าย
     */
    public function exportExcel(Request $request): StreamedResponse
    {
        $budgetYear = (int) $request->query('budget_year', 2570);
        $scheme = $request->query('scheme', 'all');
        $claimType = $request->query('claim_type', 'opd');
        $serviceScope = $request->query('service_scope', 'all');

        $comparisonData = $this->monthlyService->getMonthlyComparison($budgetYear, $scheme, $claimType, $serviceScope);
        $filename = "RCM_Monthly_3Way_Reconciliation_{$budgetYear}_{$scheme}_{$serviceScope}";

        return $this->reportService->exportMonthly3WayExcel($comparisonData, $filename);
    }

    /**
     * ส่งออกรายงาน PDF สรุปเปรียบเทียบรายเดือน 3 ฝ่าย
     */
    public function exportPdf(Request $request): Response
    {
        $budgetYear = (int) $request->query('budget_year', 2570);
        $scheme = $request->query('scheme', 'all');
        $claimType = $request->query('claim_type', 'opd');
        $serviceScope = $request->query('service_scope', 'all');

        $comparisonData = $this->monthlyService->getMonthlyComparison($budgetYear, $scheme, $claimType, $serviceScope);
        $filename = "RCM_Monthly_3Way_Reconciliation_{$budgetYear}_{$scheme}_{$serviceScope}";

        return $this->reportService->exportMonthly3WayPdf($comparisonData, $filename);
    }
}
