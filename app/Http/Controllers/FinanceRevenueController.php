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
    private const MAX_REPORT_DAYS = 366;

    /** @var array{has_oi_an: bool, has_iptdiag: bool, has_an_stat: bool} */
    private array $hosxpSchema = [];

    private function initHosxpSchema($conn): void
    {
        if ($this->hosxpSchema !== []) {
            return;
        }

        $this->hosxpSchema = [
            'has_oi_an' => $this->tableExists($conn, 'opitemrece')
                && $this->columnExists($conn, 'opitemrece', 'an'),
            'has_iptdiag' => $this->tableExists($conn, 'iptdiag'),
            'has_an_stat' => $this->tableExists($conn, 'an_stat')
                && $this->columnExists($conn, 'an_stat', 'income')
                && $this->columnExists($conn, 'an_stat', 'dchdate'),
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

    private function usesAnStatForIpd($conn): bool
    {
        $this->initHosxpSchema($conn);

        return $this->hosxpSchema['has_an_stat'];
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

        $this->validateDateRange($start, $end);

        return [$start, $end];
    }

    private function validateDateRange(string $startDate, string $endDate): void
    {
        $startTs = strtotime($startDate);
        $endTs = strtotime($endDate);

        if ($startTs === false || $endTs === false) {
            throw new \InvalidArgumentException('รูปแบบวันที่ไม่ถูกต้อง');
        }

        $days = (int) floor(($endTs - $startTs) / 86400) + 1;
        if ($days > self::MAX_REPORT_DAYS) {
            throw new \InvalidArgumentException(
                'ช่วงวันที่ยาวเกินไป กรุณาเลือกไม่เกิน '.self::MAX_REPORT_DAYS.' วัน (ประมาณ 12 เดือน)'
            );
        }
    }

    private function extendExecutionTime(int $seconds = 300): void
    {
        if (function_exists('set_time_limit')) {
            @set_time_limit($seconds);
        }
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
     * HOSxP รายได้:
     * - OPD: opitemrece.sum_price กรอง vstdate (ไม่มี an)
     * - IPD: an_stat.income กรอง dchdate (วันจำหน่าย) join ipt — fallback opitemrece ถ้าไม่มี an_stat
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

    private function opdConditionSql($conn): string
    {
        if ($this->usesAnStatForIpd($conn)) {
            $parts = ['(o.an IS NULL OR TRIM(o.an) = \'\')'];
            if ($this->opitemreceHasAn($conn)) {
                $parts[] = '(oi.an IS NULL OR TRIM(oi.an) = \'\')';
            }

            return '('.implode(' AND ', $parts).')';
        }

        return 'NOT ('.$this->ipdConditionSql($conn).')';
    }

    private function ipdConditionSqlForOpitemrece($conn): string
    {
        if ($this->usesAnStatForIpd($conn)) {
            return '0 = 1';
        }

        return $this->ipdConditionSql($conn);
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

    private function columnExists($conn, string $table, string $column): bool
    {
        try {
            return $conn->table('information_schema.columns')
                ->where('table_schema', $conn->getDatabaseName())
                ->where('table_name', $table)
                ->where('column_name', $column)
                ->exists();
        } catch (\Throwable) {
            return false;
        }
    }

    private function isDischargedAnStatSql(string $alias = 'ast'): string
    {
        return "({$alias}.dchdate IS NOT NULL AND {$alias}.dchdate <> '' AND {$alias}.dchdate <> '0000-00-00')";
    }

    private function ipdAnStatQuery($conn, string $startDate, string $endDate)
    {
        return $conn->table('an_stat as ast')
            ->join('ipt as i', 'i.an', '=', 'ast.an')
            ->leftJoin('pttype as pt', 'pt.pttype', '=', 'ast.pttype')
            ->whereBetween('ast.dchdate', [$startDate, $endDate])
            ->whereRaw($this->isDischargedAnStatSql('ast'));
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

    private function opdDiagnosisQuery($conn, string $startDate, string $endDate, string $opdCond)
    {
        return $conn->table('opitemrece as oi')
            ->leftJoin('ovst as o', 'o.vn', '=', 'oi.vn')
            ->leftJoin(DB::raw('ovstdiag od'), function ($join) {
                $join->on('od.vn', '=', 'oi.vn')->where('od.diagtype', '=', '1');
            })
            ->leftJoin(DB::raw('icd101 icd_od'), 'icd_od.code', '=', 'od.icd10')
            ->whereBetween('oi.vstdate', [$startDate, $endDate])
            ->whereRaw($opdCond);
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

    private function baseQuery($conn, string $startDate, string $endDate, bool $includeDepartmentJoins = true)
    {
        $iptAn = $this->iptJoinAnSql($conn);

        $query = $conn->table('opitemrece as oi')
            ->leftJoin('ovst as o', 'o.vn', '=', 'oi.vn')
            ->leftJoin(DB::raw('ipt i'), DB::raw('i.an'), '=', DB::raw($iptAn))
            ->leftJoin(DB::raw('pttype pt'), DB::raw('pt.pttype'), '=', DB::raw("COALESCE(NULLIF(i.pttype, ''), NULLIF(o.pttype, ''))"))
            ->whereBetween('oi.vstdate', [$startDate, $endDate]);

        if ($includeDepartmentJoins) {
            $query
                ->leftJoin(DB::raw('kskdepartment ksk'), DB::raw('ksk.depcode'), '=', 'o.main_dep')
                ->leftJoin(DB::raw('ward w'), DB::raw('w.ward'), '=', 'i.ward');
        }

        return $query;
    }

    public function index(Request $request): Response
    {
        try {
            [$startDate, $endDate] = $this->parseDates($request);
        } catch (\InvalidArgumentException $e) {
            $endDate = date('Y-m-d');
            $startDate = date('Y-m-d', strtotime('-1 month', strtotime($endDate)));

            return Inertia::render('Finance/RevenueDashboard', [
                'filter' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'start_date_label' => $this->formatThaiDateLabel($startDate),
                    'end_date_label' => $this->formatThaiDateLabel($endDate),
                ],
                'hosxp_error' => $e->getMessage(),
                'summary' => null,
                'by_pttype' => [],
                'by_department' => [],
                'top_diseases' => [],
                'top_drugs' => [],
                'monthly' => [],
                'opd_vs_ipd' => [],
            ]);
        }

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
            $this->extendExecutionTime();
            $data = $this->buildReport($startDate, $endDate);

            return Inertia::render('Finance/RevenueDashboard', [
                'filter' => $filter,
                'hosxp_error' => null,
                ...$data,
            ]);
        } catch (\Throwable $e) {
            Log::error('Finance revenue report failed: '.$e->getMessage());

            $message = $e instanceof \InvalidArgumentException
                ? $e->getMessage()
                : 'เกิดข้อผิดพลาดในการดึงข้อมูล: '.$e->getMessage();

            return Inertia::render('Finance/RevenueDashboard', [
                'filter' => $filter,
                'hosxp_error' => $message,
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
                $this->extendExecutionTime();
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
        return $this->renderRevenuePdf($request, 'finance.revenue-report-pdf', 'finance_revenue', 'portrait');
    }

    public function exportPttypePdf(Request $request)
    {
        return $this->renderRevenuePdf(
            $request,
            'finance.revenue-pttype-pdf',
            'revenue_pttype_detail',
            'landscape',
            pttypeOnly: true,
        );
    }

    public function exportPttypeExcel(Request $request): StreamedResponse
    {
        [$startDate, $endDate] = $this->parseDates($request);

        $fileName = 'revenue_pttype_detail_'.$startDate.'_to_'.$endDate.'.xlsx';

        return new StreamedResponse(function () use ($startDate, $endDate) {
            $writer = WriterEntityFactory::createXLSXWriter();
            $writer->openToFile('php://output');

            try {
                $this->extendExecutionTime();

                if (! $this->hasHosxpConnection()) {
                    $writer->addRow(WriterEntityFactory::createRowFromArray([
                        'Error',
                        'ไม่สามารถเชื่อมต่อฐานข้อมูล HOSxP ได้',
                    ], $this->excelHeaderStyle()));
                    $writer->close();

                    return;
                }

                $data = $this->buildPttypeReport($startDate, $endDate);
                $this->writePttypeDetailExcelSheet($writer, $data, $startDate, $endDate);
            } catch (\Throwable $e) {
                $writer->addRow(WriterEntityFactory::createRowFromArray(['Error', $e->getMessage()]));
            }

            $writer->close();
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$fileName.'"',
        ]);
    }

    /**
     * @param  array{summary?: array<string, mixed>, by_pttype?: list<array<string, mixed>>}  $data
     */
    private function writePttypeDetailExcelSheet($writer, array $data, string $startDate, string $endDate): void
    {
        $titleStyle = $this->excelTitleStyle();
        $metaStyle = $this->excelMetaStyle();
        $headerStyle = $this->excelHeaderStyle();
        $subtleHeaderStyle = $this->excelSubtleHeaderStyle();
        $footerStyle = $this->excelFooterStyle();
        $kpiStyle = $this->excelKpiStyle();
        $zebraStyle = $this->excelZebraStyle();
        $topRankStyle = $this->excelTopRankStyle();

        $summary = $data['summary'] ?? [];
        $rows = $data['by_pttype'] ?? [];
        $setting = SettingApp::first();
        $appName = $setting?->nama_app ?? config('app.name');

        $writer->getCurrentSheet()->setName('สิทธิ์การรักษา');

        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'รายงานรายละเอียดตามสิทธิ์การรักษา',
        ], $titleStyle));
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            $appName,
        ], $metaStyle));
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'ช่วงวันที่',
            $this->formatThaiDateLabel($startDate).' — '.$this->formatThaiDateLabel($endDate),
            $startDate.' ถึง '.$endDate,
        ], $metaStyle));
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'ออกรายงานเมื่อ',
            now()->timezone('Asia/Bangkok')->format('d/m/Y H:i:s'),
        ], $metaStyle));
        $writer->addRow(WriterEntityFactory::createRowFromArray(['']));

        $writer->addRow(WriterEntityFactory::createRowFromArray(['สรุปภาพรวม'], $subtleHeaderStyle));
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'รายได้รวมทั้งหมด',
            (float) ($summary['total_amount'] ?? 0),
            'บาท',
            'จำนวนรายการ',
            (float) ($summary['total_items'] ?? 0),
        ], $kpiStyle));
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'ผู้ป่วยนอก (OPD)',
            (float) ($summary['opd_amount'] ?? 0),
            'บาท',
            'สัดส่วน / ครั้ง',
            ($summary['opd_share'] ?? 0).'% · '.number_format((int) ($summary['opd_visits'] ?? 0)).' ครั้ง',
        ], $kpiStyle));
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'ผู้ป่วยใน (IPD)',
            (float) ($summary['ipd_amount'] ?? 0),
            'บาท',
            'สัดส่วน / ครั้ง',
            ($summary['ipd_share'] ?? 0).'% · '.number_format((int) ($summary['ipd_visits'] ?? 0)).' ครั้ง',
        ], $kpiStyle));
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'จำนวนสิทธิ์ที่พบ',
            count($rows),
            'สิทธิ',
            'เรียงลำดับ',
            'รายได้รวม มาก → น้อย',
        ], $kpiStyle));
        $writer->addRow(WriterEntityFactory::createRowFromArray(['']));

        $writer->addRow(WriterEntityFactory::createRowFromArray(['รายละเอียดตามสิทธิ์การรักษา'], $subtleHeaderStyle));
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            '#',
            'รหัสสิทธิ',
            'ชื่อสิทธิการรักษา',
            'OPD (บาท)',
            'IPD (บาท)',
            'รวม (บาท)',
            'สัดส่วน (%)',
            'รายการ',
            'OPD (ครั้ง)',
            'IPD (ครั้ง)',
        ], $headerStyle));

        foreach ($rows as $index => $row) {
            $rowStyle = $index < 3 ? $topRankStyle : ($index % 2 === 1 ? $zebraStyle : null);

            $writer->addRow(WriterEntityFactory::createRowFromArray([
                $index + 1,
                $row['pttype_code'] ?? '-',
                $this->wrapForExcel((string) ($row['pttype_name'] ?? ''), 40),
                (float) ($row['opd_amount'] ?? 0),
                (float) ($row['ipd_amount'] ?? 0),
                (float) ($row['total_amount'] ?? 0),
                (float) ($row['share_percent'] ?? 0),
                (int) ($row['items'] ?? 0),
                (int) ($row['opd_visits'] ?? 0),
                (int) ($row['ipd_visits'] ?? 0),
            ], $rowStyle));
        }

        if ($rows !== []) {
            $writer->addRow(WriterEntityFactory::createRowFromArray([
                '',
                '',
                'รวมทั้งหมด',
                (float) ($summary['opd_amount'] ?? 0),
                (float) ($summary['ipd_amount'] ?? 0),
                (float) ($summary['total_amount'] ?? 0),
                100.0,
                (int) ($summary['total_items'] ?? 0),
                (int) ($summary['opd_visits'] ?? 0),
                (int) ($summary['ipd_visits'] ?? 0),
            ], $footerStyle));
        }

        $writer->addRow(WriterEntityFactory::createRowFromArray(['']));
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'หมายเหตุ: OPD จาก opitemrece (vstdate) · IPD จาก an_stat.income (วันจำหน่าย dchdate) join ipt · จัดอันดับตามรายได้รวมจากมากไปน้อย',
        ], $metaStyle));
    }

    private function renderRevenuePdf(
        Request $request,
        string $view,
        string $filePrefix,
        string $orientation,
        bool $pttypeOnly = false,
    ) {
        [$startDate, $endDate] = $this->parseDates($request);

        if (! class_exists(\Dompdf\Dompdf::class)) {
            return response('PDF library not installed (dompdf/dompdf).', 500);
        }

        if (! $this->hasHosxpConnection()) {
            return response('ไม่สามารถเชื่อมต่อฐานข้อมูล HOSxP ได้', 500);
        }

        try {
            $this->extendExecutionTime();
            $data = $pttypeOnly
                ? $this->buildPttypeReport($startDate, $endDate)
                : $this->buildReport($startDate, $endDate);
            $setting = SettingApp::first();
            $appName = $setting?->nama_app ?? config('app.name');

            [$fontRegularUri, $fontBoldUri] = $this->pdfFontUris();

            $html = view($view, [
                'data' => $data,
                'startDate' => $startDate,
                'endDate' => $endDate,
                'startDateLabel' => $this->formatThaiDateLabel($startDate),
                'endDateLabel' => $this->formatThaiDateLabel($endDate),
                'generatedAt' => now()->timezone('Asia/Bangkok')->format('d/m/Y H:i:s'),
                'appName' => $appName,
                'fontRegularUri' => $fontRegularUri,
                'fontBoldUri' => $fontBoldUri,
                'formatBaht' => fn ($value) => $this->formatBaht($value),
                'formatPercent' => fn ($value) => $this->formatPercent($value),
            ])->render();

            $pdfBinary = $this->renderPdfFromHtml($html, $orientation);

            return response($pdfBinary, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="'.$filePrefix.'_'.$startDate.'_to_'.$endDate.'.pdf"',
            ]);
        } catch (\Throwable $e) {
            Log::error('Finance revenue PDF export failed: '.$e->getMessage(), [
                'view' => $view,
                'trace' => $e->getTraceAsString(),
            ]);

            $message = $e instanceof \InvalidArgumentException
                ? $e->getMessage()
                : 'ไม่สามารถสร้างไฟล์ PDF ได้: '.$e->getMessage();

            return response($message, 500);
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

    private function renderPdfFromHtml(string $html, string $orientation = 'portrait'): string
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
        $dompdf->setPaper('A4', $orientation === 'landscape' ? 'landscape' : 'portrait');
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

    private function excelKpiStyle()
    {
        return (new StyleBuilder())
            ->setFontColor('0F766E')
            ->setBackgroundColor('F0FDFA')
            ->build();
    }

    private function excelZebraStyle()
    {
        return (new StyleBuilder())
            ->setBackgroundColor('F9FAFB')
            ->build();
    }

    private function excelTopRankStyle()
    {
        return (new StyleBuilder())
            ->setFontBold()
            ->setBackgroundColor('FEF3C7')
            ->build();
    }

    private function buildPttypeReport(string $startDate, string $endDate): array
    {
        $conn = DB::connection('hosxp');
        $this->initHosxpSchema($conn);
        $ipdCond = $this->ipdConditionSqlForOpitemrece($conn);
        $opdCond = $this->opdConditionSql($conn);
        $ipdVisitKey = $this->ipdVisitKeySql($conn);
        $pttypeCode = $this->pttypeCodeSql();
        $pttypeName = $this->pttypeNameSql();

        $base = $this->baseQuery($conn, $startDate, $endDate, includeDepartmentJoins: false);
        $summary = $this->computeSummary($conn, $base, $startDate, $endDate, $opdCond, $ipdCond, $ipdVisitKey);
        $byPttype = $this->computeByPttype($conn, $base, $summary, $startDate, $endDate, $opdCond, $ipdCond, $ipdVisitKey, $pttypeCode, $pttypeName);

        return [
            'summary' => $summary,
            'by_pttype' => $byPttype,
        ];
    }

    /**
     * @param  \Illuminate\Database\Query\Builder  $base
     * @return array<string, mixed>
     */
    private function computeSummary(
        $conn,
        $base,
        string $startDate,
        string $endDate,
        string $opdCond,
        string $ipdCond,
        string $ipdVisitKey,
    ): array {
        $summaryRow = (clone $base)
            ->selectRaw("SUM(CASE WHEN {$opdCond} THEN oi.sum_price ELSE 0 END) as opd_amount")
            ->selectRaw("COUNT(DISTINCT CASE WHEN {$opdCond} THEN oi.vn END) as opd_visits")
            ->selectRaw("COUNT(CASE WHEN {$opdCond} THEN 1 END) as opd_items")
            ->first();

        $opdAmount = (float) ($summaryRow->opd_amount ?? 0);
        $opdVisits = (int) ($summaryRow->opd_visits ?? 0);
        $opdItems = (int) ($summaryRow->opd_items ?? 0);

        if ($this->usesAnStatForIpd($conn)) {
            $ipdRow = $this->ipdAnStatQuery($conn, $startDate, $endDate)
                ->selectRaw('SUM(ast.income) as ipd_amount')
                ->selectRaw('COUNT(DISTINCT ast.an) as ipd_visits')
                ->selectRaw('COUNT(*) as ipd_items')
                ->first();
            $ipdAmount = (float) ($ipdRow->ipd_amount ?? 0);
            $ipdVisits = (int) ($ipdRow->ipd_visits ?? 0);
            $ipdItems = (int) ($ipdRow->ipd_items ?? 0);
        } else {
            $ipdRow = (clone $base)
                ->selectRaw("SUM(CASE WHEN {$ipdCond} THEN oi.sum_price ELSE 0 END) as ipd_amount")
                ->selectRaw("COUNT(DISTINCT CASE WHEN {$ipdCond} THEN {$ipdVisitKey} END) as ipd_visits")
                ->selectRaw("COUNT(CASE WHEN {$ipdCond} THEN 1 END) as ipd_items")
                ->first();
            $ipdAmount = (float) ($ipdRow->ipd_amount ?? 0);
            $ipdVisits = (int) ($ipdRow->ipd_visits ?? 0);
            $ipdItems = (int) ($ipdRow->ipd_items ?? 0);
        }

        $totalAmount = $opdAmount + $ipdAmount;

        return [
            'total_amount' => $totalAmount,
            'opd_amount' => $opdAmount,
            'ipd_amount' => $ipdAmount,
            'opd_visits' => $opdVisits,
            'ipd_visits' => $ipdVisits,
            'total_items' => $opdItems + $ipdItems,
            'opd_share' => $totalAmount > 0 ? round($opdAmount / $totalAmount * 100, 1) : 0,
            'ipd_share' => $totalAmount > 0 ? round($ipdAmount / $totalAmount * 100, 1) : 0,
        ];
    }

    /**
     * @param  \Illuminate\Support\Collection<string, object>  $left
     * @param  \Illuminate\Support\Collection<string, object>  $right
     * @param  callable(string, ?object, ?object): array<string, mixed>  $mergeFn
     * @return list<array<string, mixed>>
     */
    private function mergeKeyedRows($left, $right, callable $mergeFn, string $sortKey = 'total_amount'): array
    {
        $keys = $left->keys()->merge($right->keys())->unique();

        return $keys->map(fn ($key) => $mergeFn($key, $left->get($key), $right->get($key)))
            ->sortByDesc($sortKey)
            ->values()
            ->all();
    }

    /**
     * @param  \Illuminate\Database\Query\Builder  $base
     * @param  array<string, mixed>  $summary
     * @return list<array<string, mixed>>
     */
    private function computeByPttype(
        $conn,
        $base,
        array $summary,
        string $startDate,
        string $endDate,
        string $opdCond,
        string $ipdCond,
        string $ipdVisitKey,
        string $pttypeCode,
        string $pttypeName,
    ): array {
        if (! $this->usesAnStatForIpd($conn)) {
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

            return $byPttypeRaw->map(function ($row) use ($summary) {
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
        }

        $opdRows = (clone $base)
            ->selectRaw("{$pttypeCode} as pttype_code")
            ->selectRaw("{$pttypeName} as pttype_name")
            ->selectRaw("SUM(CASE WHEN {$opdCond} THEN oi.sum_price ELSE 0 END) as opd_amount")
            ->selectRaw("COUNT(DISTINCT CASE WHEN {$opdCond} THEN oi.vn END) as opd_visits")
            ->selectRaw("COUNT(CASE WHEN {$opdCond} THEN 1 END) as opd_items")
            ->groupByRaw($pttypeCode)
            ->groupByRaw($pttypeName)
            ->get()
            ->keyBy('pttype_code');

        $ipdRows = $this->ipdAnStatQuery($conn, $startDate, $endDate)
            ->selectRaw("COALESCE(NULLIF(ast.pttype, ''), '-') as pttype_code")
            ->selectRaw("COALESCE(pt.name, NULLIF(ast.pttype, ''), 'ไม่ระบุสิทธิ') as pttype_name")
            ->selectRaw('SUM(ast.income) as ipd_amount')
            ->selectRaw('COUNT(DISTINCT ast.an) as ipd_visits')
            ->selectRaw('COUNT(*) as ipd_items')
            ->groupByRaw("COALESCE(NULLIF(ast.pttype, ''), '-')")
            ->groupByRaw("COALESCE(pt.name, NULLIF(ast.pttype, ''), 'ไม่ระบุสิทธิ')")
            ->get()
            ->keyBy('pttype_code');

        return $this->mergeKeyedRows($opdRows, $ipdRows, function ($code, $opd, $ipd) use ($summary) {
            $opdAmount = (float) ($opd->opd_amount ?? 0);
            $ipdAmount = (float) ($ipd->ipd_amount ?? 0);
            $total = $opdAmount + $ipdAmount;

            return [
                'pttype_code' => $code,
                'pttype_name' => $ipd->pttype_name ?? $opd->pttype_name ?? $code,
                'opd_amount' => $opdAmount,
                'ipd_amount' => $ipdAmount,
                'opd_visits' => (int) ($opd->opd_visits ?? 0),
                'ipd_visits' => (int) ($ipd->ipd_visits ?? 0),
                'total_amount' => $total,
                'items' => (int) (($opd->opd_items ?? 0) + ($ipd->ipd_items ?? 0)),
                'share_percent' => $summary['total_amount'] > 0
                    ? round($total / $summary['total_amount'] * 100, 1)
                    : 0,
            ];
        });
    }

    /**
     * @param  \Illuminate\Database\Query\Builder  $base
     * @param  array<string, mixed>  $summary
     * @return list<array<string, mixed>>
     */
    private function computeByDepartment(
        $conn,
        $base,
        array $summary,
        string $startDate,
        string $endDate,
        string $opdCond,
        string $ipdCond,
        string $ipdVisitKey,
        string $deptCode,
        string $deptName,
    ): array {
        if (! $this->usesAnStatForIpd($conn)) {
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

            return $byDepartmentRaw->map(function ($row) use ($summary) {
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
        }

        $opdDeptCode = "CONCAT('D:', COALESCE(NULLIF(o.main_dep, ''), '-'))";
        $opdDeptName = "COALESCE(ksk.department, NULLIF(o.main_dep, ''), 'ไม่ระบุแผนก')";

        $opdRows = (clone $base)
            ->selectRaw("{$opdDeptCode} as department_code")
            ->selectRaw("{$opdDeptName} as department_name")
            ->selectRaw("SUM(CASE WHEN {$opdCond} THEN oi.sum_price ELSE 0 END) as opd_amount")
            ->selectRaw("COUNT(DISTINCT CASE WHEN {$opdCond} THEN oi.vn END) as opd_visits")
            ->selectRaw("COUNT(CASE WHEN {$opdCond} THEN 1 END) as opd_items")
            ->groupByRaw($opdDeptCode)
            ->groupByRaw($opdDeptName)
            ->get()
            ->keyBy('department_code');

        $ipdRows = $this->ipdAnStatQuery($conn, $startDate, $endDate)
            ->leftJoin('ward as w', 'w.ward', '=', 'i.ward')
            ->selectRaw("CONCAT('W:', COALESCE(NULLIF(i.ward, ''), '-')) as department_code")
            ->selectRaw("COALESCE(w.name, NULLIF(i.ward, ''), 'ไม่ระบุหอผู้ป่วย') as department_name")
            ->selectRaw('SUM(ast.income) as ipd_amount')
            ->selectRaw('COUNT(DISTINCT ast.an) as ipd_visits')
            ->selectRaw('COUNT(*) as ipd_items')
            ->groupByRaw("CONCAT('W:', COALESCE(NULLIF(i.ward, ''), '-'))")
            ->groupByRaw("COALESCE(w.name, NULLIF(i.ward, ''), 'ไม่ระบุหอผู้ป่วย')")
            ->get()
            ->keyBy('department_code');

        return $this->mergeKeyedRows($opdRows, $ipdRows, function ($code, $opd, $ipd) use ($summary) {
            $isWard = str_starts_with((string) $code, 'W:');
            $opdAmount = (float) ($opd->opd_amount ?? 0);
            $ipdAmount = (float) ($ipd->ipd_amount ?? 0);
            $total = $opdAmount + $ipdAmount;

            return [
                'department_code' => $code,
                'department_name' => $ipd->department_name ?? $opd->department_name ?? $code,
                'department_type' => $isWard ? 'ipd' : 'opd',
                'department_type_label' => $isWard ? 'ผู้ป่วยใน (หอ)' : 'ผู้ป่วยนอก (แผนก)',
                'opd_amount' => $opdAmount,
                'ipd_amount' => $ipdAmount,
                'opd_visits' => (int) ($opd->opd_visits ?? 0),
                'ipd_visits' => (int) ($ipd->ipd_visits ?? 0),
                'total_amount' => $total,
                'items' => (int) (($opd->opd_items ?? 0) + ($ipd->ipd_items ?? 0)),
                'share_percent' => $summary['total_amount'] > 0
                    ? round($total / $summary['total_amount'] * 100, 1)
                    : 0,
            ];
        });
    }

    /**
     * @param  \Illuminate\Database\Query\Builder  $base
     * @return list<array<string, mixed>>
     */
    private function computeMonthlyTrend(
        $conn,
        $base,
        string $startDate,
        string $endDate,
        string $opdCond,
        string $ipdCond,
    ): array {
        $thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

        $opdMonthly = (clone $base)
            ->selectRaw('YEAR(oi.vstdate) as y')
            ->selectRaw('MONTH(oi.vstdate) as m')
            ->selectRaw("SUM(CASE WHEN {$opdCond} THEN oi.sum_price ELSE 0 END) as opd")
            ->groupByRaw('YEAR(oi.vstdate), MONTH(oi.vstdate)')
            ->get()
            ->keyBy(fn ($row) => sprintf('%04d-%02d', $row->y, $row->m));

        if ($this->usesAnStatForIpd($conn)) {
            $ipdMonthly = $this->ipdAnStatQuery($conn, $startDate, $endDate)
                ->selectRaw('YEAR(ast.dchdate) as y')
                ->selectRaw('MONTH(ast.dchdate) as m')
                ->selectRaw('SUM(ast.income) as ipd')
                ->groupByRaw('YEAR(ast.dchdate), MONTH(ast.dchdate)')
                ->get()
                ->keyBy(fn ($row) => sprintf('%04d-%02d', $row->y, $row->m));
        } else {
            $ipdMonthly = (clone $base)
                ->selectRaw('YEAR(oi.vstdate) as y')
                ->selectRaw('MONTH(oi.vstdate) as m')
                ->selectRaw("SUM(CASE WHEN {$ipdCond} THEN oi.sum_price ELSE 0 END) as ipd")
                ->groupByRaw('YEAR(oi.vstdate), MONTH(oi.vstdate)')
                ->get()
                ->keyBy(fn ($row) => sprintf('%04d-%02d', $row->y, $row->m));
        }

        $keys = $opdMonthly->keys()->merge($ipdMonthly->keys())->unique()->sort()->values();

        return $keys->map(function ($key) use ($opdMonthly, $ipdMonthly, $thaiMonths) {
            [$y, $m] = explode('-', $key);
            $opd = (float) ($opdMonthly->get($key)?->opd ?? 0);
            $ipd = (float) ($ipdMonthly->get($key)?->ipd ?? 0);

            return [
                'y' => (int) $y,
                'm' => (int) $m,
                'label' => $thaiMonths[(int) $m - 1].' '.((int) $y + 543),
                'opd' => $opd,
                'ipd' => $ipd,
                'total' => $opd + $ipd,
            ];
        })->values()->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function computeTopDiseases(
        $conn,
        string $startDate,
        string $endDate,
        string $opdCond,
        string $ipdCond,
        float $totalAmount,
    ): array {
        if ($this->usesAnStatForIpd($conn)) {
            $opdIcdCode = "COALESCE(NULLIF(od.icd10, ''), '-')";
            $opdIcdName = "COALESCE(NULLIF(icd_od.tname, ''), icd_od.name, NULLIF(od.icd10, ''), 'ไม่ระบุวินิจฉัย')";

            $opdRows = $this->opdDiagnosisQuery($conn, $startDate, $endDate, $opdCond)
                ->selectRaw("{$opdIcdCode} as icd10_code")
                ->selectRaw("{$opdIcdName} as disease_name")
                ->selectRaw('SUM(oi.sum_price) as opd_amount')
                ->selectRaw('COUNT(DISTINCT oi.hn) as opd_patients')
                ->selectRaw('COUNT(*) as opd_items')
                ->groupByRaw($opdIcdCode)
                ->groupByRaw($opdIcdName)
                ->havingRaw('icd10_code <> ?', ['-'])
                ->get()
                ->keyBy('icd10_code');

            $ipdIcdCode = "COALESCE(NULLIF(ast.pdx, ''), '-')";
            $ipdIcdName = "COALESCE(NULLIF(icd.tname, ''), icd.name, NULLIF(ast.pdx, ''), 'ไม่ระบุวินิจฉัย')";

            $ipdRows = $this->ipdAnStatQuery($conn, $startDate, $endDate)
                ->leftJoin('icd101 as icd', 'icd.code', '=', 'ast.pdx')
                ->selectRaw("{$ipdIcdCode} as icd10_code")
                ->selectRaw("{$ipdIcdName} as disease_name")
                ->selectRaw('SUM(ast.income) as ipd_amount')
                ->selectRaw('COUNT(DISTINCT ast.hn) as ipd_patients')
                ->selectRaw('COUNT(*) as ipd_items')
                ->groupByRaw($ipdIcdCode)
                ->groupByRaw($ipdIcdName)
                ->havingRaw('icd10_code <> ?', ['-'])
                ->get()
                ->keyBy('icd10_code');

            $merged = $this->mergeKeyedRows($opdRows, $ipdRows, function ($code, $opd, $ipd) {
                $opdAmount = (float) ($opd->opd_amount ?? 0);
                $ipdAmount = (float) ($ipd->ipd_amount ?? 0);

                return [
                    'icd10_code' => $code,
                    'disease_name' => $ipd->disease_name ?? $opd->disease_name ?? $code,
                    'opd_amount' => $opdAmount,
                    'ipd_amount' => $ipdAmount,
                    'total_amount' => $opdAmount + $ipdAmount,
                    'patients' => (int) (($opd->opd_patients ?? 0) + ($ipd->ipd_patients ?? 0)),
                    'items' => (int) (($opd->opd_items ?? 0) + ($ipd->ipd_items ?? 0)),
                ];
            });

            return collect($merged)->take(10)->values()->map(function ($row, $index) use ($totalAmount) {
                $row['rank'] = $index + 1;
                $row['share_percent'] = $totalAmount > 0
                    ? round($row['total_amount'] / $totalAmount * 100, 1)
                    : 0;

                return $row;
            })->all();
        }

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
            ->havingRaw('icd10_code <> ?', ['-'])
            ->orderByDesc('total_amount')
            ->limit(10)
            ->get();

        return $this->mapRankedRows($topDiseasesRaw, $totalAmount, 'icd10_code', 'disease_name');
    }

    private function buildReport(string $startDate, string $endDate): array
    {
        $conn = DB::connection('hosxp');
        $this->initHosxpSchema($conn);
        $ipdCond = $this->ipdConditionSqlForOpitemrece($conn);
        $opdCond = $this->opdConditionSql($conn);
        $ipdVisitKey = $this->ipdVisitKeySql($conn);
        $pttypeCode = $this->pttypeCodeSql();
        $pttypeName = $this->pttypeNameSql();
        $deptCode = $this->departmentCodeSql($ipdCond);
        $deptName = $this->departmentNameSql($ipdCond);

        $base = $this->baseQuery($conn, $startDate, $endDate);

        $summary = $this->computeSummary($conn, $base, $startDate, $endDate, $opdCond, $ipdCond, $ipdVisitKey);
        $totalAmount = (float) $summary['total_amount'];
        $opdAmount = (float) $summary['opd_amount'];
        $ipdAmount = (float) $summary['ipd_amount'];

        $byPttype = $this->computeByPttype($conn, $base, $summary, $startDate, $endDate, $opdCond, $ipdCond, $ipdVisitKey, $pttypeCode, $pttypeName);

        $byDepartment = $this->computeByDepartment(
            $conn,
            $base,
            $summary,
            $startDate,
            $endDate,
            $opdCond,
            $ipdCond,
            $ipdVisitKey,
            $deptCode,
            $deptName,
        );

        $topDiseases = $this->computeTopDiseases($conn, $startDate, $endDate, $opdCond, $ipdCond, $totalAmount);

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

        $monthly = $this->computeMonthlyTrend($conn, $base, $startDate, $endDate, $opdCond, $ipdCond);

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
