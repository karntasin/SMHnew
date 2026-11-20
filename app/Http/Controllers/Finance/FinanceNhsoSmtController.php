<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\Finance\NhsoSmtTransfer;
use App\Services\Finance\NhsoSmtPortalService;
use App\Services\Rcm\RcmReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FinanceNhsoSmtController extends Controller
{
    public function __construct(
        protected readonly NhsoSmtPortalService $smtService,
        protected readonly RcmReportService $reportService,
    ) {}

    public function index(Request $request): Response
    {
        $budgetSource = $request->query('budget_source', 'all');
        $budgetYear = (string) $request->query('budget_year', '2570');

        $beYear = (int) $budgetYear ?: 2570;
        $ceYear = $beYear - 543;
        $defaultFiscalStart = sprintf('%04d-10-01', $ceYear - 1);
        $defaultFiscalEnd = sprintf('%04d-09-30', $ceYear);

        $startDate = $request->query('start_date', $defaultFiscalStart);
        $endDate = $request->query('end_date', $defaultFiscalEnd);
        $search = trim((string) $request->query('search', ''));
        $zoneId = $request->query('zone_id', '06');
        $provinceId = $request->query('province_id', '27');
        $hcode = $request->query('hcode', '14689');

        $query = NhsoSmtTransfer::query()
            ->forSource($budgetSource)
            ->forYear($budgetYear);

        if ($startDate && $endDate) {
            $query->whereBetween('transfer_date', [$startDate, $endDate]);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('ref_doc_no', 'like', "%{$search}%")
                    ->orWhere('batch_no', 'like', "%{$search}%")
                    ->orWhere('fund_name', 'like', "%{$search}%")
                    ->orWhere('bank_name', 'like', "%{$search}%")
                    ->orWhere('moph_desc', 'like', "%{$search}%");
            });
        }

        $items = $query->orderByDesc('transfer_date')
            ->orderByDesc('posting_date')
            ->orderBy('batch_no')
            ->paginate(50)
            ->withQueryString();

        $refNos = collect($items->items())->pluck('ref_doc_no')->filter()->unique()->values()->all();
        $repStats = \App\Models\Finance\CgdStmRow::whereIn('rep_no', $refNos)
            ->selectRaw('rep_no, 
                COUNT(DISTINCT tran_id) as case_count, 
                SUM(amount_claim) as total_claim, 
                SUM(amount_approved) as total_approved,
                SUM(CASE WHEN is_settled = 1 THEN (amount_claim - amount_approved) ELSE 0 END) as settled_shortfall,
                SUM(CASE WHEN is_settled = 0 THEN (amount_claim - amount_approved) ELSE 0 END) as active_shortfall
            ')
            ->groupBy('rep_no')
            ->get()
            ->keyBy('rep_no');

        $repBatches = \Illuminate\Support\Facades\DB::table('finance_cgd_stm_rows as r')
            ->join('finance_cgd_stm_batches as b', 'b.id', '=', 'r.batch_id')
            ->whereIn('r.rep_no', $refNos)
            ->select('r.rep_no', 'b.file_kind')
            ->distinct()
            ->get()
            ->groupBy('rep_no');

        $items->getCollection()->transform(function ($item) use ($repStats, $repBatches) {
            $stat = $item->ref_doc_no ? ($repStats[$item->ref_doc_no] ?? null) : null;
            if ($stat) {
                $claimed = (float) $stat->total_claim;
                $approved = (float) $stat->total_approved;
                $activeShortfall = (float) $stat->active_shortfall;
                $settledShortfall = (float) $stat->settled_shortfall;
                $smtPaid = max(0, (float) $item->total);

                $batches = $repBatches[$item->ref_doc_no] ?? collect();
                $isAppeal = $batches->contains('file_kind', 'appeal');

                if ($isAppeal) {
                    $status = 'appeal_paid';
                    $isFullyPaid = true;
                    $shortfall = 0.0;
                    $statusLabel = 'ชดเชยอุทธรณ์ครบ';
                } elseif (abs($smtPaid - $approved) <= 0.01) {
                    if ($activeShortfall <= 0.01) {
                        $status = 'fully_paid';
                        $isFullyPaid = true;
                        $shortfall = 0.0;
                        $statusLabel = $settledShortfall > 0.01 ? 'จ่ายครบ (อุทธรณ์สำเร็จ)' : 'จ่ายครบ 100%';
                    } else {
                        $status = 'rep_cut';
                        $isFullyPaid = false;
                        $shortfall = $activeShortfall;
                        $statusLabel = 'โอนครบตามอนุมัติ (มีติด C รออุทธรณ์)';
                    }
                } else {
                    $status = 'shortfall';
                    $isFullyPaid = false;
                    $shortfall = max(0, $approved - $smtPaid) + $activeShortfall;
                    $statusLabel = 'โอนไม่ครบตามอนุมัติ';
                }

                $item->rep_match = [
                    'matched' => true,
                    'case_count' => (int) $stat->case_count,
                    'total_claim' => $claimed,
                    'total_approved' => $approved,
                    'smt_paid' => $smtPaid,
                    'shortfall' => $shortfall,
                    'active_shortfall' => $activeShortfall,
                    'settled_shortfall' => $settledShortfall,
                    'is_fully_paid' => $isFullyPaid,
                    'is_appeal' => $isAppeal,
                    'smt_paid_approved' => abs($smtPaid - $approved) <= 0.01,
                    'status' => $status,
                    'status_label' => $statusLabel,
                ];
            } else {
                $item->rep_match = null;
            }

            $item->is_lgo_hd = $item->budget_source === 'LGO_HD' || str_contains(strtoupper((string) $item->ref_doc_no), 'HD');
            $item->bank_transfer_amount = max(0, (float) $item->total);

            return $item;
        });

        $summary = $this->smtService->getDatabaseSummary($budgetYear);

        $lgoRefs = NhsoSmtTransfer::forSource('LGO')->whereNotNull('ref_doc_no')->pluck('ref_doc_no')->unique();
        $matchedRepCount = \App\Models\Finance\CgdStmRow::whereIn('rep_no', $lgoRefs)->distinct()->count('rep_no');
        $summary['matched_lgo_rep_count'] = $matchedRepCount;

        return Inertia::render('Finance/Smt/Index', [
            'filters' => [
                'budget_source' => $budgetSource,
                'budget_year' => $budgetYear,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'search' => $search,
                'zone_id' => $zoneId,
                'province_id' => $provinceId,
                'hcode' => $hcode,
            ],
            'items' => $items,
            'summary' => $summary,
        ]);
    }

    public function sync(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'budget_year' => 'nullable|string',
            'start_date' => 'nullable|string',
            'end_date' => 'nullable|string',
            'zone_id' => 'nullable|string',
            'province_id' => 'nullable|string',
            'hcode' => 'nullable|string',
            'budget_source' => 'nullable|string',
        ]);

        try {
            $budgetYear = (string) ($validated['budget_year'] ?? '2570');
            $beYear = (int) $budgetYear ?: 2570;
            $ceYear = $beYear - 543;
            $defaultFiscalStart = sprintf('%04d-10-01', $ceYear - 1);
            $defaultFiscalEnd = now()->format('Y-m-d');

            $result = $this->smtService->syncTransfers([
                'zone_id' => $validated['zone_id'] ?? '06',
                'province_id' => $validated['province_id'] ?? '27',
                'hcode' => $validated['hcode'] ?? '14689',
                'budget_year' => $budgetYear,
                'start_date' => $validated['start_date'] ?? $defaultFiscalStart,
                'end_date' => $validated['end_date'] ?? $defaultFiscalEnd,
                'budget_source' => $validated['budget_source'] ?? '',
            ], Auth::id());

            $formattedTotal = number_format($result['total_amount'], 2);
            $lgoAmt = number_format($result['summary']['total_lgo'], 2);
            $ucAmt = number_format($result['summary']['total_uc'], 2);
            $ckdAmt = number_format($result['summary']['total_ckd'], 2);

            $msg = "ดึงข้อมูลการจ่ายเงิน SMT สำเร็จ {$result['synced_count']} รายการ (ยอดรวม {$formattedTotal} บ.) [อปท.: {$lgoAmt} บ., บัตรทอง: {$ucAmt} บ., ไตวายเรื้อรัง: {$ckdAmt} บ.]";

            return redirect()->back()->with('success', $msg);
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', 'เกิดข้อผิดพลาดในการดึงข้อมูลจากเว็บ SMT: '.$e->getMessage());
        }
    }

    public function showDetail(Request $request): JsonResponse
    {
        $batchNo = (string) $request->query('batch_no');
        $postingDate = (string) $request->query('posting_date');
        $fiscalYear = (string) $request->query('fiscal_year', '2570');
        $hcode = (string) $request->query('hcode', '14689');

        if (! $batchNo || ! $postingDate) {
            return response()->json(['error' => 'Missing batch_no or posting_date'], 400);
        }

        $detail = $this->smtService->fetchTransferDetail($batchNo, $postingDate, $fiscalYear, $hcode);

        return response()->json($detail);
    }

    public function getRepCases(Request $request): JsonResponse
    {
        $repNo = trim((string) $request->query('rep_no'));
        if (! $repNo) {
            return response()->json(['error' => 'Missing rep_no'], 400);
        }

        $rows = \App\Models\Finance\CgdStmRow::where('rep_no', $repNo)
            ->orderBy('row_no')
            ->get()
            ->unique(fn ($r) => $r->tran_id ?: $r->match_key ?: $r->id)
            ->values();

        $cases = $rows->map(function ($r) {
            $isSettled = (bool) $r->is_settled;
            $rawShortfall = (float) max(0, $r->amount_claim - $r->amount_approved);
            $shortfall = $isSettled ? 0.0 : $rawShortfall;

            $statusText = 'อนุมัติเต็ม';
            if ($isSettled) {
                $statusText = 'ชดเชยครบแล้ว (อุทธรณ์สำเร็จ)';
            } elseif ($rawShortfall > 0.01) {
                $statusText = ! empty($r->error_code) ? "ติด C{$r->error_code} (รออุทธรณ์)" : 'มีส่วนต่างถูกตัด';
            }

            return [
                'id' => $r->id,
                'row_no' => $r->row_no,
                'hn' => \App\Support\PiiMask::hn($r->hn),
                'patient_name' => \App\Support\PiiMask::patientName($r->patient_name),
                'visit_date' => optional($r->visit_date)->format('d/m/Y') ?: (string) $r->visit_date,
                'amount_claim' => (float) $r->amount_claim,
                'amount_approved' => (float) $r->amount_approved,
                'shortfall' => $shortfall,
                'raw_shortfall' => $rawShortfall,
                'is_settled' => $isSettled,
                'settling_rep_no' => $r->settling_rep_no,
                'error_code' => $r->error_code,
                'fund_codes' => $r->fund_codes,
                'status_text' => $statusText,
            ];
        });

        $activeShortfall = (float) $cases->sum('shortfall');

        return response()->json([
            'rep_no' => $repNo,
            'case_count' => $rows->count(),
            'total_claim' => (float) $rows->sum('amount_claim'),
            'total_approved' => (float) $rows->sum('amount_approved'),
            'total_shortfall' => $activeShortfall,
            'settled_count' => $cases->where('is_settled', true)->count(),
            'cases' => $cases,
        ]);
    }

    public function exportExcel(Request $request): StreamedResponse
    {
        $budgetSource = $request->query('budget_source', 'all');
        $budgetYear = $request->query('budget_year', '2570');
        $startDate = $request->query('start_date', '2026-10-01');
        $endDate = $request->query('end_date', '2026-11-02');
        $search = trim((string) $request->query('search', ''));

        $query = NhsoSmtTransfer::query()
            ->forSource($budgetSource)
            ->forYear($budgetYear);

        if ($startDate && $endDate) {
            $query->whereBetween('transfer_date', [$startDate, $endDate]);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('ref_doc_no', 'like', "%{$search}%")
                    ->orWhere('batch_no', 'like', "%{$search}%")
                    ->orWhere('fund_name', 'like', "%{$search}%");
            });
        }

        $rows = $query->orderByDesc('transfer_date')->get();

        $headers = [
            'ลำดับ',
            'วันที่โอน (พ.ศ.)',
            'วันที่โอน (ค.ศ.)',
            'กองทุนหลัก',
            'กองทุนย่อย / รายการ',
            'ชุดข้อมูล (Batch)',
            'เลขที่ Statement / งวดอ้างอิง',
            'ยอดเงินโอนสุทธิ (บาท)',
            'ธนาคาร',
            'เลขที่บัญชี',
            'รหัสผังบัญชี สป.สธ.',
            'ชื่อผังบัญชี สป.สธ.',
        ];

        $exportData = [];
        $i = 1;

        foreach ($rows as $r) {
            $sourceLabel = match ($r->budget_source) {
                'LGO' => 'อปท. (LGO)',
                'UC' => 'บัตรทอง (UC)',
                'CKD' => 'ไตวายเรื้อรัง (CKD)',
                'DSS' => 'ผู้พิการประกันสังคม',
                'COVID' => 'พ.ร.ก. กู้เงิน Covid',
                default => $r->budget_source,
            };

            $exportData[] = [
                $i++,
                $r->posting_date,
                optional($r->transfer_date)->format('d/m/Y') ?: '-',
                $sourceLabel,
                $r->fund_name,
                $r->batch_no,
                $r->ref_doc_no,
                number_format((float) $r->total, 2),
                $r->bank_name ?: '-',
                $r->bank_account_no ?: '-',
                $r->moph_id ?: '-',
                $r->moph_desc ?: '-',
            ];
        }

        $title = "รายงานการโอนเงินชดเชย สปสช. (SMT) ปีงบประมาณ {$budgetYear} ({$startDate} ถึง {$endDate})";

        return $this->reportService->exportExcel(
            $title,
            $headers,
            $exportData,
            "NHSO_SMT_Transfers_{$budgetSource}_{$budgetYear}"
        );
    }
}
