<?php

namespace App\Http\Controllers;

use App\Models\QualityIndicator;
use App\Models\QualityIndicatorEntry;
use App\Models\Department;
use App\Models\TeamHa;
use App\Services\QualityIndicatorFamilyService;
use App\Services\ThaiPdfService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class QualityIndicatorController extends Controller
{
    private const HOSPITAL_NAME = 'โรงพยาบาลค่ายสุรสิงหนาท';

    public function __construct(private QualityIndicatorFamilyService $families) {}

    public function index(Request $request)
    {
        $type = $request->query('type', 'department'); // 'department', 'ha_team', 'organization'
        if (! in_array($type, ['department', 'ha_team', 'organization'], true)) {
            $type = 'department';
        }

        $departmentId = $request->filled('department_id') ? (int) $request->query('department_id') : null;
        $teamId = $request->filled('team_id') ? (int) $request->query('team_id') : null;

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

        $indicators = $query->get()->map(function (QualityIndicator $indicator) {
            $this->families->overlaySharedFields($indicator);
            $master = $this->families->masterOf($indicator);
            $indicator->setAttribute('entries_count', $master->entries()->count());
            $indicator->setAttribute('aliases_count', max(0, $indicator->family?->indicators()->count() - 1));

            return $indicator;
        });

        $departments = Department::query()->orderBy('name')->get(['id', 'name']);
        $teams = TeamHa::query()->orderBy('abbreviation')->get(['id', 'abbreviation', 'name_th']);
        $linkableIndicators = QualityIndicator::query()
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
            'departments' => $departments,
            'teams' => $teams,
            'linkableIndicators' => $linkableIndicators,
            'filters' => [
                'department_id' => $departmentId,
                'team_id' => $teamId,
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
            'code' => 'nullable|string|unique:quality_indicators,code',
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
            'code' => 'nullable|string|unique:quality_indicators,code,' . $indicator->id,
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
            $query->orderBy('period_date', 'asc')->limit(36);
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
            'code' => 'required|string|unique:quality_indicators,code',
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
        $validated = $this->validateEntry($request);
        $validated['created_by'] = Auth::id();
        $master = $this->families->masterOf($indicator);

        $entry = $master->entries()->whereDate('period_date', $validated['period_date'])->first();

        if ($entry) {
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
        $duplicate = $master->entries()
            ->whereDate('period_date', $validated['period_date'])
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
        $validated = $request->validate([
            'period_date' => 'required|date',
            'numerator' => 'nullable|numeric',
            'denominator' => 'nullable|numeric',
            'result_value' => 'required|numeric',
            'notes' => 'nullable|string',
        ]);

        foreach (['numerator', 'denominator', 'result_value'] as $field) {
            if (array_key_exists($field, $validated) && $validated[$field] !== null && $validated[$field] !== '') {
                $validated[$field] = round((float) $validated[$field], 2);
            }
        }

        return $validated;
    }

    public function dashboard(Request $request)
    {
        $type = $request->query('type'); // optional: department|ha_team|organization|null=all
        $departmentId = $request->filled('department_id') ? (int) $request->query('department_id') : null;
        $teamId = $request->filled('team_id') ? (int) $request->query('team_id') : null;

        $query = QualityIndicator::with(['family.master.entries' => function ($q) {
            $q->orderBy('period_date', 'desc')->limit(1);
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
            ->with('success', 'ลบตัวชี้วัดเรียบร้อย');
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
        $latestPass = $latest ? $this->isPass($indicator, (float) $latest->result_value) : null;
        $passCount = $entries->filter(fn ($e) => $this->isPass($indicator, (float) $e->result_value))->count();
        $failCount = $entries->count() - $passCount;

        [$fontRegularUri, $fontBoldUri] = $pdf->fontUris();
        $now = now()->timezone(config('app.timezone'));

        $html = view('quality-indicators.indicator-pdf', [
            'hospitalName' => self::HOSPITAL_NAME,
            'indicator' => $indicator,
            'entries' => $entries,
            'latest' => $latest,
            'latestPass' => $latestPass,
            'passCount' => $passCount,
            'failCount' => $failCount,
            'ownerLabel' => $this->ownerLabel($indicator),
            'typeLabel' => $this->typeLabel($indicator->type),
            'generatedAt' => $this->formatThaiDateTime($now),
            'generatedAtDate' => $this->formatThaiDate($now),
            'formatNum' => fn ($v) => $this->formatNum($v),
            'formatPeriod' => fn ($d) => $this->formatThaiPeriod($d),
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

        $groups = $this->buildReportGroups($type, $departmentId, $teamId);

        if ($groups->isEmpty()) {
            abort(404, 'ไม่พบข้อมูลตัวชี้วัดสำหรับรายงานนี้');
        }

        [$fontRegularUri, $fontBoldUri] = $pdf->fontUris();
        $now = now()->timezone(config('app.timezone'));

        $reportTitle = match ($type) {
            'ha_team' => $teamId ? 'รายงานตัวชี้วัดทีม HA' : 'รายงานตัวชี้วัดทีม HA (แยกตามทีม)',
            'organization' => 'รายงานตัวชี้วัดระดับองค์กร',
            default => $departmentId ? 'รายงานตัวชี้วัดแผนก' : 'รายงานตัวชี้วัดแผนก (แยกตามแผนก)',
        };

        $html = view('quality-indicators.group-pdf', [
            'hospitalName' => self::HOSPITAL_NAME,
            'reportTitle' => $reportTitle,
            'groups' => $groups,
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
            'organization' => 'รายงานตัวชี้วัด-องค์กร.pdf',
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
     * @return Collection<int, array{title: string, subtitle: string, slug: string, indicators: Collection, with_data: int, pass_count: int, fail_count: int, no_data: int}>
     */
    private function buildReportGroups(string $type, ?int $departmentId, ?int $teamId): Collection
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
                    $indicators
                )]);
            }

            $indicators = $baseQuery->get()->groupBy('department_id');

            return $indicators->map(function (Collection $items, $deptId) {
                $dept = $items->first()?->department;
                $title = $dept?->name ?: ('แผนก #'.$deptId);

                return $this->makeGroup($title, 'ระดับแผนก/ฝ่าย', $title, $items->values());
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
                    $indicators
                )]);
            }

            $indicators = $baseQuery->get()->groupBy('team_id');

            return $indicators->map(function (Collection $items, $tid) {
                $team = $items->first()?->team;
                $title = $team
                    ? trim(($team->abbreviation ? $team->abbreviation.' - ' : '').$team->name_th)
                    : ('ทีม #'.$tid);

                return $this->makeGroup($title, 'ระดับทีม HA', $team?->abbreviation ?: $title, $items->values());
            })->values();
        }

        $indicators = $baseQuery->get();

        return collect([$this->makeGroup('ระดับองค์กร', 'ตัวชี้วัดภาพรวมองค์กร', 'organization', $indicators)]);
    }

    private function makeGroup(string $title, string $subtitle, string $slug, Collection $indicators): array
    {
        $rows = $indicators->map(function (QualityIndicator $indicator) {
            $this->families->overlaySharedFields($indicator);
            $master = $indicator->family?->master ?? $indicator;
            $entries = $master->entries
                ->sortByDesc(fn ($e) => (string) $e->period_date)
                ->take(12)
                ->values();
            $latest = $entries->first();
            $pass = $latest ? $this->isPass($indicator, (float) $latest->result_value) : null;

            return [
                'indicator' => $indicator,
                'entries' => $entries->sortBy(fn ($e) => (string) $e->period_date)->values(),
                'latest' => $latest,
                'pass' => $pass,
            ];
        });

        $withData = $rows->filter(fn ($r) => $r['latest'] !== null)->count();
        $passCount = $rows->filter(fn ($r) => $r['pass'] === true)->count();
        $failCount = $rows->filter(fn ($r) => $r['pass'] === false)->count();

        return [
            'title' => $title,
            'subtitle' => $subtitle,
            'slug' => preg_replace('/[^\p{L}\p{N}\-_]+/u', '-', $slug) ?: 'group',
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
