<?php

namespace App\Services\Rcm;

use App\Models\Finance\CgdStmBatch;
use App\Models\Finance\CgdStmRow;
use App\Services\Finance\CgdStmImportService;
use App\Support\PiiMask;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RcmReconcileService
{
    public function __construct(
        protected readonly RcmCDenyCatalog $cDenyCatalog,
        protected readonly CgdStmImportService $stmImportService,
    ) {}

    /**
     * ดึงข้อมูล Reconcile รายการ STM จากตาราง finance_cgd_stm_rows ร่วมกับ finance_cgd_appeal_cases
     */
    public function getReconcileData(array $filters = [], int $perPage = 50): array
    {
        $dateRange = $this->resolveDateRange($filters);
        $query = $this->buildBaseQuery($filters, $dateRange);

        // Sorting
        $sortField = $filters['sort_by'] ?? 'visit_date';
        $sortDir = strtolower($filters['sort_dir'] ?? 'desc') === 'asc' ? 'asc' : 'desc';

        if ($sortField === 'shortfall') {
            $query->orderBy(DB::raw('GREATEST(0, r.amount_claim - r.amount_approved)'), $sortDir);
        } elseif (in_array($sortField, ['amount_claim', 'amount_approved', 'visit_date', 'patient_name', 'error_code'])) {
            $query->orderBy("r.{$sortField}", $sortDir);
        } else {
            $query->orderBy('r.visit_date', 'desc')->orderBy('r.id', 'desc');
        }

        $paginated = $query->paginate($perPage);

        // Transform rows
        $items = $paginated->getCollection()->map(function ($row) {
            $claimAmt = (float) $row->amount_claim;
            $approvedAmt = (float) $row->amount_approved;
            $isSettled = (bool) ($row->is_settled ?? false);
            $rawShortfall = max(0, $claimAmt - $approvedAmt);
            // ถ้ารายการนี้ได้รับการชดเชยครบแล้วใน STM อื่น ยอดขาดสุทธิจะตัดเป็น 0
            $shortfall = $isSettled ? 0.0 : $rawShortfall;

            // คำนวณ Financial Status 6 มิติ
            $status = 'pending';
            if ($isSettled) {
                $status = 'recovered';
            } elseif ($approvedAmt >= $claimAmt && $claimAmt > 0) {
                $status = 'matched_full';
            } elseif ($approvedAmt > 0 && $shortfall > 0) {
                $status = 'matched_partial';
            } elseif (! empty($row->error_code) || $approvedAmt <= 0) {
                $status = 'rejected';
            }

            // สถานะอุทธรณ์
            $appealStatus = $row->appeal_status;
            if ($isSettled) {
                $appealStatus = 'settled';
            } elseif (empty($appealStatus) && $shortfall > 0) {
                $appealStatus = 'pending'; // รออุทธรณ์
            }

            // ข้อมูล C-Deny จาก Catalog 642 ข้อ
            $cDenyInfo = null;
            if (! empty($row->error_code)) {
                $cDenyInfo = $this->cDenyCatalog->lookup((string) $row->error_code);
            }

            // ประเภทบริการ CSOP vs CIPN
            $claimType = ! empty($row->an) ? 'CIPN' : 'CSOP';

            // ระบุกองทุนที่ถูกต้อง
            $fundCode = 'OFC';
            if (($row->batch_scheme ?? '') === 'lgo' || str_contains((string) $row->fund_codes, 'LG')) {
                $fundCode = 'LGO';
            } elseif (str_contains((string) $row->fund_codes, 'UCS') || str_contains((string) $row->fund_codes, 'UC')) {
                $fundCode = 'UCS';
            } elseif (str_contains((string) $row->fund_codes, 'SSS')) {
                $fundCode = 'SSS';
            }

            return [
                'id' => (int) $row->id,
                'batch_id' => (int) $row->batch_id,
                'claim_type' => $claimType,
                'rep_no' => (string) $row->rep_no,
                'tran_id' => (string) $row->tran_id,
                'hn' => PiiMask::hn($row->hn),
                'raw_hn' => (string) $row->hn,
                'an' => (string) ($row->an ?? ''),
                'pid' => PiiMask::cid($row->pid),
                'patient_name' => PiiMask::name(null, $row->patient_name, null),
                'service_date' => $row->visit_date ? Carbon::parse($row->visit_date)->format('Y-m-d') : '',
                'discharge_date' => $row->discharge_at ? Carbon::parse($row->discharge_at)->format('Y-m-d') : null,
                'claim_amount' => $claimAmt,
                'approved_amount' => $approvedAmt,
                'shortfall_amount' => $shortfall,
                'raw_shortfall' => $rawShortfall,
                'is_settled' => $isSettled,
                'settling_rep_no' => (string) ($row->settling_rep_no ?? ''),
                'settled_at' => $row->settled_at ? Carbon::parse($row->settled_at)->format('Y-m-d H:i') : null,
                'reconcile_status' => $status,
                'denial_code' => (string) ($row->error_code ?? ''),
                'c_deny_info' => $cDenyInfo,
                'fund_codes' => $fundCode,
                'raw_fund_codes' => (string) ($row->fund_codes ?? ''),
                'appeal_case' => $row->appeal_id ? [
                    'id' => (int) $row->appeal_id,
                    'appeal_status' => $isSettled ? 'settled' : (string) $row->appeal_status,
                    'appeal_reason' => (string) ($row->appeal_reason ?? ''),
                    'recovered_amount' => (float) ($row->appeal_amount_approved ?? 0),
                    'requested_amount' => $isSettled ? 0.0 : (float) ($row->appeal_amount_requested ?? 0),
                ] : null,
            ];
        });

        return [
            'paginator' => new LengthAwarePaginator(
                $items,
                $paginated->total(),
                $paginated->perPage(),
                $paginated->currentPage(),
                ['path' => request()->url(), 'query' => request()->query()]
            ),
            'date_range' => $dateRange,
        ];
    }

    /**
     * คำนวณสรุปเปรียบเทียบค่าเงิน 6 มิติ (Financial Reconciliation Matrix)
     */
    public function getFinancialComparisonSummary(array $filters = []): array
    {
        $dateRange = $this->resolveDateRange($filters);
        $base = $this->buildBaseQuery($filters, $dateRange, false);

        // 1. KPI สรุป 6 มิติหลัก (คำนวณแบบ Net Reconciled โดยตัดยอดเคสที่ได้รับชดเชยครบแล้วออก)
        $stats = (clone $base)->selectRaw('
            COUNT(*) as total_cases,
            COALESCE(SUM(r.amount_claim), 0) as total_claimed,
            COALESCE(SUM(r.amount_approved), 0) as total_approved,
            COALESCE(SUM(CASE WHEN r.is_settled = 1 THEN 0 ELSE GREATEST(0, r.amount_claim - r.amount_approved) END), 0) as total_shortfall,
            COALESCE(SUM(CASE WHEN r.amount_approved >= r.amount_claim AND r.amount_claim > 0 THEN 1 ELSE 0 END), 0) as full_paid_count,
            COALESCE(SUM(CASE WHEN r.is_settled = 0 AND r.amount_approved > 0 AND r.amount_approved < r.amount_claim THEN 1 ELSE 0 END), 0) as partial_count,
            COALESCE(SUM(CASE WHEN r.is_settled = 0 AND ((r.error_code IS NOT NULL AND r.error_code != "") OR r.amount_approved <= 0) THEN 1 ELSE 0 END), 0) as rejected_count,
            COALESCE(SUM(CASE WHEN r.is_settled = 0 AND (r.error_code IS NOT NULL AND r.error_code != "") THEN GREATEST(0, r.amount_claim - r.amount_approved) ELSE 0 END), 0) as total_c_deny_amount,
            COALESCE(SUM(CASE WHEN r.is_settled = 1 THEN GREATEST(0, r.amount_claim - r.amount_approved) WHEN a.current_status IN ("approved", "settled") OR a.appeal_amount_approved > 0 THEN a.appeal_amount_approved ELSE 0 END), 0) as total_recovered_amount,
            COALESCE(SUM(CASE WHEN r.is_settled = 1 OR (a.id IS NOT NULL AND a.current_status IN ("approved", "settled")) THEN 1 ELSE 0 END), 0) as appeal_approved_count,
            COALESCE(SUM(CASE WHEN r.is_settled = 0 AND GREATEST(0, r.amount_claim - r.amount_approved) > 0 AND (a.id IS NULL OR a.current_status IN ("eligible", "pending")) THEN GREATEST(0, r.amount_claim - r.amount_approved) ELSE 0 END), 0) as total_pending_appeal_amount,
            COALESCE(SUM(CASE WHEN r.is_settled = 0 AND GREATEST(0, r.amount_claim - r.amount_approved) > 0 AND (a.id IS NULL OR a.current_status IN ("eligible", "pending")) THEN 1 ELSE 0 END), 0) as pending_appeal_count
        ')->first();

        $totalClaimed = (float) ($stats->total_claimed ?? 0);
        $totalApproved = (float) ($stats->total_approved ?? 0);
        $totalShortfall = (float) ($stats->total_shortfall ?? 0);
        $totalRecovered = (float) ($stats->total_recovered_amount ?? 0);
        $totalCDeny = (float) ($stats->total_c_deny_amount ?? 0);
        $totalPendingAppeal = (float) ($stats->total_pending_appeal_amount ?? 0);

        $approvalRate = $totalClaimed > 0 ? round(($totalApproved / $totalClaimed) * 100, 2) : 0;
        $recoveryRate = ($totalShortfall + $totalRecovered) > 0 ? round(($totalRecovered / ($totalShortfall + $totalRecovered)) * 100, 2) : 0;

        // 2. Matrix สรุปเปรียบเทียบตามกองทุน (Fund Comparison Matrix)
        $fundRows = (clone $base)
            ->selectRaw('
                CASE 
                    WHEN b.scheme = "lgo" OR r.fund_codes LIKE "%LG%" OR r.fund_codes LIKE "%LGO%" THEN "LGO"
                    WHEN r.fund_codes LIKE "%UCS%" OR r.fund_codes LIKE "%UC%" THEN "UCS"
                    WHEN r.fund_codes LIKE "%SSS%" THEN "SSS"
                    ELSE "OFC"
                END as fund_code,
                COUNT(*) as case_count,
                SUM(r.amount_claim) as claimed,
                SUM(r.amount_approved) as approved,
                SUM(CASE WHEN r.is_settled = 1 THEN 0 ELSE GREATEST(0, r.amount_claim - r.amount_approved) END) as shortfall,
                SUM(CASE WHEN r.is_settled = 0 AND r.error_code IS NOT NULL AND r.error_code != "" THEN GREATEST(0, r.amount_claim - r.amount_approved) ELSE 0 END) as c_deny_amount,
                SUM(CASE WHEN r.is_settled = 1 THEN GREATEST(0, r.amount_claim - r.amount_approved) WHEN a.current_status IN ("approved", "settled") THEN a.appeal_amount_approved ELSE 0 END) as recovered
            ')
            ->groupBy('fund_code')
            ->orderByDesc('claimed')
            ->get()
            ->map(fn ($f) => [
                'fund_code' => $f->fund_code,
                'fund_name' => $this->getFundName($f->fund_code),
                'case_count' => (int) $f->case_count,
                'claimed' => (float) $f->claimed,
                'approved' => (float) $f->approved,
                'shortfall' => (float) $f->shortfall,
                'c_deny_amount' => (float) $f->c_deny_amount,
                'recovered' => (float) $f->recovered,
                'approval_rate' => $f->claimed > 0 ? round(($f->approved / $f->claimed) * 100, 2) : 0,
            ]);

        // 3. Matrix สรุปเปรียบเทียบตามประเภทบริการ (OPD CSOP vs IPD CIPN)
        $serviceRows = (clone $base)
            ->selectRaw('
                IF(r.an IS NOT NULL AND r.an != "", "CIPN", "CSOP") as service_type,
                COUNT(*) as case_count,
                SUM(r.amount_claim) as claimed,
                SUM(r.amount_approved) as approved,
                SUM(CASE WHEN r.is_settled = 1 THEN 0 ELSE GREATEST(0, r.amount_claim - r.amount_approved) END) as shortfall,
                SUM(CASE WHEN r.is_settled = 0 AND r.error_code IS NOT NULL AND r.error_code != "" THEN GREATEST(0, r.amount_claim - r.amount_approved) ELSE 0 END) as c_deny_amount,
                SUM(CASE WHEN r.is_settled = 1 THEN GREATEST(0, r.amount_claim - r.amount_approved) WHEN a.current_status IN ("approved", "settled") THEN a.appeal_amount_approved ELSE 0 END) as recovered
            ')
            ->groupBy('service_type')
            ->get()
            ->map(fn ($s) => [
                'service_type' => $s->service_type,
                'service_name' => $s->service_type === 'CIPN' ? 'ผู้ป่วยใน (IPD CIPN 16 หมวด)' : 'ผู้ป่วยนอก (OPD CSOP ค่ายา)',
                'case_count' => (int) $s->case_count,
                'claimed' => (float) $s->claimed,
                'approved' => (float) $s->approved,
                'shortfall' => (float) $s->shortfall,
                'c_deny_amount' => (float) $s->c_deny_amount,
                'recovered' => (float) $s->recovered,
                'approval_rate' => $s->claimed > 0 ? round(($s->approved / $s->claimed) * 100, 2) : 0,
            ]);

        // 4. สรุป 20 รหัสข้อผิดพลาด/ติด C สูงสุด (Top 20 C-Deny Analytics)
        // นับเป็นราย SEQ ของทุก REP ไม่ต้องตัดออก (รวมทั้งที่แก้ได้แล้วและยังแก้ไม่ได้)
        $errorRows = (clone $base)
            ->whereNotNull('r.error_code')
            ->where('r.error_code', '!=', '')
            ->select([
                'r.id',
                'r.seq_no',
                'r.error_code',
                'r.amount_claim',
                'r.amount_approved',
                'r.is_settled',
            ])
            ->get();

        $codeMap = [];
        foreach ($errorRows as $row) {
            $shortfall = max(0, (float) $row->amount_claim - (float) $row->amount_approved);
            $codes = array_filter(array_map('trim', explode(',', (string) $row->error_code)));
            foreach ($codes as $rawCode) {
                $code = ltrim($rawCode, 'Cc');
                if ($code === '') {
                    continue;
                }
                if (! isset($codeMap[$code])) {
                    $codeMap[$code] = [
                        'code' => $code,
                        'count' => 0,
                        'settled_count' => 0,
                        'pending_count' => 0,
                        'total_claim' => 0.0,
                        'shortfall' => 0.0,
                    ];
                }
                $codeMap[$code]['count']++;
                $codeMap[$code]['total_claim'] += (float) $row->amount_claim;
                $codeMap[$code]['shortfall'] += $shortfall;
                if ($row->is_settled) {
                    $codeMap[$code]['settled_count']++;
                } else {
                    $codeMap[$code]['pending_count']++;
                }
            }
        }

        // เรียงลำดับตามจำนวน SEQ รวมจากมากไปน้อย แล้วตัด 20 อันดับแรก
        uasort($codeMap, fn ($a, $b) => $b['count'] <=> $a['count']);
        $top20 = array_slice($codeMap, 0, 20);

        $topCDeny = collect($top20)->map(function ($c) {
            $info = $this->cDenyCatalog->lookup((string) $c['code']);

            return [
                'code' => (string) $c['code'],
                'title' => $info['title'] ?? 'ข้อผิดพลาด e-Claim '.$c['code'],
                'solution' => $info['solution'] ?? 'ตรวจสอบเวชระเบียนและยื่นอุทธรณ์',
                'count' => (int) $c['count'],
                'settled_count' => (int) $c['settled_count'],
                'pending_count' => (int) $c['pending_count'],
                'total_claim' => round((float) $c['total_claim'], 2),
                'shortfall' => round((float) $c['shortfall'], 2),
            ];
        })->values();

        return [
            'total_cases' => (int) ($stats->total_cases ?? 0),
            'total_claimed' => $totalClaimed,
            'total_approved' => $totalApproved,
            'total_shortfall' => $totalShortfall,
            'total_c_deny_amount' => $totalCDeny,
            'total_pending_appeal_amount' => $totalPendingAppeal,
            'total_recovered_amount' => $totalRecovered,
            'matched_full_count' => (int) ($stats->full_paid_count ?? 0),
            'matched_partial_count' => (int) ($stats->partial_count ?? 0),
            'rejected_count' => (int) ($stats->rejected_count ?? 0),
            'pending_appeal_count' => (int) ($stats->pending_appeal_count ?? 0),
            'appeal_approved_count' => (int) ($stats->appeal_approved_count ?? 0),
            'approval_rate' => $approvalRate,
            'recovery_rate' => $recoveryRate,
            'fund_matrix' => $fundRows,
            'service_matrix' => $serviceRows,
            'top_c_deny' => $topCDeny,
            'date_range' => $dateRange,
        ];
    }

    /**
     * ดึงข้อมูลผู้ป่วยรายบุคคลที่ติดรหัส C ที่ระบุ พร้อมรายละเอียดวันที่ REP รอบแรก และ REP ที่แก้ไข/อุทธรณ์
     */
    public function getCDenyCaseDetails(string $code, array $filters = []): array
    {
        $cleanCode = ltrim(trim($code), 'Cc');
        $catalogInfo = $this->cDenyCatalog->lookup($cleanCode);

        $dateRange = $this->resolveDateRange($filters);

        $query = DB::table('finance_cgd_stm_rows as r')
            ->leftJoin('finance_cgd_stm_batches as b', 'b.id', '=', 'r.batch_id')
            ->leftJoin('finance_cgd_stm_rows as sr', 'sr.id', '=', 'r.settling_row_id')
            ->leftJoin('finance_cgd_stm_batches as sb', 'sb.id', '=', 'sr.batch_id')
            ->leftJoin('finance_cgd_appeal_cases as a', 'a.match_key', '=', 'r.match_key')
            ->where(function ($q) use ($cleanCode) {
                $q->where('r.error_code', '=', $cleanCode)
                  ->orWhere('r.error_code', 'LIKE', "{$cleanCode},%")
                  ->orWhere('r.error_code', 'LIKE', "%,{$cleanCode}")
                  ->orWhere('r.error_code', 'LIKE', "%,{$cleanCode},%");
            });

        // กรองตามช่วงวันที่
        if (! empty($dateRange['start_date']) && ! empty($dateRange['end_date'])) {
            $query->whereBetween('r.visit_date', [$dateRange['start_date'], $dateRange['end_date']]);
        }

        // กรองตามกองทุน
        $scheme = strtolower($filters['scheme'] ?? 'cgd');
        if ($scheme !== 'all') {
            if ($scheme === 'lgo') {
                $query->where(function ($q) {
                    $q->where('b.scheme', 'lgo')
                      ->orWhere('r.fund_codes', 'LIKE', '%LG%')
                      ->orWhere('r.fund_codes', 'LIKE', '%LGO%')
                      ->orWhere('r.fund_codes', 'LIKE', '%BKK%')
                      ->orWhere('b.filename', 'LIKE', '%LGO%')
                      ->orWhere('b.filename', 'LIKE', '%OPLG%')
                      ->orWhere('b.filename', 'LIKE', '%IPLG%');
                })->where(function ($q) {
                    $q->where('b.scheme', '!=', 'cgd')
                      ->where('b.scheme', '!=', 'ucs')
                      ->orWhereNull('b.scheme');
                });
            } elseif ($scheme === 'ucs') {
                $query->where(function ($q) {
                    $q->where('b.scheme', 'ucs')
                      ->orWhere('r.fund_codes', 'LIKE', '%UCS%')
                      ->orWhere('r.fund_codes', 'LIKE', '%UC%')
                      ->orWhere(function ($sq) {
                          $sq->where('b.filename', 'LIKE', '%_OP_%')
                            ->where('b.filename', 'NOT LIKE', '%_OPCS_%')
                            ->where('b.filename', 'NOT LIKE', '%_OPLG%');
                      })
                      ->orWhere(function ($sq) {
                          $sq->where('b.filename', 'LIKE', '%_IP_%')
                            ->where('b.filename', 'NOT LIKE', '%_IPCS_%')
                            ->where('b.filename', 'NOT LIKE', '%_IPLG%');
                      });
                })->where(function ($q) {
                    $q->where('b.scheme', '!=', 'cgd')
                      ->where('b.scheme', '!=', 'lgo')
                      ->orWhereNull('b.scheme');
                });
            } elseif ($scheme === 'cgd' || $scheme === 'ofc') {
                $query->where(function ($q) {
                    $q->where('b.scheme', 'cgd')
                      ->orWhere('r.fund_codes', 'LIKE', '%OFC%')
                      ->orWhere('r.fund_codes', 'LIKE', '%OTCS%')
                      ->orWhere('r.fund_codes', 'LIKE', '%OPCS%')
                      ->orWhere('r.fund_codes', 'LIKE', '%IPCS%')
                      ->orWhere('b.filename', 'LIKE', '%_OPCS_%')
                      ->orWhere('b.filename', 'LIKE', '%_IPCS_%');
                })->where(function ($q) {
                    $q->whereNotIn('b.scheme', ['lgo', 'ucs', 'sss'])
                      ->orWhereNull('b.scheme');
                })->where(function ($q) {
                    $q->where(function ($sq) {
                        $sq->where('r.fund_codes', 'NOT LIKE', '%LG%')
                          ->where('r.fund_codes', 'NOT LIKE', '%UC%')
                          ->where('r.fund_codes', 'NOT LIKE', '%SSS%');
                    })->orWhereNull('r.fund_codes');
                })->where(function ($q) {
                    $q->where('b.filename', 'NOT LIKE', '%_OP_%')
                      ->orWhere('b.filename', 'LIKE', '%_OPCS_%')
                      ->orWhereNull('b.filename');
                })->where(function ($q) {
                    $q->where('b.filename', 'NOT LIKE', '%_IP_%')
                      ->orWhere('b.filename', 'LIKE', '%_IPCS_%')
                      ->orWhereNull('b.filename');
                })->where(function ($q) {
                    $q->where('b.filename', 'NOT LIKE', '%LGO%')
                      ->orWhereNull('b.filename');
                });
            }
        }

        $rows = $query->select([
            'r.id', 'r.batch_id', 'r.rep_no', 'r.tran_id', 'r.seq_no',
            'r.hn', 'r.an', 'r.pid', 'r.patient_name', 'r.visit_date', 'r.discharge_at',
            'r.amount_claim', 'r.amount_approved', 'r.error_code', 'r.fund_codes',
            'r.is_settled', 'r.settling_row_id', 'r.settling_rep_no', 'r.settled_at',
            'b.filename as orig_filename', 'b.period_label as orig_period', 'b.created_at as orig_batch_created_at',
            'sr.amount_approved as settling_approved', 'sb.period_label as settling_period', 'sb.created_at as settling_batch_created_at',
            'a.id as appeal_id', 'a.current_status as appeal_status', 'a.appeal_amount_requested', 'a.appeal_amount_approved', 'a.updated_at as appeal_updated_at'
        ])
        ->orderBy('r.is_settled', 'asc')
        ->orderBy('r.visit_date', 'desc')
        ->orderBy('r.id', 'desc')
        ->get();

        $cases = [];
        $totalClaim = 0.0;
        $totalShortfall = 0.0;
        $totalRecovered = 0.0;
        $settledCount = 0;
        $pendingCount = 0;

        foreach ($rows as $r) {
            $claimAmt = (float) $r->amount_claim;
            $approvedAmt = (float) $r->amount_approved;
            $rawShortfall = max(0, $claimAmt - $approvedAmt);
            $isSettled = (bool) $r->is_settled;
            $recovered = $isSettled ? (float) ($r->settling_approved > 0 ? $r->settling_approved : $rawShortfall) : 0.0;

            $totalClaim += $claimAmt;
            $totalShortfall += $rawShortfall;
            if ($isSettled) {
                $settledCount++;
                $totalRecovered += $recovered;
            } else {
                $pendingCount++;
            }

            $origDate = $this->formatPeriodThaiDate($r->orig_period, $r->orig_batch_created_at ? (string) $r->orig_batch_created_at : null);
            $settlingDate = $this->formatPeriodThaiDate($r->settling_period, $r->settled_at ? (string) $r->settled_at : ($r->settling_batch_created_at ? (string) $r->settling_batch_created_at : null));
            $visitDateThai = $r->visit_date ? $this->formatThaiDateSimple($r->visit_date) : '-';

            $cases[] = [
                'id' => (int) $r->id,
                'hn' => PiiMask::hn($r->hn),
                'pid' => PiiMask::cid($r->pid),
                'patient_name' => PiiMask::name(null, $r->patient_name, null),
                'seq_no' => (string) $r->seq_no,
                'an' => (string) ($r->an ?? ''),
                'claim_type' => ! empty($r->an) ? 'CIPN' : 'CSOP',
                'visit_date' => $r->visit_date,
                'visit_date_thai' => $visitDateThai,
                'claim_amount' => $claimAmt,
                'approved_amount' => $approvedAmt,
                'shortfall_amount' => $rawShortfall,
                'is_settled' => $isSettled,
                'error_code' => (string) $r->error_code,
                // REP รอบแรกที่ติด C
                'orig_rep_no' => (string) $r->rep_no,
                'orig_rep_date' => $origDate,
                'orig_filename' => (string) ($r->orig_filename ?? ''),
                // REP ที่แก้ไขหรือได้รับชดเชย
                'settling_rep_no' => (string) ($r->settling_rep_no ?? ''),
                'settling_rep_date' => $settlingDate,
                'recovered_amount' => $recovered,
                // ข้อมูลอุทธรณ์
                'appeal' => $r->appeal_id ? [
                    'id' => (int) $r->appeal_id,
                    'status' => (string) $r->appeal_status,
                    'requested_amount' => (float) ($r->appeal_amount_requested ?? 0),
                    'approved_amount' => (float) ($r->appeal_amount_approved ?? 0),
                    'updated_at' => $r->appeal_updated_at ? $this->formatThaiDateSimple($r->appeal_updated_at) : null,
                ] : null,
            ];
        }

        return [
            'code' => $cleanCode,
            'title' => $catalogInfo['title'] ?? ('ข้อผิดพลาด e-Claim ' . $cleanCode),
            'solution' => $catalogInfo['solution'] ?? 'ตรวจสอบเวชระเบียนและยื่นอุทธรณ์',
            'summary' => [
                'total_cases' => count($cases),
                'settled_cases' => $settledCount,
                'pending_cases' => $pendingCount,
                'total_claim_amount' => round($totalClaim, 2),
                'total_shortfall_amount' => round($totalShortfall, 2),
                'total_recovered_amount' => round($totalRecovered, 2),
            ],
            'cases' => $cases,
        ];
    }

    /**
     * แปลง period_label (เช่น 25690417) หรือวันที่ ISO เป็นวันที่ไทยที่อ่านง่าย เช่น "17 เม.ย. 2569"
     */
    protected function formatPeriodThaiDate(?string $period, ?string $fallback = null): string
    {
        $months = [
            '01' => 'ม.ค.', '02' => 'ก.พ.', '03' => 'มี.ค.', '04' => 'เม.ย.',
            '05' => 'พ.ค.', '06' => 'มิ.ย.', '07' => 'ก.ค.', '08' => 'ส.ค.',
            '09' => 'ก.ย.', '10' => 'ต.ค.', '11' => 'พ.ย.', '12' => 'ธ.ค.',
        ];

        if ($period && preg_match('/^(\d{4})(\d{2})(\d{2})/', trim($period), $m)) {
            $year = (int) $m[1];
            $month = $months[$m[2]] ?? $m[2];
            $day = (int) $m[3];
            return "{$day} {$month} {$year}";
        }

        if ($fallback && preg_match('/^(\d{4})-(\d{2})-(\d{2})/', trim($fallback), $m)) {
            $year = (int) $m[1] + 543;
            $month = $months[$m[2]] ?? $m[2];
            $day = (int) $m[3];
            return "{$day} {$month} {$year}";
        }

        return '-';
    }

    /**
     * แปลง Y-m-d หรือ datetime เป็น วัน เดือน ปี พ.ศ. สั้น
     */
    protected function formatThaiDateSimple(?string $dateStr): string
    {
        if (empty($dateStr)) {
            return '-';
        }

        $months = [
            '01' => 'ม.ค.', '02' => 'ก.พ.', '03' => 'มี.ค.', '04' => 'เม.ย.',
            '05' => 'พ.ค.', '06' => 'มิ.ย.', '07' => 'ก.ค.', '08' => 'ส.ค.',
            '09' => 'ก.ย.', '10' => 'ต.ค.', '11' => 'พ.ย.', '12' => 'ธ.ค.',
        ];

        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})/', trim($dateStr), $m)) {
            $year = (int) $m[1] + 543;
            $month = $months[$m[2]] ?? $m[2];
            $day = (int) $m[3];
            return "{$day} {$month} {$year}";
        }

        return $dateStr;
    }

    /**
     * บันทึกคำขออุทธรณ์เงินชดเชยลงในตาราง finance_cgd_appeal_cases โดยตรง
     */
    public function createAppeal(int $rowId, string $reason): array
    {
        $row = CgdStmRow::findOrFail($rowId);
        $shortfall = max(0, (float) $row->amount_claim - (float) $row->amount_approved);

        $matchKey = $row->match_key ?: ($row->hn . '|' . $row->pid . '|' . $row->seq_no);

        $appeal = DB::table('finance_cgd_appeal_cases')->updateOrInsert(
            ['match_key' => $matchKey],
            [
                'scheme' => strtolower($row->fund_codes ?: 'cgd'),
                'hn' => (string) $row->hn,
                'pid' => (string) $row->pid,
                'seq_no' => (string) $row->seq_no,
                'patient_name' => (string) $row->patient_name,
                'rep_no' => (string) $row->rep_no,
                'original_batch_id' => $row->batch_id,
                'original_amount_claim' => $row->amount_claim,
                'original_amount_approved' => $row->amount_approved,
                'original_shortfall' => $shortfall,
                'current_status' => 'submitted',
                'appeal_amount_requested' => $shortfall,
                'first_seen_at' => now(),
                'last_updated_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        return [
            'success' => true,
            'message' => 'บันทึกคำขออุทธรณ์สำหรับเคส HN: ' . $row->hn . ' ยอด ' . number_format($shortfall, 2) . ' บาท เรียบร้อยแล้ว',
        ];
    }

    /**
     * ตรวจสอบและตัดยอดรายการติด C และอุทธรณ์
     * หากพบว่าใน STM หลังจากนั้นมีการจ่ายเงินชดเชยครบ 100% แล้ว
     */
    public function runAutoSettlement(): array
    {
        // 1.0 ตัดยอดเคสที่ได้รับเงินชดเชยแล้วใน Statement STM จริง (finance_stm_detail_rows)
        if (\Illuminate\Support\Facades\Schema::hasTable('finance_stm_detail_rows')) {
            // A. ตัดยอดโดยจับคู่ SEQ NO
            DB::statement("
                UPDATE finance_cgd_stm_rows r
                JOIN (
                    SELECT seq_no, MAX(amount_approved) as stm_appr, MAX(claim_submission_no) as stm_sub
                    FROM finance_stm_detail_rows
                    WHERE amount_approved > 0 AND seq_no IS NOT NULL AND seq_no != ''
                    GROUP BY seq_no
                ) s ON s.seq_no = r.seq_no
                SET r.is_settled = 1,
                    r.settling_rep_no = s.stm_sub,
                    r.settled_at = NOW(),
                    r.updated_at = NOW()
                WHERE r.is_settled = 0
                  AND r.error_code IS NOT NULL AND r.error_code != ''
            ");

            // B. ตัดยอดเคส OPD โดยจับคู่ HN + วันที่รับบริการ (กรณี seq_no ไม่ตรงหรือว่าง)
            DB::statement("
                UPDATE finance_cgd_stm_rows r
                JOIN (
                    SELECT hn, visit_date, MAX(amount_approved) as stm_appr, MAX(claim_submission_no) as stm_sub
                    FROM finance_stm_detail_rows
                    WHERE amount_approved > 0 AND (an IS NULL OR an = '')
                    GROUP BY hn, visit_date
                ) s ON s.hn = r.hn AND s.visit_date = r.visit_date
                SET r.is_settled = 1,
                    r.settling_rep_no = s.stm_sub,
                    r.settled_at = NOW(),
                    r.updated_at = NOW()
                WHERE r.is_settled = 0
                  AND (r.an IS NULL OR r.an = '')
                  AND r.error_code IS NOT NULL AND r.error_code != ''
            ");

            // C. ตัดยอดเคส IPD โดยจับคู่ AN
            DB::statement("
                UPDATE finance_cgd_stm_rows r
                JOIN (
                    SELECT an, MAX(amount_approved) as stm_appr, MAX(claim_submission_no) as stm_sub
                    FROM finance_stm_detail_rows
                    WHERE amount_approved > 0 AND an IS NOT NULL AND an != ''
                    GROUP BY an
                ) s ON s.an = r.an
                SET r.is_settled = 1,
                    r.settling_rep_no = s.stm_sub,
                    r.settled_at = NOW(),
                    r.updated_at = NOW()
                WHERE r.is_settled = 0
                  AND r.an IS NOT NULL AND r.an != ''
                  AND r.error_code IS NOT NULL AND r.error_code != ''
            ");
        }

        // 1.1A ตัดยอดแถวที่ติด Error โดยมีแถวใน REP อื่นที่มีการอนุมัติเงิน (จับคู่ match_key)
        $sqlErrors = "
            UPDATE finance_cgd_stm_rows r1
            JOIN (
                SELECT match_key, MAX(id) as max_id, MAX(rep_no) as max_rep
                FROM finance_cgd_stm_rows
                WHERE amount_approved > 0 AND (error_code IS NULL OR error_code = '')
                GROUP BY match_key
            ) r2 ON r2.match_key = r1.match_key
            SET r1.is_settled = 1,
                r1.settling_row_id = r2.max_id,
                r1.settling_rep_no = r2.max_rep,
                r1.settled_at = NOW(),
                r1.updated_at = NOW()
            WHERE r1.is_settled = 0
              AND r1.id != r2.max_id
              AND r1.error_code IS NOT NULL AND r1.error_code != ''
        ";
        DB::update($sqlErrors);

        // 1.1B ตัดยอดโดย seq_no (กรณี match_key ในแต่ละ Batch รูปแบบไม่ตรงกัน)
        DB::statement("
            UPDATE finance_cgd_stm_rows r1
            JOIN (
                SELECT seq_no, MAX(id) as max_id, MAX(rep_no) as max_rep
                FROM finance_cgd_stm_rows
                WHERE amount_approved > 0 AND (error_code IS NULL OR error_code = '') AND seq_no IS NOT NULL AND seq_no != ''
                GROUP BY seq_no
            ) r2 ON r2.seq_no = r1.seq_no
            SET r1.is_settled = 1,
                r1.settling_row_id = r2.max_id,
                r1.settling_rep_no = r2.max_rep,
                r1.settled_at = NOW(),
                r1.updated_at = NOW()
            WHERE r1.is_settled = 0
              AND r1.id != r2.max_id
              AND r1.error_code IS NOT NULL AND r1.error_code != ''
        ");

        // 1.1C ตัดยอด OPD โดย hn + visit_date
        DB::statement("
            UPDATE finance_cgd_stm_rows r1
            JOIN (
                SELECT hn, visit_date, MAX(id) as max_id, MAX(rep_no) as max_rep
                FROM finance_cgd_stm_rows
                WHERE amount_approved > 0 AND (error_code IS NULL OR error_code = '') AND (an IS NULL OR an = '')
                GROUP BY hn, visit_date
            ) r2 ON r2.hn = r1.hn AND r2.visit_date = r1.visit_date
            SET r1.is_settled = 1,
                r1.settling_row_id = r2.max_id,
                r1.settling_rep_no = r2.max_rep,
                r1.settled_at = NOW(),
                r1.updated_at = NOW()
            WHERE r1.is_settled = 0
              AND r1.id != r2.max_id
              AND (r1.an IS NULL OR r1.an = '')
              AND r1.error_code IS NOT NULL AND r1.error_code != ''
        ");

        // 1.2 ปรับปรุงสถานะในตาราง finance_cgd_error_cases ให้เป็น fixed
        DB::statement("
            UPDATE finance_cgd_error_cases e
            JOIN (
                SELECT r.match_key, r.seq_no, r.hn, MAX(r.id) as max_id, MAX(r.rep_no) as max_rep, MAX(r.amount_approved) as max_appr
                FROM finance_cgd_stm_rows r
                WHERE r.is_settled = 1 OR (r.amount_approved > 0 AND (r.error_code IS NULL OR r.error_code = ''))
                GROUP BY r.match_key, r.seq_no, r.hn
            ) r ON (r.match_key = e.match_key OR (e.seq_no IS NOT NULL AND e.seq_no != '' AND r.seq_no = e.seq_no) OR r.hn = e.hn)
            SET e.current_status = 'fixed',
                e.current_error_code = NULL,
                e.current_amount_approved = GREATEST(COALESCE(e.current_amount_approved, 0), r.max_appr),
                e.last_updated_at = NOW(),
                e.updated_at = NOW()
            WHERE e.current_status IN ('open', 'still_open')
        ");

        // 1.3 ตัดยอดแถวใน finance_cgd_stm_rows ที่ match_key เดียวกันมีแถวที่จ่ายเงินครบแล้ว
        // โดยใช้ batch update JOIN ที่มีประสิทธิภาพสูง
        $sql = "
            UPDATE finance_cgd_stm_rows r1
            JOIN (
                SELECT match_key, MAX(id) as max_id, MAX(rep_no) as max_rep
                FROM finance_cgd_stm_rows
                WHERE amount_claim > 0 AND amount_approved >= amount_claim
                GROUP BY match_key
            ) r2 ON r2.match_key = r1.match_key
            SET r1.is_settled = 1,
                r1.settling_row_id = r2.max_id,
                r1.settling_rep_no = r2.max_rep,
                r1.settled_at = NOW(),
                r1.updated_at = NOW()
            WHERE r1.is_settled = 0
              AND r1.id != r2.max_id
              AND ((r1.error_code IS NOT NULL AND r1.error_code != '') OR (r1.amount_approved < r1.amount_claim))
        ";

        $affectedStmRows = DB::update($sql);

        // นับจำนวนแถวที่ติด C ซึ่งได้รับการตัดยอด
        $settledCDenyCount = DB::table('finance_cgd_stm_rows')
            ->where('is_settled', 1)
            ->whereNotNull('error_code')
            ->where('error_code', '!=', '')
            ->count();

        // ยอดเงินส่วนต่างรวมที่กู้คืนสำเร็จ
        $recoveredAmount = (float) DB::table('finance_cgd_stm_rows')
            ->where('is_settled', 1)
            ->selectRaw('COALESCE(SUM(GREATEST(0, amount_claim - amount_approved)), 0) as total')
            ->value('total');

        // 2. ตรวจสอบและตัดยอดในตาราง finance_cgd_appeal_cases
        $appealsCovered = DB::select("
            SELECT a.id, a.match_key, a.original_shortfall, m.sum_appr, m.max_claim, m.max_rep, m.max_id
            FROM finance_cgd_appeal_cases a
            JOIN (
                SELECT match_key, MAX(id) as max_id, MAX(amount_claim) as max_claim, SUM(amount_approved) as sum_appr, MAX(rep_no) as max_rep
                FROM finance_cgd_stm_rows
                GROUP BY match_key
                HAVING max_claim > 0 AND sum_appr >= max_claim
            ) m ON m.match_key = a.match_key
            WHERE a.current_status IN ('eligible', 'submitted', 'appealing', 'still_short')
        ");

        $settledAppealsCount = 0;
        foreach ($appealsCovered as $appeal) {
            DB::table('finance_cgd_appeal_cases')
                ->where('id', $appeal->id)
                ->update([
                    'current_status' => 'settled',
                    'appeal_amount_approved' => $appeal->max_claim,
                    'current_amount_approved' => $appeal->sum_appr,
                    'appeal_amount_requested' => 0.0,
                    'last_updated_at' => now(),
                    'updated_at' => now(),
                ]);

            // บันทึก Event การตัดยอด
            DB::table('finance_cgd_appeal_events')->insert([
                'appeal_case_id' => $appeal->id,
                'event_type' => 'settled',
                'rep_no' => (string) ($appeal->max_rep ?: ''),
                'amount_approved_before' => 0.0,
                'amount_approved_after' => (float) $appeal->sum_appr,
                'appeal_amount_before' => (float) $appeal->original_shortfall,
                'appeal_amount_after' => 0.0,
                'note' => 'ตัดยอดอุทธรณ์ออกอัตโนมัติ เนื่องจากได้รับเงินชดเชยครบแล้วใน STM Rep ' . ($appeal->max_rep ?: '-'),
                'created_by' => Auth::id() ?? 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $settledAppealsCount++;
        }

        // 3. ปรับปรุงเคสอุทธรณ์ที่ e-Claim ไม่อนุมัติเงินเพิ่ม (ยอดอนุมัติ <= 0) ให้เป็น 'denied' (อุทธรณ์ไม่ผ่าน / ปฏิเสธ)
        $deniedCount = DB::table('finance_cgd_appeal_cases')
            ->where('current_status', 'approved')
            ->where(function ($q) {
                $q->where('appeal_amount_approved', '<=', 0)
                    ->orWhere('current_amount_approved', '<=', 0);
            })
            ->update([
                'current_status' => 'denied',
                'last_updated_at' => now(),
                'updated_at' => now(),
            ]);

        Log::info('RCM runAutoSettlement completed', [
            'affected_stm_rows' => $affectedStmRows,
            'settled_c_deny_count' => $settledCDenyCount,
            'settled_appeals_count' => $settledAppealsCount,
            'recovered_amount' => $recoveredAmount,
        ]);

        return [
            'success' => true,
            'affected_stm_rows' => $affectedStmRows,
            'settled_c_deny_count' => $settledCDenyCount,
            'settled_appeals_count' => $settledAppealsCount,
            'recovered_amount' => $recoveredAmount,
            'message' => "ตัดยอดติด C สำเร็จ {$settledCDenyCount} รายการ, ตัดยอดอุทธรณ์ {$settledAppealsCount} เคส, รวมกู้คืนเงินสำเร็จ " . number_format($recoveredAmount, 2) . " บาท",
        ];
    }

    /**
     * นำเข้าไฟล์ STM เข้าสู่ฐานข้อมูลหลัก finance_cgd_stm_rows
     */
    public function processStmFile(UploadedFile $file, string $scheme = 'cgd'): array
    {
        try {
            $result = $this->stmImportService->import($file, 'นำเข้าผ่านโมดูล RCM', $scheme);
            
            // เรียกตัดยอดอัตโนมัติทันทีที่มี Statement ใหม่เข้ามา
            $settleResult = $this->runAutoSettlement();

            return [
                'success' => true,
                'batch_id' => $result['batch']->id,
                'filename' => $file->getClientOriginalName(),
                'message' => 'นำเข้าไฟล์ Statement เข้าสู่ระบบ RCM เรียบร้อยแล้ว (' . $settleResult['message'] . ')',
            ];
        } catch (\Throwable $e) {
            Log::error('RCM processStmFile error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * แปลง Preset ช่วงเวลาเป็นช่วงวันที่เริ่มต้นและสิ้นสุด
     */
    protected function resolveDateRange(array $filters): array
    {
        $preset = $filters['date_preset'] ?? 'all';
        $startDate = $filters['start_date'] ?? null;
        $endDate = $filters['end_date'] ?? null;

        if ($preset === 'custom' && $startDate && $endDate) {
            return [
                'preset' => 'custom',
                'start_date' => $startDate,
                'end_date' => $endDate,
                'label' => 'ช่วงวันที่ ' . Carbon::parse($startDate)->format('d/m/Y') . ' - ' . Carbon::parse($endDate)->format('d/m/Y'),
            ];
        }

        $now = Carbon::now();

        return match ($preset) {
            'this_month' => [
                'preset' => 'this_month',
                'start_date' => $now->copy()->startOfMonth()->format('Y-m-d'),
                'end_date' => $now->copy()->endOfMonth()->format('Y-m-d'),
                'label' => 'เดือนนี้ (' . $now->locale('th')->translatedFormat('F Y') . ')',
            ],
            'last_month' => [
                'preset' => 'last_month',
                'start_date' => $now->copy()->subMonth()->startOfMonth()->format('Y-m-d'),
                'end_date' => $now->copy()->subMonth()->endOfMonth()->format('Y-m-d'),
                'label' => 'เดือนที่แล้ว (' . $now->copy()->subMonth()->locale('th')->translatedFormat('F Y') . ')',
            ],
            'last_3_months' => [
                'preset' => 'last_3_months',
                'start_date' => $now->copy()->subMonths(2)->startOfMonth()->format('Y-m-d'),
                'end_date' => $now->copy()->endOfMonth()->format('Y-m-d'),
                'label' => 'ย้อนหลัง 3 เดือน',
            ],
            'last_6_months' => [
                'preset' => 'last_6_months',
                'start_date' => $now->copy()->subMonths(5)->startOfMonth()->format('Y-m-d'),
                'end_date' => $now->copy()->endOfMonth()->format('Y-m-d'),
                'label' => 'ย้อนหลัง 6 เดือน',
            ],
            'fiscal_2570' => [
                'preset' => 'fiscal_2570',
                'start_date' => '2026-10-01',
                'end_date' => '2027-09-30',
                'label' => 'ปีงบประมาณ 2570',
            ],
            'fiscal_2569' => [
                'preset' => 'fiscal_2569',
                'start_date' => '2025-10-01',
                'end_date' => '2026-09-30',
                'label' => 'ปีงบประมาณ 2569',
            ],
            'fiscal_2568' => [
                'preset' => 'fiscal_2568',
                'start_date' => '2024-10-01',
                'end_date' => '2025-09-30',
                'label' => 'ปีงบประมาณ 2568',
            ],
            default => [
                'preset' => 'all',
                'start_date' => null,
                'end_date' => null,
                'label' => 'ข้อมูลประวัติย้อนหลังทั้งหมด',
            ],
        };
    }

    /**
     * สร้าง Query พื้นฐานที่เชื่อมโยง finance_cgd_stm_rows กับ finance_cgd_appeal_cases และ finance_cgd_stm_batches
     */
    protected function buildBaseQuery(array $filters, array $dateRange, bool $selectFields = true)
    {
        $query = DB::table('finance_cgd_stm_rows as r')
            ->leftJoin('finance_cgd_stm_batches as b', 'b.id', '=', 'r.batch_id')
            ->leftJoin('finance_cgd_appeal_cases as a', 'a.match_key', '=', 'r.match_key');

        if ($selectFields) {
            $query->select(
                'r.id',
                'r.batch_id',
                'b.scheme as batch_scheme',
                'r.rep_no',
                'r.tran_id',
                'r.hn',
                'r.an',
                'r.pid',
                'r.patient_name',
                'r.visit_date',
                'r.discharge_at',
                'r.amount_claim',
                'r.amount_approved',
                'r.error_code',
                'r.fund_codes',
                'r.is_settled',
                'r.settling_row_id',
                'r.settling_rep_no',
                'r.settled_at',
                'a.id as appeal_id',
                'a.current_status as appeal_status',
                'a.appeal_amount_requested',
                'a.appeal_amount_approved'
            );
        }

        // กรองตามช่วงวันที่
        if (! empty($dateRange['start_date']) && ! empty($dateRange['end_date'])) {
            $query->whereBetween('r.visit_date', [$dateRange['start_date'], $dateRange['end_date']]);
        }

        // กรองตามกองทุน (Scheme / Fund)
        $scheme = strtolower($filters['scheme'] ?? 'cgd');
        if ($scheme !== 'all') {
            if ($scheme === 'lgo') {
                $query->where(function ($q) {
                    $q->where('b.scheme', 'lgo')
                      ->orWhere('r.fund_codes', 'LIKE', '%LG%')
                      ->orWhere('r.fund_codes', 'LIKE', '%LGO%')
                      ->orWhere('r.fund_codes', 'LIKE', '%BKK%')
                      ->orWhere('b.filename', 'LIKE', '%LGO%')
                      ->orWhere('b.filename', 'LIKE', '%OPLG%')
                      ->orWhere('b.filename', 'LIKE', '%IPLG%');
                })->where(function ($q) {
                    $q->where('b.scheme', '!=', 'cgd')
                      ->where('b.scheme', '!=', 'ucs')
                      ->orWhereNull('b.scheme');
                });
            } elseif ($scheme === 'ucs') {
                $query->where(function ($q) {
                    $q->where('b.scheme', 'ucs')
                      ->orWhere('r.fund_codes', 'LIKE', '%UCS%')
                      ->orWhere('r.fund_codes', 'LIKE', '%UC%')
                      ->orWhere(function ($sq) {
                          $sq->where('b.filename', 'LIKE', '%_OP_%')
                            ->where('b.filename', 'NOT LIKE', '%_OPCS_%')
                            ->where('b.filename', 'NOT LIKE', '%_OPLG%');
                      })
                      ->orWhere(function ($sq) {
                          $sq->where('b.filename', 'LIKE', '%_IP_%')
                            ->where('b.filename', 'NOT LIKE', '%_IPCS_%')
                            ->where('b.filename', 'NOT LIKE', '%_IPLG%');
                      });
                })->where(function ($q) {
                    $q->where('b.scheme', '!=', 'cgd')
                      ->where('b.scheme', '!=', 'lgo')
                      ->orWhereNull('b.scheme');
                });
            } elseif ($scheme === 'sss') {
                $query->where(function ($q) {
                    $q->where('b.scheme', 'sss')
                      ->orWhere('r.fund_codes', 'LIKE', '%SSS%');
                });
            } elseif ($scheme === 'cgd' || $scheme === 'ofc') {
                $query->where(function ($q) {
                    $q->where('b.scheme', 'cgd')
                      ->orWhere('r.fund_codes', 'LIKE', '%OFC%')
                      ->orWhere('r.fund_codes', 'LIKE', '%OTCS%')
                      ->orWhere('r.fund_codes', 'LIKE', '%OPCS%')
                      ->orWhere('r.fund_codes', 'LIKE', '%IPCS%')
                      ->orWhere('b.filename', 'LIKE', '%_OPCS_%')
                      ->orWhere('b.filename', 'LIKE', '%_IPCS_%');
                })->where(function ($q) {
                    $q->whereNotIn('b.scheme', ['lgo', 'ucs', 'sss'])
                      ->orWhereNull('b.scheme');
                })->where(function ($q) {
                    $q->where(function ($sq) {
                        $sq->where('r.fund_codes', 'NOT LIKE', '%LG%')
                          ->where('r.fund_codes', 'NOT LIKE', '%UC%')
                          ->where('r.fund_codes', 'NOT LIKE', '%SSS%');
                    })->orWhereNull('r.fund_codes');
                })->where(function ($q) {
                    $q->where('b.filename', 'NOT LIKE', '%_OP_%')
                      ->orWhere('b.filename', 'LIKE', '%_OPCS_%')
                      ->orWhereNull('b.filename');
                })->where(function ($q) {
                    $q->where('b.filename', 'NOT LIKE', '%_IP_%')
                      ->orWhere('b.filename', 'LIKE', '%_IPCS_%')
                      ->orWhereNull('b.filename');
                })->where(function ($q) {
                    $q->where('b.filename', 'NOT LIKE', '%LGO%')
                      ->orWhereNull('b.filename');
                });
            }
        }

        // กรองตามประเภทบริการ (OPD CSOP vs IPD CIPN)
        $claimType = $filters['claim_type'] ?? 'all';
        if ($claimType === 'CSOP') {
            $query->where(function ($q) {
                $q->whereNull('r.an')->orWhere('r.an', '');
            });
        } elseif ($claimType === 'CIPN') {
            $query->whereNotNull('r.an')->where('r.an', '!=', '');
        }

        // กรองตามสถานะทางการเงิน 6 มิติ
        $status = $filters['status'] ?? 'all';
        if ($status === 'matched_full') {
            $query->whereRaw('r.amount_claim > 0 AND r.amount_approved >= r.amount_claim');
        } elseif ($status === 'matched_partial') {
            $query->whereRaw('r.is_settled = 0 AND r.amount_approved > 0 AND r.amount_approved < r.amount_claim');
        } elseif ($status === 'rejected') {
            $query->where('r.is_settled', 0)
                  ->where(function ($q) {
                      $q->whereRaw('r.error_code IS NOT NULL AND r.error_code != ""')
                        ->orWhereRaw('r.amount_approved <= 0');
                  });
        } elseif ($status === 'pending_appeal') {
            $query->where('r.is_settled', 0)
                  ->whereRaw('GREATEST(0, r.amount_claim - r.amount_approved) > 0')
                  ->where(function ($q) {
                      $q->whereNull('a.id')
                        ->orWhereIn('a.current_status', ['eligible', 'pending']);
                  });
        } elseif ($status === 'in_appeal') {
            $query->where('r.is_settled', 0)
                  ->whereIn('a.current_status', ['appealing', 'submitted']);
        } elseif ($status === 'recovered') {
            $query->where(function ($q) {
                $q->where('r.is_settled', 1)
                  ->orWhere('a.current_status', 'approved')
                  ->orWhere('a.current_status', 'settled')
                  ->orWhere('a.appeal_amount_approved', '>', 0);
            });
        }

        // กรองตามรหัส C-Deny
        if (! empty($filters['c_deny_code']) && $filters['c_deny_code'] !== 'all') {
            $query->where('r.error_code', 'LIKE', '%' . $filters['c_deny_code'] . '%');
        }

        // ค้นหาด่วน (Search)
        if (! empty($filters['search'])) {
            $term = '%' . trim($filters['search']) . '%';
            $query->where(function ($q) use ($term) {
                $q->where('r.hn', 'LIKE', $term)
                  ->orWhere('r.an', 'LIKE', $term)
                  ->orWhere('r.pid', 'LIKE', $term)
                  ->orWhere('r.patient_name', 'LIKE', $term)
                  ->orWhere('r.rep_no', 'LIKE', $term)
                  ->orWhere('r.tran_id', 'LIKE', $term)
                  ->orWhere('r.seq_no', 'LIKE', $term);
            });
        }

        return $query;
    }

    protected function getFundName(string $code): string
    {
        return match (strtoupper($code)) {
            'OFC', 'OTCS', 'CS' => 'กรมบัญชีกลาง / ข้าราชการ (OFC)',
            'LGO', 'LG', 'BKK' => 'อปท. / องค์กรปกครองส่วนท้องถิ่น (LGO)',
            'UCS', 'UC' => 'สปสช. / บัตรทอง (UCS)',
            'SSS' => 'ประกันสังคม (SSS)',
            default => 'กองทุน ' . $code,
        };
    }
}
