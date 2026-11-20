<?php

namespace App\Http\Controllers\Rcm;

use App\Http\Controllers\Controller;
use App\Services\Finance\CgdEclaimNhsoPortalService;
use App\Services\Rcm\RcmAutoSyncService;
use App\Services\Rcm\RcmCDenyCatalog;
use App\Services\Rcm\RcmReconcileService;
use App\Services\Rcm\RcmReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RcmReconcileController extends Controller
{
    public function __construct(
        protected readonly RcmReconcileService $reconcileService,
        protected readonly RcmReportService $reportService,
        protected readonly RcmCDenyCatalog $cDenyCatalog,
        protected readonly RcmAutoSyncService $autoSyncService,
    ) {}

    public function index(Request $request, CgdEclaimNhsoPortalService $portalService): Response
    {
        $filters = [
            'date_preset' => $request->query('date_preset', 'all'),
            'start_date' => $request->query('start_date'),
            'end_date' => $request->query('end_date'),
            'scheme' => $request->query('scheme', 'cgd'),
            'claim_type' => $request->query('claim_type', 'all'),
            'status' => $request->query('status', 'all'),
            'c_deny_code' => $request->query('c_deny_code', 'all'),
            'search' => $request->query('search', ''),
            'sort_by' => $request->query('sort_by', 'visit_date'),
            'sort_dir' => $request->query('sort_dir', 'desc'),
        ];

        // 1. ดึงสรุปเปรียบเทียบค่าเงิน 6 มิติ (Financial Reconciliation Matrix)
        $summary = $this->reconcileService->getFinancialComparisonSummary($filters);

        // 2. ดึงรายการข้อมูลตามเงื่อนไขตัวกรอง RCM
        $data = $this->reconcileService->getReconcileData($filters, 50);

        // 3. ข้อมูลสถานะการดึง STM อัตโนมัติ
        $syncInfo = $this->autoSyncService->getLastSyncInfo();

        $portal = $portalService->forScheme('cgd');

        return Inertia::render('Rcm/Reconciliation', [
            'filters' => $filters,
            'items' => $data['paginator'],
            'summary' => $summary,
            'syncInfo' => $syncInfo,
            'cDenyOptions' => $this->cDenyCatalog->getCommonOptions(),
            'hasTotp' => $portal->isTotpConfigured(),
            'portalConfigured' => $portal->isConfigured(),
        ]);
    }

    public function uploadStm(Request $request): RedirectResponse
    {
        $request->validate([
            'stm_file' => 'required|file',
            'scheme' => 'nullable|string|in:cgd,lgo,ucs,sss',
        ]);

        $scheme = $request->input('scheme', 'cgd');
        $this->reconcileService->processStmFile($request->file('stm_file'), $scheme);

        return redirect()->route('rcm.reconcile.index')->with('success', 'ประมวลผลและนำเข้าไฟล์ Statement เข้าสู่ระบบ RCM เรียบร้อยแล้ว');
    }

    public function autoSettle(Request $request): JsonResponse
    {
        $result = $this->reconcileService->runAutoSettlement();

        return response()->json($result);
    }

    public function cDenyCases(Request $request, string $code): JsonResponse
    {
        $filters = [
            'date_preset' => $request->query('date_preset', 'all'),
            'start_date' => $request->query('start_date'),
            'end_date' => $request->query('end_date'),
            'scheme' => $request->query('scheme', 'cgd'),
        ];

        $data = $this->reconcileService->getCDenyCaseDetails($code, $filters);

        return response()->json($data);
    }

    public function createAppeal(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $result = $this->reconcileService->createAppeal($id, $request->input('reason'));

        return response()->json($result);
    }

    public function exportExcel(Request $request): StreamedResponse
    {
        $filters = [
            'date_preset' => $request->query('date_preset', 'all'),
            'start_date' => $request->query('start_date'),
            'end_date' => $request->query('end_date'),
            'scheme' => $request->query('scheme', 'cgd'),
            'claim_type' => $request->query('claim_type', 'all'),
            'status' => $request->query('status', 'all'),
            'c_deny_code' => $request->query('c_deny_code', 'all'),
            'search' => $request->query('search', ''),
        ];

        $summary = $this->reconcileService->getFinancialComparisonSummary($filters);
        $data = $this->reconcileService->getReconcileData($filters, 5000);
        $detailRows = $data['paginator']->items();

        $filename = 'RCM_Financial_Comparison_' . date('Ymd_His');

        return $this->reportService->exportFinancialComparisonExcel($summary, $detailRows, $filename);
    }

    public function exportPdf(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $filters = [
            'date_preset' => $request->query('date_preset', 'all'),
            'start_date' => $request->query('start_date'),
            'end_date' => $request->query('end_date'),
            'scheme' => $request->query('scheme', 'cgd'),
            'claim_type' => $request->query('claim_type', 'all'),
            'status' => $request->query('status', 'all'),
            'c_deny_code' => $request->query('c_deny_code', 'all'),
            'search' => $request->query('search', ''),
        ];

        $summary = $this->reconcileService->getFinancialComparisonSummary($filters);
        $filename = 'RCM_Financial_Comparison_' . date('Ymd_His');

        return $this->reportService->exportFinancialComparisonPdf($summary, $filename);
    }
}
