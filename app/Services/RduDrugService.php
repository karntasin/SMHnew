<?php

namespace App\Services;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RduDrugService
{
    /** @var array<string, bool> */
    private array $schema = [];

    public function __construct(private RduReportService $rdu) {}

    public function connectionStatus(): array
    {
        return $this->rdu->connectionStatus();
    }

    /**
     * @return array{
     *   connection: array,
     *   summary: array,
     *   top_drugs: array,
     *   monthly_trend: array,
     *   opd_ipd: array,
     *   high_risk: array
     * }
     */
    public function utilizationDashboard(string $startDate, string $endDate): array
    {
        $connection = $this->connectionStatus();
        if (! ($connection['connected'] ?? false)) {
            return $this->emptyUtilization($connection);
        }

        try {
            $conn = DB::connection('hosxp');
            $amountSum = $this->sumAmountSelect($conn);
            $ipdCond = $this->ipdConditionSql($conn);
            $opdCond = "NOT ({$ipdCond})";

            $base = $this->baseDrugQuery($conn, $startDate, $endDate);
            $summaryRow = (clone $base)
                ->selectRaw('COUNT(DISTINCT oi.vn) as drug_visits')
                ->selectRaw('COUNT(DISTINCT oi.hn) as patients')
                ->selectRaw('COUNT(*) as drug_lines')
                ->selectRaw('COALESCE(SUM(oi.qty), 0) as total_qty')
                ->selectRaw($amountSum)
                ->selectRaw("COUNT(DISTINCT CASE WHEN {$opdCond} THEN oi.vn END) as opd_visits")
                ->selectRaw("COUNT(DISTINCT CASE WHEN {$ipdCond} THEN oi.vn END) as ipd_visits")
                ->first();

            $abVisits = (int) $this->applyDrugSet(clone $base, 'antibiotic')
                ->selectRaw('COUNT(DISTINCT oi.vn) as c')
                ->value('c');

            $drugVisits = (int) ($summaryRow->drug_visits ?? 0);

            $topRaw = (clone $base)
                ->selectRaw('oi.icode as drug_code')
                ->selectRaw('di.name as drug_name')
                ->selectRaw('COALESCE(SUM(oi.qty), 0) as total_qty')
                ->selectRaw('COUNT(DISTINCT oi.vn) as visits')
                ->selectRaw($amountSum)
                ->groupBy('oi.icode', 'di.name')
                ->orderByDesc('total_qty')
                ->limit(15)
                ->get();

            $totalQty = (float) ($summaryRow->total_qty ?? 0);
            $topDrugs = $topRaw->values()->map(function ($row, $i) use ($totalQty) {
                $qty = (float) $row->total_qty;

                return [
                    'rank' => $i + 1,
                    'drug_code' => $row->drug_code,
                    'drug_name' => $row->drug_name,
                    'total_qty' => $qty,
                    'visits' => (int) $row->visits,
                    'total_amount' => (float) $row->total_amount,
                    'qty_share_percent' => $totalQty > 0 ? round($qty / $totalQty * 100, 1) : 0,
                ];
            })->all();

            $monthlyDrug = (clone $base)
                ->selectRaw('YEAR(oi.vstdate) as y')
                ->selectRaw('MONTH(oi.vstdate) as m')
                ->selectRaw('COUNT(DISTINCT oi.vn) as drug_visits')
                ->selectRaw('COALESCE(SUM(oi.qty), 0) as total_qty')
                ->groupByRaw('YEAR(oi.vstdate), MONTH(oi.vstdate)')
                ->orderByRaw('YEAR(oi.vstdate), MONTH(oi.vstdate)')
                ->get()
                ->keyBy(fn ($r) => sprintf('%04d-%02d', $r->y, $r->m));

            $monthlyAb = $this->applyDrugSet(clone $base, 'antibiotic')
                ->selectRaw('YEAR(oi.vstdate) as y')
                ->selectRaw('MONTH(oi.vstdate) as m')
                ->selectRaw('COUNT(DISTINCT oi.vn) as ab_visits')
                ->selectRaw('COALESCE(SUM(oi.qty), 0) as ab_qty')
                ->groupByRaw('YEAR(oi.vstdate), MONTH(oi.vstdate)')
                ->orderByRaw('YEAR(oi.vstdate), MONTH(oi.vstdate)')
                ->get()
                ->keyBy(fn ($r) => sprintf('%04d-%02d', $r->y, $r->m));

            $monthlyTrend = $monthlyDrug->map(function ($row, $key) use ($monthlyAb) {
                $ab = $monthlyAb->get($key);
                $drugVisits = (int) $row->drug_visits;
                $abVisits = (int) ($ab->ab_visits ?? 0);

                return [
                    'period' => $key,
                    'label' => $this->thaiMonthLabel((int) $row->y, (int) $row->m),
                    'drug_visits' => $drugVisits,
                    'ab_visits' => $abVisits,
                    'ab_rate' => $drugVisits > 0 ? round($abVisits / $drugVisits * 100, 1) : null,
                    'total_qty' => (float) $row->total_qty,
                    'ab_qty' => (float) ($ab->ab_qty ?? 0),
                ];
            })->values()->all();

            $highRisk = $this->highRiskSummary($conn, $startDate, $endDate);

            return [
                'connection' => $connection,
                'summary' => [
                    'drug_visits' => $drugVisits,
                    'patients' => (int) ($summaryRow->patients ?? 0),
                    'drug_lines' => (int) ($summaryRow->drug_lines ?? 0),
                    'total_qty' => $totalQty,
                    'total_amount' => (float) ($summaryRow->total_amount ?? 0),
                    'ab_visits' => $abVisits,
                    'ab_rate' => $drugVisits > 0 ? round($abVisits / $drugVisits * 100, 1) : null,
                    'opd_visits' => (int) ($summaryRow->opd_visits ?? 0),
                    'ipd_visits' => (int) ($summaryRow->ipd_visits ?? 0),
                ],
                'top_drugs' => $topDrugs,
                'monthly_trend' => $monthlyTrend,
                'opd_ipd' => [
                    ['name' => 'OPD', 'visits' => (int) ($summaryRow->opd_visits ?? 0)],
                    ['name' => 'IPD', 'visits' => (int) ($summaryRow->ipd_visits ?? 0)],
                ],
                'high_risk' => $highRisk,
            ];
        } catch (\Throwable $e) {
            Log::error('RDU drug utilization failed: '.$e->getMessage());

            return $this->emptyUtilization(array_merge($connection, [
                'connected' => false,
                'message' => 'ดึงข้อมูลการใช้ยาไม่สำเร็จ: '.$e->getMessage(),
            ]));
        }
    }

