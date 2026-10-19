<?php

namespace App\Http\Controllers;

use App\Models\SettingApp;
use App\Services\Finance\BudgetExpenseLedgerService;
use App\Services\Finance\BudgetExpenseReportService;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Box\Spout\Common\Entity\Style\Color;
use Box\Spout\Writer\Common\Creator\Style\StyleBuilder;
use Box\Spout\Writer\Common\Creator\WriterEntityFactory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FinanceBudgetController extends Controller
{
    public function __construct(
        private BudgetExpenseReportService $reports,
        private BudgetExpenseLedgerService $ledger,
    ) {}

    public function index(Request $request): Response
    {
        $yearOptions = $this->reports->yearOptions();

        try {
            $fiscalYear = $this->reports->resolveFiscalYear($request->query('fiscal_year'));
        } catch (\InvalidArgumentException $e) {
            return $this->page($this->reports->currentFiscalYear(), $yearOptions, $e->getMessage(), null);
        }

        if (! $this->reports->hasHosxpConnection()) {
            return $this->page($fiscalYear, $yearOptions, 'ไม่สามารถเชื่อมต่อฐานข้อมูล HOSxP ได้ กรุณาตรวจสอบการตั้งค่า', null);
        }

        try {
            $data = $this->reports->build($fiscalYear);

            return $this->page($fiscalYear, $yearOptions, null, $data);
        } catch (\Throwable $e) {
            Log::error('Finance budget report failed: '.$e->getMessage());

            $message = $e instanceof \InvalidArgumentException
                ? $e->getMessage()
                : 'เกิดข้อผิดพลาดในการดึงข้อมูล: '.$e->getMessage();

            return $this->page($fiscalYear, $yearOptions, $message, null);
        }
    }

    public function exportExcel(Request $request): StreamedResponse
    {
        $fiscalYear = $this->reports->resolveFiscalYear($request->query('fiscal_year'));
        [$startDate, $endDate] = $this->reports->fiscalRange($fiscalYear);
        $fileName = 'budget_expense_fy'.$fiscalYear.'.xlsx';

        return new StreamedResponse(function () use ($fiscalYear, $startDate, $endDate) {
            $writer = WriterEntityFactory::createXLSXWriter();
            $writer->openToFile('php://output');
            $titleStyle = $this->excelTitleStyle();
            $metaStyle = $this->excelMetaStyle();
            $headerStyle = $this->excelHeaderStyle();
            $footerStyle = $this->excelFooterStyle();

            try {
                if (! $this->reports->hasHosxpConnection()) {
                    $writer->addRow(WriterEntityFactory::createRowFromArray([
                        'Error',
                        'ไม่สามารถเชื่อมต่อฐานข้อมูล HOSxP ได้',
                    ], $headerStyle));
                    $this->writeExpenseSheet($writer, $fiscalYear, null, $titleStyle, $headerStyle, $footerStyle);
                    $writer->close();

                    return;
                }

                $data = $this->reports->build($fiscalYear);
                $summary = $data['summary'];

                $writer->getCurrentSheet()->setName('สรุป');
                $writer->addRow(WriterEntityFactory::createRowFromArray(['งานงบประมาณ ค่ารักษาพยาบาล HOSxP'], $titleStyle));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['ปีงบประมาณ', (string) $fiscalYear], $metaStyle));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['ช่วงวันที่', $startDate.' ถึง '.$endDate], $metaStyle));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['แหล่งข้อมูล', 'opitemrece.sum_price ตาม vstdate ทั้ง OPD และ IPD'], $metaStyle));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['ออกรายงานเมื่อ', now()->timezone('Asia/Bangkok')->format('Y-m-d H:i:s')], $metaStyle));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['']));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['รายการ', 'จำนวนเงิน'], $headerStyle));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['รวมทั้งปี', $this->formatBaht($summary['total_amount'])]));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['OPD', $this->formatBaht($summary['opd_amount'])]));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['IPD', $this->formatBaht($summary['ipd_amount'])]));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['เงินสด', $this->formatBaht($summary['cash_amount'])]));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['ลูกหนี้สิทธิ', $this->formatBaht($summary['debt_amount'])]));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['ค้างชำระ', $this->formatBaht($summary['unpaid_amount'])]));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['อื่นๆ', $this->formatBaht($summary['other_amount'])]));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['จำนวนรายการ', number_format((float) $summary['total_items'])], $footerStyle));

                $writer->addNewSheetAndMakeItCurrent();
                $writer->getCurrentSheet()->setName('รายเดือน');
                $writer->addRow(WriterEntityFactory::createRowFromArray(['ค่ารักษาพยาบาลรายเดือน ปีงบประมาณ '.$fiscalYear], $titleStyle));
                $writer->addRow(WriterEntityFactory::createRowFromArray([
                    'เดือน', 'OPD (บาท)', 'IPD (บาท)', 'รวม (บาท)', 'เงินสด', 'ลูกหนี้สิทธิ', 'ค้างชำระ', 'อื่นๆ',
                ], $headerStyle));
                foreach ($data['monthly'] as $row) {
                    $writer->addRow(WriterEntityFactory::createRowFromArray([
                        $row['label'],
                        $this->formatBaht($row['opd']),
                        $this->formatBaht($row['ipd']),
                        $this->formatBaht($row['total']),
                        $this->formatBaht($row['cash']),
                        $this->formatBaht($row['debt']),
                        $this->formatBaht($row['unpaid']),
                        $this->formatBaht($row['other']),
                    ]));
                }
                $writer->addRow(WriterEntityFactory::createRowFromArray([
                    'รวม',
                    $this->formatBaht($summary['opd_amount']),
                    $this->formatBaht($summary['ipd_amount']),
                    $this->formatBaht($summary['total_amount']),
                    $this->formatBaht($summary['cash_amount']),
                    $this->formatBaht($summary['debt_amount']),
                    $this->formatBaht($summary['unpaid_amount']),
                    $this->formatBaht($summary['other_amount']),
                ], $footerStyle));

                $writer->addNewSheetAndMakeItCurrent();
                $writer->getCurrentSheet()->setName('หมวดรายได้');
                $writer->addRow(WriterEntityFactory::createRowFromArray(['ค่ารักษาพยาบาลตามหมวดรายได้'], $titleStyle));
                $writer->addRow(WriterEntityFactory::createRowFromArray([
                    'รหัส', 'หมวดรายได้', 'OPD (บาท)', 'IPD (บาท)', 'รวม (บาท)', 'สัดส่วน', 'รายการ',
                ], $headerStyle));
                foreach ($data['by_income'] as $row) {
                    $writer->addRow(WriterEntityFactory::createRowFromArray([
                        $row['income_code'],
                        $row['income_name'],
                        $this->formatBaht($row['opd_amount']),
                        $this->formatBaht($row['ipd_amount']),
                        $this->formatBaht($row['total_amount']),
                        number_format((float) $row['share_percent'], 1).'%',
                        number_format((float) $row['items']),
                    ]));
                }

                $writer->addNewSheetAndMakeItCurrent();
                $writer->getCurrentSheet()->setName('สิทธิการรักษา');
                $writer->addRow(WriterEntityFactory::createRowFromArray(['ค่ารักษาพยาบาลตามสิทธิการรักษา'], $titleStyle));
                $writer->addRow(WriterEntityFactory::createRowFromArray([
                    'รหัส', 'สิทธิ', 'OPD (บาท)', 'IPD (บาท)', 'เงินสด', 'ลูกหนี้สิทธิ', 'ค้างชำระ', 'รวม (บาท)', 'สัดส่วน',
                ], $headerStyle));
                foreach ($data['by_pttype'] as $row) {
                    $writer->addRow(WriterEntityFactory::createRowFromArray([
                        $row['pttype_code'],
                        $row['pttype_name'],
                        $this->formatBaht($row['opd_amount']),
                        $this->formatBaht($row['ipd_amount']),
                        $this->formatBaht($row['cash_amount']),
                        $this->formatBaht($row['debt_amount']),
                        $this->formatBaht($row['unpaid_amount']),
                        $this->formatBaht($row['total_amount']),
                        number_format((float) $row['share_percent'], 1).'%',
                    ]));
                }

                $this->writeExpenseSheet($writer, $fiscalYear, (float) ($summary['total_amount'] ?? 0), $titleStyle, $headerStyle, $footerStyle);
            } catch (\Throwable $e) {
                $writer->addRow(WriterEntityFactory::createRowFromArray(['Error', $e->getMessage()]));
            }

            $writer->close();
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$fileName.'"',
        ]);
    }

    public function exportPdf(Request $request)
    {
        $fiscalYear = $this->reports->resolveFiscalYear($request->query('fiscal_year'));
        [$startDate, $endDate] = $this->reports->fiscalRange($fiscalYear);

        if (! class_exists(\Dompdf\Dompdf::class)) {
            return response('PDF library not installed (dompdf/dompdf).', 500);
        }

        if (! $this->reports->hasHosxpConnection()) {
            return response('ไม่สามารถเชื่อมต่อฐานข้อมูล HOSxP ได้', 500);
        }

        try {
            $data = $this->reports->build($fiscalYear);
            $data['expenses'] = $this->ledger->forYear($fiscalYear);
            $setting = SettingApp::first();
            [$fontRegularUri, $fontBoldUri] = $this->pdfFontUris();

            $html = view('finance.budget-report-pdf', [
                'data' => $data,
                'fiscalYear' => $fiscalYear,
                'startDate' => $startDate,
                'endDate' => $endDate,
                'startDateLabel' => $this->reports->formatThaiDate($startDate),
                'endDateLabel' => $this->reports->formatThaiDate($endDate),
                'generatedAt' => now()->timezone('Asia/Bangkok')->format('d/m/Y H:i:s'),
                'appName' => $setting?->nama_app ?? config('app.name'),
                'fontRegularUri' => $fontRegularUri,
                'fontBoldUri' => $fontBoldUri,
                'formatBaht' => fn ($value) => $this->formatBaht($value),
            ])->render();

            $pdfBinary = $this->renderPdfFromHtml($html);

            return response($pdfBinary, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="budget_expense_fy'.$fiscalYear.'.pdf"',
            ]);
        } catch (\Throwable $e) {
            Log::error('Finance budget PDF export failed: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            $message = $e instanceof \InvalidArgumentException
                ? $e->getMessage()
                : 'ไม่สามารถสร้างไฟล์ PDF ได้: '.$e->getMessage();

            return response($message, 500);
        }
    }

    /**
     * @param  list<array{value: int, label: string, start_date: string, end_date: string}>  $yearOptions
     * @param  array<string, mixed>|null  $data
     */
    private function page(int $fiscalYear, array $yearOptions, ?string $error, ?array $data): Response
    {
        [$startDate, $endDate] = $this->reports->fiscalRange($fiscalYear);

        return Inertia::render('Finance/BudgetDashboard', [
            'filter' => [
                'fiscal_year' => $fiscalYear,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'start_date_label' => $this->reports->formatThaiDate($startDate),
                'end_date_label' => $this->reports->formatThaiDate($endDate),
            ],
            'year_options' => $yearOptions,
            'hosxp_error' => $error,
            'summary' => $data['summary'] ?? null,
            'monthly' => $data['monthly'] ?? [],
            'by_income' => $data['by_income'] ?? [],
            'by_pttype' => $data['by_pttype'] ?? [],
            'expenses' => $this->ledger->forYear($fiscalYear),
            'tab' => request()->query('tab') === 'expenses' ? 'expenses' : 'revenue',
        ]);
    }

    public function updateExpenses(Request $request)
    {
        $fiscalYear = $this->reports->resolveFiscalYear($request->input('fiscal_year'));
        $payload = $request->validate([
            'amounts' => ['required', 'array'],
            'amounts.*' => ['nullable', 'numeric'],
        ]);

        $this->ledger->saveAmounts($fiscalYear, $payload['amounts']);

        return redirect()
            ->route('finance.budget', ['fiscal_year' => $fiscalYear, 'tab' => 'expenses'])
            ->with('success', 'บันทึกค่าใช้จ่ายปีงบประมาณ '.$fiscalYear.' แล้ว');
    }

    public function importExpenses(Request $request)
    {
        $fiscalYear = $this->reports->resolveFiscalYear($request->input('fiscal_year'));
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv'],
        ]);

        try {
            $result = $this->ledger->import($fiscalYear, $request->file('file')->getRealPath());
        } catch (\InvalidArgumentException $e) {
            return redirect()
                ->route('finance.budget', ['fiscal_year' => $fiscalYear, 'tab' => 'expenses'])
                ->with('error', $e->getMessage());
        } catch (\Throwable $e) {
            Log::error('Finance budget expense import failed: '.$e->getMessage());

            return redirect()
                ->route('finance.budget', ['fiscal_year' => $fiscalYear, 'tab' => 'expenses'])
                ->with('error', 'นำเข้าไฟล์ไม่สำเร็จ: '.$e->getMessage());
        }

        $message = 'นำเข้าค่าใช้จ่าย '.$result['matched'].' หมวด สำหรับปีงบประมาณ '.$fiscalYear.' แล้ว';
        if ($result['total_mismatch']) {
            $message .= ' ยอดรวมในไฟล์ไม่ตรงกับผลบวก 11 หมวด';
        }

        return redirect()
            ->route('finance.budget', ['fiscal_year' => $fiscalYear, 'tab' => 'expenses'])
            ->with($result['total_mismatch'] ? 'error' : 'success', $message);
    }

    public function expenseTemplate()
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('ค่าใช้จ่าย');
        $sheet->fromArray(['ลำดับ', 'รายการ', 'จำนวนเงิน'], null, 'A1');

        $row = 2;
        foreach ($this->ledger->catalog() as $item) {
            $sheet->setCellValue('A'.$row, $item['line_no']);
            $sheet->setCellValue('B'.$row, $item['name']);
            $sheet->setCellValue('C'.$row, 0);
            $row++;
        }

        $row++;
        foreach ([
            'รวมค่าใช้จ่าย',
            'รายได้สูงกว่า (ต่ำกว่า) ค่าใช้จ่ายจากการดำเนินงาน',
            'หัก ค่าใช้จ่ายลงทุน',
            'รายได้สูงกว่า (ต่ำกว่า) ค่าใช้จ่ายสุทธิ',
        ] as $label) {
            $sheet->setCellValue('B'.$row, $label);
            $row++;
        }

        $sheet->getColumnDimension('A')->setWidth(12);
        $sheet->getColumnDimension('B')->setWidth(62);
        $sheet->getColumnDimension('C')->setWidth(18);

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, 'budget_expense_template.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    private function writeExpenseSheet($writer, int $fiscalYear, ?float $hosxpRevenue, $titleStyle, $headerStyle, $footerStyle): void
    {
        $expenses = $this->ledger->forYear($fiscalYear);
        $revenue = (float) ($hosxpRevenue ?? 0);
        $operatingGap = $revenue - (float) $expenses['operating_expenses'];
        $netGap = $operatingGap - (float) $expenses['capital_amount'];

        $writer->addNewSheetAndMakeItCurrent();
        $writer->getCurrentSheet()->setName('ค่าใช้จ่าย');
        $writer->addRow(WriterEntityFactory::createRowFromArray(['ค่าใช้จ่ายภายนอก ปีงบประมาณ '.$fiscalYear], $titleStyle));
        $writer->addRow(WriterEntityFactory::createRowFromArray(['ลำดับ', 'รายการ', 'จำนวนเงิน'], $headerStyle));
        foreach ($expenses['lines'] as $line) {
            $writer->addRow(WriterEntityFactory::createRowFromArray([
                $line['line_no'],
                $line['name'],
                $this->formatBaht($line['amount']),
            ]));
        }
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            '',
            'รวมค่าใช้จ่าย',
            $this->formatBaht($expenses['total_amount']),
        ], $footerStyle));
        $writer->addRow(WriterEntityFactory::createRowFromArray(['']));
        $writer->addRow(WriterEntityFactory::createRowFromArray(['เทียบรายรับค่ารักษา HOSxP', 'จำนวนเงิน'], $headerStyle));
        $writer->addRow(WriterEntityFactory::createRowFromArray(['รายรับค่ารักษา HOSxP', $this->formatBaht($revenue)]));
        $writer->addRow(WriterEntityFactory::createRowFromArray(['ผลต่างดำเนินงาน', $this->formatBaht($operatingGap)]));
        $writer->addRow(WriterEntityFactory::createRowFromArray(['ผลต่างสุทธิ', $this->formatBaht($netGap)]));

        $file = $expenses['file_summary'];
        if ($file['total'] !== null || $file['operating_result'] !== null || $file['net_result'] !== null) {
            $writer->addRow(WriterEntityFactory::createRowFromArray(['']));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['สรุปตามไฟล์บัญชี', 'จำนวนเงิน'], $headerStyle));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['รวมค่าใช้จ่ายตามไฟล์', $file['total'] === null ? '' : $this->formatBaht($file['total'])]));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['ผลต่างดำเนินงานตามไฟล์', $file['operating_result'] === null ? '' : $this->formatBaht($file['operating_result'])]));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['หักค่าใช้จ่ายลงทุนตามไฟล์', $file['capital_deduction'] === null ? '' : $this->formatBaht($file['capital_deduction'])]));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['ผลต่างสุทธิตามไฟล์', $file['net_result'] === null ? '' : $this->formatBaht($file['net_result'])]));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['อัตราส่วนตามไฟล์', $file['ratio'] === null ? '' : number_format((float) $file['ratio'], 2)]));
        }
    }

    private function formatBaht($value): string
    {
        return number_format((float) $value, 2);
    }

    private function excelTitleStyle()
    {
        return (new StyleBuilder())
            ->setFontBold()
            ->setFontSize(14)
            ->setFontColor(Color::WHITE)
            ->setBackgroundColor('1F4E78')
            ->build();
    }

    private function excelMetaStyle()
    {
        return (new StyleBuilder())
            ->setFontColor('1F2937')
            ->build();
    }

    private function excelHeaderStyle()
    {
        return (new StyleBuilder())
            ->setFontBold()
            ->setFontColor(Color::WHITE)
            ->setBackgroundColor('0F766E')
            ->build();
    }

    private function excelFooterStyle()
    {
        return (new StyleBuilder())
            ->setFontBold()
            ->setBackgroundColor('FEF3C7')
            ->build();
    }

    /** @return array{0: string, 1: string} */
    private function pdfFontUris(): array
    {
        $fontSourceDir = resource_path('fonts');
        $regularPath = $fontSourceDir.DIRECTORY_SEPARATOR.'Sarabun-Regular.ttf';
        $boldPath = $fontSourceDir.DIRECTORY_SEPARATOR.'Sarabun-Bold.ttf';

        if (! file_exists($regularPath) || ! file_exists($boldPath)) {
            throw new \RuntimeException('Thai fonts missing in resources/fonts');
        }

        return [
            'file://'.str_replace('\\', '/', realpath($regularPath) ?: $regularPath),
            'file://'.str_replace('\\', '/', realpath($boldPath) ?: $boldPath),
        ];
    }

    private function renderPdfFromHtml(string $html): string
    {
        $fontSourceDir = resource_path('fonts');
        $fontCacheDir = storage_path('fonts');

        foreach ([$fontSourceDir, $fontCacheDir] as $dir) {
            if (! is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        }

        $regularPath = $fontSourceDir.DIRECTORY_SEPARATOR.'Sarabun-Regular.ttf';
        $boldPath = $fontSourceDir.DIRECTORY_SEPARATOR.'Sarabun-Bold.ttf';

        $options = new \Dompdf\Options();
        $options->set('isRemoteEnabled', false);
        $options->set('defaultFont', 'sarabun');
        $options->set('fontDir', $fontCacheDir);
        $options->set('fontCache', $fontCacheDir);
        $options->setChroot([base_path(), $fontSourceDir, $fontCacheDir]);

        $dompdf = new \Dompdf\Dompdf($options);
        $fontMetrics = $dompdf->getFontMetrics();
        $fontMetrics->registerFont(
            ['family' => 'sarabun', 'style' => 'normal', 'weight' => 'normal'],
            'file://'.str_replace('\\', '/', realpath($regularPath) ?: $regularPath)
        );
        $fontMetrics->registerFont(
            ['family' => 'sarabun', 'style' => 'normal', 'weight' => 'bold'],
            'file://'.str_replace('\\', '/', realpath($boldPath) ?: $boldPath)
        );

        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4', 'landscape');
        $dompdf->render();

        return $dompdf->output();
    }
}
