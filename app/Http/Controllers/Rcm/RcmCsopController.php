<?php

namespace App\Http\Controllers\Rcm;

use App\Http\Controllers\Controller;
use App\Services\Rcm\RcmCsopService;
use App\Services\Rcm\RcmHosxpService;
use App\Services\Rcm\RcmReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RcmCsopController extends Controller
{
    public function __construct(
        protected readonly RcmHosxpService $hosxpService,
        protected readonly RcmCsopService $csopService,
        protected readonly RcmReportService $reportService,
    ) {}

    public function index(Request $request): Response
    {
        $startDate = $request->query('start_date', date('Y-m-d'));
        $endDate = $request->query('end_date', date('Y-m-d'));
        $scheme = $request->query('scheme', 'cgd');
        $onlyClaimable = $request->boolean('only_claimable', true);
        $serviceScope = $request->query('service_scope', 'general');

        $data = $this->csopService->getScrubbedVisits($startDate, $endDate, $scheme, $onlyClaimable, 1000, $serviceScope);

        return Inertia::render('Rcm/CsopIndex', [
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'scheme' => $scheme,
                'only_claimable' => $onlyClaimable,
                'service_scope' => $serviceScope,
            ],
            'items' => $data['items'],
            'summary' => $data['summary'],
            'hosxp_ready' => $this->hosxpService->available(),
        ]);
    }

    public function show(string $vn): JsonResponse
    {
        $items = $this->hosxpService->fetchCsopRxItems($vn);
        return response()->json(['items' => $items]);
    }

    public function exportBatch(Request $request)
    {
        $startDate = $request->input('start_date', date('Y-m-d'));
        $endDate = $request->input('end_date', date('Y-m-d'));
        $vns = $request->input('vns', []);
        $scheme = $request->input('scheme', 'cgd');
        $serviceScope = $request->input('service_scope', 'general');

        $batch = $this->csopService->createBatch($startDate, $endDate, $vns, $scheme, $serviceScope);
        $data = $this->csopService->getScrubbedVisits($startDate, $endDate, $scheme, true, 5000, $serviceScope);
        $xmlContent = $this->csopService->generateCsopXml($data['items']);

        return response($xmlContent, 200, [
            'Content-Type' => 'application/xml',
            'Content-Disposition' => 'attachment; filename="'.$batch->batch_no.'.xml"',
        ]);
    }

    public function exportSummaryExcel(Request $request): StreamedResponse
    {
        $startDate = $request->query('start_date', date('Y-m-d'));
        $endDate = $request->query('end_date', date('Y-m-d'));
        $scheme = $request->query('scheme', 'cgd');
        $onlyClaimable = $request->boolean('only_claimable', true);
        $serviceScope = $request->query('service_scope', 'general');

        $data = $this->csopService->getScrubbedVisits($startDate, $endDate, $scheme, $onlyClaimable, 5000, $serviceScope);
        $headers = [
            'ลำดับ', 'VN', 'HN', 'ชื่อผู้ป่วย', 'วันที่รับบริการ', 'เวลา', 'แผนก', 'สิทธิ',
            'ค่ายา (Drug)', 'อวัยวะเทียม (Organ)', 'ค่าบริการ (Service)', 'ยอดรวม (Total)',
            'ชำระเอง (Payment)', 'ลูกหนี้สิทธิ (Debt)', 'ใบเสร็จ (*)', 'เลขขออนุมัติ (EDC)', 'แหล่งที่มา EDC', 'สถานะ Audit'
        ];
        $rows = [];
        $i = 1;

        foreach ($data['items'] as $item) {
            $rows[] = [
                $i++,
                $item['vn'],
                $item['hn'],
                $item['patient_name'],
                $item['visit_date'],
                substr($item['visit_time'] ?? '', 0, 5),
                $item['department'] ?? '',
                $item['pttype_name'] ?? $item['pttype'],
                number_format((float) ($item['drug'] ?? $item['drug_total'] ?? 0), 2),
                number_format((float) ($item['artificial_organ'] ?? 0), 2),
                number_format((float) ($item['service_charge'] ?? 0), 2),
                number_format((float) ($item['total'] ?? $item['total_amount'] ?? 0), 2),
                number_format((float) ($item['payment'] ?? $item['paid_amount'] ?? 0), 2),
                number_format((float) ($item['debt'] ?? $item['claim_amount'] ?? 0), 2),
                $item['no_finance_number'] ?? '',
                $item['auth_code'] ?: '-',
                $item['auth_source'] ?: '-',
                $item['audit_status'],
            ];
        }

        $scopeLabel = match ($serviceScope) {
            'hemodialysis' => 'เฉพาะหน่วยไตเทียม',
            'all' => 'รวมทั้งหมด',
            default => 'ผู้ป่วยนอกทั่วไป',
        };

        return $this->reportService->exportExcel(
            "รายงานสรุปการเรียกเก็บ CSOP ({$scopeLabel}) กองทุน {$scheme} ({$startDate} ถึง {$endDate})",
            $headers,
            $rows,
            "RCM_CSOP_Summary_{$scheme}_{$serviceScope}_{$startDate}_{$endDate}"
        );
    }

    public function exportSummaryPdf(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $startDate = $request->query('start_date', date('Y-m-d'));
        $endDate = $request->query('end_date', date('Y-m-d'));
        $scheme = $request->query('scheme', 'cgd');
        $onlyClaimable = $request->boolean('only_claimable', true);
        $serviceScope = $request->query('service_scope', 'general');

        $data = $this->csopService->getScrubbedVisits($startDate, $endDate, $scheme, $onlyClaimable, 5000, $serviceScope);
        $headers = ['ลำดับ', 'VN', 'HN', 'ชื่อผู้ป่วย', 'วันที่', 'แผนก', 'ค่ายา', 'อวัยวะ', 'บริการ', 'ยอดรวม', 'ชำระเอง', 'ลูกหนี้', 'EDC', 'Audit'];
        $rows = [];
        $i = 1;

        foreach ($data['items'] as $item) {
            $rows[] = [
                $i++,
                $item['vn'],
                $item['hn'],
                $item['patient_name'],
                $item['visit_date'],
                $item['department'] ?? '',
                number_format((float) ($item['drug'] ?? $item['drug_total'] ?? 0), 2),
                number_format((float) ($item['artificial_organ'] ?? 0), 2),
                number_format((float) ($item['service_charge'] ?? 0), 2),
                number_format((float) ($item['total'] ?? $item['total_amount'] ?? 0), 2),
                number_format((float) ($item['payment'] ?? $item['paid_amount'] ?? 0), 2),
                number_format((float) ($item['debt'] ?? $item['claim_amount'] ?? 0), 2),
                $item['auth_code'] ?: '-',
                $item['audit_status'],
            ];
        }

        $scopeLabel = match ($serviceScope) {
            'hemodialysis' => 'เฉพาะหน่วยไตเทียม',
            'all' => 'รวมทั้งหมด',
            default => 'ผู้ป่วยนอกทั่วไป',
        };

        return $this->reportService->exportPdf(
            "รายงานสรุปการเรียกเก็บ CSOP ({$scopeLabel}) กองทุน {$scheme} ({$startDate} ถึง {$endDate})",
            $headers,
            $rows,
            "RCM_CSOP_Summary_{$scheme}_{$serviceScope}_{$startDate}_{$endDate}"
        );
    }
}