    /**
     * @return array{
     *   connection: array,
     *   summary: array,
     *   top_antibiotics: array,
     *   by_therapeutic_group: array,
     *   monthly_trend: array,
     *   rdu_indicators: array
     * }
     */
    public function antibioticReport(string $startDate, string $endDate): array
    {
        $connection = $this->connectionStatus();
        if (! ($connection['connected'] ?? false)) {
            return [
                'connection' => $connection,
                'summary' => $this->emptyAbSummary(),
                'top_antibiotics' => [],
                'by_therapeutic_group' => [],
                'monthly_trend' => [],
                'rdu_indicators' => [],
            ];
        }

        try {
            $conn = DB::connection('hosxp');
            $amountSum = $this->sumAmountSelect($conn);
            $base = $this->applyDrugSet($this->baseDrugQuery($conn, $startDate, $endDate), 'antibiotic');

            $summaryRow = (clone $base)
                ->selectRaw('COUNT(*) as prescription_lines')
                ->selectRaw('COUNT(DISTINCT oi.vn) as ab_visits')
                ->selectRaw('COUNT(DISTINCT oi.hn) as patients')
                ->selectRaw('COUNT(DISTINCT oi.icode) as distinct_drugs')
                ->selectRaw('COALESCE(SUM(oi.qty), 0) as total_qty')
                ->selectRaw($amountSum)
                ->first();

            $topAb = (clone $base)
                ->selectRaw('oi.icode as drug_code')
                ->selectRaw('di.name as drug_name')
                ->selectRaw('COALESCE(di.therapeuticgroup, di.therapeutic, "-") as therapeutic_group')
                ->selectRaw('COALESCE(SUM(oi.qty), 0) as total_qty')
                ->selectRaw('COUNT(DISTINCT oi.vn) as visits')
                ->groupBy('oi.icode', 'di.name', 'di.therapeuticgroup', 'di.therapeutic')
                ->orderByDesc('total_qty')
                ->limit(20)
                ->get()
                ->map(fn ($row, $i) => [
                    'rank' => $i + 1,
                    'drug_code' => $row->drug_code,
                    'drug_name' => $row->drug_name,
                    'therapeutic_group' => $row->therapeutic_group,
                    'total_qty' => (float) $row->total_qty,
                    'visits' => (int) $row->visits,
                ])->all();

            $byGroup = (clone $base)
                ->selectRaw('COALESCE(NULLIF(di.therapeuticgroup, ""), NULLIF(di.therapeutic, ""), "ไม่ระบุกลุ่ม") as group_name')
                ->selectRaw('COUNT(DISTINCT oi.vn) as visits')
                ->selectRaw('COALESCE(SUM(oi.qty), 0) as total_qty')
                ->groupByRaw('COALESCE(NULLIF(di.therapeuticgroup, ""), NULLIF(di.therapeutic, ""), "ไม่ระบุกลุ่ม")')
                ->orderByDesc('total_qty')
                ->limit(12)
                ->get()
                ->map(fn ($row) => [
                    'name' => $row->group_name,
                    'visits' => (int) $row->visits,
                    'total_qty' => (float) $row->total_qty,
                ])->all();

            $monthlyTrend = (clone $base)
                ->selectRaw('YEAR(oi.vstdate) as y')
                ->selectRaw('MONTH(oi.vstdate) as m')
                ->selectRaw('COUNT(DISTINCT oi.vn) as ab_visits')
                ->selectRaw('COALESCE(SUM(oi.qty), 0) as ab_qty')
                ->groupByRaw('YEAR(oi.vstdate), MONTH(oi.vstdate)')
                ->orderByRaw('YEAR(oi.vstdate), MONTH(oi.vstdate)')
                ->get()
                ->map(fn ($row) => [
                    'period' => sprintf('%04d-%02d', $row->y, $row->m),
                    'label' => $this->thaiMonthLabel((int) $row->y, (int) $row->m),
                    'ab_visits' => (int) $row->ab_visits,
                    'ab_qty' => (float) $row->ab_qty,
                ])->all();

            $rduDash = $this->rdu->dashboard($startDate, $endDate);
            $rduIndicators = collect($rduDash['indicators'] ?? [])
                ->where('group', 'A')
                ->values()
                ->all();

            return [
                'connection' => $connection,
                'summary' => [
                    'prescription_lines' => (int) ($summaryRow->prescription_lines ?? 0),
                    'ab_visits' => (int) ($summaryRow->ab_visits ?? 0),
                    'patients' => (int) ($summaryRow->patients ?? 0),
                    'distinct_drugs' => (int) ($summaryRow->distinct_drugs ?? 0),
                    'total_qty' => (float) ($summaryRow->total_qty ?? 0),
                    'total_amount' => (float) ($summaryRow->total_amount ?? 0),
                ],
                'top_antibiotics' => $topAb,
                'by_therapeutic_group' => $byGroup,
                'monthly_trend' => $monthlyTrend,
                'rdu_indicators' => $rduIndicators,
            ];
        } catch (\Throwable $e) {
            Log::error('RDU antibiotic report failed: '.$e->getMessage());

            return [
                'connection' => array_merge($connection, [
                    'connected' => false,
                    'message' => 'ดึงรายงาน AB ไม่สำเร็จ: '.$e->getMessage(),
                ]),
                'summary' => $this->emptyAbSummary(),
                'top_antibiotics' => [],
                'by_therapeutic_group' => [],
                'monthly_trend' => [],
                'rdu_indicators' => [],
            ];
        }
    }

