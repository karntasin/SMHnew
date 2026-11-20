<?php

namespace App\Http\Controllers;

use App\Models\SettingApp;
use Box\Spout\Common\Entity\Style\Border;
use Box\Spout\Common\Entity\Style\Color;
use Box\Spout\Writer\Common\Creator\Style\BorderBuilder;
use Box\Spout\Writer\Common\Creator\Style\StyleBuilder;
use Box\Spout\Writer\Common\Creator\WriterEntityFactory;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FinanceTreatmentValueController extends Controller
{
    private const MAX_REPORT_DAYS = 1100;
    private const CACHE_PREFIX = 'finance_treatment_val_';
    private const CACHE_VERSION = 'v1';

    public const CATEGORIES = [
        'inc03' => ['key' => 'inc03', 'label' => 'ค่ายา ในบัญชี', 'short' => 'ยาในบัญชี'],
        'inc17' => ['key' => 'inc17', 'label' => 'ค่ายา นอกบัญชี', 'short' => 'ยานอกบัญชี'],
        'inc05' => ['key' => 'inc05', 'label' => 'ค่าเวชภัณฑ์', 'short' => 'เวชภัณฑ์'],
        'inc07' => ['key' => 'inc07', 'label' => 'ค่าพยาธิ', 'short' => 'พยาธิ/แล็บ'],
        'inc06' => ['key' => 'inc06', 'label' => 'ค่าเลือด', 'short' => 'บริการโลหิต'],
        'inc08' => ['key' => 'inc08', 'label' => 'ค่ารังสี', 'short' => 'รังสี/เอ็กซเรย์'],
        'inc11' => ['key' => 'inc11', 'label' => 'ค่าหัตถการ', 'short' => 'หัตถการ/ผ่าตัด'],
        'inc09' => ['key' => 'inc09', 'label' => 'ค่าวินิจฉัยอื่น', 'short' => 'วินิจฉัยพิเศษ'],
        'inc13' => ['key' => 'inc13', 'label' => 'ค่าทันตกรรม', 'short' => 'ทันตกรรม'],
        'inc12' => ['key' => 'inc12', 'label' => 'ค่าบริการทางพยาบาล', 'short' => 'บริการพยาบาล'],
        'inc01' => ['key' => 'inc01', 'label' => 'ค่าเตียงสังเกตอาการ', 'short' => 'เตียงสังเกต/ห้อง'],
        'inc10' => ['key' => 'inc10', 'label' => 'ค่าเครื่องมือแพทย์', 'short' => 'เครื่องมือแพทย์'],
        'inc15' => ['key' => 'inc15', 'label' => 'ค่านวด', 'short' => 'นวด/แพทย์แผนไทย'],
        'inc16' => ['key' => 'inc16', 'label' => 'ค่าบริการอื่นๆ', 'short' => 'บริการอื่นๆ'],
    ];

    private function hasHosxpConnection(): bool
    {
        try {
            if (! config('database.connections.hosxp')) {
                return false;
            }
            DB::connection('hosxp')->getPdo();

            return true;
        } catch (\Throwable $e) {
            Log::warning('HOSxP connection not available in TreatmentValue: '.$e->getMessage());

            return false;
        }
    }

    private function parseDates(Request $request): array
    {
        $fiscalYear = $request->query('fiscal_year');
        if ($fiscalYear && is_numeric($fiscalYear)) {
            $fy = (int) $fiscalYear;
            $adYear = $fy > 2400 ? $fy - 543 : $fy;
            $startDate = ($adYear - 1).'-10-01';
            $endDate = $adYear.'-09-30';

            return [$startDate, $endDate, $fy];
        }

        $start = $request->query('start_date');
        $end = $request->query('end_date');

        if (! $start || ! $end) {
            // ค่าเริ่มต้น: ปีงบประมาณปัจจุบัน
            $currentMonth = (int) date('n');
            $currentYear = (int) date('Y');
            $fiscalAdYear = $currentMonth >= 10 ? $currentYear + 1 : $currentYear;
            $startDate = ($fiscalAdYear - 1).'-10-01';
            $endDate = min($fiscalAdYear.'-09-30', date('Y-m-d'));
            $fy = $fiscalAdYear + 543;

            return [$startDate, $endDate, $fy];
        }

        if (strtotime($start) > strtotime($end)) {
            [$start, $end] = [$end, $start];
        }

        $this->validateDateRange($start, $end);

        return [$start, $end, null];
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
                'ช่วงวันที่ยาวเกินไป กรุณาเลือกไม่เกิน '.self::MAX_REPORT_DAYS.' วัน'
            );
        }
    }

    private function extendExecutionTime(int $seconds = 300): void
    {
        if (function_exists('set_time_limit')) {
            @set_time_limit($seconds);
        }
    }

    private function getReportCacheKey(string $visitType, string $startDate, string $endDate): string
    {
        return self::CACHE_PREFIX.self::CACHE_VERSION."_{$visitType}_{$startDate}_{$endDate}";
    }

    private function getCacheTtl(string $endDate): int
    {
        if ($endDate < date('Y-m-d')) {
            return 86400; // ข้อมูลอดีต แคช 24 ชั่วโมง
        }

        return 1200; // ข้อมูลปัจจุบัน แคช 20 นาที
    }

    public function index(Request $request): Response
    {
        [$startDate, $endDate, $fiscalYear] = $this->parseDates($request);
        $visitType = strtolower($request->query('visit_type', 'opd')) === 'ipd' ? 'ipd' : 'opd';

        $filter = [
            'start_date' => $startDate,
            'end_date' => $endDate,
            'visit_type' => $visitType,
            'fiscal_year' => $fiscalYear,
            'start_date_label' => $this->formatThaiDateLabel($startDate),
            'end_date_label' => $this->formatThaiDateLabel($endDate),
        ];

        if (! $this->hasHosxpConnection()) {
            return Inertia::render('Finance/TreatmentValueDashboard', [
                'filter' => $filter,
                'hosxp_error' => 'ไม่สามารถเชื่อมต่อฐานข้อมูล HOSxP ได้ กรุณาตรวจสอบการเชื่อมต่อเครือข่าย',
                'rows' => [],
                'totals' => $this->emptyTotals(),
                'categories' => self::CATEGORIES,
                'chart_data' => [],
                'top_pttypes' => [],
                'is_cached' => false,
                'cached_at' => null,
            ]);
        }

        try {
            $this->extendExecutionTime();
            $forceRefresh = $request->boolean('refresh');
            $cacheKey = $this->getReportCacheKey($visitType, $startDate, $endDate);

            if ($forceRefresh) {
                Cache::forget($cacheKey);
            }

            $cacheTtl = $this->getCacheTtl($endDate);
            $cached = Cache::get($cacheKey);

            if ($cached !== null && ! $forceRefresh) {
                $data = $cached;
                $data['is_cached'] = true;
            } else {
                $data = $this->buildData($visitType, $startDate, $endDate);
                $data['cached_at'] = now()->timezone('Asia/Bangkok')->format('d/m/Y H:i:s');
                $data['is_cached'] = false;
                Cache::put($cacheKey, $data, $cacheTtl);
            }

            return Inertia::render('Finance/TreatmentValueDashboard', [
                'filter' => $filter,
                'hosxp_error' => null,
                ...$data,
            ]);
        } catch (\Throwable $e) {
            Log::error('FinanceTreatmentValue error: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return Inertia::render('Finance/TreatmentValueDashboard', [
                'filter' => $filter,
                'hosxp_error' => 'เกิดข้อผิดพลาดในการดึงข้อมูล: '.$e->getMessage(),
                'rows' => [],
                'totals' => $this->emptyTotals(),
                'categories' => self::CATEGORIES,
                'chart_data' => [],
                'top_pttypes' => [],
                'is_cached' => false,
                'cached_at' => null,
            ]);
        }
    }

    private function emptyTotals(): array
    {
        $totals = [
            'patient_count' => 0,
            'total_amount' => 0.0,
        ];
        foreach (array_keys(self::CATEGORIES) as $cat) {
            $totals[$cat] = 0.0;
        }

        return $totals;
    }

    private function buildData(string $visitType, string $startDate, string $endDate): array
    {
        $conn = DB::connection('hosxp');

        if ($visitType === 'ipd') {
            $rawRows = $conn->table('an_stat as ast')
                ->leftJoin('pttype as pt', 'pt.pttype', '=', 'ast.pttype')
                ->whereBetween('ast.dchdate', [$startDate, $endDate])
                ->whereNotNull('ast.dchdate')
                ->where('ast.dchdate', '<>', '')
                ->where('ast.dchdate', '<>', '0000-00-00')
                ->selectRaw("
                    COALESCE(NULLIF(TRIM(ast.pttype), ''), '-') as pttype_code,
                    COALESCE(pt.name, NULLIF(TRIM(ast.pttype), ''), 'ไม่ระบุสิทธิ') as pttype_name,
                    COUNT(DISTINCT ast.an) as patient_count,
                    SUM(COALESCE(ast.inc03, 0)) as inc03,
                    SUM(COALESCE(ast.inc17, 0)) as inc17,
                    SUM(COALESCE(ast.inc05, 0)) as inc05,
                    SUM(COALESCE(ast.inc07, 0)) as inc07,
                    SUM(COALESCE(ast.inc06, 0)) as inc06,
                    SUM(COALESCE(ast.inc08, 0)) as inc08,
                    SUM(COALESCE(ast.inc11, 0)) as inc11,
                    SUM(COALESCE(ast.inc09, 0)) as inc09,
                    SUM(COALESCE(ast.inc13, 0)) as inc13,
                    SUM(COALESCE(ast.inc12, 0)) as inc12,
                    SUM(COALESCE(ast.inc01, 0)) as inc01,
                    SUM(COALESCE(ast.inc10, 0)) as inc10,
                    SUM(COALESCE(ast.inc15, 0)) as inc15,
                    SUM(COALESCE(ast.inc16, 0)) as inc16,
                    SUM(COALESCE(ast.income, 0)) as total_amount
                ")
                ->groupByRaw("COALESCE(NULLIF(TRIM(ast.pttype), ''), '-')")
                ->groupByRaw("COALESCE(pt.name, NULLIF(TRIM(ast.pttype), ''), 'ไม่ระบุสิทธิ')")
                ->orderByDesc('total_amount')
                ->get();
        } else {
            $rawRows = $conn->table('vn_stat as v')
                ->leftJoin('ovst as o', 'o.vn', '=', 'v.vn')
                ->leftJoin('pttype as pt', 'pt.pttype', '=', 'v.pttype')
                ->whereBetween('v.vstdate', [$startDate, $endDate])
                ->where(function ($q) {
                    $q->whereNull('o.an')->orWhere('o.an', '');
                })
                ->selectRaw("
                    COALESCE(NULLIF(TRIM(v.pttype), ''), '-') as pttype_code,
                    COALESCE(pt.name, NULLIF(TRIM(v.pttype), ''), 'ไม่ระบุสิทธิ') as pttype_name,
                    COUNT(DISTINCT v.vn) as patient_count,
                    SUM(COALESCE(v.inc03, 0)) as inc03,
                    SUM(COALESCE(v.inc17, 0)) as inc17,
                    SUM(COALESCE(v.inc05, 0)) as inc05,
                    SUM(COALESCE(v.inc07, 0)) as inc07,
                    SUM(COALESCE(v.inc06, 0)) as inc06,
                    SUM(COALESCE(v.inc08, 0)) as inc08,
                    SUM(COALESCE(v.inc11, 0)) as inc11,
                    SUM(COALESCE(v.inc09, 0)) as inc09,
                    SUM(COALESCE(v.inc13, 0)) as inc13,
                    SUM(COALESCE(v.inc12, 0)) as inc12,
                    SUM(COALESCE(v.inc01, 0)) as inc01,
                    SUM(COALESCE(v.inc10, 0)) as inc10,
                    SUM(COALESCE(v.inc15, 0)) as inc15,
                    SUM(COALESCE(v.inc16, 0)) as inc16,
                    SUM(COALESCE(v.income, 0)) as total_amount
                ")
                ->groupByRaw("COALESCE(NULLIF(TRIM(v.pttype), ''), '-')")
                ->groupByRaw("COALESCE(pt.name, NULLIF(TRIM(v.pttype), ''), 'ไม่ระบุสิทธิ')")
                ->orderByDesc('total_amount')
                ->get();
        }

        $totals = $this->emptyTotals();
        $formattedRows = [];
        $index = 1;

        // ดึงยอดค่ายาแยกในบัญชี (ED) และนอกบัญชี (NED) ตาม drugaccount ของ drugitems ที่แท้จริง
        // เพื่อให้ตรงตามรายงานสรุปมูลค่าค่ารักษาพยาบาลของโรงพยาบาล 100%
        if ($visitType === 'ipd') {
            $drugRows = $conn->table('opitemrece as o')
                ->join('an_stat as a', 'a.an', '=', 'o.an')
                ->leftJoin('drugitems as d', 'd.icode', '=', 'o.icode')
                ->whereBetween('a.dchdate', [$startDate, $endDate])
                ->whereNotNull('a.dchdate')
                ->where('a.dchdate', '<>', '')
                ->where('a.dchdate', '<>', '0000-00-00')
                ->whereIn('o.income', ['03', '17'])
                ->selectRaw("
                    COALESCE(NULLIF(TRIM(a.pttype), ''), '-') as pttype_code,
                    SUM(CASE WHEN d.drugaccount IS NOT NULL AND TRIM(d.drugaccount) <> '' AND UPPER(TRIM(d.drugaccount)) <> 'NED' THEN o.sum_price ELSE 0 END) as inc03_ed,
                    SUM(CASE WHEN d.drugaccount IS NULL OR TRIM(d.drugaccount) = '' OR UPPER(TRIM(d.drugaccount)) = 'NED' THEN o.sum_price ELSE 0 END) as inc17_ned
                ")
                ->groupByRaw("COALESCE(NULLIF(TRIM(a.pttype), ''), '-')")
                ->get()
                ->keyBy('pttype_code');
        } else {
            $drugRows = $conn->table('opitemrece as o')
                ->leftJoin('drugitems as d', 'd.icode', '=', 'o.icode')
                ->whereBetween('o.vstdate', [$startDate, $endDate])
                ->where(function ($q) {
                    $q->whereNull('o.an')->orWhere('o.an', '');
                })
                ->whereIn('o.income', ['03', '17'])
                ->selectRaw("
                    COALESCE(NULLIF(TRIM(o.pttype), ''), '-') as pttype_code,
                    SUM(CASE WHEN d.drugaccount IS NOT NULL AND TRIM(d.drugaccount) <> '' AND UPPER(TRIM(d.drugaccount)) <> 'NED' THEN o.sum_price ELSE 0 END) as inc03_ed,
                    SUM(CASE WHEN d.drugaccount IS NULL OR TRIM(d.drugaccount) = '' OR UPPER(TRIM(d.drugaccount)) = 'NED' THEN o.sum_price ELSE 0 END) as inc17_ned
                ")
                ->groupByRaw("COALESCE(NULLIF(TRIM(o.pttype), ''), '-')")
                ->get()
                ->keyBy('pttype_code');
        }

        foreach ($rawRows as $r) {
            $rowTotal = (float) $r->total_amount;
            $pCount = (int) $r->patient_count;

            $totals['patient_count'] += $pCount;
            $totals['total_amount'] += $rowTotal;

            $rowData = [
                'index' => $index++,
                'pttype_code' => $r->pttype_code,
                'pttype_name' => $r->pttype_name,
                'patient_count' => $pCount,
                'total_amount' => $rowTotal,
                'remark' => '',
            ];

            foreach (array_keys(self::CATEGORIES) as $cat) {
                if ($cat === 'inc03' && isset($drugRows[$r->pttype_code])) {
                    $val = (float) $drugRows[$r->pttype_code]->inc03_ed;
                } elseif ($cat === 'inc17' && isset($drugRows[$r->pttype_code])) {
                    $val = (float) $drugRows[$r->pttype_code]->inc17_ned;
                } else {
                    $val = (float) ($r->{$cat} ?? 0);
                }
                $rowData[$cat] = $val;
                $totals[$cat] += $val;
            }

            $formattedRows[] = $rowData;
        }

        // เตรียมข้อมูลกราฟสัดส่วนหมวดค่าใช้จ่าย
        $chartData = [];
        $palette = [
            '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
            '#EC4899', '#06B6D4', '#14B8A6', '#6366F1', '#84CC16',
            '#F97316', '#64748B', '#0EA5E9', '#D946EF',
        ];
        $pi = 0;
        foreach (self::CATEGORIES as $key => $meta) {
            $val = $totals[$key] ?? 0.0;
            if ($val > 0) {
                $chartData[] = [
                    'name' => $meta['label'],
                    'short_name' => $meta['short'],
                    'value' => round($val, 2),
                    'color' => $palette[$pi % count($palette)],
                ];
                $pi++;
            }
        }
        usort($chartData, fn ($a, $b) => $b['value'] <=> $a['value']);

        // Top 5 สิทธิการรักษา
        $topPttypes = array_slice($formattedRows, 0, 5);

        return [
            'rows' => $formattedRows,
            'totals' => $totals,
            'categories' => self::CATEGORIES,
            'chart_data' => $chartData,
            'top_pttypes' => $topPttypes,
        ];
    }

    public function exportExcel(Request $request): StreamedResponse
    {
        [$startDate, $endDate] = $this->parseDates($request);
        $visitType = strtolower($request->query('visit_type', 'opd')) === 'ipd' ? 'ipd' : 'opd';
        $typeLabel = $visitType === 'ipd' ? 'IPD' : 'OPD';
        $fileName = 'treatment_value_'.$visitType.'_'.$startDate.'_to_'.$endDate.'.xlsx';

        return new StreamedResponse(function () use ($visitType, $startDate, $endDate, $typeLabel) {
            $writer = WriterEntityFactory::createXLSXWriter();
            $writer->openToFile('php://output');

            $titleStyle = (new StyleBuilder())
                ->setFontBold()
                ->setFontSize(14)
                ->setFontColor(Color::WHITE)
                ->setBackgroundColor(Color::rgb(15, 118, 110))
                ->build();

            $subTitleStyle = (new StyleBuilder())
                ->setFontSize(11)
                ->setFontColor(Color::rgb(75, 85, 99))
                ->build();

            $headerStyle = (new StyleBuilder())
                ->setFontBold()
                ->setFontSize(10)
                ->setBackgroundColor(Color::rgb(241, 245, 249))
                ->setBorder((new BorderBuilder())->setBorderBottom(Color::rgb(148, 163, 184), Border::WIDTH_THIN)->build())
                ->build();

            $totalStyle = (new StyleBuilder())
                ->setFontBold()
                ->setFontSize(10)
                ->setBackgroundColor(Color::rgb(226, 232, 240))
                ->build();

            $writer->addRow(WriterEntityFactory::createRowFromArray([
                'รายงานสรุปมูลค่ารายการค่ารักษาพยาบาล'.($visitType === 'ipd' ? 'ผู้ป่วยใน' : 'ผู้ป่วยนอก').' โรงพยาบาลค่ายสุรสิงหนาท',
            ], $titleStyle));

            $writer->addRow(WriterEntityFactory::createRowFromArray([
                'ช่วงวันที่ '.$this->formatThaiDateLabel($startDate).' ถึง '.$this->formatThaiDateLabel($endDate).' (ประเภท: '.$typeLabel.')',
            ], $subTitleStyle));

            $writer->addRow(WriterEntityFactory::createRowFromArray([])); // empty line

            $header = [
                'ลำดับ',
                'รายการสิทธิ',
                'จำนวนผู้ป่วย',
                'ค่ายา ในบัญชี',
                'ค่ายา นอกบัญชี',
                'ค่าเวชภัณฑ์',
                'ค่าพยาธิ',
                'ค่าเลือด',
                'ค่ารังสี',
                'ค่าหัตถการ',
                'ค่าวินิจฉัยอื่น',
                'ค่าทันตกรรม',
                'ค่าบริการทางพยาบาล',
                $visitType === 'ipd' ? 'ค่าห้องและค่าอาหาร' : 'ค่าเตียงสังเกตอาการ',
                'ค่าเครื่องมือแพทย์',
                'ค่านวด',
                'ค่าบริการอื่นๆ',
                'รวม',
                'หมายเหตุ',
            ];
            $writer->addRow(WriterEntityFactory::createRowFromArray($header, $headerStyle));

            $data = $this->buildData($visitType, $startDate, $endDate);

            foreach ($data['rows'] as $r) {
                $row = [
                    $r['index'],
                    $r['pttype_name'],
                    $r['patient_count'],
                    $r['inc03'] > 0 ? $r['inc03'] : '',
                    $r['inc17'] > 0 ? $r['inc17'] : '',
                    $r['inc05'] > 0 ? $r['inc05'] : '',
                    $r['inc07'] > 0 ? $r['inc07'] : '',
                    $r['inc06'] > 0 ? $r['inc06'] : '',
                    $r['inc08'] > 0 ? $r['inc08'] : '',
                    $r['inc11'] > 0 ? $r['inc11'] : '',
                    $r['inc09'] > 0 ? $r['inc09'] : '',
                    $r['inc13'] > 0 ? $r['inc13'] : '',
                    $r['inc12'] > 0 ? $r['inc12'] : '',
                    $r['inc01'] > 0 ? $r['inc01'] : '',
                    $r['inc10'] > 0 ? $r['inc10'] : '',
                    $r['inc15'] > 0 ? $r['inc15'] : '',
                    $r['inc16'] > 0 ? $r['inc16'] : '',
                    $r['total_amount'],
                    $r['remark'],
                ];
                $writer->addRow(WriterEntityFactory::createRowFromArray($row));
            }

            // Total row
            $t = $data['totals'];
            $writer->addRow(WriterEntityFactory::createRowFromArray([
                '',
                'รวมทั้งหมด',
                $t['patient_count'],
                $t['inc03'],
                $t['inc17'],
                $t['inc05'],
                $t['inc07'],
                $t['inc06'],
                $t['inc08'],
                $t['inc11'],
                $t['inc09'],
                $t['inc13'],
                $t['inc12'],
                $t['inc01'],
                $t['inc10'],
                $t['inc15'],
                $t['inc16'],
                $t['total_amount'],
                '',
            ], $totalStyle));

            $writer->close();
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$fileName.'"',
        ]);
    }

    public function exportPdf(Request $request)
    {
        [$startDate, $endDate] = $this->parseDates($request);
        $visitType = strtolower($request->query('visit_type', 'opd')) === 'ipd' ? 'ipd' : 'opd';
        $typeLabel = $visitType === 'ipd' ? 'ผู้ป่วยใน' : 'ผู้ป่วยนอก';

        $paper = strtolower((string) $request->query('paper', 'legal'));
        if (! in_array($paper, ['legal', 'a4', 'a3', 'folio'], true)) {
            $paper = 'legal';
        }

        if (! class_exists(Dompdf::class)) {
            return response('PDF library not installed (dompdf/dompdf).', 500);
        }

        if (! $this->hasHosxpConnection()) {
            return response('ไม่สามารถเชื่อมต่อฐานข้อมูล HOSxP ได้', 500);
        }

        try {
            $this->extendExecutionTime();
            $data = $this->buildData($visitType, $startDate, $endDate);

            $setting = SettingApp::first();
            $appName = $setting?->nama_app ?? config('app.name');
            [$fontRegularUri, $fontBoldUri] = $this->pdfFontUris();

            $html = view('finance.treatment-value-pdf', [
                'data' => $data,
                'visitType' => $visitType,
                'typeLabel' => $typeLabel,
                'startDate' => $startDate,
                'endDate' => $endDate,
                'paperSize' => $paper,
                'startDateLabel' => $this->formatThaiDateLabel($startDate),
                'endDateLabel' => $this->formatThaiDateLabel($endDate),
                'generatedAt' => now()->timezone('Asia/Bangkok')->format('d/m/Y H:i:s'),
                'appName' => $appName,
                'fontRegularUri' => $fontRegularUri,
                'fontBoldUri' => $fontBoldUri,
                'categories' => self::CATEGORIES,
                'formatNumber' => fn ($val) => $val > 0 ? number_format($val, 2) : '',
            ])->render();

            $pdfBinary = $this->renderPdfFromHtml($html, 'landscape', $paper);

            return response($pdfBinary, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="treatment_value_'.$visitType.'_'.$startDate.'_to_'.$endDate.'.pdf"',
            ]);
        } catch (\Throwable $e) {
            Log::error('Finance treatment value PDF failed: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response('ไม่สามารถสร้างไฟล์ PDF ได้: '.$e->getMessage(), 500);
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

    private function renderPdfFromHtml(string $html, string $orientation = 'landscape', string $paper = 'legal'): string
    {
        $fontSourceDir = resource_path('fonts');
        $fontCacheDir = storage_path('fonts');

        foreach ([$fontSourceDir, $fontCacheDir] as $dir) {
            if (! is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        }

        $options = new Options();
        $options->set('isRemoteEnabled', false);
        $options->set('defaultFont', 'sarabun');
        $options->set('fontDir', $fontCacheDir);
        $options->set('fontCache', $fontCacheDir);
        $options->setChroot([base_path(), $fontSourceDir, $fontCacheDir]);

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper($paper, $orientation);
        $dompdf->render();

        return $dompdf->output();
    }
}
