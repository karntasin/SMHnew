<?php

namespace App\Http\Controllers\Im;

use App\Data\ImStaffEvaluationTopicCatalog;
use App\Http\Controllers\Controller;
use App\Models\Im\EvaluationTopic;
use App\Models\Im\StaffEvaluation;
use App\Models\Im\StaffEvaluationScore;
use App\Models\User;
use App\Services\ThaiPdfService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class StaffEvaluationController extends Controller
{
    private const HOSPITAL_NAME = 'โรงพยาบาลค่ายสุรสิงหนาท';

    public function index(Request $request): Response
    {
        $this->syncCatalogTopics();

        $periodFilter = $request->integer('period_months') ?: null;
        if ($periodFilter && ! in_array($periodFilter, StaffEvaluation::PERIODS, true)) {
            $periodFilter = null;
        }

        $year = null;
        if ($request->filled('year') && $request->query('year') !== 'all') {
            $year = $request->integer('year');
        }
        $staffId = $request->integer('staff_id') ?: null;

        $evaluationsQuery = StaffEvaluation::query()
            ->with(['user:id,name', 'evaluator:id,name', 'scores'])
            ->when($year, fn ($q) => $q->whereYear('period_start', $year))
            ->latest('evaluated_at')
            ->latest('id');

        if ($periodFilter) {
            $evaluationsQuery->where('period_months', $periodFilter);
        }
        if ($staffId) {
            $evaluationsQuery->where('user_id', $staffId);
        }

        $evaluations = $evaluationsQuery->get();

        $topics = EvaluationTopic::query()
            ->with(['parent:id,code,title', 'children'])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $activeLeaves = $topics
            ->where('is_active', true)
            ->where('is_group', false)
            ->values()
            ->map(fn (EvaluationTopic $topic) => $this->serializeTopic($topic));

        $topicGroups = $topics
            ->where('is_group', true)
            ->whereNull('parent_id')
            ->values()
            ->map(function (EvaluationTopic $group) {
                $children = $group->children
                    ->sortBy([['sort_order', 'asc'], ['id', 'asc']])
                    ->values()
                    ->map(fn (EvaluationTopic $child) => $this->serializeTopic($child));

                return [
                    ...$this->serializeTopic($group),
                    'children' => $children,
                ];
            });

        $ungroupedTopics = $topics
            ->where('is_group', false)
            ->whereNull('parent_id')
            ->where('is_active', true)
            ->values()
            ->map(fn (EvaluationTopic $topic) => $this->serializeTopic($topic));

        $byStaff = $evaluations
            ->groupBy(fn (StaffEvaluation $e) => $e->user_id ? 'u:'.$e->user_id : 'n:'.$e->staff_name)
            ->map(function ($rows) {
                /** @var \Illuminate\Support\Collection<int, StaffEvaluation> $rows */
                $latest = $rows->sortByDesc(fn ($e) => $e->evaluated_at?->timestamp ?? 0)->first();
                $avg = round((float) $rows->avg('percent_score'), 1);

                return [
                    'staff_name' => $latest->staff_name,
                    'user_id' => $latest->user_id,
                    'count' => $rows->count(),
                    'avg_percent' => $avg,
                    'latest_percent' => $latest->percent_score,
                    'latest_at' => optional($latest->evaluated_at)?->toDateString(),
                    'next_due_at' => optional($latest->next_due_at)?->toDateString(),
                    'period_months' => $latest->period_months,
                    'is_overdue' => $latest->next_due_at && $latest->next_due_at->lt(now()->startOfDay()),
                ];
            })
            ->values()
            ->sortByDesc('avg_percent')
            ->values();

        $topicAverages = [];
        foreach ($activeLeaves as $topic) {
            $scores = $evaluations->flatMap->scores->where('topic_id', $topic['id']);
            if ($scores->isEmpty()) {
                $scores = $evaluations->flatMap->scores->where('topic_title', $topic['title']);
            }
            $topicAverages[] = [
                'topic_id' => $topic['id'],
                'title' => $topic['title'],
                'parent_title' => $topic['parent_title'],
                'avg_score' => $scores->count() ? round((float) $scores->avg('score'), 2) : null,
                'max_score' => $topic['max_score'],
                'count' => $scores->count(),
            ];
        }

        $dueSoon = $byStaff->filter(function ($row) {
            if (! $row['next_due_at']) {
                return false;
            }
            $due = Carbon::parse($row['next_due_at']);

            return $due->lte(now()->addDays(30));
        })->values();

        $cycles = StaffEvaluation::query()
            ->select('period_start', 'period_end', 'period_months')
            ->selectRaw('COUNT(*) as staff_count')
            ->selectRaw('ROUND(AVG(percent_score), 1) as avg_percent')
            ->groupBy('period_start', 'period_end', 'period_months')
            ->orderByDesc('period_start')
            ->get()
            ->map(fn ($row) => [
                'period_start' => optional($row->period_start)?->toDateString() ?? (string) $row->period_start,
                'period_end' => optional($row->period_end)?->toDateString() ?? (string) $row->period_end,
                'period_months' => (int) $row->period_months,
                'staff_count' => (int) $row->staff_count,
                'avg_percent' => (float) $row->avg_percent,
            ])
            ->values();

        return Inertia::render('Im/StaffEvaluation', [
            'topics' => $topics->map(fn (EvaluationTopic $topic) => $this->serializeTopic($topic))->values(),
            'topicGroups' => $topicGroups,
            'ungroupedTopics' => $ungroupedTopics,
            'activeTopics' => $activeLeaves,
            'evaluations' => $evaluations,
            'staff' => User::orderBy('name')->get(['id', 'name']),
            'filters' => [
                'period_months' => $periodFilter,
                'year' => $year,
                'staff_id' => $staffId,
            ],
            'periodOptions' => collect(StaffEvaluation::PERIODS)->map(fn ($m) => [
                'value' => $m,
                'label' => StaffEvaluation::periodLabel($m),
            ])->values(),
            'report' => [
                'by_staff' => $byStaff,
                'topic_averages' => $topicAverages,
                'due_soon' => $dueSoon,
                'cycles' => $cycles,
            ],
            'summary' => [
                'topics' => $activeLeaves->count(),
                'groups' => $topicGroups->count(),
                'evaluations' => $evaluations->count(),
                'avg_percent' => $evaluations->count() ? round((float) $evaluations->avg('percent_score'), 1) : 0,
                'overdue' => $byStaff->where('is_overdue', true)->count(),
                'due_soon' => $dueSoon->count(),
            ],
        ]);
    }

    public function storeTopic(Request $request)
    {
        $data = $this->validateTopic($request);
        if ($data['is_group']) {
            $data['parent_id'] = null;
            $data['max_score'] = 0;
            $data['weight'] = 0;
        }
        $data['sort_order'] = $data['sort_order'] ?? ((int) EvaluationTopic::max('sort_order') + 1);
        EvaluationTopic::create($data);

        return back()->with('success', 'เพิ่มหัวข้อการประเมินเรียบร้อย');
    }

    public function updateTopic(Request $request, EvaluationTopic $topic)
    {
        $data = $this->validateTopic($request);
        if ($data['is_group']) {
            $data['parent_id'] = null;
            $data['max_score'] = 0;
            $data['weight'] = 0;
        }
        $topic->update($data);

        return back()->with('success', 'อัปเดตหัวข้อเรียบร้อย');
    }

    public function destroyTopic(EvaluationTopic $topic)
    {
        if ($topic->children()->exists()) {
            return back()->with('error', 'ไม่สามารถลบหัวข้อหลักที่มีหัวข้อย่อยได้ กรุณาลบหรือย้ายหัวข้อย่อยก่อน');
        }

        $topic->delete();

        return back()->with('success', 'ลบหัวข้อเรียบร้อย');
    }

    public function storeEvaluation(Request $request)
    {
        $data = $this->validateEvaluation($request);

        DB::transaction(function () use ($data) {
            $staffName = $data['staff_name'];
            if (! empty($data['user_id'])) {
                $user = User::find($data['user_id']);
                $staffName = $user?->name ?: $staffName;
            }

            $periodStart = Carbon::parse($data['period_start'])->startOfDay();
            $periodMonths = (int) $data['period_months'];
            $periodEnd = $periodStart->copy()->addMonths($periodMonths)->subDay();
            $evaluatedAt = ! empty($data['evaluated_at'])
                ? Carbon::parse($data['evaluated_at'])
                : now();
            $nextDue = $evaluatedAt->copy()->addMonths($periodMonths);

            $total = 0.0;
            $maxTotal = 0.0;
            $scoreRows = [];

            foreach ($data['scores'] as $row) {
                $topic = EvaluationTopic::find($row['topic_id']);
                if (! $topic || ! $topic->is_active || $topic->is_group) {
                    continue;
                }
                $max = (int) $topic->max_score;
                $weight = (float) $topic->weight;
                $score = min(max((float) $row['score'], 0), $max);
                $total += $score * $weight;
                $maxTotal += $max * $weight;
                $scoreRows[] = [
                    'topic_id' => $topic->id,
                    'topic_title' => $topic->title,
                    'max_score' => $max,
                    'weight' => $weight,
                    'score' => $score,
                    'note' => $row['note'] ?? null,
                ];
            }

            if (count($scoreRows) === 0) {
                abort(422, 'ต้องมีคะแนนอย่างน้อย 1 หัวข้อ');
            }

            $evaluation = StaffEvaluation::create([
                'user_id' => $data['user_id'] ?? null,
                'staff_name' => $staffName,
                'evaluator_id' => Auth::id(),
                'evaluator_name' => Auth::user()?->name,
                'period_months' => $periodMonths,
                'period_start' => $periodStart->toDateString(),
                'period_end' => $periodEnd->toDateString(),
                'evaluated_at' => $evaluatedAt->toDateString(),
                'next_due_at' => $nextDue->toDateString(),
                'total_score' => round($total, 2),
                'max_total_score' => round($maxTotal, 2),
                'percent_score' => $maxTotal > 0 ? round(($total / $maxTotal) * 100, 2) : 0,
                'overall_comment' => $data['overall_comment'] ?? null,
                'status' => 'completed',
            ]);

            $evaluation->scores()->createMany($scoreRows);
        });

        return back()->with('success', 'บันทึกผลการประเมินเรียบร้อย');
    }

    public function destroyEvaluation(StaffEvaluation $evaluation)
    {
        $evaluation->delete();

        return back()->with('success', 'ลบผลการประเมินเรียบร้อย');
    }

    public function exportCyclePdf(Request $request, ThaiPdfService $pdf): HttpResponse
    {
        $periodStart = $request->query('period_start');
        if (! $periodStart) {
            abort(422, 'กรุณาระบุวันเริ่มวงรอบ');
        }

        $evaluations = StaffEvaluation::query()
            ->with(['scores.topic.parent'])
            ->whereDate('period_start', $periodStart)
            ->when($request->filled('period_months'), fn ($q) => $q->where('period_months', $request->integer('period_months')))
            ->orderBy('staff_name')
            ->get();

        if ($evaluations->isEmpty()) {
            abort(404, 'ไม่พบผลการประเมินในวงรอบนี้');
        }

        $first = $evaluations->first();
        [$fontRegularUri, $fontBoldUri] = $pdf->fontUris();
        $now = now()->timezone(config('app.timezone'));

        $html = view('im.staff-evaluation-cycle-pdf', [
            'hospitalName' => self::HOSPITAL_NAME,
            'evaluations' => $evaluations,
            'blocks' => $evaluations->map(fn (StaffEvaluation $evaluation) => [
                'evaluation' => $evaluation,
                'groups' => $this->scoreGroups($evaluation),
            ]),
            'cycleLabel' => $this->formatThaiDate(Carbon::parse($first->period_start)).' – '.$this->formatThaiDate(Carbon::parse($first->period_end)),
            'fromDateLabel' => $this->formatThaiDate(Carbon::parse($first->period_start)),
            'toDateLabel' => $this->formatThaiDate(Carbon::parse($first->period_end)),
            'generatedAt' => $this->formatThaiDateTime($now),
            'generatedAtDate' => $this->formatThaiDate($now),
            'formatDate' => fn ($d) => $d ? $this->formatThaiDate(Carbon::parse($d)) : '—',
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
        ])->render();

        $filename = 'ประเมินIT-วงรอบ-'.$first->period_start->format('Y-m-d').'.pdf';

        return response($pdf->render($html, 'portrait', true), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }

    public function exportEvaluationPdf(StaffEvaluation $evaluation, ThaiPdfService $pdf): HttpResponse
    {
        $evaluation->load(['scores.topic.parent']);
        [$fontRegularUri, $fontBoldUri] = $pdf->fontUris();
        $now = now()->timezone(config('app.timezone'));

        $html = view('im.staff-evaluation-pdf', [
            'hospitalName' => self::HOSPITAL_NAME,
            'evaluation' => $evaluation,
            'groups' => $this->scoreGroups($evaluation),
            'cycleLabel' => $this->formatThaiDate(Carbon::parse($evaluation->period_start)).' – '.$this->formatThaiDate(Carbon::parse($evaluation->period_end)),
            'generatedAt' => $this->formatThaiDateTime($now),
            'generatedAtDate' => $this->formatThaiDate($now),
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
        ])->render();

        $filename = 'ประเมินIT-'.$evaluation->staff_name.'-'.$evaluation->period_start->format('Y-m-d').'.pdf';

        return response($pdf->render($html, 'portrait', true), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }

    private function validateTopic(Request $request): array
    {
        $request->merge([
            'parent_id' => $request->filled('parent_id') ? $request->input('parent_id') : null,
            'is_group' => $request->boolean('is_group'),
            'is_active' => $request->boolean('is_active', true),
        ]);

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'parent_id' => 'nullable|exists:im_evaluation_topics,id',
            'is_group' => 'boolean',
            'max_score' => 'required|integer|min:0|max:100',
            'weight' => 'required|numeric|min:0|max:100',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        $data['is_group'] = (bool) ($data['is_group'] ?? false);
        $data['is_active'] = (bool) ($data['is_active'] ?? true);
        if ($data['is_group']) {
            $data['parent_id'] = null;
        }

        return $data;
    }

    private function validateEvaluation(Request $request): array
    {
        return $request->validate([
            'user_id' => 'nullable|exists:users,id',
            'staff_name' => 'required|string|max:255',
            'period_months' => ['required', Rule::in(StaffEvaluation::PERIODS)],
            'period_start' => 'required|date',
            'evaluated_at' => 'nullable|date',
            'overall_comment' => 'nullable|string',
            'scores' => 'required|array|min:1',
            'scores.*.topic_id' => 'required|exists:im_evaluation_topics,id',
            'scores.*.score' => 'required|numeric|min:0',
            'scores.*.note' => 'nullable|string|max:255',
        ]);
    }

    private function scoreGroups(StaffEvaluation $evaluation)
    {
        return $evaluation->scores
            ->sortBy(fn (StaffEvaluationScore $score) => $score->topic?->sort_order ?? 9999)
            ->groupBy(fn (StaffEvaluationScore $score) => $score->topic?->parent?->title ?: 'หัวข้อเพิ่มเติม')
            ->map(function ($rows) {
                return $rows->map(fn (StaffEvaluationScore $score) => [
                    'code' => $score->topic?->code,
                    'title' => $score->topic_title,
                    'description' => $score->topic?->description,
                    'score' => $score->score,
                    'max_score' => $score->max_score,
                    'note' => $score->note,
                ])->values();
            });
    }

    private function formatThaiDate(Carbon $dt): string
    {
        $months = [1 => 'ม.ค.', 2 => 'ก.พ.', 3 => 'มี.ค.', 4 => 'เม.ย.', 5 => 'พ.ค.', 6 => 'มิ.ย.',
            7 => 'ก.ค.', 8 => 'ส.ค.', 9 => 'ก.ย.', 10 => 'ต.ค.', 11 => 'พ.ย.', 12 => 'ธ.ค.'];

        return $dt->day.' '.$months[(int) $dt->month].' '.($dt->year + 543);
    }

    private function formatThaiDateTime(Carbon $dt): string
    {
        return $this->formatThaiDate($dt).' เวลา '.$dt->format('H:i').' น.';
    }

    private function serializeTopic(EvaluationTopic $topic): array
    {
        return [
            'id' => $topic->id,
            'code' => $topic->code,
            'parent_id' => $topic->parent_id,
            'parent_title' => $topic->parent?->title,
            'parent_code' => $topic->parent?->code,
            'is_group' => (bool) $topic->is_group,
            'title' => $topic->title,
            'description' => $topic->description,
            'max_score' => (int) $topic->max_score,
            'weight' => (float) $topic->weight,
            'sort_order' => (int) $topic->sort_order,
            'is_active' => (bool) $topic->is_active,
        ];
    }

    private function syncCatalogTopics(): void
    {
        $sort = 0;
        foreach (ImStaffEvaluationTopicCatalog::tree() as $group) {
            $sort += 10;
            $parent = EvaluationTopic::query()->updateOrCreate(
                ['code' => $group['code']],
                [
                    'title' => $group['title'],
                    'description' => $group['description'],
                    'parent_id' => null,
                    'is_group' => true,
                    'max_score' => 0,
                    'weight' => 0,
                    'sort_order' => $sort,
                    'is_active' => true,
                ]
            );

            $childSort = $sort;
            foreach ($group['children'] as $child) {
                $childSort++;
                EvaluationTopic::query()->updateOrCreate(
                    ['code' => $child['code']],
                    [
                        'title' => $child['title'],
                        'description' => $child['description'],
                        'parent_id' => $parent->id,
                        'is_group' => false,
                        'max_score' => 5,
                        'weight' => 1,
                        'sort_order' => $childSort,
                        'is_active' => true,
                    ]
                );
            }
        }

        EvaluationTopic::query()
            ->whereNull('code')
            ->whereIn('title', ImStaffEvaluationTopicCatalog::legacyDefaultTitles())
            ->update(['is_active' => false]);
    }
}