    /**
     * @return array{connection: array, departments: array, doctors: array}
     */
    public function byDepartment(string $startDate, string $endDate, ?string $visitType = null): array
    {
        $connection = $this->connectionStatus();
        if (! ($connection['connected'] ?? false)) {
            return ['connection' => $connection, 'departments' => [], 'doctors' => []];
        }

        try {
            $conn = DB::connection('hosxp');
            $amountSum = $this->sumAmountSelect($conn);
            $ipdCond = $this->ipdConditionSql($conn);
            $base = $this->baseDrugQuery($conn, $startDate, $endDate);

            if ($visitType === 'opd') {
                $base->whereRaw("NOT ({$ipdCond})");
            } elseif ($visitType === 'ipd') {
                $base->whereRaw($ipdCond);
            }

            $deptRows = (clone $base)
                ->leftJoin('kskdepartment as dep', 'dep.depcode', '=', 'o.main_dep')
                ->selectRaw('COALESCE(o.main_dep, "-") as department_code')
                ->selectRaw('COALESCE(NULLIF(dep.department, ""), o.main_dep, "ไม่ระบุแผนก") as department_name')
                ->selectRaw('COUNT(DISTINCT oi.vn) as drug_visits')
                ->selectRaw('COUNT(*) as drug_lines')
                ->selectRaw('COALESCE(SUM(oi.qty), 0) as total_qty')
                ->selectRaw($amountSum)
                ->groupBy('o.main_dep', 'dep.department')
                ->orderByDesc('drug_visits')
                ->limit(50)
                ->get();

            $abByDept = $this->applyDrugSet(clone $base, 'antibiotic')
                ->leftJoin('kskdepartment as dep', 'dep.depcode', '=', 'o.main_dep')
                ->selectRaw('COALESCE(o.main_dep, "-") as department_code')
                ->selectRaw('COUNT(DISTINCT oi.vn) as ab_visits')
                ->groupBy('o.main_dep')
                ->get()
                ->keyBy('department_code');

            $departments = $deptRows->map(function ($row) use ($abByDept) {
                $ab = (int) ($abByDept->get($row->department_code)?->ab_visits ?? 0);
                $visits = (int) $row->drug_visits;

                return [
                    'department_code' => $row->department_code,
                    'department_name' => $row->department_name,
                    'drug_visits' => $visits,
                    'drug_lines' => (int) $row->drug_lines,
                    'total_qty' => (float) $row->total_qty,
                    'total_amount' => (float) $row->total_amount,
                    'ab_visits' => $ab,
                    'ab_rate' => $visits > 0 ? round($ab / $visits * 100, 1) : null,
                ];
            })->all();

            $doctorRows = $this->topPhysiciansByDrugUse(clone $base, $conn, 10);

            return [
                'connection' => $connection,
                'departments' => $departments,
                'doctors' => $doctorRows,
            ];
        } catch (\Throwable $e) {
            Log::error('RDU drugs by department failed: '.$e->getMessage());

            return [
                'connection' => array_merge($connection, [
                    'connected' => false,
                    'message' => 'ดึงรายงานตามแผนกไม่สำเร็จ: '.$e->getMessage(),
                ]),
                'departments' => [],
                'doctors' => [],
            ];
        }
    }

