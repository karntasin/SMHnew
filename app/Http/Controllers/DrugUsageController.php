<?php

namespace App\Http\Controllers;

use App\Models\SettingApp;
use App\Services\DrugUsageService;
use App\Services\ThaiPdfService;
use Box\Spout\Writer\Common\Creator\WriterEntityFactory;
use Box\Spout\Writer\WriterInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Collection;
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

            $groupedByForm = $rows->groupBy(fn ($row) => $row->form ?? DrugUsageService::FORM_OTHER);
            $grandQty = (float) $rows->sum('total_qty');
            $grandAmount = (float) $rows->sum('total_amount');

            $writer->getCurrentSheet()->setName('สรุป');
            $this->writeDrugUsageSummarySheet($writer, $rows, $groupedByForm, $start, $end, $formLabel, $grandQty, $grandAmount);

            foreach ($this->drugUsage->formCatalog() as $formKey => $formName) {
                $formRows = $groupedByForm->get($formKey, collect());
                if ($formRows->isEmpty()) {
                    continue;
                }

                $writer->addNewSheetAndMakeItCurrent();
                $writer->getCurrentSheet()->setName($this->excelSheetName($formName));
                $this->writeDrugUsageFormSheet($writer, $formRows, $formName, $start, $end);
            }

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
            $grouped = $rows->groupBy(fn ($row) => ($row->form_label ?? 'อื่นๆ').' · '.($row->sub_form_label ?? '-'));
            $byForm = collect($this->drugUsage->formCatalog())->map(function ($label, $key) use ($rows) {
                $group = $rows->filter(fn ($row) => ($row->form ?? DrugUsageService::FORM_OTHER) === $key);
                $qty = (float) $group->sum('total_qty');
                $amount = (float) $group->sum('total_amount');

                $subGrouped = $group->groupBy(fn ($row) => $row->sub_form ?? 'other');
                $subtypes = collect($this->drugUsage->subFormCatalog()[$key] ?? [])
                    ->map(function ($subLabel, $subKey) use ($subGrouped) {
                        $subGroup = $subGrouped->get($subKey, collect());

                        return [
                            'sub_form' => $subKey,
                            'label' => $subLabel,
                            'drug_count' => $subGroup->count(),
                            'total_qty' => (float) $subGroup->sum('total_qty'),
                            'total_amount' => (float) $subGroup->sum('total_amount'),
                        ];
                    })
                    ->filter(fn ($item) => $item['drug_count'] > 0)
                    ->values()
                    ->all();

                return [
                    'form' => $key,
                    'label' => $label,
                    'drug_count' => $group->count(),
                    'total_qty' => $qty,
                    'total_amount' => $amount,
                    'subtypes' => $subtypes,
                ];
            })->filter(fn ($item) => $item['drug_count'] > 0)->values()->all();

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

    private function excelSheetName(string $name): string
    {
        $sanitized = preg_replace('/[\\\\\\/\\?\\*\\[\\]:]/', ' ', $name) ?? $name;

        return mb_substr(trim($sanitized), 0, 31);
    }

    /** @param Collection<string, Collection<int, object>> $groupedByForm */
    private function writeDrugUsageSummarySheet(
        WriterInterface $writer,
        Collection $rows,
        Collection $groupedByForm,
        string $start,
        string $end,
        string $formLabel,
        float $grandQty,
        float $grandAmount,
    ): void {
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'รายงานข้อมูลยาและการใช้ยา',
        ]));
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'ช่วงวันที่', $start.' ถึง '.$end,
        ]));
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'ตัวกรองประเภท', $formLabel,
        ]));
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'ออกรายงานเมื่อ', now()->timezone('Asia/Bangkok')->format('d/m/Y H:i:s'),
        ]));
        $writer->addRow(WriterEntityFactory::createRowFromArray([]));
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'รายการยา', $rows->count(),
            'จำนวนรวม', $grandQty,
            'มูลค่ารวม (บาท)', $grandAmount,
        ]));
        $writer->addRow(WriterEntityFactory::createRowFromArray([]));
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'ประเภท', 'รูปแบบ', 'รายการยา', 'จำนวนรวม', 'มูลค่ารวม (บาท)',
        ]));

        foreach ($this->drugUsage->formCatalog() as $formKey => $formName) {
            $formRows = $groupedByForm->get($formKey, collect());
            if ($formRows->isEmpty()) {
                continue;
            }

            $formQty = (float) $formRows->sum('total_qty');
            $formAmount = (float) $formRows->sum('total_amount');
            $subGrouped = $formRows->groupBy(fn ($row) => $row->sub_form_label ?? '-');
            $subIndex = 0;

            foreach ($subGrouped as $subLabel => $subRows) {
                $writer->addRow(WriterEntityFactory::createRowFromArray([
                    $subIndex === 0 ? $formName : '',
                    $subLabel,
                    $subRows->count(),
                    (float) $subRows->sum('total_qty'),
                    (float) $subRows->sum('total_amount'),
                ]));
                $subIndex++;
            }

            $writer->addRow(WriterEntityFactory::createRowFromArray([
                '', 'รวม '.$formName, $formRows->count(), $formQty, $formAmount,
            ]));
            $writer->addRow(WriterEntityFactory::createRowFromArray([]));
        }

        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'รวมทั้งหมด', '', $rows->count(), $grandQty, $grandAmount,
        ]));
    }

    private function writeDrugUsageFormSheet(
        WriterInterface $writer,
        Collection $formRows,
        string $formName,
        string $start,
        string $end,
    ): void {
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'รายงานข้อมูลยาและการใช้ยา — '.$formName,
        ]));
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'ช่วงวันที่', $start.' ถึง '.$end,
        ]));
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'รายการยา', $formRows->count(),
            'จำนวนรวม', (float) $formRows->sum('total_qty'),
            'มูลค่ารวม (บาท)', (float) $formRows->sum('total_amount'),
        ]));
        $writer->addRow(WriterEntityFactory::createRowFromArray([]));
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'รูปแบบ', 'รหัสยา', 'ชื่อยา', 'ความแรง', 'หน่วย', 'ราคาต่อหน่วย', 'จำนวนรวม', 'มูลค่ารวม (บาท)',
        ]));

        $currentSubForm = null;
        $subQty = 0.0;
        $subAmount = 0.0;
        $sheetQty = 0.0;
        $sheetAmount = 0.0;

        $flushSubtotal = function () use ($writer, &$subQty, &$subAmount) {
            if ($subQty > 0 || $subAmount > 0) {
                $writer->addRow(WriterEntityFactory::createRowFromArray([
                    '', '', '', '', 'รวมรูปแบบ', '', $subQty, $subAmount,
                ]));
                $writer->addRow(WriterEntityFactory::createRowFromArray([]));
            }
            $subQty = 0.0;
            $subAmount = 0.0;
        };

        foreach ($formRows as $row) {
            $rowSubForm = $row->sub_form_label ?? $this->drugUsage->subFormLabel($row->units ?? null);

            if ($currentSubForm !== null && $currentSubForm !== $rowSubForm) {
                $flushSubtotal();
            }
            $currentSubForm = $rowSubForm;

            $qty = (float) ($row->total_qty ?? 0);
            $amount = (float) ($row->total_amount ?? 0);
            $subQty += $qty;
            $subAmount += $amount;
            $sheetQty += $qty;
            $sheetAmount += $amount;

            $writer->addRow(WriterEntityFactory::createRowFromArray([
                $rowSubForm,
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
            '', '', '', '', 'รวม '.$formName, '', $sheetQty, $sheetAmount,
        ]));
    }
}
