<?php

namespace App\Http\Controllers;

use App\Models\QualityIndicator;
use App\Models\QualityIndicatorEntry;
use App\Models\Department;
use App\Models\TeamHa;
use App\Services\QualityIndicatorFamilyService;
use App\Services\ThaiPdfService;
use App\Support\ThaiFiscalPeriod;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class QualityIndicatorController extends Controller
{
    private const HOSPITAL_NAME = 'โรงพยาบาลค่ายสุรสิงหนาท';

    public function __construct(private QualityIndicatorFamilyService $families) {}

    public function index(Request $request)
    {
        $view = $request->query('view', 'list');
        $isTrash = $view === 'trash';

        $type = $request->query('type', 'department'); // 'department', 'ha_team', 'organization'
        if (! in_array($type, ['department', 'ha_team', 'organization'], true)) {
            $type = 'department';
        }

        $departmentId = $request->filled('department_id') ? (int) $request->query('department_id') : null;
        $teamId = $request->filled('team_id') ? (int) $request->query('team_id') : null;
        $category = $request->filled('category') ? trim((string) $request->query('category')) : null;

        if ($isTrash) {
            $indicators = QualityIndicator::onlyTrashed()
                ->with([
                    'department:id,name',
                    'team:id,abbreviation,name_th',
                    'deletedBy:id,name',
                    'restoredBy:id,name',
                ])
                ->orderByDesc('deleted_at')
                ->orderBy('code')
                ->get()
                ->map(function (QualityIndicator $indicator) {
                    $indicator->setAttribute('entries_count', $indicator->entries()->count());
                    $indicator->setAttribute('deleted_by_name', $indicator->deletedBy?->name);
                    $indicator->setAttribute('restored_by_name', $indicator->restoredBy?->name);

                    return $indicator;
                });
        } else {
            $query = QualityIndicator::where('type', $type)
                ->with(['department', 'team', 'family.master'])
                ->withCount('entries')
                ->orderBy('category')
                ->orderBy('code');

            if ($type === 'department' && $departmentId) {
                $query->where('department_id', $departmentId);
            }

            if ($type === 'ha_team' && $teamId) {
                $query->where('team_id', $teamId);
            }

            if ($type === 'organization' && $category && $category !== 'all') {
                $query->where('category', $category);
            }

            $indicators = $query->get();
            $masterIds = $indicators
                ->map(function (QualityIndicator $indicator) {
                    $this->families->overlaySharedFields($indicator);

                    return $this->families->masterOf($indicator)->id;
                })
                ->unique()
                ->values()
                ->all();
            $latestEntries = $this->latestEntriesByIndicator($masterIds);

            $indicators = $indicators->map(function (QualityIndicator $indicator) use ($latestEntries) {
                $this->families->overlaySharedFields($indicator);
                $master = $this->families->masterOf($indicator);
                $latest = $latestEntries->get($master->id);
                $indicator->setAttribute('entries_count', $master->entries()->count());
                $indicator->setAttribute('aliases_count', max(0, $indicator->family?->indicators()->count() - 1));
                $indicator->setAttribute('latest_entry', $latest ? [
                    'period_date' => $latest->period_date?->toDateString(),
                    'result_value' => $latest->is_na ? null : $latest->result_value,
                    'is_na' => (bool) $latest->is_na,
                ] : null);

                return $indicator;
            });
        }

        $orgCategoryCounts = [
            'all' => QualityIndicator::where('type', 'organization')->count(),
            'sar' => QualityIndicator::where('type', 'organization')->where('category', 'แบบประเมินตนเอง SAR')->count(),
            'strategy' => QualityIndicator::where('type', 'organization')->where('category', 'แผนยุทธศาสตร์ รพ.')->count(),
        ];

        $departments = Department::query()->orderBy('name')->get(['id', 'name']);
        $teams = TeamHa::query()->orderBy('abbreviation')->get(['id', 'abbreviation', 'name_th']);
        $linkableIndicators = $isTrash
            ? collect()
            : QualityIndicator::query()
                ->with(['department:id,name', 'team:id,abbreviation,name_th', 'family'])
                ->orderBy('type')
                ->orderBy('code')
                ->get(['id', 'family_id', 'type', 'code', 'name', 'department_id', 'team_id'])
                ->map(function (QualityIndicator $item) {
                    $owner = match ($item->type) {
                        'department' => $item->department?->name ?: 'ไม่ระบุแผนก',
                        'ha_team' => $item->team
                            ? trim(($item->team->abbreviation ? $item->team->abbreviation.' · ' : '').$item->team->name_th)
                            : 'ไม่ระบุทีม',
                        default => 'ระดับองค์กร',
                    };

                    return [
                        'id' => $item->id,
                        'code' => $item->code,
                        'name' => $item->name,
                        'type' => $item->type,
                        'owner' => $owner,
                    ];
                });

        return Inertia::render('QualityIndicators/Index', [
            'indicators' => $indicators,
            'type' => $type,
            'view' => $isTrash ? 'trash' : 'list',
            'trashCount' => QualityIndicator::onlyTrashed()->count(),
            'departments' => $departments,
            'teams' => $teams,
            'linkableIndicators' => $linkableIndicators,
            'orgCategoryCounts' => $orgCategoryCounts,
            'filters' => [
                'department_id' => $departmentId,
                'team_id' => $teamId,
                'category' => $category,
                'search' => $request->query('search', ''),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $linkToId = $request->filled('link_to_id') ? (int) $request->input('link_to_id') : null;

        $rules = [
            'type' => 'required|in:department,ha_team,organization',
            'department_id' => 'nullable|required_if:type,department|exists:departments,id',
            'team_id' => 'nullable|required_if:type,ha_team|exists:teamha,id',
            'code' => [
                'nullable',
                'string',
                Rule::unique('quality_indicators', 'code')->whereNull('deleted_at'),
            ],
            'link_to_id' => 'nullable|integer|exists:quality_indicators,id',
        ];

        if ($linkToId) {
            $rules['is_active'] = 'boolean';
        } else {
            $rules = array_merge($rules, [
                'name' => 'required|string',
                'category' => 'nullable|string',
                'unit' => 'required|string',
                'target_value' => 'nullable|numeric',
                'target_operator' => 'required|in:<,>,<=,>=,=',
                'frequency' => 'required|string',
                'description' => 'nullable|string',
                'formula_description' => 'nullable|string',
            ]);
        }

        $validated = $request->validate($rules);
        unset($validated['link_to_id']);

        if (array_key_exists('target_value', $validated) && $validated['target_value'] !== null) {
            $validated['target_value'] = round((float) $validated['target_value'], 2);
        }

        if ($linkToId) {
            $source = QualityIndicator::findOrFail($linkToId);
            $this->families->createAlias($source, $validated);

            return redirect()->back()->with('success', 'สร้างรหัสลูกและเชื่อมข้อมูลชุดเดียวกันแล้ว');
        }

        $this->families->createStandalone($validated);

        return redirect()->back()->with('success', 'สร้างตัวชี้วัดเรียบร้อย');
    }

    public function update(Request $request, QualityIndicator $indicator)
    {
        $validated = $request->validate([
            'code' => [
                'nullable',
                'string',
                Rule::unique('quality_indicators', 'code')->whereNull('deleted_at')->ignore($indicator->id),
            ],
            'name' => 'required|string',
            'category' => 'nullable|string',
            'unit' => 'required|string',
            'target_value' => 'nullable|numeric',
            'target_operator' => 'required|in:<,>,<=,>=,=',
            'frequency' => 'required|string',
            'description' => 'nullable|string',
            'formula_description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if (array_key_exists('target_value', $validated) && $validated['target_value'] !== null) {
            $validated['target_value'] = round((float) $validated['target_value'], 2);
        }

        $this->families->updateSharedAndLocal($indicator, $validated);

        return redirect()->back()->with('success', 'บันทึกตัวชี้วัดแล้ว — รหัสที่เชื่อมกันใช้ข้อมูลชุดเดียวกัน');
    }

    public function show(QualityIndicator $indicator)
    {
        $this->families->ensureFamily($indicator);
        $master = $this->families->masterOf($indicator);
        $this->families->overlaySharedFields($indicator);

        $master->load(['entries' => function ($query) {
            $query->orderBy('period_date', 'asc')->orderBy('series_key')->limit(120);
        }]);
        $indicator->setRelation('entries', $master->entries);

        $indicator->load(['department', 'team', 'reviews' => function ($query) {
            $query->orderBy('schedule_date', 'desc')->limit(10);
        }]);

        $departments = Department::query()->orderBy('name')->get(['id', 'name']);
        $teams = TeamHa::query()->orderBy('abbreviation')->get(['id', 'abbreviation', 'name_th']);

        return Inertia::render('QualityIndicators/Show', [
            'indicator' => $indicator,
            'familyMembers' => $this->families->memberPayload($indicator),
            'departments' => $departments,
            'teams' => $teams,
        ]);
    }

    public function storeAlias(Request $request, QualityIndicator $indicator)
    {
        $validated = $request->validate([
            'type' => 'required|in:department,ha_team,organization',
            'department_id' => 'nullable|required_if:type,department|exists:departments,id',
            'team_id' => 'nullable|required_if:type,ha_team|exists:teamha,id',
            'code' => [
                'required',
                'string',
                Rule::unique('quality_indicators', 'code')->whereNull('deleted_at'),
            ],
        ]);

        $alias = $this->families->createAlias($indicator, $validated);

        return redirect()
            ->route('quality-indicators.show', $alias)
            ->with('success', 'สร้างรหัสลูกแล้ว — ใช้ข้อมูลชุดเดียวกับตัวหลัก');
    }

    public function promote(QualityIndicator $indicator)
    {
        $this->families->promote($indicator);

        return redirect()->back()->with('success', 'ตั้งเป็นตัวหลักเรียบร้อย');
    }

    public function unlink(QualityIndicator $indicator)
    {
        $this->families->unlink($indicator);

        return redirect()->back()->with('success', 'ยกเลิกการเชื่อมแล้ว — รหัสนี้มีข้อมูลของตัวเอง');
    }

    public function storeEntry(Request $request, QualityIndicator $indicator)
    {
        $master = $this->families->masterOf($indicator);

        if ($request->exists('series_entries')) {
            return $this->storeSeriesEntries($request, $master);
        }

        $validated = $this->validateEntry($request);
        $validated['series_key'] = '';
        $validated['created_by'] = Auth::id();

        $entry = $master->entries()
            ->whereDate('period_date', $validated['period_date'])
            ->where('series_key', '')
            ->first();

        if ($entry) {
            unset($validated['created_by']);
            $entry->update($validated);
            $message = 'อัปเดตข้อมูลการวัดผลเรียบร้อย';
        } else {
            $master->entries()->create($validated);
            $message = 'บันทึกข้อมูลการวัดผลเรียบร้อย';
        }

        return redirect()->back()->with('success', $message);
    }

    public function updateEntry(Request $request, QualityIndicator $indicator, QualityIndicatorEntry $entry)
    {
        $this->assertEntryBelongsToFamily($indicator, $entry);

        $validated = $this->validateEntry($request);

        $master = $this->families->masterOf($indicator);
        $seriesKey = (string) ($entry->series_key ?? '');
        $duplicate = $master->entries()
            ->whereDate('period_date', $validated['period_date'])
            ->where('series_key', $seriesKey)
            ->where('id', '!=', $entry->id)
            ->exists();

        if ($duplicate) {
            return redirect()->back()->withErrors([
                'period_date' => 'มีข้อมูลงวดนี้อยู่แล้ว กรุณาเลือกงวดอื่นหรือแก้ไขรายการเดิม',
            ]);
        }

        $entry->update($validated);

        return redirect()->back()->with('success', 'แก้ไขข้อมูลการวัดผลเรียบร้อย');
    }

    public function destroyEntry(QualityIndicator $indicator, QualityIndicatorEntry $entry)
    {
        $this->assertEntryBelongsToFamily($indicator, $entry);

        $entry->delete();

        return redirect()->back()->with('success', 'ลบข้อมูลการวัดผลเรียบร้อย');
    }

    private function validateEntry(Request $request): array
    {
        $isNa = $request->boolean('is_na');
        if ($isNa) {
            $request->merge([
                'is_na' => true,
                'numerator' => null,
                'denominator' => null,
                'result_value' => null,
            ]);
        }

        $validated = $request->validate([
            'period_date' => 'required|date',
            'is_na' => 'sometimes|boolean',
            'numerator' => 'nullable|numeric',
            'denominator' => 'nullable|numeric',
            'result_value' => $isNa ? 'nullable' : 'required|numeric',
            'notes' => 'nullable|string',
        ]);

        $validated['is_na'] = $isNa;
        if ($isNa) {
            $validated['numerator'] = null;
            $validated['denominator'] = null;
            $validated['result_value'] = null;

            return $validated;
        }

        foreach (['numerator', 'denominator', 'result_value'] as $field) {
            if (array_key_exists($field, $validated) && $validated[$field] !== null && $validated[$field] !== '') {
                $validated[$field] = round((float) $validated[$field], 2);
            }
        }

        return $validated;
    }

    private function storeSeriesEntries(Request $request, QualityIndicator $master)
    {
        $rows = $request->input('series_entries', []);
        foreach ($rows as $index => $row) {
            $rowIsNa = filter_var($row['is_na'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $rows[$index]['is_na'] = $rowIsNa;
            if ($rowIsNa) {
                $rows[$index]['numerator'] = null;
                $rows[$index]['denominator'] = null;
                $rows[$index]['result_value'] = null;
            }
        }
        $request->merge(['series_entries' => $rows]);

        $validated = $request->validate([
            'period_date' => 'required|date',
            'series_entries' => 'required|array|min:1',
            'series_entries.*.series_key' => 'required|string|max:40',
            'series_entries.*.is_na' => 'boolean',
            'series_entries.*.numerator' => 'nullable|numeric',
            'series_entries.*.denominator' => 'nullable|numeric',
            'series_entries.*.result_value' => 'nullable|numeric',
            'series_entries.*.notes' => 'nullable|string',
        ]);

        $allowed = collect($master->series ?? [])->pluck('key')->filter()->values();
        foreach ($validated['series_entries'] as $row) {
            if (! $allowed->contains($row['series_key'])) {
                return redirect()->back()->withErrors([
                    'series_entries' => 'หัวข้อย่อยไม่ตรงกับตัวชี้วัดนี้',
                ]);
            }
        }

        foreach ($validated['series_entries'] as $row) {
            $rowIsNa = (bool) ($row['is_na'] ?? false);
            if (! $rowIsNa && ($row['result_value'] === null || $row['result_value'] === '')) {
                return redirect()->back()->withErrors([
                    'series_entries' => 'กรุณาระบุผลลัพธ์ หรือเลือก N/A',
                ]);
            }

            if ($rowIsNa) {
                $row['numerator'] = null;
                $row['denominator'] = null;
                $row['result_value'] = null;
            } else {
                foreach (['numerator', 'denominator', 'result_value'] as $field) {
                    if (array_key_exists($field, $row) && $row[$field] !== null && $row[$field] !== '') {
                        $row[$field] = round((float) $row[$field], 2);
                    }
                }
            }

            $entry = $master->entries()
                ->whereDate('period_date', $validated['period_date'])
                ->where('series_key', $row['series_key'])
                ->first();

            $payload = [
                'series_key' => $row['series_key'],
                'period_date' => $validated['period_date'],
                'numerator' => $row['numerator'] ?? null,
                'denominator' => $row['denominator'] ?? null,
                'result_value' => $row['result_value'],
                'is_na' => $rowIsNa,
                'notes' => $row['notes'] ?? null,
            ];

            if ($entry) {
                $entry->update($payload);
            } else {
                $master->entries()->create([
                    ...$payload,
                    'created_by' => Auth::id(),
                ]);
            }
        }

        return redirect()->back()->with('success', 'บันทึกข้อมูลแต่ละหัวข้อย่อยเรียบร้อย');
    }

    public function coverage()
    {
        return Inertia::render('QualityIndicators/Coverage', $this->coveragePayload());
    }

    public function exportCoverageExcel()
    {
        $payload = $this->coveragePayload();
        $organization = (int) $payload['organization'];
        $departments = $payload['departments'];
        $teams = $payload['teams'];
        $departmentsWith = $departments->where('count', '>', 0)->count();
        $teamsWith = $teams->where('count', '>', 0)->count();

        $spreadsheet = new Spreadsheet();
        $summary = $spreadsheet->getActiveSheet();
        $summary->setTitle('สรุป');
        $summary->fromArray(['ส่วน', 'จำนวน', 'ทั้งหมด', 'ยังไม่มี'], null, 'A1', true);
        $summary->fromArray([
            ['ระดับองค์กร', $organization, 1, $organization === 0 ? 1 : 0],
            ['แผนก', $departments->sum('count'), $departments->count(), $departments->count() - $departmentsWith],
            ['ทีม HA', $teams->sum('count'), $teams->count(), $teams->count() - $teamsWith],
        ], null, 'A2', true);
        $this->styleCoverageHeader($summary, 'A1:D1');
        foreach (range('A', 'D') as $column) {
            $summary->getColumnDimension($column)->setAutoSize(true);
        }

        $departmentSheet = $spreadsheet->createSheet();
        $departmentSheet->setTitle('แผนก');
        $departmentSheet->fromArray(['แผนก', 'จำนวน', 'สถานะ'], null, 'A1');
        $row = 2;
        foreach ($departments as $department) {
            $departmentSheet->fromArray([
                [$department['name'], $department['count'], $department['count'] === 0 ? 'ยังไม่มี' : 'มีแล้ว'],
            ], null, 'A'.$row, true);
            $row++;
        }
        $this->styleCoverageHeader($departmentSheet, 'A1:C1');
        $departmentSheet->getColumnDimension('A')->setWidth(42);
        $departmentSheet->getColumnDimension('B')->setWidth(12);
        $departmentSheet->getColumnDimension('C')->setWidth(14);

        $teamSheet = $spreadsheet->createSheet();
        $teamSheet->setTitle('ทีม HA');
        $teamSheet->fromArray(['ตัวย่อ', 'ทีม', 'จำนวน', 'สถานะ'], null, 'A1');
        $row = 2;
        foreach ($teams as $team) {
            $teamSheet->fromArray([
                [$team['abbreviation'], $team['name'], $team['count'], $team['count'] === 0 ? 'ยังไม่มี' : 'มีแล้ว'],
            ], null, 'A'.$row, true);
            $row++;
        }
        $this->styleCoverageHeader($teamSheet, 'A1:D1');
        $teamSheet->getColumnDimension('A')->setWidth(14);
        $teamSheet->getColumnDimension('B')->setWidth(42);
        $teamSheet->getColumnDimension('C')->setWidth(12);
        $teamSheet->getColumnDimension('D')->setWidth(14);

        $filename = 'รายงานจำนวนตัวชี้วัดรายส่วน-'.now()->timezone(config('app.timezone'))->format('Ymd').'.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * @return array{organization: int, departments: Collection<int, array{id: int, name: string, count: int}>, teams: Collection<int, array{id: int, abbreviation: string, name: string, count: int}>}
     */
    private function coveragePayload(): array
    {
        $departmentCounts = QualityIndicator::query()
            ->where('type', 'department')
            ->whereNotNull('department_id')
            ->selectRaw('department_id, COUNT(*) as total')
            ->groupBy('department_id')
            ->pluck('total', 'department_id');

        $teamCounts = QualityIndicator::query()
            ->where('type', 'ha_team')
            ->whereNotNull('team_id')
            ->selectRaw('team_id, COUNT(*) as total')
            ->groupBy('team_id')
            ->pluck('total', 'team_id');

        $departments = Department::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Department $department) => [
                'id' => $department->id,
                'name' => $department->name,
                'count' => (int) ($departmentCounts[$department->id] ?? 0),
            ]);

        $teams = TeamHa::query()
            ->orderBy('abbreviation')
            ->get(['id', 'abbreviation', 'name_th'])
            ->map(fn (TeamHa $team) => [
                'id' => $team->id,
                'abbreviation' => $team->abbreviation,
                'name' => $team->name_th,
                'count' => (int) ($teamCounts[$team->id] ?? 0),
            ]);

        $sortCounts = function ($rows) {
            return $rows->sort(function (array $a, array $b) {
                if (($a['count'] === 0) !== ($b['count'] === 0)) {
                    return $a['count'] === 0 ? -1 : 1;
                }
                if ($a['count'] !== $b['count']) {
                    return $b['count'] <=> $a['count'];
                }

                return strcmp((string) ($a['name'] ?? ''), (string) ($b['name'] ?? ''));
            })->values();
        };

        return [
            'organization' => QualityIndicator::query()->where('type', 'organization')->count(),
            'departments' => $sortCounts($departments),
            'teams' => $sortCounts($teams),
        ];
    }

    private function styleCoverageHeader($sheet, string $range): void
    {
        $sheet->getStyle($range)->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '047857']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $sheet->freezePane('A2');
    }

    public function dashboard(Request $request)
    {
        $type = $request->query('type'); // optional: department|ha_team|organization|null=all
        $departmentId = $request->filled('department_id') ? (int) $request->query('department_id') : null;
        $teamId = $request->filled('team_id') ? (int) $request->query('team_id') : null;
        $category = $request->filled('category') ? trim((string) $request->query('category')) : null;

        $query = QualityIndicator::with(['family.master.entries' => function ($q) {
            $q->orderBy('period_date', 'desc')->orderBy('series_key')->limit(24);
        }, 'department', 'team'])
            ->where('is_active', true);

        if (in_array($type, ['department', 'ha_team', 'organization'], true)) {
            $query->where('type', $type);
        }
        if ($departmentId) {
            $query->where('department_id', $departmentId);
        }
        if ($teamId) {
            $query->where('team_id', $teamId);
        }
        if ($type === 'organization' && $category && $category !== 'all') {
            $query->where('category', $category);
        }

        $indicators = $query->orderBy('code')->get()->map(function (QualityIndicator $indicator) {
            $this->families->overlaySharedFields($indicator);
            $master = $indicator->family?->master ?? $indicator;
            $indicator->setRelation('entries', $master->entries);

            return $indicator;
        });

        return Inertia::render('QualityIndicators/Dashboard', [
            'indicators' => $indicators,
            'departments' => Department::query()->orderBy('name')->get(['id', 'name']),
            'teams' => TeamHa::query()->orderBy('abbreviation')->get(['id', 'abbreviation', 'name_th']),
            'filters' => [
                'type' => $type,
                'department_id' => $departmentId,
                'team_id' => $teamId,
                'category' => $category,
            ],
        ]);
    }

    public function destroy(QualityIndicator $indicator)
    {
        $type = $indicator->type ?: 'department';
        $query = ['type' => $type];

        if ($type === 'department' && $indicator->department_id) {
            $query['department_id'] = $indicator->department_id;
        }
        if ($type === 'ha_team' && $indicator->team_id) {
            $query['team_id'] = $indicator->team_id;
        }

        $this->families->deleteIndicator($indicator);

        return redirect()
            ->route('quality-indicators.index', $query)
            ->with('success', 'ย้ายตัวชี้วัดไปถังขยะแล้ว — กู้คืนได้จากเมนูถังขยะ');
    }

    public function restore(int $indicator)
    {
        $model = QualityIndicator::onlyTrashed()->findOrFail($indicator);

        $this->families->restoreIndicator($model);

        $type = $model->type ?: 'department';
        $query = ['type' => $type];

        if ($type === 'department' && $model->department_id) {
            $query['department_id'] = $model->department_id;
        }
        if ($type === 'ha_team' && $model->team_id) {
            $query['team_id'] = $model->team_id;
        }

        return redirect()
            ->route('quality-indicators.index', $query)
            ->with('success', 'กู้คืนตัวชี้วัดเรียบร้อย');
    }

    public function exportIndicatorPdf(QualityIndicator $indicator, ThaiPdfService $pdf): Response
    {
        $this->families->ensureFamily($indicator);
        $master = $this->families->masterOf($indicator);
        $this->families->overlaySharedFields($indicator);
        $indicator->load(['department', 'team']);
        $master->load(['entries' => fn ($q) => $q->orderBy('period_date', 'asc')]);
        $indicator->setRelation('entries', $master->entries);

        $entries = $master->entries;
        $latest = $entries->sortByDesc(fn ($e) => (string) $e->period_date)->first();
        $latestIsNa = $latest ? (bool) $latest->is_na : false;
        $measurable = $entries->filter(fn ($e) => ! $e->is_na && $e->result_value !== null);
        $latestMeasurable = $measurable->sortByDesc(fn ($e) => (string) $e->period_date)->first();
        $latestPass = $latestIsNa
            ? null
            : ($latestMeasurable ? $this->isPass($indicator, (float) $latestMeasurable->result_value) : null);
        $passCount = $measurable->filter(fn ($e) => $this->isPass($indicator, (float) $e->result_value))->count();
        $failCount = $measurable->count() - $passCount;
        $naCount = $entries->filter(fn ($e) => (bool) $e->is_na)->count();

        [$fontRegularUri, $fontBoldUri] = $pdf->fontUris();
        $now = now()->timezone(config('app.timezone'));

        $html = view('quality-indicators.indicator-pdf', [
            'hospitalName' => self::HOSPITAL_NAME,
            'indicator' => $indicator,
            'entries' => $entries,
            'latest' => $latest,
            'latestIsNa' => $latestIsNa,
            'latestPass' => $latestPass,
            'passCount' => $passCount,
            'failCount' => $failCount,
            'naCount' => $naCount,
            'ownerLabel' => $this->ownerLabel($indicator),
            'typeLabel' => $this->typeLabel($indicator->type),
            'generatedAt' => $this->formatThaiDateTime($now),
            'generatedAtDate' => $this->formatThaiDate($now),
            'formatNum' => fn ($v) => $this->formatNum($v),
            'formatPeriod' => fn ($d) => $this->formatIndicatorPeriod($d, $indicator->frequency),
            'isPass' => fn ($v) => $this->isPass($indicator, (float) $v),
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
        ])->render();

        $code = $indicator->code ?: 'QI-'.$indicator->id;
        $filename = 'ตัวชี้วัด-'.$code.'.pdf';

        return response($pdf->render($html, 'portrait', true), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }

    public function exportGroupPdf(Request $request, ThaiPdfService $pdf): Response
    {
        $type = $request->query('type', 'department');
        if (! in_array($type, ['department', 'ha_team', 'organization'], true)) {
            $type = 'department';
        }

        $departmentId = $request->filled('department_id') ? (int) $request->query('department_id') : null;
        $teamId = $request->filled('team_id') ? (int) $request->query('team_id') : null;
        $category = $request->filled('category') ? trim((string) $request->query('category')) : null;

        $currentFy = ThaiFiscalPeriod::currentFiscalYearBe();
        $endYear = ($type === 'organization') ? ((int) now()->year + 543) : $currentFy;
        $years = range($endYear - 4, $endYear);

        $groups = $this->buildReportGroups($type, $departmentId, $teamId, $years, $category);

        if ($groups->isEmpty()) {
            abort(404, 'ไม่พบข้อมูลตัวชี้วัดสำหรับรายงานนี้');
        }

        $yearHeaders = [];
        foreach ($years as $yr) {
            $yearHeaders[$yr] = "ปี {$yr}";
        }

        [$fontRegularUri, $fontBoldUri] = $pdf->fontUris();
        $now = now()->timezone(config('app.timezone'));

        $reportTitle = match ($type) {
            'ha_team' => $teamId ? 'รายงานตัวชี้วัดทีม HA' : 'รายงานตัวชี้วัดทีม HA (แยกตามทีม)',
            'organization' => ($category && $category !== 'all')
                ? "รายงานตัวชี้วัดระดับองค์กร: {$category}"
                : 'รายงานตัวชี้วัดระดับองค์กร',
            default => $departmentId ? 'รายงานตัวชี้วัดแผนก' : 'รายงานตัวชี้วัดแผนก (แยกตามแผนก)',
        };

        $html = view('quality-indicators.group-pdf', [
            'type' => $type,
            'hospitalName' => self::HOSPITAL_NAME,
            'reportTitle' => $reportTitle,
            'groups' => $groups,
            'years' => $years,
            'yearHeaders' => $yearHeaders,
            'currentFy' => $currentFy,
            'generatedAt' => $this->formatThaiDateTime($now),
            'generatedAtDate' => $this->formatThaiDate($now),
            'formatNum' => fn ($v) => $this->formatNum($v),
            'formatPeriod' => fn ($d) => $this->formatThaiPeriod($d),
            'isPassFor' => fn ($ind, $v) => $this->isPass($ind, (float) $v),
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
        ])->render();

        $filename = match ($type) {
            'ha_team' => $teamId && ($groups->first()['slug'] ?? null)
                ? 'ตัวชี้วัด-ทีม-'.$groups->first()['slug'].'.pdf'
                : 'รายงานตัวชี้วัด-ทีมHA.pdf',
            'organization' => ($category && $category !== 'all')
                ? 'รายงานตัวชี้วัด-องค์กร-'.($category === 'แบบประเมินตนเอง SAR' ? 'SAR' : 'StrategicPlan').'.pdf'
                : 'รายงานตัวชี้วัด-องค์กร.pdf',
            default => $departmentId && ($groups->first()['slug'] ?? null)
                ? 'ตัวชี้วัด-แผนก-'.$groups->first()['slug'].'.pdf'
                : 'รายงานตัวชี้วัด-แผนก.pdf',
        };

        return response($pdf->render($html, 'landscape', true), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }

    /**
     * @param  array<int, int>  $years
     * @return Collection<int, array{title: string, subtitle: string, slug: string, categories: Collection, indicators: Collection, with_data: int, pass_count: int, fail_count: int, no_data: int}>
     */
    private function buildReportGroups(string $type, ?int $departmentId, ?int $teamId, array $years, ?string $category = null): Collection
    {
        $baseQuery = QualityIndicator::query()
            ->where('type', $type)
            ->with([
                'department:id,name',
                'team:id,abbreviation,name_th',
                'family.master.entries' => fn ($q) => $q->orderBy('period_date', 'desc'),
            ])
            ->orderBy('category')
            ->orderBy('code');

        if ($type === 'department') {
            if ($departmentId) {
                $indicators = (clone $baseQuery)->where('department_id', $departmentId)->get();
                $dept = Department::find($departmentId);

                return collect([$this->makeGroup(
                    $dept?->name ?: 'แผนก',
                    'ระดับแผนก/ฝ่าย',
                    $dept?->name ?: (string) $departmentId,
                    $indicators,
                    $years
                )]);
            }

            $indicators = $baseQuery->get()->groupBy('department_id');

            return $indicators->map(function (Collection $items, $deptId) use ($years) {
                $dept = $items->first()?->department;
                $title = $dept?->name ?: ('แผนก #'.$deptId);

                return $this->makeGroup($title, 'ระดับแผนก/ฝ่าย', $title, $items->values(), $years);
            })->values();
        }

        if ($type === 'ha_team') {
            if ($teamId) {
                $indicators = (clone $baseQuery)->where('team_id', $teamId)->get();
                $team = TeamHa::find($teamId);
                $title = $team
                    ? trim(($team->abbreviation ? $team->abbreviation.' - ' : '').$team->name_th)
                    : 'ทีม HA';

                return collect([$this->makeGroup(
                    $title,
                    'ระดับทีม HA',
                    $team?->abbreviation ?: $title,
                    $indicators,
                    $years
                )]);
            }

            $indicators = $baseQuery->get()->groupBy('team_id');

            return $indicators->map(function (Collection $items, $tid) use ($years) {
                $team = $items->first()?->team;
                $title = $team
                    ? trim(($team->abbreviation ? $team->abbreviation.' - ' : '').$team->name_th)
                    : ('ทีม #'.$tid);

                return $this->makeGroup($title, 'ระดับทีม HA', $team?->abbreviation ?: $title, $items->values(), $years);
            })->values();
        }

        if ($category && $category !== 'all') {
            $indicators = (clone $baseQuery)->where('category', $category)->get();

            return collect([$this->makeGroup(
                $category,
                'ตัวชี้วัดระดับองค์กร',
                $category === 'แบบประเมินตนเอง SAR' ? 'SAR' : 'StrategicPlan',
                $indicators,
                $years
            )]);
        }

        $all = $baseQuery->get();
        if ($all->isEmpty()) {
            return collect();
        }

        $hasCategories = $all->pluck('category')->filter()->unique();
        if ($hasCategories->count() > 1) {
            return $all->groupBy(fn ($i) => $i->category ?: 'ทั่วไป')->map(function (Collection $items, $cat) use ($years) {
                return $this->makeGroup($cat, 'ตัวชี้วัดระดับองค์กร', $cat, $items->values(), $years);
            })->values();
        }

        return collect([$this->makeGroup('ระดับองค์กร', 'ตัวชี้วัดภาพรวมองค์กร', 'organization', $all, $years)]);
    }

    /**
     * @param  array<int, int>  $years
     * @return array{title: string, subtitle: string, slug: string, categories: Collection, indicators: Collection, with_data: int, pass_count: int, fail_count: int, no_data: int}
     */
    private function makeGroup(string $title, string $subtitle, string $slug, Collection $indicators, array $years): array
    {
        $rows = $indicators->map(function (QualityIndicator $indicator) use ($years) {
            $this->families->overlaySharedFields($indicator);
            $master = $indicator->family?->master ?? $indicator;
            $entries = $master->entries ?? collect();

            $isOrg = ($indicator->type === 'organization');
            $byFy = [];
            foreach ($entries as $e) {
                if (! $e->period_date) {
                    continue;
                }
                $dt = Carbon::parse($e->period_date);
                $fy = $isOrg
                    ? ((int) $dt->year + 543)
                    : (($dt->month >= 10) ? ((int) $dt->year + 543 + 1) : ((int) $dt->year + 543));
                $byFy[$fy][] = $e;
            }

            $tVal = $indicator->target_value !== null
                ? ((float) $indicator->target_value == (int) $indicator->target_value
                    ? (string) (int) $indicator->target_value
                    : number_format((float) $indicator->target_value, 2))
                : null;

            $seriesDefsForTarget = is_array($indicator->series) ? $indicator->series : [];
            if ($seriesDefsForTarget !== []) {
                $targetDisplay = collect($seriesDefsForTarget)->map(function ($serie) use ($indicator) {
                    return trim(($serie['label'] ?? '').' '.($serie['target_operator'] ?? '').' '.($serie['target_value'] ?? '').' '.($indicator->unit ?? ''));
                })->implode(' · ');
            } elseif ($tVal !== null) {
                $op = trim($indicator->target_operator ?? '');
                $targetDisplay = ($op === '=' || $op === '') ? $tVal : ($op.' '.$tVal);
                if (! empty($indicator->unit)) {
                    $targetDisplay .= ' '.$indicator->unit;
                }
            } else {
                $targetDisplay = '-';
            }

            $yearlyValues = [];
            $hasAnyData = false;
            $seriesDefs = is_array($indicator->series) ? $indicator->series : [];

            foreach ($years as $yr) {
                if (! empty($byFy[$yr]) && $seriesDefs !== []) {
                    $yearEntries = collect($byFy[$yr]);
                    $parts = [];
                    foreach ($seriesDefs as $serie) {
                        $match = $yearEntries->first(fn ($e) => (string) $e->series_key === (string) ($serie['key'] ?? ''));
                        $label = (string) ($serie['label'] ?? $serie['key'] ?? '');
                        if ($match && $match->is_na) {
                            $parts[] = $label.' N/A';
                        } elseif ($match && $match->result_value !== null) {
                            $parts[] = $label.' '.number_format((float) $match->result_value, 2);
                        } else {
                            $parts[] = $label.' -';
                        }
                    }
                    $hasAnyData = true;
                    $yearlyValues[$yr] = [
                        'value' => implode(' · ', $parts),
                        'raw' => null,
                        'pass' => null,
                        'entry' => $yearEntries->first(),
                    ];

                    continue;
                }

                if (! empty($byFy[$yr])) {
                    $yearEntries = collect($byFy[$yr])->sortByDesc(fn ($e) => (string) $e->period_date);
                    $latestEntry = $yearEntries->first();
                    $measurableEntry = $yearEntries->first(fn ($e) => ! $e->is_na && $e->result_value !== null && $e->result_value !== '');
                    if ($latestEntry && $latestEntry->is_na) {
                        $hasAnyData = true;
                        $yearlyValues[$yr] = [
                            'value' => 'N/A',
                            'raw' => null,
                            'pass' => $measurableEntry ? $this->isPass($indicator, (float) $measurableEntry->result_value) : null,
                            'entry' => $latestEntry,
                        ];
                    } elseif ($latestEntry && $latestEntry->result_value !== null && $latestEntry->result_value !== '') {
                        $val = $latestEntry->result_value;
                        $hasAnyData = true;
                        $formattedVal = (float) $val == (int) $val ? (string) (int) $val : number_format((float) $val, 2);
                        $isPass = $this->isPass($indicator, (float) $val);
                        $yearlyValues[$yr] = [
                            'value' => $formattedVal,
                            'raw' => (float) $val,
                            'pass' => $isPass,
                            'entry' => $latestEntry,
                        ];
                    } else {
                        $yearlyValues[$yr] = [
                            'value' => '-',
                            'raw' => null,
                            'pass' => null,
                            'entry' => null,
                        ];
                    }
                } else {
                    $yearlyValues[$yr] = [
                        'value' => '-',
                        'raw' => null,
                        'pass' => null,
                        'entry' => null,
                    ];
                }
            }

            $latest = $entries->sortByDesc(fn ($e) => (string) $e->period_date)->first();
            $latestMeasurable = $entries
                ->filter(fn ($e) => ! $e->is_na && $e->result_value !== null && $e->result_value !== '')
                ->sortByDesc(fn ($e) => (string) $e->period_date)
                ->first();
            $pass = $latestMeasurable ? $this->isPass($indicator, (float) $latestMeasurable->result_value) : null;

            // Evaluate pass/fail against latest year with a numeric result. N/A is not a fail.
            $latestStatus = null;
            foreach (array_reverse($years) as $yr) {
                if (isset($yearlyValues[$yr]) && $yearlyValues[$yr]['pass'] !== null && ($yearlyValues[$yr]['raw'] !== null || $yearlyValues[$yr]['value'] === 'N/A')) {
                    $latestStatus = $yearlyValues[$yr]['pass'];
                    break;
                }
                if (isset($yearlyValues[$yr]) && $yearlyValues[$yr]['raw'] !== null) {
                    $latestStatus = $yearlyValues[$yr]['pass'];
                    break;
                }
            }
            if ($latestStatus === null && $pass !== null) {
                $latestStatus = $pass;
            }
            if ($latestStatus === null && $entries->contains(fn ($e) => (bool) $e->is_na)) {
                $latestStatus = 'na';
            }

            return [
                'indicator' => $indicator,
                'code' => $indicator->code,
                'name' => $indicator->name,
                'category' => trim($indicator->category ?? '') ?: 'ตัวชี้วัดทั่วไป',
                'target_display' => $targetDisplay,
                'yearly_values' => $yearlyValues,
                'latest_status' => $latestStatus,
                'has_data' => $hasAnyData,
                'entries' => $entries->sortBy(fn ($e) => (string) $e->period_date)->values(),
                'latest' => $latest,
                'pass' => $pass,
            ];
        });

        $categories = $rows->groupBy('category')->map(function (Collection $items, string $catName) {
            return [
                'name' => $catName,
                'indicators' => $items->values(),
            ];
        })->values();

        $withData = $rows->filter(fn ($r) => $r['has_data'] || $r['latest'] !== null)->count();
        $passCount = $rows->filter(fn ($r) => $r['pass'] === true)->count();
        $failCount = $rows->filter(fn ($r) => $r['pass'] === false)->count();

        return [
            'title' => $title,
            'subtitle' => $subtitle,
            'slug' => preg_replace('/[^\p{L}\p{N}\-_]+/u', '-', $slug) ?: 'group',
            'categories' => $categories,
            'indicators' => $rows,
            'with_data' => $withData,
            'pass_count' => $passCount,
            'fail_count' => $failCount,
            'no_data' => $rows->count() - $withData,
        ];
    }

    private function assertEntryBelongsToFamily(QualityIndicator $indicator, QualityIndicatorEntry $entry): void
    {
        $master = $this->families->masterOf($indicator);
        if ((int) $entry->quality_indicator_id !== (int) $master->id) {
            abort(404);
        }
    }

    private function isPass(QualityIndicator $indicator, float $value): bool
    {
        $target = $indicator->target_value !== null ? (float) $indicator->target_value : null;
        if ($target === null) {
            return false;
        }

        return match ($indicator->target_operator) {
            '<' => $value < $target,
            '<=' => $value <= $target,
            '>' => $value > $target,
            '>=' => $value >= $target,
            '=' => abs($value - $target) < 0.00001,
            default => false,
        };
    }

    private function ownerLabel(QualityIndicator $indicator): string
    {
        return match ($indicator->type) {
            'department' => $indicator->department?->name ?: 'แผนก',
            'ha_team' => $indicator->team
                ? trim(($indicator->team->abbreviation ? $indicator->team->abbreviation.' - ' : '').$indicator->team->name_th)
                : 'ทีม HA',
            default => 'ระดับองค์กร',
        };
    }

    private function typeLabel(?string $type): string
    {
        return match ($type) {
            'department' => 'ระดับแผนก/ฝ่าย',
            'ha_team' => 'ระดับทีม HA',
            'organization' => 'ระดับองค์กร',
            default => '-',
        };
    }

    private function formatNum(mixed $value, int $digits = 2): string
    {
        if ($value === null || $value === '') {
            return '-';
        }

        if (! is_numeric($value)) {
            return '-';
        }

        return number_format((float) $value, $digits, '.', ',');
    }

    /**
     * @param  list<int>  $indicatorIds
     * @return Collection<int, QualityIndicatorEntry>
     */
    private function latestEntriesByIndicator(array $indicatorIds): Collection
    {
        if ($indicatorIds === []) {
            return collect();
        }

        $latestDates = QualityIndicatorEntry::query()
            ->select('quality_indicator_id')
            ->selectRaw('MAX(period_date) as period_date')
            ->whereIn('quality_indicator_id', $indicatorIds)
            ->groupBy('quality_indicator_id');

        return QualityIndicatorEntry::query()
            ->joinSub($latestDates, 'latest_periods', function ($join) {
                $join->on('quality_indicator_entries.quality_indicator_id', '=', 'latest_periods.quality_indicator_id')
                    ->on('quality_indicator_entries.period_date', '=', 'latest_periods.period_date');
            })
            ->orderBy('quality_indicator_entries.series_key')
            ->get([
                'quality_indicator_entries.quality_indicator_id',
                'quality_indicator_entries.period_date',
                'quality_indicator_entries.result_value',
                'quality_indicator_entries.is_na',
                'quality_indicator_entries.series_key',
            ])
            ->groupBy('quality_indicator_id')
            ->map(fn (Collection $rows) => $rows->first(fn ($row) => ($row->series_key ?? '') === '') ?? $rows->first());
    }

    private function formatIndicatorPeriod(mixed $date, ?string $frequency = null): string
    {
        if (! $date) {
            return '-';
        }

        $dt = $date instanceof Carbon ? $date : Carbon::parse($date);
        if ($frequency === 'Yearly') {
            return 'ปี '.((int) $dt->format('Y') + 543);
        }

        return $this->formatThaiPeriod($date);
    }

    private function formatThaiPeriod(mixed $date): string
    {
        if (! $date) {
            return '-';
        }

        $dt = $date instanceof Carbon ? $date : Carbon::parse($date);
        $months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

        return $months[(int) $dt->format('n') - 1].' '.((int) $dt->format('Y') + 543);
    }

    private function formatThaiDate(Carbon $dt): string
    {
        $months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

        return $dt->format('j').' '.$months[(int) $dt->format('n') - 1].' '.((int) $dt->format('Y') + 543);
    }

    private function formatThaiDateTime(Carbon $dt): string
    {
        return $this->formatThaiDate($dt).' '.$dt->format('H:i');
    }
}
