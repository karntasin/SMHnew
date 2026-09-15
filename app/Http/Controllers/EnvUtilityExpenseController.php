<?php

namespace App\Http\Controllers;

use App\Models\EnvUtilityExpenseCategory;
use App\Models\EnvUtilityExpenseEntry;
use App\Services\Env\EnvUtilityExpenseImportService;
use App\Services\ThaiPdfService;
use App\Support\ThaiFiscalPeriod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class EnvUtilityExpenseController extends Controller
{
    public function index(Request $request, EnvUtilityExpenseImportService $import): Response
    {
        $import->ensureCategories();
        $fiscalYear = (int) ($request->query('fiscal_year') ?: ThaiFiscalPeriod::currentFiscalYearBe());
        $publicCategories = $this->publicCategories();

        $entries = EnvUtilityExpenseEntry::query()
            ->where('fiscal_year_be', $fiscalYear)
            ->whereIn('category_id', $publicCategories->pluck('id'))
            ->get();

        $months = ThaiFiscalPeriod::monthsInFiscalYear($fiscalYear);

        $byCategory = $publicCategories->map(function (EnvUtilityExpenseCategory $cat) use ($entries, $months) {
            $rows = $entries->where('category_id', $cat->id);
            $invoice = (float) $rows->sum(fn ($e) => (float) ($e->invoice_amount ?? 0));
            $medical = (float) $rows->sum(fn ($e) => (float) ($e->budget_medical ?? 0));
            $revenue = (float) $rows->sum(fn ($e) => (float) ($e->budget_revenue ?? 0));
            $admin = (float) $rows->sum(fn ($e) => (float) ($e->budget_admin ?? 0));
            $total = $this->entryTotal($rows);
            $latestMonth = $this->latestMonthWithData($rows, $months);

            return [
                'id' => $cat->id,
                'code' => $cat->code,
                'name' => $cat->name,
                'invoice' => $invoice,
                'medical' => $medical,
                'revenue' => $revenue,
                'admin' => $admin,
                'total' => $total,
                'rows' => $rows->count(),
                'latest_month' => $latestMonth,
            ];
        })->values();
        $monthly = collect($months)->map(function (array $m) use ($entries) {
            $rows = $entries->filter(fn ($e) => (int) $e->year_be === $m['year_be'] && (int) $e->month === $m['month']);

            return [
                'label' => $m['label'],
                'year_be' => $m['year_be'],
                'month' => $m['month'],
                'total' => $this->entryTotal($rows),
                'medical' => (float) $rows->sum(fn ($e) => (float) ($e->budget_medical ?? 0)),
                'revenue' => (float) $rows->sum(fn ($e) => (float) ($e->budget_revenue ?? 0)),
                'admin' => (float) $rows->sum(fn ($e) => (float) ($e->budget_admin ?? 0)),
            ];
        })->values();

        return Inertia::render('Env/Utilities/Index', [
            'fiscalYear' => $fiscalYear,
            'fiscalYears' => $this->availableFiscalYears(),
            'summary' => [
                'total' => (float) $byCategory->sum('total'),
                'medical' => (float) $byCategory->sum('medical'),
                'revenue' => (float) $byCategory->sum('revenue'),
                'admin' => (float) $byCategory->sum('admin'),
                'invoice' => (float) $byCategory->sum('invoice'),
                'category_count' => $publicCategories->count(),
            ],
            'byCategory' => $byCategory,
            'monthly' => $monthly,
            'sp3Unlocked' => $this->sp3Unlocked($request),
        ]);
    }

    public function category(Request $request, string $code): Response|RedirectResponse
    {
        if ($code === 'sp3') {
            return redirect()->route('env.utilities.sp3');
        }

        $category = EnvUtilityExpenseCategory::query()->where('code', $code)->firstOrFail();
        if ($category->is_sensitive) {
            abort(403);
        }

        $fiscalYear = (int) ($request->query('fiscal_year') ?: ThaiFiscalPeriod::currentFiscalYearBe());
        $months = ThaiFiscalPeriod::monthsInFiscalYear($fiscalYear);

        $entries = EnvUtilityExpenseEntry::query()
            ->where('category_id', $category->id)
            ->where('fiscal_year_be', $fiscalYear)
            ->when($category->code === 'ac_meter', function ($q) {
                // ไม่ดึงข้อมูลปี พ.ศ. 2568 ของมิเตอร์แอร์
                $q->where('year_be', '!=', 2568);
            })
            ->orderBy('year_be')
            ->orderBy('month')
            ->orderBy('id')
            ->get()
            ->map(fn (EnvUtilityExpenseEntry $e) => $this->serializeEntry($e));

        $monthly = collect($months)->map(function (array $m) use ($entries) {
            $rows = $entries->filter(fn ($e) => (int) $e['year_be'] === $m['year_be'] && (int) $e['month'] === $m['month']);

            return [
                'label' => $m['label'],
                'year_be' => $m['year_be'],
                'month' => $m['month'],
                'total' => (float) $rows->sum('display_total'),
                'units' => (float) $rows->sum(fn ($e) => (float) ($e['units'] ?? 0)),
                'invoice' => (float) $rows->sum(fn ($e) => (float) ($e['invoice_amount'] ?? 0)),
                'medical' => (float) $rows->sum(fn ($e) => (float) ($e['budget_medical'] ?? 0)),
                'revenue' => (float) $rows->sum(fn ($e) => (float) ($e['budget_revenue'] ?? 0)),
                'admin' => (float) $rows->sum(fn ($e) => (float) ($e['budget_admin'] ?? 0)),
            ];
        })->values();

        $meterReport = $category->code === 'ac_meter'
            ? $this->buildAcMeterReport($entries, $months)
            : null;

        $ledger = $category->code !== 'ac_meter'
            ? $this->buildCategoryLedger($entries, $months, $category)
            : null;

        $acMeterNames = [];
        $acCarryEntries = [];
        if ($category->code === 'ac_meter') {
            $acMeterNames = EnvUtilityExpenseEntry::query()
                ->where('category_id', $category->id)
                ->where('year_be', '!=', 2568)
                ->whereNotNull('line_label')
                ->where('line_label', '!=', '')
                ->pluck('line_label')
                ->map(fn ($n) => trim((string) $n))
                ->filter()
                ->unique()
                ->sort()
                ->values()
                ->all();

            // ไม่ใช้ข้อมูลปี 68 เป็นค่าพกพาเดือนก่อน
            $acCarryEntries = [];
        }

        return Inertia::render('Env/Utilities/Category', [
            'fiscalYear' => $fiscalYear,
            'fiscalYears' => $this->availableFiscalYears(),
            'category' => $this->serializeCategory($category),
            'categories' => $this->publicCategories()->map(fn ($c) => $this->serializeCategory($c))->values(),
            'entries' => $entries->values(),
            'monthly' => $monthly,
            'months' => $months,
            'meterReport' => $meterReport,
            'ledger' => $ledger,
            'defaultAcRate' => (float) config('env_utility.default_ac_rate', 4.45),
            'acMeterNames' => $acMeterNames,
            'acCarryEntries' => $acCarryEntries,
        ]);
    }

    public function storeAcMeterBatch(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'category_id' => ['required', 'exists:env_utility_expense_categories,id'],
            'year_be' => ['required', 'integer', 'min:2500', 'max:2700'],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
            'rows' => ['required', 'array', 'min:1'],
            'rows.*.line_label' => ['required', 'string', 'max:191'],
            'rows.*.prev_reading' => ['nullable', 'numeric'],
            'rows.*.curr_reading' => ['nullable', 'numeric'],
            'rows.*.rate' => ['nullable', 'numeric'],
            'rows.*.note' => ['nullable', 'string', 'max:2000'],
        ]);

        $category = EnvUtilityExpenseCategory::findOrFail($data['category_id']);
        if ($category->code !== 'ac_meter') {
            return back()->with('error', 'ใช้ได้เฉพาะหมวดมิเตอร์แอร์');
        }
        if ($category->is_sensitive && ! $this->sp3Unlocked($request)) {
            return back()->with('error', 'ต้องปลดล็อก สป.3 ก่อนบันทึก');
        }

        $defaultRate = (float) config('env_utility.default_ac_rate', 4.45);
        $fiscal = ThaiFiscalPeriod::fiscalYearBe((int) $data['year_be'], (int) $data['month']);
        $saved = 0;

        foreach ($data['rows'] as $row) {
            $label = trim((string) $row['line_label']);
            if ($label === '') {
                continue;
            }

            $prev = array_key_exists('prev_reading', $row) && $row['prev_reading'] !== null && $row['prev_reading'] !== ''
                ? (float) $row['prev_reading']
                : null;
            $curr = array_key_exists('curr_reading', $row) && $row['curr_reading'] !== null && $row['curr_reading'] !== ''
                ? (float) $row['curr_reading']
                : null;

            if ($curr === null) {
                continue;
            }

            $rate = array_key_exists('rate', $row) && $row['rate'] !== null && $row['rate'] !== ''
                ? (float) $row['rate']
                : $defaultRate;
            $units = $prev !== null ? round($curr - $prev, 2) : null;
            $cost = $units !== null ? round($units * $rate, 2) : null;
            $note = $this->composeAcMeterNote($prev, $curr, $units, $rate, $row['note'] ?? null);

            EnvUtilityExpenseEntry::updateOrCreate(
                [
                    'category_id' => $category->id,
                    'year_be' => $data['year_be'],
                    'month' => $data['month'],
                    'line_label' => $label,
                ],
                [
                    'fiscal_year_be' => $fiscal,
                    'invoice_amount' => null,
                    'budget_medical' => null,
                    'budget_revenue' => $cost,
                    'budget_admin' => null,
                    'amount' => $cost,
                    'note' => $note,
                    'recorded_by' => $request->user()?->id,
                ]
            );
            $saved++;
        }

        if ($saved === 0) {
            return back()->with('error', 'กรุณากรอกเลขมิเตอร์เดือนใหม่อย่างน้อย 1 รายการ');
        }

        return back()->with('success', "บันทึกมิเตอร์แอร์ {$saved} รายการแล้ว");
    }

    public function storeEntry(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'category_id' => ['required', 'exists:env_utility_expense_categories,id'],
            'year_be' => ['required', 'integer', 'min:2500', 'max:2700'],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
            'invoice_amount' => ['nullable', 'numeric'],
            'budget_medical' => ['nullable', 'numeric'],
            'budget_revenue' => ['nullable', 'numeric'],
            'budget_admin' => ['nullable', 'numeric'],
            'amount' => ['nullable', 'numeric'],
            'line_label' => ['nullable', 'string', 'max:191'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        $category = EnvUtilityExpenseCategory::findOrFail($data['category_id']);
        if ($category->is_sensitive && ! $this->sp3Unlocked($request)) {
            return back()->with('error', 'ต้องปลดล็อก สป.3 ก่อนบันทึก');
        }

        $lineLabel = (string) ($data['line_label'] ?? '');
        $fiscal = ThaiFiscalPeriod::fiscalYearBe((int) $data['year_be'], (int) $data['month']);

        EnvUtilityExpenseEntry::updateOrCreate(
            [
                'category_id' => $category->id,
                'year_be' => $data['year_be'],
                'month' => $data['month'],
                'line_label' => $lineLabel,
            ],
            [
                'fiscal_year_be' => $fiscal,
                'invoice_amount' => $data['invoice_amount'] ?? null,
                'budget_medical' => $data['budget_medical'] ?? null,
                'budget_revenue' => $data['budget_revenue'] ?? null,
                'budget_admin' => $data['budget_admin'] ?? null,
                'amount' => $data['amount'] ?? null,
                'note' => $data['note'] ?? null,
                'recorded_by' => $request->user()?->id,
            ]
        );

        return back()->with('success', 'บันทึกค่าใช้จ่ายแล้ว');
    }

    public function destroyEntry(Request $request, EnvUtilityExpenseEntry $entry): RedirectResponse
    {
        $entry->load('category');
        if ($entry->category?->is_sensitive && ! $this->sp3Unlocked($request)) {
            return back()->with('error', 'ต้องปลดล็อก สป.3 ก่อนลบ');
        }
        $entry->delete();

        return back()->with('success', 'ลบรายการแล้ว');
    }

    public function sp3(Request $request): Response
    {
        $unlocked = $this->sp3Unlocked($request);
        $fiscalYear = (int) ($request->query('fiscal_year') ?: ThaiFiscalPeriod::currentFiscalYearBe());
        $category = EnvUtilityExpenseCategory::query()->where('code', 'sp3')->first();

        $payload = [
            'unlocked' => $unlocked,
            'fiscalYear' => $fiscalYear,
            'fiscalYears' => $this->availableFiscalYears(),
            'category' => $category ? $this->serializeCategory($category) : null,
            'entries' => [],
            'monthly' => [],
            'summary' => ['total' => 0, 'revenue' => 0, 'medical' => 0],
        ];

        if ($unlocked && $category) {
            $entries = EnvUtilityExpenseEntry::query()
                ->where('category_id', $category->id)
                ->where('fiscal_year_be', $fiscalYear)
                ->orderBy('year_be')
                ->orderBy('month')
                ->get()
                ->map(fn ($e) => $this->serializeEntry($e));

            $months = ThaiFiscalPeriod::monthsInFiscalYear($fiscalYear);
            $monthly = collect($months)->map(function (array $m) use ($entries) {
                $rows = $entries->filter(fn ($e) => (int) $e['year_be'] === $m['year_be'] && (int) $e['month'] === $m['month']);

                return [
                    'label' => $m['label'],
                    'total' => (float) $rows->sum('display_total'),
                    'revenue' => (float) $rows->sum(fn ($e) => (float) ($e['budget_revenue'] ?? 0)),
                    'medical' => (float) $rows->sum(fn ($e) => (float) ($e['budget_medical'] ?? 0)),
                ];
            })->values();

            $payload['entries'] = $entries->values();
            $payload['monthly'] = $monthly;
            $payload['ledger'] = $this->buildCategoryLedger($entries, $months, $category);
            $payload['summary'] = [
                'total' => (float) $entries->sum('display_total'),
                'revenue' => (float) $entries->sum(fn ($e) => (float) ($e['budget_revenue'] ?? 0)),
                'medical' => (float) $entries->sum(fn ($e) => (float) ($e['budget_medical'] ?? 0)),
            ];
            $payload['months'] = $months;
        }

        return Inertia::render('Env/Utilities/Sp3', $payload);
    }

    public function unlockSp3(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string'],
        ]);

        $expected = (string) config('env_utility.sp3_access_code', '999999999');
        if (! hash_equals($expected, $data['code'])) {
            return back()->with('error', 'รหัสไม่ถูกต้อง');
        }

        $request->session()->put(config('env_utility.sp3_session_key'), true);

        return redirect()->route('env.utilities.sp3')->with('success', 'ปลดล็อก สป.3 แล้ว');
    }

    public function lockSp3(Request $request): RedirectResponse
    {
        $request->session()->forget(config('env_utility.sp3_session_key'));

        return redirect()->route('env.utilities.sp3')->with('success', 'ล็อก สป.3 แล้ว');
    }

    public function acPdf(Request $request, ThaiPdfService $pdf): HttpResponse
    {
        $fiscalYear = (int) ($request->query('fiscal_year') ?: ThaiFiscalPeriod::currentFiscalYearBe());
        $category = EnvUtilityExpenseCategory::query()->where('code', 'ac_meter')->firstOrFail();
        $months = ThaiFiscalPeriod::monthsInFiscalYear($fiscalYear);

        $entries = EnvUtilityExpenseEntry::query()
            ->where('category_id', $category->id)
            ->where('fiscal_year_be', $fiscalYear)
            ->where('year_be', '!=', 2568)
            ->orderBy('year_be')
            ->orderBy('month')
            ->get()
            ->map(fn (EnvUtilityExpenseEntry $e) => $this->serializeEntry($e));

        $report = $this->buildAcMeterReport($entries, $months);

        $monthKey = $request->query('month');
        if (is_string($monthKey) && $monthKey !== '') {
            $report['periods'] = array_values(array_filter(
                $report['periods'],
                fn ($p) => $p['key'] === $monthKey
            ));
        } else {
            $report['periods'] = array_values(array_filter(
                $report['periods'],
                fn ($p) => ! empty($p['has_data'])
            ));
        }

        [$fontRegularUri, $fontBoldUri] = $pdf->fontUris();

        $html = view('env.utilities-ac-meter-pdf', [
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
            'hospitalName' => config('department_data.hospital_name', config('app.name', 'โรงพยาบาล')),
            'fiscalYear' => $fiscalYear,
            'report' => $report,
            'generatedAt' => now()->format('d/m/Y H:i'),
            'generatedDate' => now()->format('d/m/Y'),
        ])->render();

        $orientation = (is_string($monthKey) && $monthKey !== '') ? 'portrait' : 'landscape';

        return response($pdf->render($html, $orientation), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="env-ac-meters-'.$fiscalYear.'.pdf"',
        ]);
    }

    public function pdf(Request $request, ThaiPdfService $pdf): HttpResponse
    {
        $fiscalYear = (int) ($request->query('fiscal_year') ?: ThaiFiscalPeriod::currentFiscalYearBe());
        $publicCategories = $this->publicCategories();
        $months = ThaiFiscalPeriod::monthsInFiscalYear($fiscalYear);
        $entries = EnvUtilityExpenseEntry::query()
            ->where('fiscal_year_be', $fiscalYear)
            ->whereIn('category_id', $publicCategories->pluck('id'))
            ->get();

        $groups = [];
        foreach ($publicCategories as $cat) {
            if ($cat->code === 'ac_meter') {
                continue;
            }
            $rows = $entries->where('category_id', $cat->id);
            if ($rows->isEmpty()) {
                continue;
            }
            $serialized = $rows->map(fn (EnvUtilityExpenseEntry $e) => $this->serializeEntry($e))->values();
            $ledger = $this->buildCategoryLedger($serialized, $months, $cat);
            $groups[] = [
                'name' => $cat->name,
                'code' => $cat->code,
                'has_invoice' => (bool) $cat->has_invoice,
                'has_medical' => (bool) $cat->has_medical,
                'has_revenue' => (bool) $cat->has_revenue,
                'has_admin' => (bool) $cat->has_admin,
                'has_line_items' => (bool) $cat->has_line_items,
                'total' => $ledger['grand_totals']['display_total'],
                'ledger' => $ledger,
            ];
        }

        [$fontRegularUri, $fontBoldUri] = $pdf->fontUris();
        $html = view('env.utilities-expense-pdf', [
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
            'hospitalName' => config('department_data.hospital_name', config('app.name', 'โรงพยาบาล')),
            'fiscalYear' => $fiscalYear,
            'groups' => $groups,
            'grandTotal' => array_sum(array_column($groups, 'total')),
            'includeSp3' => false,
            'title' => 'รายงานค่าใช้จ่ายสาธารณูปโภค',
            'generatedAt' => now()->format('d/m/Y H:i'),
            'generatedDate' => now()->format('d/m/Y'),
        ])->render();

        return response($pdf->render($html, 'portrait'), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="env-utilities-'.$fiscalYear.'.pdf"',
        ]);
    }

    public function sp3Pdf(Request $request, ThaiPdfService $pdf): HttpResponse
    {
        if (! $this->sp3Unlocked($request)) {
            abort(403, 'ต้องปลดล็อก สป.3 ก่อน');
        }

        $fiscalYear = (int) ($request->query('fiscal_year') ?: ThaiFiscalPeriod::currentFiscalYearBe());
        $category = EnvUtilityExpenseCategory::query()->where('code', 'sp3')->firstOrFail();
        $months = ThaiFiscalPeriod::monthsInFiscalYear($fiscalYear);
        $rows = EnvUtilityExpenseEntry::query()
            ->where('category_id', $category->id)
            ->where('fiscal_year_be', $fiscalYear)
            ->orderBy('year_be')
            ->orderBy('month')
            ->get();

        $serialized = $rows->map(fn (EnvUtilityExpenseEntry $e) => $this->serializeEntry($e))->values();
        $ledger = $this->buildCategoryLedger($serialized, $months, $category);

        [$fontRegularUri, $fontBoldUri] = $pdf->fontUris();
        $html = view('env.utilities-expense-pdf', [
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
            'hospitalName' => config('department_data.hospital_name', config('app.name', 'โรงพยาบาล')),
            'fiscalYear' => $fiscalYear,
            'groups' => [[
                'name' => $category->name,
                'code' => $category->code,
                'has_invoice' => false,
                'has_medical' => true,
                'has_revenue' => true,
                'has_admin' => false,
                'has_line_items' => false,
                'total' => $ledger['grand_totals']['display_total'],
                'ledger' => $ledger,
            ]],
            'grandTotal' => $ledger['grand_totals']['display_total'],
            'includeSp3' => true,
            'title' => 'รายงาน สป.3 ค่าน้ำมันดีเซล',
            'generatedAt' => now()->format('d/m/Y H:i'),
            'generatedDate' => now()->format('d/m/Y'),
        ])->render();

        return response($pdf->render($html, 'portrait'), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="env-utilities-sp3-'.$fiscalYear.'.pdf"',
        ]);
    }

    private function sp3Unlocked(Request $request): bool
    {
        return (bool) $request->session()->get(config('env_utility.sp3_session_key'), false);
    }

    private function publicCategories()
    {
        return EnvUtilityExpenseCategory::query()
            ->where('is_sensitive', false)
            ->orderBy('sort_order')
            ->get();
    }

    /**
     * @return list<int>
     */
    private function availableFiscalYears(): array
    {
        $fromDb = EnvUtilityExpenseEntry::query()
            ->distinct()
            ->orderByDesc('fiscal_year_be')
            ->pluck('fiscal_year_be')
            ->map(fn ($y) => (int) $y)
            ->all();

        $current = ThaiFiscalPeriod::currentFiscalYearBe();
        $years = collect($fromDb)->push($current)->unique()->sortDesc()->values()->all();

        return $years;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, EnvUtilityExpenseEntry>  $rows
     */
    private function entryTotal($rows): float
    {
        return (float) $rows->sum(fn (EnvUtilityExpenseEntry $e) => $this->rowDisplayTotal($e));
    }

    /**
     * เดือนล่าสุดในปีงบที่มีข้อมูลค่าใช้จ่าย (ยอด > 0 ก่อน ถ้าไม่มีใช้เดือนที่มีรายการ)
     *
     * @param  \Illuminate\Support\Collection<int, EnvUtilityExpenseEntry>  $rows
     * @param  list<array{year_be: int, month: int, label: string}>  $months
     * @return array{label: string, year_be: int, month: int, total: float, medical: float, revenue: float, admin: float, invoice: float, rows: int}|null
     */
    private function latestMonthWithData($rows, array $months): ?array
    {
        $picked = null;
        $fallback = null;

        foreach (array_reverse($months) as $m) {
            $monthRows = $rows->filter(
                fn ($e) => (int) $e->year_be === $m['year_be'] && (int) $e->month === $m['month']
            );
            if ($monthRows->isEmpty()) {
                continue;
            }

            $snapshot = [
                'label' => $m['label'],
                'year_be' => $m['year_be'],
                'month' => $m['month'],
                'total' => $this->entryTotal($monthRows),
                'medical' => (float) $monthRows->sum(fn ($e) => (float) ($e->budget_medical ?? 0)),
                'revenue' => (float) $monthRows->sum(fn ($e) => (float) ($e->budget_revenue ?? 0)),
                'admin' => (float) $monthRows->sum(fn ($e) => (float) ($e->budget_admin ?? 0)),
                'invoice' => (float) $monthRows->sum(fn ($e) => (float) ($e->invoice_amount ?? 0)),
                'rows' => $monthRows->count(),
            ];

            $fallback ??= $snapshot;
            if ($snapshot['total'] > 0.009) {
                $picked = $snapshot;
                break;
            }
        }

        return $picked ?? $fallback;
    }

    private function rowDisplayTotal(EnvUtilityExpenseEntry $e): float
    {
        if ($e->amount !== null) {
            return (float) $e->amount;
        }

        $parts = array_filter([
            $e->invoice_amount,
            $e->budget_medical,
            $e->budget_revenue,
            $e->budget_admin,
        ], fn ($v) => $v !== null);

        if ($parts === []) {
            return 0.0;
        }

        // Prefer invoice if present, else sum budgets (not double-count invoice+budgets)
        if ($e->invoice_amount !== null) {
            return (float) $e->invoice_amount;
        }

        return (float) (($e->budget_medical ?? 0) + ($e->budget_revenue ?? 0) + ($e->budget_admin ?? 0));
    }

    private function serializeCategory(EnvUtilityExpenseCategory $cat): array
    {
        return [
            'id' => $cat->id,
            'code' => $cat->code,
            'name' => $cat->name,
            'is_sensitive' => $cat->is_sensitive,
            'has_invoice' => $cat->has_invoice,
            'has_medical' => $cat->has_medical,
            'has_revenue' => $cat->has_revenue,
            'has_admin' => $cat->has_admin,
            'has_line_items' => $cat->has_line_items,
        ];
    }

    private function serializeEntry(EnvUtilityExpenseEntry $e): array
    {
        $parsed = $this->parseAcMeterNote($e->note);

        return [
            'id' => $e->id,
            'category_id' => $e->category_id,
            'fiscal_year_be' => $e->fiscal_year_be,
            'year_be' => $e->year_be,
            'month' => $e->month,
            'period_label' => ThaiFiscalPeriod::label((int) $e->year_be, (int) $e->month),
            'invoice_amount' => $e->invoice_amount,
            'budget_medical' => $e->budget_medical,
            'budget_revenue' => $e->budget_revenue,
            'budget_admin' => $e->budget_admin,
            'amount' => $e->amount,
            'line_label' => $e->line_label,
            'note' => $e->note,
            'note_text' => $parsed['note_text'],
            'units' => $parsed['units'],
            'prev_reading' => $parsed['prev_reading'],
            'curr_reading' => $parsed['curr_reading'],
            'rate' => $parsed['rate'],
            'display_total' => $this->rowDisplayTotal($e),
            'is_sub' => trim((string) ($e->line_label ?? '')) !== '',
        ];
    }

    private function composeAcMeterNote(?float $prev, ?float $curr, ?float $units, ?float $rate, ?string $note): ?string
    {
        $parts = [];
        if ($prev !== null && $curr !== null) {
            $parts[] = 'มิเตอร์ '.$this->formatAcNumber($prev).'→'.$this->formatAcNumber($curr);
        }
        if ($units !== null) {
            $parts[] = $this->formatAcNumber($units).' หน่วย';
        }
        if ($rate !== null) {
            $parts[] = 'อัตรา '.$this->formatAcNumber($rate);
        }
        $extra = trim((string) ($note ?? ''));
        if ($extra !== '') {
            $parts[] = $extra;
        }

        return $parts !== [] ? implode(' · ', $parts) : null;
    }

    private function formatAcNumber(float $n): string
    {
        $formatted = number_format($n, 2, '.', '');
        $formatted = rtrim(rtrim($formatted, '0'), '.');

        return $formatted === '' ? '0' : $formatted;
    }

    /**
     * @return array{units: ?float, prev_reading: ?float, curr_reading: ?float, rate: ?float, note_text: ?string}
     */
    private function parseAcMeterNote(?string $note): array
    {
        $result = [
            'units' => null,
            'prev_reading' => null,
            'curr_reading' => null,
            'rate' => null,
            'note_text' => null,
        ];

        if ($note === null || $note === '') {
            return $result;
        }

        if (preg_match('/มิเตอร์\s*([0-9]+(?:\.[0-9]+)?)\s*[→\->]+\s*([0-9]+(?:\.[0-9]+)?)/u', $note, $m)) {
            $result['prev_reading'] = (float) $m[1];
            $result['curr_reading'] = (float) $m[2];
        }
        if (preg_match('/([0-9]+(?:\.[0-9]+)?)\s*หน่วย/u', $note, $m)) {
            $result['units'] = (float) $m[1];
        }
        if (preg_match('/อัตรา\s*([0-9]+(?:\.[0-9]+)?)/u', $note, $m)) {
            $result['rate'] = (float) $m[1];
        }

        $parts = preg_split('/\s*·\s*/u', $note) ?: [];
        $extra = [];
        foreach ($parts as $part) {
            $part = trim($part);
            if ($part === '') {
                continue;
            }
            if (preg_match('/^มิเตอร์\s/u', $part)) {
                continue;
            }
            if (preg_match('/หน่วย/u', $part)) {
                continue;
            }
            if (preg_match('/^อัตรา\s/u', $part)) {
                continue;
            }
            $extra[] = $part;
        }
        $result['note_text'] = $extra !== [] ? implode(' · ', $extra) : null;

        return $result;
    }

    /**
     * ทะเบียนมิเตอร์แอร์รายเดือน (เหมือนไฟล์ Excel)
     *
     * @param  \Illuminate\Support\Collection<int, array<string, mixed>>  $entries
     * @param  list<array{year_be: int, month: int, label: string}>  $months
     * @return array{title: string, default_rate: float, periods: list<array<string, mixed>>, totals: array{units: float, cost: float}}
     */
    private function buildAcMeterReport($entries, array $months): array
    {
        $defaultRate = (float) config('env_utility.default_ac_rate', 4.45);

        $periods = collect($months)
            ->map(function (array $m) use ($entries, $defaultRate) {
                $prev = ThaiFiscalPeriod::previousMonth((int) $m['year_be'], (int) $m['month']);
                $rows = $entries
                    ->filter(fn ($e) => (int) $e['year_be'] === (int) $m['year_be'] && (int) $e['month'] === (int) $m['month'])
                    ->values()
                    ->map(function ($e, $idx) use ($defaultRate) {
                        $units = $e['units'];
                        $rate = $e['rate'] ?? $defaultRate;
                        $cost = (float) $e['display_total'];

                        return [
                            'no' => $idx + 1,
                            'name' => trim((string) ($e['line_label'] ?: 'ไม่ระบุแผนก')),
                            'prev_reading' => $e['prev_reading'],
                            'curr_reading' => $e['curr_reading'],
                            'units' => $units,
                            'rate' => $rate,
                            'cost' => $cost,
                            'note' => $e['note_text'],
                            'entry_id' => $e['id'],
                        ];
                    })
                    ->all();

                return [
                    'key' => $m['year_be'].'-'.$m['month'],
                    'label' => $m['label'],
                    'prev_label' => $prev['label'],
                    'curr_label' => $m['label'],
                    'year_be' => $m['year_be'],
                    'month' => $m['month'],
                    'has_data' => count($rows) > 0,
                    'rows' => $rows,
                    'total_units' => array_sum(array_map(fn ($r) => (float) ($r['units'] ?? 0), $rows)),
                    'total_cost' => array_sum(array_map(fn ($r) => (float) $r['cost'], $rows)),
                ];
            })
            ->values()
            ->all();

        return [
            'title' => 'ทะเบียนคุมมิเตอร์ค่าไฟฟ้าเครื่องปรับอากาศแต่ละแผนก',
            'default_rate' => $defaultRate,
            'periods' => $periods,
            'totals' => [
                'units' => array_sum(array_column($periods, 'total_units')),
                'cost' => array_sum(array_column($periods, 'total_cost')),
            ],
        ];
    }

    /**
     * ตารางรายเดือนตามรูปแบบชีต Excel
     *
     * @param  \Illuminate\Support\Collection<int, array<string, mixed>>  $entries
     * @param  list<array{year_be: int, month: int, label: string}>  $months
     * @return array{periods: list<array<string, mixed>>, grand_totals: array<string, float>}
     */
    private function buildCategoryLedger($entries, array $months, EnvUtilityExpenseCategory $category): array
    {
        $grand = [
            'invoice' => 0.0,
            'medical' => 0.0,
            'revenue' => 0.0,
            'admin' => 0.0,
            'display_total' => 0.0,
        ];

        $periods = collect($months)->map(function (array $m) use ($entries, &$grand) {
            $rows = $entries
                ->filter(fn ($e) => (int) $e['year_be'] === (int) $m['year_be'] && (int) $e['month'] === (int) $m['month'])
                ->sortBy(fn ($e) => trim((string) ($e['line_label'] ?? '')) === '' ? 0 : 1)
                ->values()
                ->map(function ($e) {
                    $label = trim((string) ($e['line_label'] ?? ''));

                    return [
                        'id' => $e['id'],
                        'is_sub' => $label !== '',
                        'line_label' => $label !== '' ? $label : null,
                        'invoice_amount' => $e['invoice_amount'],
                        'budget_medical' => $e['budget_medical'],
                        'budget_revenue' => $e['budget_revenue'],
                        'budget_admin' => $e['budget_admin'],
                        'note' => $e['note_text'] ?? $e['note'],
                        'display_total' => $e['display_total'],
                    ];
                })
                ->all();

            $sum = [
                'invoice' => (float) collect($rows)->sum(fn ($r) => (float) ($r['invoice_amount'] ?? 0)),
                'medical' => (float) collect($rows)->sum(fn ($r) => (float) ($r['budget_medical'] ?? 0)),
                'revenue' => (float) collect($rows)->sum(fn ($r) => (float) ($r['budget_revenue'] ?? 0)),
                'admin' => (float) collect($rows)->sum(fn ($r) => (float) ($r['budget_admin'] ?? 0)),
                'display_total' => (float) collect($rows)->sum(fn ($r) => (float) ($r['display_total'] ?? 0)),
            ];

            foreach ($sum as $k => $v) {
                $grand[$k] += $v;
            }

            return [
                'key' => $m['year_be'].'-'.$m['month'],
                'label' => $m['label'],
                'year_be' => $m['year_be'],
                'month' => $m['month'],
                'rows' => $rows,
                'totals' => $sum,
                'has_data' => $rows !== [],
            ];
        })->values()->all();

        return [
            'periods' => $periods,
            'grand_totals' => $grand,
            'has_invoice' => (bool) $category->has_invoice,
            'has_medical' => (bool) $category->has_medical,
            'has_revenue' => (bool) $category->has_revenue,
            'has_admin' => (bool) $category->has_admin,
            'has_line_items' => (bool) $category->has_line_items,
        ];
    }

    private function fmtMoney(?float $n): string
    {
        if ($n === null) {
            return '-';
        }

        return number_format($n, 2);
    }
}
