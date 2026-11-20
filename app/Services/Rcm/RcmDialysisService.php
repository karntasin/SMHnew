<?php

namespace App\Services\Rcm;

use App\Models\Finance\CgdStmRow;
use App\Models\Finance\NhsoSmtTransfer;
use App\Models\Finance\StmDetailRow;
use App\Support\PiiMask;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RcmDialysisService
{
    public function __construct(
        protected readonly RcmHosxpService $hosxpService,
    ) {}

    /**
     * คำนวณสรุปเปรียบเทียบข้อมูลไตเทียม 3 ฝ่าย รายเดือน: HOSxP (ไตเทียม 021) vs e-Claim/REP vs NHSO SMT (เงินโอนจริง)
     * รองรับปีงบประมาณ และสิทธิการรักษา: 'all', 'cgd' (จ่ายตรง/OFC), 'lgo' (อปท.), 'ucs' (บัตรทอง), 'sss' (ประกันสังคม)
     */
    public function getMonthlyComparison(
        int $budgetYear = 2570,
        string $scheme = 'all',
        string $serviceType = 'all' // 'all', 'hd_fee', 'epo_drug'
    ): array {
        $dates = $this->resolveFiscalYearRange($budgetYear);
        $startDate = $dates['start_date'];
        $endDate = $dates['end_date'];

        // 1. ดึงรายชื่อ HN ผู้ป่วยไตเทียมทั้งหมดในช่วงปีงบประมาณจาก HOSxP
        $hemoHns = [];
        if ($this->hosxpService->available()) {
            $hemoHns = $this->getHemodialysisHns($startDate, $endDate);
        }

        // 2. ดึงข้อมูลบริการไตเทียมจาก HOSxP (MySQL hosxp)
        $hosxpMap = $this->fetchHosxpDialysisMonthly($startDate, $endDate, $scheme, $serviceType);

        // 3. ดึงรายการ VN ผู้ป่วยไตเทียมแยกตามเดือนเพื่อนำไปเทียบ SEQ ใน REP และ STM
        $hosxpVnsByMonth = $this->fetchHosxpDialysisVnsByMonth($startDate, $endDate, $scheme);

        // 4. ดึงข้อมูลส่งเบิก e-Claim / REP จากระบบลูกหนี้
        $repMap = $this->fetchRepDialysisMonthly($startDate, $endDate, $scheme, $hemoHns, $hosxpVnsByMonth);

        // 5. ดึงข้อมูลการโอนเงินจริงจากระบบ SMT สปสช. (ตาราง finance_nhso_smt_transfers)
        $smtMap = $this->fetchSmtDialysisMonthly($startDate, $endDate, $scheme);

        // 6. สร้างลำดับ 12 เดือนของปีงบประมาณ (ต.ค. - ก.ย.)
        $months = $this->generateFiscalMonths($budgetYear);

        $rows = [];
        $totals = [
            'hosxp_cases' => 0,
            'hosxp_income' => 0.0,
            'hosxp_uc_money' => 0.0,
            'hosxp_cash' => 0.0,
            'hosxp_drug_epo' => 0.0,
            'hosxp_hd_fee' => 0.0,

            'rep_cases' => 0,
            'rep_claim' => 0.0,
            'rep_approved' => 0.0,
            'rep_drug' => 0.0,
            'rep_c_deny_cases' => 0,
            'rep_c_deny_amount' => 0.0,

            'smt_batches' => 0,
            'smt_total_transferred' => 0.0,
            'smt_ckd_amount' => 0.0,
            'smt_lgo_hd_amount' => 0.0,

            'diff_hosxp_rep' => 0.0,
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
                'drug_epo' => 0.0,
                'hd_fee' => 0.0,
            ];

            $r = $repMap[$ym] ?? [
                'cases' => 0,
                'claim' => 0.0,
                'approved' => 0.0,
                'drug' => 0.0,
                'c_deny_cases' => 0,
                'c_deny_amount' => 0.0,
            ];

            $s = $smtMap[$ym] ?? [
                'batches' => 0,
                'total_transferred' => 0.0,
                'ckd_amount' => 0.0,
                'lgo_hd_amount' => 0.0,
            ];

            // ผลต่าง 3 ฝ่าย
            // 1) ส่วนต่าง HOSxP vs REP (ยอดค้างส่งเบิกหรือเบิกไม่ครบ)
            $diffHosxpRep = (float) $h['uc_money'] - (float) $r['claim'];
            // 2) ส่วนต่าง REP vs SMT เงินโอนจริง (ยอดที่อนุมัติ vs เงินโอนจริง สปสช.)
            $diffRepSmt = (float) $r['approved'] - (float) $s['total_transferred'];
            // 3) ส่วนต่าง HOSxP vs SMT เงินโอนจริง (ยอดให้บริการ vs เงินที่ได้รับชดเชยจริง)
            $diffHosxpSmt = (float) $h['uc_money'] - (float) $s['total_transferred'];

            $unclaimedCases = max(0, (int) $h['cases'] - (int) $r['cases']);

            // อัตราการชดเชยจริงเทียบกับลูกหนี้สิทธิ HOSxP (Recovery Rate)
            $recoveryRate = $h['uc_money'] > 0
                ? round(($s['total_transferred'] / $h['uc_money']) * 100, 2)
                : ($s['total_transferred'] > 0 ? 100.0 : 0.0);

            // ประเมินสถานะของเดือน
            $status = 'normal';
            $statusLabel = 'รอประมวลผล';
            if ($h['cases'] === 0 && $r['cases'] === 0 && $s['total_transferred'] <= 0) {
                $status = 'no_data';
                $statusLabel = 'ยังไม่มีข้อมูล';
            } elseif ($recoveryRate >= 98.0) {
                $status = 'settled_full';
                $statusLabel = 'โอนจ่ายครบถ้วน 100%';
            } elseif ($recoveryRate >= 90.0) {
                $status = 'settled_almost';
                $statusLabel = "ชดเชยแล้ว {$recoveryRate}%" . ($unclaimedCases > 0 ? " (ค้างส่ง {$unclaimedCases})" : '');
            } elseif ($s['total_transferred'] > 0) {
                $status = 'pending_smt_part';
                $statusLabel = "โอนเงินบางส่วน {$recoveryRate}%";
            } elseif ($r['cases'] > 0 && $s['total_transferred'] <= 0) {
                $status = 'awaiting_smt';
                $statusLabel = "ส่งเบิกแล้ว {$r['cases']} เคส (รอเงินโอน SMT)";
            } elseif ($h['cases'] > 0 && $r['cases'] <= 0) {
                $status = 'unclaimed';
                $statusLabel = "ค้างยังไม่ส่งเบิก ({$h['cases']} ครั้ง)";
            }

            $row = [
                'month_key' => $ym,
                'month_label_th' => $m['month_label_th'],
                'month_short_th' => $m['month_short_th'] ?? '',
                'year_th' => $m['year_th'],
                'short_year_th' => $m['short_year_th'] ?? substr((string) $m['year_th'], -2),
                'short_label_th' => $m['short_label_th'] ?? "{$m['month_label_th']} {$m['year_th']}",
                'full_label_th' => $m['full_label_th'],

                // [1] HOSxP ไตเทียม
                'hosxp_cases' => (int) $h['cases'],
                'hosxp_income' => (float) $h['income'],
                'hosxp_uc_money' => (float) $h['uc_money'],
                'hosxp_cash' => (float) $h['cash'],
                'hosxp_drug_epo' => (float) $h['drug_epo'],
                'hosxp_hd_fee' => (float) $h['hd_fee'],

                // [2] e-Claim / REP ไตเทียม
                'rep_cases' => (int) $r['cases'],
                'rep_claim' => (float) $r['claim'],
                'rep_approved' => (float) $r['approved'],
                'rep_drug' => (float) $r['drug'],
                'rep_c_deny_cases' => (int) $r['c_deny_cases'],
                'rep_c_deny_amount' => (float) $r['c_deny_amount'],

                // [3] SMT สปสช. โอนเงินจริง
                'smt_batches' => (int) $s['batches'],
                'smt_total_transferred' => (float) $s['total_transferred'],
                'smt_ckd_amount' => (float) $s['ckd_amount'],
                'smt_lgo_hd_amount' => (float) $s['lgo_hd_amount'],

                // [4] ผลต่าง & KPIs
                'diff_hosxp_rep' => round($diffHosxpRep, 2),
                'diff_rep_smt' => round($diffRepSmt, 2),
                'diff_hosxp_smt' => round($diffHosxpSmt, 2),
                'unclaimed_cases' => $unclaimedCases,
                'recovery_rate' => $recoveryRate,
                'status' => $status,
                'status_label' => $statusLabel,
            ];

            $rows[] = $row;

            // สะสมยอดรวมทั้งปี
            $totals['hosxp_cases'] += $row['hosxp_cases'];
            $totals['hosxp_income'] += $row['hosxp_income'];
            $totals['hosxp_uc_money'] += $row['hosxp_uc_money'];
            $totals['hosxp_cash'] += $row['hosxp_cash'];
            $totals['hosxp_drug_epo'] += $row['hosxp_drug_epo'];
            $totals['hosxp_hd_fee'] += $row['hosxp_hd_fee'];

            $totals['rep_cases'] += $row['rep_cases'];
            $totals['rep_claim'] += $row['rep_claim'];
            $totals['rep_approved'] += $row['rep_approved'];
            $totals['rep_drug'] += $row['rep_drug'];
            $totals['rep_c_deny_cases'] += $row['rep_c_deny_cases'];
            $totals['rep_c_deny_amount'] += $row['rep_c_deny_amount'];

            $totals['smt_batches'] += $row['smt_batches'];
            $totals['smt_total_transferred'] += $row['smt_total_transferred'];
            $totals['smt_ckd_amount'] += $row['smt_ckd_amount'];
            $totals['smt_lgo_hd_amount'] += $row['smt_lgo_hd_amount'];

            $totals['diff_hosxp_rep'] += $row['diff_hosxp_rep'];
            $totals['diff_rep_smt'] += $row['diff_rep_smt'];
            $totals['diff_hosxp_smt'] += $row['diff_hosxp_smt'];
            $totals['unclaimed_cases'] += $row['unclaimed_cases'];
        }

        $totalRecovery = $totals['hosxp_uc_money'] > 0
            ? round(($totals['smt_total_transferred'] / $totals['hosxp_uc_money']) * 100, 2)
            : ($totals['smt_total_transferred'] > 0 ? 100.0 : 0.0);

        $totals['recovery_rate'] = $totalRecovery;

        return [
            'budget_year' => $budgetYear,
            'scheme' => $scheme,
            'service_type' => $serviceType,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'hosxp_ready' => $this->hosxpService->available(),
            'rows' => $rows,
            'totals' => $totals,
        ];
    }

    /**
     * ดึงข้อมูลเจาะลึกรายเดือน (Drill-Down)
     * รองรับแท็บ: 'hosxp_visits', 'smt_transfers', 'rep_cases', 'c_deny'
     */
    public function getMonthlyDrillDown(
        string $monthKey,
        string $scheme = 'all',
        string $tab = 'hosxp_visits',
        int $limit = 100
    ): array {
        $startOfMonth = Carbon::createFromFormat('Y-m', $monthKey)->startOfMonth()->format('Y-m-d');
        $endOfMonth = Carbon::createFromFormat('Y-m', $monthKey)->endOfMonth()->format('Y-m-d');

        // 1. Tab: รายการรับบริการไตเทียมจาก HOSxP
        if ($tab === 'hosxp_visits' && $this->hosxpService->available()) {
            return $this->fetchHosxpDialysisDrillDown($startOfMonth, $endOfMonth, $scheme, $limit);
        }

        // 2. Tab: รายการงวดโอนเงินจาก สปสช. SMT (finance_nhso_smt_transfers)
        if ($tab === 'smt_transfers') {
            return $this->fetchSmtTransfersDrillDown($startOfMonth, $endOfMonth, $scheme, $limit);
        }

        // 3. Tab: รายการส่งเบิก e-Claim / REP ไตเทียม
        if ($tab === 'rep_cases') {
            return $this->fetchRepCasesDrillDown($startOfMonth, $endOfMonth, $scheme, $limit);
        }

        // 4. Tab: รายการติด C-Deny ของผู้ป่วยไตเทียม
        if ($tab === 'c_deny') {
            return $this->fetchCDenyDrillDown($startOfMonth, $endOfMonth, $scheme, $limit);
        }

        return [
            'month_key' => $monthKey,
            'tab' => $tab,
            'items' => [],
            'count' => 0,
        ];
    }

    /**
     * ดึงข้อมูล HOSxP ไตเทียมรายเดือน (แผนก 021)
     */
    protected function fetchHosxpDialysisMonthly(
        string $startDate,
        string $endDate,
        string $scheme,
        string $serviceType = 'all'
    ): array {
        if (! $this->hosxpService->available()) {
            return [];
        }

        $schemeClause = $this->buildSchemeClause($scheme, 'v');
        $hemoCondOpd = "ov.main_dep = '021'";

        // กรองค่ายาหรือหัตถการหากมีการระบุ
        $serviceClause = '';
        if ($serviceType === 'epo_drug') {
            $serviceClause = "AND (IFNULL(v.inc03, 0) + IFNULL(v.inc17, 0)) > 0";
        } elseif ($serviceType === 'hd_fee') {
            $serviceClause = "AND IFNULL(v.inc08, 0) > 0"; // ค่าบริการตรวจวินิจฉัย/หัตถการ
        }

        $sql = "
            SELECT 
                DATE_FORMAT(v.vstdate, '%Y-%m') as ym,
                COUNT(DISTINCT v.vn) as cases,
                SUM(IFNULL(v.income, 0)) as income,
                SUM(IFNULL(v.uc_money, 0)) as uc_money,
                SUM(IFNULL(v.paid_money, 0)) as cash_paid,
                SUM(IFNULL(v.inc03, 0) + IFNULL(v.inc17, 0)) as drug_epo,
                SUM(IFNULL(v.inc08, 0) + IFNULL(v.inc10, 0)) as hd_fee
            FROM vn_stat v
            INNER JOIN ovst ov ON ov.vn = v.vn
            LEFT JOIN pttype py ON py.pttype = v.pttype
            WHERE v.vstdate BETWEEN ? AND ?
              AND ov.an IS NULL
              AND {$hemoCondOpd}
              AND {$schemeClause}
              {$serviceClause}
              AND v.uc_money > 0
            GROUP BY ym
        ";

        $result = [];
        try {
            $rows = DB::connection('hosxp')->select($sql, [$startDate, $endDate]);
            foreach ($rows as $r) {
                $result[$r->ym] = [
                    'cases' => (int) $r->cases,
                    'income' => (float) $r->income,
                    'uc_money' => (float) $r->uc_money,
                    'cash' => (float) $r->cash_paid,
                    'drug_epo' => (float) $r->drug_epo,
                    'hd_fee' => (float) $r->hd_fee,
                ];
            }
        } catch (\Throwable $e) {
            Log::warning('RcmDialysisService::fetchHosxpDialysisMonthly error: '.$e->getMessage());
        }

        return $result;
    }

    /**
     * ดึง VN ผู้ป่วยไตเทียมแยกตามเดือน
     */
    protected function fetchHosxpDialysisVnsByMonth(string $startDate, string $endDate, string $scheme): array
    {
        if (! $this->hosxpService->available()) {
            return [];
        }

        $schemeClause = $this->buildSchemeClause($scheme, 'v');
        $hemoCondOpd = "ov.main_dep = '021'";

        $sql = "
            SELECT v.vn, DATE_FORMAT(v.vstdate, '%Y-%m') as ym
            FROM vn_stat v
            INNER JOIN ovst ov ON ov.vn = v.vn
            LEFT JOIN pttype py ON py.pttype = v.pttype
            WHERE v.vstdate BETWEEN ? AND ?
              AND ov.an IS NULL
              AND {$hemoCondOpd}
              AND {$schemeClause}
              AND v.uc_money > 0
        ";

        $byMonth = [];
        try {
            $rows = DB::connection('hosxp')->select($sql, [$startDate, $endDate]);
            foreach ($rows as $r) {
                $byMonth[$r->ym][] = (string) $r->vn;
            }
        } catch (\Throwable $e) {
            Log::warning('RcmDialysisService::fetchHosxpDialysisVnsByMonth error: '.$e->getMessage());
        }

        return $byMonth;
    }

    /**
     * ดึงข้อมูล e-Claim / REP ไตเทียมรายเดือน
     */
    protected function fetchRepDialysisMonthly(
        string $startDate,
        string $endDate,
        string $scheme,
        array $hemoHns,
        array $hosxpVnsByMonth
    ): array {
        $result = [];

        // รวบรวม VN ไตเทียมทั้งหมด
        $allHemoVns = [];
        foreach ($hosxpVnsByMonth as $vns) {
            foreach ($vns as $vn) {
                $allHemoVns[$vn] = true;
            }
        }

        // คิวรีตาราง finance_cgd_stm_rows (ทั้ง LGO, CGD, UCS)
        $query = CgdStmRow::query()
            ->from('finance_cgd_stm_rows as r')
            ->join('finance_cgd_stm_batches as b', 'b.id', '=', 'r.batch_id')
            ->whereBetween('r.visit_date', [$startDate, $endDate])
            ->where(function ($q) use ($hemoHns) {
                // ระบุว่าเป็นเคสไตเทียม: HN ตรงกับไตเทียม หรือ projcode/rep_no มี HD
                if (! empty($hemoHns)) {
                    $q->whereIn('r.hn', $hemoHns);
                }
                $q->orWhere('r.projcode', 'LIKE', '%HD%')
                    ->orWhere('r.rep_no', 'LIKE', '%HD%');
            });

        if ($scheme !== 'all') {
            $query->where(function ($sq) use ($scheme) {
                $sq->where('b.filename', 'LIKE', "%{$scheme}%");
                if (\Illuminate\Support\Facades\Schema::hasColumn('finance_cgd_stm_batches', 'scheme')) {
                    $sq->orWhere('b.scheme', $scheme);
                }
            });
        }

        $repRows = $query->selectRaw("
            DATE_FORMAT(r.visit_date, '%Y-%m') as ym,
            COUNT(r.id) as cases,
            SUM(r.amount_claim) as total_claim,
            SUM(r.amount_approved) as total_approved,
            SUM(r.amount_drug) as total_drug,
            SUM(CASE WHEN r.error_code IS NOT NULL AND r.error_code != '' THEN 1 ELSE 0 END) as c_deny_cases,
            SUM(CASE WHEN r.error_code IS NOT NULL AND r.error_code != '' THEN GREATEST(0, r.amount_claim - r.amount_approved) ELSE 0 END) as c_deny_amount
        ")
            ->groupBy('ym')
            ->get();

        foreach ($repRows as $r) {
            $result[$r->ym] = [
                'cases' => (int) $r->cases,
                'claim' => (float) $r->total_claim,
                'approved' => (float) $r->total_approved,
                'drug' => (float) $r->total_drug,
                'c_deny_cases' => (int) $r->c_deny_cases,
                'c_deny_amount' => max(0, (float) $r->c_deny_amount),
            ];
        }

        // ตรวจสอบกับตาราง finance_stm_detail_rows เพิ่มเติม (กรณีมีข้อมูลที่นำเข้าผ่านระบบ STM เก่า)
        try {
            $detailQuery = StmDetailRow::query()
                ->whereBetween('visit_date', [$startDate, $endDate])
                ->where(function ($q) use ($hemoHns) {
                    if (! empty($hemoHns)) {
                        $q->whereIn('hn', $hemoHns);
                    }
                    $q->orWhere('service_name', 'LIKE', '%ไต%')
                        ->orWhere('service_name', 'LIKE', '%ฟอกเลือด%');
                });

            $detailRows = $detailQuery->selectRaw("
                DATE_FORMAT(visit_date, '%Y-%m') as ym,
                COUNT(id) as cases,
                SUM(claim_amount) as total_claim,
                SUM(approved_amount) as total_approved
            ")
                ->groupBy('ym')
                ->get();

            foreach ($detailRows as $dr) {
                if (! isset($result[$dr->ym]) || $result[$dr->ym]['cases'] === 0) {
                    $result[$dr->ym] = [
                        'cases' => (int) $dr->cases,
                        'claim' => (float) $dr->total_claim,
                        'approved' => (float) $dr->total_approved,
                        'drug' => 0.0,
                        'c_deny_cases' => 0,
                        'c_deny_amount' => 0.0,
                    ];
                }
            }
        } catch (\Throwable $e) {
            // ละเว้นหากตารางไม่มีข้อมูล
        }

        return $result;
    }

    /**
     * ดึงข้อมูลเงินโอนจริงจาก สปสช. SMT (finance_nhso_smt_transfers)
     * คัดกรองเฉพาะกองทุนไต: CKD, LGO_HD, HD
     */
    protected function fetchSmtDialysisMonthly(
        string $startDate,
        string $endDate,
        string $scheme = 'all'
    ): array {
        $result = [];

        $query = NhsoSmtTransfer::query()
            ->where(function ($q) {
                // กรองเฉพาะกองทุนไต
                $q->where('is_ckd', true)
                    ->orWhere('budget_source', 'CKD')
                    ->orWhere('budget_source', 'LGO_HD')
                    ->orWhere('ref_doc_no', 'LIKE', '%HD%')
                    ->orWhere('fund_name', 'LIKE', '%ไต%')
                    ->orWhere('fund_name', 'LIKE', '%ฟอกเลือด%')
                    ->orWhere('fund_descr', 'LIKE', '%ไต%')
                    ->orWhere('fund_descr', 'LIKE', '%ฟอกเลือด%');
            });

        // สิทธิ์
        if ($scheme === 'lgo') {
            $query->where(function ($q) {
                $q->where('budget_source', 'LGO_HD')
                    ->orWhere(function ($q2) {
                        $q2->where('budget_source', 'LGO')->where('ref_doc_no', 'LIKE', '%HD%');
                    });
            });
        } elseif ($scheme === 'ucs') {
            $query->where(function ($q) {
                $q->where('is_ckd', true)->orWhere('budget_source', 'CKD');
            });
        }

        // คัดกรองตามช่วงวันที่โอนเงิน (transfer_date) หรือ posting_date
        $query->where(function ($q) use ($startDate, $endDate) {
            $q->whereBetween('transfer_date', [$startDate, $endDate])
                ->orWhere(function ($sub) use ($startDate, $endDate) {
                    $sub->whereNull('transfer_date');
                    $startYmd = str_replace('-', '', $startDate);
                    $endYmd = str_replace('-', '', $endDate);
                    $sub->whereBetween('posting_date', [$startYmd, $endYmd]);
                });
        });

        $transfers = $query->get();

        foreach ($transfers as $t) {
            // หา month key จาก transfer_date หากไม่มีให้แปลงจาก posting_date
            $ym = null;
            if ($t->transfer_date) {
                $ym = Carbon::parse($t->transfer_date)->format('Y-m');
            } elseif ($t->posting_date && strlen($t->posting_date) >= 8) {
                // posting_date เช่น 25691014 -> แปลง พ.ศ. เป็น ค.ศ.
                $beYear = (int) substr($t->posting_date, 0, 4);
                $ceYear = $beYear > 2400 ? $beYear - 543 : $beYear;
                $month = substr($t->posting_date, 4, 2);
                $ym = sprintf('%04d-%02d', $ceYear, $month);
            }

            if (! $ym) {
                continue;
            }

            if (! isset($result[$ym])) {
                $result[$ym] = [
                    'batches' => 0,
                    'total_transferred' => 0.0,
                    'ckd_amount' => 0.0,
                    'lgo_hd_amount' => 0.0,
                ];
            }

            $amt = max(0, (float) $t->total);
            $result[$ym]['batches']++;
            $result[$ym]['total_transferred'] += $amt;

            $isLgoHd = $t->budget_source === 'LGO_HD' || str_contains(strtoupper((string) $t->ref_doc_no), 'HD');
            if ($isLgoHd) {
                $result[$ym]['lgo_hd_amount'] += $amt;
            } else {
                $result[$ym]['ckd_amount'] += $amt;
            }
        }

        return $result;
    }

    /**
     * ดึง HN ผู้ป่วยไตเทียมทั้งหมดจาก HOSxP (แผนก 021)
     */
    public function getHemodialysisHns(string $startDate, string $endDate): array
    {
        if (! $this->hosxpService->available()) {
            return [];
        }

        $sql = "
            SELECT DISTINCT v.hn
            FROM vn_stat v
            INNER JOIN ovst ov ON ov.vn = v.vn
            WHERE v.vstdate BETWEEN ? AND ?
              AND ov.main_dep = '021'
              AND ov.an IS NULL
            LIMIT 5000
        ";

        try {
            $rows = DB::connection('hosxp')->select($sql, [$startDate, $endDate]);

            return array_map(fn ($r) => (string) $r->hn, $rows);
        } catch (\Throwable $e) {
            Log::warning('RcmDialysisService::getHemodialysisHns error: '.$e->getMessage());

            return [];
        }
    }

    /**
     * เจาะลึกเคสรับบริการไตเทียมจาก HOSxP พร้อม Mask ข้อมูลส่วนบุคคลตาม PDPA
     */
    protected function fetchHosxpDialysisDrillDown(
        string $startDate,
        string $endDate,
        string $scheme,
        int $limit = 100
    ): array {
        $schemeClause = $this->buildSchemeClause($scheme, 'v');
        $sql = "
            SELECT 
                v.vn,
                v.hn,
                p.cid,
                p.pname,
                p.fname,
                p.lname,
                v.vstdate as visit_date,
                ov.vsttime as visit_time,
                py.pttype,
                py.name as pttype_name,
                IFNULL(v.income, 0) as income,
                IFNULL(v.uc_money, 0) as uc_money,
                IFNULL(v.paid_money, 0) as paid_money,
                (IFNULL(v.inc03, 0) + IFNULL(v.inc17, 0)) as drug_epo,
                (IFNULL(v.inc08, 0) + IFNULL(v.inc10, 0)) as hd_fee,
                d.name as doctor_name
            FROM vn_stat v
            INNER JOIN ovst ov ON ov.vn = v.vn
            INNER JOIN patient p ON p.hn = v.hn
            LEFT JOIN pttype py ON py.pttype = v.pttype
            LEFT JOIN doctor d ON d.code = ov.doctor
            WHERE v.vstdate BETWEEN ? AND ?
              AND ov.an IS NULL
              AND ov.main_dep = '021'
              AND {$schemeClause}
              AND v.uc_money > 0
            ORDER BY v.vstdate DESC, ov.vsttime DESC
            LIMIT ?
        ";

        try {
            $rows = DB::connection('hosxp')->select($sql, [$startDate, $endDate, $limit]);
            $items = [];
            foreach ($rows as $r) {
                $items[] = [
                    'vn' => (string) $r->vn,
                    'hn' => PiiMask::hn((string) $r->hn),
                    'cid' => PiiMask::cid((string) $r->cid),
                    'patient_name' => PiiMask::name($r->fname, $r->lname, $r->pname),
                    'visit_date' => $r->visit_date,
                    'visit_time' => $r->visit_time,
                    'pttype' => $r->pttype,
                    'pttype_name' => $r->pttype_name,
                    'income' => (float) $r->income,
                    'uc_money' => (float) $r->uc_money,
                    'paid_money' => (float) $r->paid_money,
                    'drug_epo' => (float) $r->drug_epo,
                    'hd_fee' => (float) $r->hd_fee,
                    'doctor_name' => $r->doctor_name,
                ];
            }

            return [
                'tab' => 'hosxp_visits',
                'items' => $items,
                'count' => count($items),
            ];
        } catch (\Throwable $e) {
            Log::warning('RcmDialysisService::fetchHosxpDialysisDrillDown error: '.$e->getMessage());

            return [
                'tab' => 'hosxp_visits',
                'items' => [],
                'count' => 0,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * เจาะลึกรายการงวดเงินโอนจาก สปสช. SMT (finance_nhso_smt_transfers)
     */
    protected function fetchSmtTransfersDrillDown(
        string $startDate,
        string $endDate,
        string $scheme,
        int $limit = 100
    ): array {
        $query = NhsoSmtTransfer::query()
            ->where(function ($q) {
                $q->where('is_ckd', true)
                    ->orWhere('budget_source', 'CKD')
                    ->orWhere('budget_source', 'LGO_HD')
                    ->orWhere('ref_doc_no', 'LIKE', '%HD%')
                    ->orWhere('fund_name', 'LIKE', '%ไต%')
                    ->orWhere('fund_descr', 'LIKE', '%ไต%');
            });

        if ($scheme === 'lgo') {
            $query->where(function ($q) {
                $q->where('budget_source', 'LGO_HD')
                    ->orWhere(function ($q2) {
                        $q2->where('budget_source', 'LGO')->where('ref_doc_no', 'LIKE', '%HD%');
                    });
            });
        } elseif ($scheme === 'ucs') {
            $query->where(function ($q) {
                $q->where('is_ckd', true)->orWhere('budget_source', 'CKD');
            });
        }

        $query->where(function ($q) use ($startDate, $endDate) {
            $q->whereBetween('transfer_date', [$startDate, $endDate])
                ->orWhere(function ($sub) use ($startDate, $endDate) {
                    $sub->whereNull('transfer_date');
                    $startYmd = str_replace('-', '', $startDate);
                    $endYmd = str_replace('-', '', $endDate);
                    $sub->whereBetween('posting_date', [$startYmd, $endYmd]);
                });
        });

        $transfers = $query->orderBy('transfer_date', 'desc')
            ->orderBy('id', 'desc')
            ->limit($limit)
            ->get();

        $items = [];
        foreach ($transfers as $t) {
            $items[] = [
                'id' => $t->id,
                'batch_no' => $t->batch_no,
                'ref_doc_no' => $t->ref_doc_no,
                'transfer_date' => $t->transfer_date ? $t->transfer_date->format('Y-m-d') : null,
                'posting_date' => $t->posting_date,
                'budget_source' => $t->budget_source,
                'is_ckd' => (bool) $t->is_ckd,
                'fund_name' => $t->fund_name,
                'fund_descr' => $t->fund_descr,
                'total' => (float) $t->total,
                'amount' => (float) $t->amount,
                'bank_name' => $t->bank_name,
                'bank_account_no' => $t->bank_account_no,
                'has_pdf' => $t->hasPdf(),
                'pdf_url' => $t->hasPdf() ? route('rcm.smt.pdf.view', $t->id) : null,
            ];
        }

        return [
            'tab' => 'smt_transfers',
            'items' => $items,
            'count' => count($items),
        ];
    }

    /**
     * เจาะลึกรายการส่งเบิก e-Claim / REP ไตเทียม
     */
    protected function fetchRepCasesDrillDown(
        string $startDate,
        string $endDate,
        string $scheme,
        int $limit = 100
    ): array {
        $hemoHns = $this->getHemodialysisHns($startDate, $endDate);

        $query = CgdStmRow::query()
            ->from('finance_cgd_stm_rows as r')
            ->join('finance_cgd_stm_batches as b', 'b.id', '=', 'r.batch_id')
            ->whereBetween('r.visit_date', [$startDate, $endDate])
            ->where(function ($q) use ($hemoHns) {
                if (! empty($hemoHns)) {
                    $q->whereIn('r.hn', $hemoHns);
                }
                $q->orWhere('r.projcode', 'LIKE', '%HD%')
                    ->orWhere('r.rep_no', 'LIKE', '%HD%');
            });

        if ($scheme !== 'all') {
            $query->where(function ($sq) use ($scheme) {
                $sq->where('b.filename', 'LIKE', "%{$scheme}%");
                if (\Illuminate\Support\Facades\Schema::hasColumn('finance_cgd_stm_batches', 'scheme')) {
                    $sq->orWhere('b.scheme', $scheme);
                }
            });
        }

        $rows = $query->select('r.*', 'b.filename')
            ->orderBy('r.visit_date', 'desc')
            ->limit($limit)
            ->get();

        $items = [];
        foreach ($rows as $r) {
            $items[] = [
                'id' => $r->id,
                'rep_no' => $r->rep_no,
                'hn' => PiiMask::hn((string) $r->hn),
                'pid' => PiiMask::cid((string) $r->pid),
                'patient_name' => PiiMask::name((string) $r->patient_name),
                'visit_date' => $r->visit_date ? $r->visit_date->format('Y-m-d') : null,
                'seq_no' => $r->seq_no,
                'projcode' => $r->projcode,
                'amount_claim' => (float) $r->amount_claim,
                'amount_approved' => (float) $r->amount_approved,
                'amount_drug' => (float) $r->amount_drug,
                'amount_diff' => (float) ($r->amount_claim - $r->amount_approved),
                'c_deny_code' => $r->error_code,
                'c_deny_descr' => $r->remark,
                'scheme' => $scheme,
                'filename' => $r->filename,
            ];
        }

        return [
            'tab' => 'rep_cases',
            'items' => $items,
            'count' => count($items),
        ];
    }

    /**
     * เจาะลึกรายการ C-Deny ของผู้ป่วยไตเทียม
     */
    protected function fetchCDenyDrillDown(
        string $startDate,
        string $endDate,
        string $scheme,
        int $limit = 100
    ): array {
        $hemoHns = $this->getHemodialysisHns($startDate, $endDate);

        $query = CgdStmRow::query()
            ->from('finance_cgd_stm_rows as r')
            ->join('finance_cgd_stm_batches as b', 'b.id', '=', 'r.batch_id')
            ->whereBetween('r.visit_date', [$startDate, $endDate])
            ->whereNotNull('r.error_code')
            ->where('r.error_code', '!=', '')
            ->where(function ($q) use ($hemoHns) {
                if (! empty($hemoHns)) {
                    $q->whereIn('r.hn', $hemoHns);
                }
                $q->orWhere('r.projcode', 'LIKE', '%HD%')
                    ->orWhere('r.rep_no', 'LIKE', '%HD%');
            });

        if ($scheme !== 'all') {
            $query->where(function ($sq) use ($scheme) {
                $sq->where('b.filename', 'LIKE', "%{$scheme}%");
                if (\Illuminate\Support\Facades\Schema::hasColumn('finance_cgd_stm_batches', 'scheme')) {
                    $sq->orWhere('b.scheme', $scheme);
                }
            });
        }

        $rows = $query->select('r.*', 'b.filename')
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
                'c_deny_code' => $r->error_code,
                'c_deny_descr' => $r->remark,
                'amount_claim' => (float) $r->amount_claim,
                'amount_approved' => (float) $r->amount_approved,
                'shortfall' => (float) ($r->amount_claim - $r->amount_approved),
                'scheme' => $scheme,
            ];
        }

        return [
            'tab' => 'c_deny',
            'items' => $items,
            'count' => count($items),
        ];
    }

    /**
     * คำนวณช่วงวันที่ของปีงบประมาณ (ต.ค. - ก.ย.)
     */
    protected function resolveFiscalYearRange(int $budgetYear): array
    {
        $ceYear = $budgetYear - 543;

        return [
            'start_date' => sprintf('%04d-10-01', $ceYear - 1),
            'end_date' => sprintf('%04d-09-30', $ceYear),
        ];
    }

    /**
     * สร้างโครงสร้าง 12 เดือนของปีงบประมาณไทย
     */
    protected function generateFiscalMonths(int $budgetYear): array
    {
        $ceYear = $budgetYear - 543;
        $thaiMonths = [
            10 => ['name' => 'ตุลาคม', 'short' => 'ต.ค.'],
            11 => ['name' => 'พฤศจิกายน', 'short' => 'พ.ย.'],
            12 => ['name' => 'ธันวาคม', 'short' => 'ธ.ค.'],
            1 => ['name' => 'มกราคม', 'short' => 'ม.ค.'],
            2 => ['name' => 'กุมภาพันธ์', 'short' => 'ก.พ.'],
            3 => ['name' => 'มีนาคม', 'short' => 'มี.ค.'],
            4 => ['name' => 'เมษายน', 'short' => 'เม.ย.'],
            5 => ['name' => 'พฤษภาคม', 'short' => 'พ.ค.'],
            6 => ['name' => 'มิถุนายน', 'short' => 'มิ.ย.'],
            7 => ['name' => 'กรกฎาคม', 'short' => 'ก.ค.'],
            8 => ['name' => 'สิงหาคม', 'short' => 'ส.ค.'],
            9 => ['name' => 'กันยายน', 'short' => 'ก.ย.'],
        ];

        $sequence = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        $months = [];

        foreach ($sequence as $m) {
            $year = ($m >= 10) ? ($ceYear - 1) : $ceYear;
            $monthKey = sprintf('%04d-%02d', $year, $m);
            $yearTh = $year + 543;
            $monthInfo = $thaiMonths[$m];

            $months[] = [
                'month_key' => $monthKey,
                'month_num' => $m,
                'year_ce' => $year,
                'year_th' => $yearTh,
                'short_year_th' => substr((string) $yearTh, -2),
                'month_label_th' => $monthInfo['name'],
                'month_short_th' => $monthInfo['short'],
                'short_label_th' => "{$monthInfo['short']} " . substr((string) $yearTh, -2),
                'full_label_th' => "{$monthInfo['name']} {$yearTh}",
            ];
        }

        return $months;
    }

    /**
     * สร้างเงื่อนไขสิทธิการรักษาสำหรับคิวรี HOSxP
     */
    protected function buildSchemeClause(string $scheme, string $tableAlias = 'v'): string
    {
        $pttypeAlias = 'py';

        return match (strtolower($scheme)) {
            'cgd' => "({$pttypeAlias}.pttype LIKE '12%' OR {$pttypeAlias}.pttype IN ('41', '20') OR {$pttypeAlias}.pttype LIKE '20%' OR {$pttypeAlias}.hipdata_code IN ('OFC', 'BKK', 'PTY') OR {$pttypeAlias}.pcode = 'A2')",
            'lgo' => "({$pttypeAlias}.hipdata_code = 'LGO' OR {$pttypeAlias}.pcode = 'LG' OR {$pttypeAlias}.pttype = '38' OR {$pttypeAlias}.name LIKE '%อปท%' OR {$pttypeAlias}.name LIKE '%ท้องถิ่น%')",
            'ucs' => "({$pttypeAlias}.hipdata_code = 'UCS' OR {$pttypeAlias}.pcode = 'UC' OR {$pttypeAlias}.pttype LIKE '10%' OR {$pttypeAlias}.name LIKE '%ประกันสุขภาพ%' OR {$pttypeAlias}.name LIKE '%บัตรทอง%')",
            'sss' => "({$pttypeAlias}.hipdata_code = 'SSS' OR {$pttypeAlias}.pcode = 'SS' OR {$pttypeAlias}.name LIKE '%ประกันสังคม%')",
            default => "({$pttypeAlias}.pttype LIKE '12%' OR {$pttypeAlias}.pttype IN ('41', '20') OR {$pttypeAlias}.pttype LIKE '20%' OR {$pttypeAlias}.hipdata_code IN ('OFC', 'LGO', 'UCS', 'SSS', 'BKK', 'PTY') OR {$pttypeAlias}.pcode IN ('A2', 'UC', 'SS', 'LG'))",
        };
    }
}
