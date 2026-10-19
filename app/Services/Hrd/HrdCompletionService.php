<?php

namespace App\Services\Hrd;

use App\Models\DepartmentLeader;
use App\Models\HrdBehaviorReview;
use App\Models\HrdCompetencySuggestion;
use App\Models\HrdCourse;
use App\Models\HrdCourseAssignment;
use App\Models\HrdEnrollment;
use App\Models\HrdLearningProgress;
use App\Models\HrdLesson;
use App\Models\HrdQuiz;
use App\Models\HrdQuizAttempt;
use App\Models\HrdUserCompetency;
use App\Models\TeamHaMember;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

class HrdCompletionService
{
    /**
     * ปีงบประมาณราชการไทย สิ้นสุด 30 ก.ย. และใช้ปี พ.ศ. ของปีสิ้นสุดเป็นชื่อปี
     *
     * @return array{start: Carbon, end: Carbon, year: int, label: string}
     */
    public function fiscalBounds(?Carbon $on = null): array
    {
        $on = $on ?? now();
        $startYear = $on->month >= 10 ? $on->year : $on->year - 1;
        $endYear = $startYear + 1;

        return [
            'start' => Carbon::create($startYear, 10, 1)->startOfDay(),
            'end' => Carbon::create($endYear, 9, 30)->endOfDay(),
            'year' => $endYear,
            'label' => 'ปีงบประมาณ '.($endYear + 543),
        ];
    }

    /**
     * @param  array<int|string, mixed>  $answers
     * @return array{score: int, total_points: int, percentage: float, passed: bool}
     */
    public function recordQuizAttempt(HrdQuiz $quiz, int $userId, array $answers): array
    {
        $score = 0;
        $questions = $quiz->questions()->with('answers')->get();

        foreach ($questions as $question) {
            if (! array_key_exists($question->id, $answers) && ! array_key_exists((string) $question->id, $answers)) {
                continue;
            }

            $userAnswer = $answers[$question->id] ?? $answers[(string) $question->id];

            if ($question->type === 'multiple_choice' || $question->type === 'true_false') {
                $correctAnswer = $question->answers->firstWhere('is_correct', true);
                if ($correctAnswer && (string) $correctAnswer->id === (string) $userAnswer) {
                    $score += $question->points;
                }
            } elseif ($question->type === 'fill_blank') {
                $correctAnswer = $question->answers->first();
                if ($correctAnswer && mb_strtolower(trim((string) $userAnswer)) === mb_strtolower(trim($correctAnswer->answer_text))) {
                    $score += $question->points;
                }
            } elseif ($question->type === 'matching' && is_array($userAnswer)) {
                $isCorrect = true;
                foreach ($question->answers as $ans) {
                    $given = $userAnswer[$ans->id] ?? $userAnswer[(string) $ans->id] ?? null;
                    if ($given === null || trim((string) $given) !== trim((string) $ans->matching_pair)) {
                        $isCorrect = false;
                        break;
                    }
                }
                if ($isCorrect && $question->answers->isNotEmpty()) {
                    $score += $question->points;
                }
            }
        }

        $totalPoints = (int) $questions->sum('points');
        $percentage = $totalPoints > 0 ? round(($score / $totalPoints) * 100, 2) : 0;
        $passed = $percentage >= $quiz->passing_score;

        HrdQuizAttempt::create([
            'user_id' => $userId,
            'quiz_id' => $quiz->id,
            'score' => $score,
            'percentage' => $percentage,
            'total_questions' => $questions->count(),
            'passed' => $passed,
            'answers' => $answers,
            'started_at' => now(),
            'completed_at' => now(),
        ]);

        $enrollment = HrdEnrollment::firstOrCreate(
            ['user_id' => $userId, 'course_id' => $quiz->course_id],
            ['status' => 'registered']
        );

        if ($quiz->purpose === 'pre') {
            $enrollment->pre_test_score = $percentage;
        } else {
            $enrollment->post_test_score = $percentage;
        }
        $enrollment->save();

        if ($quiz->lesson_id && ($quiz->purpose === 'pre' || $passed)) {
            HrdLearningProgress::updateOrCreate(
                [
                    'user_id' => $userId,
                    'course_id' => $quiz->course_id,
                    'lesson_id' => $quiz->lesson_id,
                ],
                [
                    'status' => 'completed',
                    'completed_at' => now(),
                ]
            );
        }

        $course = HrdCourse::find($quiz->course_id);
        if ($course) {
            $this->syncEnrollment($userId, $course);
        }

        return [
            'score' => $score,
            'total_points' => $totalPoints,
            'percentage' => $percentage,
            'passed' => $passed,
        ];
    }

