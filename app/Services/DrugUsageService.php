<?php

namespace App\Services;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DrugUsageService
{
    public const FORM_TABLET = 'tablet';

    public const FORM_LIQUID = 'liquid';

    public const FORM_INJECTION = 'injection';

    public const FORM_TOPICAL = 'topical';

    public const FORM_OTHER = 'other';

    /** @var array<string, bool> */
    private array $schema = [];

    public function __construct(private HosxpConnectionService $hosxp) {}

    /** @return array{connected: bool, database: ?string, message: string, checked_at: ?string, response_ms: ?int} */
    public function connectionStatus(): array
    {
        return $this->hosxp->check(false);
    }

    /** @return array<string, string> */
    public function formCatalog(): array
    {
        return [
            self::FORM_TABLET => 'ยาเม็ด',
            self::FORM_LIQUID => 'ยาน้ำ',
            self::FORM_INJECTION => 'ยาฉีด',
            self::FORM_TOPICAL => 'ยาใช้ภายนอก',
            self::FORM_OTHER => 'อื่นๆ',
        ];
    }

    /** @return array<string, array<string, string>> */
    public function subFormCatalog(): array
    {
        return [
            self::FORM_TABLET => [
                'tab' => 'Tab',
                'capsule' => 'แคปซูล',
                'sachet' => 'Sachet',
                'jar' => 'กระปุก',
                'box' => 'กล่อง',
                'other' => 'อื่นๆ',
            ],
            self::FORM_LIQUID => [
                'bottle' => 'ขวด',
                'sachet' => 'ซอง',
                'other' => 'อื่นๆ',
            ],
            self::FORM_INJECTION => [
                'amp' => 'Amp',
                'vial' => 'Vial',
                'syringe' => 'Syringe',
                'tube' => 'หลอด',
                'unit' => 'Unit',
                'dose' => 'Dose',
                'pen' => 'Pen',
                'other' => 'อื่นๆ',
            ],
            self::FORM_TOPICAL => [
                'tube' => 'หลอด',
                'patch' => 'Patch',
                'other' => 'อื่นๆ',
            ],
            self::FORM_OTHER => [
                'other' => 'อื่นๆ',
            ],
        ];
    }

