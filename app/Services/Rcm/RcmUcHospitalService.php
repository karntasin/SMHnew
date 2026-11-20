<?php

namespace App\Services\Rcm;

use App\Models\Finance\CgdStmRow;
use App\Support\PiiMask;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RcmUcHospitalService
{
    public function __construct(
        protected readonly RcmHosxpService $hosxpService,
    ) {}

    /**
     * คำนวณสรุปเปรียบเทียบข้อมูล 3 ฝ่าย สิทธิบัตรทอง รพ.ค่าย (03): HOSxP vs e-Claim REP vs e-Claim STM (เงินโอนจริง)
     *
     * @param int|string $periodMode ปีงบประมาณ เช่น 2570, 2569, 2568 หรือ 'since_jan_68'
     * @param string $claimType ประเภทบริการ: 'all', 'opd', 'ipd'
     */
    public function getMonthlyComparison(
        int|string $periodMode = 2570,
        string $claimType = 'all'
    ): array {
        $dates = $this->resolveDateRange($periodMode);
        $startDate = $dates['start_date'];
        $endDate = $dates['end_date'];
        $isContinuous = $dates['is_continuous'];

        // 1. ดึงข้อมูลจาก HOSxP (MySQL hosxp - Read Only) เฉพาะสิทธิบัตรทอง รพ.ค่าย (03)
        $hosxpMap = $this->fetchHosxpUcHospitalMonthly($startDate, $endDate, $claimType);

        // 2. ดึงรายการ VN/AN ของผู้ป่วยแยกตามเดือนเพื่อนำไปเทียบ SEQ / AN
        $hosxpMatchKeysByMonth = $this->fetchHosxpMatchKeysByMonth($startDate, $endDate, $claimType);

        // 3. ดึงข้อมูลส่งเบิก e-Claim REP (MySQL mysql)
        $repMap = $this->fetchRepUcHospitalMonthly($startDate, $endDate, $claimType, $hosxpMatchKeysByMonth);

        // 4. ดึงข้อมูลอนุมัติจ่ายจริงจาก e-Claim Statement (STM)
        $stmMap = $this->fetchStmUcHospitalMonthly($startDate, $endDate, $claimType, $hosxpMatchKeysByMonth);

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

            $diffHosxpRep = (float) $h['uc_money'] - (float) $r['claim'];
            $diffRepStm = (float) $r['claim'] - (float) $s['approved'];
            $diffHosxpStm = (float) $h['uc_money'] - (float) $s['approved'];
            $unclaimedCases = max(0, (int) $h['cases'] - (int) $r['cases']);

            $recoveryRate = $h['uc_money'] > 0
                ? round(($s['approved'] / $h['uc_money']) * 100, 2)
                : ($s['approved'] > 0 ? 100.0 : 0.0);

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
                $statusLabel = "บริการ รพ.ค่าย ({$h['cases']} เคส)";
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

                // e-Claim STM
                'stm_cases' => (int) $s['cases'],
                'stm_claim' => (float) $s['claim'],
                'stm_approved' => (float) $s['approved'],
                'stm_batches' => (int) $s['batches'],

                'smt_batches' => (int) $s['batches'],
                'smt_total_transferred' => (float) $s['approved'],

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
            'claim_type' => $claimType,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'hosxp_ready' => $this->hosxpService->available(),
            'rows' => $rows,
            'totals' => $totals,
        ];
    }

    /**
     * ดึงข้อมูลเจาะลึกรายเคส (Drill-Down) ประจำเดือนสำหรับสิทธิบัตรทอง รพ.ค่าย (03)
     */
    public function getMonthlyDrillDown(
        string $monthKey,
        string $claimType = 'all',
        string $tab = 'hosxp_visits',
        int $limit = 300
    ): array {
        $startDate = "{$monthKey}-01";
        $endDate = Carbon::parse($startDate)->endOfMonth()->toDateString();

        switch ($tab) {
            case 'hosxp_visits':
                return $this->fetchHosxpDrillDown($startDate, $endDate, $claimType, $limit);
            case 'rep_cases':
                return $this->fetchRepDrillDown($startDate, $endDate, $claimType, $limit);
            case 'stm_items':
            case 'smt_transfers':
                return $this->fetchStmDrillDown($startDate, $endDate, $claimType, $limit);
            case 'c_deny':
                return $this->fetchCDenyDrillDown($startDate, $endDate, $claimType, $limit);
            default:
                return ['tab' => $tab, 'count' => 0, 'items' => []];
        }
    }

    /**
     * ดึงข้อมูล HOSxP รายเดือน เฉพาะสิทธิ 03 (บัตรทอง รพ.ค่ายฯ)
     */
    protected function fetchHosxpUcHospitalMonthly(
        string $startDate,
        string $endDate,
        string $claimType
    ): array {
        if (! $this->hosxpService->available()) {
            return [];
        }

        $result = [];

        // 1. ผู้ป่วยนอก (OPD)
        if ($claimType === 'all' || $claimType === 'opd') {
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
                  AND v.pttype = '03'
                  AND (v.pdx IS NULL OR (v.pdx NOT LIKE 'Z49%' AND v.pdx NOT LIKE 'N185%'))
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
                Log::warning('RcmUcHospitalService::fetchHosxp OPD error: '.$e->getMessage());
            }
        }

        // 2. ผู้ป่วยใน (IPD)
        if ($claimType === 'all' || $claimType === 'ipd') {
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
                  AND a.pttype = '03'
                  AND (a.pdx IS NULL OR (a.pdx NOT LIKE 'Z49%' AND a.pdx NOT LIKE 'N185%'))
                  AND (a.spclty != '21' OR a.spclty IS NULL)
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
                Log::warning('RcmUcHospitalService::fetchHosxp IPD error: '.$e->getMessage());
            }
        }

        return $result;
    }

    /**
     * ดึงรายการ Match Keys (VN หรือ AN) จาก HOSxP ของสิทธิ 03 แยกตามเดือน
     */
    protected function fetchHosxpMatchKeysByMonth(
        string $startDate,
        string $endDate,
        string $claimType
    ): array {
        if (! $this->hosxpService->available()) {
            return [];
        }

        $byMonth = [];

        // OPD (VNs)
        if ($claimType === 'all' || $claimType === 'opd') {
            $sql = "
                SELECT v.vn, DATE_FORMAT(v.vstdate, '%Y-%m') as ym
                FROM vn_stat v
                INNER JOIN ovst ov ON ov.vn = v.vn
                WHERE v.vstdate BETWEEN ? AND ?
                  AND ov.an IS NULL
                  AND (ov.main_dep != '021' AND (ov.cur_dep != '021' OR ov.cur_dep IS NULL))
                  AND v.pttype = '03'
                  AND (v.pdx IS NULL OR (v.pdx NOT LIKE 'Z49%' AND v.pdx NOT LIKE 'N185%'))
            ";
            try {
                $rows = DB::connection('hosxp')->select($sql, [$startDate, $endDate]);
                foreach ($rows as $r) {
                    $byMonth[$r->ym][] = (string) $r->vn;
                }
            } catch (\Throwable $e) {
                Log::warning('RcmUcHospitalService fetchMatchKeys OPD: '.$e->getMessage());
            }
        }

        // IPD (ANs)
        if ($claimType === 'all' || $claimType === 'ipd') {
            $sqlIpd = "
                SELECT a.an, DATE_FORMAT(a.dchdate, '%Y-%m') as ym
                FROM an_stat a
                WHERE a.dchdate BETWEEN ? AND ?
                  AND a.pttype = '03'
                  AND (a.pdx IS NULL OR (a.pdx NOT LIKE 'Z49%' AND a.pdx NOT LIKE 'N185%'))
                  AND (a.spclty != '21' OR a.spclty IS NULL)
            ";
            try {
                $rowsIpd = DB::connection('hosxp')->select($sqlIpd, [$startDate, $endDate]);
                foreach ($rowsIpd as $r) {
                    $byMonth[$r->ym][] = (string) $r->an;
                }
            } catch (\Throwable $e) {
                Log::warning('RcmUcHospitalService fetchMatchKeys IPD: '.$e->getMessage());
            }
        }

        return $byMonth;
    }

    /**
     * ดึงข้อมูล e-Claim REP ที่ตรงกับสิทธิ 03
     */
    protected function fetchRepUcHospitalMonthly(
        string $startDate,
        string $endDate,
        string $claimType,
        array $hosxpMatchKeysByMonth
    ): array {
        $result = [];

        if (! empty($hosxpMatchKeysByMonth)) {
            foreach ($hosxpMatchKeysByMonth as $ym => $keys) {
                if (empty($keys)) {
                    continue;
                }

                $query = CgdStmRow::query()
                    ->from('finance_cgd_stm_rows as r')
                    ->join('finance_cgd_stm_batches as b', 'b.id', '=', 'r.batch_id')
                    ->where(function ($q) use ($keys) {
                        $q->whereIn('r.seq_no', $keys)
                            ->orWhereIn('r.an', $keys);
                    });

                if ($claimType === 'opd') {
                    $query->where(function ($q) {
                        $q->whereNull('r.an')->orWhere('r.an', '');
                    });
                } elseif ($claimType === 'ipd') {
                    $query->whereNotNull('r.an')->where('r.an', '!=', '');
                }

                $row = $query->selectRaw("
                    COUNT(DISTINCT COALESCE(NULLIF(r.seq_no, ''), r.an, r.id)) as cases,
                    SUM(r.amount_claim) as claim,
                    SUM(r.amount_approved) as approved,
                    SUM(CASE WHEN r.error_code IS NOT NULL AND r.error_code != '' THEN 1 ELSE 0 END) as c_deny_cases,
                    SUM(CASE WHEN r.error_code IS NOT NULL AND r.error_code != '' THEN (r.amount_claim - r.amount_approved) ELSE 0 END) as c_deny_amount
                ")->first();

                $result[$ym] = [
                    'cases' => (int) ($row->cases ?? 0),
                    'claim' => (float) ($row->claim ?? 0),
                    'approved' => (float) ($row->approved ?? 0),
                    'drug' => 0.0,
                    'c_deny_cases' => (int) ($row->c_deny_cases ?? 0),
                    'c_deny_amount' => (float) ($row->c_deny_amount ?? 0),
                ];
            }
        }

        return $result;
    }

    /**
     * ดึงข้อมูล STM ที่ตรงกับสิทธิ 03
     */
    protected function fetchStmUcHospitalMonthly(
        string $startDate,
        string $endDate,
        string $claimType,
        array $hosxpMatchKeysByMonth
    ): array {
        $result = [];

        if (! empty($hosxpMatchKeysByMonth)) {
            foreach ($hosxpMatchKeysByMonth as $ym => $keys) {
                if (empty($keys)) {
                    continue;
                }

                $query = DB::table('finance_stm_detail_rows as d')
                    ->join('finance_stm_imports as i', 'i.id', '=', 'd.import_id')
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
        }

        return $result;
    }

    /**
     * Drill-Down: รายการผู้รับบริการสิทธิ 03 (ตัวตั้ง) พร้อมจับคู่ผลส่งเบิก REP และชดเชย STM ด้วย SEQ / AN
     */
    protected function fetchHosxpDrillDown(
        string $startDate,
        string $endDate,
        string $claimType,
        int $limit = 300
    ): array {
        if (! $this->hosxpService->available()) {
            return ['tab' => 'hosxp_visits', 'count' => 0, 'items' => []];
        }

        $items = [];

        // OPD
        if ($claimType === 'all' || $claimType === 'opd') {
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
                  AND v.pttype = '03'
                  AND (v.pdx IS NULL OR (v.pdx NOT LIKE 'Z49%' AND v.pdx NOT LIKE 'N185%'))
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
                Log::warning('RcmUcHospitalService::fetchHosxpDrillDown OPD: '.$e->getMessage());
            }
        }

        // IPD
        $remainLimit = max(0, $limit - count($items));
        if (($claimType === 'all' || $claimType === 'ipd') && $remainLimit > 0) {
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
                  AND a.pttype = '03'
                  AND (a.pdx IS NULL OR (a.pdx NOT LIKE 'Z49%' AND a.pdx NOT LIKE 'N185%'))
                  AND (a.spclty != '21' OR a.spclty IS NULL)
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
                        'department_name' => (string) ($r->ward_name ?? 'หอผู้ป่วยใน'),
                        'income' => (float) $r->income,
                        'cash_paid' => (float) $r->cash_paid,
                        'claim_amount' => (float) $r->claim_amount,
                        'service_type' => 'IPD',
                    ];
                }
            } catch (\Throwable $e) {
                Log::warning('RcmUcHospitalService::fetchHosxpDrillDown IPD: '.$e->getMessage());
            }
        }

        if (empty($items)) {
            return ['tab' => 'hosxp_visits', 'count' => 0, 'items' => []];
        }

        // จับคู่กับ REP และ STM
        $allKeys = array_column($items, 'vn_an');

        $repRows = DB::table('finance_cgd_stm_rows as r')
            ->join('finance_cgd_stm_batches as b', 'b.id', '=', 'r.batch_id')
            ->where(function ($q) use ($allKeys) {
                $q->whereIn('r.seq_no', $allKeys)
                    ->orWhereIn('r.an', $allKeys);
            })
            ->select('r.seq_no', 'r.an', 'r.rep_no', 'r.amount_claim', 'r.amount_approved', 'r.error_code', 'r.remark', 'b.filename')
            ->get();

        $repMap = [];
        foreach ($repRows as $rr) {
            $key = $rr->seq_no ?: $rr->an;
            if ($key && ! isset($repMap[$key])) {
                $repMap[$key] = $rr;
            }
        }

        $stmRows = DB::table('finance_stm_detail_rows as d')
            ->join('finance_stm_imports as i', 'i.id', '=', 'd.import_id')
            ->where(function ($q) use ($allKeys) {
                $q->whereIn('d.seq_no', $allKeys)
                    ->orWhereIn('d.an', $allKeys);
            })
            ->select('d.seq_no', 'd.an', 'd.rep_no', 'd.amount_claim', 'd.amount_approved', 'i.claim_submission_no as doc_no', 'i.filename')
            ->get();

        $stmMap = [];
        foreach ($stmRows as $sr) {
            $key = $sr->seq_no ?: $sr->an;
            if ($key && ! isset($stmMap[$key])) {
                $stmMap[$key] = $sr;
            }
        }

        foreach ($items as &$it) {
            $k = $it['vn_an'];
            $matchedRep = $repMap[$k] ?? null;
            $matchedStm = $stmMap[$k] ?? null;

            $it['matched_rep'] = (bool) $matchedRep;
            $it['rep_no'] = $matchedRep ? $matchedRep->rep_no : null;
            $it['rep_claim'] = $matchedRep ? (float) $matchedRep->amount_claim : 0.0;
            $it['rep_approved'] = $matchedRep ? (float) $matchedRep->amount_approved : 0.0;
            $it['c_deny_code'] = $matchedRep ? $matchedRep->error_code : null;

            $it['matched_stm'] = (bool) $matchedStm;
            $it['stm_doc_no'] = $matchedStm ? $matchedStm->doc_no : null;
            $it['stm_approved'] = $matchedStm ? (float) $matchedStm->amount_approved : 0.0;
            $it['stm_diff'] = $matchedStm ? round((float) $matchedStm->amount_claim - (float) $matchedStm->amount_approved, 2) : 0.0;

            if ($it['matched_stm'] && $it['stm_approved'] > 0) {
                $it['match_status'] = 'settled';
                $it['match_status_label'] = 'ชดเชยแล้ว';
            } elseif ($it['c_deny_code']) {
                $it['match_status'] = 'c_deny';
                $it['match_status_label'] = "ติด C-Deny ({$it['c_deny_code']})";
            } elseif ($it['matched_rep']) {
                $it['match_status'] = 'waiting_stm';
                $it['match_status_label'] = 'ส่งตรวจแล้ว (รอ Statement)';
            } else {
                $it['match_status'] = 'unclaimed';
                $it['match_status_label'] = 'บริการ รพ.ค่าย';
            }
        }
        unset($it);

        return [
            'tab' => 'hosxp_visits',
            'count' => count($items),
            'items' => $items,
        ];
    }

    /**
     * Drill-Down: รายการส่งเบิก e-Claim REP สิทธิ 03
     */
    protected function fetchRepDrillDown(string $startDate, string $endDate, string $claimType, int $limit = 300): array
    {
        $keys = $this->fetchHosxpMatchKeysByMonth($startDate, $endDate, $claimType);
        $flatKeys = [];
        foreach ($keys as $kList) {
            $flatKeys = array_merge($flatKeys, $kList);
        }

        if (empty($flatKeys)) {
            return ['tab' => 'rep_cases', 'count' => 0, 'items' => []];
        }

        $query = CgdStmRow::query()
            ->from('finance_cgd_stm_rows as r')
            ->join('finance_cgd_stm_batches as b', 'b.id', '=', 'r.batch_id')
            ->where(function ($q) use ($flatKeys) {
                $q->whereIn('r.seq_no', $flatKeys)
                    ->orWhereIn('r.an', $flatKeys);
            })
            ->select('r.*', 'b.filename')
            ->orderBy('r.visit_date', 'desc')
            ->limit($limit);

        $rows = $query->get();
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
                'shortfall' => (float) ($r->amount_claim - $r->amount_approved),
                'c_deny_code' => $r->error_code,
                'filename' => $r->filename,
            ];
        }

        return ['tab' => 'rep_cases', 'count' => count($items), 'items' => $items];
    }

    /**
     * Drill-Down: รายการ Statement สิทธิ 03
     */
    protected function fetchStmDrillDown(string $startDate, string $endDate, string $claimType, int $limit = 300): array
    {
        $keys = $this->fetchHosxpMatchKeysByMonth($startDate, $endDate, $claimType);
        $flatKeys = [];
        foreach ($keys as $kList) {
            $flatKeys = array_merge($flatKeys, $kList);
        }

        if (empty($flatKeys)) {
            return ['tab' => 'stm_items', 'count' => 0, 'items' => []];
        }

        $query = DB::table('finance_stm_detail_rows as d')
            ->join('finance_stm_imports as i', 'i.id', '=', 'd.import_id')
            ->where(function ($q) use ($flatKeys) {
                $q->whereIn('d.seq_no', $flatKeys)
                    ->orWhereIn('d.an', $flatKeys);
            })
            ->select('d.*', 'i.filename', 'i.claim_submission_no as doc_no')
            ->orderBy('d.visit_date', 'desc')
            ->limit($limit);

        $rows = $query->get();
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

        return ['tab' => 'stm_items', 'count' => count($items), 'items' => $items];
    }

    /**
     * Drill-Down: C-Deny สิทธิ 03
     */
    protected function fetchCDenyDrillDown(string $startDate, string $endDate, string $claimType, int $limit = 300): array
    {
        $keys = $this->fetchHosxpMatchKeysByMonth($startDate, $endDate, $claimType);
        $flatKeys = [];
        foreach ($keys as $kList) {
            $flatKeys = array_merge($flatKeys, $kList);
        }

        if (empty($flatKeys)) {
            return ['tab' => 'c_deny', 'count' => 0, 'items' => []];
        }

        $query = CgdStmRow::query()
            ->from('finance_cgd_stm_rows as r')
            ->join('finance_cgd_stm_batches as b', 'b.id', '=', 'r.batch_id')
            ->where(function ($q) use ($flatKeys) {
                $q->whereIn('r.seq_no', $flatKeys)
                    ->orWhereIn('r.an', $flatKeys);
            })
            ->whereNotNull('r.error_code')
            ->where('r.error_code', '!=', '')
            ->select('r.*', 'b.filename')
            ->orderBy('r.visit_date', 'desc')
            ->limit($limit);

        $rows = $query->get();
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

        return ['tab' => 'c_deny', 'count' => count($items), 'items' => $items];
    }

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
