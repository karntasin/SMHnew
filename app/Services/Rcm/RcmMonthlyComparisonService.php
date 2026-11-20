<?php

namespace App\Services\Rcm;

use App\Models\Finance\CgdStmRow;
use App\Models\Finance\StmDetailRow;
use App\Support\PiiMask;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RcmMonthlyComparisonService
{
    public function __construct(
        protected readonly RcmHosxpService $hosxpService,
    ) {}

    /**
     * คำนวณสรุปเปรียบเทียบข้อมูล 3 ฝ่าย รายเดือน: HOSxP vs REP vs STM
     * รองรับแยกกลุ่มผู้ป่วย: 'all' (ทั้งหมด), 'general' (ผู้ป่วยทั่วไป), 'hemodialysis' (ไตเทียม)
     * และคัดแยกยอดเงินสด (paid_money) ออกจากการคำนวณลูกหนี้เรียกเก็บ e-Claim อย่างเด็ดขาด
     */
    public function getMonthlyComparison(
        int $budgetYear = 2570,
        string $scheme = 'all',
        string $claimType = 'opd',
        string $serviceScope = 'all'
    ): array {
        $dates = $this->resolveFiscalYearRange($budgetYear);
        $startDate = $dates['start_date'];
        $endDate = $dates['end_date'];

        // 1. ดึงรายชื่อ HN ผู้ป่วยไตเทียม (หากเลือกเจาะจงกลุ่ม)
        $hemoHns = [];
        if ($serviceScope !== 'all' && $this->hosxpService->available()) {
            $hemoHns = $this->getHemodialysisHns($startDate, $endDate);
        }

        // 2. ดึงข้อมูลจาก HOSxP (MySQL hosxp) เป็นฐานข้อมูลหลัก
        $hosxpMap = $this->fetchHosxpMonthly($startDate, $endDate, $scheme, $claimType, $serviceScope);

        // 3. ดึงรายการ VN ผู้ป่วยนอกแยกตามเดือนเพื่อนำไปเทียบ SEQ ใน REP และ STM
        $hosxpVnsByMonth = $this->fetchHosxpVnsByMonth($startDate, $endDate, $scheme, $claimType, $serviceScope);

        // 4. ดึงข้อมูลจาก e-Claim REP โดยเทียบ SEQ กับ HOSxP (MySQL mysql)
        $repMap = $this->fetchRepMonthly($startDate, $endDate, $scheme, $claimType, $serviceScope, $hemoHns, $hosxpVnsByMonth);

        // 5. ดึงข้อมูลจาก Statement STM โดยเทียบ SEQ กับ HOSxP (MySQL mysql)
        $stmMap = $this->fetchStmMonthly($startDate, $endDate, $scheme, $claimType, $serviceScope, $hemoHns, $hosxpVnsByMonth);

        // 6. สร้างลำดับ 12 เดือนของปีงบประมาณ (ต.ค. - ก.ย.)
        $months = $this->generateFiscalMonths($budgetYear);

        $rows = [];
        $totals = [
            'hosxp_cases' => 0,
            'hosxp_income' => 0.0,
            'hosxp_uc_money' => 0.0,
            'hosxp_cash' => 0.0,
            'hosxp_drug' => 0.0,
            'hemo_cases' => 0,
            'hemo_uc_money' => 0.0,

            'rep_cases' => 0,
            'rep_claim' => 0.0,
            'rep_approved' => 0.0,
            'rep_drug' => 0.0,
            'rep_c_deny_cases' => 0,
            'rep_c_deny_amount' => 0.0,

            'stm_cases' => 0,
            'stm_claim' => 0.0,
            'stm_approved' => 0.0,

            'diff_hosxp_rep' => 0.0,
            'diff_rep_stm' => 0.0,
            'diff_hosxp_stm' => 0.0,
            'unclaimed_cases' => 0,
            'pending_stm_cases' => 0,
        ];

        foreach ($months as $m) {
            $ym = $m['month_key'];

            $h = $hosxpMap[$ym] ?? [
                'cases' => 0,
                'income' => 0.0,
                'uc_money' => 0.0,
                'cash' => 0.0,
                'drug' => 0.0,
                'hemo_cases' => 0,
                'hemo_uc' => 0.0,
            ];

            $r = $repMap[$ym] ?? [
                'cases' => 0,
                'claim' => 0.0,
                'approved' => 0.0,
                'drug' => 0.0,
                'c_deny_cases' => 0,
                'c_deny_amount' => 0.0,
            ];

            $s = $stmMap[$ym] ?? [
                'cases' => 0,
                'claim' => 0.0,
                'approved' => 0.0,
            ];

            // คำนวณผลต่างโดยใช้ uc_money (ยอดลูกหนี้สิทธิ HOSxP)
            $diffHosxpRep = (float) $h['uc_money'] - (float) $r['claim'];
            $diffRepStm = (float) $r['claim'] - (float) $s['approved'];
            $diffHosxpStm = (float) $h['uc_money'] - (float) $s['approved'];

            $unclaimedCases = max(0, (int) $h['cases'] - (int) $r['cases']);
            $pendingStmCases = max(0, (int) $r['cases'] - (int) $s['cases']);

            // อัตราการชดเชยเทียบกับยอดลูกหนี้สิทธิ HOSxP
            $recoveryRate = $h['uc_money'] > 0 ? round(($s['approved'] / $h['uc_money']) * 100, 2) : 0.0;
            $overallRecovery = $recoveryRate;

            // ประเมินสถานะของเดือนจากการเทียบ SEQ
            $status = 'normal';
            $statusLabel = 'รอประมวลผล';
            if ($h['cases'] === 0 && $r['cases'] === 0 && $s['cases'] === 0) {
                $status = 'no_data';
                $statusLabel = 'ยังไม่มีข้อมูล';
            } elseif ($recoveryRate >= 99.0 && $unclaimedCases === 0 && $pendingStmCases === 0) {
                $status = 'settled_full';
                $statusLabel = 'โอนจ่ายครบถ้วน 100%';
            } elseif ($recoveryRate >= 95.0) {
                $status = 'settled_almost';
                $statusLabel = "ชดเชยแล้ว {$recoveryRate}%" . ($pendingStmCases > 0 ? " (รอโอน {$pendingStmCases} เคส)" : '') . ($unclaimedCases > 0 ? " (ค้างส่ง {$unclaimedCases})" : '');
            } elseif ($s['approved'] > 0 && $diffRepStm > 0) {
                $status = 'pending_stm_part';
                $statusLabel = "จ่ายบางส่วน {$recoveryRate}% (รอโอน {$pendingStmCases} เคส)";
            } elseif ($r['cases'] > 0 && $s['approved'] <= 0) {
                $status = 'awaiting_stm';
                $statusLabel = "ส่งเบิกแล้ว {$r['cases']} เคส (รอดาวน์โหลด STM)";
            } elseif ($h['cases'] > 0 && $r['cases'] <= 0) {
                $status = 'unclaimed';
                $statusLabel = "ค้างยังไม่ส่งเบิก ({$h['cases']} เคส)";
            }

            $row = [
                'month_key' => $ym,
                'month_label_th' => $m['month_label_th'],
                'month_short_th' => $m['month_short_th'] ?? '',
                'year_th' => $m['year_th'],
                'short_year_th' => $m['short_year_th'] ?? substr((string) $m['year_th'], -2),
                'short_label_th' => $m['short_label_th'] ?? "{$m['month_label_th']} {$m['year_th']}",
                'short_year_label_th' => $m['short_year_label_th'] ?? '',
                'full_label_th' => $m['full_label_th'],

                // [1] HOSxP (ปลอดเงินสดในการคำนวณสิทธิ แต่แสดงเงินสดแยก)
                'hosxp_cases' => (int) $h['cases'],
                'hosxp_income' => (float) $h['income'],
                'hosxp_uc_money' => (float) $h['uc_money'],
                'hosxp_cash' => (float) $h['cash'],
                'hosxp_drug' => (float) $h['drug'],
                'hemo_cases' => (int) $h['hemo_cases'],
                'hemo_uc_money' => (float) $h['hemo_uc'],

                // [2] REP e-Claim (เทียบ SEQ)
                'rep_cases' => (int) $r['cases'],
                'rep_claim' => (float) $r['claim'],
                'rep_approved' => (float) $r['approved'],
                'rep_drug' => (float) $r['drug'],
                'rep_c_deny_cases' => (int) $r['c_deny_cases'],
                'rep_c_deny_amount' => (float) $r['c_deny_amount'],

                // [3] STM โอนเงินจริง (เทียบ SEQ)
                'stm_cases' => (int) $s['cases'],
                'stm_claim' => (float) $s['claim'],
                'stm_approved' => (float) $s['approved'],

                // [4] เปรียบเทียบผลต่าง & KPIs (เทียบ SEQ)
                'diff_hosxp_rep' => round($diffHosxpRep, 2),
                'diff_rep_stm' => round($diffRepStm, 2),
                'diff_hosxp_stm' => round($diffHosxpStm, 2),
                'recovery_rate' => $recoveryRate,
                'overall_recovery' => $overallRecovery,
                'unclaimed_cases' => $unclaimedCases,
                'pending_stm_cases' => $pendingStmCases,
                'status' => $status,
                'status_label' => $statusLabel,

                // [5] คำอธิบายส่วนต่างแบบจำแนก (Variance Breakdown & Explainer)
                'variance_details' => [
                    'unclaimed_cases' => $unclaimedCases,
                    'unclaimed_amount' => round(max(0, $diffHosxpRep), 2),
                    'c_deny_cases' => (int) $r['c_deny_cases'],
                    'c_deny_amount' => round((float) $r['c_deny_amount'], 2),
                    'pending_stm_cases' => $pendingStmCases,
                    'pending_stm_amount' => round(max(0, $diffRepStm), 2),
                    'hemo_cases' => (int) $h['hemo_cases'],
                    'hemo_amount' => round((float) $h['hemo_uc'], 2),
                    'cash_cases_amount' => round((float) $h['cash'], 2),
                ],
            ];

            $rows[] = $row;

            // รวมยอดสะสมทั้งปี
            $totals['hosxp_cases'] += $row['hosxp_cases'];
            $totals['hosxp_income'] += $row['hosxp_income'];
            $totals['hosxp_uc_money'] += $row['hosxp_uc_money'];
            $totals['hosxp_cash'] += $row['hosxp_cash'];
            $totals['hosxp_drug'] += $row['hosxp_drug'];
            $totals['hemo_cases'] += $row['hemo_cases'];
            $totals['hemo_uc_money'] += $row['hemo_uc_money'];

            $totals['rep_cases'] += $row['rep_cases'];
            $totals['rep_claim'] += $row['rep_claim'];
            $totals['rep_approved'] += $row['rep_approved'];
            $totals['rep_drug'] += $row['rep_drug'];
            $totals['rep_c_deny_cases'] += $row['rep_c_deny_cases'];
            $totals['rep_c_deny_amount'] += $row['rep_c_deny_amount'];

            $totals['stm_cases'] += $row['stm_cases'];
            $totals['stm_claim'] += $row['stm_claim'];
            $totals['stm_approved'] += $row['stm_approved'];

            $totals['diff_hosxp_rep'] += $row['diff_hosxp_rep'];
            $totals['diff_rep_stm'] += $row['diff_rep_stm'];
            $totals['diff_hosxp_stm'] += $row['diff_hosxp_stm'];
            $totals['unclaimed_cases'] += $row['unclaimed_cases'];
            $totals['pending_stm_cases'] += $row['pending_stm_cases'];
        }

        $totalOverallRecovery = $totals['hosxp_uc_money'] > 0
            ? round(($totals['stm_approved'] / $totals['hosxp_uc_money']) * 100, 2)
            : 0.0;

        $totals['recovery_rate'] = $totalOverallRecovery;
        $totals['overall_recovery'] = $totalOverallRecovery;

        return [
            'budget_year' => $budgetYear,
            'scheme' => $scheme,
            'claim_type' => $claimType,
            'service_scope' => $serviceScope,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'hosxp_ready' => $this->hosxpService->available(),
            'rows' => $rows,
            'totals' => $totals,
        ];
    }

    /**
     * ดึงข้อมูลเคสย่อยสำหรับ Drill-Down ในแต่ละเดือน
     * รองรับแท็บ: 'c_deny', 'stm_pending', 'unclaimed_hosxp', 'hemodialysis', 'cash_cases'
     */
    public function getMonthlyDrillDown(
        string $monthKey,
        string $scheme = 'all',
        string $claimType = 'all',
        string $serviceScope = 'all',
        string $tab = 'c_deny',
        int $limit = 100
    ): array {
        $startDate = "{$monthKey}-01";
        $endDate = Carbon::parse($startDate)->endOfMonth()->toDateString();

        // 1. Tab: ไตเทียม (Hemodialysis cases from HOSxP)
        if ($tab === 'hemodialysis' && $this->hosxpService->available()) {
            $schemeClause = $this->buildSchemeClause($scheme, 'v');
            $sql = "
                SELECT 
                    v.vn,
                    v.hn,
                    p.pname,
                    p.fname,
                    p.lname,
                    v.vstdate as visit_date,
                    py.name as pttype_name,
                    v.pdx,
                    v.income,
                    v.paid_money as cash_paid,
                    v.uc_money as claim_amount
                FROM vn_stat v
                INNER JOIN ovst ov ON ov.vn = v.vn
                LEFT JOIN patient p ON p.hn = v.hn
                LEFT JOIN pttype py ON py.pttype = v.pttype
                WHERE v.vstdate BETWEEN ? AND ?
                  AND ov.an IS NULL
                  AND {$schemeClause}
                  AND (ov.main_dep = '021' OR ov.cur_dep = '021' OR v.pttype IN ('02', 'AB', 'CC') OR v.pdx LIKE 'Z49%' OR v.pdx LIKE 'N185%')
                  AND v.uc_money > 0
                ORDER BY v.vstdate DESC, v.uc_money DESC
                LIMIT {$limit}
            ";

            $rows = DB::connection('hosxp')->select($sql, [$startDate, $endDate]);
            $items = [];
            foreach ($rows as $row) {
                $items[] = [
                    'vn' => (string) $row->vn,
                    'hn' => PiiMask::hn($row->hn),
                    'patient_name' => PiiMask::name($row->pname, $row->fname, $row->lname),
                    'visit_date' => (string) $row->visit_date,
                    'pttype_name' => (string) $row->pttype_name,
                    'pdx' => (string) $row->pdx,
                    'income' => (float) $row->income,
                    'cash_paid' => (float) $row->cash_paid,
                    'claim_amount' => (float) $row->claim_amount,
                ];
            }

            return [
                'tab' => 'hemodialysis',
                'month_key' => $monthKey,
                'count' => count($items),
                'items' => $items,
            ];
        }

        // 2. Tab: รายการชำระเงินสด / จ่ายเอง (Cash / Self-Pay)
        if ($tab === 'cash_cases' && $this->hosxpService->available()) {
            $schemeClause = $scheme !== 'all' ? "AND ({$this->buildSchemeClause($scheme, 'v')})" : '';
            $sql = "
                SELECT 
                    v.vn,
                    v.hn,
                    p.pname,
                    p.fname,
                    p.lname,
                    v.vstdate as visit_date,
                    py.name as pttype_name,
                    v.income,
                    v.paid_money as cash_paid,
                    v.uc_money as claim_amount,
                    IF(IFNULL(v.uc_money, 0) <= 0, 'เงินสด 100%', 'ร่วมจ่าย/ส่วนเกินสิทธิ') as cash_type
                FROM vn_stat v
                INNER JOIN ovst ov ON ov.vn = v.vn
                LEFT JOIN patient p ON p.hn = v.hn
                LEFT JOIN pttype py ON py.pttype = v.pttype
                WHERE v.vstdate BETWEEN ? AND ?
                  AND ov.an IS NULL
                  AND v.paid_money > 0
                  {$schemeClause}
                ORDER BY v.paid_money DESC
                LIMIT {$limit}
            ";

            $rows = DB::connection('hosxp')->select($sql, [$startDate, $endDate]);
            $items = [];
            foreach ($rows as $row) {
                $items[] = [
                    'vn' => (string) $row->vn,
                    'hn' => PiiMask::hn($row->hn),
                    'patient_name' => PiiMask::name($row->pname, $row->fname, $row->lname),
                    'visit_date' => (string) $row->visit_date,
                    'pttype_name' => (string) $row->pttype_name,
                    'income' => (float) $row->income,
                    'cash_paid' => (float) $row->cash_paid,
                    'claim_amount' => (float) $row->claim_amount,
                    'cash_type' => (string) $row->cash_type,
                ];
            }

            return [
                'tab' => 'cash_cases',
                'month_key' => $monthKey,
                'count' => count($items),
                'items' => $items,
            ];
        }

        // 3. Tab: เคสที่ติด C / มี Error ในไฟล์ REP (Deduplicate แสดงเฉพาะ Record ล่าสุดต่อเคส ป้องกันเคสส่งซ้ำ)
        if ($tab === 'c_deny') {
            $subQuery = DB::table('finance_cgd_stm_rows as r2')
                ->join('finance_cgd_stm_batches as b2', 'b2.id', '=', 'r2.batch_id')
                ->where('b2.file_kind', 'rep')
                ->whereBetween('r2.visit_date', [$startDate, $endDate])
                ->whereNotNull('r2.error_code')
                ->where('r2.error_code', '!=', '')
                ->where('r2.is_settled', 0);

            if ($scheme !== 'all') {
                $subQuery->where('b2.scheme', $scheme);
            }
            if ($claimType === 'opd') {
                $subQuery->where(function ($q) {
                    $q->whereNull('r2.an')->orWhere('r2.an', '');
                });
            } elseif ($claimType === 'ipd') {
                $subQuery->whereNotNull('r2.an')->where('r2.an', '!=', '');
            }

            $latestIds = $subQuery->selectRaw("MAX(r2.id) as max_id")
                ->groupBy(DB::raw("COALESCE(NULLIF(r2.seq_no, ''), CONCAT(r2.hn, '_', r2.visit_date))"))
                ->pluck('max_id');

            $items = DB::table('finance_cgd_stm_rows as r')
                ->join('finance_cgd_stm_batches as b', 'b.id', '=', 'r.batch_id')
                ->whereIn('r.id', $latestIds)
                ->select([
                    'r.id',
                    'r.rep_no',
                    'r.tran_id',
                    'r.hn',
                    'r.an',
                    'r.patient_name',
                    'r.visit_date',
                    'r.amount_claim',
                    'r.amount_approved',
                    DB::raw('GREATEST(0, r.amount_claim - r.amount_approved) as shortfall'),
                    'r.error_code',
                    'b.scheme',
                ])
                ->orderByDesc('shortfall')
                ->limit($limit)
                ->get()
                ->map(fn ($row) => [
                    'id' => $row->id,
                    'rep_no' => $row->rep_no,
                    'tran_id' => $row->tran_id,
                    'hn' => PiiMask::hn($row->hn),
                    'an' => (string) ($row->an ?? ''),
                    'patient_name' => PiiMask::name(null, $row->patient_name, null),
                    'visit_date' => $row->visit_date,
                    'claim_amount' => (float) $row->amount_claim,
                    'approved_amount' => (float) $row->amount_approved,
                    'shortfall' => (float) $row->shortfall,
                    'error_code' => $row->error_code,
                    'scheme' => strtoupper($row->scheme),
                ]);

            return [
                'tab' => 'c_deny',
                'month_key' => $monthKey,
                'count' => count($items),
                'items' => $items,
            ];
        }

        // 4. Tab: stm_pending (เคสใน REP ที่ส่งเบิกแล้ว แต่ยังไม่พบใน Statement STM หรือได้รับเงินไม่ครบ)
        if ($tab === 'stm_pending') {
            if ($this->hosxpService->available()) {
                $hosVns = DB::connection('hosxp')->table('vn_stat as v')
                    ->join('ovst as ov', 'ov.vn', '=', 'v.vn')
                    ->whereBetween('v.vstdate', [$startDate, $endDate])
                    ->whereNull('ov.an')
                    ->where('v.pttype', 'LIKE', '12%')
                    ->whereNotIn('ov.main_dep', ['021'])
                    ->pluck('v.vn')
                    ->toArray();

                $repQuery = DB::table('finance_cgd_stm_rows as r')
                    ->join('finance_cgd_stm_batches as b', 'b.id', '=', 'r.batch_id')
                    ->where('b.file_kind', 'rep')
                    ->whereIn('r.seq_no', $hosVns);

                if ($scheme !== 'all') {
                    $repQuery->where('b.scheme', $scheme);
                }

                $repRows = $repQuery->select([
                    'r.id', 'r.seq_no', 'r.rep_no', 'r.tran_id', 'r.hn', 'r.an',
                    'r.patient_name', 'r.visit_date', 'r.amount_claim', 'r.amount_approved', 'r.error_code', 'b.scheme',
                    'r.is_settled'
                ])
                ->orderBy('r.is_settled', 'asc')
                ->orderBy('r.id', 'desc')
                ->get();

                $repList = [];
                foreach ($repRows as $row) {
                    if (! isset($repList[$row->seq_no])) {
                        $repList[$row->seq_no] = $row;
                    }
                }

                $stmList = DB::table('finance_stm_detail_rows')
                    ->whereIn('seq_no', $hosVns)
                    ->selectRaw("seq_no, MAX(amount_approved) as amount_approved")
                    ->groupBy('seq_no')
                    ->get()
                    ->keyBy('seq_no');

                $items = [];
                foreach ($repList as $seq => $r) {
                    $stm = $stmList[$seq] ?? null;
                    $approvedAmount = $stm ? (float) $stm->amount_approved : 0.0;
                    $shortfall = max(0, (float) $r->amount_claim - $approvedAmount);

                    if (! $stm || $shortfall > 0) {
                        $items[] = [
                            'id' => $r->id,
                            'rep_no' => $r->rep_no,
                            'tran_id' => $r->tran_id,
                            'hn' => PiiMask::hn($r->hn),
                            'an' => (string) ($r->an ?? ''),
                            'patient_name' => PiiMask::name(null, $r->patient_name, null),
                            'visit_date' => $r->visit_date,
                            'claim_amount' => (float) $r->amount_claim,
                            'approved_amount' => $approvedAmount,
                            'shortfall' => (float) $shortfall,
                            'status' => ! $stm ? 'ยังไม่เข้า STM' : 'ได้ไม่ครบ (ขาด ' . number_format($shortfall, 2) . ' ฿)',
                            'error_code' => $r->error_code ?: '-',
                            'scheme' => strtoupper($r->scheme),
                        ];
                        if (count($items) >= $limit) {
                            break;
                        }
                    }
                }

                return [
                    'tab' => 'stm_pending',
                    'month_key' => $monthKey,
                    'count' => count($items),
                    'items' => $items,
                ];
            }

            // Fallback กรณีไม่มี HOSxP
            $query = DB::table('finance_cgd_stm_rows as r')
                ->join('finance_cgd_stm_batches as b', 'b.id', '=', 'r.batch_id')
                ->where('b.file_kind', 'rep')
                ->whereBetween('r.visit_date', [$startDate, $endDate])
                ->where('r.is_settled', 0)
                ->whereRaw('r.amount_claim > r.amount_approved');

            if ($scheme !== 'all') {
                $query->where('b.scheme', $scheme);
            }
            if ($claimType === 'opd') {
                $query->where(function ($q) {
                    $q->whereNull('r.an')->orWhere('r.an', '');
                });
            }

            $items = $query->select([
                'r.id', 'r.rep_no', 'r.tran_id', 'r.hn', 'r.an',
                'r.patient_name', 'r.visit_date', 'r.amount_claim', 'r.amount_approved',
                DB::raw('GREATEST(0, r.amount_claim - r.amount_approved) as shortfall'),
                'r.error_code', 'b.scheme',
            ])
            ->orderByDesc('shortfall')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'id' => $row->id,
                'rep_no' => $row->rep_no,
                'tran_id' => $row->tran_id,
                'hn' => PiiMask::hn($row->hn),
                'an' => (string) ($row->an ?? ''),
                'patient_name' => PiiMask::name(null, $row->patient_name, null),
                'visit_date' => $row->visit_date,
                'claim_amount' => (float) $row->amount_claim,
                'approved_amount' => (float) $row->amount_approved,
                'shortfall' => (float) $row->shortfall,
                'error_code' => $row->error_code ?: '-',
                'scheme' => strtoupper($row->scheme),
            ]);

            return [
                'tab' => 'stm_pending',
                'month_key' => $monthKey,
                'count' => count($items),
                'items' => $items,
            ];
        }

        // 5. Tab: unclaimed_hosxp (เคสใน HOSxP ที่เทียบ SEQ แล้วยังไม่พบในไฟล์ REP)
        if ($this->hosxpService->available()) {
            $schemeClause = $this->buildSchemeClause($scheme, 'v');
            $scopeClause = match ($serviceScope) {
                'hemodialysis' => "AND ov.main_dep = '021'",
                'general' => "AND ov.main_dep NOT IN ('021')",
                default => '',
            };

            $sql = "
                SELECT 
                    v.vn,
                    v.hn,
                    p.pname,
                    p.fname,
                    p.lname,
                    v.vstdate as visit_date,
                    ov.vsttime as visit_time,
                    py.name as pttype_name,
                    (IFNULL(v.inc03, 0) + IFNULL(v.inc17, 0)) as drug,
                    IFNULL(v.inc02, 0) as artificial_organ,
                    (IFNULL(v.inc01, 0) + IFNULL(v.inc04, 0) + IFNULL(v.inc05, 0) + IFNULL(v.inc06, 0) + IFNULL(v.inc07, 0) + IFNULL(v.inc08, 0) + IFNULL(v.inc09, 0) + IFNULL(v.inc10, 0) + IFNULL(v.inc11, 0) + IFNULL(v.inc12, 0) + IFNULL(v.inc13, 0) + IFNULL(v.inc14, 0) + IFNULL(v.inc15, 0) + IFNULL(v.inc16, 0)) as service_charge,
                    (IFNULL(v.income, 0)) as total,
                    IFNULL(v.paid_money, 0) as payment,
                    IFNULL(v.uc_money, 0) as debt,
                    IF(MAX(o.finance_number) IS NULL, '*', '') as no_finance_number,
                    k.department
                FROM vn_stat v
                INNER JOIN ovst ov ON ov.vn = v.vn
                LEFT JOIN opitemrece o ON o.vn = v.vn
                LEFT JOIN patient p ON p.hn = v.hn
                LEFT JOIN kskdepartment k ON k.depcode = ov.main_dep
                LEFT JOIN pttype py ON py.pttype = v.pttype
                WHERE v.vstdate BETWEEN ? AND ?
                  AND ov.an IS NULL
                  AND {$schemeClause}
                  {$scopeClause}
                  AND v.uc_money > 0
                GROUP BY v.vn
                ORDER BY v.uc_money DESC, v.vstdate DESC
            ";

            $rows = DB::connection('hosxp')->select($sql, [$startDate, $endDate]);
            $allVns = array_map(fn ($r) => (string) $r->vn, $rows);

            // ดึงรายการ seq_no และรายละเอียดที่เคยส่งเข้า REP/Appeal แล้ว
            $repDetails = DB::table('finance_cgd_stm_rows as r')
                ->join('finance_cgd_stm_batches as b', 'b.id', '=', 'r.batch_id')
                ->whereIn('r.seq_no', $allVns)
                ->select('r.seq_no', 'r.amount_claim', 'r.amount_approved', 'r.rep_no', 'b.file_kind')
                ->get()
                ->groupBy('seq_no');

            // Fallback Match: ดึงคู่ (hn, visit_date) ใน REP เผื่อเคสที่ไม่มี seq_no ในไฟล์
            $repDateHnRows = DB::table('finance_cgd_stm_rows as r')
                ->join('finance_cgd_stm_batches as b', 'b.id', '=', 'r.batch_id')
                ->where('b.file_kind', 'rep')
                ->whereBetween('r.visit_date', [$startDate, $endDate])
                ->selectRaw("CONCAT(r.hn, '_', r.visit_date) as hn_date, CONCAT(TRIM(LEADING '0' FROM r.hn), '_', r.visit_date) as hn_date_short")
                ->get();
            $repHnDateSet = [];
            foreach ($repDateHnRows as $rd) {
                if ($rd->hn_date) $repHnDateSet[$rd->hn_date] = true;
                if ($rd->hn_date_short) $repHnDateSet[$rd->hn_date_short] = true;
            }

            $items = [];
            $varianceItems = [];

            foreach ($rows as $row) {
                $vnStr = (string) $row->vn;
                $hnKey = $row->hn . '_' . $row->visit_date;
                $hnShortKey = ltrim((string) $row->hn, '0') . '_' . $row->visit_date;
                $reps = $repDetails->get($vnStr);
                $isMatched = ($reps && $reps->isNotEmpty()) || isset($repHnDateSet[$hnKey]) || isset($repHnDateSet[$hnShortKey]);

                // 1. เคสที่ยังไม่พบในไฟล์ REP เลย (ค้างส่งเบิกจริง)
                if (! $isMatched) {
                    $items[] = [
                        'vn' => $vnStr,
                        'hn' => PiiMask::hn($row->hn),
                        'patient_name' => PiiMask::name($row->pname, $row->fname, $row->lname),
                        'visit_date' => (string) $row->visit_date,
                        'visit_time' => (string) $row->visit_time,
                        'pttype_name' => (string) $row->pttype_name,
                        'drug' => (float) $row->drug,
                        'artificial_organ' => (float) $row->artificial_organ,
                        'service_charge' => (float) $row->service_charge,
                        'total' => (float) $row->total,
                        'payment' => (float) $row->payment,
                        'debt' => (float) $row->debt,
                        'income' => (float) $row->total,
                        'claim_amount' => (float) $row->debt,
                        'diff_amount' => (float) $row->debt,
                        'no_finance_number' => (string) ($row->no_finance_number ?? ''),
                        'department' => (string) ($row->department ?? ''),
                        'item_type' => 'unclaimed',
                        'diff_reason' => 'ยังไม่พบรายการส่งเบิกใน e-Claim',
                    ];
                } elseif ($reps && $reps->isNotEmpty()) {
                    // 2. เคสที่ส่งเบิกแล้ว แต่มีผลต่างยอดเงิน HOSxP vs e-Claim
                    $repRowsOnly = $reps->where('file_kind', 'rep');
                    $appealRows = $reps->where('file_kind', 'appeal');

                    $firstClaim = $repRowsOnly->max('amount_claim') ?? 0;
                    $diff = round((float) $row->debt - (float) $firstClaim, 2);

                    if (abs($diff) > 0.01) {
                        $reason = '';
                        $isAppealSettled = false;
                        if ($appealRows->isNotEmpty()) {
                            $appealRep = $appealRows->pluck('rep_no')->implode(', ');
                            $appealAmt = $appealRows->sum('amount_approved');
                            $reason = "ยื่นอุทธรณ์ชดเชยแล้ว (+".number_format($appealAmt, 2)." บ. งวด {$appealRep})";
                            $isAppealSettled = true;
                        } elseif ($diff < 0) {
                            $reason = "ปรับราคาตาม Fee Schedule (+".number_format(abs($diff), 2)." บ.)";
                        } else {
                            $reason = "ส่วนต่างค่าบริการตามเกณฑ์จ่ายตรง (-".number_format($diff, 2)." บ.)";
                        }

                        $varianceItems[] = [
                            'vn' => $vnStr,
                            'hn' => PiiMask::hn($row->hn),
                            'patient_name' => PiiMask::name($row->pname, $row->fname, $row->lname),
                            'visit_date' => (string) $row->visit_date,
                            'visit_time' => (string) $row->visit_time,
                            'pttype_name' => (string) $row->pttype_name,
                            'drug' => (float) $row->drug,
                            'artificial_organ' => (float) $row->artificial_organ,
                            'service_charge' => (float) $row->service_charge,
                            'total' => (float) $row->total,
                            'payment' => (float) $row->payment,
                            'debt' => (float) $row->debt,
                            'income' => (float) $row->total,
                            'claim_amount' => (float) $firstClaim,
                            'diff_amount' => $diff,
                            'no_finance_number' => (string) ($row->no_finance_number ?? ''),
                            'department' => (string) ($row->department ?? ''),
                            'item_type' => 'rate_variance',
                            'diff_reason' => $reason,
                            'is_appeal_settled' => $isAppealSettled,
                        ];
                    }
                }
            }

            // หากไม่มีเคสค้างส่งเลย (ส่งครบ 100%) แต่มีเคสที่มีส่วนต่างยอดเงิน HOSxP vs REP ให้แสดงเคสที่มีส่วนต่าง
            $isRateVariance = false;
            $rateVarianceAmount = 0.0;
            if (empty($items) && ! empty($varianceItems)) {
                $items = array_slice($varianceItems, 0, $limit);
                $isRateVariance = true;
                $rateVarianceAmount = round(array_sum(array_column($varianceItems, 'diff_amount')), 2);
            } else {
                $items = array_slice($items, 0, $limit);
            }

            return [
                'tab' => 'unclaimed_hosxp',
                'month_key' => $monthKey,
                'count' => count($items),
                'is_rate_variance' => $isRateVariance,
                'rate_variance_amount' => $rateVarianceAmount,
                'rate_variance_count' => count($varianceItems),
                'items' => $items,
            ];
        }

        return [
            'tab' => $tab,
            'month_key' => $monthKey,
            'count' => 0,
            'items' => [],
        ];
    }

    /**
     * ดึงข้อมูล HOSxP รายเดือน พร้อมแยกผู้ป่วยไตเทียม และยอดเงินสด (paid_money)
     */
    protected function fetchHosxpMonthly(
        string $startDate,
        string $endDate,
        string $scheme,
        string $claimType,
        string $serviceScope = 'all'
    ): array {
        if (! $this->hosxpService->available()) {
            return [];
        }

        $result = [];

        if ($claimType === 'ipd') {
            $schemeClause = $this->buildSchemeClause($scheme, 'a');
            $sql = "
                SELECT 
                    DATE_FORMAT(a.dchdate, '%Y-%m') as ym,
                    COUNT(DISTINCT a.an) as cases,
                    SUM(IFNULL(a.income, 0)) as income,
                    SUM(IFNULL(a.uc_money, 0)) as uc_money,
                    SUM(IFNULL(a.paid_money, 0)) as cash_paid,
                    SUM(IFNULL(a.inc03, 0) + IFNULL(a.inc17, 0)) as drug,
                    SUM(IFNULL(a.inc02, 0)) as artificial_organ,
                    SUM(IFNULL(a.income, 0) - (IFNULL(a.inc03, 0) + IFNULL(a.inc17, 0) + IFNULL(a.inc02, 0))) as service_charge,
                    0 as hemo_cases,
                    0 as hemo_uc
                FROM an_stat a
                LEFT JOIN pttype py ON py.pttype = a.pttype
                WHERE a.dchdate BETWEEN ? AND ?
                  AND {$schemeClause}
                  AND a.uc_money > 0
                GROUP BY ym
            ";

            $rows = DB::connection('hosxp')->select($sql, [$startDate, $endDate]);
            foreach ($rows as $r) {
                $ym = $r->ym;
                $result[$ym] = [
                    'cases' => (int) $r->cases,
                    'income' => (float) $r->income,
                    'uc_money' => (float) $r->uc_money,
                    'cash' => (float) $r->cash_paid,
                    'drug' => (float) $r->drug,
                    'artificial_organ' => (float) ($r->artificial_organ ?? 0),
                    'service_charge' => (float) ($r->service_charge ?? 0),
                    'hemo_cases' => 0,
                    'hemo_uc' => 0.0,
                ];
            }

            return $result;
        }

        // เงื่อนไขผู้ป่วยไตเทียมสำหรับ OPD (หน่วยไตเทียม 021)
        $hemoCondOpd = "ov.main_dep = '021'";
        $scopeClauseOpd = match ($serviceScope) {
            'hemodialysis' => "AND {$hemoCondOpd}",
            'general' => "AND ov.main_dep NOT IN ('021')",
            default => '',
        };

        // ผู้ป่วยนอก (OPD Only - ไม่มียอด IPD เด็ดขาด)
        $schemeClause = $this->buildSchemeClause($scheme, 'v');
        $sql = "
            SELECT 
                DATE_FORMAT(v.vstdate, '%Y-%m') as ym,
                COUNT(DISTINCT v.vn) as cases,
                SUM(IFNULL(v.income, 0)) as income,
                SUM(IFNULL(v.uc_money, 0)) as uc_money,
                SUM(IFNULL(v.paid_money, 0)) as cash_paid,
                SUM(IFNULL(v.inc03, 0) + IFNULL(v.inc17, 0)) as drug,
                SUM(IFNULL(v.inc02, 0)) as artificial_organ,
                SUM(IFNULL(v.inc01, 0) + IFNULL(v.inc04, 0) + IFNULL(v.inc05, 0) + IFNULL(v.inc06, 0) + IFNULL(v.inc07, 0) + IFNULL(v.inc08, 0) + IFNULL(v.inc09, 0) + IFNULL(v.inc10, 0) + IFNULL(v.inc11, 0) + IFNULL(v.inc12, 0) + IFNULL(v.inc13, 0) + IFNULL(v.inc14, 0) + IFNULL(v.inc15, 0) + IFNULL(v.inc16, 0)) as service_charge,
                COUNT(DISTINCT CASE WHEN {$hemoCondOpd} THEN v.vn END) as hemo_cases,
                SUM(CASE WHEN {$hemoCondOpd} THEN v.uc_money ELSE 0 END) as hemo_uc
            FROM vn_stat v
            INNER JOIN ovst ov ON ov.vn = v.vn
            LEFT JOIN pttype py ON py.pttype = v.pttype
            WHERE v.vstdate BETWEEN ? AND ?
              AND ov.an IS NULL
              AND {$schemeClause}
              {$scopeClauseOpd}
              AND v.uc_money > 0
            GROUP BY ym
        ";

        $rows = DB::connection('hosxp')->select($sql, [$startDate, $endDate]);
        foreach ($rows as $r) {
            $ym = $r->ym;
            $result[$ym] = [
                'cases' => (int) $r->cases,
                'income' => (float) $r->income,
                'uc_money' => (float) $r->uc_money,
                'cash' => (float) $r->cash_paid,
                'drug' => (float) $r->drug,
                'artificial_organ' => (float) ($r->artificial_organ ?? 0),
                'service_charge' => (float) ($r->service_charge ?? 0),
                'hemo_cases' => (int) $r->hemo_cases,
                'hemo_uc' => (float) $r->hemo_uc,
            ];
        }

        return $result;
    }

    /**
     * ดึงรายการ VN หรือ AN ผู้ป่วยแยกตามเดือน (%Y-%m) จาก HOSxP เพื่อนำไปเทียบ SEQ/AN ใน REP และ STM
     */
    protected function fetchHosxpVnsByMonth(
        string $startDate,
        string $endDate,
        string $scheme,
        string $claimType,
        string $serviceScope = 'all'
    ): array {
        if (! $this->hosxpService->available()) {
            return [];
        }

        if ($claimType === 'ipd') {
            $schemeClause = $this->buildSchemeClause($scheme, 'a');
            $sql = "
                SELECT a.an, DATE_FORMAT(a.dchdate, '%Y-%m') as ym
                FROM an_stat a
                WHERE a.dchdate BETWEEN ? AND ?
                  AND {$schemeClause}
                  AND a.uc_money > 0
            ";

            try {
                $rows = DB::connection('hosxp')->select($sql, [$startDate, $endDate]);
                $byMonth = [];
                foreach ($rows as $r) {
                    $byMonth[$r->ym][] = (string) $r->an;
                }

                return $byMonth;
            } catch (\Throwable $e) {
                Log::warning('Failed to fetch HOSxP ANs by month: '.$e->getMessage());

                return [];
            }
        }

        $hemoCondOpd = "ov.main_dep = '021'";
        $scopeClauseOpd = match ($serviceScope) {
            'hemodialysis' => "AND {$hemoCondOpd}",
            'general' => "AND ov.main_dep NOT IN ('021')",
            default => '',
        };

        $schemeClause = $this->buildSchemeClause($scheme, 'v');
        $sql = "
            SELECT v.vn, DATE_FORMAT(v.vstdate, '%Y-%m') as ym
            FROM vn_stat v
            INNER JOIN ovst ov ON ov.vn = v.vn
            WHERE v.vstdate BETWEEN ? AND ?
              AND ov.an IS NULL
              AND {$schemeClause}
              {$scopeClauseOpd}
              AND v.uc_money > 0
        ";

        try {
            $rows = DB::connection('hosxp')->select($sql, [$startDate, $endDate]);
            $byMonth = [];
            foreach ($rows as $r) {
                $byMonth[$r->ym][] = (string) $r->vn;
            }

            return $byMonth;
        } catch (\Throwable $e) {
            Log::warning('Failed to fetch HOSxP VNs by month: '.$e->getMessage());

            return [];
        }
    }

    /**
     * ดึง HN ผู้ป่วยไตเทียมทั้งหมดในช่วงวันที่ จาก HOSxP
     */
    protected function getHemodialysisHns(string $startDate, string $endDate): array
    {
        try {
            $sql = "
                SELECT DISTINCT v.hn
                FROM vn_stat v
                INNER JOIN ovst ov ON ov.vn = v.vn
                WHERE v.vstdate BETWEEN ? AND ?
                  AND (ov.main_dep = '021' OR ov.cur_dep = '021' OR v.pttype IN ('02', 'AB', 'CC') OR v.pdx LIKE 'Z49%' OR v.pdx LIKE 'N185%')
            ";
            $rows = DB::connection('hosxp')->select($sql, [$startDate, $endDate]);
            return array_column($rows, 'hn');
        } catch (\Throwable $e) {
            Log::warning('Failed to fetch Hemodialysis HNs: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * ดึงข้อมูล e-Claim REP รายเดือน โดยเทียบ SEQ กับ HOSxP VN เป็นหลัก
     */
    protected function fetchRepMonthly(
        string $startDate,
        string $endDate,
        string $scheme,
        string $claimType,
        string $serviceScope = 'all',
        array $hemoHns = [],
        array $hosxpVnsByMonth = []
    ): array {
        // หากมีรายการ HOSxP VNs/ANs ให้เทียบ SEQ/AN เป็นหลักตามคำสั่ง
        if (! empty($hosxpVnsByMonth)) {
            $result = [];
            $matchCol = $claimType === 'ipd' ? 'r.an' : 'r.seq_no';
            foreach ($hosxpVnsByMonth as $ym => $vns) {
                if (empty($vns)) {
                    continue;
                }

                $query = DB::table(function ($q) use ($vns, $scheme, $matchCol) {
                    $sub = $q->from('finance_cgd_stm_rows as r')
                        ->join('finance_cgd_stm_batches as b', 'b.id', '=', 'r.batch_id')
                        ->where('b.file_kind', 'rep')
                        ->whereIn($matchCol, $vns);

                    if ($scheme !== 'all') {
                        $sub->where('b.scheme', $scheme);
                    }

                    $sub->selectRaw("
                        {$matchCol} as match_id,
                        MAX(r.amount_claim) as claim,
                        MAX(r.amount_approved) as approved,
                        MAX(r.amount_drug) as drug,
                        MAX(CASE WHEN r.error_code IS NOT NULL AND r.error_code != '' AND r.is_settled = 0 THEN 1 ELSE 0 END) as is_c_deny,
                        MAX(CASE WHEN r.error_code IS NOT NULL AND r.error_code != '' AND r.is_settled = 0 THEN GREATEST(0, r.amount_claim - r.amount_approved) ELSE 0 END) as c_deny_amount
                    ")
                    ->groupBy($matchCol);
                }, 't');

                $r = $query->selectRaw("
                    COUNT(*) as cases,
                    SUM(claim) as claim,
                    SUM(approved) as approved,
                    SUM(drug) as drug,
                    COUNT(CASE WHEN is_c_deny = 1 THEN 1 END) as c_deny_cases,
                    SUM(c_deny_amount) as c_deny_amount
                ")->first();

                $result[$ym] = [
                    'cases' => (int) ($r->cases ?? 0),
                    'claim' => (float) ($r->claim ?? 0),
                    'approved' => (float) ($r->approved ?? 0),
                    'drug' => (float) ($r->drug ?? 0),
                    'c_deny_cases' => (int) ($r->c_deny_cases ?? 0),
                    'c_deny_amount' => (float) ($r->c_deny_amount ?? 0),
                ];
            }
            return $result;
        }

        // เพื่อป้องกันการนับซ้ำ (Deduplication) ของไฟล์ REP ที่มีการส่งเบิกซ้ำหรือส่ง Batch แก้ไข
        // ให้เลือกเฉพาะ Record ล่าสุด (MAX(id)) ของแต่ละเคส
        $dedupKey = $claimType === 'ipd'
            ? "COALESCE(NULLIF(r.an, ''), CONCAT(r.hn, '_', r.visit_date))"
            : "COALESCE(NULLIF(r.seq_no, ''), CONCAT(r.hn, '_', r.visit_date))";

        $subQuery = DB::table('finance_cgd_stm_rows as r')
            ->join('finance_cgd_stm_batches as b', 'b.id', '=', 'r.batch_id')
            ->where('b.file_kind', 'rep')
            ->whereBetween('r.visit_date', [$startDate, $endDate]);

        if ($scheme !== 'all') {
            $subQuery->where('b.scheme', $scheme);
        }

        if ($claimType === 'opd') {
            $subQuery->where(function ($q) {
                $q->whereNull('r.an')->orWhere('r.an', '');
            });
        } elseif ($claimType === 'ipd') {
            $subQuery->whereNotNull('r.an')->where('r.an', '!=', '');
        }

        // กรองกลุ่มไตเทียม vs ทั่วไป
        if ($serviceScope === 'hemodialysis') {
            if (empty($hemoHns)) {
                return [];
            }
            $subQuery->whereIn('r.hn', $hemoHns);
        } elseif ($serviceScope === 'general' && ! empty($hemoHns)) {
            $subQuery->whereNotIn('r.hn', $hemoHns);
        }

        $latestSub = $subQuery->selectRaw("
            MAX(r.id) as max_id,
            DATE_FORMAT(r.visit_date, '%Y-%m') as ym
        ")->groupBy(DB::raw("DATE_FORMAT(r.visit_date, '%Y-%m'), {$dedupKey}"));

        $rows = DB::table('finance_cgd_stm_rows as r')
            ->joinSub($latestSub, 'latest', function ($join) {
                $join->on('r.id', '=', 'latest.max_id');
            })
            ->selectRaw("
                latest.ym,
                COUNT(*) as cases,
                SUM(IFNULL(r.amount_claim, 0)) as claim,
                SUM(IFNULL(r.amount_approved, 0)) as approved,
                SUM(IFNULL(r.amount_drug, 0)) as drug,
                SUM(CASE WHEN r.error_code IS NOT NULL AND r.error_code != '' AND r.is_settled = 0 THEN GREATEST(0, r.amount_claim - r.amount_approved) ELSE 0 END) as c_deny_amount,
                COUNT(CASE WHEN r.error_code IS NOT NULL AND r.error_code != '' AND r.is_settled = 0 THEN 1 END) as c_deny_cases
            ")
            ->groupBy('latest.ym')
            ->get();

        $result = [];
        foreach ($rows as $r) {
            $result[$r->ym] = [
                'cases' => (int) $r->cases,
                'claim' => (float) $r->claim,
                'approved' => (float) $r->approved,
                'drug' => (float) $r->drug,
                'c_deny_cases' => (int) $r->c_deny_cases,
                'c_deny_amount' => (float) $r->c_deny_amount,
            ];
        }

        return $result;
    }

    /**
     * ดึงข้อมูล Statement STM รายเดือน โดยเทียบ SEQ กับ HOSxP VN เป็นหลัก
     */
    protected function fetchStmMonthly(
        string $startDate,
        string $endDate,
        string $scheme,
        string $claimType,
        string $serviceScope = 'all',
        array $hemoHns = [],
        array $hosxpVnsByMonth = []
    ): array {
        // หากมีรายการ HOSxP VNs/ANs ให้เทียบ SEQ/AN เป็นหลักตามคำสั่ง
        if (! empty($hosxpVnsByMonth)) {
            $result = [];
            $matchCol = $claimType === 'ipd' ? 'r.an' : 'r.seq_no';
            foreach ($hosxpVnsByMonth as $ym => $vns) {
                if (empty($vns)) {
                    continue;
                }

                $query = DB::table(function ($q) use ($vns, $matchCol) {
                    $q->from('finance_stm_detail_rows as r')
                        ->whereIn($matchCol, $vns)
                        ->selectRaw("
                            {$matchCol} as match_id,
                            MAX(r.amount_claim) as claim,
                            MAX(r.amount_approved) as approved
                        ")
                        ->groupBy($matchCol);
                }, 't');

                $r = $query->selectRaw("
                    COUNT(*) as cases,
                    SUM(claim) as claim,
                    SUM(approved) as approved
                ")->first();

                $result[$ym] = [
                    'cases' => (int) ($r->cases ?? 0),
                    'claim' => (float) ($r->claim ?? 0),
                    'approved' => (float) ($r->approved ?? 0),
                ];
            }
            return $result;
        }

        $result = [];

        // 1. CGD Statement (ดึงจาก finance_stm_detail_rows เมื่อ scheme เป็น cgd หรือ all)
        if ($scheme === 'cgd' || $scheme === 'all') {
            $query = DB::table('finance_stm_detail_rows as r')
                ->whereBetween('r.visit_date', [$startDate, $endDate]);

            if ($claimType === 'opd') {
                $query->where(function ($q) {
                    $q->whereNull('r.an')->orWhere('r.an', '');
                });
            } elseif ($claimType === 'ipd') {
                $query->whereNotNull('r.an')->where('r.an', '!=', '');
            }

            if ($serviceScope === 'hemodialysis') {
                if (empty($hemoHns)) {
                    $query->whereRaw('1 = 0');
                } else {
                    $query->whereIn('r.hn', $hemoHns);
                }
            } elseif ($serviceScope === 'general' && ! empty($hemoHns)) {
                $query->whereNotIn('r.hn', $hemoHns);
            }

            $rows = $query->selectRaw("
                DATE_FORMAT(r.visit_date, '%Y-%m') as ym,
                COUNT(*) as cases,
                SUM(IFNULL(r.amount_claim, 0)) as claim,
                SUM(IFNULL(r.amount_approved, 0)) as approved
            ")
            ->groupBy('ym')
            ->get();

            foreach ($rows as $r) {
                $result[$r->ym] = [
                    'cases' => (int) $r->cases,
                    'claim' => (float) $r->claim,
                    'approved' => (float) $r->approved,
                ];
            }
        }

        // 2. LGO SMT Transfers (ดึงจาก finance_nhso_smt_transfers เมื่อ scheme เป็น lgo หรือ all)
        if ($scheme === 'lgo' || $scheme === 'all') {
            try {
                $lgoRows = DB::table('finance_nhso_smt_transfers')
                    ->whereBetween('transfer_date', [$startDate, $endDate])
                    ->where('budget_source', 'lgo')
                    ->selectRaw("
                        DATE_FORMAT(transfer_date, '%Y-%m') as ym,
                        COUNT(*) as cases,
                        SUM(IFNULL(total, amount)) as approved
                    ")
                    ->groupBy('ym')
                    ->get();

                foreach ($lgoRows as $r) {
                    $ym = $r->ym;
                    if (! isset($result[$ym])) {
                        $result[$ym] = [
                            'cases' => 0,
                            'claim' => 0.0,
                            'approved' => 0.0,
                        ];
                    }
                    $result[$ym]['cases'] += (int) $r->cases;
                    $result[$ym]['claim'] += (float) $r->approved;
                    $result[$ym]['approved'] += (float) $r->approved;
                }
            } catch (\Throwable $e) {
                Log::warning('Failed to fetch LGO SMT transfers: ' . $e->getMessage());
            }
        }

        return $result;
    }

    /**
     * แปลงปีงบประมาณ พ.ศ. เป็นช่วงวันที่ ค.ศ.
     */
    public function resolveFiscalYearRange(int $budgetYear): array
    {
        $gregorianEndYear = $budgetYear - 543;
        $gregorianStartYear = $gregorianEndYear - 1;

        return [
            'start_date' => "{$gregorianStartYear}-10-01",
            'end_date' => "{$gregorianEndYear}-09-30",
        ];
    }

    /**
     * สร้างรายการ 12 เดือนของปีงบประมาณตามลำดับ (ต.ค. -> ก.ย.)
     */
    protected function generateFiscalMonths(int $budgetYear): array
    {
        $gregorianEndYear = $budgetYear - 543;
        $gregorianStartYear = $gregorianEndYear - 1;

        $thaiMonths = [
            1 => 'มกราคม', 2 => 'กุมภาพันธ์', 3 => 'มีนาคม', 4 => 'เมษายน',
            5 => 'พฤษภาคม', 6 => 'มิถุนายน', 7 => 'กรกฎาคม', 8 => 'สิงหาคม',
            9 => 'กันยายน', 10 => 'ตุลาคม', 11 => 'พฤศจิกายน', 12 => 'ธันวาคม',
        ];

        $thaiShortMonths = [
            1 => 'ม.ค.', 2 => 'ก.พ.', 3 => 'มี.ค.', 4 => 'เม.ย.',
            5 => 'พ.ค.', 6 => 'มิ.ย.', 7 => 'ก.ค.', 8 => 'ส.ค.',
            9 => 'ก.ย.', 10 => 'ต.ค.', 11 => 'พ.ย.', 12 => 'ธ.ค.',
        ];

        $sequence = [
            ['m' => 10, 'y' => $gregorianStartYear, 'by' => $budgetYear - 1],
            ['m' => 11, 'y' => $gregorianStartYear, 'by' => $budgetYear - 1],
            ['m' => 12, 'y' => $gregorianStartYear, 'by' => $budgetYear - 1],
            ['m' => 1, 'y' => $gregorianEndYear, 'by' => $budgetYear],
            ['m' => 2, 'y' => $gregorianEndYear, 'by' => $budgetYear],
            ['m' => 3, 'y' => $gregorianEndYear, 'by' => $budgetYear],
            ['m' => 4, 'y' => $gregorianEndYear, 'by' => $budgetYear],
            ['m' => 5, 'y' => $gregorianEndYear, 'by' => $budgetYear],
            ['m' => 6, 'y' => $gregorianEndYear, 'by' => $budgetYear],
            ['m' => 7, 'y' => $gregorianEndYear, 'by' => $budgetYear],
            ['m' => 8, 'y' => $gregorianEndYear, 'by' => $budgetYear],
            ['m' => 9, 'y' => $gregorianEndYear, 'by' => $budgetYear],
        ];

        $result = [];
        foreach ($sequence as $item) {
            $monthNum = str_pad((string) $item['m'], 2, '0', STR_PAD_LEFT);
            $ym = "{$item['y']}-{$monthNum}";
            $mName = $thaiMonths[$item['m']];
            $shortMName = $thaiShortMonths[$item['m']];
            $thYear = $item['y'] + 543;
            $shortYearTh = substr((string) $thYear, -2);

            $result[] = [
                'month_key' => $ym,
                'month_num' => $item['m'],
                'year_gregorian' => $item['y'],
                'year_th' => $thYear,
                'short_year_th' => $shortYearTh,
                'month_label_th' => $mName,
                'month_short_th' => $shortMName,
                'short_label_th' => "{$shortMName} {$thYear}",
                'short_year_label_th' => "{$shortMName} {$shortYearTh}",
                'full_label_th' => "{$mName} {$thYear}",
            ];
        }

        return $result;
    }

    /**
     * สร้างเงื่อนไข SQL Scheme สำหรับ HOSxP
     */
    protected function buildSchemeClause(string $scheme, string $pttypeAlias = 'v'): string
    {
        $py = 'py';
        switch (strtolower($scheme)) {
            case 'cgd':
            case 'ofc':
                return "{$pttypeAlias}.pttype LIKE '12%'";
            case 'lgo':
                return "({$pttypeAlias}.pttype IN ('41', '20') OR {$pttypeAlias}.pttype LIKE '20%' OR {$py}.hipdata_code = 'LGO')";
            case 'ucs':
            case 'uc':
                return "({$py}.hipdata_code = 'UCS' OR {$py}.pcode = 'UC' OR {$pttypeAlias}.pttype IN ('10','89','90','91'))";
            case 'sss':
                return "({$py}.hipdata_code = 'SSS' OR {$py}.pcode = 'SS')";
            case 'all':
            default:
                return "({$pttypeAlias}.pttype LIKE '12%' OR {$pttypeAlias}.pttype IN ('41', '20') OR {$pttypeAlias}.pttype LIKE '20%' OR {$py}.hipdata_code IN ('OFC', 'LGO', 'UCS', 'SSS'))";
        }
    }
}
