<?php

namespace App\Http\Controllers\Rcm;

use App\Http\Controllers\Controller;
use App\Services\Rcm\RcmDialysisService;
use App\Services\Rcm\RcmHosxpService;
use App\Services\Rcm\RcmReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RcmDialysisController extends Controller
{
    public function __construct(
        protected readonly RcmDialysisService $dialysisService,
        protected readonly RcmHosxpService $hosxpService,
        protected readonly RcmReportService $reportService,
    ) {}

    /**
     * หน้าระบบเปรียบเทียบข้อมูลไตเทียม 3 ฝ่าย (HOSxP 021 vs e-Claim/REP vs NHSO SMT)
     */
    public function index(Request $request): InertiaResponse
    {
        $budgetYear = (int) $request->query('budget_year', 2570);
        $scheme = $request->query('scheme', 'all');
        $serviceType = $request->query('service_type', 'all'); // 'all', 'hd_fee', 'epo_drug'

        $comparisonData = $this->dialysisService->getMonthlyComparison($budgetYear, $scheme, $serviceType);

        return Inertia::render('Rcm/DialysisIndex', [
            'filters' => [
                'budget_year' => $budgetYear,
                'scheme' => $scheme,
                'service_type' => $serviceType,
            ],
            'comparison' => $comparisonData,
            'hosxp_ready' => $this->hosxpService->available(),
        ]);
    }

    /**
     * API สำหรับดึงข้อมูลเจาะลึกรายเดือนของไตเทียม (Drill-Down)
     */
    public function drillDown(Request $request): JsonResponse
    {
        $monthKey = $request->query('month_key');
        if (! $monthKey || ! preg_match('/^\d{4}-\d{2}$/', $monthKey)) {
            return response()->json(['error' => 'Invalid month_key'], 422);
        }

        $scheme = $request->query('scheme', 'all');
        $tab = $request->query('tab', 'hosxp_visits');
        $limit = min(200, max(10, (int) $request->query('limit', 100)));

        $data = $this->dialysisService->getMonthlyDrillDown($monthKey, $scheme, $tab, $limit);

        return response()->json($data);
    }

    /**
     * ส่งออกรายงาน Excel สรุปเปรียบเทียบไตเทียม 3 ฝ่าย
     */
    public function exportExcel(Request $request): StreamedResponse
    {
        $budgetYear = (int) $request->query('budget_year', 2570);
        $scheme = $request->query('scheme', 'all');
        $serviceType = $request->query('service_type', 'all');

        $comparisonData = $this->dialysisService->getMonthlyComparison($budgetYear, $scheme, $serviceType);
        $filename = "RCM_Dialysis_3Way_Reconciliation_{$budgetYear}_{$scheme}_{$serviceType}";

        return $this->reportService->exportDialysis3WayExcel($comparisonData, $filename);
    }

    /**
     * ส่งออกรายงาน PDF สรุปเปรียบเทียบไตเทียม 3 ฝ่าย
     */
    public function exportPdf(Request $request): Response
    {
        $budgetYear = (int) $request->query('budget_year', 2570);
        $scheme = $request->query('scheme', 'all');
        $serviceType = $request->query('service_type', 'all');

        $comparisonData = $this->dialysisService->getMonthlyComparison($budgetYear, $scheme, $serviceType);
        $filename = "RCM_Dialysis_3Way_Reconciliation_{$budgetYear}_{$scheme}_{$serviceType}";

        return $this->reportService->exportDialysis3WayPdf($comparisonData, $filename);
    }
}
