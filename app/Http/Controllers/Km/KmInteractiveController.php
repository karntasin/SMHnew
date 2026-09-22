<?php

namespace App\Http\Controllers\Km;

use App\Http\Controllers\Controller;
use App\Models\Km\KmInteractiveProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KmInteractiveController extends Controller
{
    /**
     * หน้า Hub รวมระบบการเรียนรู้เชิงโต้ตอบ (SQL & Excel)
     */
    public function index(Request $request): Response
    {
        $userId = $request->user()?->id;

        $sqlProgress = $userId ? KmInteractiveProgress::where('user_id', $userId)->where('track', 'sql')->first() : null;
        $excelProgress = $userId ? KmInteractiveProgress::where('user_id', $userId)->where('track', 'excel')->first() : null;
        $mmertProgress = $userId ? KmInteractiveProgress::where('user_id', $userId)->where('track', 'mmert')->first() : null;

        return Inertia::render('KM/Interactive/Index', [
            'sqlStats' => [
                'completedLessons' => $sqlProgress?->completed_lessons ?? [],
                'currentLessonId' => $sqlProgress?->current_lesson_id ?? 1,
            ],
            'excelStats' => [
                'completedLessons' => $excelProgress?->completed_lessons ?? [],
                'currentLessonId' => $excelProgress?->current_lesson_id ?? 1,
            ],
            'mmertStats' => [
                'completedLessons' => $mmertProgress?->completed_lessons ?? [],
                'currentLessonId' => $mmertProgress?->current_lesson_id ?? 1,
            ],
        ]);
    }

    /**
     * หน้า SQL Journey — การเรียนรู้และฝึกฝน SQL เชิงโต้ตอบ
     */
    public function sql(Request $request): Response
    {
        $userId = $request->user()?->id;
        $progress = $userId ? KmInteractiveProgress::where('user_id', $userId)->where('track', 'sql')->first() : null;

        return Inertia::render('KM/Interactive/Sql', [
            'initialProgress' => [
                'completedLessons' => $progress?->completed_lessons ?? [],
                'currentLessonId' => $progress?->current_lesson_id ?? 1,
            ],
        ]);
    }

    /**
     * หน้า Excel Master — การเรียนรู้และฝึกฝน Excel เชิงโต้ตอบ
     */
    public function excel(Request $request): Response
    {
        $userId = $request->user()?->id;
        $progress = $userId ? KmInteractiveProgress::where('user_id', $userId)->where('track', 'excel')->first() : null;

        return Inertia::render('KM/Interactive/Excel', [
            'initialProgress' => [
                'completedLessons' => $progress?->completed_lessons ?? [],
                'currentLessonId' => $progress?->current_lesson_id ?? 1,
            ],
        ]);
    }

    /**
     * หน้า M-MERT — การเรียนรู้เชิงโต้ตอบ M-MERT
     */
    public function mmert(Request $request): Response
    {
        $userId = $request->user()?->id;
        $progress = $userId ? KmInteractiveProgress::where('user_id', $userId)->where('track', 'mmert')->first() : null;

        return Inertia::render('KM/Interactive/Mmert', [
            'initialProgress' => [
                'completedLessons' => $progress?->completed_lessons ?? [],
                'currentLessonId' => $progress?->current_lesson_id ?? 1,
            ],
        ]);
    }

    /**
     * บันทึกความคืบหน้าการเรียนรู้ข้ามอุปกรณ์
     */
    public function saveProgress(Request $request): mixed
    {
        $validated = $request->validate([
            'track' => 'required|string|in:sql,excel,mmert',
            'completed_lessons' => 'required|array',
            'completed_lessons.*' => 'integer',
            'current_lesson_id' => 'required|integer|min:1',
        ]);

        $userId = $request->user()->id;

        $record = KmInteractiveProgress::updateOrCreate(
            ['user_id' => $userId, 'track' => $validated['track']],
            [
                'completed_lessons' => array_values(array_unique($validated['completed_lessons'])),
                'current_lesson_id' => $validated['current_lesson_id'],
            ]
        );

        if ($request->header('X-Inertia')) {
            return back()->with('success', 'บันทึกความคืบหน้าเรียบร้อย');
        }

        return response()->json([
            'success' => true,
            'progress' => $record,
        ]);
    }
}
