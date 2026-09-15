<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\EnvElectricityUsage;
use App\Services\ThaiPdfService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class EnvElectricityController extends Controller
{
    public function __construct(private ThaiPdfService $pdf) {}

    public function index(Request $request): Response
    {
        $year = (int) ($request->query('year') ?: now()->year);
        $month = (int) ($request->query('month') ?: now()->month);
        if ($month < 1 || $month > 12) {
            $month = (int) now()->month;
        }
        if ($year < 2000 || $year > 2100) {
            $year = (int) now()->year;
        }

        $departmentId = $request->integer('department_id') ?: null;

        $departments = Department::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        if ($departmentId && ! $departments->contains('id', $departmentId)) {
            $departmentId = null;
        }

        $monthRecords = EnvElectricityUsage::query()
            ->with(['department:id,name,code', 'recorder:id,name'])
            ->where('year', $year)
            ->where('month', $month)
            ->get()
            ->keyBy('department_id');

        $entries = $departments->map(function (Department $dept) use ($monthRecords) {
            $row = $monthRecords->get($dept->id);

            return [
                'id' => $row?->id,
                'department_id' => $dept->id,
                'department_name' => $dept->name,
                'department_code' => $dept->code,
                'kwh' => $row?->kwh ?? null,
                'cost' => $row?->cost ?? null,
                'meter_start' => $row?->meter_start,
                'meter_end' => $row?->meter_end,
                'notes' => $row?->notes,
                'recorded_by_name' => $row?->recorder?->name,
                'updated_at' => optional($row?->updated_at)->format('d/m/Y H:i'),
            ];
        });

        $yearUsages = EnvElectricityUsage::query()
            ->with('department:id,name,code')
            ->where('year', $year)
            ->when($departmentId, fn ($q) => $q->where('department_id', $departmentId))
            ->orderBy('month')
            ->get();

        $monthlyAgg = EnvElectricityUsage::query()
            ->where('year', $year)
            ->selectRaw('month, COALESCE(SUM(kwh),0) as kwh, COALESCE(SUM(cost),0) as cost, COUNT(*) as records')
            ->groupBy('month')
            ->get()
            ->keyBy('month');

        $monthlyOverview = collect(range(1, 12))->map(function (int $m) use ($monthlyAgg) {
            $agg = $monthlyAgg->get($m);

            return [
                'month' => $m,
                'label' => $this->monthLabel($m),
                'kwh' => (float) ($agg->kwh ?? 0),
                'cost' => (float) ($agg->cost ?? 0),
                'records' => (int) ($agg->records ?? 0),
            ];
        });

        $byDepartmentYear = EnvElectricityUsage::query()
            ->select('department_id', DB::raw('SUM(kwh) as kwh'), DB::raw('SUM(cost) as cost'))
            ->where('year', $year)
            ->groupBy('department_id')
            ->with('department:id,name,code')
            ->get()
            ->map(fn (EnvElectricityUsage $row) => [
                'department_id' => $row->department_id,
                'name' => $row->department?->name ?? '-',
                'code' => $row->department?->code,
                'kwh' => (float) $row->kwh,
                'cost' => (float) $row->cost,
            ])
            ->sortByDesc('kwh')
            ->values();

        $departmentHistory = null;
        if ($departmentId) {
            $departmentHistory = collect(range(1, 12))->map(function (int $m) use ($year, $departmentId, $yearUsages) {
                $row = $yearUsages->first(fn ($u) => (int) $u->month === $m);

                return [
                    'month' => $m,
                    'label' => $this->monthLabel($m),
                    'kwh' => (float) ($row?->kwh ?? 0),
                    'cost' => (float) ($row?->cost ?? 0),
                ];
            });
        }

        $yearTotalKwh = (float) EnvElectricityUsage::where('year', $year)->sum('kwh');
        $yearTotalCost = (float) EnvElectricityUsage::where('year', $year)->sum('cost');
        $monthTotalKwh = (float) EnvElectricityUsage::where('year', $year)->where('month', $month)->sum('kwh');
        $monthTotalCost = (float) EnvElectricityUsage::where('year', $year)->where('month', $month)->sum('cost');
        $filledCount = EnvElectricityUsage::where('year', $year)->where('month', $month)->count();

        $availableYears = EnvElectricityUsage::query()
            ->select('year')
            ->distinct()
            ->orderByDesc('year')
            ->pluck('year')
            ->values()
            ->all();
        if (! in_array($year, $availableYears, true)) {
            array_unshift($availableYears, $year);
        }

        return Inertia::render('Env/Electricity/Index', [
            'departments' => $departments,
            'entries' => $entries,
            'monthlyOverview' => $monthlyOverview,
            'byDepartmentYear' => $byDepartmentYear,
            'departmentHistory' => $departmentHistory,
            'summary' => [
                'year_kwh' => $yearTotalKwh,
                'year_cost' => $yearTotalCost,
                'month_kwh' => $monthTotalKwh,
                'month_cost' => $monthTotalCost,
                'filled' => $filledCount,
                'total_departments' => $departments->count(),
            ],
            'filters' => [
                'year' => $year,
                'month' => $month,
                'department_id' => $departmentId,
            ],
            'availableYears' => $availableYears,
            'monthLabels' => collect(range(1, 12))->mapWithKeys(fn ($m) => [$m => $this->monthLabel($m)]),
        ]);
    }

    public function storeBatch(Request $request)
    {
        $validated = $request->validate([
            'year' => 'required|integer|min:2000|max:2100',
            'month' => 'required|integer|min:1|max:12',
            'entries' => 'required|array|min:1',
            'entries.*.department_id' => 'required|exists:departments,id',
            'entries.*.kwh' => 'nullable|numeric|min:0',
            'entries.*.cost' => 'nullable|numeric|min:0',
            'entries.*.meter_start' => 'nullable|numeric|min:0',
            'entries.*.meter_end' => 'nullable|numeric|min:0',
            'entries.*.notes' => 'nullable|string|max:2000',
        ]);

        $saved = 0;
        $userId = Auth::id();

        DB::transaction(function () use ($validated, $userId, &$saved) {
            foreach ($validated['entries'] as $entry) {
                $kwh = $entry['kwh'] ?? null;
                $cost = $entry['cost'] ?? null;
                $hasValue = ($kwh !== null && $kwh !== '') || ($cost !== null && $cost !== '');

                $existing = EnvElectricityUsage::query()
                    ->where('department_id', $entry['department_id'])
                    ->where('year', $validated['year'])
                    ->where('month', $validated['month'])
                    ->first();

                if (! $hasValue) {
                    if ($existing) {
                        $existing->delete();
                        $saved++;
                    }
                    continue;
                }

                EnvElectricityUsage::updateOrCreate(
                    [
                        'department_id' => $entry['department_id'],
                        'year' => $validated['year'],
                        'month' => $validated['month'],
                    ],
                    [
                        'kwh' => (float) ($kwh ?? 0),
                        'cost' => (float) ($cost ?? 0),
                        'meter_start' => $entry['meter_start'] ?? null,
                        'meter_end' => $entry['meter_end'] ?? null,
                        'notes' => $entry['notes'] ?? null,
                        'recorded_by' => $userId,
                    ]
                );
                $saved++;
            }
        });

        return redirect()
            ->route('env.electricity.index', [
                'year' => $validated['year'],
                'month' => $validated['month'],
            ])
            ->with('success', "บันทึกการใช้ไฟฟ้า {$saved} รายการเรียบร้อย");
    }

    public function destroy(EnvElectricityUsage $usage)
    {
        $year = $usage->year;
        $month = $usage->month;
        $usage->delete();

        return redirect()
            ->route('env.electricity.index', compact('year', 'month'))
            ->with('success', 'ลบรายการเรียบร้อย');
    }

    public function pdf(Request $request): HttpResponse
    {
        $year = (int) ($request->query('year') ?: now()->year);
        $month = $request->query('month');
        $month = $month !== null && $month !== '' ? (int) $month : null;
        $departmentId = $request->integer('department_id') ?: null;

        $usages = EnvElectricityUsage::query()
            ->with(['department:id,name,code', 'recorder:id,name'])
            ->where('year', $year)
            ->when($month, fn ($q) => $q->where('month', $month))
            ->when($departmentId, fn ($q) => $q->where('department_id', $departmentId))
            ->get()
            ->sortBy([
                fn ($u) => (int) $u->month,
                fn ($u) => $u->department?->name ?? '',
            ])
            ->values();

        $byMonth = $usages->groupBy('month')->map(fn ($rows) => [
            'kwh' => (float) $rows->sum('kwh'),
            'cost' => (float) $rows->sum('cost'),
            'count' => $rows->count(),
        ]);

        $byDept = $usages->groupBy('department_id')->map(function ($rows) {
            $first = $rows->first();

            return [
                'name' => $first?->department?->name ?? '-',
                'code' => $first?->department?->code,
                'kwh' => (float) $rows->sum('kwh'),
                'cost' => (float) $rows->sum('cost'),
            ];
        })->sortByDesc('kwh')->values();

        [$fontRegularUri, $fontBoldUri] = $this->pdf->fontUris();

        $html = view('env.electricity-pdf', [
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
            'hospitalName' => config('app.name', 'โรงพยาบาล'),
            'year' => $year,
            'month' => $month,
            'monthLabel' => $month ? $this->monthLabel($month) : null,
            'departmentName' => $departmentId
                ? Department::find($departmentId)?->name
                : null,
            'usages' => $usages,
            'byMonth' => $byMonth,
            'byDept' => $byDept,
            'totalKwh' => (float) $usages->sum('kwh'),
            'totalCost' => (float) $usages->sum('cost'),
            'generatedAt' => now()->format('d/m/Y H:i'),
            'monthName' => fn (int $m) => $this->monthLabel($m),
        ])->render();

        $filename = $month
            ? "electricity-{$year}-{$month}.pdf"
            : "electricity-{$year}.pdf";

        return response($this->pdf->render($html, 'landscape'), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }

    private function monthLabel(int $month): string
    {
        $labels = [
            1 => 'ม.ค.', 2 => 'ก.พ.', 3 => 'มี.ค.', 4 => 'เม.ย.',
            5 => 'พ.ค.', 6 => 'มิ.ย.', 7 => 'ก.ค.', 8 => 'ส.ค.',
            9 => 'ก.ย.', 10 => 'ต.ค.', 11 => 'พ.ย.', 12 => 'ธ.ค.',
        ];

        return $labels[$month] ?? (string) $month;
    }
}
