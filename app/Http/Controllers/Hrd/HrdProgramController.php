<?php

namespace App\Http\Controllers\Hrd;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\HrdAnnualPlan;
use App\Models\HrdBehaviorReview;
use App\Models\HrdCompetency;
use App\Models\HrdCompetencyAssessment;
use App\Models\HrdCompetencyIndicator;
use App\Models\HrdCompetencySuggestion;
use App\Models\HrdCourse;
use App\Models\HrdCourseAssignment;
use App\Models\HrdEnrollment;
use App\Models\HrdExternalRecord;
use App\Models\HrdIdp;
use App\Models\HrdOrientationCheck;
use App\Models\HrdOrientationClearance;
use App\Models\HrdOrientationItem;
use App\Models\HrdPositionCompetency;
use App\Models\HrdSatisfactionQuestion;
use App\Models\HrdSatisfactionResponse;
use App\Models\HrdTnaResponse;
use App\Models\HrdUserCompetency;
use App\Models\Position;
use App\Models\User;
use App\Services\Hrd\HrdCompletionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class HrdProgramController extends Controller
{
    public function __construct(private HrdCompletionService $hrd) {}

    public function externalApprovals()
    {
        $actor = $this->staffEditor();

        $records = $this->hrd->limitToStaff(
            HrdExternalRecord::with('user:id,name')
                ->orderByRaw("CASE status WHEN 'pending' THEN 0 ELSE 1 END")
                ->orderByDesc('created_at'),
            $actor
        )->paginate(20);

        return Inertia::render('HRD/ExternalApprovals/Index', [
            'records' => $records,
        ]);
    }

    public function reviewExternal(Request $request, HrdExternalRecord $record)
    {
        $actor = $this->staffEditor();
        if (! $this->hrd->managesUser($actor, (int) $record->user_id)) {
            abort(403);
        }
        $data = $request->validate([
            'status' => 'required|in:approved,rejected',
            'remarks' => 'nullable|string|max:1000',
        ]);
        if ($data['status'] === 'rejected' && blank($data['remarks'] ?? null)) {
            return back()->withErrors(['remarks' => 'กรุณาระบุเหตุผลเมื่อตีกลับ']);
        }
        $record->update($data);

        return back()->with('success', $data['status'] === 'approved' ? 'อนุมัติการอบรมแล้ว' : 'ตีกลับการอบรมแล้ว');
    }

    public function satisfaction(HrdCourse $course)
    {
        $enrollment = $this->ownCompletedEnrollment($course);
        $questions = HrdSatisfactionQuestion::where('is_active', true)->orderBy('sort')->get();
        $existing = HrdSatisfactionResponse::where('user_id', Auth::id())->where('course_id', $course->id)->first();

        return Inertia::render('HRD/Satisfaction/Form', [
            'course' => $course->only(['id', 'title']),
            'questions' => $questions,
            'existing' => $existing,
        ]);
    }

    public function storeSatisfaction(Request $request, HrdCourse $course)
    {
        $enrollment = $this->ownCompletedEnrollment($course);
        $questions = HrdSatisfactionQuestion::where('is_active', true)->orderBy('sort')->get();
        $rules = [];
        foreach ($questions as $question) {
            $rules['answers.'.$question->id] = 'required|integer|min:1|max:5';
        }
        $data = $request->validate($rules);
        $values = collect($data['answers'])->map(fn ($value) => (int) $value);
        $score = round($values->avg(), 2);

        HrdSatisfactionResponse::updateOrCreate(
            ['user_id' => Auth::id(), 'course_id' => $course->id],
            [
                'enrollment_id' => $enrollment->id,
                'answers' => $data['answers'],
                'score' => $score,
            ]
        );
        $enrollment->satisfaction_score = $score;
        $enrollment->save();

        return redirect()->route('km.learn.my-training')->with('success', 'บันทึกแบบประเมินความพึงพอใจแล้ว');
    }

    public function satisfactionTemplate()
    {
        $this->editor();

        return Inertia::render('HRD/Satisfaction/Template', [
            'questions' => HrdSatisfactionQuestion::orderBy('sort')->get(),
        ]);
    }

    public function updateSatisfactionTemplate(Request $request)
    {
        $this->editor();
        $data = $request->validate([
            'questions' => 'required|array|min:1|max:12',
            'questions.*.id' => 'nullable|integer',
            'questions.*.question_text' => 'required|string|max:255',
        ]);

        $kept = [];
        foreach ($data['questions'] as $index => $row) {
            $question = ! empty($row['id'])
                ? HrdSatisfactionQuestion::find($row['id'])
                : new HrdSatisfactionQuestion();
            if (! $question) {
                $question = new HrdSatisfactionQuestion();
            }
            $question->question_text = $row['question_text'];
            $question->sort = $index;
            $question->is_active = true;
            $question->save();
            $kept[] = $question->id;
        }
        HrdSatisfactionQuestion::whereNotIn('id', $kept)->update(['is_active' => false]);

        return back()->with('success', 'บันทึกแบบประเมินกลางแล้ว');
    }

    public function courseEvaluation(HrdCourse $course)
    {
        $this->editor();
        $enrollments = $course->enrollments()->get();
        $completed = $enrollments->where('status', 'completed');

        return Inertia::render('HRD/Courses/Evaluation', [
            'course' => $course->only(['id', 'title', 'hours', 'track_behavior']),
            'summary' => [
                'enrolled' => $enrollments->count(),
                'completed' => $completed->count(),
                'avg_pre' => $this->avg($enrollments, 'pre_test_score'),
                'avg_post' => $this->avg($enrollments, 'post_test_score'),
                'avg_satisfaction' => $this->avg($enrollments, 'satisfaction_score'),
                'satisfaction_count' => $enrollments->whereNotNull('satisfaction_score')->count(),
            ],
        ]);
    }

    public function assignments()
    {
        $this->editor();
        $rows = HrdCourseAssignment::with(['course:id,title', 'user:id,name'])
            ->whereNotNull('user_id')
            ->latest()
            ->paginate(30);

        return Inertia::render('HRD/Assignments/Index', [
            'assignments' => $rows,
            'courses' => HrdCourse::orderBy('title')->get(['id', 'title', 'is_mandatory']),
            'users' => User::orderBy('name')->get(['id', 'name']),
            'departments' => Department::orderBy('name')->get(['id', 'name']),
            'positions' => Position::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function storeAssignment(Request $request)
    {
        $editor = $this->editor();
        $data = $request->validate([
            'course_id' => 'required|exists:hrd_courses,id',
            'target' => 'required|in:user,department,position',
            'target_id' => 'required|integer',
            'due_date' => 'required|date',
        ]);

        $userIds = $this->resolveTargetUsers($data['target'], (int) $data['target_id']);
        if ($userIds->isEmpty()) {
            return back()->withErrors(['target_id' => 'ไม่พบบุคลากรในกลุ่มที่เลือก']);
        }

        $created = 0;
        foreach ($userIds as $userId) {
            $exists = HrdCourseAssignment::where('course_id', $data['course_id'])->where('user_id', $userId)->exists();
            if ($exists) {
                continue;
            }
            HrdCourseAssignment::create([
                'course_id' => $data['course_id'],
                'user_id' => $userId,
                'department_id' => $data['target'] === 'department' ? $data['target_id'] : null,
                'position_id' => $data['target'] === 'position' ? $data['target_id'] : null,
                'assigned_by' => $editor->id,
                'due_date' => $data['due_date'],
                'status' => 'assigned',
            ]);
            $created++;
        }

        return back()->with('success', 'มอบหมายแล้ว '.$created.' คน');
    }

    public function destroyAssignment(HrdCourseAssignment $assignment)
    {
        $this->editor();
        $assignment->delete();

        return back()->with('success', 'ยกเลิกการมอบหมายแล้ว');
    }

    public function compliance()
    {
        $actor = $this->staffEditor();
        $this->hrd->limitToStaff(
            HrdCourseAssignment::query()
                ->whereNotNull('user_id')
                ->where('status', '!=', 'completed')
                ->whereDate('due_date', '<', today()),
            $actor
        )->update(['status' => 'overdue']);

        $rows = $this->hrd->limitToStaff(
            HrdCourseAssignment::with(['course:id,title,is_mandatory,expiration_days', 'user:id,name,department_id'])
                ->whereNotNull('user_id'),
            $actor
        )->get();

        $enrollments = HrdEnrollment::query()
            ->whereIn('user_id', $rows->pluck('user_id')->unique())
            ->whereIn('course_id', $rows->pluck('course_id')->unique())
            ->get()
            ->keyBy(fn ($row) => $row->user_id.'-'.$row->course_id);

        $items = $rows->map(function ($row) use ($enrollments) {
            $enrollment = $enrollments->get($row->user_id.'-'.$row->course_id);
            $display = $row->status;
            if ($enrollment && $enrollment->status === 'completed') {
                $display = ($enrollment->expires_at && $enrollment->expires_at->lt(today())) ? 'expired' : 'completed';
                if ($display === 'completed' && $row->status !== 'completed') {
                    $row->status = 'completed';
                    $row->save();
                }
            }

            return [
                'id' => $row->id,
                'user' => $row->user?->name,
                'department_id' => $row->user?->department_id,
                'course' => $row->course?->title,
                'mandatory' => (bool) $row->course?->is_mandatory,
                'due_date' => optional($row->due_date)->toDateString(),
                'expires_at' => $enrollment?->expires_at?->toDateString(),
                'status' => $display,
            ];
        });

        $departments = Department::pluck('name', 'id');
        $byDepartment = $items->groupBy(fn ($item) => $departments[$item['department_id']] ?? 'ไม่ระบุหน่วยงาน')
            ->map(function ($group, $name) {
                $total = $group->count();
                $done = $group->where('status', 'completed')->count();

                return [
                    'name' => $name,
                    'total' => $total,
                    'completed' => $done,
                    'rate' => $total > 0 ? round($done / $total * 100) : 0,
                ];
            })->values();

        $expiring = $this->hrd->limitToStaff(
            HrdEnrollment::with(['user:id,name', 'course:id,title'])
            ->where('status', 'completed'),
            $actor
        )
            ->whereNotNull('expires_at')
            ->whereBetween('expires_at', [today(), today()->addDays(60)])
            ->orderBy('expires_at')
            ->get()
            ->map(fn ($row) => [
                'user' => $row->user?->name,
                'course' => $row->course?->title,
                'expires_at' => $row->expires_at->toDateString(),
            ]);

        return Inertia::render('HRD/Compliance/Index', [
            'items' => $items->values(),
            'byDepartment' => $byDepartment,
            'expiring' => $expiring,
        ]);
    }

    public function competencies()
    {
        $this->editor();

        return Inertia::render('HRD/Competencies/Index', [
            'competencies' => HrdCompetency::with(['indicators', 'courses:id,title'])->orderBy('type')->orderBy('name')->get(),
            'courses' => HrdCourse::orderBy('title')->get(['id', 'title']),
            'positions' => Position::orderBy('name')->get(['id', 'name']),
            'matrix' => HrdPositionCompetency::with(['position:id,name', 'competency:id,name'])->get(),
        ]);
    }

    public function storeCompetency(Request $request)
    {
        $this->editor();
        $competency = new HrdCompetency();
        $this->saveCompetency($request, $competency);

        return back()->with('success', 'บันทึกสมรรถนะแล้ว');
    }

    public function updateCompetency(Request $request, HrdCompetency $competency)
    {
        $this->editor();
        $this->saveCompetency($request, $competency);

        return back()->with('success', 'แก้ไขสมรรถนะแล้ว');
    }

    public function destroyCompetency(HrdCompetency $competency)
    {
        $this->editor();
        $competency->courses()->detach();
        $competency->delete();

        return back()->with('success', 'ลบสมรรถนะแล้ว');
    }

    public function storePositionCompetency(Request $request)
    {
        $this->editor();
        $data = $request->validate([
            'position_id' => 'required|exists:positions,id',
            'competency_id' => 'required|exists:hrd_competencies,id',
            'expected_level' => 'required|integer|min:1|max:5',
        ]);
        HrdPositionCompetency::updateOrCreate(
            ['position_id' => $data['position_id'], 'competency_id' => $data['competency_id']],
            ['expected_level' => $data['expected_level']]
        );

        return back()->with('success', 'ผูกสมรรถนะกับตำแหน่งแล้ว');
    }

    public function destroyPositionCompetency(HrdPositionCompetency $link)
    {
        $this->editor();
        $link->delete();

        return back()->with('success', 'ยกเลิกการผูกแล้ว');
    }

    public function assessments(Request $request)
    {
        $actor = Auth::user();
        $editor = $this->hrd->canManageStaff($actor);
        $target = $this->hrd->resolveManagedUser($actor, $editor ? $request->integer('user_id') : null);

        $fiscal = $this->hrd->fiscalBounds();
        $positionIds = $target->positions()->pluck('positions.id');
        $expected = HrdPositionCompetency::with('competency.indicators')
            ->whereIn('position_id', $positionIds)
            ->get()
            ->unique('competency_id')
            ->values();

        if ($expected->isEmpty()) {
            $expected = HrdCompetency::with('indicators')->orderBy('name')->get()->map(function ($competency) {
                $competency->expected_level = null;

                return $competency;
            });
            $rows = $expected->map(fn ($competency) => [
                'competency_id' => $competency->id,
                'name' => $competency->name,
                'type' => $competency->type,
                'expected_level' => null,
                'indicators' => $competency->indicators,
            ]);
        } else {
            $rows = $expected->map(fn ($link) => [
                'competency_id' => $link->competency_id,
                'name' => $link->competency->name,
                'type' => $link->competency->type,
                'expected_level' => $link->expected_level,
                'indicators' => $link->competency->indicators,
            ]);
        }

        $saved = HrdCompetencyAssessment::where('user_id', $target->id)
            ->where('fiscal_year', $fiscal['year'])
            ->get()
            ->keyBy('competency_id');

        $suggestions = $editor
            ? $this->hrd->limitToStaff(
                HrdCompetencySuggestion::with(['user:id,name', 'competency:id,name', 'course:id,title'])->where('status', 'pending')->latest(),
                $actor
            )->get()
            : [];

        return Inertia::render('HRD/Assessments/Competency', [
            'fiscalLabel' => $fiscal['label'],
            'fiscalYear' => $fiscal['year'],
            'target' => $target->only(['id', 'name']),
            'isSelf' => $target->id === $actor->id,
            'rows' => $rows->values(),
            'saved' => $saved,
            'canEdit' => $editor,
            'users' => $editor ? $this->hrd->userOptions($actor) : [],
            'suggestions' => $suggestions,
        ]);
    }

    public function saveAssessment(Request $request)
    {
        $actor = Auth::user();
        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'fiscal_year' => 'required|integer',
            'self' => 'nullable|array',
            'self.*' => 'nullable',
            'supervisor' => 'nullable|array',
            'supervisor.*' => 'nullable',
        ]);
        $targetId = (int) $data['user_id'];
        $canSupervise = $this->hrd->managesUser($actor, $targetId);
        if ($targetId !== $actor->id && ! $canSupervise) {
            abort(403);
        }

        $ids = collect(array_keys($data['self'] ?? []))->merge(array_keys($data['supervisor'] ?? []))->unique();
        foreach ($ids as $competencyId) {
            $row = HrdCompetencyAssessment::firstOrNew([
                'user_id' => $data['user_id'],
                'competency_id' => $competencyId,
                'fiscal_year' => $data['fiscal_year'],
            ]);
            if ($targetId === $actor->id && ! empty($data['self'][$competencyId])) {
                $row->self_level = (int) $data['self'][$competencyId];
            }
            if ($canSupervise && ! empty($data['supervisor'][$competencyId])) {
                $row->supervisor_level = (int) $data['supervisor'][$competencyId];
                $row->supervisor_id = $actor->id;
                $row->confirmed_at = now();
                HrdUserCompetency::updateOrCreate(
                    ['user_id' => $data['user_id'], 'competency_id' => $competencyId],
                    ['level' => $data['supervisor'][$competencyId], 'source' => 'assessment']
                );
            }
            $row->save();
        }

        return back()->with('success', 'บันทึกแบบประเมินสมรรถนะแล้ว');
    }

    public function reviewSuggestion(Request $request, HrdCompetencySuggestion $suggestion)
    {
        $editor = $this->staffEditor();
        if (! $this->hrd->managesUser($editor, (int) $suggestion->user_id)) {
            abort(403);
        }
        $data = $request->validate(['decision' => 'required|in:accepted,rejected']);
        $suggestion->status = $data['decision'];
        $suggestion->reviewed_by = $editor->id;
        $suggestion->save();

        if ($data['decision'] === 'accepted') {
            HrdUserCompetency::updateOrCreate(
                ['user_id' => $suggestion->user_id, 'competency_id' => $suggestion->competency_id],
                ['level' => $suggestion->proposed_level, 'source' => 'training']
            );
        }

        return back()->with('success', 'บันทึกการยืนยันระดับสมรรถนะแล้ว');
    }

    public function idp(Request $request)
    {
        $actor = Auth::user();
        $editor = $this->hrd->canManageStaff($actor);
        $target = $this->hrd->resolveManagedUser($actor, $editor ? $request->integer('user_id') : null);
        $fiscal = $this->hrd->fiscalBounds();

        $plans = HrdIdp::with(['competency:id,name', 'course:id,title'])
            ->where('user_id', $target->id)
            ->where('fiscal_year', $fiscal['year'])
            ->latest()
            ->get();

        return Inertia::render('HRD/Idp/Index', [
            'fiscalLabel' => $fiscal['label'],
            'fiscalYear' => $fiscal['year'],
            'target' => $target->only(['id', 'name']),
            'plans' => $plans,
            'courses' => HrdCourse::where('status', 'published')->orderBy('title')->get(['id', 'title']),
            'competencies' => HrdCompetency::orderBy('name')->get(['id', 'name']),
            'canEdit' => $editor,
            'users' => $editor ? $this->hrd->userOptions($actor) : [],
            'closed' => $plans->where('status', 'done')->count(),
            'total' => $plans->count(),
        ]);
    }

    public function storeIdp(Request $request)
    {
        $actor = Auth::user();
        $request->merge([
            'competency_id' => $request->input('competency_id') ?: null,
            'course_id' => $request->input('course_id') ?: null,
            'due_date' => $request->input('due_date') ?: null,
        ]);
        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'competency_id' => 'nullable|exists:hrd_competencies,id',
            'fiscal_year' => 'required|integer',
            'method' => 'required|in:course,external,ojt',
            'course_id' => 'nullable|exists:hrd_courses,id',
            'title' => 'required|string|max:255',
            'due_date' => 'nullable|date',
        ]);
        if ((int) $data['user_id'] !== $actor->id && ! $this->hrd->managesUser($actor, (int) $data['user_id'])) {
            abort(403);
        }
        $data['competency_id'] = $data['competency_id'] ?: null;
        $data['course_id'] = $data['course_id'] ?: null;
        $data['due_date'] = $data['due_date'] ?: null;
        HrdIdp::create($data + ['status' => 'planned']);

        return back()->with('success', 'เพิ่มแผนพัฒนารายบุคคลแล้ว');
    }

    public function generateIdp(Request $request)
    {
        $actor = Auth::user();
        $userId = $request->integer('user_id') ?: $actor->id;
        if ($userId !== $actor->id && ! $this->hrd->managesUser($actor, $userId)) {
            abort(403);
        }
        $fiscal = $this->hrd->fiscalBounds();
        $user = User::findOrFail($userId);
        $positionIds = $user->positions()->pluck('positions.id');
        $links = HrdPositionCompetency::with('competency.courses')->whereIn('position_id', $positionIds)->get();
        $assessments = HrdCompetencyAssessment::where('user_id', $userId)->where('fiscal_year', $fiscal['year'])->get()->keyBy('competency_id');
        $created = 0;
        foreach ($links as $link) {
            $assessment = $assessments->get($link->competency_id);
            $actual = $assessment?->supervisor_level ?? $assessment?->self_level;
            if ($actual === null || $actual >= $link->expected_level) {
                continue;
            }
            $exists = HrdIdp::where('user_id', $userId)
                ->where('competency_id', $link->competency_id)
                ->where('fiscal_year', $fiscal['year'])
                ->where('status', 'planned')
                ->exists();
            if ($exists) {
                continue;
            }
            $course = $link->competency->courses->first();
            HrdIdp::create([
                'user_id' => $userId,
                'competency_id' => $link->competency_id,
                'fiscal_year' => $fiscal['year'],
                'method' => $course ? 'course' : 'ojt',
                'course_id' => $course?->id,
                'title' => 'ปิดช่องว่าง: '.$link->competency->name,
                'status' => 'planned',
            ]);
            $created++;
        }

        return back()->with('success', 'สร้างแผนจากช่องว่าง '.$created.' รายการ');
    }

    public function completeIdp(HrdIdp $idp)
    {
        $actor = Auth::user();
        if ($idp->user_id !== $actor->id && ! $this->hrd->managesUser($actor, (int) $idp->user_id)) {
            abort(403);
        }
        $idp->update(['status' => 'done', 'completed_at' => now()]);

        return back()->with('success', 'ปิดรายการพัฒนาแล้ว');
    }

    public function orientation(Request $request)
    {
        $actor = Auth::user();
        $editor = $this->hrd->canManageStaff($actor);
        $configure = $this->hrd->isOrgEditor($actor);
        $target = $this->hrd->resolveManagedUser($actor, $editor ? $request->integer('user_id') : null);
        $canCheck = $this->hrd->managesUser($actor, $target->id);
        $items = $this->orientationItemsFor($target);
        $checks = HrdOrientationCheck::where('user_id', $target->id)->get()->keyBy('item_id');
        $required = $items->where('is_required', true);
        $ready = $required->every(fn ($item) => $checks->has($item->id));

        return Inertia::render('HRD/Orientation/Index', [
            'target' => $target->only(['id', 'name']),
            'items' => $items,
            'checks' => $checks,
            'clearance' => HrdOrientationClearance::where('user_id', $target->id)->first(),
            'ready' => $ready,
            'canEdit' => $canCheck,
            'canConfigure' => $configure,
            'users' => $editor ? $this->hrd->userOptions($actor) : [],
            'departments' => $configure ? Department::orderBy('name')->get(['id', 'name']) : [],
            'courses' => $configure ? HrdCourse::orderBy('title')->get(['id', 'title']) : [],
            'catalog' => $configure ? HrdOrientationItem::with(['department:id,name', 'course:id,title'])->orderBy('sort')->get() : [],
        ]);
    }

    public function storeOrientationItem(Request $request)
    {
        $this->editor();
        $request->merge([
            'course_id' => $request->input('course_id') ?: null,
            'department_id' => $request->input('department_id') ?: null,
        ]);
        $data = $request->validate([
            'scope' => 'required|in:org,department',
            'department_id' => 'nullable|required_if:scope,department|exists:departments,id',
            'title' => 'required|string|max:255',
            'course_id' => 'nullable|exists:hrd_courses,id',
            'is_required' => 'nullable|boolean',
        ]);
        HrdOrientationItem::create([
            'scope' => $data['scope'],
            'department_id' => $data['scope'] === 'department' ? $data['department_id'] : null,
            'title' => $data['title'],
            'course_id' => $data['course_id'] ?: null,
            'is_required' => $request->boolean('is_required', true),
            'sort' => (int) HrdOrientationItem::max('sort') + 1,
        ]);

        return back()->with('success', 'เพิ่มรายการปฐมนิเทศแล้ว');
    }

    public function destroyOrientationItem(HrdOrientationItem $item)
    {
        $this->editor();
        $item->delete();

        return back()->with('success', 'ลบรายการแล้ว');
    }

    public function toggleOrientationCheck(Request $request)
    {
        $editor = $this->staffEditor();
        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'item_id' => 'required|exists:hrd_orientation_items,id',
            'checked' => 'required|boolean',
        ]);
        if (! $this->hrd->managesUser($editor, (int) $data['user_id'])) {
            abort(403);
        }
        if ($request->boolean('checked')) {
            HrdOrientationCheck::updateOrCreate(
                ['user_id' => $data['user_id'], 'item_id' => $data['item_id']],
                ['checked_by' => $editor->id, 'checked_at' => now()]
            );
        } else {
            HrdOrientationCheck::where('user_id', $data['user_id'])->where('item_id', $data['item_id'])->delete();
            HrdOrientationClearance::where('user_id', $data['user_id'])->delete();
        }

        return back()->with('success', 'บันทึกการตรวจปฐมนิเทศแล้ว');
    }

    public function clearOrientation(Request $request)
    {
        $editor = $this->staffEditor();
        $user = User::findOrFail($request->integer('user_id'));
        if (! $this->hrd->managesUser($editor, $user->id)) {
            abort(403);
        }
        $items = $this->orientationItemsFor($user)->where('is_required', true);
        $checked = HrdOrientationCheck::where('user_id', $user->id)->pluck('item_id');
        if ($items->pluck('id')->diff($checked)->isNotEmpty()) {
            return back()->withErrors(['user_id' => 'ยังมีรายการบังคับที่ไม่ได้ตรวจ']);
        }
        HrdOrientationClearance::updateOrCreate(
            ['user_id' => $user->id],
            ['cleared_by' => $editor->id, 'cleared_at' => now(), 'notes' => $request->input('notes')]
        );

        return back()->with('success', 'รับรองให้ขึ้นปฏิบัติงานอิสระแล้ว');
    }

    public function plans()
    {
        $this->editor();
        $fiscal = $this->hrd->fiscalBounds();
        $plans = HrdAnnualPlan::with('course:id,title,hours')->where('fiscal_year', $fiscal['year'])->orderBy('quarter')->get();
        $plans->each(function ($plan) use ($fiscal) {
            $actual = $this->planActual($plan, $fiscal);
            $plan->actual_hours = $actual['hours'];
            $plan->actual_pass_rate = $actual['pass_rate'];
        });

        return Inertia::render('HRD/Plans/Index', [
            'fiscalLabel' => $fiscal['label'],
            'fiscalYear' => $fiscal['year'],
            'plans' => $plans,
            'courses' => HrdCourse::orderBy('title')->get(['id', 'title']),
        ]);
    }

    public function storePlan(Request $request)
    {
        $this->editor();
        $request->merge([
            'course_id' => $request->input('course_id') ?: null,
            'quarter' => $request->input('quarter') ?: null,
            'target_hours' => $request->filled('target_hours') ? $request->input('target_hours') : null,
            'target_pass_rate' => $request->filled('target_pass_rate') ? $request->input('target_pass_rate') : null,
            'budget' => $request->filled('budget') ? $request->input('budget') : 0,
            'target_group' => $request->input('target_group') ?: null,
        ]);
        $data = $request->validate([
            'fiscal_year' => 'required|integer',
            'title' => 'required|string|max:255',
            'target_group' => 'nullable|string|max:255',
            'quarter' => 'nullable|integer|min:1|max:4',
            'target_hours' => 'nullable|numeric|min:0',
            'target_pass_rate' => 'nullable|numeric|min:0|max:100',
            'budget' => 'nullable|numeric|min:0',
            'course_id' => 'nullable|exists:hrd_courses,id',
        ]);
        $data['budget'] = $data['budget'] ?: 0;
        $data['course_id'] = $data['course_id'] ?: null;
        $data['quarter'] = $data['quarter'] ?: null;
        $data['target_hours'] = $data['target_hours'] === '' || $data['target_hours'] === null ? null : $data['target_hours'];
        $data['target_pass_rate'] = $data['target_pass_rate'] === '' || $data['target_pass_rate'] === null ? null : $data['target_pass_rate'];
        $data['target_group'] = $data['target_group'] ?: null;
        HrdAnnualPlan::create($data);

        return back()->with('success', 'เพิ่มรายการในแผนประจำปีแล้ว');
    }

    public function destroyPlan(HrdAnnualPlan $plan)
    {
        $this->editor();
        $plan->delete();

        return back()->with('success', 'ลบรายการแผนแล้ว');
    }

    public function reports()
    {
        $actor = $this->staffEditor();
        $fiscal = $this->hrd->fiscalBounds();
        $ids = $this->hrd->staffUserIds($actor);
        $staffCount = $ids === null ? User::count() : count($ids);
        $userCount = max(1, $staffCount);

        $internalHours = (float) $this->hrd->limitToStaff(
            HrdEnrollment::query()
                ->where('hrd_enrollments.status', 'completed')
                ->where(function ($query) use ($fiscal) {
                    $query->whereBetween('completed_at', [$fiscal['start'], $fiscal['end']])
                        ->orWhere(function ($inner) use ($fiscal) {
                            $inner->whereNull('completed_at')->whereBetween('hrd_enrollments.updated_at', [$fiscal['start'], $fiscal['end']]);
                        });
                }),
            $actor,
            'hrd_enrollments.user_id'
        )
            ->join('hrd_courses', 'hrd_enrollments.course_id', '=', 'hrd_courses.id')
            ->sum('hrd_courses.hours');

        $externalHours = (float) $this->hrd->limitToStaff(
            HrdExternalRecord::query()
                ->where('status', 'approved')
                ->whereBetween('start_date', [$fiscal['start']->toDateString(), $fiscal['end']->toDateString()]),
            $actor
        )->sum('hours');

        $mandatoryIds = HrdCourse::where('is_mandatory', true)->pluck('id');
        $mandatoryTotal = $this->hrd->limitToStaff(
            HrdCourseAssignment::whereIn('course_id', $mandatoryIds)->whereNotNull('user_id'),
            $actor
        )->count();
        $mandatoryDone = $this->hrd->limitToStaff(
            HrdCourseAssignment::whereIn('course_id', $mandatoryIds)->where('status', 'completed'),
            $actor
        )->count();

        $l1 = $this->hrd->limitToStaff(
            HrdSatisfactionResponse::whereBetween('created_at', [$fiscal['start'], $fiscal['end']]),
            $actor
        )->avg('score');
        $l2 = $this->hrd->limitToStaff(
            HrdEnrollment::query()
                ->whereNotNull('pre_test_score')
                ->whereNotNull('post_test_score')
                ->whereBetween('updated_at', [$fiscal['start'], $fiscal['end']]),
            $actor
        )->get(['pre_test_score', 'post_test_score']);
        $behaviorBase = HrdBehaviorReview::whereBetween('due_on', [$fiscal['start']->toDateString(), $fiscal['end']->toDateString()]);
        if ($ids !== null) {
            $behaviorBase->whereHas('enrollment', fn ($query) => $query->whereIn('user_id', $ids === [] ? [-1] : $ids));
        }
        $l3Total = (clone $behaviorBase)->count();
        $l3Done = (clone $behaviorBase)->where('status', 'done')->count();

        $assessed = $this->hrd->limitToStaff(
            HrdCompetencyAssessment::where('fiscal_year', $fiscal['year'])->whereNotNull('confirmed_at'),
            $actor
        )->distinct('user_id')->count('user_id');
        $idpTotal = $this->hrd->limitToStaff(HrdIdp::where('fiscal_year', $fiscal['year']), $actor)->count();
        $idpDone = $this->hrd->limitToStaff(
            HrdIdp::where('fiscal_year', $fiscal['year'])->where('status', 'done'),
            $actor
        )->count();

        return Inertia::render('HRD/Reports/Index', [
            'fiscalLabel' => $fiscal['label'],
            'summary' => [
                'avg_hours' => round(($internalHours + $externalHours) / $userCount, 2),
                'total_hours' => round($internalHours + $externalHours, 2),
                'staff' => $staffCount,
                'mandatory_rate' => $mandatoryTotal > 0 ? round($mandatoryDone / $mandatoryTotal * 100) : null,
                'mandatory_done' => $mandatoryDone,
                'mandatory_total' => $mandatoryTotal,
                'satisfaction' => $l1 ? round((float) $l1, 2) : null,
                'pre_avg' => $l2->isEmpty() ? null : round($l2->avg('pre_test_score'), 1),
                'post_avg' => $l2->isEmpty() ? null : round($l2->avg('post_test_score'), 1),
                'behavior_done' => $l3Done,
                'behavior_total' => $l3Total,
                'assessment_rate' => round($assessed / $userCount * 100),
                'assessed_users' => $assessed,
                'idp_done' => $idpDone,
                'idp_total' => $idpTotal,
            ],
        ]);
    }

    public function passport(Request $request)
    {
        $actor = Auth::user();
        $editor = $this->hrd->canManageStaff($actor);
        $target = $this->hrd->resolveManagedUser($actor, $editor ? $request->integer('user_id') : null)
            ->load('department:id,name');
        $fiscal = $this->hrd->fiscalBounds();

        return Inertia::render('HRD/Passport/Show', [
            'fiscalLabel' => $fiscal['label'],
            'target' => [
                'id' => $target->id,
                'name' => $target->name,
                'department' => $target->department?->name,
                'position' => $target->position,
            ],
            'hours' => $this->hrd->hoursForUser($target->id),
            'enrollments' => HrdEnrollment::with('course:id,title,hours')->where('user_id', $target->id)->latest()->get(),
            'externalRecords' => HrdExternalRecord::where('user_id', $target->id)->latest()->get(),
            'skills' => HrdUserCompetency::with('competency:id,name,type')->where('user_id', $target->id)->get(),
            'clearance' => HrdOrientationClearance::where('user_id', $target->id)->first(),
            'idps' => HrdIdp::where('user_id', $target->id)->where('fiscal_year', $fiscal['year'])->get(),
            'canEdit' => $editor,
            'users' => $editor ? $this->hrd->userOptions($actor) : [],
        ]);
    }

    public function tna()
    {
        $actor = Auth::user();
        $editor = $this->hrd->canManageStaff($actor);
        $fiscal = $this->hrd->fiscalBounds();
        $ranking = $this->hrd->limitToStaff(
            HrdTnaResponse::query()->where('fiscal_year', $fiscal['year']),
            $actor
        )
            ->select('topic', DB::raw('count(*) as total'))
            ->groupBy('topic')
            ->orderByDesc('total')
            ->limit(20)
            ->get();

        return Inertia::render('HRD/Tna/Index', [
            'fiscalLabel' => $fiscal['label'],
            'fiscalYear' => $fiscal['year'],
            'mine' => HrdTnaResponse::where('user_id', $actor->id)->where('fiscal_year', $fiscal['year'])->latest()->get(),
            'ranking' => $editor ? $ranking : [],
            'canEdit' => $editor,
        ]);
    }

    public function storeTna(Request $request)
    {
        $data = $request->validate([
            'fiscal_year' => 'required|integer',
            'topic' => 'required|string|max:255',
            'reason' => 'required|in:gap,work,policy',
            'note' => 'nullable|string|max:1000',
        ]);
        HrdTnaResponse::create($data + ['user_id' => Auth::id()]);

        return back()->with('success', 'ส่งความต้องการฝึกอบรมแล้ว');
    }

    public function behavior()
    {
        $actor = $this->staffEditor();
        $ids = $this->hrd->staffUserIds($actor);
        $reviews = HrdBehaviorReview::with(['enrollment.user:id,name', 'enrollment.course:id,title'])
            ->orderByRaw("CASE status WHEN 'pending' THEN 0 ELSE 1 END")
            ->orderBy('due_on');
        if ($ids !== null) {
            $reviews->whereHas('enrollment', fn ($query) => $query->whereIn('user_id', $ids === [] ? [-1] : $ids));
        }
        $reviews = $reviews->paginate(20);

        return Inertia::render('HRD/Behavior/Index', [
            'reviews' => $reviews,
        ]);
    }

    public function storeBehavior(Request $request, HrdBehaviorReview $review)
    {
        $editor = $this->staffEditor();
        $review->loadMissing('enrollment');
        if (! $review->enrollment || ! $this->hrd->managesUser($editor, (int) $review->enrollment->user_id)) {
            abort(403);
        }
        $data = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|max:1000',
        ]);
        $review->update([
            'rating' => $data['rating'],
            'comment' => $data['comment'],
            'status' => 'done',
            'reviewer_id' => $editor->id,
            'reviewed_at' => now(),
        ]);

        return back()->with('success', 'บันทึกการนำไปใช้แล้ว');
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

    private function ownCompletedEnrollment(HrdCourse $course): HrdEnrollment
    {
        $enrollment = HrdEnrollment::where('user_id', Auth::id())->where('course_id', $course->id)->first();
        if (! $enrollment || $enrollment->status !== 'completed') {
            abort(403, 'ประเมินได้หลังเรียนจบหลักสูตร');
        }

        return $enrollment;
    }

    private function saveCompetency(Request $request, HrdCompetency $competency): void
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|in:core,functional,managerial',
            'indicators' => 'required|array|size:5',
            'indicators.*' => 'required|string|max:500',
            'course_ids' => 'nullable|array',
            'course_ids.*' => 'integer|exists:hrd_courses,id',
            'score_weight' => 'nullable|integer|min:1|max:5',
        ]);
        $competency->fill([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'type' => $data['type'],
        ])->save();

        foreach ($data['indicators'] as $level => $behavior) {
            $levelNo = (int) $level + 1;
            HrdCompetencyIndicator::updateOrCreate(
                ['competency_id' => $competency->id, 'level' => $levelNo],
                ['behavior' => $behavior]
            );
        }

        $weight = $data['score_weight'] ?? 3;
        $sync = [];
        foreach ($data['course_ids'] ?? [] as $courseId) {
            $sync[$courseId] = ['score_weight' => $weight];
        }
        $competency->courses()->sync($sync);
    }

    private function resolveTargetUsers(string $target, int $id)
    {
        if ($target === 'user') {
            return collect([$id]);
        }
        if ($target === 'department') {
            $fromColumn = User::where('department_id', $id)->pluck('id');
            $fromPivot = DB::table('department_user')->where('department_id', $id)->pluck('user_id');

            return $fromColumn->merge($fromPivot)->unique()->values();
        }

        return DB::table('position_user')->where('position_id', $id)->pluck('user_id')->unique()->values();
    }

    private function orientationItemsFor(User $user)
    {
        $deptIds = collect([$user->department_id])
            ->merge($user->departments()->pluck('departments.id'))
            ->filter()
            ->unique()
            ->values();

        return HrdOrientationItem::with('course:id,title')
            ->where(function ($query) use ($deptIds) {
                $query->where('scope', 'org');
                if ($deptIds->isNotEmpty()) {
                    $query->orWhere(function ($inner) use ($deptIds) {
                        $inner->where('scope', 'department')->whereIn('department_id', $deptIds);
                    });
                }
            })
            ->orderBy('sort')
            ->get();
    }

    private function planActual(HrdAnnualPlan $plan, array $fiscal): array
    {
        if (! $plan->course_id) {
            $hours = HrdEnrollment::query()
                ->where('status', 'completed')
                ->whereBetween('completed_at', [$fiscal['start'], $fiscal['end']])
                ->join('hrd_courses', 'hrd_enrollments.course_id', '=', 'hrd_courses.id')
                ->sum('hrd_courses.hours');

            return ['hours' => (float) $hours, 'pass_rate' => null];
        }

        $rows = HrdEnrollment::where('course_id', $plan->course_id)
            ->whereBetween('updated_at', [$fiscal['start'], $fiscal['end']])
            ->get();
        $done = $rows->where('status', 'completed')->count();
        $hours = $done * (float) ($plan->course->hours ?? 0);

        return [
            'hours' => $hours,
            'pass_rate' => $rows->count() > 0 ? round($done / $rows->count() * 100, 1) : null,
        ];
    }

    private function avg($rows, string $field): ?float
    {
        $values = $rows->pluck($field)->filter(fn ($value) => $value !== null);
        if ($values->isEmpty()) {
            return null;
        }

        return round((float) $values->avg(), 1);
    }
}
