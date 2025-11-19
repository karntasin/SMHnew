<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Services\Risk\ThaiAscvdCalculator;

class DashboardController extends Controller
{
    private function hasHosxpConnection(): bool
    {
        try {
            if (!config('database.connections.hosxp')) {
                return false;
            }
            
            DB::connection('hosxp')->getPdo();
            return true;
        } catch (\Exception $e) {
            Log::warning('HOSxP connection not available: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Detect CV risk schema in database
     */
    private function detectCvRiskSchema($conn): ?array
    {
        try {
            // Check for QRISK3 table first (most likely in HOSxP)
            $dbName = $conn->getDatabaseName();
            $qrisk3Exists = $conn->table('information_schema.tables')
                ->where('table_schema', $dbName)
                ->where('table_name', 'patient_qrisk3')
                ->exists();
            
            if ($qrisk3Exists) {
                return [
                    'table' => 'patient_qrisk3',
                    'date' => 'update_datetime',
                    'score' => 'score_2017',
                    'category' => null, // QRISK3 doesn't have category column
                ];
            }

            // Fallback: try to detect other CV risk tables
            $candidates = [
                'cvdrisk', 'cv_risk', 'cvrisk', 'opd_cvd_risk', 'patient_cvrisk'
            ];
            $dateCols = ['risk_date', 'vstdate', 'date', 'record_date', 'service_date', 'update_datetime'];
            $scoreCols = ['score', 'risk_score', 'cvd_risk', 'cv_risk_score', 'score_2017'];
            $categoryCols = ['category', 'risk_level'];

            foreach ($candidates as $table) {
                $cols = $conn->table('information_schema.columns')
                    ->select('column_name')
                    ->where('table_schema', $dbName)
                    ->where('table_name', $table)
                    ->pluck('column_name')
                    ->toArray();
                if (!$cols) continue;

                $dateCol = null; $scoreCol = null; $catCol = null;
                foreach ($dateCols as $d) if (in_array($d, $cols)) { $dateCol = $d; break; }
                foreach ($scoreCols as $s) if (in_array($s, $cols)) { $scoreCol = $s; break; }
                foreach ($categoryCols as $c) if (in_array($c, $cols)) { $catCol = $c; break; }

                if ($dateCol && $scoreCol) {
                    return [
                        'table' => $table,
                        'date' => $dateCol,
                        'score' => $scoreCol,
                        'category' => $catCol,
                    ];
                }
            }
        } catch (\Throwable $e) {
            // ignore and fallthrough
        }
        return null;
    }

    /**
     * Return a localized abbreviated month label. For Thai locale, year is converted to BE (+543).
     * Examples: 'Oct 2025' or 'ต.ค. 2568'
     */
    private function monthLabel(int $y, int $m): string
    {
        try {
            $locale = app()->getLocale() ?? config('app.locale');
            $fmt = new \IntlDateFormatter($locale, \IntlDateFormatter::NONE, \IntlDateFormatter::NONE, null, null, 'MMM');
            $dt = new \DateTime();
            $dt->setDate($y, $m, 1);
            $month = $fmt->format($dt);
            // For Thai, convert year to Buddhist Era
            if (str_starts_with($locale, 'th')) {
                $beYear = $y + 543;
                return sprintf('%s %d', $month, $beYear);
            }
            return sprintf('%s %04d', $month, $y);
        } catch (\Throwable $e) {
            return sprintf('%04d-%02d', $y, $m);
        }
    }

    private function parseDates(Request $request): array
    {
        $start = $request->query('start_date');
        $end = $request->query('end_date');

        // Default to last 6 months if no dates provided
        if (!$start || !$end) {
            $endDate = date('Y-m-d'); // วันนี้
            // นับย้อนหลัง 6 เดือนจากวันนี้
            $startDate = date('Y-m-d', strtotime('-6 months', strtotime($endDate)));
        } else {
            $startDate = date('Y-m-d', strtotime($start));
            $endDate = date('Y-m-d', strtotime($end));
        }

        return [$startDate, $endDate];
    }

    public function index(Request $request): Response
    {
        [$startDate, $endDate] = $this->parseDates($request);

        $stats = $this->buildStats($startDate, $endDate);

        return Inertia::render('dashboard', [
            'filter' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'stats' => $stats,
        ]);
    }

    public function stats(Request $request)
    {
        [$startDate, $endDate] = $this->parseDates($request);
        try {
            $stats = $this->buildStats($startDate, $endDate);
            // Short environment-guarded logging for debugging label usage
            try {
                // Log when in local/debug environment or when caller explicitly requests debug via query
                $shouldLog = app()->environment('local') || config('app.debug') || request()->query('debug_labels');
                if ($shouldLog) {
                    $labels = [];
                    if (isset($stats['charts']['visits_monthly']) && is_array($stats['charts']['visits_monthly'])) {
                        foreach (array_slice($stats['charts']['visits_monthly'], 0, 6) as $row) {
                            $labels[] = isset($row['label']) ? $row['label'] : (isset($row->label) ? $row->label : null);
                        }
                    }
                    Log::info('dashboard.stats sample labels', ['start' => $startDate, 'end' => $endDate, 'labels' => $labels]);
                }
            } catch (\Throwable $e) {
                // Don't let logging interfere with response
            }
            return response()->json([
                'filter' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                ],
                'stats' => $stats,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => true,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    private function buildStats(string $startDate, string $endDate): array
    {
        // Helper to format month labels (localized abbreviated month + year)
        // Implemented below as a private method monthLabel($y, $m)
        $conn = DB::connection('hosxp');

        // Summary counts
        $opdCount = (int) $conn->table('ovst')
            ->whereBetween('vstdate', [$startDate, $endDate])
            ->count();

        // IPD typically uses ipt.regdate for admission date
        $ipdCount = (int) $conn->table('ipt')
            ->whereBetween('regdate', [$startDate, $endDate])
            ->count();

        // ER: join ovst to use ovst.vstdate (er_regist may not have regdate in some schemas)
        $erCount = (int) $conn->table('er_regist as er')
            ->join('ovst as o', 'o.vn', '=', 'er.vn')
            ->whereBetween('o.vstdate', [$startDate, $endDate])
            ->count();

        // Costs total in range
        $costTotal = (float) $conn->table('opitemrece')
            ->whereBetween('vstdate', [$startDate, $endDate])
            ->sum('sum_price');

        // Disease stats (OPD) - Diabetes (E10-E14) and Hypertension (I10-I15)
        $dmTotal = (int) $conn->table('ovstdiag as d')
            ->join('ovst as o', 'o.vn', '=', 'd.vn')
            ->whereBetween('o.vstdate', [$startDate, $endDate])
            ->where('d.diagtype', 1)
            ->where('d.icd10', 'like', 'E1%')
            ->count();

        $htTotal = (int) $conn->table('ovstdiag as d')
            ->join('ovst as o', 'o.vn', '=', 'd.vn')
            ->whereBetween('o.vstdate', [$startDate, $endDate])
            ->where('d.diagtype', 1)
            ->where('d.icd10', 'like', 'I1%')
            ->count();

        // Visits per month (OPD/IPD/ER) within selected range
        $opdByMonth = $conn->table('ovst')
            ->selectRaw('YEAR(vstdate) as y, MONTH(vstdate) as m, COUNT(*) as c')
            ->whereBetween('vstdate', [$startDate, $endDate])
            ->groupBy('y', 'm')
            ->get();

        $ipdByMonth = $conn->table('ipt')
            ->selectRaw('YEAR(regdate) as y, MONTH(regdate) as m, COUNT(*) as c')
            ->whereBetween('regdate', [$startDate, $endDate])
            ->groupBy('y', 'm')
            ->get();

        $erByMonth = $conn->table('er_regist as er')
            ->join('ovst as o', 'o.vn', '=', 'er.vn')
            ->selectRaw('YEAR(o.vstdate) as y, MONTH(o.vstdate) as m, COUNT(*) as c')
            ->whereBetween('o.vstdate', [$startDate, $endDate])
            ->groupBy('y', 'm')
            ->get();

        $key = function ($y, $m) { return sprintf('%04d-%02d', $y, $m); };
        $map = [];
        foreach ($opdByMonth as $r) { $k = $key($r->y, $r->m); $map[$k]['y'] = (int)$r->y; $map[$k]['m'] = (int)$r->m; $map[$k]['opd'] = (int)$r->c; }
        foreach ($ipdByMonth as $r) { $k = $key($r->y, $r->m); $map[$k]['y'] = (int)$r->y; $map[$k]['m'] = (int)$r->m; $map[$k]['ipd'] = (int)$r->c; }
        foreach ($erByMonth as $r)  { $k = $key($r->y, $r->m); $map[$k]['y'] = (int)$r->y; $map[$k]['m'] = (int)$r->m; $map[$k]['er']  = (int)$r->c; }
        ksort($map);
        $visitsMonthly = array_values(array_map(function ($row) {
            return [
                'y' => $row['y'],
                'm' => $row['m'],
                'label' => $this->monthLabel($row['y'], $row['m']),
                'opd' => $row['opd'] ?? 0,
                'ipd' => $row['ipd'] ?? 0,
                'er' => $row['er'] ?? 0,
            ];
        }, $map));

        // Costs per year (Last 5 years based on endDate)
        $endYear = (int) date('Y', strtotime($endDate));
        $startYearLast5 = $endYear - 4;
        $costsByYearLast5 = $conn->table('opitemrece')
            ->selectRaw('YEAR(vstdate) as y, SUM(sum_price) as total')
            ->whereRaw('YEAR(vstdate) BETWEEN ? AND ?', [$startYearLast5, $endYear])
            ->groupBy('y')
            ->orderBy('y')
            ->get();

        // Costs per month in range
        $costsByMonth = $conn->table('opitemrece')
            ->selectRaw('YEAR(vstdate) as y, MONTH(vstdate) as m, SUM(sum_price) as total')
            ->whereBetween('vstdate', [$startDate, $endDate])
            ->groupBy('y', 'm')
            ->orderBy('y')
            ->orderBy('m')
            ->get();

        // attach labels to monthly cost rows
        $costsByMonth = $costsByMonth->map(function($r){
            $r->label = $this->monthLabel($r->y, $r->m);
            return $r;
        });

        // Top 10 diagnoses OPD within range (principal diagnoses)
        $top10Opd = $conn->table('ovstdiag as d')
            ->join('ovst as o', 'o.vn', '=', 'd.vn')
            ->selectRaw('d.icd10, COUNT(*) as total')
            ->whereBetween('o.vstdate', [$startDate, $endDate])
            ->where('d.diagtype', 1)
            ->groupBy('d.icd10')
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        // Top 10 diagnoses IPD within range (principal diagnoses)
        try {
            $top10Ipd = $conn->table('iptdiag as d')
                ->join('ipt as i', 'i.an', '=', 'd.an')
                ->selectRaw('d.icd10, COUNT(*) as total')
                ->whereBetween('i.regdate', [$startDate, $endDate])
                ->where('d.diagtype', 1)
                ->groupBy('d.icd10')
                ->orderByDesc('total')
                ->limit(10)
                ->get();
        } catch (\Throwable $e) {
            // In case iptdiag or related structures are absent in this HOSxP variant
            $top10Ipd = collect();
        }

        // Monthly DM/HT counts (OPD) within range
        $dmMonthly = $conn->table('ovstdiag as d')
            ->join('ovst as o', 'o.vn', '=', 'd.vn')
            ->selectRaw('YEAR(o.vstdate) as y, MONTH(o.vstdate) as m, COUNT(*) as total')
            ->whereBetween('o.vstdate', [$startDate, $endDate])
            ->where('d.diagtype', 1)
            ->where('d.icd10', 'like', 'E1%')
            ->groupBy('y', 'm')
            ->orderBy('y')
            ->orderBy('m')
            ->get();

        $htMonthly = $conn->table('ovstdiag as d')
            ->join('ovst as o', 'o.vn', '=', 'd.vn')
            ->selectRaw('YEAR(o.vstdate) as y, MONTH(o.vstdate) as m, COUNT(*) as total')
            ->whereBetween('o.vstdate', [$startDate, $endDate])
            ->where('d.diagtype', 1)
            ->where('d.icd10', 'like', 'I1%')
            ->groupBy('y', 'm')
            ->orderBy('y')
            ->orderBy('m')
            ->get();

        // add labels for DM/HT monthly
        $dmMonthly = $dmMonthly->map(function($r){ $r->label = $this->monthLabel($r->y, $r->m); return $r; });
        $htMonthly = $htMonthly->map(function($r){ $r->label = $this->monthLabel($r->y, $r->m); return $r; });

        // Thai ASCVD: compute from raw HOSxP data if configured; fallback to existing CV risk table
        // For CV Risk charts, always use last 6 months regardless of user's date filter
        $cvStartDate = date('Y-m-d', strtotime('-6 months'));
        $cvEndDate = date('Y-m-d');
        
        // Protect the dashboard rendering from any DB/schema errors inside the ASCVD pipeline.
        try {
            [$cvRiskHighMonthly, $cvRiskDistMonthly] = $this->buildThaiAscvdRisk($conn, $cvStartDate, $cvEndDate);
            Log::info('buildThaiAscvdRisk completed', [
                'high_count' => $cvRiskHighMonthly ? $cvRiskHighMonthly->count() : 0,
                'dist_count' => $cvRiskDistMonthly ? $cvRiskDistMonthly->count() : 0,
            ]);
        } catch (\Throwable $e) {
            // Don't let ASCVD computation break the whole dashboard. Log for diagnostics and
            // fall back to using any precomputed CV risk table later.
            Log::warning('buildThaiAscvdRisk failed, falling back to precomputed CV risk table or empty sets', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'start' => $startDate,
                'end' => $endDate,
            ]);
            $cvRiskHighMonthly = null;
            $cvRiskDistMonthly = null;
        }
        if ($cvRiskHighMonthly === null || $cvRiskDistMonthly === null) {
            $cvRiskHighMonthly = collect();
            $cvRiskDistMonthly = collect();
            try {
                $meta = $this->detectCvRiskSchema($conn);
                if ($meta) {
                    $table = $meta['table'];
                    $dcol = $meta['date'];
                    $scol = $meta['score'];
                    $highThreshold = (int) (config('thai_ascvd.high_risk_threshold', env('HOSXP_CV_RISK_HIGH_THRESHOLD', 20)));

                    // High risk monthly
                    $cvRiskHighMonthly = $conn->table($table)
                        ->selectRaw("YEAR($dcol) as y, MONTH($dcol) as m, COUNT(*) as total")
                        ->whereBetween($dcol, [$startDate, $endDate])
                        ->where($scol, '>=', $highThreshold)
                        ->groupBy('y', 'm')
                        ->orderBy('y')
                        ->orderBy('m')
                        ->get();

                    // Score distribution buckets per month
                    $cvRiskDistMonthly = $conn->table($table)
                        ->selectRaw(
                            "YEAR($dcol) as y, MONTH($dcol) as m, " .
                            "SUM(CASE WHEN $scol BETWEEN 0 AND 9 THEN 1 ELSE 0 END) as s0_9, " .
                            "SUM(CASE WHEN $scol BETWEEN 10 AND 19 THEN 1 ELSE 0 END) as s10_19, " .
                            "SUM(CASE WHEN $scol BETWEEN 20 AND 29 THEN 1 ELSE 0 END) as s20_29, " .
                            "SUM(CASE WHEN $scol BETWEEN 30 AND 39 THEN 1 ELSE 0 END) as s30_39, " .
                            "SUM(CASE WHEN $scol >= 40 THEN 1 ELSE 0 END) as s40p"
                        )
                        ->whereBetween($dcol, [$startDate, $endDate])
                        ->groupBy('y', 'm')
                        ->orderBy('y')
                        ->orderBy('m')
                        ->get();
                }
            } catch (\Throwable $e) {
                // ignore
            }
        }

        // Ensure CV risk collections include labels for charts
        try {
            if (is_object($cvRiskHighMonthly) && method_exists($cvRiskHighMonthly, 'map')) {
                $cvRiskHighMonthly = $cvRiskHighMonthly->map(function($r){ $r->label = $this->monthLabel($r->y, $r->m); return $r; });
            }
            if (is_object($cvRiskDistMonthly) && method_exists($cvRiskDistMonthly, 'map')) {
                $cvRiskDistMonthly = $cvRiskDistMonthly->map(function($r){ $r->label = $this->monthLabel($r->y, $r->m); return $r; });
            }
        } catch (\Throwable $e) {
            // ignore labeling errors
        }

        return [
            'summary' => [
                'opd' => $opdCount,
                'ipd' => $ipdCount,
                'er' => $erCount,
                'cost_total' => $costTotal,
                'dm' => $dmTotal,
                'ht' => $htTotal,
            ],
            'charts' => [
                'visits_monthly' => $visitsMonthly,
                'costs_yearly_last5' => $costsByYearLast5,
                'costs_monthly' => $costsByMonth,
                'top10_opd' => $top10Opd,
                'top10_ipd' => $top10Ipd,
                'disease_monthly' => [
                    'dm' => $dmMonthly,
                    'ht' => $htMonthly,
                ],
                'cv_risk_high_monthly' => $cvRiskHighMonthly,
                'cv_risk_scores_monthly' => $cvRiskDistMonthly,
            ],
        ];
    }

    private function buildThaiAscvdRisk($conn, string $startDate, string $endDate): array
    {
        if (!config('thai_ascvd.enabled', true)) {
            return [null, null];
        }

        $calc = app(ThaiAscvdCalculator::class);

        $tcCodes = array_map('trim', config('thai_ascvd.lab_codes.tc', ['CHOL', 'TC']));
        $hdlCodes = array_map('trim', config('thai_ascvd.lab_codes.hdl', ['HDL', 'HDL-C']));
        $smokingCurrentIds = array_map('intval', config('thai_ascvd.smoking_current_ids', [3]));

        // Build base latest visit per patient per month within range
        // Note: to keep compatibility across HOSxP variants, avoid window functions
        $base = $conn->table('ovst as o')
            ->selectRaw('o.hn, YEAR(o.vstdate) as y, MONTH(o.vstdate) as m, MAX(o.vstdate) as last_vstdate')
            ->whereBetween('o.vstdate', [$startDate, $endDate])
            ->groupBy('o.hn', 'y', 'm');

        $baseRows = $conn->table(DB::raw("({$base->toSql()}) as b"))
            ->mergeBindings($base)
            ->join('ovst as o', function($j){ $j->on('o.hn','=','b.hn')->on('o.vstdate','=','b.last_vstdate'); })
            ->selectRaw('b.hn, b.y, b.m, b.last_vstdate, MAX(o.vn) as last_vn')
            ->groupBy('b.hn', 'b.y', 'b.m', 'b.last_vstdate')
            ->get();

        Log::info('buildThaiAscvdRisk: baseRows count', ['count' => $baseRows->count()]);

        if ($baseRows->isEmpty()) {
            return [collect(), collect()];
        }

        $hns = $baseRows->pluck('hn')->unique()->values()->all();
        $vnByKey = [];
        foreach ($baseRows as $r) {
            $key = $r->hn.'|'.$r->y.'|'.$r->m;
            $vnByKey[$key] = ['vn' => $r->last_vn, 'date' => $r->last_vstdate];
        }

        // Fetch person demographics
        $persons = $conn->table('patient as p')
            ->select('p.hn', 'p.sex', 'p.birthday')
            ->whereIn('p.hn', $hns)
            ->get()
            ->keyBy('hn');

        // Fetch vitals (SBP, smoking) from opdscreen by VN
        $vns = array_values(array_unique(array_column($vnByKey, 'vn')));
        // Detect optional height/waist columns in opdscreen (schemas differ)
        $dbName = $conn->getDatabaseName();
        $opdCols = $conn->table('information_schema.columns')
            ->select('column_name')
            ->where('table_schema', $dbName)
            ->where('table_name', 'opdscreen')
            ->pluck('column_name')->toArray();
        $heightCandidates = ['height', 'height_cm', 'body_height'];
        $waistCandidates = ['waistline', 'waist', 'waist_cm', 'abdo', 'abdomen'];
        $heightCol = null; $waistCol = null;
        foreach ($heightCandidates as $c) if (in_array($c, $opdCols, true)) { $heightCol = $c; break; }
        foreach ($waistCandidates as $c) if (in_array($c, $opdCols, true)) { $waistCol = $c; break; }

        $select = ['s.vn', 's.bps', 's.smoking_type_id'];
        if ($heightCol) { $select[] = DB::raw("s.$heightCol as height"); }
        if ($waistCol) { $select[] = DB::raw("s.$waistCol as waist"); }

        $screens = $conn->table('opdscreen as s')
            ->select($select)
            ->whereIn('s.vn', $vns)
            ->get()
            ->keyBy('vn');

        // Fetch lab results for TC and HDL - get latest available for each HN
        // Some HOSxP variants don't have lab_order_result table; detect and adjust
        $dbName = $conn->getDatabaseName();
        $hasLor = $conn->table('information_schema.tables')
            ->where('table_schema', $dbName)
            ->where('table_name', 'lab_order_result')
            ->exists();

        // Get latest lab results for each HN (more efficient batch query)
        $labSubquery = $conn->table('lab_head as lh')
            ->join('ovst as o', 'o.vn', '=', 'lh.vn')
            ->select('o.hn', DB::raw('MAX(lh.report_date) as max_date'))
            ->whereIn('o.hn', $hns)
            ->groupBy('o.hn');

        $labQuery = $conn->table('lab_head as lh')
            ->joinSub($labSubquery, 'latest', function($join) {
                $join->on('lh.report_date', '=', 'latest.max_date');
            })
            ->join('ovst as o', function($join) {
                $join->on('o.vn', '=', 'lh.vn')
                     ->on('o.hn', '=', 'latest.hn');
            })
            ->join('lab_order as lo', 'lo.lab_order_number', '=', 'lh.lab_order_number')
            ->join('lab_items as li', 'li.lab_items_code', '=', 'lo.lab_items_code')
            ->where(function($q) use ($tcCodes, $hdlCodes){
                $q->whereIn('li.lab_items_code', $tcCodes)->orWhereIn('li.lab_items_code', $hdlCodes);
            });

        if ($hasLor) {
            $labQuery = $labQuery
                ->leftJoin('lab_order_result as lr', function($j){ 
                    $j->on('lr.lab_order_number','=','lo.lab_order_number')
                      ->on('lr.lab_items_code','=','lo.lab_items_code'); 
                })
                ->select('o.hn', 'li.lab_items_code as code', DB::raw('COALESCE(lr.lab_order_result, lo.lab_order_result) as result'));
        } else {
            $labQuery = $labQuery
                ->select('o.hn', 'li.lab_items_code as code', 'lo.lab_order_result as result');
        }

        $labRows = $labQuery->get();

        $labByHn = [];
        foreach ($labRows as $lr) {
            $hn = $lr->hn;
            $code = strtoupper(trim($lr->code));
            $val = is_numeric($lr->result) ? (float)$lr->result : null;
            if ($val === null || $val <= 0) continue;
            if (!isset($labByHn[$hn])) $labByHn[$hn] = [];
            
            // Store first occurrence of each type (TC or HDL)
            $isTc = false;
            $isHdl = false;
            foreach ($tcCodes as $tcCode) {
                if (strtoupper($tcCode) === $code) { $isTc = true; break; }
            }
            foreach ($hdlCodes as $hdlCode) {
                if (strtoupper($hdlCode) === $code) { $isHdl = true; break; }
            }
            
            if ($isTc && !isset($labByHn[$hn]['tc'])) {
                $labByHn[$hn]['tc'] = $val;
            }
            if ($isHdl && !isset($labByHn[$hn]['hdl'])) {
                $labByHn[$hn]['hdl'] = $val;
            }
        }

        // DM and HT flags: prefer chronic table if present, otherwise derive from diagnoses (ovstdiag/iptdiag)
        $dmSet = [];
        $htSet = [];
        try {
            $dbName = $conn->getDatabaseName();
            $hasChronic = $conn->table('information_schema.tables')
                ->where('table_schema', $dbName)
                ->where('table_name', 'chronic')
                ->exists();

            if ($hasChronic) {
                $chronic = $conn->table('chronic')
                    ->select('hn', 'clinic')
                    ->whereIn('hn', $hns)
                    ->get();
                foreach ($chronic as $c) {
                    $clinic = strtoupper(trim($c->clinic));
                    if ($clinic === 'DM') $dmSet[$c->hn] = true;
                    if ($clinic === 'HT') $htSet[$c->hn] = true;
                }
            } else {
                // Fallback: inspect ovstdiag (OPD principal diagnoses) for ICD patterns E1x (DM) and I1x (HT)
                $opdDiags = $conn->table('ovstdiag as d')
                    ->join('ovst as o', 'o.vn', '=', 'd.vn')
                    ->select('o.hn', 'd.icd10')
                    ->whereIn('o.hn', $hns)
                    ->where('d.diagtype', 1)
                    ->where(function($q){
                        $q->where('d.icd10', 'like', 'E1%')->orWhere('d.icd10', 'like', 'I1%');
                    })
                    ->get();

                foreach ($opdDiags as $d) {
                    $icd = strtoupper(trim($d->icd10));
                    if (strpos($icd, 'E1') === 0) $dmSet[$d->hn] = true;
                    if (strpos($icd, 'I1') === 0) $htSet[$d->hn] = true;
                }

                // Also try IPD diagnoses if available
                try {
                    $ipdDiags = $conn->table('iptdiag as d')
                        ->join('ipt as i', 'i.an', '=', 'd.an')
                        ->select('i.hn', 'd.icd10')
                        ->whereIn('i.hn', $hns)
                        ->where('d.diagtype', 1)
                        ->where(function($q){
                            $q->where('d.icd10', 'like', 'E1%')->orWhere('d.icd10', 'like', 'I1%');
                        })
                        ->get();
                    foreach ($ipdDiags as $d) {
                        $icd = strtoupper(trim($d->icd10));
                        if (strpos($icd, 'E1') === 0) $dmSet[$d->hn] = true;
                        if (strpos($icd, 'I1') === 0) $htSet[$d->hn] = true;
                    }
                } catch (\Throwable $inner) {
                    // ignore iptdiag absence
                }
            }
        } catch (\Throwable $e) {
            // If detection fails, leave dmSet/htSet empty (we'll skip DM/HT inference)
        }

        $buckets = config('thai_ascvd.buckets');
        $highThreshold = (int) config('thai_ascvd.high_risk_threshold', 20);

        $highMonthly = [];
        $distMonthly = [];
        $processed = 0;
        $skipped = 0;
        $reasons = ['no_person' => 0, 'no_risk' => 0];

        foreach ($vnByKey as $key => $info) {
            [$hn, $y, $m] = explode('|', $key);
            $vn = $info['vn'];
            $date = $info['date'];

            $person = $persons->get($hn);
            if (!$person) {
                $reasons['no_person']++;
                continue;
            }
            $sex = ((int)$person->sex === 1) ? 'male' : 'female';
            $age = (int) floor((strtotime($date) - strtotime($person->birthday)) / (365.25*24*3600));

            $scr = $screens->get($vn);
            $sbp = $scr && is_numeric($scr->bps) ? (float)$scr->bps : null;
            $smoker = $scr && in_array((int)$scr->smoking_type_id, $smokingCurrentIds, true);
            $height = ($scr && isset($scr->height) && is_numeric($scr->height)) ? (float)$scr->height : null; // cm
            $waist = ($scr && isset($scr->waist) && is_numeric($scr->waist)) ? (float)$scr->waist : null; // cm
            $wh = ($height && $height > 0 && $waist && $waist > 0) ? ($waist / $height) : null;

            // Get latest lab results for this HN within 3 months from visit date
            $labs = $labByHn[$hn] ?? [];
            $tc = null;
            $hdl = null;
            
            // Check if TC is within 3 months from visit date
            if (isset($labs['tc']) && isset($labs['tc_date'])) {
                $daysDiff = (strtotime($date) - strtotime($labs['tc_date'])) / 86400;
                if ($daysDiff >= 0 && $daysDiff <= 90) { // Within 3 months (90 days)
                    $tc = $labs['tc'];
                }
            }
            
            // Check if HDL is within 3 months from visit date
            if (isset($labs['hdl']) && isset($labs['hdl_date'])) {
                $daysDiff = (strtotime($date) - strtotime($labs['hdl_date'])) / 86400;
                if ($daysDiff >= 0 && $daysDiff <= 90) { // Within 3 months (90 days)
                    $hdl = $labs['hdl'];
                }
            }

            $dm = isset($dmSet[$hn]);
            $onTx = isset($htSet[$hn]);

            $result = $calc->calculate([
                'sex' => $sex,
                'age' => $age,
                'sbp' => $sbp,
                'tc' => $tc,
                'hdl' => $hdl,
                'dm' => $dm,
                'smoker' => $smoker,
                'on_treatment' => $onTx,
                'wh_ratio' => $wh,
            ]);

            if ($result === null) {
                $reasons['no_risk']++;
                continue;
            } // skip if insufficient or not configured

            $risk = $result['risk'];
            $processed++;

            $ymKey = sprintf('%04d-%02d', (int)$y, (int)$m);
            if (!isset($highMonthly[$ymKey])) $highMonthly[$ymKey] = 0;
            if (!isset($distMonthly[$ymKey])) $distMonthly[$ymKey] = ['s0_9'=>0,'s10_19'=>0,'s20_29'=>0,'s30_39'=>0,'s40p'=>0];

            if ($risk >= $highThreshold) {
                $highMonthly[$ymKey] += 1;
            }

            // bucket
            if ($risk <= 9) $distMonthly[$ymKey]['s0_9'] += 1;
            elseif ($risk <= 19) $distMonthly[$ymKey]['s10_19'] += 1;
            elseif ($risk <= 29) $distMonthly[$ymKey]['s20_29'] += 1;
            elseif ($risk <= 39) $distMonthly[$ymKey]['s30_39'] += 1;
            else $distMonthly[$ymKey]['s40p'] += 1;
        }

        // Convert to collections sorted by y,m
        ksort($highMonthly);
        ksort($distMonthly);

        $outHigh = collect();
        foreach ($highMonthly as $ym => $count) {
            [$yy,$mm] = explode('-', $ym);
            $outHigh->push((object)['y'=>(int)$yy,'m'=>(int)$mm,'total'=>(int)$count]);
        }

        $outDist = collect();
        foreach ($distMonthly as $ym => $b) {
            [$yy,$mm] = explode('-', $ym);
            $outDist->push((object)[
                'y'=>(int)$yy,'m'=>(int)$mm,
                's0_9'=>(int)$b['s0_9'],
                's10_19'=>(int)$b['s10_19'],
                's20_29'=>(int)$b['s20_29'],
                's30_39'=>(int)$b['s30_39'],
                's40p'=>(int)$b['s40p'],
            ]);
        }

        Log::info('buildThaiAscvdRisk: processing summary', [
            'total_vn' => count($vnByKey),
            'processed' => $processed,
            'reasons' => $reasons,
            'high_monthly_count' => $outHigh->count(),
            'dist_monthly_count' => $outDist->count(),
        ]);

        // Keep only last 6 months
        $outHigh = $outHigh->sortBy(function($item) {
            return $item->y * 100 + $item->m;
        })->slice(-6)->values();

        $outDist = $outDist->sortBy(function($item) {
            return $item->y * 100 + $item->m;
        })->slice(-6)->values();

        // Add labels
        $outHigh = $outHigh->map(function($r){ 
            $r->label = $this->monthLabel($r->y, $r->m); 
            return $r; 
        });
        
        $outDist = $outDist->map(function($r){ 
            $r->label = $this->monthLabel($r->y, $r->m); 
            return $r; 
        });

        return [$outHigh, $outDist];
    }
}