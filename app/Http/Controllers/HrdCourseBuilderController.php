<?php

namespace App\Http\Controllers;

use App\Models\HrdCourse;
use App\Models\HrdModule;
use App\Models\HrdLesson;
use App\Models\HrdQuiz;
use App\Models\HrdQuestion;
use App\Models\HrdAnswer;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

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
                if (isset($moduleData['id'])) {
                    $module = HrdModule::find($moduleData['id']);
                    $updatedModuleIds[] = $module->id;
                }
                
                if (!$module) {
                    $module = new HrdModule();
                    $module->course_id = $course->id;
                }

                $module->title = $moduleData['title'];
                $module->order = $moduleIndex;
                $module->save();

                // 2. Sync Lessons
                $existingLessonIds = $module->lessons()->pluck('id')->toArray();
                $updatedLessonIds = [];

                if (isset($moduleData['lessons'])) {
                    foreach ($moduleData['lessons'] as $lessonIndex => $lessonData) {
                        $lesson = null;
                        if (isset($lessonData['id'])) {
                            $lesson = HrdLesson::find($lessonData['id']);
                            $updatedLessonIds[] = $lesson->id;
                        }

                        if (!$lesson) {
                            $lesson = new HrdLesson();
                            $lesson->module_id = $module->id;
                        }

                        $lesson->title = $lessonData['title'];
                        $lesson->type = $lessonData['type'];
                        $lesson->content = $lessonData['content'] ?? '';
                        $lesson->video_url = $lessonData['video_url'] ?? null;
                        $lesson->order = $lessonIndex;
                        $lesson->save();

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
                            $quiz->passing_score = $quizData['passing_score'] ?? 50;
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

        return redirect()->route('km.learn.courses.show', $course->id)->with('success', 'Course structure updated successfully.');
    }
}