    /**
     * @return array{
     *   connection: array,
     *   summary: array,
     *   top_by_qty: array,
     *   top_by_amount: array,
     *   by_units: array,
     *   by_form: array,
     *   by_account: array,
     *   by_account_code: array,
     *   monthly_trend: array
     * }
     */
    public function dashboard(string $startDate, string $endDate): array
    {
        @set_time_limit(120);

        $connection = $this->connectionStatus();
        if (! ($connection['connected'] ?? false)) {
            return $this->emptyDashboard($connection);
        }

        try {
            $conn = DB::connection('hosxp');
            $allDrugs = $this->fetchDrugRows($conn, $startDate, $endDate);

            $totalQty = (float) $allDrugs->sum('total_qty');
            $totalAmount = (float) $allDrugs->sum('total_amount');
            $dispenseLines = (int) $allDrugs->sum('line_count');

            $mapDrugRow = function ($row, int $rank) use ($totalQty, $totalAmount): array {
                return $this->mapDrugRow($row, $rank, $totalQty, $totalAmount);
            };

            $topByQty = $allDrugs->sortByDesc('total_qty')->values()->take(15)
                ->map(fn ($row, $i) => $mapDrugRow($row, $i + 1))->all();

            $topByAmount = $allDrugs->sortByDesc('total_amount')->values()->take(15)
                ->map(fn ($row, $i) => $mapDrugRow($row, $i + 1))->all();

            $byUnits = $allDrugs
                ->groupBy('units')
                ->map(function (Collection $group, $units) use ($totalQty, $totalAmount) {
                    $qty = (float) $group->sum('total_qty');
                    $amount = (float) $group->sum('total_amount');

                    return [
                        'units' => (string) $units,
                        'form' => $this->classifyForm((string) $units),
                        'form_label' => $this->formLabel($this->classifyForm((string) $units)),
                        'sub_form' => $this->classifySubForm((string) $units),
                        'sub_form_label' => $this->subFormLabel((string) $units),
                        'drug_count' => $group->count(),
                        'total_qty' => $qty,
                        'total_amount' => $amount,
                        'qty_share_percent' => $totalQty > 0 ? round($qty / $totalQty * 100, 1) : 0,
                        'amount_share_percent' => $totalAmount > 0 ? round($amount / $totalAmount * 100, 1) : 0,
                    ];
                })
                ->sortByDesc('total_qty')
                ->values()
                ->all();

            $byForm = $this->buildByForm($allDrugs, $totalQty, $totalAmount);
            [$byAccount, $byAccountCode] = $this->buildByAccount($allDrugs, $totalQty, $totalAmount);

            $monthlyTrend = $this->baseUsageQuery($conn, $startDate, $endDate)
                ->selectRaw('YEAR(o.vstdate) as y')
                ->selectRaw('MONTH(o.vstdate) as m')
                ->selectRaw('COALESCE(SUM(o.qty), 0) as total_qty')
                ->selectRaw('COALESCE(SUM(o.sum_price), 0) as total_amount')
                ->selectRaw('COUNT(DISTINCT o.icode) as drug_count')
                ->groupByRaw('YEAR(o.vstdate), MONTH(o.vstdate)')
                ->orderByRaw('YEAR(o.vstdate), MONTH(o.vstdate)')
                ->get()
                ->map(fn ($row) => [
                    'period' => sprintf('%04d-%02d', $row->y, $row->m),
                    'label' => $this->thaiMonthLabel((int) $row->y, (int) $row->m),
                    'total_qty' => (float) $row->total_qty,
                    'total_amount' => (float) $row->total_amount,
                    'drug_count' => (int) $row->drug_count,
                ])
                ->values()
                ->all();

            return [
                'connection' => $connection,
                'summary' => [
                    'drug_count' => $allDrugs->count(),
                    'dispense_lines' => $dispenseLines,
                    'total_qty' => $totalQty,
                    'total_amount' => $totalAmount,
                ],
                'top_by_qty' => $topByQty,
                'top_by_amount' => $topByAmount,
                'by_units' => $byUnits,
                'by_form' => $byForm,
                'by_account' => $byAccount,
                'by_account_code' => $byAccountCode,
                'monthly_trend' => $monthlyTrend,
            ];
        } catch (\Throwable $e) {
            Log::error('DrugUsageService::dashboard failed: '.$e->getMessage());

            return $this->emptyDashboard($connection, $e->getMessage());
        }
    }

    /**
     * @return array{rows: array, total: int, units: array<string>, by_form: array, form_catalog: array}
     */
    public function usageReport(
        string $startDate,
        string $endDate,
        ?string $search = null,
        ?string $unit = null,
        ?string $form = null,
        int $page = 1,
        int $perPage = 50,
    ): array {
        @set_time_limit(120);

        $connection = $this->connectionStatus();
        if (! ($connection['connected'] ?? false)) {
            return [
                'rows' => [],
                'total' => 0,
                'units' => [],
                'by_form' => [],
                'form_catalog' => $this->formCatalog(),
                'error' => $connection['message'] ?? null,
            ];
        }

        try {
            $conn = DB::connection('hosxp');
            $all = $this->fetchDrugRows($conn, $startDate, $endDate, $search, $unit)
                ->map(fn ($row) => $this->enrichRow($row));

            $totalQty = (float) $all->sum('total_qty');
            $totalAmount = (float) $all->sum('total_amount');
            $byForm = $this->buildByForm($all, $totalQty, $totalAmount);

            $filtered = $this->filterByForm($all, $form)
                ->sortBy([['form_sort', 'asc'], ['sub_form_sort', 'asc'], ['units', 'asc'], ['name', 'asc']])
                ->values();

            $total = $filtered->count();
            $rows = $filtered
                ->slice(($page - 1) * $perPage, $perPage)
                ->values()
                ->map(fn ($row) => [
                    'icode' => $row->icode,
                    'name' => $row->name,
                    'strength' => $row->strength,
                    'units' => $row->units,
                    'form' => $row->form,
                    'form_label' => $row->form_label,
                    'sub_form' => $row->sub_form,
                    'sub_form_label' => $row->sub_form_label,
                    'unitprice' => (float) ($row->unitprice ?? 0),
                    'total_qty' => (float) ($row->total_qty ?? 0),
                    'total_amount' => (float) ($row->total_amount ?? 0),
                ])
                ->all();

            return [
                'rows' => $rows,
                'total' => $total,
                'units' => $this->availableUnits($conn),
                'by_form' => $byForm,
                'form_catalog' => $this->formCatalog(),
            ];
        } catch (\Throwable $e) {
            Log::error('DrugUsageService::usageReport failed: '.$e->getMessage());

            return [
                'rows' => [],
                'total' => 0,
                'units' => [],
                'by_form' => [],
                'form_catalog' => $this->formCatalog(),
                'error' => $e->getMessage(),
            ];
        }
    }

