<?php

namespace App\Services\Rcm;

use App\Support\PiiMask;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RcmHosxpService
{
    /**
     * ตรวจสอบว่าสามารถเชื่อมต่อ HOSxP Database ได้หรือไม่ (READ-ONLY)
     */
    public function available(): bool
    {
        try {
            if (! config('database.connections.hosxp')) {
                return false;
            }
            DB::connection('hosxp')->getPdo();

            return true;
        } catch (\Throwable $e) {
            Log::warning('HOSxP connection failed for RCM: '.$e->getMessage());

            return false;
        }
    }

    /**
     * สร้างเงื่อนไข SQL สำหรับกรองกองทุน (Scheme Filter)
     * กองทุนที่รองรับ: cgd (กรมบัญชีกลาง), lgo (อปท), ucs (บัตรทอง สปสช), sss (ประกันสังคม), bkk_pty (กทม/พัทยา), all
     */
    private function buildSchemeClause(string $scheme, string $pttypeAlias = 'v'): string
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
                return "({$py}.hipdata_code = 'UCS' OR {$py}.pcode = 'UC' OR {$pttypeAlias}.pttype IN ('10','89','90','91') OR {$py}.name LIKE '%ประกันสุขภาพ%' OR {$py}.name LIKE '%บัตรทอง%')";
            case 'sss':
                return "({$py}.hipdata_code = 'SSS' OR {$py}.pcode = 'SS' OR {$py}.name LIKE '%ประกันสังคม%')";
            case 'bkk_pty':
                return "({$py}.hipdata_code IN ('BKK', 'PTY') OR {$py}.name LIKE '%กรุงเทพ%' OR {$py}.name LIKE '%พัทยา%')";
            case 'all':
            default:
                // รวมสิทธิที่มีการเรียกเก็บเบิกจ่ายตรง/กองทุนรัฐ
                return "({$pttypeAlias}.pttype LIKE '12%' OR {$pttypeAlias}.pttype IN ('41', '20') OR {$pttypeAlias}.pttype LIKE '20%' OR {$py}.hipdata_code IN ('OFC', 'LGO', 'UCS', 'SSS', 'BKK', 'PTY', 'KKT') OR {$py}.pcode IN ('A2', 'UC', 'SS'))";
        }
    }

    /**
     * สรุปยอดรวม CSOP ทางสถิติและการเงิน (Aggregate Summary) โดยไม่มี LIMIT
     * คำนวณตรงจาก HOSxP เพื่อให้ยอดบน KPI Card ถูกต้อง 100% เสมอ
     * รองรับการคัดแยก: ข้อมูลเงินสด, ผู้ป่วยไตเทียม (HD), และผู้ป่วยใน (IPD)
     */
    public function fetchCsopSummary(
        string $startDate,
        string $endDate,
        string $scheme = 'cgd',
        bool $onlyClaimable = true,
        string $serviceScope = 'general'
    ): array {
        if (! $this->available()) {
            return [
                'total_cases' => 0,
                'total_claim_amount' => 0.0,
                'total_drug_amount' => 0.0,
                'total_artificial_organ' => 0.0,
                'total_service_charge' => 0.0,
                'total_income' => 0.0,
                'total_paid_amount' => 0.0,
                'hemo_cases' => 0,
                'hemo_amount' => 0.0,
                'pure_cash_cases' => 0,
                'pure_cash_amount' => 0.0,
            ];
        }

        $schemeClause = $this->buildSchemeClause($scheme, 'v');
        $claimableClause = $onlyClaimable ? 'AND v.uc_money > 0' : '';

        // เงื่อนไขผู้ป่วยไตเทียม (หน่วยไตเทียม 021)
        $hemoCond = "ov.main_dep = '021'";
        $scopeClause = match ($serviceScope) {
            'hemodialysis' => "AND {$hemoCond}",
            'general' => "AND ov.main_dep NOT IN ('021')",
            default => '',
        };

        // ตัดผู้ป่วยใน (IPD)
        $strictIpdClause = "AND ov.an IS NULL";

        $sql = "
            SELECT 
                COUNT(DISTINCT v.vn) as total_cases,
                SUM(IFNULL(v.uc_money, 0)) as total_claim_amount,
                SUM(IFNULL(v.inc03, 0) + IFNULL(v.inc17, 0)) as total_drug_amount,
                SUM(IFNULL(v.inc02, 0)) as total_artificial_organ,
                SUM(IFNULL(v.inc01, 0) + IFNULL(v.inc04, 0) + IFNULL(v.inc05, 0) + IFNULL(v.inc06, 0) + IFNULL(v.inc07, 0) + IFNULL(v.inc08, 0) + IFNULL(v.inc09, 0) + IFNULL(v.inc10, 0) + IFNULL(v.inc11, 0) + IFNULL(v.inc12, 0) + IFNULL(v.inc13, 0) + IFNULL(v.inc14, 0) + IFNULL(v.inc15, 0) + IFNULL(v.inc16, 0)) as total_service_charge,
                SUM(IFNULL(v.inc01, 0) + IFNULL(v.inc02, 0) + IFNULL(v.inc03, 0) + IFNULL(v.inc17, 0) + IFNULL(v.inc04, 0) + IFNULL(v.inc05, 0) + IFNULL(v.inc06, 0) + IFNULL(v.inc07, 0) + IFNULL(v.inc08, 0) + IFNULL(v.inc09, 0) + IFNULL(v.inc10, 0) + IFNULL(v.inc11, 0) + IFNULL(v.inc12, 0) + IFNULL(v.inc13, 0) + IFNULL(v.inc14, 0) + IFNULL(v.inc15, 0) + IFNULL(v.inc16, 0)) as total_income,
                SUM(IFNULL(v.paid_money, 0)) as total_paid_amount,
                COUNT(DISTINCT CASE WHEN {$hemoCond} THEN v.vn END) as hemo_cases,
                SUM(CASE WHEN {$hemoCond} THEN v.uc_money ELSE 0 END) as hemo_amount,
                COUNT(DISTINCT CASE WHEN IFNULL(v.uc_money, 0) <= 0 AND IFNULL(v.paid_money, 0) > 0 THEN v.vn END) as pure_cash_cases,
                SUM(CASE WHEN IFNULL(v.uc_money, 0) <= 0 THEN v.paid_money ELSE 0 END) as pure_cash_amount
            FROM vn_stat v
            INNER JOIN ovst ov ON ov.vn = v.vn
            LEFT JOIN pttype py ON py.pttype = v.pttype
            WHERE v.vstdate BETWEEN ? AND ?
              {$strictIpdClause}
              AND {$schemeClause}
              {$claimableClause}
              {$scopeClause}
        ";

        $row = DB::connection('hosxp')->selectOne($sql, [$startDate, $endDate]);

        return [
            'total_cases' => (int) ($row->total_cases ?? 0),
            'total_claim_amount' => (float) ($row->total_claim_amount ?? 0),
            'total_drug_amount' => (float) ($row->total_drug_amount ?? 0),
            'total_artificial_organ' => (float) ($row->total_artificial_organ ?? 0),
            'total_service_charge' => (float) ($row->total_service_charge ?? 0),
            'total_income' => (float) ($row->total_income ?? 0),
            'total_paid_amount' => (float) ($row->total_paid_amount ?? 0),
            'hemo_cases' => (int) ($row->hemo_cases ?? 0),
            'hemo_amount' => (float) ($row->hemo_amount ?? 0),
            'pure_cash_cases' => (int) ($row->pure_cash_cases ?? 0),
            'pure_cash_amount' => (float) ($row->pure_cash_amount ?? 0),
        ];
    }

    /**
     * ดึงข้อมูลผู้ป่วยนอก (CSOP / OPD Claims)
     * ผสานการดึงเลข EDC / Auth Code จากทุกตารางจริงใน HOSxP
     */
    public function fetchCsopVisits(
        string $startDate,
        string $endDate,
        string $scheme = 'cgd',
        bool $onlyClaimable = true,
        int $limit = 1000,
        string $serviceScope = 'general'
    ): array
    {
        if (! $this->available()) {
            return [];
        }

        $schemeClause = $this->buildSchemeClause($scheme, 'v');
        $claimableClause = $onlyClaimable ? 'AND v.uc_money > 0' : '';
        $limitClause = $limit > 0 ? "LIMIT {$limit}" : '';

        // เงื่อนไขผู้ป่วยไตเทียม (หน่วยไตเทียม 021)
        $hemoCond = "ov.main_dep = '021'";
        $scopeClause = match ($serviceScope) {
            'hemodialysis' => "AND {$hemoCond}",
            'general' => "AND ov.main_dep NOT IN ('021')",
            default => '',
        };

        // ตัดผู้ป่วยใน (IPD)
        $strictIpdClause = "AND ov.an IS NULL";

        $sql = "
            SELECT 
                v.vn,
                v.hn,
                p.cid,
                p.pname,
                p.fname,
                p.lname,
                p.sex,
                v.vstdate as visit_date,
                ov.vsttime as visit_time,
                v.pdx,
                v.pttype,
                py.name as pttype_name,
                py.hipdata_code,
                (IFNULL(v.inc03, 0) + IFNULL(v.inc17, 0)) as drug,
                IFNULL(v.inc02, 0) as artificial_organ,
                (IFNULL(v.inc01, 0) + IFNULL(v.inc04, 0) + IFNULL(v.inc05, 0) + IFNULL(v.inc06, 0) + IFNULL(v.inc07, 0) + IFNULL(v.inc08, 0) + IFNULL(v.inc09, 0) + IFNULL(v.inc10, 0) + IFNULL(v.inc11, 0) + IFNULL(v.inc12, 0) + IFNULL(v.inc13, 0) + IFNULL(v.inc14, 0) + IFNULL(v.inc15, 0) + IFNULL(v.inc16, 0)) as service_charge,
                (IFNULL(v.inc01, 0) + IFNULL(v.inc02, 0) + IFNULL(v.inc03, 0) + IFNULL(v.inc17, 0) + IFNULL(v.inc04, 0) + IFNULL(v.inc05, 0) + IFNULL(v.inc06, 0) + IFNULL(v.inc07, 0) + IFNULL(v.inc08, 0) + IFNULL(v.inc09, 0) + IFNULL(v.inc10, 0) + IFNULL(v.inc11, 0) + IFNULL(v.inc12, 0) + IFNULL(v.inc13, 0) + IFNULL(v.inc14, 0) + IFNULL(v.inc15, 0) + IFNULL(v.inc16, 0)) as total,
                IFNULL(v.paid_money, 0) as payment,
                IFNULL(v.uc_money, 0) as debt,
                IF(MAX(o.finance_number) IS NULL, '*', '') as no_finance_number,
                k.department,
                COALESCE(
                    NULLIF(TRIM(MAX(ktb.approval_code)), ''),
                    NULLIF(TRIM(MAX(vp.auth_code)), ''),
                    NULLIF(TRIM(MAX(vp.claim_code)), ''),
                    NULLIF(TRIM(MAX(sks.authcode)), ''),
                    NULLIF(TRIM(MAX(seq.edc_approve_list_text)), ''),
                    NULLIF(TRIM(MAX(nhso.nhso_authen_code)), '')
                ) as auth_code,
                CASE 
                    WHEN NULLIF(TRIM(MAX(ktb.approval_code)), '') IS NOT NULL THEN 'KTB EDC'
                    WHEN NULLIF(TRIM(MAX(vp.auth_code)), '') IS NOT NULL THEN 'Visit Pttype'
                    WHEN NULLIF(TRIM(MAX(vp.claim_code)), '') IS NOT NULL THEN 'Claim Code'
                    WHEN NULLIF(TRIM(MAX(nhso.nhso_authen_code)), '') IS NOT NULL THEN 'สปสช. Authen'
                    WHEN NULLIF(TRIM(MAX(sks.authcode)), '') IS NOT NULL THEN 'SKS BillTran'
                    WHEN NULLIF(TRIM(MAX(seq.edc_approve_list_text)), '') IS NOT NULL THEN 'Ovst Seq'
                    ELSE ''
                END as auth_source,
                MAX(vp.project_code) as project_code,
                CASE WHEN {$hemoCond} THEN 1 ELSE 0 END as is_hemodialysis
            FROM vn_stat v
            INNER JOIN ovst ov ON ov.vn = v.vn
            LEFT JOIN opitemrece o ON o.vn = v.vn
            LEFT JOIN patient p ON p.hn = v.hn
            LEFT JOIN income i ON i.income = o.income
            LEFT JOIN paidst pd ON pd.paidst = o.paidst
            LEFT JOIN kskdepartment k ON k.depcode = ov.main_dep
            LEFT JOIN pttype py ON py.pttype = v.pttype
            LEFT JOIN ktb_edc_transaction ktb ON ktb.vn = v.vn AND TRIM(IFNULL(ktb.approval_code, '')) <> ''
            LEFT JOIN visit_pttype vp ON vp.vn = v.vn
            LEFT JOIN ovst_seq seq ON seq.vn = v.vn
            LEFT JOIN nhso_confirm_privilege nhso ON nhso.vn = v.vn
            LEFT JOIN ovst_sks_billtran sks ON sks.vn = v.vn
            WHERE v.vstdate BETWEEN ? AND ?
              {$strictIpdClause}
              AND {$schemeClause}
              {$claimableClause}
              {$scopeClause}
            GROUP BY v.vn
            ORDER BY v.vstdate DESC, ov.vsttime DESC
            {$limitClause}
        ";

        $rows = DB::connection('hosxp')->select($sql, [$startDate, $endDate]);
        $result = [];

        foreach ($rows as $row) {
            $maskedName = PiiMask::name($row->pname, $row->fname, $row->lname);
            $maskedHn = PiiMask::hn($row->hn);
            $maskedCid = PiiMask::cid($row->cid);

            $result[] = [
                'vn' => (string) $row->vn,
                'hn' => $maskedHn,
                'raw_hn' => (string) $row->hn,
                'cid' => $maskedCid,
                'raw_cid' => (string) $row->cid,
                'patient_name' => $maskedName,
                'sex' => (string) $row->sex,
                'visit_date' => (string) $row->visit_date,
                'visit_time' => (string) $row->visit_time,
                'pdx' => (string) $row->pdx,
                'pttype' => (string) $row->pttype,
                'pttype_name' => (string) $row->pttype_name,
                'hipdata_code' => (string) $row->hipdata_code,
                'drug' => (float) $row->drug,
                'drug_total' => (float) $row->drug,
                'artificial_organ' => (float) $row->artificial_organ,
                'service_charge' => (float) $row->service_charge,
                'total' => (float) $row->total,
                'total_amount' => (float) $row->total,
                'payment' => (float) $row->payment,
                'paid_amount' => (float) $row->payment,
                'debt' => (float) $row->debt,
                'claim_amount' => (float) $row->debt,
                'no_finance_number' => (string) ($row->no_finance_number ?? ''),
                'department' => (string) ($row->department ?? ''),
                'auth_code' => (string) ($row->auth_code ?? ''),
                'auth_source' => (string) ($row->auth_source ?? ''),
                'project_code' => (string) ($row->project_code ?? ''),
            ];
        }

        return $result;
    }

    /**
     * ดึงรายละเอียดรายการยาของผู้ป่วยนอก CSOP รายเคส
     */
    public function fetchCsopRxItems(string $vn): array
    {
        if (! $this->available()) {
            return [];
        }

        $sql = "
            SELECT 
                op.hos_guid,
                op.icode,
                d.name as drug_name,
                d.units,
                d.did,
                d.tmt_tp_code,
                d.tmt_gp_code,
                IF(d.drugcategory LIKE '%NED%' OR d.name LIKE '%(NED)%' OR d.name LIKE '%#NED%' OR op.income = '17', 'NED', 'ED') as ed_ned,
                op.qty,
                op.unitprice,
                op.sum_price,
                op.paidst,
                COALESCE(
                    NULLIF(TRIM(ned.presc_reason), ''),
                    NULLIF(TRIM(ned.reason_all), ''),
                    NULLIF(TRIM(ned.reason_ea), ''),
                    NULLIF(TRIM(ned.reason_eb), ''),
                    NULLIF(TRIM(ned.reason_ec), ''),
                    NULLIF(TRIM(ned.reason_ed), ''),
                    NULLIF(TRIM(ned.reason_ee), ''),
                    NULLIF(TRIM(ned.reason_ef), '')
                ) as ned_reason,
                du.name1 as usage_name1,
                du.name2 as usage_name2,
                du.name3 as usage_name3
            FROM opitemrece op
            INNER JOIN drugitems d ON d.icode = op.icode
            LEFT JOIN drugusage du ON du.drugusage = op.drugusage
            LEFT JOIN ovst_presc_ned ned ON ned.vn = op.vn AND ned.icode = op.icode
            WHERE op.vn = ?
              AND op.income IN ('03', '17')
            ORDER BY op.item_no ASC
        ";

        $rows = DB::connection('hosxp')->select($sql, [$vn]);
        $items = [];

        foreach ($rows as $row) {
            $tmt = $row->tmt_tp_code ?: ($row->tmt_gp_code ?: $row->did);
            $usage = trim(($row->usage_name1 ?? '').' '.($row->usage_name2 ?? '').' '.($row->usage_name3 ?? ''));

            $items[] = [
                'icode' => (string) $row->icode,
                'drug_name' => (string) $row->drug_name,
                'units' => (string) $row->units,
                'tmt_code' => (string) $tmt,
                'ed_ned' => (string) $row->ed_ned,
                'qty' => (float) $row->qty,
                'unitprice' => (float) $row->unitprice,
                'sum_price' => (float) $row->sum_price,
                'paidst' => (string) $row->paidst,
                'ned_reason' => (string) ($row->ned_reason ?? ''),
                'usage' => $usage,
            ];
        }

        return $items;
    }

    /**
     * ดึงข้อมูลผู้ป่วยใน CIPN ที่จำหน่ายแล้ว พร้อม DRG/AdjRW และ 16 หมวดค่ารักษา
     */
    public function fetchCipnAdmissions(string $startDate, string $endDate, string $scheme = 'cgd'): array
    {
        if (! $this->available()) {
            return [];
        }

        $schemeClause = $this->buildSchemeClause($scheme, 'a');

        $sql = "
            SELECT 
                i.an,
                i.hn,
                i.vn,
                p.cid,
                p.pname,
                p.fname,
                p.lname,
                p.sex,
                i.regdate,
                i.regtime,
                i.dchdate,
                i.dchtime,
                i.dchstts,
                i.dchtype,
                DATEDIFF(i.dchdate, i.regdate) as los,
                a.pdx,
                a.pttype,
                py.name as pttype_name,
                py.hipdata_code,
                a.income as total_amount,
                a.paid_money as paid_amount,
                a.uc_money as claim_amount,
                COALESCE(drg.drg, a.drg) as drg,
                drg.mdc,
                COALESCE(drg.rw, a.rw, 0) as rw,
                COALESCE(drg.adjrw, drg.rw, a.rw, 0) as adjrw,
                drg.wtlos,
                COALESCE(
                    NULLIF(TRIM(ipt_py.auth_code), ''),
                    NULLIF(TRIM(ipt_py.claim_code), ''),
                    NULLIF(TRIM(edc.approval_code), ''),
                    NULLIF(TRIM(nhso.nhso_authen_code), '')
                ) as auth_code,
                CASE
                    WHEN NULLIF(TRIM(ipt_py.auth_code), '') IS NOT NULL THEN 'IPT Pttype Auth'
                    WHEN NULLIF(TRIM(ipt_py.claim_code), '') IS NOT NULL THEN 'IPT Claim Code'
                    WHEN NULLIF(TRIM(edc.approval_code), '') IS NOT NULL THEN 'KTB EDC'
                    WHEN NULLIF(TRIM(nhso.nhso_authen_code), '') IS NOT NULL THEN 'สปสช. Authen'
                    ELSE ''
                END as auth_source,
                ipt_py.project_code,
                a.inc01, a.inc02, a.inc03, a.inc04, a.inc05, a.inc06, a.inc07, a.inc08,
                a.inc09, a.inc10, a.inc11, a.inc12, a.inc13, a.inc14, a.inc15, a.inc16
            FROM ipt i
            INNER JOIN an_stat a ON a.an = i.an
            LEFT JOIN patient p ON p.hn = i.hn
            LEFT JOIN pttype py ON py.pttype = a.pttype
            LEFT JOIN ipt_pttype ipt_py ON ipt_py.an = i.an
            LEFT JOIN ipt_drg_result drg ON drg.an = i.an
            LEFT JOIN ktb_edc_transaction edc ON edc.vn = i.vn AND TRIM(IFNULL(edc.approval_code, '')) <> ''
            LEFT JOIN nhso_confirm_privilege nhso ON nhso.vn = i.vn
            WHERE i.dchdate BETWEEN ? AND ?
              AND {$schemeClause}
            ORDER BY i.dchdate DESC, i.dchtime DESC
            LIMIT 500
        ";

        $rows = DB::connection('hosxp')->select($sql, [$startDate, $endDate]);
        $result = [];

        foreach ($rows as $row) {
            $maskedName = PiiMask::name($row->pname, $row->fname, $row->lname);
            $maskedHn = PiiMask::hn($row->hn);
            $maskedCid = PiiMask::cid($row->cid);

            // จำแนก 16 หมวดมาตรฐาน
            $categories16 = [
                'cat01_room' => (float) ($row->inc01 ?? 0),
                'cat02_prosthesis' => (float) ($row->inc02 ?? 0),
                'cat03_drug_in' => (float) ($row->inc03 ?? 0),
                'cat04_drug_home' => (float) ($row->inc04 ?? 0),
                'cat05_supply' => (float) ($row->inc05 ?? 0),
                'cat06_blood' => (float) ($row->inc06 ?? 0),
                'cat07_lab' => (float) ($row->inc07 ?? 0),
                'cat08_xray' => (float) ($row->inc08 ?? 0),
                'cat09_special_diag' => (float) ($row->inc09 ?? 0),
                'cat10_equipment' => (float) ($row->inc10 ?? 0),
                'cat11_procedure' => (float) ($row->inc11 ?? 0),
                'cat12_nursing' => (float) ($row->inc12 ?? 0),
                'cat13_dental' => (float) ($row->inc13 ?? 0),
                'cat14_physical' => (float) ($row->inc14 ?? 0),
                'cat15_alternative' => (float) ($row->inc15 ?? 0),
                'cat16_other' => (float) ($row->inc16 ?? 0),
            ];

            $result[] = [
                'an' => (string) $row->an,
                'hn' => $maskedHn,
                'raw_hn' => (string) $row->hn,
                'cid' => $maskedCid,
                'raw_cid' => (string) $row->cid,
                'patient_name' => $maskedName,
                'sex' => (string) $row->sex,
                'regdate' => (string) $row->regdate,
                'dchdate' => (string) $row->dchdate,
                'los' => (int) ($row->los ?: 1),
                'pdx' => (string) $row->pdx,
                'pttype' => (string) $row->pttype,
                'pttype_name' => (string) $row->pttype_name,
                'hipdata_code' => (string) $row->hipdata_code,
                'total_amount' => (float) $row->total_amount,
                'paid_amount' => (float) $row->paid_amount,
                'claim_amount' => (float) $row->claim_amount,
                'drg' => (string) ($row->drg ?? ''),
                'mdc' => (string) ($row->mdc ?? ''),
                'rw' => (float) ($row->rw ?? 0),
                'adj_rw' => (float) ($row->adjrw ?? 0),
                'auth_code' => (string) ($row->auth_code ?? ''),
                'auth_source' => (string) ($row->auth_source ?? ''),
                'project_code' => (string) ($row->project_code ?? ''),
                'categories16' => $categories16,
            ];
        }

        return $result;
    }

    /**
     * ดึงรายการสั่งใช้ยานอกบัญชี (NED) เพื่อตรวจสอบความครบถ้วนของเหตุผลการใช้ยา
     * แยกเด็ดขาดจากระบบตรวจ Rules / ติด C ทั่วไป
     */
    public function fetchNedPrescriptionAudit(
        string $startDate,
        string $endDate,
        string $scheme = 'all',
        string $serviceType = 'ALL',
        string $statusFilter = 'missing',
        int $limit = 2000
    ): array {
        if (! $this->available()) {
            return [
                'items' => [],
                'summary' => [
                    'total_cases' => 0,
                    'total_patients' => 0,
                    'total_ned_items' => 0,
                    'total_ned_amount' => 0,
                    'missing_reason_items' => 0,
                    'missing_reason_amount' => 0,
                    'has_reason_items' => 0,
                    'has_reason_amount' => 0,
                    'compliance_rate' => 0,
                ],
                'top_drugs' => [],
                'top_doctors' => [],
            ];
        }

        $schemeClause = $this->buildSchemeClause($scheme, 'py');

        $serviceClause = '';
        if ($serviceType === 'CSOP') {
            $serviceClause = "AND (op.an IS NULL OR TRIM(op.an) = '')";
        } elseif ($serviceType === 'CIPN') {
            $serviceClause = "AND (op.an IS NOT NULL AND TRIM(op.an) <> '')";
        }

        $sql = "
            SELECT 
                op.hos_guid,
                op.icode,
                op.vn,
                op.an,
                op.hn,
                op.vstdate,
                op.rxdate,
                op.item_no,
                op.qty,
                op.unitprice,
                op.sum_price,
                op.paidst,
                d.name as drug_name,
                d.units,
                d.did,
                d.tmt_tp_code,
                d.tmt_gp_code,
                p.pname,
                p.fname,
                p.lname,
                p.cid,
                COALESCE(NULLIF(TRIM(py.name), ''), op.pttype, '-') as pttype_name,
                COALESCE(NULLIF(TRIM(ov.pttype), ''), NULLIF(TRIM(ip.pttype), ''), op.pttype, '-') as pttype,
                COALESCE(NULLIF(TRIM(k.department), ''), NULLIF(TRIM(w.name), ''), 'ไม่ระบุแผนก') as department_name,
                COALESCE(NULLIF(TRIM(doc.name), ''), NULLIF(TRIM(doc_ip.name), ''), op.doctor, '-') as doctor_name,
                COALESCE(NULLIF(TRIM(doc.code), ''), NULLIF(TRIM(doc_ip.code), ''), op.doctor, '-') as doctor_code,
                COALESCE(
                    NULLIF(TRIM(ned.presc_reason), ''),
                    NULLIF(TRIM(ned.reason_all), ''),
                    NULLIF(TRIM(ned.reason_ea), ''),
                    NULLIF(TRIM(ned.reason_eb), ''),
                    NULLIF(TRIM(ned.reason_ec), ''),
                    NULLIF(TRIM(ned.reason_ed), ''),
                    NULLIF(TRIM(ned.reason_ee), ''),
                    NULLIF(TRIM(ned.reason_ef), '')
                ) as raw_ned_reason,
                CASE
                    WHEN NULLIF(TRIM(ned.presc_reason), '') IS NOT NULL THEN TRIM(ned.presc_reason)
                    WHEN ned.reason_ea IN ('Y', '1') THEN 'EA'
                    WHEN ned.reason_eb IN ('Y', '1') THEN 'EB'
                    WHEN ned.reason_ec IN ('Y', '1') THEN 'EC'
                    WHEN ned.reason_ed IN ('Y', '1') THEN 'ED'
                    WHEN ned.reason_ee IN ('Y', '1') THEN 'EE'
                    WHEN ned.reason_ef IN ('Y', '1') THEN 'EF'
                    WHEN NULLIF(TRIM(ned.reason_all), '') IS NOT NULL THEN TRIM(ned.reason_all)
                    ELSE ''
                END as ned_code
            FROM opitemrece op
            INNER JOIN drugitems d ON d.icode = op.icode
            LEFT JOIN patient p ON p.hn = op.hn
            LEFT JOIN ovst ov ON ov.vn = op.vn
            LEFT JOIN ipt ip ON ip.an = op.an
            LEFT JOIN ward w ON w.ward = ip.ward
            LEFT JOIN kskdepartment k ON k.depcode = ov.main_dep
            LEFT JOIN doctor doc ON doc.code = op.doctor
            LEFT JOIN doctor doc_ip ON doc_ip.code = ip.admdoctor
            LEFT JOIN pttype py ON py.pttype = COALESCE(NULLIF(TRIM(ov.pttype), ''), NULLIF(TRIM(ip.pttype), ''), op.pttype)
            LEFT JOIN ovst_presc_ned ned ON ned.vn = op.vn AND ned.icode = op.icode
            WHERE (
                (op.vstdate BETWEEN ? AND ?)
                OR (op.rxdate BETWEEN ? AND ?)
            )
              AND op.income IN ('03', '17')
              AND op.qty > 0
              AND (d.drugcategory LIKE '%NED%' OR d.name LIKE '%#NED%' OR d.name LIKE '%(NED)%' OR op.income = '17' OR d.drugaccount = 'NED')
              {$serviceClause}
              AND {$schemeClause}
            ORDER BY op.vstdate DESC, op.vn DESC, op.item_no ASC
            LIMIT {$limit}
        ";

        $rows = DB::connection('hosxp')->select($sql, [$startDate, $endDate, $startDate, $endDate]);

        $items = [];
        $uniqueVns = [];
        $uniqueHns = [];
        $totalItems = 0;
        $totalAmount = 0.0;
        $missingItems = 0;
        $missingAmount = 0.0;
        $hasReasonItems = 0;
        $hasReasonAmount = 0.0;

        $topDrugsMap = [];
        $topDoctorsMap = [];

        foreach ($rows as $row) {
            $tmt = (string) ($row->tmt_tp_code ?: ($row->tmt_gp_code ?: $row->did));
            $rawNed = trim((string) ($row->raw_ned_reason ?? ''));
            $nedCode = strtoupper(trim((string) ($row->ned_code ?? '')));

            $hasReason = false;
            if ($rawNed !== '' || $nedCode !== '') {
                $hasReason = true;
            }

            $reasonDisplay = $this->formatNedReasonDisplay($nedCode, $rawNed);

            $sumPrice = (float) ($row->sum_price ?? 0);
            $totalItems++;
            $totalAmount += $sumPrice;

            if ($row->vn) {
                $uniqueVns[(string) $row->vn] = true;
            } elseif ($row->an) {
                $uniqueVns['AN:'.(string) $row->an] = true;
            }
            if ($row->hn) {
                $uniqueHns[(string) $row->hn] = true;
            }

            $drugKey = (string) $row->icode;
            if (! isset($topDrugsMap[$drugKey])) {
                $topDrugsMap[$drugKey] = [
                    'icode' => $drugKey,
                    'drug_name' => (string) $row->drug_name,
                    'units' => (string) ($row->units ?? ''),
                    'missing_count' => 0,
                    'total_count' => 0,
                    'missing_amount' => 0.0,
                ];
            }
            $topDrugsMap[$drugKey]['total_count']++;

            $docCode = (string) ($row->doctor_code ?: 'UNKNOWN');
            $docName = (string) ($row->doctor_name ?: 'ไม่ระบุแพทย์');
            if (! isset($topDoctorsMap[$docCode])) {
                $topDoctorsMap[$docCode] = [
                    'doctor_code' => $docCode,
                    'doctor_name' => $docName,
                    'missing_count' => 0,
                    'total_count' => 0,
                    'missing_amount' => 0.0,
                ];
            }
            $topDoctorsMap[$docCode]['total_count']++;

            if ($hasReason) {
                $hasReasonItems++;
                $hasReasonAmount += $sumPrice;
            } else {
                $missingItems++;
                $missingAmount += $sumPrice;
                $topDrugsMap[$drugKey]['missing_count']++;
                $topDrugsMap[$drugKey]['missing_amount'] += $sumPrice;
                $topDoctorsMap[$docCode]['missing_count']++;
                $topDoctorsMap[$docCode]['missing_amount'] += $sumPrice;
            }

            // กรองสถานะตาม $statusFilter
            if ($statusFilter === 'missing' && $hasReason) {
                continue;
            }
            if ($statusFilter === 'has_reason' && ! $hasReason) {
                continue;
            }

            $maskedHn = PiiMask::hn((string) $row->hn);
            $maskedCid = PiiMask::cid((string) $row->cid);
            $maskedName = PiiMask::name((string) $row->pname, (string) $row->fname, (string) $row->lname);

            $service = (! empty($row->an) && trim((string) $row->an) !== '') ? 'IPD' : 'OPD';

            $items[] = [
                'hos_guid' => (string) ($row->hos_guid ?? ''),
                'vn' => (string) ($row->vn ?? ''),
                'an' => (string) ($row->an ?? ''),
                'service_type' => $service,
                'hn' => $maskedHn,
                'raw_hn' => (string) $row->hn,
                'cid' => $maskedCid,
                'patient_name' => $maskedName,
                'vstdate' => (string) ($row->vstdate ?? $row->rxdate ?? ''),
                'pttype' => (string) $row->pttype,
                'pttype_name' => (string) $row->pttype_name,
                'department' => (string) $row->department_name,
                'doctor_code' => $docCode,
                'doctor_name' => $docName,
                'icode' => (string) $row->icode,
                'drug_name' => (string) $row->drug_name,
                'units' => (string) ($row->units ?? ''),
                'tmt_code' => $tmt,
                'qty' => (float) ($row->qty ?? 0),
                'unitprice' => (float) ($row->unitprice ?? 0),
                'sum_price' => $sumPrice,
                'paidst' => (string) ($row->paidst ?? ''),
                'has_reason' => $hasReason,
                'reason_code' => $nedCode,
                'reason_text' => $rawNed,
                'reason_display' => $reasonDisplay,
            ];
        }

        // เรียงลำดับ Top Drugs ที่ขาดเหตุผล
        usort($topDrugsMap, fn ($a, $b) => $b['missing_count'] <=> $a['missing_count'] ?: $b['missing_amount'] <=> $a['missing_amount']);
        $topDrugs = array_slice(array_values(array_filter($topDrugsMap, fn ($d) => $d['missing_count'] > 0)), 0, 10);

        // เรียงลำดับ Top Doctors ที่มีรายการขาดเหตุผล
        usort($topDoctorsMap, fn ($a, $b) => $b['missing_count'] <=> $a['missing_count'] ?: $b['missing_amount'] <=> $a['missing_amount']);
        $topDoctors = array_slice(array_values(array_filter($topDoctorsMap, fn ($doc) => $doc['missing_count'] > 0)), 0, 10);

        $complianceRate = $totalItems > 0 ? round(($hasReasonItems / $totalItems) * 100, 1) : 100.0;

        return [
            'items' => $items,
            'summary' => [
                'total_cases' => count($uniqueVns),
                'total_patients' => count($uniqueHns),
                'total_ned_items' => $totalItems,
                'total_ned_amount' => $totalAmount,
                'missing_reason_items' => $missingItems,
                'missing_reason_amount' => $missingAmount,
                'has_reason_items' => $hasReasonItems,
                'has_reason_amount' => $hasReasonAmount,
                'compliance_rate' => $complianceRate,
            ],
            'top_drugs' => $topDrugs,
            'top_doctors' => $topDoctors,
        ];
    }

    /**
     * แปลงรหัสเหตุผลยานอกบัญชี (EA-EF) เป็นข้อความเข้าใจง่าย
     */
    public function formatNedReasonDisplay(string $code, string $rawText): string
    {
        $code = strtoupper(trim($code));
        $descriptions = [
            'EA' => 'EA: แพ้ยา/เกิดอาการไม่พึงประสงค์จากยาในบัญชีฯ',
            'EB' => 'EB: ไม่บรรลุเป้าหมายการรักษาแม้ใช้ยาในบัญชีฯ แล้ว',
            'EC' => 'EC: ไม่มีกลุ่มยาในบัญชีฯ ที่ใช้รักษาโรคนี้ได้',
            'ED' => 'ED: ผู้ป่วยมีข้อห้ามใช้ยาในบัญชียาหลักแห่งชาติ',
            'EE' => 'EE: ยาในบัญชีฯ มีราคาสูงกว่ายานอกบัญชีฯ',
            'EF' => 'EF: มีข้อจำกัดการใช้ยาในบัญชีฯ (เช่น ปัญหากลืนยา)',
        ];

        if (isset($descriptions[$code])) {
            return $descriptions[$code];
        }

        if ($code !== '') {
            return "รหัส {$code}" . ($rawText !== '' && $rawText !== $code ? ": {$rawText}" : '');
        }

        if ($rawText !== '') {
            return $rawText;
        }

        return 'ยังไม่ได้ระบุเหตุผล';
    }
}
