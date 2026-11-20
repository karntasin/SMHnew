<?php

namespace App\Http\Controllers\Rcm;

use App\Http\Controllers\Controller;
use App\Models\Rcm\RcmClaimBatch;
use App\Services\Rcm\RcmHosxpService;
use App\Services\Rcm\RcmReconcileService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RcmDashboardController extends Controller
{
    public function __construct(
        protected readonly RcmHosxpService $hosxpService,
        protected readonly RcmReconcileService $reconcileService,
    ) {}

    public function index(Request $request): Response
    {
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $datePreset = $request->query('date_preset', 'all');

        $filters = [
            'date_preset' => $datePreset,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'scheme' => $request->query('scheme', 'all'),
        ];

        // ดึงสถิติจริงจากฐานข้อมูล Statement หลัก (finance_cgd_stm_rows & finance_cgd_appeal_cases)
        $finSummary = $this->reconcileService->getFinancialComparisonSummary($filters);

        // คำนวณแยก CSOP และ CIPN
        $csopClaimed = 0;
        $cipnClaimed = 0;
        foreach ($finSummary['service_matrix'] as $sm) {
            if ($sm['service_type'] === 'CIPN') {
                $cipnClaimed = $sm['claimed'];
            } else {
                $csopClaimed += $sm['claimed'];
            }
        }

        // รายการ Batches ล่าสุด
        $recentBatches = RcmClaimBatch::with('creator')
            ->latest()
            ->take(6)
            ->get();

        $hosxpReady = $this->hosxpService->available();

        return Inertia::render('Rcm/Dashboard', [
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'date_preset' => $datePreset,
            ],
            'stats' => [
                'total_claimed' => $finSummary['total_claimed'],
                'total_approved' => $finSummary['total_approved'],
                'total_shortfall' => $finSummary['total_shortfall'],
                'total_pending' => $finSummary['total_pending_appeal_amount'],
                'total_c_deny' => $finSummary['total_c_deny_amount'],
                'csop_claimed' => $csopClaimed,
                'cipn_claimed' => $cipnClaimed,
                'clean_claim_rate' => $finSummary['approval_rate'],
                'appeal_pending_cases' => $finSummary['pending_appeal_count'],
                'appeal_recovered_amount' => $finSummary['total_recovered_amount'],
                'total_cases' => $finSummary['total_cases'],
            ],
            'fund_matrix' => $finSummary['fund_matrix'],
            'top_c_deny' => $finSummary['top_c_deny'],
            'recent_batches' => $recentBatches,
            'hosxp_ready' => $hosxpReady,
            'smt_summary' => app(\App\Services\Finance\NhsoSmtPortalService::class)->getDatabaseSummary(),
        ]);
    }
}