    /** @return Collection<int, object> */
    public function exportRows(
        string $startDate,
        string $endDate,
        ?string $search = null,
        ?string $unit = null,
        ?string $form = null,
    ): Collection {
        @set_time_limit(180);

        $connection = $this->connectionStatus();
        if (! ($connection['connected'] ?? false)) {
            return collect();
        }

        try {
            $conn = DB::connection('hosxp');

            return $this->filterByForm(
                $this->fetchDrugRows($conn, $startDate, $endDate, $search, $unit)
                    ->map(fn ($row) => $this->enrichRow($row)),
                $form
            )
                ->sortBy([['form_sort', 'asc'], ['sub_form_sort', 'asc'], ['units', 'asc'], ['name', 'asc']])
                ->values();
        } catch (\Throwable $e) {
            Log::error('DrugUsageService::exportRows failed: '.$e->getMessage());

            return collect();
        }
    }

    public function classifyForm(?string $units): string
    {
        $u = mb_strtolower(trim((string) $units));
        if ($u === '' || $u === '-') {
            return self::FORM_OTHER;
        }

        if ($this->matchesAny($u, ['patch', 'pacth'])) {
            return self::FORM_TOPICAL;
        }

        if ($this->matchesAny($u, ['หลอด']) && $this->matchesAny($u, [' g.', ' g)', 'gram', 'กรัม'])) {
            return self::FORM_TOPICAL;
        }

        foreach ($this->formPatterns()[self::FORM_INJECTION] as $pattern) {
            if (str_contains($u, $pattern)) {
                return self::FORM_INJECTION;
            }
        }

        foreach ($this->formPatterns()[self::FORM_LIQUID] as $pattern) {
            if (str_contains($u, $pattern)) {
                return self::FORM_LIQUID;
            }
        }

        if ($this->matchesAny($u, ['หลอด'])) {
            return self::FORM_INJECTION;
        }

        foreach ($this->formPatterns()[self::FORM_TABLET] as $pattern) {
            if (str_contains($u, $pattern)) {
                return self::FORM_TABLET;
            }
        }

        return self::FORM_OTHER;
    }

    public function classifySubForm(?string $units, ?string $form = null): string
    {
        $form = $form ?? $this->classifyForm($units);
        $u = mb_strtolower(trim((string) $units));

        if ($u === '' || $u === '-') {
            return 'other';
        }

        foreach ($this->subFormPatterns()[$form] ?? [] as $key => $patterns) {
            foreach ($patterns as $pattern) {
                if (str_contains($u, $pattern)) {
                    return $key;
                }
            }
        }

        return 'other';
    }

    public function subFormLabel(?string $units, ?string $form = null, ?string $subForm = null): string
    {
        $form = $form ?? $this->classifyForm($units);
        $subForm = $subForm ?? $this->classifySubForm($units, $form);

        return $this->subFormCatalog()[$form][$subForm] ?? 'อื่นๆ';
    }

    public function formLabel(string $form): string
    {
        return $this->formCatalog()[$form] ?? 'อื่นๆ';
    }

    private function matchesAny(string $value, array $patterns): bool
    {
        foreach ($patterns as $pattern) {
            if (str_contains($value, $pattern)) {
                return true;
            }
        }

        return false;
    }

    /** @return array<string, array<int, string>> */
    private function formPatterns(): array
    {
        return [
            self::FORM_TABLET => [
                'tab', 'tablet', 'เม็ด', 'cap', 'capsule', 'แคปซูล', 'แค็บซูล', 'แคบซูล', 'แคป', 'แค็บ',
                'softgel', 'pill', 'sachet', 'ซอง', 'กระปุก', 'กล่อง',
            ],
            self::FORM_LIQUID => [
                'ml', 'มล', 'cc', 'ซีซี', 'bottle', 'bott', 'ขวด', 'syrup', 'drop', 'gtt', 'หยด',
                'susp', 'solution', 'elixir', 'liquid', 'น้ำ', 'oral sol', 'mdi',
            ],
            self::FORM_INJECTION => [
                'amp', 'amphule', 'ampoule', 'ampule', 'vial', 'syring', 'syringe',
                'unit', 'dose', 'pen', 'inj', 'injection', 'ฉีด', 'prefilled', 'iv ', ' im', 'sc ', 'iu/ml',
            ],
        ];
    }

