<?php

namespace App\Http\Controllers;

use App\Models\SettingApp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Box\Spout\Common\Entity\Style\Color;
use Box\Spout\Writer\Common\Creator\WriterEntityFactory;
use Box\Spout\Writer\Common\Creator\Style\StyleBuilder;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FinanceRevenueController extends Controller
{
    /** @var array{has_oi_an: bool, has_iptdiag: bool} */
    private array $hosxpSchema = [];

    private function initHosxpSchema($conn): void
    {
        if ($this->hosxpSchema !== []) {
            return;
        }

        $columns = [];
        try {
            $columns = $conn->getSchemaBuilder()->getColumnListing('opitemrece');
        } catch (\Throwable $e) {
            Log::warning('Cannot list opitemrece columns: '.$e->getMessage());
        }

        $this->hosxpSchema = [
            'has_oi_an' => in_array('an', $columns, true),
            'has_iptdiag' => $this->tableExists($conn, 'iptdiag'),
        ];
    }

    private function opitemreceHasAn($conn): bool
    {
        $this->initHosxpSchema($conn);

        return $this->hosxpSchema['has_oi_an'];
    }

    private function hasIptDiag($conn): bool
    {
        $this->initHosxpSchema($conn);

        return $this->hosxpSchema['has_iptdiag'];
    }

    private function hasHosxpConnection(): bool
    {
        try {
            if (! config('database.connections.hosxp')) {
                return false;
            }
            DB::connection('hosxp')->getPdo();

            return true;
        } catch (\Exception $e) {
            Log::warning('HOSxP connection not available: '.$e->getMessage());

            return false;
        }
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

    /**
     * HOSxP: opitemrece เก็บทั้ง OPD/IPD
     * - IPD: มีเลข an ใน opitemrece (ถ้ามีคอลัมน์) หรือ ovst.an
     * - OPD: ไม่มี an
     */
    private function ipdConditionSql($conn): string
    {
        $parts = [];

        if ($this->opitemreceHasAn($conn)) {
            $parts[] = "(oi.an IS NOT NULL AND TRIM(oi.an) <> '')";
        }

        $parts[] = "(o.an IS NOT NULL AND TRIM(o.an) <> '')";

        return '('.implode(' OR ', $parts).')';
    }

    private function ipdVisitKeySql($conn): string
    {
        if ($this->opitemreceHasAn($conn)) {
            return "COALESCE(NULLIF(oi.an, ''), o.an, oi.vn)";
        }

        return "COALESCE(NULLIF(o.an, ''), oi.vn)";
    }

    private function iptJoinAnSql($conn): string
    {
        if ($this->opitemreceHasAn($conn)) {
            return "IF(oi.an IS NOT NULL AND TRIM(oi.an) <> '', oi.an, o.an)";
        }

        return 'o.an';
    }

    private function pttypeCodeSql(): string
    {
        return "COALESCE(NULLIF(i.pttype, ''), NULLIF(o.pttype, ''), '-')";
    }

    private function pttypeNameSql(): string
    {
        return "COALESCE(pt.name, NULLIF(i.pttype, ''), NULLIF(o.pttype, ''), 'ไม่ระบุสิทธิ')";
    }

    private function departmentCodeSql(string $ipdCond): string
    {
        return "CASE WHEN {$ipdCond} THEN CONCAT('W:', COALESCE(NULLIF(i.ward, ''), '-')) ELSE CONCAT('D:', COALESCE(NULLIF(o.main_dep, ''), '-')) END";
    }

    private function departmentNameSql(string $ipdCond): string
    {
        return "CASE WHEN {$ipdCond} THEN COALESCE(w.name, NULLIF(i.ward, ''), 'ไม่ระบุหอผู้ป่วย') ELSE COALESCE(ksk.department, NULLIF(o.main_dep, ''), 'ไม่ระบุแผนก') END";
    }

    private function tableExists($conn, string $table): bool
    {
        return $conn->table('information_schema.tables')
            ->where('table_schema', $conn->getDatabaseName())
            ->where('table_name', $table)
            ->exists();
    }

    private function diagnosisQuery($conn, string $startDate, string $endDate)
    {
        $iptAn = $this->iptJoinAnSql($conn);

        $query = $conn->table('opitemrece as oi')
            ->leftJoin('ovst as o', 'o.vn', '=', 'oi.vn')
            ->leftJoin(DB::raw('ipt i'), DB::raw('i.an'), '=', DB::raw($iptAn))
            ->leftJoin(DB::raw('ovstdiag od'), function ($join) {
                $join->on('od.vn', '=', 'oi.vn')->where('od.diagtype', '=', '1');
            })
            ->leftJoin(DB::raw('icd101 icd_od'), 'icd_od.code', '=', 'od.icd10')
            ->whereBetween('oi.vstdate', [$startDate, $endDate]);

        if ($this->hasIptDiag($conn)) {
            $query->leftJoin(DB::raw('iptdiag idg'), function ($join) use ($iptAn) {
                $join->whereRaw("idg.an = ({$iptAn})")->where('idg.diagtype', '=', '1');
            })->leftJoin(DB::raw('icd101 icd_id'), 'icd_id.code', '=', 'idg.icd10');
        }

        return $query;
    }

    private function icd10CodeSql(string $ipdCond, bool $hasIptDiag): string
    {
        if ($hasIptDiag) {
            return "CASE WHEN {$ipdCond} THEN COALESCE(NULLIF(idg.icd10, ''), '-') ELSE COALESCE(NULLIF(od.icd10, ''), '-') END";
        }

        return "COALESCE(NULLIF(od.icd10, ''), '-')";
    }

    private function icd10NameSql(string $ipdCond, bool $hasIptDiag): string
    {
        if ($hasIptDiag) {
            return "CASE WHEN {$ipdCond} THEN COALESCE(NULLIF(icd_id.tname, ''), icd_id.name, NULLIF(idg.icd10, ''), 'ไม่ระบุวินิจฉัย') ELSE COALESCE(NULLIF(icd_od.tname, ''), icd_od.name, NULLIF(od.icd10, ''), 'ไม่ระบุวินิจฉัย') END";
        }

        return "COALESCE(NULLIF(icd_od.tname, ''), icd_od.name, NULLIF(od.icd10, ''), 'ไม่ระบุวินิจฉัย')";
    }

    private function drugQuery($conn, string $startDate, string $endDate)
    {
        return $conn->table('opitemrece as oi')
            ->join('drugitems as d', 'd.icode', '=', 'oi.icode')
            ->leftJoin('ovst as o', 'o.vn', '=', 'oi.vn')
            ->whereBetween('oi.vstdate', [$startDate, $endDate]);
    }

    private function mapRankedRows($rows, float $totalAmount, string $codeKey, string $nameKey): array
    {
        return $rows->map(function ($row, $index) use ($totalAmount, $codeKey, $nameKey) {
            $total = (float) $row->total_amount;

            return [
                'rank' => $index + 1,
                $codeKey => $row->{$codeKey},
                $nameKey => $row->{$nameKey},
                'opd_amount' => (float) ($row->opd_amount ?? 0),
                'ipd_amount' => (float) ($row->ipd_amount ?? 0),
                'total_amount' => $total,
                'items' => (int) ($row->items ?? 0),
                'patients' => (int) ($row->patients ?? 0),
                'total_qty' => (float) ($row->total_qty ?? 0),
                'share_percent' => $totalAmount > 0 ? round($total / $totalAmount * 100, 1) : 0,
            ];
        })->values()->all();
    }

    private function baseQuery($conn, string $startDate, string $endDate)
    {
        $iptAn = $this->iptJoinAnSql($conn);

        return $conn->table('opitemrece as oi')
            ->leftJoin('ovst as o', 'o.vn', '=', 'oi.vn')
            ->leftJoin(DB::raw('ipt i'), DB::raw('i.an'), '=', DB::raw($iptAn))
            ->leftJoin(DB::raw('pttype pt'), DB::raw('pt.pttype'), '=', DB::raw("COALESCE(NULLIF(i.pttype, ''), NULLIF(o.pttype, ''))"))
            ->leftJoin(DB::raw('kskdepartment ksk'), DB::raw('ksk.depcode'), '=', 'o.main_dep')
            ->leftJoin(DB::raw('ward w'), DB::raw('w.ward'), '=', 'i.ward')
            ->whereBetween('oi.vstdate', [$startDate, $endDate]);
    }

    public function index(Request $request): Response
    {
        [$startDate, $endDate] = $this->parseDates($request);

        $filter = [
            'start_date' => $startDate,
            'end_date' => $endDate,
            'start_date_label' => $this->formatThaiDateLabel($startDate),
            'end_date_label' => $this->formatThaiDateLabel($endDate),
        ];

        if (! $this->hasHosxpConnection()) {
            return Inertia::render('Finance/RevenueDashboard', [
                'filter' => $filter,
                'hosxp_error' => 'ไม่สามารถเชื่อมต่อฐานข้อมูล HOSxP ได้ กรุณาตรวจสอบการตั้งค่า',
                'summary' => null,
                'by_pttype' => [],
                'by_department' => [],
                'top_diseases' => [],
                'top_drugs' => [],
                'monthly' => [],
                'opd_vs_ipd' => [],
            ]);
        }

        try {
            $data = $this->buildReport($startDate, $endDate);

            return Inertia::render('Finance/RevenueDashboard', [
                'filter' => $filter,
                'hosxp_error' => null,
                ...$data,
            ]);
        } catch (\Throwable $e) {
            Log::error('Finance revenue report failed: '.$e->getMessage());

            return Inertia::render('Finance/RevenueDashboard', [
                'filter' => $filter,
                'hosxp_error' => 'เกิดข้อผิดพลาดในการดึงข้อมูล: '.$e->getMessage(),
                'summary' => null,
                'by_pttype' => [],
                'by_department' => [],
                'top_diseases' => [],
                'top_drugs' => [],
                'monthly' => [],
                'opd_vs_ipd' => [],
            ]);
        }
    }

    public function exportExcel(Request $request): StreamedResponse
    {
        [$startDate, $endDate] = $this->parseDates($request);

        $fileName = 'finance_revenue_'.$startDate.'_to_'.$endDate.'.xlsx';

        return new StreamedResponse(function () use ($startDate, $endDate) {
            $writer = WriterEntityFactory::createXLSXWriter();
            $writer->openToFile('php://output');
            $titleStyle = $this->excelTitleStyle();
            $metaStyle = $this->excelMetaStyle();
            $headerStyle = $this->excelHeaderStyle();
            $subtleHeaderStyle = $this->excelSubtleHeaderStyle();
            $footerStyle = $this->excelFooterStyle();

            try {
                if (! $this->hasHosxpConnection()) {
                    $writer->addRow(WriterEntityFactory::createRowFromArray([
                        'Error',
                        'ไม่สามารถเชื่อมต่อฐานข้อมูล HOSxP ได้',
                    ], $headerStyle));
                    $writer->close();

                    return;
                }

                $data = $this->buildReport($startDate, $endDate);
                // Sheet 1: Summary
                $writer->getCurrentSheet()->setName('Summary');
                $summary = $data['summary'] ?? null;
                $writer->addRow(WriterEntityFactory::createRowFromArray(['=== รายงานรายได้ HOSxP ==='], $titleStyle));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['ช่วงวันที่', $startDate.' ถึง '.$endDate], $metaStyle));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['ออกรายงานเมื่อ', date('Y-m-d H:i:s')], $metaStyle));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['']));
                if ($summary) {
                    $writer->addRow(WriterEntityFactory::createRowFromArray(['รายการสรุป', 'ค่า'], $headerStyle));
                    $writer->addRow(WriterEntityFactory::createRowFromArray(['รายได้รวม', $this->formatBaht($summary['total_amount'] ?? 0)]));
                    $writer->addRow(WriterEntityFactory::createRowFromArray(['OPD', $this->formatBaht($summary['opd_amount'] ?? 0)]));
                    $writer->addRow(WriterEntityFactory::createRowFromArray(['IPD', $this->formatBaht($summary['ipd_amount'] ?? 0)]));
                    $writer->addRow(WriterEntityFactory::createRowFromArray(['สัดส่วน OPD', $this->formatPercent($summary['opd_share'] ?? 0)]));
                    $writer->addRow(WriterEntityFactory::createRowFromArray(['สัดส่วน IPD', $this->formatPercent($summary['ipd_share'] ?? 0)]));
                    $writer->addRow(WriterEntityFactory::createRowFromArray(['จำนวนรายการทั้งหมด', number_format((float) ($summary['total_items'] ?? 0))], $footerStyle));
                }
                $topPttype = $data['by_pttype'][0] ?? null;
                $topDepartment = $data['by_department'][0] ?? null;
                $topDisease = $data['top_diseases'][0] ?? null;
                $topDrug = $data['top_drugs'][0] ?? null;

                $writer->addRow(WriterEntityFactory::createRowFromArray(['']));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['Executive Highlights'], $subtleHeaderStyle));
                $writer->addRow(WriterEntityFactory::createRowFromArray([
                    'สิทธิ์รายได้สูงสุด',
                    $topPttype ? (($topPttype['pttype_name'] ?? '-') .' ('.$this->formatBaht($topPttype['total_amount'] ?? 0).')') : '-',
                ]));
                $writer->addRow(WriterEntityFactory::createRowFromArray([
                    'แผนก/หอรายได้สูงสุด',
                    $topDepartment ? (($topDepartment['department_name'] ?? '-') .' ('.$this->formatBaht($topDepartment['total_amount'] ?? 0).')') : '-',
                ]));
                $writer->addRow(WriterEntityFactory::createRowFromArray([
                    'โรครายได้สูงสุด',
                    $topDisease ? (($topDisease['icd10_code'] ?? '-') .' '.($topDisease['disease_name'] ?? '-') .' ('.$this->formatBaht($topDisease['total_amount'] ?? 0).')') : '-',
                ]));
                $writer->addRow(WriterEntityFactory::createRowFromArray([
                    'ยารายได้สูงสุด',
                    $topDrug ? (($topDrug['drug_code'] ?? '-') .' '.($topDrug['drug_name'] ?? '-') .' ('.$this->formatBaht($topDrug['total_amount'] ?? 0).')') : '-',
                ]));

                // Sheet 2: สิทธิ์
                $writer->addNewSheetAndMakeItCurrent();
                $writer->getCurrentSheet()->setName('สิทธิ์');
                $writer->addRow(WriterEntityFactory::createRowFromArray(['=== รายได้ตามสิทธิ์ ==='], $titleStyle));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['รหัสสิทธิ', 'ชื่อสิทธิ', 'OPD (บาท)', 'IPD (บาท)', 'รวม (บาท)', 'สัดส่วน', 'รายการ'], $headerStyle));
                foreach ($data['by_pttype'] ?? [] as $row) {
                    $writer->addRow(WriterEntityFactory::createRowFromArray([
                        $row['pttype_code'] ?? '-',
                        $this->wrapForExcel((string) ($row['pttype_name'] ?? ''), 28),
                        $this->formatBaht($row['opd_amount'] ?? 0),
                        $this->formatBaht($row['ipd_amount'] ?? 0),
                        $this->formatBaht($row['total_amount'] ?? 0),
                        $this->formatPercent($row['share_percent'] ?? 0),
                        number_format((float) ($row['items'] ?? 0)),
                    ]));
                }
                $writer->addRow(WriterEntityFactory::createRowFromArray(['']));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['รวม', '', $this->formatBaht($summary['opd_amount'] ?? 0), $this->formatBaht($summary['ipd_amount'] ?? 0), $this->formatBaht($summary['total_amount'] ?? 0), '100.00%', number_format((float) ($summary['total_items'] ?? 0))], $footerStyle));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['หมายเหตุ: จัดอันดับตามรายได้รวมจากมากไปน้อย'], $metaStyle));

                // Sheet 3: แผนก
                $writer->addNewSheetAndMakeItCurrent();
                $writer->getCurrentSheet()->setName('แผนก');
                $writer->addRow(WriterEntityFactory::createRowFromArray(['=== รายได้ตามแผนก / หอผู้ป่วย ==='], $titleStyle));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['ประเภท', 'แผนก/หอผู้ป่วย', 'OPD (บาท)', 'IPD (บาท)', 'รวม (บาท)', 'สัดส่วน', 'รายการ'], $headerStyle));
                foreach ($data['by_department'] ?? [] as $row) {
                    $writer->addRow(WriterEntityFactory::createRowFromArray([
                        $row['department_type_label'] ?? '',
                        $this->wrapForExcel((string) ($row['department_name'] ?? ''), 30),
                        $this->formatBaht($row['opd_amount'] ?? 0),
                        $this->formatBaht($row['ipd_amount'] ?? 0),
                        $this->formatBaht($row['total_amount'] ?? 0),
                        $this->formatPercent($row['share_percent'] ?? 0),
                        number_format((float) ($row['items'] ?? 0)),
                    ]));
                }

                // Sheet 4: โรค
                $writer->addNewSheetAndMakeItCurrent();
                $writer->getCurrentSheet()->setName('โรค');
                $writer->addRow(WriterEntityFactory::createRowFromArray(['=== Top 10 โรครายได้สูง ==='], $titleStyle));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['อันดับ', 'ICD-10', 'ชื่อโรค', 'OPD (บาท)', 'IPD (บาท)', 'รายได้รวม (บาท)', 'ผู้ป่วย'], $subtleHeaderStyle));
                foreach ($data['top_diseases'] ?? [] as $row) {
                    $writer->addRow(WriterEntityFactory::createRowFromArray([
                        $row['rank'] ?? '',
                        $row['icd10_code'] ?? '-',
                        $this->wrapForExcel((string) ($row['disease_name'] ?? ''), 32),
                        $this->formatBaht($row['opd_amount'] ?? 0),
                        $this->formatBaht($row['ipd_amount'] ?? 0),
                        $this->formatBaht($row['total_amount'] ?? 0),
                        number_format((float) ($row['patients'] ?? 0)),
                    ]));
                }
                $writer->addRow(WriterEntityFactory::createRowFromArray(['หมายเหตุ: ใช้วินิจฉัยหลัก (diagtype = 1)'], $metaStyle));

                // Sheet 5: ยา
                $writer->addNewSheetAndMakeItCurrent();
                $writer->getCurrentSheet()->setName('ยา');
                $writer->addRow(WriterEntityFactory::createRowFromArray(['=== Top 10 ยารายได้สูง ==='], $titleStyle));
                $writer->addRow(WriterEntityFactory::createRowFromArray(['อันดับ', 'รหัสยา', 'ชื่อยา', 'OPD (บาท)', 'IPD (บาท)', 'รายได้รวม (บาท)', 'จำนวนยา'], $subtleHeaderStyle));
                foreach ($data['top_drugs'] ?? [] as $row) {
                    $writer->addRow(WriterEntityFactory::createRowFromArray([
                        $row['rank'] ?? '',
                        $row['drug_code'] ?? '-',
                        $this->wrapForExcel((string) ($row['drug_name'] ?? ''), 32),
                        $this->formatBaht($row['opd_amount'] ?? 0),
                        $this->formatBaht($row['ipd_amount'] ?? 0),
                        $this->formatBaht($row['total_amount'] ?? 0),
                        number_format((float) ($row['total_qty'] ?? 0), 2),
                    ]));
                }
                $writer->addRow(WriterEntityFactory::createRowFromArray(['หมายเหตุ: เฉพาะรายการที่เป็นยา (drugitems)'], $metaStyle));
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
        [$startDate, $endDate] = $this->parseDates($request);

        if (! class_exists(\Dompdf\Dompdf::class)) {
            return response('PDF library not installed (dompdf/dompdf).', 500);
        }

        if (! $this->hasHosxpConnection()) {
            return response('ไม่สามารถเชื่อมต่อฐานข้อมูล HOSxP ได้', 500);
        }

        try {
            $data = $this->buildReport($startDate, $endDate);
            $setting = SettingApp::first();
            $appName = $setting?->nama_app ?? config('app.name');

            [$fontRegularUri, $fontBoldUri] = $this->pdfFontUris();

            $html = view('finance.revenue-report-pdf', [
                'data' => $data,
                'startDate' => $startDate,
                'endDate' => $endDate,
                'generatedAt' => now()->timezone('Asia/Bangkok')->format('d/m/Y H:i:s'),
                'appName' => $appName,
                'fontRegularUri' => $fontRegularUri,
                'fontBoldUri' => $fontBoldUri,
                'formatBaht' => fn ($value) => $this->formatBaht($value),
                'formatPercent' => fn ($value) => $this->formatPercent($value),
            ])->render();

            $pdfBinary = $this->renderPdfFromHtml($html);

            return response($pdfBinary, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="finance_revenue_'.$startDate.'_to_'.$endDate.'.pdf"',
            ]);
        } catch (\Throwable $e) {
            Log::error('Finance revenue PDF export failed: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response('ไม่สามารถสร้างไฟล์ PDF ได้: '.$e->getMessage(), 500);
        }
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

        if (! file_exists($regularPath) || ! file_exists($boldPath)) {
            throw new \RuntimeException('Thai fonts missing in resources/fonts');
        }

        $options = new \Dompdf\Options();
        $options->set('isRemoteEnabled', false);
        $options->set('defaultFont', 'sarabun');
        $options->set('fontDir', $fontCacheDir);
        $options->set('fontCache', $fontCacheDir);
        $options->setChroot([base_path(), $fontSourceDir, $fontCacheDir]);

        $dompdf = new \Dompdf\Dompdf($options);
        $fontMetrics = $dompdf->getFontMetrics();
        $this->registerPdfFont($fontMetrics, $regularPath, 'normal');
        $this->registerPdfFont($fontMetrics, $boldPath, 'bold');

        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return $dompdf->output();
    }

    private function registerPdfFont(\Dompdf\FontMetrics $fontMetrics, string $path, string $weight): void
    {
        $fontMetrics->registerFont(
            ['family' => 'sarabun', 'style' => 'normal', 'weight' => $weight],
            'file://'.str_replace('\\', '/', realpath($path) ?: $path)
        );
    }

    private function formatBaht($value): string
    {
        return number_format((float) $value, 2).' บาท';
    }

    private function formatPercent($value): string
    {
        return number_format((float) $value, 2).'%';
    }

    private function wrapForExcel(string $text, int $maxCharsPerLine = 30): string
    {
        $text = trim(preg_replace('/\s+/u', ' ', $text) ?? '');
        if ($text === '' || mb_strlen($text) <= $maxCharsPerLine) {
            return $text;
        }

        return wordwrap($text, $maxCharsPerLine, "\n", true);
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

    private function excelSubtleHeaderStyle()
    {
        return (new StyleBuilder())
            ->setFontBold()
            ->setFontColor('1F2937')
            ->setBackgroundColor('D1FAE5')
            ->build();
    }

    private function excelFooterStyle()
    {
        return (new StyleBuilder())
            ->setFontBold()
            ->setBackgroundColor('FEF3C7')
            ->build();
    }

    private function buildReport(string $startDate, string $endDate): array
    {
        $conn = DB::connection('hosxp');
        $this->initHosxpSchema($conn);
        $ipdCond = $this->ipdConditionSql($conn);
        $opdCond = "NOT ({$ipdCond})";
        $ipdVisitKey = $this->ipdVisitKeySql($conn);
        $pttypeCode = $this->pttypeCodeSql();
        $pttypeName = $this->pttypeNameSql();
        $deptCode = $this->departmentCodeSql($ipdCond);
        $deptName = $this->departmentNameSql($ipdCond);

        $base = $this->baseQuery($conn, $startDate, $endDate);

        // Summary — ใช้ CASE แยกชัดเจน ไม่พึ่ง GROUP BY patient_type
        $summaryRow = (clone $base)
            ->selectRaw("SUM(CASE WHEN {$opdCond} THEN oi.sum_price ELSE 0 END) as opd_amount")
            ->selectRaw("SUM(CASE WHEN {$ipdCond} THEN oi.sum_price ELSE 0 END) as ipd_amount")
            ->selectRaw("COUNT(DISTINCT CASE WHEN {$opdCond} THEN oi.vn END) as opd_visits")
            ->selectRaw("COUNT(DISTINCT CASE WHEN {$ipdCond} THEN {$ipdVisitKey} END) as ipd_visits")
            ->selectRaw('COUNT(*) as total_items')
            ->first();

        $opdAmount = (float) ($summaryRow->opd_amount ?? 0);
        $ipdAmount = (float) ($summaryRow->ipd_amount ?? 0);
        $totalAmount = $opdAmount + $ipdAmount;

        $summary = [
            'total_amount' => $totalAmount,
            'opd_amount' => $opdAmount,
            'ipd_amount' => $ipdAmount,
            'opd_visits' => (int) ($summaryRow->opd_visits ?? 0),
            'ipd_visits' => (int) ($summaryRow->ipd_visits ?? 0),
            'total_items' => (int) ($summaryRow->total_items ?? 0),
            'opd_share' => $totalAmount > 0 ? round($opdAmount / $totalAmount * 100, 1) : 0,
            'ipd_share' => $totalAmount > 0 ? round($ipdAmount / $totalAmount * 100, 1) : 0,
        ];

        // By pttype — รวม OPD/IPD ต่อสิทธิ
        $byPttypeRaw = (clone $base)
            ->selectRaw("{$pttypeCode} as pttype_code")
            ->selectRaw("{$pttypeName} as pttype_name")
            ->selectRaw("SUM(CASE WHEN {$opdCond} THEN oi.sum_price ELSE 0 END) as opd_amount")
            ->selectRaw("SUM(CASE WHEN {$ipdCond} THEN oi.sum_price ELSE 0 END) as ipd_amount")
            ->selectRaw('SUM(oi.sum_price) as total_amount')
            ->selectRaw("COUNT(DISTINCT CASE WHEN {$opdCond} THEN oi.vn END) as opd_visits")
            ->selectRaw("COUNT(DISTINCT CASE WHEN {$ipdCond} THEN {$ipdVisitKey} END) as ipd_visits")
            ->selectRaw('COUNT(*) as items')
            ->groupByRaw($pttypeCode)
            ->groupByRaw($pttypeName)
            ->orderByDesc('total_amount')
            ->get();

        $byPttype = $byPttypeRaw->map(function ($row) use ($summary) {
            return [
                'pttype_code' => $row->pttype_code,
                'pttype_name' => $row->pttype_name,
                'opd_amount' => (float) $row->opd_amount,
                'ipd_amount' => (float) $row->ipd_amount,
                'opd_visits' => (int) $row->opd_visits,
                'ipd_visits' => (int) $row->ipd_visits,
                'total_amount' => (float) $row->total_amount,
                'items' => (int) $row->items,
                'share_percent' => $summary['total_amount'] > 0
                    ? round((float) $row->total_amount / $summary['total_amount'] * 100, 1)
                    : 0,
            ];
        })->values()->all();

        // By department — OPD ใช้ main_dep/kskdepartment, IPD ใช้ ward
        $byDepartmentRaw = (clone $base)
            ->selectRaw("{$deptCode} as department_code")
            ->selectRaw("{$deptName} as department_name")
            ->selectRaw("SUM(CASE WHEN {$opdCond} THEN oi.sum_price ELSE 0 END) as opd_amount")
            ->selectRaw("SUM(CASE WHEN {$ipdCond} THEN oi.sum_price ELSE 0 END) as ipd_amount")
            ->selectRaw('SUM(oi.sum_price) as total_amount')
            ->selectRaw("COUNT(DISTINCT CASE WHEN {$opdCond} THEN oi.vn END) as opd_visits")
            ->selectRaw("COUNT(DISTINCT CASE WHEN {$ipdCond} THEN {$ipdVisitKey} END) as ipd_visits")
            ->selectRaw('COUNT(*) as items')
            ->groupByRaw($deptCode)
            ->groupByRaw($deptName)
            ->orderByDesc('total_amount')
            ->get();

        $byDepartment = $byDepartmentRaw->map(function ($row) use ($summary) {
            $isWard = str_starts_with((string) $row->department_code, 'W:');

            return [
                'department_code' => $row->department_code,
                'department_name' => $row->department_name,
                'department_type' => $isWard ? 'ipd' : 'opd',
                'department_type_label' => $isWard ? 'ผู้ป่วยใน (หอ)' : 'ผู้ป่วยนอก (แผนก)',
                'opd_amount' => (float) $row->opd_amount,
                'ipd_amount' => (float) $row->ipd_amount,
                'opd_visits' => (int) $row->opd_visits,
                'ipd_visits' => (int) $row->ipd_visits,
                'total_amount' => (float) $row->total_amount,
                'items' => (int) $row->items,
                'share_percent' => $summary['total_amount'] > 0
                    ? round((float) $row->total_amount / $summary['total_amount'] * 100, 1)
                    : 0,
            ];
        })->values()->all();

        // Top 10 โรค (Principal ICD-10) ตามรายได้
        $hasIptDiag = $this->hasIptDiag($conn);
        $icdCode = $this->icd10CodeSql($ipdCond, $hasIptDiag);
        $icdName = $this->icd10NameSql($ipdCond, $hasIptDiag);
        $diseaseBase = $this->diagnosisQuery($conn, $startDate, $endDate);

        $topDiseasesRaw = (clone $diseaseBase)
            ->selectRaw("{$icdCode} as icd10_code")
            ->selectRaw("{$icdName} as disease_name")
            ->selectRaw('SUM(oi.sum_price) as total_amount')
            ->selectRaw("SUM(CASE WHEN {$opdCond} THEN oi.sum_price ELSE 0 END) as opd_amount")
            ->selectRaw("SUM(CASE WHEN {$ipdCond} THEN oi.sum_price ELSE 0 END) as ipd_amount")
            ->selectRaw('COUNT(DISTINCT oi.hn) as patients')
            ->selectRaw('COUNT(*) as items')
            ->groupByRaw($icdCode)
            ->groupByRaw($icdName)
            ->orderByDesc('total_amount')
            ->get()
            ->filter(fn ($row) => ($row->icd10_code ?? '-') !== '-')
            ->take(10)
            ->values();

        $topDiseases = $this->mapRankedRows($topDiseasesRaw, $totalAmount, 'icd10_code', 'disease_name');

        // Top 10 ยา ตามรายได้
        $topDrugsRaw = $this->drugQuery($conn, $startDate, $endDate)
            ->selectRaw('oi.icode as drug_code')
            ->selectRaw('d.name as drug_name')
            ->selectRaw('SUM(oi.sum_price) as total_amount')
            ->selectRaw("SUM(CASE WHEN {$opdCond} THEN oi.sum_price ELSE 0 END) as opd_amount")
            ->selectRaw("SUM(CASE WHEN {$ipdCond} THEN oi.sum_price ELSE 0 END) as ipd_amount")
            ->selectRaw('SUM(oi.qty) as total_qty')
            ->selectRaw('COUNT(DISTINCT oi.hn) as patients')
            ->selectRaw('COUNT(*) as items')
            ->groupBy('oi.icode', 'd.name')
            ->orderByDesc('total_amount')
            ->limit(10)
            ->get();

        $topDrugs = $this->mapRankedRows($topDrugsRaw, $totalAmount, 'drug_code', 'drug_name');

        $opdVsIpd = [
            ['name' => 'ผู้ป่วยนอก (OPD)', 'value' => $opdAmount, 'color' => '#3B82F6'],
            ['name' => 'ผู้ป่วยใน (IPD)', 'value' => $ipdAmount, 'color' => '#8B5CF6'],
        ];

        // Monthly trend
        $monthlyRaw = (clone $base)
            ->selectRaw('YEAR(oi.vstdate) as y')
            ->selectRaw('MONTH(oi.vstdate) as m')
            ->selectRaw("SUM(CASE WHEN {$opdCond} THEN oi.sum_price ELSE 0 END) as opd")
            ->selectRaw("SUM(CASE WHEN {$ipdCond} THEN oi.sum_price ELSE 0 END) as ipd")
            ->groupByRaw('YEAR(oi.vstdate), MONTH(oi.vstdate)')
            ->orderByRaw('YEAR(oi.vstdate), MONTH(oi.vstdate)')
            ->get();

        $thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        $monthly = $monthlyRaw->map(function ($row) use ($thaiMonths) {
            $opd = (float) $row->opd;
            $ipd = (float) $row->ipd;

            return [
                'y' => (int) $row->y,
                'm' => (int) $row->m,
                'label' => $thaiMonths[(int) $row->m - 1].' '.((int) $row->y + 543),
                'opd' => $opd,
                'ipd' => $ipd,
                'total' => $opd + $ipd,
            ];
        })->values()->all();

        return [
            'summary' => $summary,
            'by_pttype' => $byPttype,
            'by_department' => $byDepartment,
            'top_diseases' => $topDiseases,
            'top_drugs' => $topDrugs,
            'monthly' => $monthly,
            'opd_vs_ipd' => $opdVsIpd,
        ];
    }
}
