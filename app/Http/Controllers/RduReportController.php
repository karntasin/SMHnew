<?php

namespace App\Http\Controllers;

use App\Models\RduCaseAudit;
use App\Services\RduDrugService;
use App\Services\RduReportService;
use Box\Spout\Writer\Common\Creator\WriterEntityFactory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RduReportController extends Controller
{
    public function __construct(
        private RduReportService $rdu,
        private RduDrugService $drugs,
    ) {}

    public function index(Request $request): Response
    {
        [$start, $end] = $this->parseDates($request);
        $data = $this->rdu->dashboard($start, $end);

        return Inertia::render('Rdu/Dashboard', [
            'connection' => $data['connection'],
            'filter' => [
                'start_date' => $start,
                'end_date' => $end,
                'start_date_label' => $this->formatThaiDateLabel($start),
                'end_date_label' => $this->formatThaiDateLabel($end),
            ],
            'summary' => $data['summary'],
            'indicators' => $data['indicators'],
            'chart' => $data['chart'],
            'audit_statuses' => config('rdu.audit_statuses'),
        ]);
    }

    public function cases(Request $request): Response
    {
        [$start, $end] = $this->parseDates($request);
        $indicatorId = (string) $request->query('indicator', 'uri_ab');
        $page = max(1, (int) $request->query('page', 1));
        $perPage = min(100, max(10, (int) $request->query('per_page', 50)));
        $department = $request->query('department');

        $result = $this->rdu->cases($indicatorId, $start, $end, $page, $perPage, $department ?: null);

        $vns = collect($result['rows'])->pluck('vn')->filter()->all();
        $audits = RduCaseAudit::query()
            ->where('indicator_id', $indicatorId)
            ->whereIn('vn', $vns)
            ->with('reviewer:id,name')
            ->get()
            ->keyBy('vn');

        $rows = collect($result['rows'])->map(function (array $row) use ($audits) {
            $audit = $audits->get($row['vn']);

            return array_merge($row, [
                'audit_status' => $audit?->status ?? 'pending',
                'audit_notes' => $audit?->notes,
                'reviewed_by_name' => $audit?->reviewer?->name,
                'reviewed_at' => $audit?->reviewed_at?->toDateTimeString(),
            ]);
        })->all();

        return Inertia::render('Rdu/Cases', [
            'connection' => $this->rdu->connectionStatus(),
            'filter' => [
                'start_date' => $start,
                'end_date' => $end,
                'start_date_label' => $this->formatThaiDateLabel($start),
                'end_date_label' => $this->formatThaiDateLabel($end),
                'indicator' => $indicatorId,
                'department' => $department,
                'page' => $page,
                'per_page' => $perPage,
            ],
            'indicator' => $result['indicator'],
            'indicators' => $this->rdu->indicatorCatalog(),
            'rows' => $rows,
            'total' => $result['total'],
            'audit_statuses' => config('rdu.audit_statuses'),
        ]);
    }

    public function storeAudit(Request $request)
    {
        $data = $request->validate([
            'indicator_id' => 'required|string|max:64',
            'vn' => 'required|string|max:32',
            'hn' => 'nullable|string|max:32',
            'vstdate' => 'nullable|date',
            'status' => 'required|string|in:'.implode(',', array_keys(config('rdu.audit_statuses', []))),
            'notes' => 'nullable|string|max:2000',
            'snapshot' => 'nullable|array',
        ]);

        if (! $this->rdu->getIndicator($data['indicator_id'])) {
            return response()->json(['message' => 'ตัวชี้วัดไม่ถูกต้อง'], 422);
        }

        $audit = RduCaseAudit::updateOrCreate(
            [
                'indicator_id' => $data['indicator_id'],
                'vn' => $data['vn'],
            ],
            [
                'hn' => $data['hn'] ?? null,
                'vstdate' => $data['vstdate'] ?? null,
                'status' => $data['status'],
                'notes' => $data['notes'] ?? null,
                'snapshot' => $data['snapshot'] ?? null,
                'reviewed_by' => Auth::id(),
                'reviewed_at' => now(),
            ]
        );

        $audit->load('reviewer:id,name');

        return response()->json([
            'ok' => true,
            'audit' => [
                'audit_status' => $audit->status,
                'audit_notes' => $audit->notes,
                'reviewed_by_name' => $audit->reviewer?->name,
                'reviewed_at' => $audit->reviewed_at?->toDateTimeString(),
            ],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        [$start, $end] = $this->parseDates($request);
        $indicatorId = (string) $request->query('indicator', 'uri_ab');
        $indicator = $this->rdu->getIndicator($indicatorId);
        $rows = $this->rdu->exportCases($indicatorId, $start, $end);

        $filename = 'rdu_'.$indicatorId.'_'.$start.'_'.$end.'.xlsx';

        return response()->streamDownload(function () use ($rows, $indicator) {
            $writer = WriterEntityFactory::createXLSXWriter();
            $writer->openToFile('php://output');

            $writer->addRow(WriterEntityFactory::createRowFromArray([
                'ตัวชี้วัด',
                $indicator['name_th'] ?? ($indicator['name'] ?? ''),
            ]));
            $writer->addRow(WriterEntityFactory::createRowFromArray([
                'VN', 'HN', 'วันที่', 'เวลา', 'ชื่อผู้ป่วย', 'อายุ', 'เพศ',
                'แผนก', 'สาขา', 'แพทย์', 'ICD-10', 'ยา',
            ]));

            foreach ($rows as $row) {
                $writer->addRow(WriterEntityFactory::createRowFromArray([
                    $row->vn,
                    $row->hn,
                    $row->vstdate,
                    $row->vsttime,
                    $row->patient_name,
                    $row->age_y,
                    $row->sex,
                    $row->department_name,
                    $row->specialty_name,
                    $row->doctor_name,
                    $row->icd10_list,
                    $row->drug_list,
                ]));
            }

            $writer->close();
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function drugs(Request $request): Response
    {
        [$start, $end] = $this->parseDates($request);
        $data = $this->drugs->utilizationDashboard($start, $end);

        return Inertia::render('Rdu/DrugDashboard', array_merge($this->drugPageProps($start, $end, $data), [
            'summary' => $data['summary'],
            'top_drugs' => $data['top_drugs'],
            'monthly_trend' => $data['monthly_trend'],
            'opd_ipd' => $data['opd_ipd'],
            'high_risk' => $data['high_risk'],
        ]));
    }

    public function antibiotics(Request $request): Response
    {
        [$start, $end] = $this->parseDates($request);
        $data = $this->drugs->antibioticReport($start, $end);

        return Inertia::render('Rdu/Antibiotics', array_merge($this->drugPageProps($start, $end, $data), [
            'summary' => $data['summary'],
            'top_antibiotics' => $data['top_antibiotics'],
            'by_therapeutic_group' => $data['by_therapeutic_group'],
            'monthly_trend' => $data['monthly_trend'],
            'rdu_indicators' => $data['rdu_indicators'],
        ]));
    }

    public function drugsByDepartment(Request $request): Response
    {
        [$start, $end] = $this->parseDates($request);
        $visitType = $request->query('visit_type');
        if (! in_array($visitType, ['opd', 'ipd'], true)) {
            $visitType = null;
        }

        $data = $this->drugs->byDepartment($start, $end, $visitType);

        return Inertia::render('Rdu/ByDepartment', array_merge($this->drugPageProps($start, $end, $data), [
            'visit_type' => $visitType,
            'departments' => $data['departments'],
            'doctors' => $data['doctors'],
        ]));
    }

    public function exportDrugs(Request $request): StreamedResponse
    {
        [$start, $end] = $this->parseDates($request);
        $rows = $this->drugs->exportTopDrugs($start, $end);
        $filename = 'rdu_top_drugs_'.$start.'_'.$end.'.xlsx';

        return response()->streamDownload(function () use ($rows) {
            $writer = WriterEntityFactory::createXLSXWriter();
            $writer->openToFile('php://output');
            $writer->addRow(WriterEntityFactory::createRowFromArray([
                'รหัสยา', 'ชื่อยา', 'กลุ่มเวชภัณฑ์', 'จำนวน', 'ครั้งใช้', 'ผู้ป่วย', 'มูลค่า (บาท)',
            ]));

            foreach ($rows as $row) {
                $writer->addRow(WriterEntityFactory::createRowFromArray([
                    $row->drug_code,
                    $row->drug_name,
                    $row->therapeutic_group,
                    $row->total_qty,
                    $row->visits,
                    $row->patients,
                    $row->total_amount,
                ]));
            }

            $writer->close();
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    private function drugPageProps(string $start, string $end, array $data): array
    {
        return [
            'connection' => $data['connection'],
            'filter' => [
                'start_date' => $start,
                'end_date' => $end,
                'start_date_label' => $this->formatThaiDateLabel($start),
                'end_date_label' => $this->formatThaiDateLabel($end),
            ],
        ];
    }

    private function parseDates(Request $request): array
    {
        $start = $request->query('start_date');
        $end = $request->query('end_date');

        if (! $start || ! $end) {
            $endDate = date('Y-m-d');
            $startDate = date('Y-m-d', strtotime('-1 month', strtotime($endDate)));

            return [$startDate, $endDate];
        }

        if (strtotime($start) > strtotime($end)) {
            [$start, $end] = [$end, $start];
        }

        return [$start, $end];
    }

    private function formatThaiDateLabel(string $iso): string
    {
        $months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        $ts = strtotime($iso);
        if (! $ts) {
            return $iso;
        }

        return date('j', $ts).' '.$months[(int) date('n', $ts) - 1].' '.(date('Y', $ts) + 543);
    }
}
