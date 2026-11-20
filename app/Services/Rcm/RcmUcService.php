<?php

namespace App\Services\Rcm;

use App\Models\Finance\CgdStmRow;
use App\Models\Finance\NhsoSmtTransfer;
use App\Support\PiiMask;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RcmUcService
{
    public function __construct(
        protected readonly RcmHosxpService $hosxpService,
    ) {}

    /**
     * คำนวณสรุปเปรียบเทียบข้อมูล 3 ฝ่าย สิทธิบัตรทอง (UC): HOSxP vs e-Claim REP vs NHSO SMT (เงินโอนจริง)
     *
     * @param int|string $periodMode ปีงบประมาณ เช่น 2570, 2569, 2568 หรือ 'since_jan_68'
     * @param string $subScheme กลุ่มสิทธิย่อย: 'all' (ไม่รวมไตเทียม), 'emergency' (04), 'camp_hospital' (03), 'soldier_civic' (19)
     * @param string $claimType ประเภทบริการ: 'all', 'opd', 'ipd'
     */
    public function getMonthlyComparison(
        int|string $periodMode = 2570,
        string $subScheme = 'all',
        string $claimType = 'all'
    ): array {
        $dates = $this->resolveDateRange($periodMode);
        $startDate = $dates['start_date'];
        $endDate = $dates['end_date'];
        $isContinuous = $dates['is_continuous'];

        // 1. ดึงข้อมูลจาก HOSxP (MySQL hosxp - Read Only)
        $hosxpMap = $this->fetchHosxpUcMonthly($startDate, $endDate, $subScheme, $claimType);

        // 2. ดึงรายการ VN/AN ของผู้ป่วยแยกตามเดือนเพื่อนำไปเทียบ SEQ / AN ใน REP
        $hosxpMatchKeysByMonth = $this->fetchHosxpMatchKeysByMonth($startDate, $endDate, $subScheme, $claimType);

        // 3. ดึงข้อมูลส่งเบิก e-Claim REP (MySQL mysql)
        $repMap = $this->fetchRepUcMonthly($startDate, $endDate, $claimType, $hosxpMatchKeysByMonth);

        // 4. ดึงข้อมูลอนุมัติจ่ายจริงจาก e-Claim Statement (STM) (ตาราง finance_stm_imports & finance_stm_detail_rows)
        $stmMap = $this->fetchStmUcMonthly($startDate, $endDate, $claimType, $hosxpMatchKeysByMonth);

        // 5. สร้างรายการเดือนตามช่วงเวลาที่เลือก
        $months = $this->generateMonthsList($startDate, $endDate, $isContinuous);

        $rows = [];
        $totals = [
            'hosxp_cases' => 0,
            'hosxp_income' => 0.0,
            'hosxp_uc_money' => 0.0,
            'hosxp_cash' => 0.0,
            'hosxp_drug' => 0.0,

            'rep_cases' => 0,
            'rep_claim' => 0.0,
            'rep_approved' => 0.0,
            'rep_drug' => 0.0,
            'rep_c_deny_cases' => 0,
            'rep_c_deny_amount' => 0.0,

            'stm_cases' => 0,
            'stm_claim' => 0.0,
            'stm_approved' => 0.0,
            'stm_batches' => 0,

            // สำหรับ backward compatibility
            'smt_batches' => 0,
            'smt_total_transferred' => 0.0,

            'diff_hosxp_rep' => 0.0,
            'diff_rep_stm' => 0.0,
            'diff_hosxp_stm' => 0.0,
            'diff_rep_smt' => 0.0,
            'diff_hosxp_smt' => 0.0,
            'unclaimed_cases' => 0,
            'recovery_rate' => 0.0,
        ];

        foreach ($months as $m) {
            $ym = $m['month_key'];

            $h = $hosxpMap[$ym] ?? [
                'cases' => 0,
                'income' => 0.0,
                'uc_money' => 0.0,
                'cash' => 0.0,
                'drug' => 0.0,
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
                'batches' => 0,
            ];

            // ผลต่าง:
            // 1. HOSxP vs e-Claim REP (ยอดค้างส่งเบิก / ส่งไม่ครบ)
            $diffHosxpRep = (float) $h['uc_money'] - (float) $r['claim'];

            // 2. e-Claim REP vs e-Claim STM (ยอดส่งเบิก vs ยอดอนุมัติจ่ายจริง / ถูกตัดจ่าย)
            $diffRepStm = (float) $r['claim'] - (float) $s['approved'];

            // 3. HOSxP vs e-Claim STM (ผลต่างรวมสุทธิ ระหว่างบริการ รพ. กับยอดอนุมัติจ่ายจริง)
            $diffHosxpStm = (float) $h['uc_money'] - (float) $s['approved'];

            $unclaimedCases = max(0, (int) $h['cases'] - (int) $r['cases']);

            // อัตราการชดเชยคืนทุนเทียบกับยอดลูกหนี้สิทธิ HOSxP
            $recoveryRate = $h['uc_money'] > 0
                ? round(($s['approved'] / $h['uc_money']) * 100, 2)
                : ($s['approved'] > 0 ? 100.0 : 0.0);

            // ประเมินสถานะของเดือน
            $status = 'normal';
            $statusLabel = 'รอประมวลผล';
            if ($h['cases'] === 0 && $r['cases'] === 0 && $s['approved'] <= 0) {
                $status = 'no_data';
                $statusLabel = 'ยังไม่มีข้อมูล';
            } elseif ($recoveryRate >= 95.0) {
                $status = 'settled_full';
                $statusLabel = "ชดเชยแล้ว {$recoveryRate}%";
            } elseif ($s['approved'] > 0 && $diffRepStm > 0) {
                $status = 'partially_settled';
                $statusLabel = "อนุมัติจ่าย {$recoveryRate}%";
            } elseif ($r['cases'] > 0 && $s['approved'] <= 0) {
                $status = 'awaiting_stm';
                $statusLabel = "ส่งตรวจแล้ว {$r['cases']} เคส (รอ Statement)";
            } elseif ($h['cases'] > 0 && $r['cases'] <= 0) {
                $status = 'unclaimed';
                $statusLabel = "ค้างส่งเบิก ({$h['cases']} เคส)";
            }

            $row = [
                'month_key' => $ym,
                'month_label_th' => $m['month_label_th'],
                'year_th' => $m['year_th'],
                'short_label_th' => $m['short_label_th'],
                'full_label_th' => $m['full_label_th'],

                // HOSxP
                'hosxp_cases' => (int) $h['cases'],
                'hosxp_income' => (float) $h['income'],
                'hosxp_uc_money' => (float) $h['uc_money'],
                'hosxp_cash' => (float) $h['cash'],
                'hosxp_drug' => (float) $h['drug'],

                // e-Claim REP
                'rep_cases' => (int) $r['cases'],
                'rep_claim' => (float) $r['claim'],
                'rep_approved' => (float) $r['approved'],
                'rep_drug' => (float) $r['drug'],
                'rep_c_deny_cases' => (int) $r['c_deny_cases'],
                'rep_c_deny_amount' => (float) $r['c_deny_amount'],

                // e-Claim STM (แทนที่ SMT เดิม)
                'stm_cases' => (int) $s['cases'],
                'stm_claim' => (float) $s['claim'],
                'stm_approved' => (float) $s['approved'],
                'stm_batches' => (int) $s['batches'],

                // Backward compatibility alias
                'smt_batches' => (int) $s['batches'],
                'smt_total_transferred' => (float) $s['approved'],

                // ผลต่าง & KPIs
                'diff_hosxp_rep' => round($diffHosxpRep, 2),
                'diff_rep_stm' => round($diffRepStm, 2),
                'diff_hosxp_stm' => round($diffHosxpStm, 2),
                'diff_rep_smt' => round($diffRepStm, 2),
                'diff_hosxp_smt' => round($diffHosxpStm, 2),
                'unclaimed_cases' => $unclaimedCases,
                'recovery_rate' => $recoveryRate,
                'status' => $status,
                'status_label' => $statusLabel,
            ];

            $rows[] = $row;

            // รวมยอดสะสม
            $totals['hosxp_cases'] += $row['hosxp_cases'];
            $totals['hosxp_income'] += $row['hosxp_income'];
            $totals['hosxp_uc_money'] += $row['hosxp_uc_money'];
            $totals['hosxp_cash'] += $row['hosxp_cash'];
            $totals['hosxp_drug'] += $row['hosxp_drug'];

            $totals['rep_cases'] += $row['rep_cases'];
            $totals['rep_claim'] += $row['rep_claim'];
            $totals['rep_approved'] += $row['rep_approved'];
            $totals['rep_drug'] += $row['rep_drug'];
            $totals['rep_c_deny_cases'] += $row['rep_c_deny_cases'];
            $totals['rep_c_deny_amount'] += $row['rep_c_deny_amount'];

            $totals['stm_cases'] += $row['stm_cases'];
            $totals['stm_claim'] += $row['stm_claim'];
            $totals['stm_approved'] += $row['stm_approved'];
            $totals['stm_batches'] += $row['stm_batches'];
            $totals['smt_batches'] += $row['smt_batches'];
            $totals['smt_total_transferred'] += $row['smt_total_transferred'];

            $totals['diff_hosxp_rep'] += $row['diff_hosxp_rep'];
            $totals['diff_rep_stm'] += $row['diff_rep_stm'];
            $totals['diff_hosxp_stm'] += $row['diff_hosxp_stm'];
            $totals['diff_rep_smt'] += $row['diff_rep_stm'];
            $totals['diff_hosxp_smt'] += $row['diff_hosxp_stm'];
            $totals['unclaimed_cases'] += $row['unclaimed_cases'];
        }

        $totalRecovery = $totals['hosxp_uc_money'] > 0
            ? round(($totals['stm_approved'] / $totals['hosxp_uc_money']) * 100, 2)
            : 0.0;
        $totals['recovery_rate'] = $totalRecovery;

        return [
            'period_mode' => $periodMode,
            'sub_scheme' => $subScheme,
            'claim_type' => $claimType,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'hosxp_ready' => $this->hosxpService->available(),
            'rows' => $rows,
            'totals' => $totals,
        ];
    }

    /**
     * ดึงข้อมูลเจาะลึกรายเคส (Drill-Down) ประจำเดือน
     *
     * @param string $monthKey รูปแบบ YYYY-MM
     * @param string $subScheme กลุ่มสิทธิย่อย
     * @param string $claimType ประเภทบริการ
     * @param string $tab 'hosxp_visits', 'rep_cases', 'smt_transfers', 'c_deny'
     * @param int $limit
     */
    public function getMonthlyDrillDown(
        string $monthKey,
        string $subScheme = 'all',
        string $claimType = 'all',
        string $tab = 'hosxp_visits',
        int $limit = 100
    ): array {
        $startDate = "{$monthKey}-01";
        $endDate = Carbon::parse($startDate)->endOfMonth()->toDateString();

        switch ($tab) {
            case 'hosxp_visits':
                return $this->fetchHosxpDrillDown($startDate, $endDate, $subScheme, $claimType, $limit);
            case 'rep_cases':
                return $this->fetchRepDrillDown($startDate, $endDate, $limit);
            case 'stm_items':
            case 'smt_transfers':
                return $this->fetchStmDrillDown($startDate, $endDate, $claimType, $limit);
            case 'c_deny':
                return $this->fetchCDenyDrillDown($startDate, $endDate, $limit);
            default:
                return ['tab' => $tab, 'count' => 0, 'items' => []];
        }
    }

    /**
     * ดึงข้อมูล HOSxP รายเดือน
     */
    protected function fetchHosxpUcMonthly(
        string $startDate,
        string $endDate,
        string $subScheme,
        string $claimType
    ): array {
        if (! $this->hosxpService->available()) {
            return [];
        }

        $result = [];

        // 1. ผู้ป่วยนอก (OPD)
        if ($claimType === 'all' || $claimType === 'opd') {
            $pttypeClause = $this->buildPttypeClause($subScheme, 'v');
            $sqlOpd = "
                SELECT 
                    DATE_FORMAT(v.vstdate, '%Y-%m') as ym,
                    COUNT(DISTINCT v.vn) as cases,
                    SUM(v.income) as income,
                    SUM(v.uc_money) as uc_money,
                    SUM(v.paid_money) as cash,
                    SUM(v.item_money) as drug
                FROM vn_stat v
                INNER JOIN ovst ov ON ov.vn = v.vn
                WHERE v.vstdate BETWEEN ? AND ?
                  AND ov.an IS NULL
                  AND (ov.main_dep != '021' AND (ov.cur_dep != '021' OR ov.cur_dep IS NULL))
                  AND v.pttype NOT IN ('02', '03', 'AB')
                  AND (v.pdx IS NULL OR (v.pdx NOT LIKE 'Z49%' AND v.pdx NOT LIKE 'N185%'))
                  AND {$pttypeClause}
                GROUP BY ym
            ";

            try {
                $opdRows = DB::connection('hosxp')->select($sqlOpd, [$startDate, $endDate]);
                foreach ($opdRows as $r) {
                    $ym = (string) $r->ym;
                    $result[$ym] = [
                        'cases' => (int) $r->cases,
                        'income' => (float) $r->income,
                        'uc_money' => (float) $r->uc_money,
                        'cash' => (float) $r->cash,
                        'drug' => (float) $r->drug,
                    ];
                }
            } catch (\Throwable $e) {
                Log::warning('RcmUcService::fetchHosxpUcMonthly OPD error: '.$e->getMessage());
            }
        }

        // 2. ผู้ป่วยใน (IPD)
        if ($claimType === 'all' || $claimType === 'ipd') {
            $pttypeClauseIpd = $this->buildPttypeClause($subScheme, 'a');
            $sqlIpd = "
                SELECT 
                    DATE_FORMAT(a.dchdate, '%Y-%m') as ym,
                    COUNT(DISTINCT a.an) as cases,
                    SUM(a.income) as income,
                    SUM(a.uc_money) as uc_money,
                    SUM(a.paid_money) as cash,
                    SUM(a.item_money) as drug
                FROM an_stat a
                WHERE a.dchdate BETWEEN ? AND ?
                  AND a.pttype NOT IN ('02', '03', 'AB')
                  AND (a.pdx IS NULL OR (a.pdx NOT LIKE 'Z49%' AND a.pdx NOT LIKE 'N185%'))
                  AND (a.spclty != '21' OR a.spclty IS NULL)
                  AND {$pttypeClauseIpd}
                GROUP BY ym
            ";

            try {
                $ipdRows = DB::connection('hosxp')->select($sqlIpd, [$startDate, $endDate]);
                foreach ($ipdRows as $r) {
                    $ym = (string) $r->ym;
                    if (! isset($result[$ym])) {
                        $result[$ym] = [
                            'cases' => 0,
                            'income' => 0.0,
                            'uc_money' => 0.0,
                            'cash' => 0.0,
                            'drug' => 0.0,
                        ];
                    }
                    $result[$ym]['cases'] += (int) $r->cases;
                    $result[$ym]['income'] += (float) $r->income;
                    $result[$ym]['uc_money'] += (float) $r->uc_money;
                    $result[$ym]['cash'] += (float) $r->cash;
                    $result[$ym]['drug'] += (float) $r->drug;
                }
            } catch (\Throwable $e) {
                Log::warning('RcmUcService::fetchHosxpUcMonthly IPD error: '.$e->getMessage());
            }
        }

        return $result;
    }

    /**
     * ดึงรายการ Match Keys (VN หรือ AN) จาก HOSxP แยกตามเดือน
     */
    protected function fetchHosxpMatchKeysByMonth(
        string $startDate,
        string $endDate,
        string $subScheme,
        string $claimType
    ): array {
        if (! $this->hosxpService->available()) {
            return [];
        }

        $byMonth = [];

        // OPD (VNs)
        if ($claimType === 'all' || $claimType === 'opd') {
            $pttypeClause = $this->buildPttypeClause($subScheme, 'v');
            $sql = "
                SELECT v.vn, DATE_FORMAT(v.vstdate, '%Y-%m') as ym
                FROM vn_stat v
                INNER JOIN ovst ov ON ov.vn = v.vn
                WHERE v.vstdate BETWEEN ? AND ?
                  AND ov.an IS NULL
                  AND (ov.main_dep != '021' AND (ov.cur_dep != '021' OR ov.cur_dep IS NULL))
                  AND v.pttype NOT IN ('02', '03', 'AB')
                  AND (v.pdx IS NULL OR (v.pdx NOT LIKE 'Z49%' AND v.pdx NOT LIKE 'N185%'))
                  AND {$pttypeClause}
            ";
            try {
                $rows = DB::connection('hosxp')->select($sql, [$startDate, $endDate]);
                foreach ($rows as $r) {
                    $byMonth[$r->ym][] = (string) $r->vn;
                }
            } catch (\Throwable $e) {
                Log::warning('RcmUcService fetchMatchKeys OPD: '.$e->getMessage());
            }
        }

        // IPD (ANs)
        if ($claimType === 'all' || $claimType === 'ipd') {
            $pttypeClauseIpd = $this->buildPttypeClause($subScheme, 'a');
            $sqlIpd = "
                SELECT a.an, DATE_FORMAT(a.dchdate, '%Y-%m') as ym
                FROM an_stat a
                WHERE a.dchdate BETWEEN ? AND ?
                  AND a.pttype NOT IN ('02', '03', 'AB')
                  AND (a.pdx IS NULL OR (a.pdx NOT LIKE 'Z49%' AND a.pdx NOT LIKE 'N185%'))
                  AND (a.spclty != '21' OR a.spclty IS NULL)
                  AND {$pttypeClauseIpd}
            ";
            try {
                $rowsIpd = DB::connection('hosxp')->select($sqlIpd, [$startDate, $endDate]);
                foreach ($rowsIpd as $r) {
                    $byMonth[$r->ym][] = (string) $r->an;
                }
            } catch (\Throwable $e) {
                Log::warning('RcmUcService fetchMatchKeys IPD: '.$e->getMessage());
            }
        }

        return $byMonth;
    }

    /**
     * ดึงข้อมูล e-Claim REP
     */
    protected function fetchRepUcMonthly(
        string $startDate,
        string $endDate,
        string $claimType,
        array $hosxpMatchKeysByMonth
    ): array {
        $result = [];

        // หากมี Match keys จาก HOSxP ให้นำไปเทียบโดยตรง
        if (! empty($hosxpMatchKeysByMonth)) {
            foreach ($hosxpMatchKeysByMonth as $ym => $keys) {
                if (empty($keys)) {
                    continue;
                }

                $query = DB::table('finance_cgd_stm_rows as r')
                    ->join('finance_cgd_stm_batches as b', 'b.id', '=', 'r.batch_id')
                    ->where('b.file_kind', 'rep')
                    ->where(function ($q) {
                        $q->where('b.scheme', 'ucs')
                            ->orWhere('b.scheme', 'uc')
                            ->orWhere('b.filename', 'LIKE', '%OPUC%')
                            ->orWhere('b.filename', 'LIKE', '%IPUC%')
                            ->orWhere('b.filename', 'LIKE', '%UC%');
                    })
                    ->where(function ($q) {
                        $q->whereNull('b.filename')->orWhere('b.filename', 'NOT LIKE', '%HD%');
                    })
                    ->where(function ($q) {
                        $q->whereNull('r.rep_no')->orWhere('r.rep_no', 'NOT LIKE', '%HD%');
                    })
                    ->where(function ($q) {
                        $q->whereNull('r.projcode')->orWhere('r.projcode', 'NOT LIKE', '%HD%');
                    })
                    ->where(function ($q) use ($keys) {
                        $q->whereIn('r.seq_no', $keys)
                            ->orWhereIn('r.an', $keys);
                    });

                $row = $query->selectRaw("
                    COUNT(DISTINCT COALESCE(NULLIF(r.seq_no, ''), r.an, r.id)) as cases,
                    SUM(r.amount_claim) as claim,
                    SUM(r.amount_approved) as approved,
                    SUM(r.amount_drug) as drug,
                    COUNT(DISTINCT CASE WHEN r.error_code IS NOT NULL AND r.error_code != '' THEN COALESCE(NULLIF(r.seq_no, ''), r.an, r.id) END) as c_deny_cases,
                    SUM(CASE WHEN r.error_code IS NOT NULL AND r.error_code != '' THEN GREATEST(0, r.amount_claim - r.amount_approved) ELSE 0 END) as c_deny_amount
                ")->first();

                $result[$ym] = [
                    'cases' => (int) ($row->cases ?? 0),
                    'claim' => (float) ($row->claim ?? 0),
                    'approved' => (float) ($row->approved ?? 0),
                    'drug' => (float) ($row->drug ?? 0),
                    'c_deny_cases' => (int) ($row->c_deny_cases ?? 0),
                    'c_deny_amount' => (float) ($row->c_deny_amount ?? 0),
                ];
            }

            return $result;
        }

        // หากไม่มี Match Keys ให้ดึงตาม visit_date
        $rows = DB::table('finance_cgd_stm_rows as r')
            ->join('finance_cgd_stm_batches as b', 'b.id', '=', 'r.batch_id')
            ->where('b.file_kind', 'rep')
            ->whereBetween('r.visit_date', [$startDate, $endDate])
            ->where(function ($q) {
                $q->where('b.scheme', 'ucs')
                    ->orWhere('b.scheme', 'uc')
                    ->orWhere('b.filename', 'LIKE', '%OPUC%')
                    ->orWhere('b.filename', 'LIKE', '%IPUC%')
                    ->orWhere('b.filename', 'LIKE', '%UC%');
            })
            ->where(function ($q) {
                $q->whereNull('b.filename')->orWhere('b.filename', 'NOT LIKE', '%HD%');
            })
            ->where(function ($q) {
                $q->whereNull('r.rep_no')->orWhere('r.rep_no', 'NOT LIKE', '%HD%');
            })
            ->where(function ($q) {
                $q->whereNull('r.projcode')->orWhere('r.projcode', 'NOT LIKE', '%HD%');
            })
            ->selectRaw("
                DATE_FORMAT(r.visit_date, '%Y-%m') as ym,
                COUNT(DISTINCT COALESCE(NULLIF(r.seq_no, ''), r.an, r.id)) as cases,
                SUM(r.amount_claim) as claim,
                SUM(r.amount_approved) as approved,
                SUM(r.amount_drug) as drug,
                COUNT(DISTINCT CASE WHEN r.error_code IS NOT NULL AND r.error_code != '' THEN COALESCE(NULLIF(r.seq_no, ''), r.an, r.id) END) as c_deny_cases,
                SUM(CASE WHEN r.error_code IS NOT NULL AND r.error_code != '' THEN GREATEST(0, r.amount_claim - r.amount_approved) ELSE 0 END) as c_deny_amount
            ")
            ->groupBy('ym')
            ->get();

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
     * ดึงข้อมูลอนุมัติจ่ายจริงจาก e-Claim Statement (STM)
     */
    protected function fetchStmUcMonthly(
        string $startDate,
        string $endDate,
        string $claimType,
        array $hosxpMatchKeysByMonth
    ): array {
        $result = [];

        // 1. ถ้ามี Match keys จาก HOSxP ให้เทียบตาม keys ของแต่ละเดือน
        if (! empty($hosxpMatchKeysByMonth)) {
            foreach ($hosxpMatchKeysByMonth as $ym => $keys) {
                if (empty($keys)) {
                    continue;
                }

                $query = DB::table('finance_stm_detail_rows as d')
                    ->join('finance_stm_imports as i', 'i.id', '=', 'd.import_id')
                    ->where(function ($q) {
                        $q->where('i.claim_submission_no', 'LIKE', '%UCS%')
                            ->orWhere('i.filename', 'LIKE', '%UCS%');
                    })
                    ->where(function ($q) use ($keys) {
                        $q->whereIn('d.seq_no', $keys)
                            ->orWhereIn('d.an', $keys);
                    });

                if ($claimType === 'opd') {
                    $query->where('i.channel', 'OP');
                } elseif ($claimType === 'ipd') {
                    $query->where('i.channel', 'IP');
                }

                $row = $query->selectRaw("
                    COUNT(DISTINCT COALESCE(NULLIF(d.seq_no, ''), d.an, d.id)) as cases,
                    SUM(d.amount_claim) as claim,
                    SUM(d.amount_approved) as approved,
                    COUNT(DISTINCT d.import_id) as batches
                ")->first();

                $result[$ym] = [
                    'cases' => (int) ($row->cases ?? 0),
                    'claim' => (float) ($row->claim ?? 0),
                    'approved' => (float) ($row->approved ?? 0),
                    'batches' => (int) ($row->batches ?? 0),
                ];
            }

            return $result;
        }

        // 2. ถ้าไม่มี Match keys ให้ดึงตาม visit_date
        $query = DB::table('finance_stm_detail_rows as d')
            ->join('finance_stm_imports as i', 'i.id', '=', 'd.import_id')
            ->where(function ($q) {
                $q->where('i.claim_submission_no', 'LIKE', '%UCS%')
                    ->orWhere('i.filename', 'LIKE', '%UCS%');
            })
            ->whereBetween('d.visit_date', [$startDate, $endDate]);

        if ($claimType === 'opd') {
            $query->where('i.channel', 'OP');
        } elseif ($claimType === 'ipd') {
            $query->where('i.channel', 'IP');
        }

        $rows = $query->selectRaw("
            DATE_FORMAT(d.visit_date, '%Y-%m') as ym,
            COUNT(DISTINCT COALESCE(NULLIF(d.seq_no, ''), d.an, d.id)) as cases,
            SUM(d.amount_claim) as claim,
            SUM(d.amount_approved) as approved,
            COUNT(DISTINCT d.import_id) as batches
        ")
        ->groupBy('ym')
        ->get();

        foreach ($rows as $r) {
            $result[$r->ym] = [
                'cases' => (int) $r->cases,
                'claim' => (float) $r->claim,
                'approved' => (float) $r->approved,
                'batches' => (int) $r->batches,
            ];
        }

        return $result;
    }

    /**
     * Drill-Down: รายการผู้มารับบริการจาก HOSxP (ตัวตั้ง) พร้อมจับคู่ผลส่งเบิก REP และชดเชย STM ด้วย SEQ / AN
     */
    protected function fetchHosxpDrillDown(
        string $startDate,
        string $endDate,
        string $subScheme,
        string $claimType,
        int $limit = 250
    ): array {
        if (! $this->hosxpService->available()) {
            return ['tab' => 'hosxp_visits', 'count' => 0, 'items' => []];
        }

        $items = [];

        // OPD
        if ($claimType === 'all' || $claimType === 'opd') {
            $pttypeClause = $this->buildPttypeClause($subScheme, 'v');
            $sqlOpd = "
                SELECT 
                    v.vn,
                    v.hn,
                    p.pname,
                    p.fname,
                    p.lname,
                    p.cid,
                    v.vstdate as service_date,
                    py.name as pttype_name,
                    v.pdx,
                    v.income,
                    v.paid_money as cash_paid,
                    v.uc_money as claim_amount,
                    d.department as department_name,
                    'OPD' as service_type
                FROM vn_stat v
                INNER JOIN ovst ov ON ov.vn = v.vn
                LEFT JOIN patient p ON p.hn = v.hn
                LEFT JOIN pttype py ON py.pttype = v.pttype
                LEFT JOIN kskdepartment d ON d.depcode = ov.main_dep
                WHERE v.vstdate BETWEEN ? AND ?
                  AND ov.an IS NULL
                  AND (ov.main_dep != '021' AND (ov.cur_dep != '021' OR ov.cur_dep IS NULL))
                  AND v.pttype NOT IN ('02', '03', 'AB')
                  AND (v.pdx IS NULL OR (v.pdx NOT LIKE 'Z49%' AND v.pdx NOT LIKE 'N185%'))
                  AND {$pttypeClause}
                ORDER BY v.vstdate DESC, v.uc_money DESC
                LIMIT {$limit}
            ";

            try {
                $opdRows = DB::connection('hosxp')->select($sqlOpd, [$startDate, $endDate]);
                foreach ($opdRows as $r) {
                    $items[] = [
                        'vn_an' => (string) $r->vn,
                        'hn' => PiiMask::hn($r->hn),
                        'patient_name' => PiiMask::name($r->pname, $r->fname, $r->lname),
                        'cid' => PiiMask::cid($r->cid),
                        'service_date' => (string) $r->service_date,
                        'pttype_name' => (string) $r->pttype_name,
                        'pdx' => (string) $r->pdx,
                        'department_name' => (string) ($r->department_name ?? '-'),
                        'income' => (float) $r->income,
                        'cash_paid' => (float) $r->cash_paid,
                        'claim_amount' => (float) $r->claim_amount,
                        'service_type' => 'OPD',
                    ];
                }
            } catch (\Throwable $e) {
                Log::warning('RcmUcService::fetchHosxpDrillDown OPD: '.$e->getMessage());
            }
        }

        // IPD (หากยังมีที่ว่างใน limit)
        $remainLimit = max(0, $limit - count($items));
        if (($claimType === 'all' || $claimType === 'ipd') && $remainLimit > 0) {
            $pttypeClauseIpd = $this->buildPttypeClause($subScheme, 'a');
            $sqlIpd = "
                SELECT 
                    a.an,
                    a.hn,
                    p.pname,
                    p.fname,
                    p.lname,
                    p.cid,
                    a.dchdate as service_date,
                    py.name as pttype_name,
                    a.pdx,
                    a.income,
                    a.paid_money as cash_paid,
                    a.uc_money as claim_amount,
                    w.name as ward_name,
                    'IPD' as service_type
                FROM an_stat a
                LEFT JOIN patient p ON p.hn = a.hn
                LEFT JOIN pttype py ON py.pttype = a.pttype
                LEFT JOIN ward w ON w.ward = a.ward
                WHERE a.dchdate BETWEEN ? AND ?
                  AND a.pttype NOT IN ('02', '03', 'AB')
                  AND (a.pdx IS NULL OR (a.pdx NOT LIKE 'Z49%' AND a.pdx NOT LIKE 'N185%'))
                  AND (a.spclty != '21' OR a.spclty IS NULL)
                  AND {$pttypeClauseIpd}
                ORDER BY a.dchdate DESC, a.uc_money DESC
                LIMIT {$remainLimit}
            ";

            try {
                $ipdRows = DB::connection('hosxp')->select($sqlIpd, [$startDate, $endDate]);
                foreach ($ipdRows as $r) {
                    $items[] = [
                        'vn_an' => (string) $r->an,
                        'hn' => PiiMask::hn($r->hn),
                        'patient_name' => PiiMask::name($r->pname, $r->fname, $r->lname),
                        'cid' => PiiMask::cid($r->cid),
                        'service_date' => (string) $r->service_date,
                        'pttype_name' => (string) $r->pttype_name,
                        'pdx' => (string) $r->pdx,
                        'department_name' => (string) ($r->ward_name ?? '-'),
                        'income' => (float) $r->income,
                        'cash_paid' => (float) $r->cash_paid,
                        'claim_amount' => (float) $r->claim_amount,
                        'service_type' => 'IPD',
                    ];
                }
            } catch (\Throwable $e) {
                Log::warning('RcmUcService::fetchHosxpDrillDown IPD: '.$e->getMessage());
            }
        }

        // นำเคส HOSxP (ตัวตั้ง) มาจับคู่กับ REP และ STM ด้วย SEQ / AN (1-to-1 Matching)
        $allKeys = collect($items)->pluck('vn_an')->filter()->values()->all();
        $repMap = [];
        $stmMap = [];

        if (! empty($allKeys)) {
            // 1. ดึงข้อมูล REP
            $repRows = DB::table('finance_cgd_stm_rows as r')
                ->join('finance_cgd_stm_batches as b', 'b.id', '=', 'r.batch_id')
                ->where('b.file_kind', 'rep')
                ->where(function ($q) {
                    $q->where('b.scheme', 'ucs')
                        ->orWhere('b.scheme', 'uc')
                        ->orWhere('b.filename', 'LIKE', 'eclaim\\_14689\\_OP\\_%')
                        ->orWhere('b.filename', 'LIKE', 'eclaim\\_14689\\_IP\\_%')
                        ->orWhere('b.filename', 'LIKE', '%OPUC%')
                        ->orWhere('b.filename', 'LIKE', '%IPUC%');
                })
                ->where('b.filename', 'NOT LIKE', 'eclaim\\_14689\\_OPCS%')
                ->where('b.filename', 'NOT LIKE', 'eclaim\\_14689\\_OPLGO%')
                ->where(function ($q) use ($allKeys) {
                    $q->whereIn('r.seq_no', $allKeys)
                        ->orWhereIn('r.an', $allKeys);
                })
                ->select('r.seq_no', 'r.an', 'r.rep_no', 'r.amount_claim', 'r.amount_approved', 'r.error_code', 'r.remark', 'b.filename')
                ->get();

            foreach ($repRows as $rr) {
                $k = $rr->seq_no ?: $rr->an;
                if ($k && ! isset($repMap[$k])) {
                    $repMap[$k] = $rr;
                }
            }

            // 2. ดึงข้อมูล STM (e-Claim statement)
            $stmRows = DB::table('finance_stm_detail_rows as d')
                ->join('finance_stm_imports as i', 'i.id', '=', 'd.import_id')
                ->where(function ($q) {
                    $q->where('i.claim_submission_no', 'LIKE', '%UCS%')
                        ->orWhere('i.filename', 'LIKE', '%UCS%');
                })
                ->where(function ($q) use ($allKeys) {
                    $q->whereIn('d.seq_no', $allKeys)
                        ->orWhereIn('d.an', $allKeys);
                })
                ->select('d.seq_no', 'd.an', 'd.rep_no', 'd.amount_claim', 'd.amount_approved', 'i.claim_submission_no', 'i.filename')
                ->get();

            foreach ($stmRows as $sr) {
                $k = $sr->seq_no ?: $sr->an;
                if ($k && ! isset($stmMap[$k])) {
                    $stmMap[$k] = $sr;
                }
            }
        }

        // ผูกผลการจับคู่เข้ากับแต่ละเคสของ HOSxP
        foreach ($items as &$item) {
            $k = $item['vn_an'];
            $rep = $repMap[$k] ?? null;
            $stm = $stmMap[$k] ?? null;

            $item['matched_rep'] = $rep !== null;
            $item['matched_stm'] = $stm !== null;

            $item['rep_no'] = $rep->rep_no ?? null;
            $item['rep_claim'] = (float) ($rep->amount_claim ?? 0);
            $item['rep_approved'] = (float) ($rep->amount_approved ?? 0);
            $item['c_deny_code'] = $rep->error_code ?? null;
            $item['c_deny_descr'] = $rep->remark ?? null;
            $item['rep_filename'] = $rep->filename ?? null;

            $item['stm_doc_no'] = $stm->claim_submission_no ?? ($stm->filename ?? null);
            $item['stm_approved'] = (float) ($stm->amount_approved ?? 0);
            $item['stm_diff'] = round($item['claim_amount'] - (float) ($stm->amount_approved ?? 0), 2);
            $item['stm_filename'] = $stm->filename ?? null;

            if ($stm) {
                $item['match_status'] = 'settled';
                $item['match_status_label'] = 'ชดเชยแล้ว';
            } elseif ($rep) {
                if (! empty($rep->error_code)) {
                    $item['match_status'] = 'c_deny';
                    $item['match_status_label'] = 'ติด C-Deny';
                } else {
                    $item['match_status'] = 'waiting_stm';
                    $item['match_status_label'] = 'รอ Statement';
                }
            } else {
                $item['match_status'] = 'unclaimed';
                $item['match_status_label'] = 'ยังไม่ส่งเบิก';
            }
        }
        unset($item);

        return [
            'tab' => 'hosxp_visits',
            'count' => count($items),
            'items' => $items,
        ];
    }

    /**
     * Drill-Down: รายการส่งเบิก e-Claim REP
     */
    protected function fetchRepDrillDown(string $startDate, string $endDate, int $limit = 250): array
    {
        $rows = CgdStmRow::query()
            ->from('finance_cgd_stm_rows as r')
            ->join('finance_cgd_stm_batches as b', 'b.id', '=', 'r.batch_id')
            ->where('b.file_kind', 'rep')
            ->whereBetween('r.visit_date', [$startDate, $endDate])
            ->where(function ($q) {
                $q->where('b.scheme', 'ucs')
                    ->orWhere('b.scheme', 'uc')
                    ->orWhere('b.filename', 'LIKE', 'eclaim\\_14689\\_OP\\_%')
                    ->orWhere('b.filename', 'LIKE', 'eclaim\\_14689\\_IP\\_%')
                    ->orWhere('b.filename', 'LIKE', '%OPUC%')
                    ->orWhere('b.filename', 'LIKE', '%IPUC%');
            })
            ->where('b.filename', 'NOT LIKE', 'eclaim\\_14689\\_OPCS%')
            ->where('b.filename', 'NOT LIKE', 'eclaim\\_14689\\_OPLGO%')
            ->where(function ($q) {
                $q->whereNull('b.filename')->orWhere('b.filename', 'NOT LIKE', '%HD%');
            })
            ->where(function ($q) {
                $q->whereNull('r.rep_no')->orWhere('r.rep_no', 'NOT LIKE', '%HD%');
            })
            ->where(function ($q) {
                $q->whereNull('r.projcode')->orWhere('r.projcode', 'NOT LIKE', '%HD%');
            })
            ->select('r.*', 'b.filename')
            ->orderBy('r.visit_date', 'desc')
            ->limit($limit)
            ->get();

        $items = [];
        foreach ($rows as $r) {
            $items[] = [
                'id' => $r->id,
                'rep_no' => $r->rep_no,
                'hn' => PiiMask::hn((string) $r->hn),
                'patient_name' => PiiMask::name((string) $r->patient_name),
                'visit_date' => $r->visit_date ? $r->visit_date->format('Y-m-d') : null,
                'seq_no' => $r->seq_no,
                'an' => $r->an,
                'amount_claim' => (float) $r->amount_claim,
                'amount_approved' => (float) $r->amount_approved,
                'amount_diff' => (float) ($r->amount_claim - $r->amount_approved),
                'c_deny_code' => $r->error_code,
                'c_deny_descr' => $r->remark,
                'filename' => $r->filename,
            ];
        }

        return [
            'tab' => 'rep_cases',
            'count' => count($items),
            'items' => $items,
        ];
    }

    /**
     * Drill-Down: รายการอนุมัติจ่ายจริงจาก e-Claim Statement (STM)
     */
    protected function fetchStmDrillDown(
        string $startDate,
        string $endDate,
        string $claimType,
        int $limit = 250
    ): array {
        $query = DB::table('finance_stm_detail_rows as d')
            ->join('finance_stm_imports as i', 'i.id', '=', 'd.import_id')
            ->where(function ($q) {
                $q->where('i.claim_submission_no', 'LIKE', '%UCS%')
                    ->orWhere('i.filename', 'LIKE', '%UCS%');
            });

        // ดึง keys ของ HOSxP เพื่อเอามาจับด้วย SEQ ที่ตรงกัน (HOSxP เป็นตัวตั้ง)
        $hosxpKeys = $this->fetchHosxpMatchKeysByMonth($startDate, $endDate, 'all', $claimType);
        $ym = substr($startDate, 0, 7);
        $monthKeys = $hosxpKeys[$ym] ?? [];

        if (! empty($monthKeys)) {
            $query->where(function ($q) use ($monthKeys) {
                $q->whereIn('d.seq_no', $monthKeys)
                    ->orWhereIn('d.an', $monthKeys);
            });
        } else {
            $query->whereBetween('d.visit_date', [$startDate, $endDate]);
        }

        if ($claimType === 'opd') {
            $query->where('i.channel', 'OP');
        } elseif ($claimType === 'ipd') {
            $query->where('i.channel', 'IP');
        }

        $rows = $query->select('d.*', 'i.filename', 'i.claim_submission_no as doc_no')
            ->orderBy('d.visit_date', 'desc')
            ->limit($limit)
            ->get();

        $items = [];
        foreach ($rows as $r) {
            $items[] = [
                'id' => $r->id,
                'claim_submission_no' => $r->doc_no,
                'rep_no' => $r->rep_no,
                'hn' => PiiMask::hn((string) $r->hn),
                'patient_name' => PiiMask::name((string) $r->patient_name),
                'visit_date' => $r->visit_date ? substr($r->visit_date, 0, 10) : null,
                'seq_no' => $r->seq_no,
                'an' => $r->an,
                'amount_claim' => (float) $r->amount_claim,
                'amount_approved' => (float) $r->amount_approved,
                'amount_diff' => round((float) $r->amount_claim - (float) $r->amount_approved, 2),
                'filename' => $r->filename,
            ];
        }

        return [
            'tab' => 'stm_items',
            'count' => count($items),
            'items' => $items,
        ];
    }

    /**
     * Drill-Down: รายการ C-Deny ของบัตรทอง
     */
    protected function fetchCDenyDrillDown(string $startDate, string $endDate, int $limit = 100): array
    {
        $rows = CgdStmRow::query()
            ->from('finance_cgd_stm_rows as r')
            ->join('finance_cgd_stm_batches as b', 'b.id', '=', 'r.batch_id')
            ->whereBetween('r.visit_date', [$startDate, $endDate])
            ->whereNotNull('r.error_code')
            ->where('r.error_code', '!=', '')
            ->where(function ($q) {
                $q->where('b.scheme', 'ucs')
                    ->orWhere('b.scheme', 'uc')
                    ->orWhere('b.filename', 'LIKE', '%OPUC%')
                    ->orWhere('b.filename', 'LIKE', '%IPUC%')
                    ->orWhere('b.filename', 'LIKE', '%UC%');
            })
            ->where(function ($q) {
                $q->whereNull('b.filename')->orWhere('b.filename', 'NOT LIKE', '%HD%');
            })
            ->where(function ($q) {
                $q->whereNull('r.rep_no')->orWhere('r.rep_no', 'NOT LIKE', '%HD%');
            })
            ->where(function ($q) {
                $q->whereNull('r.projcode')->orWhere('r.projcode', 'NOT LIKE', '%HD%');
            })
            ->select('r.*', 'b.filename')
            ->orderBy('r.visit_date', 'desc')
            ->limit($limit)
            ->get();

        $items = [];
        foreach ($rows as $r) {
            $items[] = [
                'id' => $r->id,
                'rep_no' => $r->rep_no,
                'hn' => PiiMask::hn((string) $r->hn),
                'patient_name' => PiiMask::name((string) $r->patient_name),
                'visit_date' => $r->visit_date ? $r->visit_date->format('Y-m-d') : null,
                'seq_no' => $r->seq_no,
                'an' => $r->an,
                'c_deny_code' => $r->error_code,
                'c_deny_descr' => $r->remark,
                'amount_claim' => (float) $r->amount_claim,
                'amount_approved' => (float) $r->amount_approved,
                'shortfall' => (float) ($r->amount_claim - $r->amount_approved),
                'filename' => $r->filename,
            ];
        }

        return [
            'tab' => 'c_deny',
            'count' => count($items),
            'items' => $items,
        ];
    }

    /**
     * สร้างเงื่อนไข SQL สำหรับกรอง pttype ของบัตรทอง
     */
    protected function buildPttypeClause(string $subScheme, string $alias = 'v'): string
    {
        return match ($subScheme) {
            'emergency' => "{$alias}.pttype = '04'",
            'soldier_civic' => "{$alias}.pttype = '19'",
            default => "({$alias}.pttype IN ('04', '19', '34') OR {$alias}.pttype IN (SELECT pttype FROM pttype WHERE (pcode = 'UC' OR hipdata_code = 'UCS') AND pttype NOT IN ('02', '03', 'AB')))",
        };
    }

    /**
     * คำนวณช่วงวันที่ตาม periodMode
     */
    protected function resolveDateRange(int|string $periodMode): array
    {
        if ($periodMode === 'since_jan_68') {
            return [
                'start_date' => '2025-01-01',
                'end_date' => now()->toDateString(),
                'is_continuous' => true,
            ];
        }

        $budgetYear = (int) $periodMode ?: 2570;
        $ceYear = $budgetYear - 543;
        $startYear = $ceYear - 1;

        return [
            'start_date' => "{$startYear}-10-01",
            'end_date' => "{$ceYear}-09-30",
            'is_continuous' => false,
        ];
    }

    /**
     * สร้างรายการเดือนสำหรับตารางเปรียบเทียบ
     */
    protected function generateMonthsList(string $startDate, string $endDate, bool $isContinuous): array
    {
        $start = Carbon::parse($startDate)->startOfMonth();
        $end = Carbon::parse($endDate)->startOfMonth();

        $thaiMonths = [
            1 => 'มกราคม', 2 => 'กุมภาพันธ์', 3 => 'มีนาคม', 4 => 'เมษายน',
            5 => 'พฤษภาคม', 6 => 'มิถุนายน', 7 => 'กรกฎาคม', 8 => 'สิงหาคม',
            9 => 'กันยายน', 10 => 'ตุลาคม', 11 => 'พฤศจิกายน', 12 => 'ธันวาคม',
        ];

        $thaiMonthsShort = [
            1 => 'ม.ค.', 2 => 'ก.พ.', 3 => 'มี.ค.', 4 => 'เม.ย.',
            5 => 'พ.ค.', 6 => 'มิ.ย.', 7 => 'ก.ค.', 8 => 'ส.ค.',
            9 => 'ก.ย.', 10 => 'ต.ค.', 11 => 'พ.ย.', 12 => 'ธ.ค.',
        ];

        $months = [];
        $curr = $start->copy();

        while ($curr->lte($end)) {
            $m = $curr->month;
            $y = $curr->year;
            $beYear = $y + 543;
            $shortYear = substr((string) $beYear, -2);
            $monthKey = $curr->format('Y-m');

            $months[] = [
                'month_key' => $monthKey,
                'month_no' => $m,
                'year_ce' => $y,
                'year_th' => $beYear,
                'month_label_th' => $thaiMonths[$m],
                'month_short_th' => $thaiMonthsShort[$m],
                'short_label_th' => "{$thaiMonthsShort[$m]} {$shortYear}",
                'full_label_th' => "{$thaiMonths[$m]} {$beYear}",
            ];

            $curr->addMonth();
        }

        return $months;
    }
}
