<?php

namespace App\Http\Controllers;

use App\Models\HrdCourse;
use App\Models\HrdEnrollment;
use App\Models\HrdExternalRecord;
use App\Models\HrdUserCompetency;
use App\Models\HrdModule;
use App\Models\HrdLesson;
use App\Models\HrdQuiz;
use App\Models\HrdLearningProgress;
use App\Models\HrdSatisfactionResponse;
use App\Services\Hrd\HrdCompletionService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class HrdController extends Controller
{
    public function dashboard()
    {
        $user = Auth::user();
        $hrd = app(HrdCompletionService::class);
        $fiscal = $hrd->fiscalBounds();

        $stats = [
            'total_hours' => $hrd->hoursForUser($user->id),
            'fiscal_label' => $fiscal['label'],
            'completed_courses' => HrdEnrollment::where('user_id', $user->id)
                ->where('status', 'completed')
                ->count() + HrdExternalRecord::where('user_id', $user->id)->where('status', 'approved')->count(),
            'pending_courses' => HrdEnrollment::where('user_id', $user->id)
                ->whereIn('status', ['registered', 'approved', 'pending'])
                ->count() + HrdExternalRecord::where('user_id', $user->id)->where('status', 'pending')->count(),
        ];

        // Recent Activity (Merge Internal and External)
        $internalActivity = HrdEnrollment::with(['course.modules.lessons.progress' => function($query) use ($user) {
                $query->where('user_id', $user->id);
            }])
            ->where('user_id', $user->id)
            ->whereHas('course')
            ->orderBy('updated_at', 'desc')
            ->take(5)
            ->get()
            ->map(function ($item) {
                $item->type = 'internal';
                
                // Calculate progress
                $totalLessons = 0;
                $completedLessons = 0;
                
                if ($item->course && $item->course->modules) {
                    foreach ($item->course->modules as $module) {
                        foreach ($module->lessons as $lesson) {
                            $totalLessons++;
                            if ($lesson->progress->isNotEmpty() && $lesson->progress->first()->status === 'completed') {
                                $completedLessons++;
                            }
                        }
                    }
                }
                
                $item->progress = $totalLessons > 0 ? round(($completedLessons / $totalLessons) * 100) : ($item->status === 'completed' ? 100 : 0);
                
                return $item;
            });

        $externalActivity = HrdExternalRecord::where('user_id', $user->id)
            ->orderBy('updated_at', 'desc')
            ->take(5)
            ->get()
            ->map(function ($item) {
                $item->type = 'external';
                // Mock course structure for frontend compatibility
                $item->course = [
                    'title' => $item->title,
                ];
                $item->progress = $item->status === 'approved' ? 100 : 0;
                return $item;
            });

        $recent_activity = $internalActivity->concat($externalActivity)
            ->sortByDesc('updated_at')
            ->take(5)
            ->values();

        // Upcoming Courses (Available for enrollment or enrolled future courses)
        // For now, let's just show courses starting in the future
        $upcoming_courses = HrdCourse::query()
            ->where('status', 'published')
            ->where(function ($q) {
                $q->whereNull('start_date')->orWhere('start_date', '>', now());
            })
            ->orderBy('start_date', 'asc')
            ->take(5)
            ->get();

        $canEdit = app(HrdCompletionService::class)->isEditor($user);

        return Inertia::render('HRD/Dashboard', [
            'stats' => $stats,
            'recent_activity' => $recent_activity,
            'upcoming_courses' => $upcoming_courses,
            'canEdit' => $canEdit,
        ]);
    }

    public function hub()
    {
        $hrd = app(HrdCompletionService::class);
        $user = Auth::user();

        return Inertia::render('HRD/Hub', [
            'canManageStaff' => $hrd->canManageStaff($user),
            'canConfigure' => $hrd->isOrgEditor($user),
        ]);
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        $canEdit = app(HrdCompletionService::class)->isEditor($user);

        $query = HrdCourse::query();

        if (! $canEdit) {
            $query->where('status', 'published');
        }

        if ($request->filled('search')) {
            $query->where('title', 'like', '%'.$request->search.'%');
        }

        $courses = $query->orderByDesc('updated_at')->paginate(10);

        return Inertia::render('HRD/Courses/Index', [
            'courses' => $courses,
            'filters' => $request->only(['search']),
            'canEdit' => $canEdit,
        ]);
    }

    public function show(HrdCourse $course)
    {
        $user = Auth::user();
        $canEdit = app(HrdCompletionService::class)->isEditor($user);

        if (! $canEdit && $course->status !== 'published') {
            abort(404);
        }

        $course->load(['modules.lessons', 'modules.lessons.progress' => function ($query) {
            $query->where('user_id', Auth::id());
        }]);

        $isEnrolled = HrdEnrollment::where('user_id', Auth::id())
            ->where('course_id', $course->id)
            ->exists();

        return Inertia::render('HRD/Courses/Show', [
            'course' => $course,
            'isEnrolled' => $isEnrolled,
            'canEdit' => $canEdit,
        ]);
    }

    public function learn(HrdCourse $course, HrdLesson $lesson)
    {
        // Ensure user is enrolled
        $isEnrolled = HrdEnrollment::where('user_id', Auth::id())
            ->where('course_id', $course->id)
            ->exists();

        if (!$isEnrolled) {
            return redirect()->route('km.learn.courses.show', $course->id)->with('error', 'Please enroll first.');
        }

        $course->load(['modules.lessons']);
        $lesson->load(['quiz', 'progress' => function($query) {
            $query->where('user_id', Auth::id());
        }]);

        // Get previous and next lessons
        $allLessons = $course->modules->flatMap->lessons;
        $currentIndex = $allLessons->search(function($item) use ($lesson) {
            return $item->id === $lesson->id;
        });
        
        $prevLesson = $currentIndex > 0 ? $allLessons[$currentIndex - 1] : null;
        $nextLesson = $currentIndex < $allLessons->count() - 1 ? $allLessons[$currentIndex + 1] : null;

        return Inertia::render('HRD/Courses/Learn', [
            'course' => $course,
            'lesson' => $lesson,
            'prevLesson' => $prevLesson,
            'nextLesson' => $nextLesson,
        ]);
    }

    public function completeLesson(Request $request, HrdCourse $course, HrdLesson $lesson)
    {
        HrdLearningProgress::updateOrCreate(
            [
                'user_id' => Auth::id(),
                'course_id' => $course->id,
                'lesson_id' => $lesson->id,
            ],
            [
                'status' => 'completed',
                'completed_at' => now(),
            ]
        );

        $enrollment = app(HrdCompletionService::class)->syncEnrollment(Auth::id(), $course);
        $message = $enrollment->status === 'completed'
            ? 'เรียนครบหลักสูตรแล้ว ระบบบันทึกชั่วโมงและออกเกียรติบัตรให้'
            : 'บันทึกบทเรียนนี้แล้ว';

        return back()->with('success', $message);
    }

    public function myTraining()
    {
        $user = Auth::user();

        $enrollments = HrdEnrollment::with('course')
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        $externalRecords = HrdExternalRecord::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        $satisfactionCourseIds = HrdSatisfactionResponse::where('user_id', $user->id)->pluck('course_id');

        return Inertia::render('HRD/MyTraining/Index', [
            'enrollments' => $enrollments,
            'externalRecords' => $externalRecords,
            'satisfactionCourseIds' => $satisfactionCourseIds,
        ]);
    }

    public function storeExternalRecord(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'organizer' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'hours' => 'required|numeric|min:0',
            'certificate' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:2048',
        ]);

        $path = null;
        if ($request->hasFile('certificate')) {
            $path = $request->file('certificate')->store('certificates', 'public');
        }

        HrdExternalRecord::create([
            'user_id' => Auth::id(),
            'title' => $request->title,
            'organizer' => $request->organizer,
            'location' => $request->location,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'hours' => $request->hours,
            'certificate_path' => $path,
            'status' => 'pending',
        ]);

        return redirect()->back()->with('success', 'บันทึกข้อมูลการอบรมภายนอกเรียบร้อยแล้ว');
    }

    public function mySkills()
    {
        $skills = HrdUserCompetency::with('competency')
            ->where('user_id', Auth::id())
            ->get();

        return Inertia::render('HRD/MySkills/Index', [
            'skills' => $skills,
        ]);
    }

    public function showQuiz(HrdCourse $course, HrdQuiz $quiz)
    {
        $quiz->load(['questions.answers' => function ($q) {
            $q->select('id', 'question_id', 'answer_text', 'matching_pair', 'order'); // Exclude is_correct
        }]);

        $questions = $quiz->questions;

        // สุ่มลำดับคำถามและตัวเลือกทุกครั้งที่เข้าสอบ (คนละชุด / ครั้งที่ 2 ไม่ซ้ำลำดับเดิม)
        if ($quiz->randomize_questions) {
            $questions = $questions->shuffle()->values();
        }

        $questions = $questions->map(function ($question) use ($quiz) {
            $answers = $question->answers;

            if ($quiz->randomize_questions && in_array($question->type, ['multiple_choice', 'true_false', 'matching'], true)) {
                $answers = $answers->shuffle()->values();
            }

            // ตัวเลือกฝั่งขวาของจับคู่ ต้องสุ่มแยกจากลำดับซ้าย ไม่งั้นคู่จะเรียงตรงกัน
            if ($question->type === 'matching') {
                $matchingOptions = $answers->pluck('matching_pair')->filter()->values();
                if ($quiz->randomize_questions) {
                    $matchingOptions = $matchingOptions->shuffle()->values();
                }
                $question->setAttribute('matching_options', $matchingOptions->all());
            }

            $question->setRelation('answers', $answers);

            return $question;
        });

        $quiz->setRelation('questions', $questions);

        return Inertia::render('HRD/Courses/Quiz', [
            'course' => $course,
            'quiz' => $quiz,
        ]);
    }

    public function submitQuiz(Request $request, HrdCourse $course, HrdQuiz $quiz)
    {
        $data = $request->validate([
            'answers' => 'required|array', // [question_id => answer_value]
        ]);

        $result = app(HrdCompletionService::class)->recordQuizAttempt($quiz, Auth::id(), $data['answers']);
        $label = $quiz->purpose === 'pre' ? 'ก่อนเรียน' : ($quiz->purpose === 'post' ? 'หลังเรียน' : 'แบบทดสอบ');
        $outcome = $result['passed'] ? 'ผ่าน' : 'ยังไม่ผ่าน';

        return back()->with('success', $label.' '.$outcome.' '.$result['score'].'/'.$result['total_points'].' ('.round($result['percentage']).'%)');
    }

    public function certificate(HrdEnrollment $enrollment)
    {
        $user = Auth::user();
        $service = app(HrdCompletionService::class);
        if ($enrollment->user_id !== $user->id && ! $service->managesUser($user, (int) $enrollment->user_id)) {
            abort(403);
        }
        if ($enrollment->status !== 'completed') {
            abort(404);
        }
        if (! $enrollment->certificate_path || ! Storage::disk('public')->exists($enrollment->certificate_path)) {
            $service->issueCertificate($enrollment);
            $enrollment->refresh();
        }

        return response(Storage::disk('public')->get($enrollment->certificate_path), 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }

    public function create()
    {
        if (! app(HrdCompletionService::class)->isOrgEditor(Auth::user())) {
            abort(403);
        }

        return Inertia::render('HRD/Courses/Create');
    }

    public function store(Request $request)
    {
        if (! app(HrdCompletionService::class)->isOrgEditor(Auth::user())) {
            abort(403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|in:internal,external,online,ojt,conference',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'hours' => 'required|numeric|min:0',
            'location' => 'nullable|string|max:255',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['is_active'] = true;
        $validated['status'] = 'draft';

        $course = HrdCourse::create($validated);

        $module = HrdModule::create([
            'course_id' => $course->id,
            'title' => 'บทที่ 1',
            'order' => 0,
        ]);

        HrdLesson::create([
            'module_id' => $module->id,
            'title' => 'หัวข้อแรก',
            'type' => 'text',
            'content' => '',
            'order' => 0,
        ]);

        return redirect()
            ->route('km.learn.courses.builder', $course->id)
            ->with('success', 'สร้างหลักสูตรแล้ว — เริ่มเพิ่มเนื้อหาได้เลย');
    }

    public function enroll(HrdCourse $course)
    {
        $exists = HrdEnrollment::where('user_id', Auth::id())
            ->where('course_id', $course->id)
            ->exists();

        if (!$exists) {
            HrdEnrollment::create([
                'user_id' => Auth::id(),
                'course_id' => $course->id,
                'status' => 'registered',
            ]);
        }

        return back()->with('success', 'Enrolled successfully!');
    }

    public function update(Request $request, HrdCourse $course)
    {
        if (! app(HrdCompletionService::class)->isEditor(Auth::user())) {
            abort(403, 'Unauthorized action.');
        }

        $request->merge([
            'expiration_days' => $request->filled('expiration_days') ? $request->input('expiration_days') : null,
        ]);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|in:internal,external,online,ojt,conference',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'hours' => 'required|numeric|min:0',
            'location' => 'nullable|string|max:255',
            'status' => 'nullable|in:draft,published,archived',
            'is_mandatory' => 'nullable|boolean',
            'expiration_days' => 'nullable|integer|min:1|max:3650',
            'track_behavior' => 'nullable|boolean',
        ]);

        $validated['is_mandatory'] = $request->boolean('is_mandatory');
        $validated['track_behavior'] = $request->boolean('track_behavior');
        if (empty($validated['expiration_days'])) {
            $validated['expiration_days'] = null;
        }

        $course->update($validated);

        return back()->with('success', 'บันทึกข้อมูลหลักสูตรเรียบร้อย');
    }

    public function destroy(HrdCourse $course)
    {
        if (! app(HrdCompletionService::class)->isEditor(Auth::user())) {
            abort(403, 'Unauthorized action.');
        }

        $course->delete();

        return redirect()->route('km.learn.courses.index')->with('success', 'Course deleted successfully!');
    }
}
