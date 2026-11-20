<?php

namespace App\Services\Rcm;

use App\Models\Rcm\RcmClaimBatch;
use App\Models\Rcm\RcmClaimItem;
use Illuminate\Support\Facades\Auth;

class RcmCipnService
{
    public function __construct(
        protected readonly RcmHosxpService $hosxpService,
        protected readonly RcmSmartScrubberService $scrubberService,
    ) {}

    /**
     * ดึงและประมวลผลข้อมูล CIPN ผู้ป่วยใน พร้อม Scrubber Analysis และรองรับแยกกองทุน
     */
    public function getScrubbedAdmissions(string $startDate, string $endDate, string $scheme = 'cgd'): array
    {
        $rawVisits = $this->hosxpService->fetchCipnAdmissions($startDate, $endDate, $scheme);
        $scrubbed = [];

        $totalCases = count($rawVisits);
        $cleanCases = 0;
        $warningCases = 0;
        $errorCases = 0;
        $totalClaim = 0;

        foreach ($rawVisits as $visit) {
            $audit = $this->scrubberService->auditVisit($visit, 'CIPN');
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

            $totalClaim += (float) ($visit['claim_amount'] ?? 0);
            $scrubbed[] = $visit;
        }

        $cleanRate = $totalCases > 0 ? round(($cleanCases / $totalCases) * 100, 2) : 0;

        return [
            'items' => $scrubbed,
            'summary' => [
                'total_cases' => $totalCases,
                'clean_cases' => $cleanCases,
                'warning_cases' => $warningCases,
                'error_cases' => $errorCases,
                'clean_claim_rate' => $cleanRate,
                'total_claim_amount' => $totalClaim,
            ],
        ];
    }

    /**
     * สร้าง Batch ส่งออก CIPN Claim และบันทึกลงในฐานข้อมูล SMH
     */
    public function createBatch(string $startDate, string $endDate, array $ans = []): RcmClaimBatch
    {
        $batchNo = 'CIPN-'.date('Ymd').'-'.strtoupper(substr(uniqid(), -4));
        $scrubbedData = $this->getScrubbedAdmissions($startDate, $endDate);
        $visits = $scrubbedData['items'];

        if (! empty($ans)) {
            $visits = array_filter($visits, fn ($v) => in_array($v['an'], $ans));
        }

        $totalCases = count($visits);
        $totalAmount = array_sum(array_column($visits, 'claim_amount'));
        $cleanCount = count(array_filter($visits, fn ($v) => $v['audit_status'] === 'pass'));
        $cleanRate = $totalCases > 0 ? round(($cleanCount / $totalCases) * 100, 2) : 0;

        $batch = RcmClaimBatch::create([
            'batch_no' => $batchNo,
            'claim_type' => 'CIPN',
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
                'claim_type' => 'CIPN',
                'scheme_code' => 'OFC',
                'an' => $v['an'],
                'hn' => $v['hn'],
                'pid' => $v['cid'],
                'patient_name' => $v['patient_name'],
                'service_date' => $v['dchdate'],
                'pttype' => $v['pttype'],
                'pttype_name' => $v['pttype_name'],
                'total_amount' => $v['total_amount'],
                'claim_amount' => $v['claim_amount'],
                'drg' => $v['drg'],
                'adj_rw' => $v['adj_rw'],
                'auth_code' => $v['auth_code'],
                'project_code' => $v['project_code'],
                'audit_status' => $v['audit_status'],
                'audit_findings' => $v['findings'],
            ]);
        }

        return $batch;
    }

    /**
     * สร้างชุดข้อมูลส่งออก CIPN XML ตามมาตรฐาน กรมบัญชีกลาง / สกส.
     */
    public function generateCipnXml(array $admissions): string
    {
        $hospCode = config('app.hospital_code', '11251');
        $xml = new \SimpleXMLElement('<?xml version="1.0" encoding="windows-874"?><CIPNClaim></CIPNClaim>');
        $header = $xml->addChild('Header');
        $header->addChild('HCode', $hospCode);
        $header->addChild('DocDate', date('Y-m-d'));
        $header->addChild('DocTime', date('H:i:s'));
        $header->addChild('TotalCount', (string) count($admissions));

        $claims = $xml->addChild('Claims');
        foreach ($admissions as $v) {
            $claim = $claims->addChild('Claim');
            $claim->addChild('AN', (string) ($v['an'] ?? ''));
            $claim->addChild('HN', (string) ($v['raw_hn'] ?? ''));
            $claim->addChild('PID', (string) ($v['raw_cid'] ?? ''));
            $claim->addChild('DischargeDate', (string) ($v['dchdate'] ?? ''));
            $claim->addChild('LOS', (string) ($v['los'] ?? 1));
            $claim->addChild('DRG', (string) ($v['drg'] ?? ''));
            $claim->addChild('AdjRW', number_format((float) ($v['adj_rw'] ?? 0), 4, '.', ''));
            $claim->addChild('ClaimAmount', number_format((float) ($v['claim_amount'] ?? 0), 2, '.', ''));
            $claim->addChild('AuthCode', (string) ($v['auth_code'] ?? ''));
            $claim->addChild('ProjectCode', (string) ($v['project_code'] ?? ''));
        }

        return $xml->asXML();
    }
}