    public function exportTopDrugs(string $startDate, string $endDate, int $limit = 100): Collection
    {
        if (! ($this->connectionStatus()['connected'] ?? false)) {
            return collect();
        }

        $conn = DB::connection('hosxp');
        $amountSum = $this->sumAmountSelect($conn);

        return $this->baseDrugQuery($conn, $startDate, $endDate)
            ->selectRaw('oi.icode as drug_code')
            ->selectRaw('di.name as drug_name')
            ->selectRaw('COALESCE(di.therapeuticgroup, di.therapeutic, "") as therapeutic_group')
            ->selectRaw('COALESCE(SUM(oi.qty), 0) as total_qty')
            ->selectRaw('COUNT(DISTINCT oi.vn) as visits')
            ->selectRaw('COUNT(DISTINCT oi.hn) as patients')
            ->selectRaw($amountSum)
            ->groupBy('oi.icode', 'di.name', 'di.therapeuticgroup', 'di.therapeutic')
            ->orderByDesc('total_qty')
            ->limit($limit)
            ->get();
    }

    private function topPhysiciansByDrugUse(Builder $base, $conn, int $limit = 10): array
    {
        $query = $base
            ->join('doctor as doc', 'doc.code', '=', 'o.doctor')
            ->whereNotNull('o.doctor')
            ->where('o.doctor', '<>', '');

        $this->applyPhysicianScope($query, $conn);

        return $query
            ->selectRaw('doc.code as doctor_code')
            ->selectRaw("TRIM(CONCAT(COALESCE(doc.pname,''), COALESCE(doc.fname,''), ' ', COALESCE(doc.lname,''))) as doctor_name")
            ->selectRaw('COUNT(DISTINCT oi.vn) as drug_visits')
            ->selectRaw('COUNT(*) as drug_lines')
            ->selectRaw('COALESCE(SUM(oi.qty), 0) as total_qty')
            ->groupBy('doc.code', 'doc.pname', 'doc.fname', 'doc.lname')
            ->orderByDesc('drug_visits')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'doctor_code' => $row->doctor_code,
                'doctor_name' => trim($row->doctor_name),
                'drug_visits' => (int) $row->drug_visits,
                'drug_lines' => (int) $row->drug_lines,
                'total_qty' => (float) $row->total_qty,
            ])
            ->filter(fn ($row) => $row['doctor_name'] !== '')
            ->values()
            ->all();
    }

    private function applyPhysicianScope(Builder $query, $conn): Builder
    {
        $query->whereRaw("TRIM(CONCAT(COALESCE(doc.pname,''), COALESCE(doc.fname,''), ' ', COALESCE(doc.lname,''))) <> ''");

        if ($this->columnExists($conn, 'doctor', 'provider_type_code')) {
            $query->where('doc.provider_type_code', '01');
        } elseif ($this->columnExists($conn, 'doctor', 'licenseno')) {
            $query->whereNotNull('doc.licenseno')->where('doc.licenseno', '<>', '');
        }

        if ($this->columnExists($conn, 'doctor', 'active')) {
            $query->where(function ($w) {
                $w->whereNull('doc.active')->orWhere('doc.active', 'Y');
            });
        }

        return $query;
    }

    private function highRiskSummary($conn, string $startDate, string $endDate): array
    {
        $base = $this->baseDrugQuery($conn, $startDate, $endDate);
        $sets = ['nsaid' => 'NSAID', 'long_acting_bz' => 'Long-acting BZD'];

        $rows = [];
        foreach ($sets as $set => $label) {
            $visits = (int) $this->applyDrugSet(clone $base, $set)
                ->selectRaw('COUNT(DISTINCT oi.vn) as c')
                ->value('c');
            $rows[] = ['key' => $set, 'label' => $label, 'visits' => $visits];
        }

        if ($this->columnExists($conn, 'drugitems', 'high_cost')) {
            $hc = (int) (clone $base)->where('di.high_cost', 'Y')
                ->selectRaw('COUNT(DISTINCT oi.vn) as c')->value('c');
            $rows[] = ['key' => 'high_cost', 'label' => 'High-cost drugs', 'visits' => $hc];
        }

        return $rows;
    }

    private function sumAmountSelect($conn): string
    {
        return 'COALESCE(SUM('.$this->amountSql($conn).'), 0) as total_amount';
    }

    private function amountSql($conn): string
    {
        if ($this->columnExists($conn, 'opitemrece', 'sum_price')) {
            return 'oi.sum_price';
        }

        return '(oi.unitprice * oi.qty)';
    }

    private function baseDrugQuery($conn, string $startDate, string $endDate): Builder
    {
        $q = $conn->table('opitemrece as oi')
            ->join('drugitems as di', 'di.icode', '=', 'oi.icode')
            ->leftJoin('ovst as o', 'o.vn', '=', 'oi.vn')
            ->whereBetween('oi.vstdate', [$startDate, $endDate]);

        if ($this->columnExists($conn, 'drugitems', 'istatus')) {
            $q->where(function ($w) {
                $w->whereNull('di.istatus')->orWhere('di.istatus', 'Y');
            });
        }

        return $q;
    }

    private function applyDrugSet(Builder $query, string $drugSet): Builder
    {
        if ($drugSet === 'antibiotic') {
            $col = config('rdu.drugs.antibiotic_column', 'antibiotic');
            $val = config('rdu.drugs.antibiotic_value', 'Y');
            $patterns = config('rdu.drugs.antibiotic_patterns', []);
            $conn = DB::connection('hosxp');

            $query->where(function ($q) use ($col, $val, $patterns, $conn) {
                if ($this->columnExists($conn, 'drugitems', $col)) {
                    $q->where('di.'.$col, $val);
                }
                foreach ($patterns as $p) {
                    $q->orWhere('di.name', 'like', '%'.$p.'%');
                }
            });

            return $query;
        }

        $patterns = match ($drugSet) {
            'nsaid' => config('rdu.drugs.nsaid_patterns', []),
            'long_acting_bz' => config('rdu.drugs.long_acting_bz_patterns', []),
            default => [],
        };

        $query->where(function ($q) use ($patterns) {
            foreach ($patterns as $p) {
                $q->orWhere('di.name', 'like', '%'.$p.'%');
            }
        });

        if ($drugSet === 'nsaid') {
            foreach (config('rdu.drugs.nsaid_exclude_patterns', []) as $ex) {
                $query->where('di.name', 'not like', '%'.$ex.'%');
            }
        }

        return $query;
    }

    private function ipdConditionSql($conn): string
    {
        $parts = [];
        if ($this->columnExists($conn, 'opitemrece', 'an')) {
            $parts[] = "(oi.an IS NOT NULL AND TRIM(oi.an) <> '')";
        }
        $parts[] = "(o.an IS NOT NULL AND TRIM(o.an) <> '')";

        return '('.implode(' OR ', $parts).')';
    }

    private function thaiMonthLabel(int $year, int $month): string
    {
        $months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

        return ($months[$month - 1] ?? '').' '.($year + 543);
    }

    private function emptyUtilization(array $connection): array
    {
        return [
            'connection' => $connection,
            'summary' => [
                'drug_visits' => 0, 'patients' => 0, 'drug_lines' => 0,
                'total_qty' => 0, 'total_amount' => 0, 'ab_visits' => 0,
                'ab_rate' => null, 'opd_visits' => 0, 'ipd_visits' => 0,
            ],
            'top_drugs' => [],
            'monthly_trend' => [],
            'opd_ipd' => [],
            'high_risk' => [],
        ];
    }

    private function emptyAbSummary(): array
    {
        return [
            'prescription_lines' => 0, 'ab_visits' => 0, 'patients' => 0,
            'distinct_drugs' => 0, 'total_qty' => 0, 'total_amount' => 0,
        ];
    }

    private function columnExists($conn, string $table, string $column): bool
    {
        $key = "c:{$table}.{$column}";
        if (! array_key_exists($key, $this->schema)) {
            try {
                $this->schema[$key] = in_array($column, $conn->getSchemaBuilder()->getColumnListing($table), true);
            } catch (\Throwable) {
                $this->schema[$key] = false;
            }
        }

        return $this->schema[$key];
    }
}
