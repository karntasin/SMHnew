<?php

namespace App\Http\Controllers\Rcm;

use App\Http\Controllers\Controller;
use App\Models\Rcm\RcmAuditRule;
use App\Services\Rcm\RcmCipnService;
use App\Services\Rcm\RcmCsopService;
use App\Services\Rcm\RcmHosxpService;
use App\Services\Rcm\RcmReportService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RcmScrubberController extends Controller
{
    public function __construct(
        protected readonly RcmHosxpService $hosxpService,
        protected readonly RcmCsopService $csopService,
        protected readonly RcmCipnService $cipnService,
        protected readonly RcmReportService $reportService,
    ) {}

    public function index(Request $request): Response
    {
        $tab = $request->query('tab', 'c-audit'); // 'c-audit' (ตรวจติด C / error) หรือ 'ned' (ตรวจยานอกบัญชี)
        $startDate = $request->query('start_date', date('Y-m-d'));
        $endDate = $request->query('end_date', date('Y-m-d'));
        $type = $request->query('type', 'CSOP'); // CSOP หรือ CIPN
        $scheme = $request->query('scheme', 'cgd'); // cgd, lgo, ucs, sss, all
        $status = $request->query('status', 'missing'); // สำหรับแท็บ NED: missing, has_reason, all
        $serviceType = $request->query('service_type', 'ALL'); // สำหรับแท็บ NED: ALL, CSOP, CIPN

        $items = [];
        $summary = [];
        $topDrugs = [];
        $topDoctors = [];

        $errorBreakdown = [];

        if ($tab === 'ned') {
            // ระบบตรวจรายการยานอกบัญชี (NED Reason Audit) แยกเด็ดขาดจากตรวจติด C
            if ($this->hosxpService->available()) {
                $nedResult = $this->hosxpService->fetchNedPrescriptionAudit(
                    $startDate,
                    $endDate,
                    $scheme,
                    $serviceType,
                    $status
                );
                $items = $nedResult['items'];
                $summary = $nedResult['summary'];
                $topDrugs = $nedResult['top_drugs'];
                $topDoctors = $nedResult['top_doctors'];
            } else {
                $summary = [
                    'total_cases' => 0,
                    'total_patients' => 0,
                    'total_ned_items' => 0,
                    'total_ned_amount' => 0,
                    'missing_reason_items' => 0,
                    'missing_reason_amount' => 0,
                    'has_reason_items' => 0,
                    'has_reason_amount' => 0,
                    'compliance_rate' => 0,
                ];
            }
        } else {
            // ระบบตรวจข้อผิดพลาดและติด C (Rules Scrubber)
            $summary = [
                'total_cases' => 0,
                'clean_cases' => 0,
                'warning_cases' => 0,
                'error_cases' => 0,
                'clean_claim_rate' => 0,
                'total_claim_amount' => 0,
            ];

            if ($this->hosxpService->available()) {
                if ($type === 'CIPN') {
                    $result = $this->cipnService->getScrubbedAdmissions($startDate, $endDate, $scheme);
                } else {
                    $result = $this->csopService->getScrubbedVisits($startDate, $endDate, $scheme);
                }
                $items = $result['items'];
                $summary = $result['summary'];

                // รวบรวมสรุปจำแนกสถิติตามรหัส Error / Rule Code (Error Breakdown)
                $breakdownMap = [];
                foreach ($items as $it) {
                    if (! empty($it['findings'])) {
                        $seen = [];
                        foreach ($it['findings'] as $f) {
                            $code = $f['rule_code'];
                            if (isset($seen[$code])) {
                                continue;
                            }
                            $seen[$code] = true;

                            if (! isset($breakdownMap[$code])) {
                                $breakdownMap[$code] = [
                                    'rule_code' => $code,
                                    'rule_name' => $f['rule_name'] ?? $code,
                                    'severity' => $f['severity'] ?? 'error',
                                    'count' => 0,
                                    'amount' => 0.0,
                                ];
                            }
                            $breakdownMap[$code]['count']++;
                            $breakdownMap[$code]['amount'] += (float) ($it['claim_amount'] ?? 0);
                        }
                    }
                }
                usort($breakdownMap, fn ($a, $b) => $b['count'] <=> $a['count'] ?: $b['amount'] <=> $a['amount']);
                $errorBreakdown = array_values($breakdownMap);
            }
        }

        $rules = RcmAuditRule::where('is_active', true)->get();

        return Inertia::render('Rcm/SmartScrubber', [
            'tab' => $tab,
            'filters' => [
                'tab' => $tab,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'type' => $type,
                'scheme' => $scheme,
                'status' => $status,
                'service_type' => $serviceType,
                'error_code' => $request->query('error_code', 'all'),
            ],
            'items' => $items,
            'summary' => $summary,
            'error_breakdown' => $errorBreakdown,
            'top_drugs' => $topDrugs,
            'top_doctors' => $topDoctors,
            'rules' => $rules,
            'hosxp_ready' => $this->hosxpService->available(),
        ]);
    }

    public function exportExcel(Request $request): StreamedResponse
    {
        $startDate = $request->query('start_date', date('Y-m-d'));
        $endDate = $request->query('end_date', date('Y-m-d'));
        $type = $request->query('type', 'CSOP');
        $scheme = $request->query('scheme', 'cgd');
        $errorCode = $request->query('error_code', 'all');

        $result = $type === 'CIPN' 
            ? $this->cipnService->getScrubbedAdmissions($startDate, $endDate, $scheme)
            : $this->csopService->getScrubbedVisits($startDate, $endDate, $scheme);

        if ($errorCode !== 'all' && ! empty($errorCode)) {
            $result['items'] = array_values(array_filter($result['items'], function ($item) use ($errorCode) {
                foreach ($item['findings'] ?? [] as $f) {
                    if (($f['rule_code'] ?? '') === $errorCode) {
                        return true;
                    }
                }
                return false;
            }));
        }

        $headers = ['ลำดับ', 'VN/AN', 'HN', 'ชื่อผู้ป่วย', 'วันที่รับบริการ', 'รหัสโรคหลัก', 'ยอดตั้งเบิก', 'EDC/Auth Code', 'แหล่งที่มา EDC', 'สถานะ Audit', 'รหัสข้อผิดพลาดและคำแนะนำแก้ไข'];
        $rows = [];
        $index = 1;

        foreach ($result['items'] as $item) {
            $findingsText = '';
            foreach ($item['findings'] as $f) {
                $findingsText .= "[{$f['rule_code']} - {$f['severity']}] {$f['message']} ({$f['fix_instruction']}) | ";
            }

            $vnAn = (string) ($item['vn'] ?? ($item['an'] ?? ''));

            $rows[] = [
                $index++,
                $vnAn,
                (string) ($item['hn'] ?? ''),
                (string) ($item['patient_name'] ?? ''),
                (string) ($item['visit_date'] ?? ($item['dchdate'] ?? '')),
                (string) ($item['pdx'] ?? ''),
                number_format((float) ($item['claim_amount'] ?? 0), 2),
                (string) ($item['auth_code'] ?: '-'),
                (string) ($item['auth_source'] ?: '-'),
                (string) ($item['audit_status'] ?? ''),
                trim($findingsText, ' | '),
            ];
        }

        $codeSuffix = ($errorCode !== 'all' && ! empty($errorCode)) ? "_{$errorCode}" : '';
        $filename = "Pre_Claim_Scrubber_{$type}_{$scheme}{$codeSuffix}_{$startDate}_{$endDate}";
        $titleSuffix = ($errorCode !== 'all' && ! empty($errorCode)) ? " (เฉพาะรหัส {$errorCode})" : '';
        return $this->reportService->exportExcel("รายงานผลการตรวจก่อนเบิก (Pre-Claim Audit: ติด C / ข้อผิดพลาด){$titleSuffix} - {$type} กองทุน {$scheme}", $headers, $rows, $filename);
    }

    public function exportPdf(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $startDate = $request->query('start_date', date('Y-m-d'));
        $endDate = $request->query('end_date', date('Y-m-d'));
        $type = $request->query('type', 'CSOP');
        $scheme = $request->query('scheme', 'cgd');
        $errorCode = $request->query('error_code', 'all');

        $result = $type === 'CIPN' 
            ? $this->cipnService->getScrubbedAdmissions($startDate, $endDate, $scheme)
            : $this->csopService->getScrubbedVisits($startDate, $endDate, $scheme);

        if ($errorCode !== 'all' && ! empty($errorCode)) {
            $result['items'] = array_values(array_filter($result['items'], function ($item) use ($errorCode) {
                foreach ($item['findings'] ?? [] as $f) {
                    if (($f['rule_code'] ?? '') === $errorCode) {
                        return true;
                    }
                }
                return false;
            }));
        }

        $headers = ['ลำดับ', 'VN/AN', 'HN', 'ชื่อผู้ป่วย', 'วันที่', 'โรคหลัก', 'ยอดเบิก', 'EDC Code', 'สถานะ', 'สิ่งที่ตรวจพบ'];
        $rows = [];
        $index = 1;

        foreach ($result['items'] as $item) {
            $findingsText = '';
            foreach ($item['findings'] as $f) {
                $findingsText .= "[{$f['rule_code']}] {$f['message']} ";
            }

            $rows[] = [
                $index++,
                $item['vn'] ?? ($item['an'] ?? ''),
                $item['hn'],
                $item['patient_name'],
                $item['visit_date'] ?? ($item['dchdate'] ?? ''),
                $item['pdx'],
                number_format((float) ($item['claim_amount'] ?? 0), 2),
                $item['auth_code'] ?: '-',
                $item['audit_status'] === 'pass' ? 'ผ่าน' : ($item['audit_status'] === 'warning' ? 'เตือน' : 'ข้อผิดพลาด'),
                $findingsText ?: '-',
            ];
        }

        $codeSuffix = ($errorCode !== 'all' && ! empty($errorCode)) ? "_{$errorCode}" : '';
        $filename = "Pre_Claim_Scrubber_{$type}_{$scheme}{$codeSuffix}_{$startDate}_{$endDate}";
        $titleSuffix = ($errorCode !== 'all' && ! empty($errorCode)) ? " (เฉพาะรหัส {$errorCode})" : '';
        return $this->reportService->exportPdf("รายงานผลการตรวจก่อนเบิก (Pre-Claim Audit: ติด C / ข้อผิดพลาด){$titleSuffix} - {$type} กองทุน {$scheme}", $headers, $rows, $filename);
    }

    /**
     * ส่งออก Excel รายการยานอกบัญชี (NED) ที่ไม่มีเหตุผลการใช้ยา
     */
    public function exportNedExcel(Request $request): StreamedResponse
    {
        $startDate = $request->query('start_date', date('Y-m-d'));
        $endDate = $request->query('end_date', date('Y-m-d'));
        $scheme = $request->query('scheme', 'all');
        $status = $request->query('status', 'missing');
        $serviceType = $request->query('service_type', 'ALL');

        $result = $this->hosxpService->fetchNedPrescriptionAudit(
            $startDate,
            $endDate,
            $scheme,
            $serviceType,
            $status,
            5000
        );

        $headers = [
            'ลำดับ',
            'วันที่สั่งใช้ยา',
            'กลุ่มบริการ',
            'VN/AN',
            'HN',
            'ชื่อผู้ป่วย',
            'สิทธิการรักษา',
            'แผนก/ห้องตรวจ',
            'รหัสยา',
            'ชื่อยานอกบัญชี (NED)',
            'รหัส TMT',
            'จำนวน',
            'หน่วย',
            'ราคา/หน่วย',
            'ยอดรวม (บาท)',
            'แพทย์ผู้สั่งจ่าย',
            'สถานะเหตุผล',
            'เหตุผลการใช้ยา',
        ];

        $rows = [];
        $index = 1;

        foreach ($result['items'] as $item) {
            $rows[] = [
                $index++,
                (string) $item['vstdate'],
                (string) $item['service_type'],
                (string) ($item['vn'] ?: ($item['an'] ?: '-')),
                (string) $item['hn'],
                (string) $item['patient_name'],
                (string) $item['pttype_name'],
                (string) $item['department'],
                (string) $item['icode'],
                (string) $item['drug_name'],
                (string) ($item['tmt_code'] ?: '-'),
                number_format((float) $item['qty'], 2),
                (string) $item['units'],
                number_format((float) $item['unitprice'], 2),
                number_format((float) $item['sum_price'], 2),
                (string) $item['doctor_name'],
                $item['has_reason'] ? 'มีเหตุผลแล้ว' : 'ยังไม่ระบุเหตุผล',
                (string) $item['reason_display'],
            ];
        }

        $statusLabel = $status === 'missing' ? 'เฉพาะขาดเหตุผล' : ($status === 'has_reason' ? 'เฉพาะมีเหตุผล' : 'ทั้งหมด');
        $filename = "Pre_Claim_NED_Audit_{$scheme}_{$status}_{$startDate}_{$endDate}";
        return $this->reportService->exportExcel("รายงานตรวจสอบยานอกบัญชี (NED) ก่อนเบิก ({$statusLabel}) - กองทุน {$scheme}", $headers, $rows, $filename);
    }

    /**
     * ส่งออก PDF รายการยานอกบัญชี (NED) ที่ไม่มีเหตุผลการใช้ยา
     */
    public function exportNedPdf(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $startDate = $request->query('start_date', date('Y-m-d'));
        $endDate = $request->query('end_date', date('Y-m-d'));
        $scheme = $request->query('scheme', 'all');
        $status = $request->query('status', 'missing');
        $serviceType = $request->query('service_type', 'ALL');

        $result = $this->hosxpService->fetchNedPrescriptionAudit(
            $startDate,
            $endDate,
            $scheme,
            $serviceType,
            $status,
            1000
        );

        $headers = ['ลำดับ', 'วันที่', 'VN/AN', 'HN', 'ชื่อผู้ป่วย', 'สิทธิ', 'ยานอกบัญชี', 'จำนวน', 'ยอดเงิน', 'แพทย์ผู้สั่ง', 'สถานะเหตุผล'];
        $rows = [];
        $index = 1;

        foreach ($result['items'] as $item) {
            $rows[] = [
                $index++,
                $item['vstdate'],
                $item['vn'] ?: ($item['an'] ?: '-'),
                $item['hn'],
                $item['patient_name'],
                $item['pttype_name'],
                $item['drug_name'],
                number_format((float) $item['qty'], 0) . ' ' . $item['units'],
                number_format((float) $item['sum_price'], 2),
                $item['doctor_name'],
                $item['has_reason'] ? ($item['reason_code'] ?: 'มีเหตุผล') : 'ไม่มีเหตุผล',
            ];
        }

        $statusLabel = $status === 'missing' ? 'เฉพาะขาดเหตุผล' : ($status === 'has_reason' ? 'เฉพาะมีเหตุผล' : 'ทั้งหมด');
        $filename = "Pre_Claim_NED_Audit_{$scheme}_{$status}_{$startDate}_{$endDate}";
        return $this->reportService->exportPdf("รายงานตรวจสอบยานอกบัญชี (NED) ก่อนเบิก ({$statusLabel}) - กองทุน {$scheme}", $headers, $rows, $filename);
    }
}
