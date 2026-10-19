<?php

namespace App\Http\Controllers\Hrd;

use App\Http\Controllers\Controller;
use App\Models\HrdAssessmentForm;
use App\Models\HrdAssessmentResponse;
use App\Models\HrdCompetencyAssessment;
use App\Models\HrdPositionCompetency;
use App\Models\HrdWorkEvaluation;
use App\Models\HrdWorkTopic;
use App\Models\User;
use App\Services\Hrd\HrdCompletionService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class HrdWorkEvaluationController extends Controller
{
    public function __construct(private HrdCompletionService $hrd) {}

    public function index()
    {
        $actor = $this->manager();
        $fiscal = $this->hrd->fiscalBounds();
        $evaluations = $this->hrd->limitToStaff(
            HrdWorkEvaluation::query()->with(['scores', 'user:id,name']),
            $actor
        )->latest('evaluated_at')->latest('id')->get();

        $topics = HrdWorkTopic::query()->with(['children', 'parent'])->orderBy('sort_order')->orderBy('id')->get();
        $leaves = $topics->where('is_group', false)->where('is_active', true)->values();
        $groups = $topics->where('is_group', true)->whereNull('parent_id')->values()->map(fn (HrdWorkTopic $group) => [
            'id' => $group->id,
            'title' => $group->title,
            'description' => $group->description,
            'children' => $group->children->where('is_active', true)->map(fn (HrdWorkTopic $topic) => [
                'id' => $topic->id,
                'title' => $topic->title,
                'description' => $topic->description,
                'rubric' => $topic->rubric ?? [],
                'max_score' => $topic->max_score,
            ])->values(),
        ]);

        $extras = $this->personExtras($evaluations->pluck('user_id')->filter()->unique()->all(), $fiscal['year']);
        $byStaff = $evaluations
            ->groupBy('user_id')
            ->map(function ($rows) use ($extras) {
                $latest = $rows->sortByDesc(fn (HrdWorkEvaluation $row) => $row->evaluated_at?->timestamp ?? 0)->first();
                $extra = $extras[$latest->user_id] ?? [];

                return [
                    'user_id' => $latest->user_id,
                    'staff_name' => $latest->staff_name,
                    'count' => $rows->count(),
                    'avg_percent' => round((float) $rows->avg('percent_score'), 1),
                    'latest_percent' => $latest->percent_score,
                    'latest_at' => optional($latest->evaluated_at)->toDateString(),
                    'next_due_at' => optional($latest->next_due_at)->toDateString(),
                    'period_months' => $latest->period_months,
                    'is_overdue' => $latest->next_due_at && $latest->next_due_at->lt(now()->startOfDay()),
                    'job_satisfaction' => $extra['job_satisfaction'] ?? null,
                    'competency_avg' => $extra['competency_avg'] ?? null,
                    'competency_gaps' => $extra['competency_gaps'] ?? null,
                ];
            })
            ->sortByDesc('latest_percent')
            ->values();

        $topicAverages = $leaves->map(function (HrdWorkTopic $topic) use ($evaluations) {
            $scores = $evaluations->flatMap->scores->where('topic_id', $topic->id);

            return [
                'title' => $topic->title,
                'parent' => $topic->parent?->title,
                'avg_score' => $scores->count() ? round((float) $scores->avg('score'), 2) : null,
                'count' => $scores->count(),
            ];
        })->values();

        $cycles = $evaluations
            ->groupBy(fn (HrdWorkEvaluation $row) => $row->period_start->toDateString().'|'.$row->period_months)
            ->map(function ($rows) {
                $first = $rows->first();

                return [
                    'period_start' => $first->period_start->toDateString(),
                    'period_end' => $first->period_end->toDateString(),
                    'period_months' => $first->period_months,
                    'staff_count' => $rows->count(),
                    'avg_percent' => round((float) $rows->avg('percent_score'), 1),
                ];
            })
            ->sortByDesc('period_start')
            ->values();

        $staffIds = $this->hrd->staffUserIds($actor);
        $staffQuery = User::query()->orderBy('name');
        if ($staffIds !== null) {
            $staffQuery->whereIn('id', $staffIds === [] ? [-1] : $staffIds);
        }

        return Inertia::render('HRD/WorkEvaluation/Index', [
            'fiscalLabel' => $fiscal['label'],
            'canConfigure' => $this->hrd->isOrgEditor($actor),
            'groups' => $groups,
            'staff' => $staffQuery->get(['id', 'name']),
            'cards' => $byStaff,
            'dueSoon' => $byStaff->filter(function ($row) {
                if (! $row['next_due_at']) {
                    return false;
                }

                return Carbon::parse($row['next_due_at'])->lte(now()->addDays(30));
            })->values(),
            'topicAverages' => $topicAverages,
            'cycles' => $cycles,
            'summary' => [
                'people' => $byStaff->count(),
                'evaluations' => $evaluations->count(),
                'avg_percent' => $evaluations->count() ? round((float) $evaluations->avg('percent_score'), 1) : 0,
            ],
            'recent' => $evaluations->take(12)->map(fn (HrdWorkEvaluation $row) => [
                'id' => $row->id,
                'staff_name' => $row->staff_name,
                'percent_score' => $row->percent_score,
                'period_months' => $row->period_months,
                'period_start' => $row->period_start->toDateString(),
                'period_end' => $row->period_end->toDateString(),
                'evaluated_at' => optional($row->evaluated_at)->toDateString(),
                'evaluator_name' => $row->evaluator_name,
            ])->values(),
            'periodOptions' => collect(HrdWorkEvaluation::PERIODS)->map(fn ($months) => [
                'value' => $months,
                'label' => HrdWorkEvaluation::periodLabel($months),
            ])->values(),
        ]);
    }

    public function store(Request $request)
    {
        $actor = $this->manager();
        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'period_months' => ['required', Rule::in(HrdWorkEvaluation::PERIODS)],
            'period_start' => 'required|date',
            'evaluated_at' => 'nullable|date',
            'overall_comment' => 'nullable|string|max:2000',
            'scores' => 'required|array|min:1',
            'scores.*.topic_id' => 'required|exists:hrd_work_topics,id',
            'scores.*.score' => 'required|integer|min:1|max:5',
        ]);
        if (! $this->hrd->managesUser($actor, (int) $data['user_id'])) {
            abort(403);
        }

        $staff = User::findOrFail($data['user_id']);
        $periodStart = Carbon::parse($data['period_start'])->startOfDay();
        $periodMonths = (int) $data['period_months'];
        $evaluatedAt = ! empty($data['evaluated_at']) ? Carbon::parse($data['evaluated_at']) : now();

        DB::transaction(function () use ($data, $staff, $actor, $periodStart, $periodMonths, $evaluatedAt) {
            $total = 0.0;
            $maxTotal = 0.0;
            $scoreRows = [];
            foreach ($data['scores'] as $row) {
                $topic = HrdWorkTopic::find($row['topic_id']);
                if (! $topic || $topic->is_group || ! $topic->is_active) {
                    continue;
                }
                $score = min(max((int) $row['score'], 1), (int) $topic->max_score);
                $weight = (float) $topic->weight;
                $total += $score * $weight;
                $maxTotal += ((int) $topic->max_score) * $weight;
                $scoreRows[] = [
                    'topic_id' => $topic->id,
                    'topic_title' => $topic->title,
                    'max_score' => $topic->max_score,
                    'weight' => $weight,
                    'score' => $score,
                ];
            }
            if ($scoreRows === []) {
                abort(422, 'ต้องมีคะแนนอย่างน้อย 1 หัวข้อ');
            }

            $evaluation = HrdWorkEvaluation::create([
                'user_id' => $staff->id,
                'staff_name' => $staff->name,
                'evaluator_id' => $actor->id,
                'evaluator_name' => $actor->name,
                'period_months' => $periodMonths,
                'period_start' => $periodStart->toDateString(),
                'period_end' => $periodStart->copy()->addMonths($periodMonths)->subDay()->toDateString(),
                'evaluated_at' => $evaluatedAt->toDateString(),
                'next_due_at' => $evaluatedAt->copy()->addMonths($periodMonths)->toDateString(),
                'total_score' => round($total, 2),
                'max_total_score' => round($maxTotal, 2),
                'percent_score' => $maxTotal > 0 ? round(($total / $maxTotal) * 100, 2) : 0,
                'overall_comment' => $data['overall_comment'] ?? null,
            ]);
            $evaluation->scores()->createMany($scoreRows);
        });

        return back()->with('success', 'บันทึกผลการประเมินแล้ว');
    }

    public function destroy(HrdWorkEvaluation $evaluation)
    {
        $actor = $this->manager();
        if (! $this->hrd->managesUser($actor, (int) $evaluation->user_id)) {
            abort(403);
        }
        $evaluation->delete();

        return back()->with('success', 'ลบผลการประเมินแล้ว');
    }

    public function storeTopic(Request $request)
    {
        $actor = Auth::user();
        if (! $this->hrd->isOrgEditor($actor)) {
            abort(403);
        }
        $data = $request->validate([
            'parent_id' => 'required|exists:hrd_work_topics,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
        ]);
        $parent = HrdWorkTopic::findOrFail($data['parent_id']);
        if (! $parent->is_group) {
            return back()->withErrors(['parent_id' => 'เลือกหัวข้อหลัก']);
        }
        HrdWorkTopic::create([
            'parent_id' => $parent->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'is_group' => false,
            'max_score' => 5,
            'weight' => 1,
            'sort_order' => (int) $parent->children()->max('sort_order') + 1,
            'is_active' => true,
        ]);

        return back()->with('success', 'เพิ่มหัวข้อแล้ว');
    }

    private function manager(): User
    {
        $user = Auth::user();
        if (! $this->hrd->canManageStaff($user)) {
            abort(403);
        }

        return $user;
    }

    private function personExtras(array $userIds, int $fiscalYear): array
    {
        if ($userIds === []) {
            return [];
        }

        $jobFormId = HrdAssessmentForm::where('code', 'job_satisfaction')->value('id');
        $jobs = $jobFormId
            ? HrdAssessmentResponse::query()
                ->where('form_id', $jobFormId)
                ->where('fiscal_year', $fiscalYear)
                ->whereIn('user_id', $userIds)
                ->get()
                ->keyBy('user_id')
            : collect();

        $assessments = HrdCompetencyAssessment::query()
            ->where('fiscal_year', $fiscalYear)
            ->whereIn('user_id', $userIds)
            ->whereNotNull('supervisor_level')
            ->get()
            ->groupBy('user_id');
        $positions = DB::table('position_user')->whereIn('user_id', $userIds)->get()->groupBy('user_id');
        $matrix = HrdPositionCompetency::all()->groupBy(fn ($link) => $link->position_id.'-'.$link->competency_id);

        $extras = [];
        foreach ($userIds as $userId) {
            $rows = $assessments->get($userId, collect());
            $gaps = 0;
            foreach ($rows as $row) {
                $expected = null;
                foreach ($positions->get($userId, collect()) as $link) {
                    $match = $matrix->get($link->position_id.'-'.$row->competency_id)?->first();
                    if ($match) {
                        $expected = $match->expected_level;
                        break;
                    }
                }
                if ($expected !== null && $expected > $row->supervisor_level) {
                    $gaps++;
                }
            }
            $extras[$userId] = [
                'job_satisfaction' => $jobs->get($userId)?->total_score,
                'competency_avg' => $rows->isEmpty() ? null : round((float) $rows->avg('supervisor_level'), 2),
                'competency_gaps' => $rows->isEmpty() ? null : $gaps,
            ];
        }

        return $extras;
    }
}
