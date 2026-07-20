<?php

namespace App\Http\Controllers;

use App\Models\SettingApp;
use App\Services\DrugUsageService;
use App\Services\ThaiPdfService;
use Box\Spout\Writer\Common\Creator\WriterEntityFactory;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DrugUsageController extends Controller
{
    public function __construct(
        private DrugUsageService $drugUsage,
        private ThaiPdfService $pdf,
    ) {}

    public function index(Request $request): Response
    {
        @set_time_limit(120);
        [$start, $end] = $this->parseDates($request);
        $data = $this->drugUsage->dashboard($start, $end);

        return Inertia::render('DrugUsage/Dashboard', array_merge($this->pageProps($start, $end, $data), [
            'summary' => $data['summary'],
            'top_by_qty' => $data['top_by_qty'],
            'top_by_amount' => $data['top_by_amount'],
            'by_units' => $data['by_units'],
            'by_form' => $data['by_form'],
            'by_account' => $data['by_account'],
            'by_account_code' => $data['by_account_code'],
            'form_catalog' => $this->drugUsage->formCatalog(),
            'monthly_trend' => $data['monthly_trend'],
            'error' => $data['error'] ?? null,
        ]));
    }

    public function report(Request $request): Response
    {
        @set_time_limit(120);
        [$start, $end] = $this->parseDates($request);
        $search = $request->query('search');
        $unit = $request->query('unit');
        $form = $request->query('form');
        $page = max(1, (int) $request->query('page', 1));
        $perPage = min(100, max(20, (int) $request->query('per_page', 50)));

        $data = $this->drugUsage->usageReport(
            $start,
            $end,
            $search ?: null,
            $unit ?: null,
            $form ?: null,
            $page,
            $perPage,
        );

        return Inertia::render('DrugUsage/Report', array_merge($this->pageProps($start, $end, ['connection' => $this->drugUsage->connectionStatus()]), [
            'rows' => $data['rows'],
            'total' => $data['total'],
            'units' => $data['units'],
            'by_form' => $data['by_form'],
            'form_catalog' => $data['form_catalog'],
            'filters' => [
                'search' => $search ?? '',
                'unit' => $unit ?? 'all',
                'form' => $form && $form !== 'all' ? $form : 'all',
                'page' => $page,
                'per_page' => $perPage,
            ],
            'error' => $data['error'] ?? null,
        ]));
    }

    public function export(Request $request): StreamedResponse
    {
        @set_time_limit(180);
        [$start, $end] = $this->parseDates($request);
        [$search, $unit, $form] = $this->parseExportFilters($request);
        $rows = $this->drugUsage->exportRows($start, $end, $search, $unit, $form);
        $formLabel = $form ? ($this->drugUsage->formCatalog()[$form] ?? $form) : 'ทั้งหมด';
        $filename = 'drug_usage_'.$start.'_'.$end.'.xlsx';

        return response()->streamDownload(function () use ($rows, $start, $end, $formLabel) {
            $writer = WriterEntityFactory::createXLSXWriter();
            $writer->openToFile('php://output');

            $writer->addRow(WriterEntityFactory::createRowFromArray([
                'รายงานข้อมูลยาและการใช้ยา',
            ]));
            $writer->addRow(WriterEntityFactory::createRowFromArray([
                'ช่วงวันที่', $start.' ถึง '.$end,
            ]));
            $writer->addRow(WriterEntityFactory::createRowFromArray([
                'ประเภทยา', $formLabel,
            ]));
            $writer->addRow(WriterEntityFactory::createRowFromArray([]));
            $writer->addRow(WriterEntityFactory::createRowFromArray([
                'ประเภท', 'รหัสยา', 'ชื่อยา', 'ความแรง', 'หน่วย', 'ราคาต่อหน่วย', 'จำนวนรวม', 'มูลค่ารวม (บาท)',
            ]));

            $currentForm = null;
            $subQty = 0.0;
            $subAmount = 0.0;
            $grandQty = 0.0;
            $grandAmount = 0.0;

            $flushSubtotal = function () use ($writer, &$subQty, &$subAmount) {
                if ($subQty > 0 || $subAmount > 0) {
                    $writer->addRow(WriterEntityFactory::createRowFromArray([
                        '', '', '', '', 'รวมประเภท', '', $subQty, $subAmount,
                    ]));
                    $writer->addRow(WriterEntityFactory::createRowFromArray([]));
                }
                $subQty = 0.0;
                $subAmount = 0.0;
            };

            foreach ($rows as $row) {
                $rowForm = $row->form_label ?? $this->drugUsage->formLabel($this->drugUsage->classifyForm($row->units ?? null));
                if ($currentForm !== null && $currentForm !== $rowForm) {
                    $flushSubtotal();
                }
                $currentForm = $rowForm;

                $qty = (float) ($row->total_qty ?? 0);
                $amount = (float) ($row->total_amount ?? 0);
                $subQty += $qty;
                $subAmount += $amount;
                $grandQty += $qty;
                $grandAmount += $amount;

                $writer->addRow(WriterEntityFactory::createRowFromArray([
                    $rowForm,
                    $row->icode,
                    $row->name,
                    $row->strength,
                    $row->units,
                    $row->unitprice,
                    $qty,
                    $amount,
                ]));
            }

            $flushSubtotal();
            $writer->addRow(WriterEntityFactory::createRowFromArray([
                '', '', '', '', 'รวมทั้งหมด', '', $grandQty, $grandAmount,
            ]));

            $writer->close();
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function exportPdf(Request $request): HttpResponse
    {
        @set_time_limit(180);
        [$start, $end] = $this->parseDates($request);
        [$search, $unit, $form] = $this->parseExportFilters($request);

        try {
            $rows = $this->drugUsage->exportRows($start, $end, $search, $unit, $form);
            $grouped = $rows->groupBy(fn ($row) => $row->form_label ?? 'อื่นๆ');
            $byForm = $rows->groupBy(fn ($row) => $row->form ?? DrugUsageService::FORM_OTHER)
                ->map(function ($group, $key) {
                    return [
                        'form' => $key,
                        'label' => $group->first()->form_label ?? $this->drugUsage->formLabel((string) $key),
                        'drug_count' => $group->count(),
                        'total_qty' => (float) $group->sum('total_qty'),
                        'total_amount' => (float) $group->sum('total_amount'),
                    ];
                })
                ->sortBy(fn ($item) => match ($item['form']) {
                    'tablet' => 1,
                    'liquid' => 2,
                    'injection' => 3,
                    default => 4,
                })
                ->values()
                ->all();

            $setting = SettingApp::first();
            $appName = $setting?->nama_app ?? config('app.name');
            [$fontRegularUri, $fontBoldUri] = $this->pdf->fontUris();

            $html = view('drug-usage.report-pdf', [
                'rows' => $rows,
                'grouped' => $grouped,
                'byForm' => $byForm,
                'startDate' => $start,
                'endDate' => $end,
                'startLabel' => $this->formatThaiDateLabel($start),
                'endLabel' => $this->formatThaiDateLabel($end),
                'formLabel' => $form ? ($this->drugUsage->formCatalog()[$form] ?? $form) : 'ทั้งหมด',
                'generatedAt' => now()->timezone('Asia/Bangkok')->format('d/m/Y H:i:s'),
                'appName' => $appName,
                'fontRegularUri' => $fontRegularUri,
                'fontBoldUri' => $fontBoldUri,
                'totalQty' => (float) $rows->sum('total_qty'),
                'totalAmount' => (float) $rows->sum('total_amount'),
                'drugCount' => $rows->count(),
            ])->render();

            $pdfBinary = $this->pdf->render($html);

            return response($pdfBinary, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="drug_usage_'.$start.'_'.$end.'.pdf"',
            ]);
        } catch (\Throwable $e) {
            Log::error('Drug usage PDF export failed: '.$e->getMessage());

            return response('ไม่สามารถสร้างไฟล์ PDF ได้: '.$e->getMessage(), 500);
        }
    }

    /** @return array{0: ?string, 1: ?string, 2: ?string} */
    private function parseExportFilters(Request $request): array
    {
        $search = $request->query('search') ?: null;
        $unit = $request->query('unit');
        $unit = $unit && $unit !== 'all' ? $unit : null;
        $form = $request->query('form');
        $form = $form && $form !== 'all' ? $form : null;

        return [$search, $unit, $form];
    }

    private function pageProps(string $start, string $end, array $data): array
    {
        return [
            'connection' => $data['connection'] ?? $this->drugUsage->connectionStatus(),
            'filter' => [
                'start_date' => $start,
                'end_date' => $end,
                'start_date_label' => $this->formatThaiDateLabel($start),
                'end_date_label' => $this->formatThaiDateLabel($end),
            ],
        ];
    }

    /** @return array{0: string, 1: string} */
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
