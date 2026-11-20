<?php

namespace App\Services\Rcm;

use App\Models\Rcm\RcmClaimBatch;
use App\Models\Rcm\RcmClaimItem;
use Illuminate\Support\Facades\Auth;

class RcmCsopService
{
    public function __construct(
        protected readonly RcmHosxpService $hosxpService,
        protected readonly RcmSmartScrubberService $scrubberService,
    ) {}

    /**
     * ดึงและประมวลผลข้อมูล CSOP พร้อม Scrubber Analysis และรองรับแยกกองทุน
     */
    public function getScrubbedVisits(
        string $startDate,
        string $endDate,
        string $scheme = 'cgd',
        bool $onlyClaimable = true,
        int $limit = 1000,
        string $serviceScope = 'general'
    ): array {
        // 1. ดึง Aggregate Summary จาก HOSxP ทั้งหมดในช่วงวันที่ (ไม่มี LIMIT เพื่อความถูกต้อง 100%)
        $agg = $this->hosxpService->fetchCsopSummary($startDate, $endDate, $scheme, $onlyClaimable, $serviceScope);

        // 2. ดึงรายการเคสสำหรับแสดงผลในตารางและ Scrubber Audit
        $rawVisits = $this->hosxpService->fetchCsopVisits($startDate, $endDate, $scheme, $onlyClaimable, $limit, $serviceScope);
        $scrubbed = [];

        $displayedCases = count($rawVisits);
        $cleanCases = 0;
        $warningCases = 0;
        $errorCases = 0;

        foreach ($rawVisits as $visit) {
            $audit = $this->scrubberService->auditVisit($visit, 'CSOP');
            $visit['audit_status'] = $audit['audit_status'];
            $visit['findings'] = $audit['findings'];
            $visit['findings_count'] = $audit['findings_count'];

            if ($audit['audit_status'] === 'pass') {
                $cleanCases++;
            } elseif ($audit['audit_status'] === 'warning') {
                $warningCases++;
            } else {
                $errorCases++;
            }

            $scrubbed[] = $visit;
        }

        $cleanRate = $displayedCases > 0 ? round(($cleanCases / $displayedCases) * 100, 2) : 0;

        // คำนวณส่วนต่างและการเปรียบเทียบเบื้องต้นกับ e-Claim REP
        $repStats = \Illuminate\Support\Facades\DB::table('finance_cgd_stm_rows as r')
            ->join('finance_cgd_stm_batches as b', 'b.id', '=', 'r.batch_id')
            ->where('b.file_kind', 'rep')
            ->whereBetween('r.visit_date', [$startDate, $endDate])
            ->where(function ($q) {
                $q->whereNull('r.an')->orWhere('r.an', '');
            })
            ->when($scheme !== 'all', fn ($q) => $q->where('b.scheme', $scheme))
            ->selectRaw('
                COUNT(*) as rep_cases,
                SUM(IFNULL(r.amount_claim, 0)) as rep_claim,
                SUM(IFNULL(r.amount_approved, 0)) as rep_approved,
                SUM(CASE WHEN r.error_code IS NOT NULL AND r.error_code != "" AND r.is_settled = 0 THEN GREATEST(0, r.amount_claim - r.amount_approved) ELSE 0 END) as c_deny_amount
            ')
            ->first();

        $repCases = (int) ($repStats->rep_cases ?? 0);
        $repClaim = (float) ($repStats->rep_claim ?? 0);
        $cDenyAmount = (float) ($repStats->c_deny_amount ?? 0);

        return [
            'items' => $scrubbed,
            'summary' => [
                'total_cases' => $agg['total_cases'],
                'total_claim_amount' => $agg['total_claim_amount'],
                'total_drug_amount' => $agg['total_drug_amount'],
                'total_artificial_organ' => $agg['total_artificial_organ'] ?? 0.0,
                'total_service_charge' => $agg['total_service_charge'] ?? 0.0,
                'total_income' => $agg['total_income'],
                'total_paid_amount' => $agg['total_paid_amount'],
                'hemo_cases' => $agg['hemo_cases'],
                'hemo_amount' => $agg['hemo_amount'],
                'pure_cash_cases' => $agg['pure_cash_cases'],
                'pure_cash_amount' => $agg['pure_cash_amount'],
                'service_scope' => $serviceScope,
                'displayed_cases' => $displayedCases,
                'clean_cases' => $cleanCases,
                'warning_cases' => $warningCases,
                'error_cases' => $errorCases,
                'clean_claim_rate' => $cleanRate,
                'rep_cases' => $repCases,
                'rep_claim' => $repClaim,
                'unclaimed_cases' => max(0, $agg['total_cases'] - $repCases),
                'diff_claim_amount' => $agg['total_claim_amount'] - $repClaim,
                'c_deny_amount' => $cDenyAmount,
            ],
        ];
    }

    /**
     * สร้าง Batch ส่งออก CSOP Claim และบันทึกลงในระบบ SMH
     */
    public function createBatch(string $startDate, string $endDate, array $vns = [], string $scheme = 'cgd', string $serviceScope = 'general'): RcmClaimBatch
    {
        $batchNo = 'CSOP-'.date('Ymd').'-'.strtoupper(substr(uniqid(), -4));
        $scrubbedData = $this->getScrubbedVisits($startDate, $endDate, $scheme, true, 5000, $serviceScope);
        $visits = $scrubbedData['items'];

        if (! empty($vns)) {
            $visits = array_filter($visits, fn ($v) => in_array($v['vn'], $vns));
        }

        $totalCases = count($visits);
        $totalAmount = array_sum(array_column($visits, 'claim_amount'));
        $cleanCount = count(array_filter($visits, fn ($v) => $v['audit_status'] === 'pass'));
        $cleanRate = $totalCases > 0 ? round(($cleanCount / $totalCases) * 100, 2) : 0;

        $batch = RcmClaimBatch::create([
            'batch_no' => $batchNo,
            'claim_type' => 'CSOP',
            'scheme_code' => 'OFC',
            'period_start' => $startDate,
            'period_end' => $endDate,
            'total_cases' => $totalCases,
            'total_claim_amount' => $totalAmount,
            'clean_claim_rate' => $cleanRate,
            'status' => 'exported',
            'created_by' => Auth::id(),
        ]);

        foreach ($visits as $v) {
            RcmClaimItem::create([
                'batch_id' => $batch->id,
                'claim_type' => 'CSOP',
                'scheme_code' => 'OFC',
                'vn' => $v['vn'],
                'hn' => $v['hn'],
                'pid' => $v['cid'],
                'patient_name' => $v['patient_name'],
                'service_date' => $v['visit_date'],
                'pttype' => $v['pttype'],
                'pttype_name' => $v['pttype_name'],
                'total_amount' => $v['total_amount'],
                'claim_amount' => $v['claim_amount'],
                'auth_code' => $v['auth_code'],
                'audit_status' => $v['audit_status'],
                'audit_findings' => $v['findings'],
            ]);
        }

        return $batch;
    }

    /**
     * สร้างชุดข้อมูลส่งออก CSOP XML ตามมาตรฐาน สกส. / กรมบัญชีกลาง
     */
    public function generateCsopXml(array $visits): string
    {
        $hospCode = config('app.hospital_code', '11251');
        $xml = new \SimpleXMLElement('<?xml version="1.0" encoding="windows-874"?><CSOPClaim></CSOPClaim>');
        $header = $xml->addChild('Header');
        $header->addChild('HCode', $hospCode);
        $header->addChild('DocDate', date('Y-m-d'));
        $header->addChild('DocTime', date('H:i:s'));
        $header->addChild('TotalCount', (string) count($visits));

        $claims = $xml->addChild('Claims');
        foreach ($visits as $v) {
            $claim = $claims->addChild('Claim');
            $claim->addChild('VN', (string) ($v['vn'] ?? ''));
            $claim->addChild('HN', (string) ($v['raw_hn'] ?? ''));
            $claim->addChild('PID', (string) ($v['raw_cid'] ?? ''));
            $claim->addChild('VisitDate', (string) ($v['visit_date'] ?? ''));
            $claim->addChild('Pdx', (string) ($v['pdx'] ?? ''));
            $claim->addChild('ClaimAmount', number_format((float) ($v['claim_amount'] ?? 0), 2, '.', ''));
            $claim->addChild('AuthCode', (string) ($v['auth_code'] ?? ''));
        }

        return $xml->asXML();
    }
}
