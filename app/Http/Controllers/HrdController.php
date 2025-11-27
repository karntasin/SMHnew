<?php

namespace App\Http\Controllers;

use App\Models\HrdCourse;
use App\Models\HrdEnrollment;
use App\Models\HrdExternalRecord;
use App\Models\HrdUserCompetency;
use App\Models\HrdModule;
use App\Models\HrdLesson;
use App\Models\HrdQuiz;
use App\Models\HrdQuizAttempt;
use App\Models\HrdLearningProgress;
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
        
        // Personal Stats
        $internalHours = HrdEnrollment::where('user_id', $user->id)
            ->where('hrd_enrollments.status', 'completed')
            ->join('hrd_courses', 'hrd_enrollments.course_id', '=', 'hrd_courses.id')
            ->sum('hrd_courses.hours');

        $externalHours = HrdExternalRecord::where('user_id', $user->id)
            ->where('status', 'approved')
            ->sum('hours');

        $stats = [
            'total_hours' => $internalHours + $externalHours,
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
        $upcoming_courses = HrdCourse::where('start_date', '>', now())
            ->orderBy('start_date', 'asc')
            ->take(5)
            ->get();

        return Inertia::render('HRD/Dashboard', [
            'stats' => $stats,
            'recent_activity' => $recent_activity,
            'upcoming_courses' => $upcoming_courses,
        ]);
    }

    public function index(Request $request)
    {
        $query = HrdCourse::query();

        if ($request->has('search')) {
            $query->where('title', 'like', '%' . $request->search . '%');
        }

        $courses = $query->orderBy('start_date', 'desc')->paginate(10);

        $user = Auth::user();
        $canEdit = $user->hasRole(['admin', 'header', 'Admin', 'Header']);

        return Inertia::render('HRD/Courses/Index', [
            'courses' => $courses,
            'filters' => $request->only(['search']),
            'canEdit' => $canEdit,
        ]);
    }

    public function show(HrdCourse $course)
    {
        $course->load(['modules.lessons', 'modules.lessons.progress' => function($query) {
            $query->where('user_id', Auth::id());
        }]);

        $isEnrolled = HrdEnrollment::where('user_id', Auth::id())
            ->where('course_id', $course->id)
            ->exists();

        $user = Auth::user();
        $canEdit = $user->hasRole(['admin', 'header', 'Admin', 'Header']);

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

        return back()->with('success', 'Lesson completed!');
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

        return Inertia::render('HRD/MyTraining/Index', [
            'enrollments' => $enrollments,
            'externalRecords' => $externalRecords,
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
        $quiz->load(['questions.answers' => function($q) {
            $q->select('id', 'question_id', 'answer_text', 'order'); // Exclude is_correct
        }]);
        
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

        $score = 0;
        $questions = $quiz->questions()->with('answers')->get();
        $totalQuestions = $questions->count();
        
        foreach ($questions as $question) {
            if (!isset($data['answers'][$question->id])) {
                continue;
            }

            $userAnswer = $data['answers'][$question->id];

            if ($question->type === 'multiple_choice' || $question->type === 'true_false') {
                // User sends answer_id
                $correctAnswer = $question->answers->where('is_correct', true)->first();
                if ($correctAnswer && $correctAnswer->id == $userAnswer) {
                    $score += $question->points;
                }
            } elseif ($question->type === 'fill_blank') {
                // User sends text string
                $correctAnswer = $question->answers->first(); // Assuming one correct answer stored
                if ($correctAnswer && strtolower(trim($userAnswer)) === strtolower(trim($correctAnswer->answer_text))) {
                    $score += $question->points;
                }
            } elseif ($question->type === 'matching') {
                // User sends array [answer_id => user_matched_text]
                // Or better: [answer_id => user_matched_pair_text]
                // Let's assume user sends: [answer_id_1 => "Right Side 1", answer_id_2 => "Right Side 2"]
                
                $isCorrect = true;
                if (!is_array($userAnswer)) {
                    $isCorrect = false;
                } else {
                    foreach ($question->answers as $ans) {
                        // Check if user provided a match for this answer item
                        if (!isset($userAnswer[$ans->id])) {
                            $isCorrect = false;
                            break;
                        }
                        // Check if the match is correct
                        if (trim($userAnswer[$ans->id]) !== trim($ans->matching_pair)) {
                            $isCorrect = false;
                            break;
                        }
                    }
                }
                
                if ($isCorrect) {
                    $score += $question->points;
                }
            }
        }

        // Calculate total possible points instead of just question count
        $totalPoints = $questions->sum('points');
        $percentage = $totalPoints > 0 ? ($score / $totalPoints) * 100 : 0;
        $passed = $percentage >= $quiz->passing_score;

        HrdQuizAttempt::create([
            'user_id' => Auth::id(),
            'quiz_id' => $quiz->id,
            'score' => $score,
            'total_questions' => $totalQuestions, // Or store total_points
            'passed' => $passed,
            'started_at' => now(), // Simplified
            'completed_at' => now(),
        ]);

        return back()->with('success', 'Quiz submitted! Score: ' . $score . '/' . $totalPoints . ' (' . round($percentage) . '%)');
    }

    public function create()
    {
        return Inertia::render('HRD/Courses/Create');
    }

    public function store(Request $request)
    {
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

        return redirect()->route('km.learn.courses.builder', $course->id)->with('success', 'Course created! Now add content.');
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
        if (!Auth::user()->hasRole(['admin', 'header', 'Admin', 'Header'])) {
            abort(403, 'Unauthorized action.');
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

        $course->update($validated);

        return back()->with('success', 'Course updated successfully!');
    }

    public function destroy(HrdCourse $course)
    {
        if (!Auth::user()->hasRole(['admin', 'header', 'Admin', 'Header'])) {
            abort(403, 'Unauthorized action.');
        }

        $course->delete();

        return redirect()->route('km.learn.courses.index')->with('success', 'Course deleted successfully!');
    }
}
