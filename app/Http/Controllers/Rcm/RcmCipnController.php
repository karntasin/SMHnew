<?php

namespace App\Http\Controllers\Rcm;

use App\Http\Controllers\Controller;
use App\Services\Rcm\RcmCipnService;
use App\Services\Rcm\RcmHosxpService;
use App\Services\Rcm\RcmReportService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RcmCipnController extends Controller
{
    public function __construct(
        protected readonly RcmHosxpService $hosxpService,
        protected readonly RcmCipnService $cipnService,
        protected readonly RcmReportService $reportService,
    ) {}

    public function index(Request $request): Response
    {
        $startDate = $request->query('start_date', date('Y-m-d'));
        $endDate = $request->query('end_date', date('Y-m-d'));
        $scheme = $request->query('scheme', 'cgd');

        $data = $this->cipnService->getScrubbedAdmissions($startDate, $endDate, $scheme);

        return Inertia::render('Rcm/CipnIndex', [
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'scheme' => $scheme,
            ],
            'items' => $data['items'],
            'summary' => $data['summary'],
            'hosxp_ready' => $this->hosxpService->available(),
        ]);
    }

    public function exportBatch(Request $request)
    {
        $startDate = $request->input('start_date', date('Y-m-d'));
        $endDate = $request->input('end_date', date('Y-m-d'));
        $ans = $request->input('ans', []);
        $scheme = $request->input('scheme', 'cgd');

        $batch = $this->cipnService->createBatch($startDate, $endDate, $ans);
        $data = $this->cipnService->getScrubbedAdmissions($startDate, $endDate, $scheme);
        $xmlContent = $this->cipnService->generateCipnXml($data['items']);

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

        $data = $this->cipnService->getScrubbedAdmissions($startDate, $endDate, $scheme);
        $headers = ['ลำดับ', 'AN', 'HN', 'ชื่อผู้ป่วย', 'วันจำหน่าย', 'LOS', 'โรคหลัก', 'DRG', 'AdjRW', 'ยอดรวม', 'ยอดตั้งเบิก', 'Auth Code', 'Project Code', 'สถานะ Audit'];
        $rows = [];
        $i = 1;

        foreach ($data['items'] as $item) {
            $rows[] = [
                $i++,
                $item['an'],
                $item['hn'],
                $item['patient_name'],
                $item['dchdate'],
                $item['los'],
                $item['pdx'],
                $item['drg'] ?: '-',
                number_format((float) ($item['adj_rw'] ?? 0), 4),
                number_format((float) ($item['total_amount'] ?? 0), 2),
                number_format((float) ($item['claim_amount'] ?? 0), 2),
                $item['auth_code'] ?: '-',
                $item['project_code'] ?: '-',
                $item['audit_status'],
            ];
        }

        return $this->reportService->exportExcel(
            "รายงานสรุปการเรียกเก็บ CIPN ผู้ป่วยใน กองทุน {$scheme} ({$startDate} ถึง {$endDate})",
            $headers,
            $rows,
            "RCM_CIPN_Summary_{$scheme}_{$startDate}_{$endDate}"
        );
    }

    public function exportSummaryPdf(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $startDate = $request->query('start_date', date('Y-m-d'));
        $endDate = $request->query('end_date', date('Y-m-d'));
        $scheme = $request->query('scheme', 'cgd');

        $data = $this->cipnService->getScrubbedAdmissions($startDate, $endDate, $scheme);
        $headers = ['ลำดับ', 'AN', 'HN', 'ชื่อผู้ป่วย', 'จำหน่าย', 'LOS', 'DRG', 'AdjRW', 'ยอดเบิก', 'Auth Code', 'Audit'];
        $rows = [];
        $i = 1;

        foreach ($data['items'] as $item) {
            $rows[] = [
                $i++,
                $item['an'],
                $item['hn'],
                $item['patient_name'],
                $item['dchdate'],
                $item['los'],
                $item['drg'] ?: '-',
                number_format((float) ($item['adj_rw'] ?? 0), 4),
                number_format((float) ($item['claim_amount'] ?? 0), 2),
                $item['auth_code'] ?: '-',
                $item['audit_status'],
            ];
        }

        return $this->reportService->exportPdf(
            "รายงานสรุปการเรียกเก็บ CIPN ผู้ป่วยใน กองทุน {$scheme} ({$startDate} ถึง {$endDate})",
            $headers,
            $rows,
            "RCM_CIPN_Summary_{$scheme}_{$startDate}_{$endDate}"
        );
    }
}
