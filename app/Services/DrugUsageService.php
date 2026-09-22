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

    public const FORM_TOPICAL = 'topical';

    public const FORM_INJECTION = 'injection';

    public const FORM_EPIAO = 'epiao';

    public const FORM_EPREX = 'eprex';

    public const FORM_HAD = 'had';

    public const FORM_OTHER = 'other';

    /** @var array<string, bool> */
    private array $schema = [];

    public function __construct(private HosxpConnectionService $hosxp) {}

    /** @return array{connected: bool, database: ?string, message: string, checked_at: ?string, response_ms: ?int} */
    public function connectionStatus(): array
    {
        return $this->hosxp->check(false);
    }

    /**
     * 7 หมวดหมู่ตามสีในระบบ HOSxP:
     * สีดำ = ยาเม็ด
     * สีน้ำเงิน = ยาน้ำ
     * สีส้ม = ยาภายนอก
     * สีชมพู = ยาฉีด
     * สีเขียว = ยาฉีดห้องไต epiao
     * สีม่วง = ยาฉีดห้องไต eprex
     * สีแดง = ยา High Alert
     *
     * @return array<string, string>
     */
    public function formCatalog(): array
    {
        return [
            self::FORM_TABLET => 'ยาเม็ด',
            self::FORM_LIQUID => 'ยาน้ำ',
            self::FORM_TOPICAL => 'ยาภายนอก',
            self::FORM_INJECTION => 'ยาฉีด',
            self::FORM_EPIAO => 'ยาฉีดห้องไต epiao',
            self::FORM_EPREX => 'ยาฉีดห้องไต eprex',
            self::FORM_HAD => 'ยา High Alert',
        ];
    }

    /**
     * @return array{color_key: string, color_name: string, hex: string, badge: string, dot: string}
     */
    public function formColorInfo(string $form): array
    {
        return match ($form) {
            self::FORM_TABLET => [
                'color_key' => 'black',
                'color_name' => 'สีดำ',
                'hex' => '#18181b',
                'badge' => 'border-zinc-300 bg-zinc-100 text-zinc-900',
                'dot' => 'bg-zinc-900',
            ],
            self::FORM_LIQUID => [
                'color_key' => 'blue',
                'color_name' => 'สีน้ำเงิน',
                'hex' => '#2563eb',
                'badge' => 'border-blue-200 bg-blue-50 text-blue-700',
                'dot' => 'bg-blue-600',
            ],
            self::FORM_TOPICAL => [
                'color_key' => 'orange',
                'color_name' => 'สีส้ม',
                'hex' => '#ea580c',
                'badge' => 'border-orange-200 bg-orange-50 text-orange-700',
                'dot' => 'bg-orange-600',
            ],
            self::FORM_INJECTION => [
                'color_key' => 'pink',
                'color_name' => 'สีชมพู',
                'hex' => '#ec4899',
                'badge' => 'border-pink-200 bg-pink-50 text-pink-700',
                'dot' => 'bg-pink-500',
            ],
            self::FORM_EPIAO => [
                'color_key' => 'green',
                'color_name' => 'สีเขียว',
                'hex' => '#16a34a',
                'badge' => 'border-emerald-200 bg-emerald-50 text-emerald-700',
                'dot' => 'bg-emerald-600',
            ],
            self::FORM_EPREX => [
                'color_key' => 'purple',
                'color_name' => 'สีม่วง',
                'hex' => '#9333ea',
                'badge' => 'border-purple-200 bg-purple-50 text-purple-700',
                'dot' => 'bg-purple-600',
            ],
            self::FORM_HAD => [
                'color_key' => 'red',
                'color_name' => 'สีแดง',
                'hex' => '#dc2626',
                'badge' => 'border-red-200 bg-red-50 text-red-700',
                'dot' => 'bg-red-600',
            ],
            default => [
                'color_key' => 'slate',
                'color_name' => 'สีเทา',
                'hex' => '#64748b',
                'badge' => 'border-slate-200 bg-slate-50 text-slate-700',
                'dot' => 'bg-slate-500',
            ],
        };
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
            self::FORM_TOPICAL => [
                'tube' => 'หลอด',
                'patch' => 'Patch',
                'spray' => 'สเปรย์/พ่น',
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
            self::FORM_EPIAO => [
                'syringe' => 'เข็ม/Syringe',
                'vial' => 'Vial',
                'amp' => 'Amp',
                'other' => 'อื่นๆ',
            ],
            self::FORM_EPREX => [
                'syringe' => 'เข็ม/Syringe',
                'vial' => 'Vial',
                'amp' => 'Amp',
                'other' => 'อื่นๆ',
            ],
            self::FORM_HAD => [
                'amp' => 'Amp',
                'vial' => 'Vial',
                'tab' => 'Tab/เม็ด',
                'bottle' => 'ขวด',
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
            $allDrugs = $this->fetchDrugRows($conn, $startDate, $endDate)
                ->map(fn ($row) => $this->enrichRow($row));

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
                    $firstRow = $group->first();
                    $form = $firstRow->form ?? $this->classifyForm((string) $units);

                    return [
                        'units' => (string) $units,
                        'form' => $form,
                        'form_label' => $this->formLabel($form),
                        'sub_form' => $firstRow->sub_form ?? $this->classifySubForm((string) $units, $form),
                        'sub_form_label' => $firstRow->sub_form_label ?? $this->subFormLabel((string) $units, $form),
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
        ?string $account = null,
    ): array {
        @set_time_limit(120);

        $connection = $this->connectionStatus();
        if (! ($connection['connected'] ?? false)) {
            return [
                'rows' => [],
                'total' => 0,
                'units' => [],
                'by_form' => [],
                'by_account' => [],
                'by_account_code' => [],
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
            [$byAccount, $byAccountCode] = $this->buildByAccount($all, $totalQty, $totalAmount);

            $filtered = $this->filterByAccount($this->filterByForm($all, $form), $account)
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
                    'color_key' => $row->color_key ?? 'black',
                    'color_name' => $row->color_name ?? 'สีดำ',
                    'color_hex' => $row->color_hex ?? '#18181b',
                    'color_badge' => $row->color_badge ?? 'border-zinc-300 bg-zinc-100 text-zinc-900',
                    'color_dot' => $row->color_dot ?? 'bg-zinc-900',
                    'sub_form' => $row->sub_form,
                    'sub_form_label' => $row->sub_form_label,
                    'drugaccount' => $row->drugaccount ? trim((string) $row->drugaccount) : null,
                    'account' => $row->account ?? 'out',
                    'account_code' => $row->account_code ?? '(ว่าง)',
                    'account_label' => $row->account_label ?? 'ยานอกบัญชี',
                    'account_full_label' => $row->account_full_label ?? 'ยานอกบัญชี (ว่าง)',
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
                'by_account' => $byAccount,
                'by_account_code' => $byAccountCode,
                'form_catalog' => $this->formCatalog(),
            ];
        } catch (\Throwable $e) {
            Log::error('DrugUsageService::usageReport failed: '.$e->getMessage());

            return [
                'rows' => [],
                'total' => 0,
                'units' => [],
                'by_form' => [],
                'by_account' => [],
                'by_account_code' => [],
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
        ?string $account = null,
    ): Collection {
        @set_time_limit(180);

        $connection = $this->connectionStatus();
        if (! ($connection['connected'] ?? false)) {
            return collect();
        }

        try {
            $conn = DB::connection('hosxp');

            $all = $this->fetchDrugRows($conn, $startDate, $endDate, $search, $unit)
                ->map(fn ($row) => $this->enrichRow($row));

            return $this->filterByAccount($this->filterByForm($all, $form), $account)
                ->sortBy([['form_sort', 'asc'], ['sub_form_sort', 'asc'], ['units', 'asc'], ['name', 'asc']])
                ->values();
        } catch (\Throwable $e) {
            Log::error('DrugUsageService::exportRows failed: '.$e->getMessage());

            return collect();
        }
    }

    public function classifyForm(?string $units, ?object $row = null): string
    {
        $name = (string) ($row->name ?? '');
        $dosageform = mb_strtolower(trim((string) ($row->dosageform ?? '')));
        $u = mb_strtolower(trim((string) ($units ?? ($row->units ?? ''))));
        $color = isset($row->displaycolor) && $row->displaycolor !== null ? (int) $row->displaycolor : null;
        $alertLevel = (int) ($row->alert_level ?? 0);
        $generic = mb_strtolower(trim((string) ($row->generic_name ?? '')));

        // 1. สีแดง = ยา High Alert (color=255 หรือ alert_level > 0 หรือชื่อระบุ HAD)
        if ($color === 255 || $alertLevel > 0 || stripos($name, '(HAD)') !== false || stripos($name, 'high alert') !== false || stripos($generic, 'high alert') !== false) {
            return self::FORM_HAD;
        }

        // 2. สีเขียว = ยาฉีดห้องไต epiao (color=32768 หรือชื่อ/generic ระบุ epiao)
        if ($color === 32768 || stripos($name, 'epiao') !== false || stripos($generic, 'epiao') !== false) {
            return self::FORM_EPIAO;
        }

        // 3. สีม่วง = ยาฉีดห้องไต eprex (color=8388736 หรือชื่อ/generic ระบุ eprex)
        if ($color === 8388736 || stripos($name, 'eprex') !== false || stripos($generic, 'eprex') !== false) {
            return self::FORM_EPREX;
        }

        // 4. สีชมพู = ยาฉีด (color=16711935 หรือ dosageform/units บ่งบอกว่าเป็นยาฉีด)
        if (
            $color === 16711935 ||
            in_array($dosageform, ['injection', 'inj'], true) ||
            $this->matchesAny($u, ['inj', 'injection', 'amp', 'amphule', 'ampoule', 'ampule', 'vial', 'syring', 'syringe', 'prefilled', 'iu/ml'])
        ) {
            return self::FORM_INJECTION;
        }

        // 5. สีส้ม = ยาภายนอก (color=26367 หรือ dosageform/units บ่งบอกว่าเป็นยาภายนอก)
        if (
            $color === 26367 ||
            in_array($dosageform, ['cream', 'ointment', 'lotion', 'gel', 'eye drops', 'ear drops', 'nasal spray', 'inhalations powder', 'nebuliser solution', 'oral paste', 'eye gel', 'eye ointment'], true) ||
            $this->matchesAny($u, ['patch', 'pacth', 'cream', 'ointment', 'lotion', 'gel', 'spray', 'drop', 'gtt']) ||
            ($this->matchesAny($u, ['หลอด']) && $this->matchesAny($u, [' g.', ' g)', 'gram', 'กรัม', 'g']))
        ) {
            return self::FORM_TOPICAL;
        }

        // 6. สีน้ำเงิน = ยาน้ำ (color=16711680 หรือ dosageform/units บ่งบอกว่าเป็นยาน้ำ)
        if (
            $color === 16711680 ||
            in_array($dosageform, ['syrup', 'suspension', 'solution', 'irrigation solution', 'mouthwash', 'elixir'], true) ||
            $this->matchesAny($u, ['ขวด', 'syrup', 'susp', 'suspension', 'solution', 'elixir', 'ml', 'มล', 'cc', 'ซีซี', 'oral sol', 'oral suspension'])
        ) {
            return self::FORM_LIQUID;
        }

        // 7. สีดำ = ยาเม็ด (color=536870912 / tablet / capsule / tab / cap / หรือค่าเริ่มต้น)
        if (
            $color === 536870912 ||
            in_array($dosageform, ['tablet', 'capsule', 'cap', 'tab', 'powder'], true) ||
            $this->matchesAny($u, ['tab', 'tablet', 'เม็ด', 'cap', 'capsule', 'แคปซูล', 'แค็บซูล', 'แคบซูล', 'แคป', 'แค็บ', 'softgel', 'pill', 'sachet', 'ซอง', 'กระปุก', 'กล่อง'])
        ) {
            return self::FORM_TABLET;
        }

        // หากเป็นหลอด และไม่ได้เข้ากลุ่มภายนอก ให้เป็นยาฉีด
        if ($this->matchesAny($u, ['หลอด'])) {
            return self::FORM_INJECTION;
        }

        // Default to ยาเม็ด (สีดำ)
        return self::FORM_TABLET;
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
                'ml', 'มล', 'cc', 'ซีซี', 'ขวด', 'bottle', 'bott', 'syrup', 'susp', 'solution', 'elixir', 'liquid', 'oral sol',
            ],
            self::FORM_TOPICAL => [
                'patch', 'pacth', 'cream', 'ointment', 'lotion', 'gel', 'spray', 'drop', 'gtt',
            ],
            self::FORM_INJECTION => [
                'amp', 'amphule', 'ampoule', 'ampule', 'vial', 'syring', 'syringe',
                'unit', 'dose', 'pen', 'inj', 'injection', 'ฉีด', 'prefilled', 'iu/ml',
            ],
            self::FORM_EPIAO => [
                'epiao',
            ],
            self::FORM_EPREX => [
                'eprex',
            ],
            self::FORM_HAD => [
                'had', 'high alert',
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
            self::FORM_TOPICAL => [
                'patch' => ['patch', 'pacth'],
                'spray' => ['spray', 'สเปรย์', 'พ่น'],
                'tube' => ['หลอด'],
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
            self::FORM_EPIAO => [
                'syringe' => ['syring', 'syringe', 'เข็ม', 'prefilled'],
                'vial' => ['vial'],
                'amp' => ['amp'],
            ],
            self::FORM_EPREX => [
                'syringe' => ['syring', 'syringe', 'เข็ม', 'prefilled'],
                'vial' => ['vial'],
                'amp' => ['amp'],
            ],
            self::FORM_HAD => [
                'amp' => ['amp', 'amphule', 'ampoule', 'ampule'],
                'vial' => ['vial'],
                'tab' => ['tab', 'tablet', 'เม็ด', 'cap', 'capsule'],
                'bottle' => ['bottle', 'ขวด', 'ml', 'cc'],
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
            self::FORM_TOPICAL => 3,
            self::FORM_INJECTION => 4,
            self::FORM_EPIAO => 5,
            self::FORM_EPREX => 6,
            self::FORM_HAD => 7,
            default => 8,
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
        $form = $this->classifyForm($row->units ?? null, $row);
        $subForm = $this->classifySubForm($row->units ?? null, $form);
        $colorInfo = $this->formColorInfo($form);

        $row->form = $form;
        $row->form_label = $this->formLabel($form);
        $row->form_sort = $this->formSortOrder($form);
        $row->color_key = $colorInfo['color_key'];
        $row->color_name = $colorInfo['color_name'];
        $row->color_hex = $colorInfo['hex'];
        $row->color_badge = $colorInfo['badge'];
        $row->color_dot = $colorInfo['dot'];

        $row->sub_form = $subForm;
        $row->sub_form_label = $this->subFormLabel($row->units ?? null, $form, $subForm);
        $row->sub_form_sort = $this->subFormSortOrder($form, $subForm);

        $account = $this->classifyAccount($row->drugaccount ?? null);
        $accountCode = trim((string) ($row->drugaccount ?? ''));
        $isOut = $accountCode === '' || mb_strtoupper($accountCode) === 'NED';

        $row->account = $account;
        $row->account_code = $isOut ? '(ว่าง)' : $accountCode;
        $row->account_label = $this->accountLabel($account);
        $row->account_full_label = $isOut ? 'ยานอกบัญชี (ว่าง)' : "บัญชี {$accountCode}";

        return $row;
    }

    private function filterByForm(Collection $rows, ?string $form): Collection
    {
        if (! $form || $form === 'all' || ! isset($this->formCatalog()[$form])) {
            return $rows;
        }

        return $rows->filter(fn ($row) => ($row->form ?? null) === $form)->values();
    }

    private function filterByAccount(Collection $rows, ?string $account): Collection
    {
        if (! $account || $account === 'all') {
            return $rows;
        }

        if (in_array($account, ['in', 'out'], true)) {
            return $rows->filter(fn ($row) => ($row->account ?? $this->classifyAccount($row->drugaccount ?? null)) === $account)->values();
        }

        return $rows->filter(function ($row) use ($account) {
            $code = trim((string) ($row->drugaccount ?? ''));
            if ($account === '(ว่าง)' || $account === 'none') {
                return $code === '' || mb_strtoupper($code) === 'NED';
            }

            return mb_strtolower($code) === mb_strtolower($account);
        })->values();
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
        $form = $row->form ?? $this->classifyForm($row->units ?? null, $row);
        $subForm = $row->sub_form ?? $this->classifySubForm($row->units ?? null, $form);
        $colorInfo = $this->formColorInfo($form);

        return [
            'rank' => $rank,
            'icode' => $row->icode,
            'name' => $row->name,
            'strength' => $row->strength,
            'units' => $row->units,
            'form' => $form,
            'form_label' => $this->formLabel($form),
            'color_key' => $colorInfo['color_key'],
            'color_name' => $colorInfo['color_name'],
            'color_hex' => $colorInfo['hex'],
            'color_badge' => $colorInfo['badge'],
            'color_dot' => $colorInfo['dot'],
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
        $grouped = $allDrugs->groupBy(fn ($row) => $row->form ?? $this->classifyForm($row->units ?? null, $row));

        return collect($catalog)->map(function (string $label, string $key) use ($grouped, $totalQty, $totalAmount) {
            $group = $grouped->get($key, collect());
            $qty = (float) $group->sum('total_qty');
            $amount = (float) $group->sum('total_amount');
            $colorInfo = $this->formColorInfo($key);

            $subGrouped = $group->groupBy(fn ($row) => $row->sub_form ?? $this->classifySubForm($row->units ?? null, $key));
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
                'color_key' => $colorInfo['color_key'],
                'color_name' => $colorInfo['color_name'],
                'color_hex' => $colorInfo['hex'],
                'color_badge' => $colorInfo['badge'],
                'color_dot' => $colorInfo['dot'],
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
        $conn = DB::connection('hosxp');
        $q = $query
            ->selectRaw('o.icode as icode')
            ->selectRaw('MAX(d.name) as name')
            ->selectRaw('MAX(d.strength) as strength')
            ->selectRaw('MAX(d.units) as units')
            ->selectRaw('MAX(d.unitprice) as unitprice')
            ->selectRaw('COALESCE(SUM(o.qty), 0) as total_qty')
            ->selectRaw('COALESCE(SUM(o.sum_price), 0) as total_amount')
            ->selectRaw('COUNT(*) as line_count');

        if ($this->columnExists($conn, 'drugitems', 'displaycolor')) {
            $q->selectRaw('MAX(d.displaycolor) as displaycolor');
        } else {
            $q->selectRaw('NULL as displaycolor');
        }

        if ($this->columnExists($conn, 'drugitems', 'dosageform')) {
            $q->selectRaw('MAX(d.dosageform) as dosageform');
        } else {
            $q->selectRaw('NULL as dosageform');
        }

        if ($this->columnExists($conn, 'drugitems', 'alert_level')) {
            $q->selectRaw('MAX(d.alert_level) as alert_level');
        } else {
            $q->selectRaw('NULL as alert_level');
        }

        if ($this->columnExists($conn, 'drugitems', 'generic_name')) {
            $q->selectRaw('MAX(d.generic_name) as generic_name');
        } else {
            $q->selectRaw('NULL as generic_name');
        }

        if ($this->columnExists($conn, 'drugitems', 'drugaccount')) {
            $q->selectRaw('MAX(d.drugaccount) as drugaccount');
        } else {
            $q->selectRaw('NULL as drugaccount');
        }

        return $q->groupBy('o.icode');
    }

    private function columnExists($conn, string $table, string $column): bool
    {
        $key = "cols:{$table}";
        if (! array_key_exists($key, $this->schema)) {
            try {
                $rows = $conn->select("SHOW COLUMNS FROM `{$table}`");
                $this->schema[$key] = array_map(function ($r) {
                    $rowArray = (array) $r;

                    return mb_strtolower((string) ($rowArray['Field'] ?? $rowArray['field'] ?? ''));
                }, $rows);
            } catch (\Throwable $e) {
                $this->schema[$key] = [];
            }
        }

        return in_array(mb_strtolower($column), $this->schema[$key] ?? [], true);
    }

    /**
     * ยาในบัญชี = มีค่า drugaccount (ก ข ค ง จ1 จ2 ฯลฯ) ที่ไม่ใช่ NED
     * ยานอกบัญชี = null, ว่าง, หรือระบุ NED
     */
    public function classifyAccount(?string $drugaccount): string
    {
        $code = trim((string) $drugaccount);

        return ($code !== '' && mb_strtoupper($code) !== 'NED') ? 'in' : 'out';
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

                return ($code !== '' && mb_strtoupper($code) !== 'NED') ? $code : '(ว่าง)';
            })
            ->map(function (Collection $group, $code) use ($totalQty, $totalAmount) {
                $qty = (float) $group->sum('total_qty');
                $amount = (float) $group->sum('total_amount');
                $isOut = $code === '(ว่าง)';

                return [
                    'code' => (string) $code,
                    'label' => $isOut ? 'ยานอกบัญชี (ว่าง)' : 'บัญชี '.$code,
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
            'by_form' => collect($this->formCatalog())->map(function ($label, $key) {
                $colorInfo = $this->formColorInfo($key);

                return [
                    'form' => $key,
                    'label' => $label,
                    'color_key' => $colorInfo['color_key'],
                    'color_name' => $colorInfo['color_name'],
                    'color_hex' => $colorInfo['hex'],
                    'color_badge' => $colorInfo['badge'],
                    'color_dot' => $colorInfo['dot'],
                    'drug_count' => 0,
                    'total_qty' => 0,
                    'total_amount' => 0,
                    'qty_share_percent' => 0,
                    'amount_share_percent' => 0,
                    'subtypes' => [],
                ];
            })->values()->all(),
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