    public function syncEnrollment(int $userId, HrdCourse $course): HrdEnrollment
    {
        $enrollment = HrdEnrollment::firstOrCreate(
            ['user_id' => $userId, 'course_id' => $course->id],
            ['status' => 'registered']
        );

        if ($enrollment->status === 'completed') {
            return $enrollment;
        }

        $lessonIds = HrdLesson::query()
            ->whereIn('module_id', $course->modules()->pluck('id'))
            ->pluck('id');

        if ($lessonIds->isEmpty()) {
            return $enrollment;
        }

        $completedIds = HrdLearningProgress::query()
            ->where('user_id', $userId)
            ->where('course_id', $course->id)
            ->where('status', 'completed')
            ->whereIn('lesson_id', $lessonIds)
            ->pluck('lesson_id');

        $lessonsDone = $lessonIds->diff($completedIds)->isEmpty();

        $requiredQuizzes = HrdQuiz::query()
            ->where('course_id', $course->id)
            ->where('purpose', '!=', 'pre')
            ->pluck('id');

        $quizzesDone = true;
        foreach ($requiredQuizzes as $quizId) {
            $passed = HrdQuizAttempt::query()
                ->where('user_id', $userId)
                ->where('quiz_id', $quizId)
                ->where('passed', true)
                ->exists();
            if (! $passed) {
                $quizzesDone = false;
                break;
            }
        }

        if ($lessonsDone && $quizzesDone) {
            $completedAt = now();
            $enrollment->status = 'completed';
            $enrollment->completed_at = $completedAt;
            $enrollment->expires_at = $course->expiration_days
                ? $completedAt->copy()->addDays((int) $course->expiration_days)->toDateString()
                : null;
            $enrollment->save();

            $this->issueCertificate($enrollment->fresh(['user', 'course']));
            $this->refreshAssignments($userId, $course->id);
            $this->suggestCompetencies($enrollment->fresh(['course.competencies']));
            $this->openBehaviorReview($enrollment->fresh('course'));
        } elseif ($enrollment->status === 'registered') {
            $enrollment->status = 'attended';
            $enrollment->save();
        }

        return $enrollment->fresh();
    }

    public function issueCertificate(HrdEnrollment $enrollment): void
    {
        $enrollment->loadMissing(['user', 'course']);
        if (! $enrollment->user || ! $enrollment->course) {
            return;
        }

        $html = view('hrd.certificate', [
            'name' => $enrollment->user->name,
            'course' => $enrollment->course->title,
            'hours' => $enrollment->course->hours,
            'completedAt' => $enrollment->completed_at,
            'expiresAt' => $enrollment->expires_at,
        ])->render();

        $path = 'hrd/certificates/enrollment-'.$enrollment->id.'.html';
        Storage::disk('public')->put($path, $html);
        $enrollment->certificate_path = $path;
        $enrollment->save();
    }

    public function refreshAssignments(int $userId, int $courseId): void
    {
        HrdCourseAssignment::query()
            ->where('user_id', $userId)
            ->where('course_id', $courseId)
            ->where('status', '!=', 'completed')
            ->update(['status' => 'completed']);
    }

    public function suggestCompetencies(HrdEnrollment $enrollment): void
    {
        $enrollment->loadMissing('course.competencies');
        $course = $enrollment->course;
        if (! $course) {
            return;
        }

        foreach ($course->competencies as $competency) {
            $proposed = max(1, min(5, (int) $competency->pivot->score_weight));
            $current = (int) HrdUserCompetency::query()
                ->where('user_id', $enrollment->user_id)
                ->where('competency_id', $competency->id)
                ->value('level');

            if ($proposed <= $current) {
                continue;
            }

            HrdCompetencySuggestion::query()->updateOrCreate(
                [
                    'user_id' => $enrollment->user_id,
                    'competency_id' => $competency->id,
                    'status' => 'pending',
                ],
                [
                    'course_id' => $course->id,
                    'proposed_level' => $proposed,
                ]
            );
        }
    }

    public function openBehaviorReview(HrdEnrollment $enrollment): void
    {
        $enrollment->loadMissing('course');
        if (! $enrollment->course?->track_behavior || ! $enrollment->completed_at) {
            return;
        }

        HrdBehaviorReview::query()->firstOrCreate(
            ['enrollment_id' => $enrollment->id],
            [
                'due_on' => $enrollment->completed_at->copy()->addMonths(3)->toDateString(),
                'status' => 'pending',
            ]
        );
    }