    /** @return array<string, array<string, array<int, string>>> */
    private function subFormPatterns(): array
    {
        return [
            self::FORM_TABLET => [
                'capsule' => ['capsule', 'แคปซูล', 'แค็บซูล', 'แคบซูล', 'cap', 'แคป', 'แค็บ', 'softgel'],
                'sachet' => ['sachet', 'ซอง'],
                'jar' => ['กระปุก'],
                'box' => ['กล่อง'],
                'tab' => ['tab', 'tablet', 'เม็ด', 'pill'],
            ],
            self::FORM_LIQUID => [
                'bottle' => ['bottle', 'bott', 'ขวด', 'ml', 'มล', 'cc', 'ซีซี', 'syrup', 'drop', 'gtt', 'หยด', 'susp', 'solution', 'elixir', 'liquid', 'น้ำ', 'mdi'],
                'sachet' => ['sachet', 'ซอง'],
            ],
            self::FORM_INJECTION => [
                'amp' => ['amp', 'amphule', 'ampoule', 'ampule'],
                'vial' => ['vial'],
                'syringe' => ['syring', 'syringe'],
                'tube' => ['หลอด'],
                'unit' => ['unit'],
                'dose' => ['dose'],
                'pen' => ['pen'],
            ],
            self::FORM_TOPICAL => [
                'patch' => ['patch', 'pacth'],
                'tube' => ['หลอด'],
            ],
            self::FORM_OTHER => [
                'other' => [],
            ],
        ];
    }

    private function formSortOrder(string $form): int
    {
        return match ($form) {
            self::FORM_TABLET => 1,
            self::FORM_LIQUID => 2,
            self::FORM_INJECTION => 3,
            self::FORM_TOPICAL => 4,
            default => 5,
        };
    }

    private function subFormSortOrder(string $form, string $subForm): int
    {
        $order = array_keys($this->subFormCatalog()[$form] ?? ['other' => 'อื่นๆ']);
        $index = array_search($subForm, $order, true);

        return $index === false ? 99 : $index + 1;
    }

    private function enrichRow(object $row): object
    {
        $form = $this->classifyForm($row->units ?? null);
        $subForm = $this->classifySubForm($row->units ?? null, $form);
        $row->form = $form;
        $row->form_label = $this->formLabel($form);
        $row->form_sort = $this->formSortOrder($form);
        $row->sub_form = $subForm;
        $row->sub_form_label = $this->subFormLabel($row->units ?? null, $form, $subForm);
        $row->sub_form_sort = $this->subFormSortOrder($form, $subForm);

        return $row;
    }

    private function filterByForm(Collection $rows, ?string $form): Collection
    {
        if (! $form || $form === 'all' || ! isset($this->formCatalog()[$form])) {
            return $rows;
        }

        return $rows->filter(fn ($row) => ($row->form ?? null) === $form)->values();
    }

    /** @return Collection<int, object> */
    private function fetchDrugRows(
        $conn,
        string $startDate,
        string $endDate,
        ?string $search = null,
        ?string $unit = null,
    ): Collection {
        $base = $this->applyReportFilters(
            $this->baseUsageQuery($conn, $startDate, $endDate),
            $search,
            $unit,
        );

        return $this->groupedDrugSelect($base)->get();
    }

    private function mapDrugRow(object $row, int $rank, float $totalQty, float $totalAmount): array
    {
        $qty = (float) ($row->total_qty ?? 0);
        $amount = (float) ($row->total_amount ?? 0);
        $form = $this->classifyForm($row->units ?? null);
        $subForm = $this->classifySubForm($row->units ?? null, $form);

        return [
            'rank' => $rank,
            'icode' => $row->icode,
            'name' => $row->name,
            'strength' => $row->strength,
            'units' => $row->units,
            'form' => $form,
            'form_label' => $this->formLabel($form),
            'sub_form' => $subForm,
            'sub_form_label' => $this->subFormLabel($row->units ?? null, $form, $subForm),
            'unitprice' => (float) ($row->unitprice ?? 0),
            'total_qty' => $qty,
            'total_amount' => $amount,
            'qty_share_percent' => $totalQty > 0 ? round($qty / $totalQty * 100, 1) : 0,
            'amount_share_percent' => $totalAmount > 0 ? round($amount / $totalAmount * 100, 1) : 0,
        ];
    }

