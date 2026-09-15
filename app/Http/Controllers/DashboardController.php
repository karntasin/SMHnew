<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Services\HosxpHospitalStatsService;
use App\Services\HosxpSchema;
use App\Services\Risk\ThaiAscvdCalculator;
use App\Services\ThaiPdfService;

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

        if (! $start || ! $end) {
            $endDate = date('Y-m-d');
            $startDate = date('Y-m-d', strtotime('-6 months', strtotime($endDate)));

            return [$startDate, $endDate];
        }

        try {
            $startDate = date('Y-m-d', strtotime($start));
            $endDate = date('Y-m-d', strtotime($end));
        } catch (\Throwable $e) {
            $endDate = date('Y-m-d');
            $startDate = date('Y-m-d', strtotime('-6 months', strtotime($endDate)));

            return [$startDate, $endDate];
        }

        if ($startDate === '1970-01-01' || $endDate === '1970-01-01') {
            $endDate = date('Y-m-d');
            $startDate = date('Y-m-d', strtotime('-6 months', strtotime($endDate)));
        }

        if ($startDate > $endDate) {
            [$startDate, $endDate] = [$endDate, $startDate];
        }

        return [$startDate, $endDate];
    }

    private function formatThaiDateLabel(string $isoDate): string
    {
        try {
            $dt = new \DateTime($isoDate);
            $months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

            return sprintf(
                '%d %s %d',
                (int) $dt->format('j'),
                $months[(int) $dt->format('n') - 1],
                (int) $dt->format('Y') + 543
            );
        } catch (\Throwable $e) {
            return $isoDate;
        }
    }

    private function tableExists($conn, string $table): bool
    {
        return HosxpSchema::tableExists($conn, $table);
    }

    private function columnExists($conn, string $table, string $column): bool
    {
        return HosxpSchema::columnExists($conn, $table, $column);
    }

    public function index(Request $request): Response
    {
        $this->extendExecutionTime();
        [$startDate, $endDate] = $this->parseDates($request);

        $stats = null;
        $hosxpError = null;

        if ($this->hasHosxpConnection()) {
            try {
                $stats = $this->cachedBuildStats($startDate, $endDate);
            } catch (\Throwable $e) {
                Log::error('Dashboard buildStats failed', [
                    'message' => $e->getMessage(),
                    'start' => $startDate,
                    'end' => $endDate,
                ]);
                $hosxpError = 'ไม่สามารถโหลดข้อมูลจาก HOSxP ได้ กรุณาลองเลือกช่วงวันที่อื่นหรือลองใหม่ภายหลัง';
            }
        } else {
            $hosxpError = 'ไม่สามารถเชื่อมต่อฐานข้อมูล HOSxP ได้ กรุณาติดต่อผู้ดูแลระบบ';
        }

        return Inertia::render('dashboard', [
            'filter' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'start_date_label' => $this->formatThaiDateLabel($startDate),
                'end_date_label' => $this->formatThaiDateLabel($endDate),
            ],
            'stats' => $stats,
            'hosxp_error' => $hosxpError,
        ]);
    }

    public function stats(Request $request)
    {
        $this->extendExecutionTime();
        [$startDate, $endDate] = $this->parseDates($request);

        if (! $this->hasHosxpConnection()) {
            return response()->json([
                'error' => true,
                'message' => 'ไม่สามารถเชื่อมต่อฐานข้อมูล HOSxP ได้',
                'filter' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'start_date_label' => $this->formatThaiDateLabel($startDate),
                    'end_date_label' => $this->formatThaiDateLabel($endDate),
                ],
            ], 503);
        }

        try {
            $stats = $this->cachedBuildStats($startDate, $endDate);
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
                    'start_date_label' => $this->formatThaiDateLabel($startDate),
                    'end_date_label' => $this->formatThaiDateLabel($endDate),
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

    public function exportPdf(Request $request, ThaiPdfService $pdf)
    {
        $this->extendExecutionTime(180);
        [$startDate, $endDate] = $this->parseDates($request);

        if (! $this->hasHosxpConnection()) {
            abort(503, 'ไม่สามารถเชื่อมต่อฐานข้อมูล HOSxP ได้');
        }

        $stats = $this->cachedBuildStats($startDate, $endDate);
        [$fontRegularUri, $fontBoldUri] = $pdf->fontUris();
        $visitTrendChartUri = $this->buildVisitTrendChartSvgDataUri($stats['charts']['visits_year_trend'] ?? []);

        $html = view('dashboard.report-pdf', [
            'stats' => $stats,
            'startDate' => $this->formatThaiDateLabel($startDate),
            'endDate' => $this->formatThaiDateLabel($endDate),
            'generatedAt' => $this->formatThaiDateLabel(date('Y-m-d')).' '.date('H:i'),
            'appName' => config('app.name'),
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
            'visitTrendChartUri' => $visitTrendChartUri,
        ])->render();

        return response($pdf->render($html), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="dashboard_summary_line_chart_'.date('Ymd_His').'.pdf"',
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }

    private function buildVisitTrendChartSvgDataUri(iterable $rows): string
    {
        $rows = collect($rows)->values();
        if ($rows->isEmpty()) {
            return '';
        }

        $value = function ($row, string $key): float {
            return (float) (is_array($row) ? ($row[$key] ?? 0) : ($row->$key ?? 0));
        };
        $month = function ($row): string {
            $m = (int) (is_array($row) ? ($row['m'] ?? 0) : ($row->m ?? 0));
            if ($m >= 1 && $m <= 12) {
                return (string) $m;
            }

            $label = (string) (is_array($row) ? ($row['label'] ?? '') : ($row->label ?? ''));
            if (preg_match('/(\d{4})-(\d{2})/', $label, $matches)) {
                return (string) ((int) $matches[2]);
            }

            return $label !== '' ? mb_substr($label, 0, 3) : '-';
        };

        $max = max(1, (float) $rows->flatMap(fn ($row) => [
            $value($row, 'opd'),
            $value($row, 'ipd'),
            $value($row, 'er'),
        ])->max());

        $width = 1120;
        $height = 360;
        $left = 82;
        $right = 1010;
        $top = 54;
        $bottom = 285;
        $plotHeight = $bottom - $top;
        $count = max(1, $rows->count());

        $points = function (string $key) use ($rows, $value, $max, $count, $left, $right, $bottom, $plotHeight): string {
            return $rows->map(function ($row, int $index) use ($key, $value, $max, $count, $left, $right, $bottom, $plotHeight) {
                $x = $count > 1 ? $left + (($index / ($count - 1)) * ($right - $left)) : (($left + $right) / 2);
                $y = $bottom - (($value($row, $key) / $max) * $plotHeight);

                return round($x, 2).','.round($y, 2);
            })->implode(' ');
        };

        $escape = fn ($text) => htmlspecialchars((string) $text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $grid = '';
        foreach ([1, 2 / 3, 1 / 3, 0] as $ratio) {
            $y = $bottom - ($ratio * $plotHeight);
            $label = number_format(round($max * $ratio));
            $grid .= '<line x1="'.$left.'" y1="'.round($y, 2).'" x2="'.$right.'" y2="'.round($y, 2).'" stroke="#e2e8f0" stroke-width="1"/>';
            $grid .= '<text x="'.($left - 12).'" y="'.round($y + 4, 2).'" fill="#64748b" font-size="18" text-anchor="end">'.$escape($label).'</text>';
        }

        $ticks = '';
        $dots = '';
        foreach ($rows as $index => $row) {
            $x = $count > 1 ? $left + (($index / ($count - 1)) * ($right - $left)) : (($left + $right) / 2);
            $opd = $value($row, 'opd');
            $ipd = $value($row, 'ipd');
            $er = $value($row, 'er');
            $opdY = $bottom - (($opd / $max) * $plotHeight);
            $ipdY = $bottom - (($ipd / $max) * $plotHeight);
            $erY = $bottom - (($er / $max) * $plotHeight);

            $ticks .= '<line x1="'.round($x, 2).'" y1="'.$bottom.'" x2="'.round($x, 2).'" y2="'.($bottom + 8).'" stroke="#cbd5e1" stroke-width="1"/>';
            $ticks .= '<text x="'.round($x, 2).'" y="325" fill="#475569" font-size="18" text-anchor="middle">'.$escape($month($row)).'</text>';
            $dots .= '<circle cx="'.round($x, 2).'" cy="'.round($opdY, 2).'" r="5" fill="#ffffff" stroke="#2563eb" stroke-width="3"/>';
            $dots .= '<circle cx="'.round($x, 2).'" cy="'.round($ipdY, 2).'" r="4.5" fill="#ffffff" stroke="#7c3aed" stroke-width="2.6"/>';
            $dots .= '<circle cx="'.round($x, 2).'" cy="'.round($erY, 2).'" r="4.5" fill="#ffffff" stroke="#dc2626" stroke-width="2.6"/>';

            if ($index === $rows->count() - 1) {
                $dots .= '<text x="'.round($x + 15, 2).'" y="'.round($opdY + 6, 2).'" fill="#2563eb" font-size="18" font-weight="700">OPD '.$escape(number_format($opd)).'</text>';
                $dots .= '<text x="'.round($x + 15, 2).'" y="'.round($ipdY - 8, 2).'" fill="#7c3aed" font-size="18" font-weight="700">IPD '.$escape(number_format($ipd)).'</text>';
                $dots .= '<text x="'.round($x + 15, 2).'" y="'.round($erY + 20, 2).'" fill="#dc2626" font-size="18" font-weight="700">ER '.$escape(number_format($er)).'</text>';
            }
        }

        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="'.$width.'" height="'.$height.'" viewBox="0 0 '.$width.' '.$height.'">'.
            '<rect width="'.$width.'" height="'.$height.'" rx="20" fill="#f8fafc"/>'.
            '<text x="'.$left.'" y="32" fill="#0f172a" font-size="22" font-weight="700">OPD / IPD / ER Line Chart</text>'.
            '<text x="'.($right - 260).'" y="32" fill="#1e40af" font-size="18" font-weight="700">LINE-CHART IMAGE v3</text>'.
            $grid.
            '<line x1="'.$left.'" y1="'.$top.'" x2="'.$left.'" y2="'.$bottom.'" stroke="#cbd5e1" stroke-width="2"/>'.
            '<line x1="'.$left.'" y1="'.$bottom.'" x2="'.$right.'" y2="'.$bottom.'" stroke="#cbd5e1" stroke-width="2"/>'.
            '<polyline points="'.$escape($points('opd')).'" fill="none" stroke="#2563eb" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'.
            '<polyline points="'.$escape($points('ipd')).'" fill="none" stroke="#7c3aed" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'.
            '<polyline points="'.$escape($points('er')).'" fill="none" stroke="#dc2626" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'.
            $ticks.$dots.
            '<circle cx="790" cy="325" r="7" fill="#2563eb"/><text x="806" y="331" fill="#334155" font-size="18">OPD</text>'.
            '<circle cx="865" cy="325" r="7" fill="#7c3aed"/><text x="881" y="331" fill="#334155" font-size="18">IPD</text>'.
            '<circle cx="940" cy="325" r="7" fill="#dc2626"/><text x="956" y="331" fill="#334155" font-size="18">ER</text>'.
            '</svg>';

        return 'data:image/svg+xml;base64,'.base64_encode($svg);
    }

    private function extendExecutionTime(int $seconds = 120): void
    {
        if (function_exists('set_time_limit')) {
            @set_time_limit($seconds);
        }
    }

    private function cachedBuildStats(string $startDate, string $endDate): array
    {
        $cacheSeconds = (int) env('DASHBOARD_STATS_CACHE_SECONDS', 300);

        if ($cacheSeconds <= 0) {
            return $this->buildStats($startDate, $endDate);
        }

        $key = implode(':', [
            'dashboard_stats',
            'dm_ht_vn_stat_v3',
            app()->getLocale(),
            $startDate,
            $endDate,
            date('Y-m-d'),
        ]);

        try {
            return Cache::remember($key, $cacheSeconds, fn () => $this->buildStats($startDate, $endDate));
        } catch (\Throwable $e) {
            Log::warning('Dashboard cache failed; building stats directly', ['message' => $e->getMessage()]);

            return $this->buildStats($startDate, $endDate);
        }
    }

    private function buildStats(string $startDate, string $endDate): array
    {
        // Helper to format month labels (localized abbreviated month + year)
        // Implemented below as a private method monthLabel($y, $m)
        $conn = DB::connection('hosxp');
        $today = date('Y-m-d');
        $monthStart = date('Y-m-01', strtotime($today));
        $yearStart = date('Y-01-01', strtotime($today));

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
            ->where('o.main_dep', '003')
            ->distinct('o.vn')
            ->count('o.vn');

        // Costs total in range
        $costTotal = (float) $conn->table('opitemrece')
            ->whereBetween('vstdate', [$startDate, $endDate])
            ->sum('sum_price');

        $todayOps = $this->buildTodayOperations($conn, $today, $monthStart);
        $departmentVisitsThisMonth = $this->buildDepartmentVisits($conn, $monthStart, $today);
        $departmentVisitsThisYear = $this->buildDepartmentVisits($conn, $yearStart, $today);
        $visitsYearTrend = $this->buildVisitsYearTrend($conn, $yearStart, $today);
        try {
            $appointments = $this->buildAppointmentStats($conn, $startDate, $endDate, $today);
        } catch (\Throwable $e) {
            Log::warning('Dashboard appointment stats failed', ['message' => $e->getMessage()]);
            $appointments = [
                'available' => false,
                'today' => [
                    'date' => $today,
                    'date_label' => $this->formatThaiDateLabel($today),
                    'scheduled' => 0,
                    'came' => 0,
                    'not_came' => 0,
                    'pending' => 0,
                    'came_rate' => null,
                ],
                'period' => [
                    'scheduled' => 0,
                    'came' => 0,
                    'not_came' => 0,
                    'pending' => 0,
                    'came_rate' => null,
                ],
                'monthly' => [],
                'source' => 'oapp.nextdate',
                'note' => 'โหลดยอดนัดหมายจาก HOSxP ไม่สำเร็จ',
            ];
        }

        // Disease stats (OPD) - DM E10-E19 / HT I10-I19 from vn_stat (DISTINCT HN)
        $dmTotal = $this->countDistinctHnByIcdRange($conn, $startDate, $endDate, 'E10', 'E19');
        $htTotal = $this->countDistinctHnByIcdRange($conn, $startDate, $endDate, 'I10', 'I19');

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
            ->selectRaw('YEAR(o.vstdate) as y, MONTH(o.vstdate) as m, COUNT(DISTINCT o.vn) as c')
            ->whereBetween('o.vstdate', [$startDate, $endDate])
            ->where('o.main_dep', '003')
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

        // Monthly DM/HT counts (DISTINCT HN) within range
        $dmMonthly = $this->monthlyDistinctHnByIcdRange($conn, $startDate, $endDate, 'E10', 'E19');
        $htMonthly = $this->monthlyDistinctHnByIcdRange($conn, $startDate, $endDate, 'I10', 'I19');

        // add labels for DM/HT monthly
        $dmMonthly = $dmMonthly->map(function ($r) {
            $r->label = $this->monthLabel($r->y, $r->m);

            return $r;
        });
        $htMonthly = $htMonthly->map(function ($r) {
            $r->label = $this->monthLabel($r->y, $r->m);

            return $r;
        });

        // Thai ASCVD: compute from raw HOSxP data if configured; fallback to existing CV risk table
        // For CV Risk charts, always use last 6 months regardless of user's date filter
        $cvStartDate = date('Y-m-d', strtotime('-6 months'));
        $cvEndDate = date('Y-m-d');
        
        // Protect the dashboard rendering from any DB/schema errors inside the ASCVD pipeline.
        try {
            [$cvRiskHighMonthly, $cvRiskDistMonthly, $cvRiskSummary] = $this->cachedThaiAscvdRisk($conn, $cvStartDate, $cvEndDate);
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
            $cvRiskSummary = null;
        }
        if ($cvRiskHighMonthly === null || $cvRiskDistMonthly === null) {
            $cvRiskHighMonthly = collect();
            $cvRiskDistMonthly = collect();
            $cvRiskSummary = null;
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
                'today' => $todayOps,
                'appointments' => $appointments,
            ],
            'charts' => [
                'visits_monthly' => $visitsMonthly,
                'department_visits_this_month' => $departmentVisitsThisMonth,
                'department_visits_this_year' => $departmentVisitsThisYear,
                'visits_year_trend' => $visitsYearTrend,
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
                'cv_risk_summary' => $cvRiskSummary,
            ],
        ];
    }

    private function hospitalStats(): HosxpHospitalStatsService
    {
        return app(HosxpHospitalStatsService::class);
    }

    private function buildTodayOperations($conn, string $today, string $monthStart): array
    {
        $ops = $this->hospitalStats()->todayOperations($conn, $today, $monthStart);
        $ops['date_label'] = $this->formatThaiDateLabel($today);

        return $ops;
    }

    private function buildAppointmentStats($conn, string $startDate, string $endDate, string $today): array
    {
        $stats = $this->hospitalStats()->appointmentStats($conn, $startDate, $endDate, $today);
        $stats['today']['date_label'] = $this->formatThaiDateLabel($today);
        $stats['monthly'] = array_map(function (array $row) {
            $row['label'] = $this->monthLabel((int) ($row['y'] ?? 0), (int) ($row['m'] ?? 0));

            return $row;
        }, $stats['monthly'] ?? []);

        return $stats;
    }

    private function buildDepartmentVisits($conn, string $startDate, string $endDate): array
    {
        $rows = $conn->table('ovst as o')
            ->leftJoin('kskdepartment as dep', 'dep.depcode', '=', 'o.main_dep')
            ->whereBetween('o.vstdate', [$startDate, $endDate])
            ->selectRaw("COALESCE(NULLIF(dep.department, ''), NULLIF(o.main_dep, ''), 'ไม่ระบุแผนก') as department")
            ->selectRaw('COUNT(*) as total')
            ->groupByRaw("COALESCE(NULLIF(dep.department, ''), NULLIF(o.main_dep, ''), 'ไม่ระบุแผนก')")
            ->orderByDesc('total')
            ->get();

        $top = [];
        $other = 0;
        foreach ($rows as $index => $row) {
            if ($index < 8) {
                $top[] = [
                    'department' => (string) $row->department,
                    'total' => (int) $row->total,
                ];
            } else {
                $other += (int) $row->total;
            }
        }

        if ($other > 0) {
            $top[] = ['department' => 'อื่น ๆ', 'total' => $other];
        }

        return $top;
    }

    private function buildVisitsYearTrend($conn, string $yearStart, string $today): array
    {
        $hasErRegist = $this->tableExists($conn, 'er_regist');

        $er = $hasErRegist
            ? $conn->table('er_regist as er')
                ->join('ovst as o', 'o.vn', '=', 'er.vn')
                ->selectRaw('YEAR(o.vstdate) as y, MONTH(o.vstdate) as m, COUNT(DISTINCT o.vn) as total')
                ->whereBetween('o.vstdate', [$yearStart, $today])
                ->where('o.main_dep', '003')
                ->groupBy('y', 'm')
                ->get()
                ->keyBy(fn ($row) => sprintf('%04d-%02d', $row->y, $row->m))
            : collect();

        $opdQuery = $conn->table('ovst as o')
            ->selectRaw('YEAR(o.vstdate) as y, MONTH(o.vstdate) as m, COUNT(*) as total')
            ->whereBetween('o.vstdate', [$yearStart, $today]);

        if ($hasErRegist) {
            $opdQuery->leftJoin('er_regist as er', function ($join) {
                $join->on('er.vn', '=', 'o.vn')
                    ->where('o.main_dep', '003');
            })
                ->whereNull('er.vn');
        }

        $opd = $opdQuery
            ->groupBy('y', 'm')
            ->get()
            ->keyBy(fn ($row) => sprintf('%04d-%02d', $row->y, $row->m));

        $ipd = $conn->table('ipt')
            ->selectRaw('YEAR(regdate) as y, MONTH(regdate) as m, COUNT(*) as total')
            ->whereBetween('regdate', [$yearStart, $today])
            ->groupBy('y', 'm')
            ->get()
            ->keyBy(fn ($row) => sprintf('%04d-%02d', $row->y, $row->m));

        $year = (int) date('Y', strtotime($today));
        $currentMonth = (int) date('n', strtotime($today));
        $trend = [];
        for ($month = 1; $month <= $currentMonth; $month++) {
            $key = sprintf('%04d-%02d', $year, $month);
            $opdTotal = (int) ($opd->get($key)->total ?? 0);
            $ipdTotal = (int) ($ipd->get($key)->total ?? 0);
            $erTotal = (int) ($er->get($key)->total ?? 0);
            $trend[] = [
                'y' => $year,
                'm' => $month,
                'label' => $this->monthLabel($year, $month),
                'opd' => $opdTotal,
                'ipd' => $ipdTotal,
                'er' => $erTotal,
                'total' => $opdTotal + $ipdTotal + $erTotal,
            ];
        }

        return $trend;
    }

    private function cachedThaiAscvdRisk($conn, string $startDate, string $endDate): array
    {
        $cacheSeconds = (int) env('THAI_ASCVD_CACHE_SECONDS', 3600);

        if ($cacheSeconds <= 0) {
            return $this->buildThaiAscvdRisk($conn, $startDate, $endDate);
        }

        $key = implode(':', [
            'thai_ascvd',
            $conn->getDatabaseName(),
            $startDate,
            $endDate,
            md5(json_encode([
                'tc' => config('thai_ascvd.lab_codes.tc'),
                'smoking' => config('thai_ascvd.smoking_current_ids'),
                'lab_days' => config('thai_ascvd.lab_max_age_days'),
            ])),
        ]);

        try {
            return Cache::remember($key, $cacheSeconds, fn () => $this->buildThaiAscvdRisk($conn, $startDate, $endDate));
        } catch (\Throwable $e) {
            Log::warning('Thai ASCVD cache failed; computing directly', ['message' => $e->getMessage()]);

            return $this->buildThaiAscvdRisk($conn, $startDate, $endDate);
        }
    }

    private function buildThaiAscvdRisk($conn, string $startDate, string $endDate): array
    {
        if (!config('thai_ascvd.enabled', true)) {
            return [null, null, null];
        }

        $calc = app(ThaiAscvdCalculator::class);

        $tcCodes = array_map('trim', config('thai_ascvd.lab_codes.tc', ['CHOL', 'TC']));
        $tcKeywords = array_map('strtolower', config('thai_ascvd.lab_name_keywords.tc', ['cholesterol', 'chol']));
        $smokingCurrentIds = array_map('intval', config('thai_ascvd.smoking_current_ids', [3]));
        $labMaxAgeDays = (int) config('thai_ascvd.lab_max_age_days', 365);

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
            return [collect(), collect(), null];
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
        if (in_array('tc', $opdCols, true)) { $select[] = DB::raw('s.tc as screen_tc'); }
        if (in_array('cholesterol', $opdCols, true)) { $select[] = DB::raw('s.cholesterol as screen_cholesterol'); }

        $screens = $conn->table('opdscreen as s')
            ->select($select)
            ->whereIn('s.vn', $vns)
            ->get()
            ->keyBy('vn');

        // Fetch TC lab rows in the lookback window. HOSxP often stores lab item codes as numbers,
        // so match both configured codes and cholesterol-like names.
        // Some HOSxP variants don't have lab_order_result table; detect and adjust
        $dbName = $conn->getDatabaseName();
        $hasLor = $conn->table('information_schema.tables')
            ->where('table_schema', $dbName)
            ->where('table_name', 'lab_order_result')
            ->exists();

        $labLookbackStart = date('Y-m-d', strtotime("-{$labMaxAgeDays} days", strtotime($startDate)));
        $labQuery = $conn->table('lab_head as lh')
            ->join('ovst as o', 'o.vn', '=', 'lh.vn')
            ->join('lab_order as lo', 'lo.lab_order_number', '=', 'lh.lab_order_number')
            ->join('lab_items as li', 'li.lab_items_code', '=', 'lo.lab_items_code')
            ->whereIn('o.hn', $hns)
            ->whereBetween('lh.report_date', [$labLookbackStart, $endDate])
            ->where(function($q) use ($tcCodes, $tcKeywords){
                $q->whereIn('li.lab_items_code', $tcCodes);
                foreach ($tcKeywords as $keyword) {
                    $q->orWhereRaw('LOWER(li.lab_items_name) like ?', ['%'.$keyword.'%']);
                }
            });

        if ($hasLor) {
            $labQuery = $labQuery
                ->leftJoin('lab_order_result as lr', function($j){ 
                    $j->on('lr.lab_order_number','=','lo.lab_order_number')
                      ->on('lr.lab_items_code','=','lo.lab_items_code'); 
                })
                ->select('o.hn', 'lh.report_date', 'li.lab_items_code as code', 'li.lab_items_name as name', DB::raw('COALESCE(lr.lab_order_result, lo.lab_order_result) as result'));
        } else {
            $labQuery = $labQuery
                ->select('o.hn', 'lh.report_date', 'li.lab_items_code as code', 'li.lab_items_name as name', 'lo.lab_order_result as result');
        }

        $labRows = $labQuery
            ->orderBy('o.hn')
            ->orderByDesc('lh.report_date')
            ->orderByDesc('lh.lab_order_number')
            ->get();

        $labByHn = [];
        foreach ($labRows as $lr) {
            $hn = $lr->hn;
            $val = is_numeric($lr->result) ? (float) $lr->result : null;
            if ($val === null || $val <= 0) continue;
            if (!isset($labByHn[$hn])) $labByHn[$hn] = [];
            $labByHn[$hn][] = [
                'date' => (string) $lr->report_date,
                'value' => $val,
                'code' => (string) $lr->code,
                'name' => (string) $lr->name,
            ];
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
        $veryHighThreshold = (int) config('thai_ascvd.very_high_risk_threshold', 30);

        $highMonthly = [];
        $distMonthly = [];
        $processed = 0;
        $skipped = 0;
        $reasons = ['no_person' => 0, 'no_risk' => 0];
        $summary = [
            'total_assessed' => 0,
            'high_risk' => 0,
            'very_high_risk' => 0,
            'low_risk' => 0,
            'moderate_risk' => 0,
            'average_risk' => 0,
            'max_risk' => 0,
            'high_risk_rate' => 0,
            'method_counts' => ['lipid' => 0, 'waist_height' => 0, 'waist' => 0],
            'skipped' => 0,
            'note' => 'คำนวณด้วยสูตร Thai CV Risk Score 2.5 จาก Ramathibodi/EGAT ใช้กับคนไทยอายุ 35-70 ปี',
        ];
        $riskSum = 0.0;

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

            $tc = null;
            if ($scr && isset($scr->screen_tc) && is_numeric($scr->screen_tc) && (float) $scr->screen_tc > 0) {
                $tc = (float) $scr->screen_tc;
            } elseif ($scr && isset($scr->screen_cholesterol) && is_numeric($scr->screen_cholesterol) && (float) $scr->screen_cholesterol > 0) {
                $tc = (float) $scr->screen_cholesterol;
            } else {
                foreach (($labByHn[$hn] ?? []) as $lab) {
                    $daysDiff = (strtotime($date) - strtotime($lab['date'])) / 86400;
                    if ($daysDiff >= 0 && $daysDiff <= $labMaxAgeDays) {
                        $tc = (float) $lab['value'];
                        break;
                    }
                }
            }

            $dm = isset($dmSet[$hn]);

            $result = $calc->calculate([
                'sex' => $sex,
                'age' => $age,
                'sbp' => $sbp,
                'tc' => $tc,
                'dm' => $dm,
                'smoker' => $smoker,
                'waist' => $waist,
                'height' => $height,
                'wh_ratio' => $wh,
            ]);

            if ($result === null) {
                $reasons['no_risk']++;
                continue;
            } // skip if insufficient or not configured

            $risk = $result['risk'];
            $processed++;
            $riskSum += $risk;
            $summary['total_assessed']++;
            $summary['max_risk'] = max($summary['max_risk'], $risk);
            $summary['method_counts'][$result['method']] = ($summary['method_counts'][$result['method']] ?? 0) + 1;
            if ($risk < 10) {
                $summary['low_risk']++;
            } elseif ($risk < $highThreshold) {
                $summary['moderate_risk']++;
            } elseif ($risk < $veryHighThreshold) {
                $summary['high_risk']++;
            } else {
                $summary['high_risk']++;
                $summary['very_high_risk']++;
            }

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
        $summary['skipped'] = count($vnByKey) - $processed;
        if ($summary['total_assessed'] > 0) {
            $summary['average_risk'] = round($riskSum / $summary['total_assessed'], 2);
            $summary['max_risk'] = round($summary['max_risk'], 2);
            $summary['high_risk_rate'] = round(($summary['high_risk'] / $summary['total_assessed']) * 100, 1);
        }

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

        return [$outHigh, $outDist, $summary];
    }

    /**
     * DM/HT patient counts from vn_stat (distinct HN).
     * Includes principal (pdx) and secondary diagnoses (dx0-dx5).
     */
    private function countDistinctHnByIcdRange($conn, string $startDate, string $endDate, string $fromCode, string $toCode): int
    {
        try {
            $row = $conn->selectOne(
                'SELECT COUNT(DISTINCT ov.hn) AS c
                 FROM vn_stat ov, patient pt, ovst
                 WHERE ov.vn = ovst.vn
                   AND pt.hn = ov.hn
                   AND ov.hn = pt.hn
                   AND ov.vstdate BETWEEN ? AND ?
                   AND ov.age_y >= 0
                   AND ov.age_y <= 200
                   AND (
                        (ov.pdx >= ? AND ov.pdx <= ?)
                     OR (ov.dx0 >= ? AND ov.dx0 <= ?)
                     OR (ov.dx1 >= ? AND ov.dx1 <= ?)
                     OR (ov.dx2 >= ? AND ov.dx2 <= ?)
                     OR (ov.dx3 >= ? AND ov.dx3 <= ?)
                     OR (ov.dx4 >= ? AND ov.dx4 <= ?)
                     OR (ov.dx5 >= ? AND ov.dx5 <= ?)
                   )',
                [
                    $startDate, $endDate,
                    $fromCode, $toCode,
                    $fromCode, $toCode,
                    $fromCode, $toCode,
                    $fromCode, $toCode,
                    $fromCode, $toCode,
                    $fromCode, $toCode,
                    $fromCode, $toCode,
                ]
            );

            return (int) ($row->c ?? 0);
        } catch (\Throwable $e) {
            Log::warning('Dashboard DM/HT count failed', [
                'from' => $fromCode,
                'to' => $toCode,
                'message' => $e->getMessage(),
            ]);

            return 0;
        }
    }

    private function monthlyDistinctHnByIcdRange($conn, string $startDate, string $endDate, string $fromCode, string $toCode)
    {
        try {
            return collect($conn->select(
                'SELECT YEAR(ov.vstdate) AS y, MONTH(ov.vstdate) AS m, COUNT(DISTINCT ov.hn) AS total
                 FROM vn_stat ov, patient pt, ovst
                 WHERE ov.vn = ovst.vn
                   AND pt.hn = ov.hn
                   AND ov.hn = pt.hn
                   AND ov.vstdate BETWEEN ? AND ?
                   AND ov.age_y >= 0
                   AND ov.age_y <= 200
                   AND (
                        (ov.pdx >= ? AND ov.pdx <= ?)
                     OR (ov.dx0 >= ? AND ov.dx0 <= ?)
                     OR (ov.dx1 >= ? AND ov.dx1 <= ?)
                     OR (ov.dx2 >= ? AND ov.dx2 <= ?)
                     OR (ov.dx3 >= ? AND ov.dx3 <= ?)
                     OR (ov.dx4 >= ? AND ov.dx4 <= ?)
                     OR (ov.dx5 >= ? AND ov.dx5 <= ?)
                   )
                 GROUP BY YEAR(ov.vstdate), MONTH(ov.vstdate)
                 ORDER BY y, m',
                [
                    $startDate, $endDate,
                    $fromCode, $toCode,
                    $fromCode, $toCode,
                    $fromCode, $toCode,
                    $fromCode, $toCode,
                    $fromCode, $toCode,
                    $fromCode, $toCode,
                    $fromCode, $toCode,
                ]
            ));
        } catch (\Throwable $e) {
            Log::warning('Dashboard DM/HT monthly failed', [
                'from' => $fromCode,
                'to' => $toCode,
                'message' => $e->getMessage(),
            ]);

            return collect();
        }
    }
}