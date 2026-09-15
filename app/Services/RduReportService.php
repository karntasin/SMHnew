<?php

namespace App\Services;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RduReportService
{
    /** @var array<string, bool> */
    private array $schema = [];

    public function connectionStatus(): array
    {
        try {
            if (! config('database.connections.hosxp')) {
                return [
                    'connected' => false,
                    'database' => null,
                    'message' => 'ยังไม่ได้ตั้งค่าการเชื่อมต่อ HOSxP',
                    'checked_at' => now()->toDateTimeString(),
                    'response_ms' => null,
                ];
            }

            $started = microtime(true);
            $conn = DB::connection('hosxp');
            $conn->getPdo();
            $conn->select('SELECT 1');

            return [
                'connected' => true,
                'database' => $conn->getDatabaseName(),
                'message' => 'เชื่อมต่อฐานข้อมูล HOSxP สำเร็จ',
                'checked_at' => now()->toDateTimeString(),
                'response_ms' => (int) round((microtime(true) - $started) * 1000),
            ];
        } catch (\Throwable $e) {
            return [
                'connected' => false,
                'database' => null,
                'message' => 'ไม่สามารถเชื่อมต่อ HOSxP: '.$e->getMessage(),
                'checked_at' => now()->toDateTimeString(),
                'response_ms' => null,
            ];
        }
    }

    /** @return array<int, array<string, mixed>> */
    public function indicatorCatalog(): array
    {
        return array_values(config('rdu.indicators', []));
    }

    public function getIndicator(string $id): ?array
    {
        return config("rdu.indicators.{$id}");
    }