    /** @return array<int, array<string, mixed>> */
    private function buildByForm(Collection $allDrugs, float $totalQty, float $totalAmount): array
    {
        $catalog = $this->formCatalog();
        $grouped = $allDrugs->groupBy(fn ($row) => $this->classifyForm($row->units ?? null));

        return collect($catalog)->map(function (string $label, string $key) use ($grouped, $totalQty, $totalAmount) {
            $group = $grouped->get($key, collect());
            $qty = (float) $group->sum('total_qty');
            $amount = (float) $group->sum('total_amount');

            $subGrouped = $group->groupBy(fn ($row) => $this->classifySubForm($row->units ?? null, $key));
            $subCatalog = $this->subFormCatalog()[$key] ?? ['other' => 'อื่นๆ'];

            $subtypes = collect($subCatalog)->map(function (string $subLabel, string $subKey) use ($subGrouped, $qty, $amount) {
                $subGroup = $subGrouped->get($subKey, collect());
                $subQty = (float) $subGroup->sum('total_qty');
                $subAmount = (float) $subGroup->sum('total_amount');

                return [
                    'sub_form' => $subKey,
                    'label' => $subLabel,
                    'drug_count' => $subGroup->count(),
                    'total_qty' => $subQty,
                    'total_amount' => $subAmount,
                    'qty_share_percent' => $qty > 0 ? round($subQty / $qty * 100, 1) : 0,
                    'amount_share_percent' => $amount > 0 ? round($subAmount / $amount * 100, 1) : 0,
                ];
            })->filter(fn ($item) => $item['drug_count'] > 0 || $item['total_qty'] > 0)->values()->all();

            return [
                'form' => $key,
                'label' => $label,
                'drug_count' => $group->count(),
                'total_qty' => $qty,
                'total_amount' => $amount,
                'qty_share_percent' => $totalQty > 0 ? round($qty / $totalQty * 100, 1) : 0,
                'amount_share_percent' => $totalAmount > 0 ? round($amount / $totalAmount * 100, 1) : 0,
                'subtypes' => $subtypes,
            ];
        })->values()->all();
    }

    private function baseUsageQuery($conn, string $startDate, string $endDate): Builder
    {
        return $conn->table('opitemrece as o')
            ->join('drugitems as d', 'd.icode', '=', 'o.icode')
            ->whereBetween('o.vstdate', [$startDate, $endDate])
            ->where('d.units', '<>', '-');
    }

