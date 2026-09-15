<?php

namespace App\Http\Controllers;

use App\Models\HosxpReportPreset;
use App\Models\HosxpScheduledReport;
use App\Services\HosxpConnectionService;
use App\Services\HosxpReportExportService;
use App\Services\HosxpReportService;
use App\Services\ThaiPdfService;
use Box\Spout\Common\Entity\Style\Color;
use Box\Spout\Writer\Common\Creator\Style\StyleBuilder;
use Box\Spout\Writer\Common\Creator\WriterEntityFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class HosxpReportController extends Controller
{
    public function __construct(
        private HosxpReportService $reports,
        private ThaiPdfService $pdf,
        private HosxpConnectionService $connection,
    ) {}

    public function index(): Response
    {
        $status = $this->reports->connectionStatus();
        $endDate = date('Y-m-d');
        $startDate = date('Y-m-d', strtotime('-1 month', strtotime($endDate)));
        $userId = Auth::id();

        return Inertia::render('HosxpReports/Index', [
            'connection' => $status,
            'reports' => $this->reports->reportCatalog(),
            'defaults' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'limit' => 5000,
            ],
            'filter_options' => $this->filterOptions(),
            'presets' => HosxpReportPreset::query()
                ->where(function ($q) use ($userId) {
                    $q->where('user_id', $userId)->orWhere('is_shared', true);
                })
                ->orderBy('name')
                ->get(['id', 'name', 'report_id', 'params', 'is_shared', 'user_id']),
            'scheduled_reports' => HosxpScheduledReport::query()
                ->where('user_id', $userId)
                ->orderByDesc('is_active')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function preview(Request $request): JsonResponse
    {
        $params = $this->validatedParams($request);

        try {
            return response()->json($this->reports->preview($params['report_id'], $params));
        } catch (\Throwable $e) {
            return response()->json(['error' => true, 'message' => $e->getMessage()], 422);
        }
    }

    public function generate(Request $request): StreamedResponse
    {
        return $this->streamExcel($this->validatedParams($request));
    }

    public function generatePdf(Request $request)
    {
        $params = $this->validatedParams($request);
        $reportId = $params['report_id'];

        try {
            $payload = $this->reports->exportPayload($reportId, $params, 500);
            [$fontRegularUri, $fontBoldUri] = $this->pdf->fontUris();

            $html = view('hosxp.report-pdf', [
                'title' => $this->reports->reportTitle($reportId),
                'headers' => $payload['headers'],
                'rows' => $payload['rows'],
                'startDate' => $params['start_date'] ?? '-',
                'endDate' => $params['end_date'] ?? '-',
                'total' => $payload['total'],
                'truncated' => $payload['truncated'],
                'generatedAt' => now()->timezone('Asia/Bangkok')->format('d/m/Y H:i:s'),
                'fontRegularUri' => $fontRegularUri,
                'fontBoldUri' => $fontBoldUri,
            ])->render();

            $binary = $this->pdf->render($html);
            $fileName = $reportId.'_'.date('Ymd_His').'.pdf';

            return response($binary, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="'.$fileName.'"',
            ]);
        } catch (\Throwable $e) {
            return response('ไม่สามารถสร้าง PDF: '.$e->getMessage(), 500);
        }
    }

    public function storePreset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'report_id' => 'required|string',
            'params' => 'required|array',
            'is_shared' => 'nullable|boolean',
        ]);

        $preset = HosxpReportPreset::create([
            'user_id' => Auth::id(),
            'name' => $data['name'],
            'report_id' => $data['report_id'],
            'params' => $data['params'],
            'is_shared' => $request->boolean('is_shared'),
        ]);

        return response()->json(['preset' => $preset]);
    }

    public function destroyPreset(HosxpReportPreset $preset): JsonResponse
    {
        if ($preset->user_id !== Auth::id() && ! Auth::user()?->hasRole(['admin', 'Admin'])) {
            abort(403);
        }
        $preset->delete();

        return response()->json(['ok' => true]);
    }

    public function storeScheduled(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'report_id' => 'required|string',
            'params' => 'nullable|array',
            'format' => 'required|in:xlsx,pdf',
            'frequency' => 'required|in:daily,weekly,monthly',
            'day_of_month' => 'nullable|integer|min:1|max:28',
            'day_of_week' => 'nullable|integer|min:0|max:6',
            'run_time' => 'nullable|date_format:H:i',
        ]);

        $schedule = HosxpScheduledReport::create([
            'user_id' => Auth::id(),
            'name' => $data['name'],
            'report_id' => $data['report_id'],
            'params' => $data['params'] ?? [],
            'format' => $data['format'],
            'frequency' => $data['frequency'],
            'day_of_month' => $data['day_of_month'] ?? 1,
            'day_of_week' => $data['day_of_week'] ?? 1,
            'run_time' => ($data['run_time'] ?? '06:00').':00',
            'is_active' => true,
            'next_run_at' => now(),
        ]);
        $schedule->update(['next_run_at' => $schedule->computeNextRun()]);

        return response()->json(['scheduled' => $schedule->fresh()]);
    }

    public function destroyScheduled(HosxpScheduledReport $scheduled): JsonResponse
    {
        if ($scheduled->user_id !== Auth::id()) {
            abort(403);
        }
        $scheduled->delete();

        return response()->json(['ok' => true]);
    }

    public function downloadScheduled(HosxpScheduledReport $scheduled)
    {
        if ($scheduled->user_id !== Auth::id() && ! Auth::user()?->hasRole(['admin', 'Admin'])) {
            abort(403);
        }
        if (! $scheduled->last_file_path) {
            abort(404, 'ยังไม่มีไฟล์รายงาน');
        }

        $path = storage_path('app/'.$scheduled->last_file_path);
        if (! file_exists($path)) {
            abort(404, 'ไม่พบไฟล์รายงาน');
        }

        return response()->download($path);
    }

    public function checkConnection(): JsonResponse
    {
        return response()->json($this->connection->check());
    }

    private function streamExcel(array $params): StreamedResponse
    {
        $reportId = $params['report_id'];
        $fileName = $reportId.'_'.date('Ymd_His').'.xlsx';

        return new StreamedResponse(function () use ($params, $reportId) {
            $writer = WriterEntityFactory::createXLSXWriter();
            $writer->openToFile('php://output');

            $titleStyle = (new StyleBuilder())->setFontBold()->setFontSize(12)->build();
            $metaStyle = (new StyleBuilder())->setFontSize(10)->setFontColor(Color::rgb(80, 80, 80))->build();
            $headerStyle = (new StyleBuilder())->setFontBold()->setBackgroundColor(Color::rgb(219, 234, 254))->build();

            try {
                $title = $this->reports->reportTitle($reportId);
                $writer->addRow(WriterEntityFactory::createRowFromArray(['รายงาน HOSxP: '.$title], $titleStyle));
                $writer->addRow(WriterEntityFactory::createRowFromArray([
                    'ช่วงวันที่',
                    ($params['start_date'] ?? '-').' ถึง '.($params['end_date'] ?? '-'),
                ], $metaStyle));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['ออกรายงานเมื่อ', date('Y-m-d H:i:s')], $metaStyle));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['']));

                $isHeader = true;
                $rowCount = 0;
                foreach ($this->reports->exportRows($reportId, $params) as $row) {
                    if ($isHeader) {
                        $writer->addRow(WriterEntityFactory::createRowFromArray($row, $headerStyle));
                        $isHeader = false;

                        continue;
                    }
                    $writer->addRow(WriterEntityFactory::createRowFromArray($row));
                    $rowCount++;
                }

                $writer->addRow(WriterEntityFactory::createRowFromArray(['']));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['จำนวนแถวข้อมูล', number_format($rowCount)], $metaStyle));
            } catch (\Throwable $e) {
                $writer->addRow(WriterEntityFactory::createRowFromArray(['ข้อผิดพลาด', $e->getMessage()]));
            }

            $writer->close();
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$fileName.'"',
        ]);
    }

    /** @return array<string, mixed> */
    private function validatedParams(Request $request): array
    {
        return $request->validate([
            'report_id' => 'required|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'limit' => 'nullable|integer|min:1|max:50000',
            'has_lab' => 'nullable|boolean',
            'has_drug' => 'nullable|boolean',
            'active_in_range' => 'nullable|boolean',
            'lab_item_name' => 'nullable|string|max:120',
            'lab_result_max' => 'nullable|numeric',
            'lab_result_min' => 'nullable|numeric',
            'drug_name' => 'nullable|string|max:120',
            'visit_type' => 'nullable|string|in:OPD,IPD,opd,ipd',
            'pttype' => 'nullable|string|max:20',
            'department' => 'nullable|string|max:20',
            'ward' => 'nullable|string|max:20',
            'admit_status' => 'nullable|string|in:active,discharged,all',
            'icd10' => 'nullable|string|max:10',
            'icd10_prefix' => 'nullable|string|max:10',
            'diagtype' => 'nullable|string|max:5',
            'hn' => 'nullable|string|max:20',
            'cid' => 'nullable|string|max:20',
            'name' => 'nullable|string|max:120',
        ]);
    }

    /** @return array<string, mixed> */
    private function filterOptions(): array
    {
        try {
            if (! $this->reports->connectionStatus()['connected']) {
                return ['pttypes' => [], 'departments' => [], 'wards' => []];
            }

            $conn = \Illuminate\Support\Facades\DB::connection('hosxp');

            return [
                'pttypes' => $conn->table('pttype')->select('pttype as code', 'name')->orderBy('name')->limit(200)->get(),
                'departments' => $conn->table('kskdepartment')->select('depcode as code', 'department as name')->orderBy('department')->limit(200)->get(),
                'wards' => $conn->table('ward')->select('ward as code', 'name')->orderBy('name')->limit(100)->get(),
            ];
        } catch (\Throwable) {
            return ['pttypes' => [], 'departments' => [], 'wards' => []];
        }
    }
}