    /**
     * @return array{
     *   connection: array,
     *   filter: array,
     *   summary: array,
     *   indicators: array,
     *   chart: array
     * }
     */
    public function dashboard(string $startDate, string $endDate): array
    {
        $connection = $this->connectionStatus();
        $indicators = $this->indicatorCatalog();

        if (! ($connection['connected'] ?? false)) {
            return [
                'connection' => $connection,
                'filter' => compact('startDate', 'endDate'),
                'summary' => $this->emptySummary(),
                'indicators' => collect($indicators)->map(fn ($i) => $this->emptyIndicatorRow($i))->all(),
                'chart' => ['by_group' => [], 'daily' => []],
            ];
        }

        try {
            $conn = DB::connection('hosxp');
            $rows = [];
            $totalCases = 0;
            $groupTotals = ['A' => 0, 'B' => 0];

            foreach ($indicators as $indicator) {
                $stats = $this->indicatorStats($conn, $indicator, $startDate, $endDate);
                $rows[] = $stats;
                $totalCases += $stats['case_count'];
                $groupTotals[$indicator['group']] = ($groupTotals[$indicator['group']] ?? 0) + $stats['case_count'];
            }

            return [
                'connection' => $connection,
                'filter' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                ],
                'summary' => [
                    'total_cases' => $totalCases,
                    'group_a_cases' => $groupTotals['A'] ?? 0,
                    'group_b_cases' => $groupTotals['B'] ?? 0,
                    'indicator_count' => count($rows),
                    'worst_indicator' => collect($rows)->sortByDesc('rate')->first(),
                ],
                'indicators' => $rows,
                'chart' => [
                    'by_group' => [
                        ['name' => 'กลุ่ม A: Antibiotic', 'value' => $groupTotals['A'] ?? 0],
                        ['name' => 'กลุ่ม B: High-risk', 'value' => $groupTotals['B'] ?? 0],
                    ],
                ],
            ];
        } catch (\Throwable $e) {
            Log::error('RDU dashboard failed: '.$e->getMessage());

            return [
                'connection' => array_merge($connection, [
                    'connected' => false,
                    'message' => 'ดึงข้อมูล RDU ไม่สำเร็จ: '.$e->getMessage(),
                ]),
                'filter' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                ],
                'summary' => $this->emptySummary(),
                'indicators' => collect($indicators)->map(fn ($i) => $this->emptyIndicatorRow($i))->all(),
                'chart' => ['by_group' => [], 'daily' => []],
            ];
        }
    }

    /**
     * @return array{rows: array, total: int, page: int, per_page: int, indicator: array|null}
     */
    public function cases(string $indicatorId, string $startDate, string $endDate, int $page = 1, int $perPage = 50, ?string $department = null): array
    {
        $indicator = $this->getIndicator($indicatorId);
        if (! $indicator) {
            return [
                'rows' => [],
                'total' => 0,
                'page' => $page,
                'per_page' => $perPage,
                'indicator' => null,
            ];
        }

        $conn = DB::connection('hosxp');
        $query = $this->casesQuery($conn, $indicator, $startDate, $endDate);

        if ($department) {
            $query->where(function ($q) use ($department) {
                $q->where('dep.department', 'like', "%{$department}%")
                    ->orWhere('o.main_dep', $department);
            });
        }

        $total = (clone $query)->count();
        $rows = $query
            ->forPage($page, $perPage)
            ->get()
            ->map(fn ($row) => $this->normalizeCaseRow($row, $indicatorId))
            ->all();

        return [
            'rows' => $rows,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'indicator' => $indicator,
        ];
    }

    /** @return Collection<int, object> */
    public function exportCases(string $indicatorId, string $startDate, string $endDate, int $limit = 5000): Collection
    {
        $indicator = $this->getIndicator($indicatorId);
        if (! $indicator) {
            return collect();
        }

        return $this->casesQuery(DB::connection('hosxp'), $indicator, $startDate, $endDate)
            ->limit($limit)
            ->get()
            ->map(fn ($row) => (object) $this->normalizeCaseRow($row, $indicatorId));
    }

    private function indicatorStats($conn, array $indicator, string $startDate, string $endDate): array
    {
        $id = $indicator['id'];

        if ($id === 'dup_nsaid') {
            $denom = $this->visitCountWithDrugSet($conn, 'nsaid', $startDate, $endDate);
            $numer = (clone $this->casesQuery($conn, $indicator, $startDate, $endDate))->count();
        } elseif ($id === 'elderly_bz') {
            $denom = $this->elderlyVisitCount($conn, $startDate, $endDate, (int) ($indicator['min_age'] ?? 65));
            $numer = (clone $this->casesQuery($conn, $indicator, $startDate, $endDate))->count();
        } elseif ($id === 'ckd_nsaid') {
            $denom = $this->ckdRiskVisitCount($conn, $startDate, $endDate);
            $numer = (clone $this->casesQuery($conn, $indicator, $startDate, $endDate))->count();
        } else {
            // ICD condition + antibiotic
            $denom = $this->visitCountWithIcd($conn, $indicator['icd_prefixes'] ?? [], $startDate, $endDate);
            $numer = (clone $this->casesQuery($conn, $indicator, $startDate, $endDate))->count();
        }

        $rate = $denom > 0 ? round($numer / $denom * 100, 1) : null;

        return array_merge($indicator, [
            'denominator' => $denom,
            'case_count' => $numer,
            'rate' => $rate,
            'rate_label' => $rate === null ? '—' : $rate.'%',
        ]);
    }

    private function casesQuery($conn, array $indicator, string $startDate, string $endDate): Builder
    {
        return match ($indicator['id']) {
            'uri_ab', 'diarrhea_ab', 'wound_ab' => $this->queryIcdPlusDrug($conn, $indicator, $startDate, $endDate),
            'ckd_nsaid' => $this->queryCkdNsaid($conn, $indicator, $startDate, $endDate),
            'dup_nsaid' => $this->queryDuplicateNsaid($conn, $indicator, $startDate, $endDate),
            'elderly_bz' => $this->queryElderlyBz($conn, $indicator, $startDate, $endDate),
            default => $conn->table('ovst')->whereRaw('1 = 0'),
        };
    }

    private function baseCaseSelect(Builder $query): Builder
    {
        return $query
            ->select([
                'o.vn',
                'o.hn',
                'o.vstdate',
                'o.vsttime',
                'o.main_dep',
            ])
            ->selectRaw("CONCAT(COALESCE(p.pname,''), COALESCE(p.fname,''), ' ', COALESCE(p.lname,'')) as patient_name")
            ->selectRaw('TIMESTAMPDIFF(YEAR, p.birthday, o.vstdate) as age_y')
            ->selectRaw('p.sex')
            ->selectRaw('COALESCE(dep.department, o.main_dep) as department_name')
            ->selectRaw('COALESCE(sp.name, o.spclty) as specialty_name')
            ->selectRaw("CONCAT(COALESCE(doc.pname,''), COALESCE(doc.fname,''), ' ', COALESCE(doc.lname,'')) as doctor_name")
            ->selectRaw('GROUP_CONCAT(DISTINCT d.icd10 ORDER BY d.icd10 SEPARATOR ", ") as icd10_list')
            ->selectRaw('GROUP_CONCAT(DISTINCT di.name ORDER BY di.name SEPARATOR " | ") as drug_list')
            ->groupBy([
                'o.vn', 'o.hn', 'o.vstdate', 'o.vsttime', 'o.main_dep',
                'p.pname', 'p.fname', 'p.lname', 'p.birthday', 'p.sex',
                'dep.department', 'sp.name', 'doc.pname', 'doc.fname', 'doc.lname',
            ])
            ->orderByDesc('o.vstdate')
            ->orderByDesc('o.vsttime');
    }

    private function joinVisitContext(Builder $query): Builder
    {
        return $query
            ->join('patient as p', 'p.hn', '=', 'o.hn')
            ->leftJoin('ovstdiag as d', 'd.vn', '=', 'o.vn')
            ->leftJoin('kskdepartment as dep', 'dep.depcode', '=', 'o.main_dep')
            ->leftJoin('spclty as sp', 'sp.spclty', '=', 'o.spclty')
            ->leftJoin('doctor as doc', 'doc.code', '=', 'o.doctor');
    }

    private function queryIcdPlusDrug($conn, array $indicator, string $startDate, string $endDate): Builder
    {
        $query = $conn->table('ovst as o');
        $this->joinVisitContext($query);
        $query->join('opitemrece as oi', 'oi.vn', '=', 'o.vn')
            ->join('drugitems as di', 'di.icode', '=', 'oi.icode')
            ->whereBetween('o.vstdate', [$startDate, $endDate])
            ->where(function ($q) use ($indicator) {
                $this->applyIcdPrefixes($q, 'd.icd10', $indicator['icd_prefixes'] ?? []);
            });

        $this->applyDrugSet($query, $indicator['drug_set'] ?? 'antibiotic', 'di');

        return $this->baseCaseSelect($query);
    }

    private function queryCkdNsaid($conn, array $indicator, string $startDate, string $endDate): Builder
    {
        $lookback = (int) config('rdu.egfr.lookback_days', 365);
        $threshold = (float) config('rdu.egfr.threshold', 60);
        $egfrCodes = config('rdu.egfr.lab_items_codes', [1062]);
        $egfrNames = config('rdu.egfr.name_patterns', ['eGFR']);

        $query = $conn->table('ovst as o');
        $this->joinVisitContext($query);
        $query->join('opitemrece as oi', 'oi.vn', '=', 'o.vn')
            ->join('drugitems as di', 'di.icode', '=', 'oi.icode')
            ->whereBetween('o.vstdate', [$startDate, $endDate]);

        $this->applyDrugSet($query, 'nsaid', 'di');

        $query->where(function ($outer) use ($indicator, $lookback, $threshold, $egfrCodes, $egfrNames) {
            $outer->where(function ($q) use ($indicator) {
                $this->applyIcdPrefixes($q, 'd.icd10', $indicator['icd_prefixes'] ?? []);
            })->orWhereExists(function ($sub) use ($lookback, $threshold, $egfrCodes, $egfrNames) {
                $sub->select(DB::raw(1))
                    ->from('lab_head as lh')
                    ->join('lab_order as lo', 'lo.lab_order_number', '=', 'lh.lab_order_number')
                    ->leftJoin('lab_items as li', 'li.lab_items_code', '=', 'lo.lab_items_code')
                    ->whereColumn('lh.hn', 'o.hn')
                    ->whereRaw('lh.order_date BETWEEN DATE_SUB(o.vstdate, INTERVAL ? DAY) AND o.vstdate', [$lookback])
                    ->where(function ($lab) use ($egfrCodes, $egfrNames) {
                        if ($egfrCodes) {
                            $lab->whereIn('lo.lab_items_code', $egfrCodes);
                        }
                        foreach ($egfrNames as $name) {
                            $lab->orWhere('li.lab_items_name', 'like', '%'.$name.'%');
                        }
                    })
                    ->whereRaw("CAST(COALESCE(NULLIF(TRIM(lo.lab_order_result), ''), '0') AS DECIMAL(12,2)) > 0")
                    ->whereRaw("CAST(COALESCE(NULLIF(TRIM(lo.lab_order_result), ''), '999') AS DECIMAL(12,2)) < ?", [$threshold]);
            });
        });

        // Add eGFR hint in drug_list already; also select latest egfr if easy — skip for performance
        return $this->baseCaseSelect($query);
    }

    private function queryDuplicateNsaid($conn, array $indicator, string $startDate, string $endDate): Builder
    {
        $minDistinct = (int) ($indicator['min_distinct_drugs'] ?? 2);

        $query = $conn->table('ovst as o');
        $this->joinVisitContext($query);
        $query->join('opitemrece as oi', 'oi.vn', '=', 'o.vn')
            ->join('drugitems as di', 'di.icode', '=', 'oi.icode')
            ->whereBetween('o.vstdate', [$startDate, $endDate]);

        $this->applyDrugSet($query, 'nsaid', 'di');

        $query = $this->baseCaseSelect($query)
            ->havingRaw('COUNT(DISTINCT di.icode) >= ?', [$minDistinct]);

        return $query;
    }

    private function queryElderlyBz($conn, array $indicator, string $startDate, string $endDate): Builder
    {
        $minAge = (int) ($indicator['min_age'] ?? 65);

        $query = $conn->table('ovst as o');
        $this->joinVisitContext($query);
        $query->join('opitemrece as oi', 'oi.vn', '=', 'o.vn')
            ->join('drugitems as di', 'di.icode', '=', 'oi.icode')
            ->whereBetween('o.vstdate', [$startDate, $endDate])
            ->whereRaw('TIMESTAMPDIFF(YEAR, p.birthday, o.vstdate) >= ?', [$minAge]);

        $this->applyDrugSet($query, 'long_acting_bz', 'di');

        return $this->baseCaseSelect($query);
    }

    private function visitCountWithIcd($conn, array $prefixes, string $startDate, string $endDate): int
    {
        if ($prefixes === []) {
            return 0;
        }

        $q = $conn->table('ovst as o')
            ->join('ovstdiag as d', 'd.vn', '=', 'o.vn')
            ->whereBetween('o.vstdate', [$startDate, $endDate])
            ->where(function ($w) use ($prefixes) {
                $this->applyIcdPrefixes($w, 'd.icd10', $prefixes);
            });

        return (int) $q->selectRaw('COUNT(DISTINCT o.vn) as aggregate')->value('aggregate');
    }

    private function visitCountWithDrugSet($conn, string $drugSet, string $startDate, string $endDate): int
    {
        $q = $conn->table('ovst as o')
            ->join('opitemrece as oi', 'oi.vn', '=', 'o.vn')
            ->join('drugitems as di', 'di.icode', '=', 'oi.icode')
            ->whereBetween('o.vstdate', [$startDate, $endDate]);
        $this->applyDrugSet($q, $drugSet, 'di');

        return (int) $q->selectRaw('COUNT(DISTINCT o.vn) as aggregate')->value('aggregate');
    }

    private function elderlyVisitCount($conn, string $startDate, string $endDate, int $minAge): int
    {
        return (int) $conn->table('ovst as o')
            ->join('patient as p', 'p.hn', '=', 'o.hn')
            ->whereBetween('o.vstdate', [$startDate, $endDate])
            ->whereRaw('TIMESTAMPDIFF(YEAR, p.birthday, o.vstdate) >= ?', [$minAge])
            ->selectRaw('COUNT(DISTINCT o.vn) as aggregate')
            ->value('aggregate');
    }

    private function ckdRiskVisitCount($conn, string $startDate, string $endDate): int
    {
        $indicator = config('rdu.indicators.ckd_nsaid');
        $lookback = (int) config('rdu.egfr.lookback_days', 365);
        $threshold = (float) config('rdu.egfr.threshold', 60);
        $egfrCodes = config('rdu.egfr.lab_items_codes', [1062]);
        $egfrNames = config('rdu.egfr.name_patterns', ['eGFR']);

        $q = $conn->table('ovst as o')
            ->leftJoin('ovstdiag as d', 'd.vn', '=', 'o.vn')
            ->whereBetween('o.vstdate', [$startDate, $endDate])
            ->where(function ($outer) use ($indicator, $lookback, $threshold, $egfrCodes, $egfrNames) {
                $outer->where(function ($q) use ($indicator) {
                    $this->applyIcdPrefixes($q, 'd.icd10', $indicator['icd_prefixes'] ?? []);
                })->orWhereExists(function ($sub) use ($lookback, $threshold, $egfrCodes, $egfrNames) {
                    $sub->select(DB::raw(1))
                        ->from('lab_head as lh')
                        ->join('lab_order as lo', 'lo.lab_order_number', '=', 'lh.lab_order_number')
                        ->leftJoin('lab_items as li', 'li.lab_items_code', '=', 'lo.lab_items_code')
                        ->whereColumn('lh.hn', 'o.hn')
                        ->whereRaw('lh.order_date BETWEEN DATE_SUB(o.vstdate, INTERVAL ? DAY) AND o.vstdate', [$lookback])
                        ->where(function ($lab) use ($egfrCodes, $egfrNames) {
                            if ($egfrCodes) {
                                $lab->whereIn('lo.lab_items_code', $egfrCodes);
                            }
                            foreach ($egfrNames as $name) {
                                $lab->orWhere('li.lab_items_name', 'like', '%'.$name.'%');
                            }
                        })
                        ->whereRaw("CAST(COALESCE(NULLIF(TRIM(lo.lab_order_result), ''), '0') AS DECIMAL(12,2)) > 0")
                        ->whereRaw("CAST(COALESCE(NULLIF(TRIM(lo.lab_order_result), ''), '999') AS DECIMAL(12,2)) < ?", [$threshold]);
                });
            });

        return (int) $q->selectRaw('COUNT(DISTINCT o.vn) as aggregate')->value('aggregate');
    }

    private function applyIcdPrefixes($query, string $column, array $prefixes): void
    {
        foreach ($prefixes as $prefix) {
            $normalized = strtoupper(str_replace('.', '', trim($prefix)));
            if ($normalized === '') {
                continue;
            }
            // HOSxP มักเก็บ ICD แบบไม่มีจุด (J069) และแบบมีจุดปนกัน
            $query->orWhereRaw("REPLACE(UPPER({$column}), '.', '') LIKE ?", [$normalized.'%']);
        }
    }

    private function applyDrugSet(Builder $query, string $drugSet, string $alias = 'di'): void
    {
        if ($drugSet === 'antibiotic') {
            $col = config('rdu.drugs.antibiotic_column', 'antibiotic');
            $val = config('rdu.drugs.antibiotic_value', 'Y');
            $patterns = config('rdu.drugs.antibiotic_patterns', [
                'amox', 'ampi', 'cepha', 'cefurox', 'ceftri', 'cefix', 'cefotax', 'cefdinir',
                'cipro', 'norflox', 'oflox', 'levofl', 'moxiflox',
                'azithro', 'erythro', 'clarithro', 'clinda', 'metro',
                'co-trim', 'cotrim', 'bactrim', 'augmentin', 'penicillin', 'cloxacil',
                'doxy', 'tetracyc', 'gentamicin', 'amikacin', 'vancomy', 'meropenem',
                'imipenem', 'piperacil', 'tazo', 'nitrofur', 'fosfomy',
            ]);

            $query->where(function ($q) use ($alias, $col, $val, $patterns) {
                if ($this->columnExists(DB::connection('hosxp'), 'drugitems', $col)) {
                    $q->where("{$alias}.{$col}", $val);
                }
                foreach ($patterns as $p) {
                    $q->orWhere("{$alias}.name", 'like', "%{$p}%");
                }
            });

            return;
        }

        $patterns = match ($drugSet) {
            'nsaid' => config('rdu.drugs.nsaid_patterns', []),
            'long_acting_bz' => config('rdu.drugs.long_acting_bz_patterns', []),
            default => [],
        };

        $query->where(function ($q) use ($alias, $patterns) {
            foreach ($patterns as $p) {
                $q->orWhere("{$alias}.name", 'like', '%'.$p.'%');
            }
        });

        if ($drugSet === 'nsaid') {
            $excludes = config('rdu.drugs.nsaid_exclude_patterns', []);
            foreach ($excludes as $ex) {
                $query->where("{$alias}.name", 'not like', '%'.$ex.'%');
            }
        }
    }

    /** @param object|array $row */
    private function normalizeCaseRow($row, string $indicatorId): array
    {
        $r = (array) $row;

        return [
            'indicator_id' => $indicatorId,
            'vn' => $r['vn'] ?? null,
            'hn' => $r['hn'] ?? null,
            'vstdate' => $r['vstdate'] ?? null,
            'vsttime' => $r['vsttime'] ?? null,
            'patient_name' => trim((string) ($r['patient_name'] ?? '')),
            'age_y' => isset($r['age_y']) ? (int) $r['age_y'] : null,
            'sex' => $r['sex'] ?? null,
            'department_name' => $r['department_name'] ?? null,
            'specialty_name' => $r['specialty_name'] ?? null,
            'doctor_name' => trim((string) ($r['doctor_name'] ?? '')),
            'icd10_list' => $r['icd10_list'] ?? null,
            'drug_list' => $r['drug_list'] ?? null,
        ];
    }

    private function emptySummary(): array
    {
        return [
            'total_cases' => 0,
            'group_a_cases' => 0,
            'group_b_cases' => 0,
            'indicator_count' => count(config('rdu.indicators', [])),
            'worst_indicator' => null,
        ];
    }

    private function emptyIndicatorRow(array $indicator): array
    {
        return array_merge($indicator, [
            'denominator' => 0,
            'case_count' => 0,
            'rate' => null,
            'rate_label' => '—',
        ]);
    }

    private function tableExists($conn, string $table): bool
    {
        $key = 't:'.$table;
        if (! array_key_exists($key, $this->schema)) {
            try {
                $this->schema[$key] = $conn->getSchemaBuilder()->hasTable($table);
            } catch (\Throwable $e) {
                $this->schema[$key] = false;
            }
        }

        return $this->schema[$key];
    }

    private function columnExists($conn, string $table, string $column): bool
    {
        $key = "c:{$table}.{$column}";
        if (! array_key_exists($key, $this->schema)) {
            try {
                $this->schema[$key] = in_array($column, $conn->getSchemaBuilder()->getColumnListing($table), true);
            } catch (\Throwable $e) {
                $this->schema[$key] = false;
            }
        }

        return $this->schema[$key];
    }
}
