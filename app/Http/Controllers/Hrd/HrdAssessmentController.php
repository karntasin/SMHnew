<?php

namespace App\Http\Controllers\Hrd;

use App\Http\Controllers\Controller;
use App\Models\HrdAssessmentAnswer;
use App\Models\HrdAssessmentForm;
use App\Models\HrdAssessmentItem;
use App\Models\HrdAssessmentResponse;
use App\Models\HrdAssessmentSection;
use App\Models\HrdAssessmentSubmission;
use App\Models\HrdCompetency;
use App\Models\HrdCompetencyAssessment;
use App\Models\HrdPositionCompetency;
use App\Models\User;
use App\Services\Hrd\HrdAssessmentScoreService;
use App\Services\Hrd\HrdCompletionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class HrdAssessmentController extends Controller
{
    public function __construct(
        private HrdCompletionService $hrd,
        private HrdAssessmentScoreService $scores,
    ) {}

    public function index()
    {
        $actor = Auth::user();
        $fiscal = $this->hrd->fiscalBounds();
        $forms = HrdAssessmentForm::where('is_active', true)->orderBy('sort')->orderBy('id')->get();
        $submissions = HrdAssessmentSubmission::where('user_id', $actor->id)
            ->where('fiscal_year', $fiscal['year'])
            ->get()
            ->keyBy('form_id');
        $ownResponses = HrdAssessmentResponse::where('user_id', $actor->id)
            ->where('fiscal_year', $fiscal['year'])
            ->get()
            ->keyBy('form_id');
        $competency = $this->competencyStatus($actor, $fiscal['year']);

        return Inertia::render('HRD/Assessments/Index', [
            'fiscalLabel' => $fiscal['label'],
            'canManageStaff' => $this->hrd->canManageStaff($actor),
            'canConfigure' => $this->hrd->isOrgEditor($actor),
            'forms' => $forms->map(function (HrdAssessmentForm $form) use ($submissions, $ownResponses, $competency) {
                $submitted = $form->kind === 'competency'
                    ? $competency['submitted']
                    : $submissions->has($form->id);
                $response = $ownResponses->get($form->id);
                $showScore = $submitted && $form->visibility !== 'anonymous' && $form->kind !== 'competency';

                return [
                    'id' => $form->id,
                    'code' => $form->code,
                    'title' => $form->title,
                    'description' => $form->description,
                    'kind' => $form->kind,
                    'visibility' => $form->visibility,
                    'submitted' => $submitted,
                    'score' => $showScore ? $response?->total_score : ($form->kind === 'competency' ? $competency['average'] : null),
                    'band_label' => $showScore ? $response?->band_label : null,
                    'status_label' => $form->kind === 'competency' ? $competency['label'] : ($submitted ? 'ส่งแล้ว' : 'ยังไม่ทำ'),
                ];
            })->values(),
        ]);
    }

    public function fill(HrdAssessmentForm $form)
    {
        if ($form->kind === 'competency') {
            return redirect()->route('km.learn.assessments.competency');
        }

        $actor = Auth::user();
        $fiscal = $this->hrd->fiscalBounds();
        $form->load('sections.items');
        $submitted = HrdAssessmentSubmission::where('form_id', $form->id)
            ->where('user_id', $actor->id)
            ->where('fiscal_year', $fiscal['year'])
            ->exists();

        return Inertia::render('HRD/Assessments/Fill', [
            'fiscalLabel' => $fiscal['label'],
            'form' => [
                'id' => $form->id,
                'title' => $form->title,
                'description' => $form->description,
                'visibility' => $form->visibility,
                'disclaimer' => $form->disclaimer,
                'sections' => $form->sections->map(fn ($section) => [
                    'id' => $section->id,
                    'title' => $section->title,
                    'items' => $section->items->map(fn ($item) => [
                        'id' => $item->id,
                        'prompt' => $item->prompt,
                    ]),
                ]),
            ],
            'submitted' => $submitted,
            'showScore' => $submitted && $form->visibility !== 'anonymous',
        ]);
    }

    public function submit(Request $request, HrdAssessmentForm $form)
    {
        if ($form->kind !== 'survey' || ! $form->is_active) {
            abort(404);
        }

        $actor = Auth::user();
        $fiscal = $this->hrd->fiscalBounds();
        $form->load('sections.items');
        $itemIds = $form->sections->flatMap(fn ($section) => $section->items->pluck('id'));
        if ($itemIds->isEmpty()) {
            return back()->withErrors(['form' => 'แบบนี้ยังไม่มีข้อคำถาม']);
        }

        $exists = HrdAssessmentSubmission::where('form_id', $form->id)
            ->where('user_id', $actor->id)
            ->where('fiscal_year', $fiscal['year'])
            ->exists();
        if ($exists) {
            return back()->withErrors(['form' => 'ส่งแบบนี้ในปีงบประมาณปัจจุบันแล้ว']);
        }

        $data = $request->validate([
            'answers' => 'required|array',
        ]);
        $answers = [];
        foreach ($itemIds as $itemId) {
            $value = $data['answers'][$itemId] ?? $data['answers'][(string) $itemId] ?? null;
            if (! in_array((int) $value, [1, 2, 3, 4, 5], true)) {
                return back()->withErrors(['answers' => 'กรุณาตอบทุกข้อด้วยคะแนน 1 ถึง 5']);
            }
            $answers[$itemId] = (int) $value;
        }

        $summary = $this->scores->summarize($form, $answers);
        $departmentId = $this->departmentId($actor);

        DB::transaction(function () use ($form, $actor, $fiscal, $departmentId, $summary, $answers) {
            HrdAssessmentSubmission::create([
                'form_id' => $form->id,
                'user_id' => $actor->id,
                'fiscal_year' => $fiscal['year'],
                'department_id' => $departmentId,
                'submitted_at' => now(),
            ]);

            $response = HrdAssessmentResponse::create([
                'form_id' => $form->id,
                'fiscal_year' => $fiscal['year'],
                'department_id' => $departmentId,
                'user_id' => $form->visibility === 'anonymous' ? null : $actor->id,
                'total_score' => $summary['total_score'],
                'band' => $summary['band'],
                'band_label' => $summary['band_label'],
                'interpretation' => $summary['interpretation'],
                'section_scores' => $summary['section_scores'],
            ]);

            foreach ($answers as $itemId => $value) {
                HrdAssessmentAnswer::create([
                    'response_id' => $response->id,
                    'item_id' => $itemId,
                    'value' => $value,
                ]);
            }
        });

        return redirect()
            ->route('km.learn.assessments.results')
            ->with('success', 'บันทึกแบบประเมินแล้ว');
    }

    public function results(Request $request)
    {
        $actor = Auth::user();
        $editor = $this->hrd->canManageStaff($actor);
        $target = $this->hrd->resolveManagedUser($actor, $editor ? $request->integer('user_id') : null);
        $viewingOther = $target->id !== $actor->id;
        $fiscal = $this->hrd->fiscalBounds();

        $responses = HrdAssessmentResponse::with('form:id,title,code,visibility,kind')
            ->where('user_id', $target->id)
            ->where('fiscal_year', $fiscal['year'])
            ->get()
            ->filter(function (HrdAssessmentResponse $response) use ($viewingOther) {
                if (! $response->form) {
                    return false;
                }
                if ($viewingOther && $response->form->visibility !== 'named') {
                    return false;
                }

                return $response->form->visibility !== 'anonymous';
            })
            ->map(fn (HrdAssessmentResponse $response) => [
                'title' => $response->form->title,
                'visibility' => $response->form->visibility,
                'total_score' => $response->total_score,
                'band_label' => $response->band_label,
                'interpretation' => $response->interpretation,
                'sections' => $response->section_scores,
            ])
            ->values();

        return Inertia::render('HRD/Assessments/Results', [
            'fiscalLabel' => $fiscal['label'],
            'target' => $target->only(['id', 'name']),
            'isSelf' => ! $viewingOther,
            'canEdit' => $editor,
            'users' => $editor ? $this->hrd->userOptions($actor) : [],
            'responses' => $responses,
            'competency' => $this->competencyGaps($target, $fiscal['year']),
        ]);
    }

    public function summary()
    {
        $actor = $this->staffEditor();
        $fiscal = $this->hrd->fiscalBounds();
        $forms = HrdAssessmentForm::where('is_active', true)->where('kind', 'survey')->orderBy('sort')->get();
        $departmentIds = $this->hrd->ledDepartmentIds($actor);
        $staffIds = $this->hrd->staffUserIds($actor);

        $blocks = $forms->map(function (HrdAssessmentForm $form) use ($fiscal, $departmentIds, $staffIds) {
            $responses = HrdAssessmentResponse::with('department:id,name')
                ->where('form_id', $form->id)
                ->where('fiscal_year', $fiscal['year']);
            if ($departmentIds !== null) {
                $responses->where(function ($query) use ($departmentIds, $staffIds) {
                    $query->whereIn('department_id', $departmentIds === [] ? [-1] : $departmentIds)
                        ->orWhereIn('user_id', ($staffIds ?? []) === [] ? [-1] : $staffIds);
                });
            }
            $responses = $responses->get();
            $people = [];
            if ($form->visibility === 'named') {
                $responses->load('user:id,name');
                $people = $responses->map(fn (HrdAssessmentResponse $row) => [
                    'name' => $row->user?->name ?? 'ไม่ระบุชื่อ',
                    'department' => $row->department?->name ?? 'ไม่ระบุกลุ่มงาน',
                    'score' => $row->total_score,
                    'band_label' => $row->band_label,
                ])->values();
            }

            return [
                'title' => $form->title,
                'visibility' => $form->visibility,
                'count' => $responses->count(),
                'average' => $responses->isEmpty() ? null : round($responses->avg('total_score'), 2),
                'bands' => [
                    'develop' => $responses->where('band', 'develop')->count(),
                    'meet' => $responses->where('band', 'meet')->count(),
                    'good' => $responses->where('band', 'good')->count(),
                ],
                'departments' => $this->scores->departmentAverages($responses),
                'people' => $people,
            ];
        })->values();

        return Inertia::render('HRD/Assessments/Summary', [
            'fiscalLabel' => $fiscal['label'],
            'forms' => $blocks,
            'competency' => $this->competencyOrgGaps($fiscal['year'], $staffIds),
        ]);
    }

    public function builder()
    {
        $this->editor();
        $forms = HrdAssessmentForm::with('sections.items')->orderBy('sort')->orderBy('id')->get();

        return Inertia::render('HRD/Assessments/Builder', [
            'forms' => $forms,
        ]);
    }

    public function storeForm(Request $request)
    {
        $this->editor();
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'visibility' => 'required|in:anonymous,named,aggregate',
            'disclaimer' => 'nullable|string|max:2000',
        ]);
        $data['kind'] = 'survey';
        $data['is_system'] = false;
        $data['is_active'] = true;
        $data['sort'] = (int) HrdAssessmentForm::max('sort') + 1;
        HrdAssessmentForm::create($data);

        return back()->with('success', 'สร้างแบบประเมินแล้ว');
    }

    public function updateForm(Request $request, HrdAssessmentForm $form)
    {
        $this->editor();
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'disclaimer' => 'nullable|string|max:2000',
            'is_active' => 'required|boolean',
        ]);
        if ($form->kind === 'competency') {
            $form->update([
                'title' => $data['title'],
                'description' => $data['description'],
            ]);

            return back()->with('success', 'บันทึกชื่อแบบสมรรถนะแล้ว');
        }
        $form->update($data);

        return back()->with('success', 'บันทึกแบบประเมินแล้ว');
    }

    public function destroyForm(HrdAssessmentForm $form)
    {
        $this->editor();
        if ($form->is_system) {
            abort(403);
        }
        $form->delete();

        return back()->with('success', 'ลบแบบประเมินแล้ว');
    }

    public function storeSection(Request $request, HrdAssessmentForm $form)
    {
        $this->editor();
        if ($form->kind !== 'survey') {
            abort(403);
        }
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'weight' => 'required|numeric|min:0.1|max:100',
        ]);
        $data['sort'] = (int) $form->sections()->max('sort') + 1;
        $form->sections()->create($data);

        return back()->with('success', 'เพิ่มหมวดแล้ว');
    }

    public function updateSection(Request $request, HrdAssessmentSection $section)
    {
        $this->editor();
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'weight' => 'required|numeric|min:0.1|max:100',
        ]);
        $section->update($data);

        return back()->with('success', 'บันทึกหมวดแล้ว');
    }

    public function destroySection(HrdAssessmentSection $section)
    {
        $this->editor();
        $section->delete();

        return back()->with('success', 'ลบหมวดแล้ว');
    }

    public function storeItem(Request $request, HrdAssessmentSection $section)
    {
        $this->editor();
        $data = $request->validate([
            'prompt' => 'required|string|max:2000',
            'reverse_scored' => 'required|boolean',
        ]);
        $data['sort'] = (int) $section->items()->max('sort') + 1;
        $section->items()->create($data);

        return back()->with('success', 'เพิ่มข้อคำถามแล้ว');
    }

    public function updateItem(Request $request, HrdAssessmentItem $item)
    {
        $this->editor();
        $data = $request->validate([
            'prompt' => 'required|string|max:2000',
            'reverse_scored' => 'required|boolean',
        ]);
        $item->update($data);

        return back()->with('success', 'บันทึกข้อคำถามแล้ว');
    }

    public function destroyItem(HrdAssessmentItem $item)
    {
        $this->editor();
        $item->delete();

        return back()->with('success', 'ลบข้อคำถามแล้ว');
    }

    private function editor(): User
    {
        $user = Auth::user();
        if (! $this->hrd->isOrgEditor($user)) {
            abort(403);
        }

        return $user;
    }

    private function staffEditor(): User
    {
        $user = Auth::user();
        if (! $this->hrd->canManageStaff($user)) {
            abort(403);
        }

        return $user;
    }

    private function departmentId(User $user): ?int
    {
        return $user->primaryDepartment()?->id ?? $user->department_id;
    }

    private function competencyStatus(User $user, int $year): array
    {
        $rows = HrdCompetencyAssessment::where('user_id', $user->id)->where('fiscal_year', $year)->get();
        $self = $rows->pluck('self_level')->filter();
        if ($rows->contains(fn ($row) => $row->supervisor_level)) {
            $label = 'หัวหน้ายืนยันแล้ว';
        } elseif ($self->isNotEmpty()) {
            $label = 'ส่งการประเมินตนเองแล้ว';
        } else {
            $label = 'ยังไม่ทำ';
        }

        return [
            'submitted' => $self->isNotEmpty(),
            'label' => $label,
            'average' => $self->isEmpty() ? null : round($self->avg(), 2),
        ];
    }

    private function competencyGaps(User $user, int $year): array
    {
        $positionIds = $user->positions()->pluck('positions.id');
        $expected = HrdPositionCompetency::with('competency:id,name')
            ->whereIn('position_id', $positionIds)
            ->get()
            ->unique('competency_id');
        if ($expected->isEmpty()) {
            $expected = HrdCompetency::orderBy('name')->get()->map(function ($competency) {
                $competency->expected_level = null;
                $competency->competency_id = $competency->id;

                return $competency;
            });
        }
        $saved = HrdCompetencyAssessment::where('user_id', $user->id)
            ->where('fiscal_year', $year)
            ->get()
            ->keyBy('competency_id');

        return $expected->map(function ($row) use ($saved) {
            $competencyId = $row->competency_id;
            $current = $saved->get($competencyId);
            $expectedLevel = $row->expected_level ?? null;
            $confirmed = $current?->supervisor_level;
            $gap = ($expectedLevel !== null && $confirmed !== null) ? $expectedLevel - $confirmed : null;

            return [
                'name' => $row->competency?->name ?? $row->name,
                'expected_level' => $expectedLevel,
                'self_level' => $current?->self_level,
                'supervisor_level' => $confirmed,
                'gap' => $gap,
            ];
        })->values()->all();
    }

    private function competencyOrgGaps(int $year, ?array $staffIds = null): array
    {
        $rows = HrdCompetencyAssessment::with(['user:id,name', 'competency:id,name'])
            ->where('fiscal_year', $year)
            ->whereNotNull('supervisor_level');
        if ($staffIds !== null) {
            $rows->whereIn('user_id', $staffIds === [] ? [-1] : $staffIds);
        }
        $rows = $rows->get();
        $userIds = $rows->pluck('user_id')->unique();
        $positions = DB::table('position_user')->whereIn('user_id', $userIds)->get()->groupBy('user_id');
        $matrix = HrdPositionCompetency::all()->groupBy(fn ($link) => $link->position_id.'-'.$link->competency_id);

        return $rows->map(function (HrdCompetencyAssessment $row) use ($positions, $matrix) {
            $expected = null;
            foreach ($positions->get($row->user_id, collect()) as $link) {
                $match = $matrix->get($link->position_id.'-'.$row->competency_id)?->first();
                if ($match) {
                    $expected = $match->expected_level;
                    break;
                }
            }
            $gap = $expected === null ? null : $expected - $row->supervisor_level;

            return [
                'name' => $row->user?->name,
                'competency' => $row->competency?->name,
                'expected_level' => $expected,
                'supervisor_level' => $row->supervisor_level,
                'gap' => $gap,
            ];
        })->filter(fn ($row) => $row['gap'] !== null && $row['gap'] > 0)->values()->all();
    }
}