    public function hoursForUser(int $userId, ?Carbon $start = null, ?Carbon $end = null): float
    {
        $bounds = $this->fiscalBounds();
        $start = $start ?? $bounds['start'];
        $end = $end ?? $bounds['end'];

        $internal = HrdEnrollment::query()
            ->where('hrd_enrollments.user_id', $userId)
            ->where('hrd_enrollments.status', 'completed')
            ->where(function ($query) use ($start, $end) {
                $query->whereBetween('hrd_enrollments.completed_at', [$start, $end])
                    ->orWhere(function ($inner) use ($start, $end) {
                        $inner->whereNull('hrd_enrollments.completed_at')
                            ->whereBetween('hrd_enrollments.updated_at', [$start, $end]);
                    });
            })
            ->join('hrd_courses', 'hrd_enrollments.course_id', '=', 'hrd_courses.id')
            ->sum('hrd_courses.hours');

        $external = \App\Models\HrdExternalRecord::query()
            ->where('user_id', $userId)
            ->where('status', 'approved')
            ->whereBetween('start_date', [$start->toDateString(), $end->toDateString()])
            ->sum('hours');

        return (float) $internal + (float) $external;
    }

    public function isEditor(?User $user): bool
    {
        return $this->isOrgEditor($user);
    }

    public function isOrgEditor(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        if ($user->hasRole(['admin', 'Admin', 'superUser'])) {
            return true;
        }

        return $this->isHrdTeamMember($user);
    }

    public function isDepartmentHead(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        return DepartmentLeader::userLeads($user, null, DepartmentLeader::ROLE_HEAD);
    }

    public function canManageStaff(?User $user): bool
    {
        return $this->isOrgEditor($user) || $this->isDepartmentHead($user);
    }

    /**
     * null = ทั้งองค์กร, array = เฉพาะคนในแผนกที่ผู้ใช้เป็นหัวหน้า
     *
     * @return array<int>|null
     */
    public function staffUserIds(?User $user): ?array
    {
        if (! $user || $this->isOrgEditor($user)) {
            return null;
        }

        if (! $this->isDepartmentHead($user)) {
            return [];
        }

        $departmentIds = $this->ledDepartmentIds($user) ?? [];
        if ($departmentIds === []) {
            return [];
        }

        return User::query()
            ->where(function (Builder $query) use ($departmentIds) {
                $query->whereIn('department_id', $departmentIds)
                    ->orWhereHas('departments', fn (Builder $departments) => $departments->whereIn('departments.id', $departmentIds));
            })
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * @return array<int>|null
     */
    public function ledDepartmentIds(?User $user): ?array
    {
        if (! $user || $this->isOrgEditor($user)) {
            return null;
        }

        return DepartmentLeader::query()
            ->where('user_id', $user->id)
            ->where('role', DepartmentLeader::ROLE_HEAD)
            ->pluck('department_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    public function managesUser(?User $actor, int $targetId): bool
    {
        if (! $this->canManageStaff($actor)) {
            return false;
        }

        $ids = $this->staffUserIds($actor);

        return $ids === null || in_array($targetId, $ids, true);
    }

    public function resolveManagedUser(User $actor, ?int $requestedId): User
    {
        if (! $requestedId || $requestedId === $actor->id) {
            return $actor;
        }

        if (! $this->managesUser($actor, $requestedId)) {
            abort(403);
        }

        return User::findOrFail($requestedId);
    }

    public function userOptions(User $actor): Collection
    {
        $query = User::query()->orderBy('name');
        $ids = $this->staffUserIds($actor);
        if ($ids !== null) {
            $query->whereIn('id', $ids === [] ? [-1] : $ids);
        }

        $users = $query->get(['id', 'name']);
        if (! $users->contains('id', $actor->id)) {
            $users->prepend($actor);
        }

        return $users->map(fn (User $user) => $user->only(['id', 'name']))->values();
    }

    public function limitToStaff(Builder $query, ?User $actor, string $column = 'user_id'): Builder
    {
        $ids = $this->staffUserIds($actor);
        if ($ids === null) {
            return $query;
        }

        return $query->whereIn($column, $ids === [] ? [-1] : $ids);
    }

    private function isHrdTeamMember(User $user): bool
    {
        if ($user->haTeams()->whereRaw('UPPER(abbreviation) = ?', ['HRD'])->exists()) {
            return true;
        }

        return TeamHaMember::query()
            ->where('user_id', $user->id)
            ->whereHas('team', fn (Builder $query) => $query->whereRaw('UPPER(abbreviation) = ?', ['HRD']))
            ->exists();
    }
}
