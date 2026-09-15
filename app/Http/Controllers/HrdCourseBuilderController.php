<?php

namespace App\Http\Controllers;

use App\Models\HrdCourse;
use App\Models\HrdModule;
use App\Models\HrdLesson;
use App\Models\HrdQuiz;
use App\Models\HrdQuestion;
use App\Models\HrdAnswer;
use App\Services\Hrd\HrdQuizExcelService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class HrdCourseBuilderController extends Controller
{
    public function edit(HrdCourse $course)
    {
        if (!auth()->user()->hasRole(['admin', 'header', 'Admin', 'Header'])) {
            abort(403, 'Unauthorized action.');
        }

        $course->load(['modules.lessons.quiz.questions.answers']);
        
        return Inertia::render('HRD/Courses/Builder', [
            'course' => $course,
        ]);
    }

    public function update(Request $request, HrdCourse $course)
    {
        if (!auth()->user()->hasRole(['admin', 'header', 'Admin', 'Header'])) {
            abort(403, 'Unauthorized action.');
        }

        // This is a complex update. We receive the full structure.
        // Strategy: Sync modules, then lessons, then quizzes/questions.
        
        $data = $request->validate([
            'modules' => 'array',
            'modules.*.title' => 'required|string',
            'modules.*.lessons' => 'array',
        ]);

        DB::transaction(function () use ($course, $data) {
            // 1. Sync Modules
            // Get existing module IDs to identify deletions
            $existingModuleIds = $course->modules()->pluck('id')->toArray();
            $updatedModuleIds = [];

            foreach ($data['modules'] as $moduleIndex => $moduleData) {
                $module = null;
                if (! empty($moduleData['id'])) {
                    $module = HrdModule::where('course_id', $course->id)->find($moduleData['id']);
                }

                if (! $module) {
                    $module = new HrdModule();
                    $module->course_id = $course->id;
                }

                $module->title = $moduleData['title'];
                $module->order = $moduleIndex;
                $module->save();
                $updatedModuleIds[] = $module->id;

                // 2. Sync Lessons
                $existingLessonIds = $module->lessons()->pluck('id')->toArray();
                $updatedLessonIds = [];

                if (isset($moduleData['lessons'])) {
                    foreach ($moduleData['lessons'] as $lessonIndex => $lessonData) {
                        $lesson = null;
                        if (! empty($lessonData['id'])) {
                            $lesson = HrdLesson::where('module_id', $module->id)->find($lessonData['id']);
                        }

                        if (! $lesson) {
                            $lesson = new HrdLesson();
                            $lesson->module_id = $module->id;
                        }

                        $lesson->title = $lessonData['title'];
                        $lesson->type = $lessonData['type'];
                        $lesson->content = $lessonData['content'] ?? '';
                        $lesson->video_url = $lessonData['video_url'] ?? null;
                        if (array_key_exists('file_path', $lessonData)) {
                            $lesson->file_path = $lessonData['file_path'] ?: null;
                        }
                        $lesson->order = $lessonIndex;
                        $lesson->save();
                        $updatedLessonIds[] = $lesson->id;

                        // 3. Sync Quiz (if type is quiz)
                        if ($lesson->type === 'quiz' && isset($lessonData['quiz'])) {
                            $quizData = $lessonData['quiz'];
                            $quiz = $lesson->quiz;
                            if (!$quiz) {
                                $quiz = new HrdQuiz();
                                $quiz->course_id = $course->id;
                                $quiz->lesson_id = $lesson->id;
                            }
                            
                            $quiz->title = $quizData['title'] ?? $lesson->title;
                            $quiz->description = $quizData['description'] ?? '';
                            $quiz->passing_score = $quizData['passing_score'] ?? 70;
                            $quiz->randomize_questions = array_key_exists('randomize_questions', $quizData)
                                ? (bool) $quizData['randomize_questions']
                                : true;
                            $quiz->save();

                            // 4. Sync Questions
                            $existingQuestionIds = $quiz->questions()->pluck('id')->toArray();
                            $updatedQuestionIds = [];

                            if (isset($quizData['questions'])) {
                                foreach ($quizData['questions'] as $questionIndex => $questionData) {
                                    $question = null;
                                    if (isset($questionData['id'])) {
                                        $question = HrdQuestion::find($questionData['id']);
                                        $updatedQuestionIds[] = $question->id;
                                    }

                                    if (!$question) {
                                        $question = new HrdQuestion();
                                        $question->quiz_id = $quiz->id;
                                    }

                                    $question->question_text = $questionData['question_text'];
                                    $question->type = $questionData['type'];
                                    $question->points = $questionData['points'] ?? 1;
                                    $question->order = $questionIndex;
                                    $question->save();

                                    // 5. Sync Answers
                                    $existingAnswerIds = $question->answers()->pluck('id')->toArray();
                                    $updatedAnswerIds = [];

                                    if (isset($questionData['answers'])) {
                                        foreach ($questionData['answers'] as $answerIndex => $answerData) {
                                            $answer = null;
                                            if (isset($answerData['id'])) {
                                                $answer = HrdAnswer::find($answerData['id']);
                                                $updatedAnswerIds[] = $answer->id;
                                            }

                                            if (!$answer) {
                                                $answer = new HrdAnswer();
                                                $answer->question_id = $question->id;
                                            }

                                            $answer->answer_text = $answerData['answer_text'];
                                            $answer->matching_pair = $answerData['matching_pair'] ?? null;
                                            $answer->is_correct = $answerData['is_correct'] ?? false;
                                            $answer->order = $answerIndex;
                                            $answer->save();
                                        }
                                    }
                                    
                                    // Delete removed answers
                                    $answersToDelete = array_diff($existingAnswerIds, $updatedAnswerIds);
                                    HrdAnswer::destroy($answersToDelete);
                                }
                            }

                            // Delete removed questions
                            $questionsToDelete = array_diff($existingQuestionIds, $updatedQuestionIds);
                            HrdQuestion::destroy($questionsToDelete);
                        }
                    }
                }

                // Delete removed lessons
                $lessonsToDelete = array_diff($existingLessonIds, $updatedLessonIds);
                HrdLesson::destroy($lessonsToDelete);
            }

            // Delete removed modules
            $modulesToDelete = array_diff($existingModuleIds, $updatedModuleIds);
            HrdModule::destroy($modulesToDelete);
        });

        return redirect()
            ->route('km.learn.courses.builder', $course->id)
            ->with('success', 'บันทึกเนื้อหาหลักสูตรเรียบร้อย');
    }

    public function upload(Request $request, HrdCourse $course)
    {
        if (! auth()->user()->hasRole(['admin', 'header', 'Admin', 'Header'])) {
            abort(403, 'Unauthorized action.');
        }

        $request->validate([
            'file' => 'required|file|max:20480|mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,txt,png,jpg,jpeg,gif,zip',
        ]);

        $path = $request->file('file')->store('hrd/lessons/'.$course->id, 'public');

        return response()->json([
            'path' => $path,
            'url' => Storage::disk('public')->url($path),
            'name' => $request->file('file')->getClientOriginalName(),
            'size' => $request->file('file')->getSize(),
        ]);
    }

    public function downloadQuizTemplate(HrdQuizExcelService $excel): StreamedResponse
    {
        if (! auth()->user()->hasRole(['admin', 'header', 'Admin', 'Header'])) {
            abort(403, 'Unauthorized action.');
        }

        return $excel->downloadTemplate();
    }

    public function importQuiz(Request $request, HrdCourse $course, HrdQuizExcelService $excel)
    {
        if (! auth()->user()->hasRole(['admin', 'header', 'Admin', 'Header'])) {
            abort(403, 'Unauthorized action.');
        }

        $request->validate([
            'file' => 'required|file|max:10240|mimes:xlsx,xls,csv',
            'mode' => 'nullable|in:append,replace',
        ]);

        $uploaded = $request->file('file');
        $stored = $uploaded->storeAs(
            'hrd/quiz-imports/tmp',
            uniqid('quiz_', true).'.'.$uploaded->getClientOriginalExtension(),
            'local'
        );
        $absolute = Storage::disk('local')->path($stored);

        try {
            $parsed = $excel->parse($absolute);
        } finally {
            Storage::disk('local')->delete($stored);
        }

        if ($parsed['questions'] === [] && $parsed['errors'] !== []) {
            return response()->json([
                'message' => 'นำเข้าไม่สำเร็จ',
                'errors' => $parsed['errors'],
                'questions' => [],
            ], 422);
        }

        return response()->json([
            'message' => 'อ่านไฟล์สำเร็จ '.count($parsed['questions']).' คำถาม',
            'questions' => $parsed['questions'],
            'errors' => $parsed['errors'],
            'mode' => $request->input('mode', 'append'),
        ]);
    }
}