    private function groupedDrugSelect(Builder $query): Builder
    {
        $q = $query
            ->selectRaw('o.icode as icode')
            ->selectRaw('MAX(d.name) as name')
            ->selectRaw('MAX(d.strength) as strength')
            ->selectRaw('MAX(d.units) as units')
            ->selectRaw('MAX(d.unitprice) as unitprice')
            ->selectRaw('COALESCE(SUM(o.qty), 0) as total_qty')
            ->selectRaw('COALESCE(SUM(o.sum_price), 0) as total_amount')
            ->selectRaw('COUNT(*) as line_count');

        if ($this->columnExists(DB::connection('hosxp'), 'drugitems', 'drugaccount')) {
            $q->selectRaw('MAX(d.drugaccount) as drugaccount');
        } else {
            $q->selectRaw('NULL as drugaccount');
        }

        return $q->groupBy('o.icode');
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

    /**
     * ยาในบัญชี = มีค่า drugaccount (ก ข ค ง จ1 จ2 ฯลฯ)
     * ยานอกบัญชี = null หรือว่าง
     */
    public function classifyAccount(?string $drugaccount): string
    {
        $code = trim((string) $drugaccount);

        return $code !== '' ? 'in' : 'out';
    }

    public function accountLabel(string $key): string
    {
        return match ($key) {
            'in' => 'ยาในบัญชี',
            'out' => 'ยานอกบัญชี',
            default => 'ไม่ระบุ',
        };
    }

    /**
     * @return array{0: array<int, array<string, mixed>>, 1: array<int, array<string, mixed>>}
     */
    private function buildByAccount(Collection $allDrugs, float $totalQty, float $totalAmount): array
    {
        $grouped = $allDrugs->groupBy(fn ($row) => $this->classifyAccount($row->drugaccount ?? null));

        $byAccount = collect(['in', 'out'])->map(function (string $key) use ($grouped, $totalQty, $totalAmount) {
            $group = $grouped->get($key, collect());
            $qty = (float) $group->sum('total_qty');
            $amount = (float) $group->sum('total_amount');

            return [
                'key' => $key,
                'label' => $this->accountLabel($key),
                'drug_count' => $group->count(),
                'total_qty' => $qty,
                'total_amount' => $amount,
                'qty_share_percent' => $totalQty > 0 ? round($qty / $totalQty * 100, 1) : 0,
                'amount_share_percent' => $totalAmount > 0 ? round($amount / $totalAmount * 100, 1) : 0,
            ];
        })->values()->all();

        $byAccountCode = $allDrugs
            ->groupBy(function ($row) {
                $code = trim((string) ($row->drugaccount ?? ''));

                return $code !== '' ? $code : '(ว่าง)';
            })
            ->map(function (Collection $group, $code) use ($totalQty, $totalAmount) {
                $qty = (float) $group->sum('total_qty');
                $amount = (float) $group->sum('total_amount');
                $isOut = $code === '(ว่าง)';

                return [
                    'code' => (string) $code,
                    'label' => $isOut ? 'นอกบัญชี (ว่าง)' : 'บัญชี '.$code,
                    'account' => $isOut ? 'out' : 'in',
                    'drug_count' => $group->count(),
                    'total_qty' => $qty,
                    'total_amount' => $amount,
                    'qty_share_percent' => $totalQty > 0 ? round($qty / $totalQty * 100, 1) : 0,
                    'amount_share_percent' => $totalAmount > 0 ? round($amount / $totalAmount * 100, 1) : 0,
                ];
            })
            ->sortByDesc('total_qty')
            ->values()
            ->all();

        return [$byAccount, $byAccountCode];
    }

    private function applyReportFilters(Builder $query, ?string $search, ?string $unit): Builder
    {
        if ($search) {
            $query->where('d.name', 'like', '%'.$search.'%');
        }

        if ($unit && $unit !== 'all') {
            $query->where('d.units', $unit);
        }

        return $query;
    }

    /** @return array<int, string> */
    private function availableUnits($conn): array
    {
        try {
            return $conn->table('drugitems')
                ->where('units', '<>', '-')
                ->whereNotNull('units')
                ->distinct()
                ->orderBy('units')
                ->limit(200)
                ->pluck('units')
                ->filter()
                ->values()
                ->all();
        } catch (\Throwable $e) {
            return [];
        }
    }

    private function thaiMonthLabel(int $year, int $month): string
    {
        $months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

        return $months[$month - 1].' '.($year + 543);
    }

    private function emptyDashboard(array $connection, ?string $error = null): array
    {
        return [
            'connection' => $connection,
            'summary' => [
                'drug_count' => 0,
                'dispense_lines' => 0,
                'total_qty' => 0,
                'total_amount' => 0,
            ],
            'top_by_qty' => [],
            'top_by_amount' => [],
            'by_units' => [],
            'by_form' => collect($this->formCatalog())->map(fn ($label, $key) => [
                'form' => $key,
                'label' => $label,
                'drug_count' => 0,
                'total_qty' => 0,
                'total_amount' => 0,
                'qty_share_percent' => 0,
                'amount_share_percent' => 0,
                'subtypes' => [],
            ])->values()->all(),
            'by_account' => [
                ['key' => 'in', 'label' => 'ยาในบัญชี', 'drug_count' => 0, 'total_qty' => 0, 'total_amount' => 0, 'qty_share_percent' => 0, 'amount_share_percent' => 0],
                ['key' => 'out', 'label' => 'ยานอกบัญชี', 'drug_count' => 0, 'total_qty' => 0, 'total_amount' => 0, 'qty_share_percent' => 0, 'amount_share_percent' => 0],
            ],
            'by_account_code' => [],
            'monthly_trend' => [],
            'error' => $error,
        ];
    }
}
