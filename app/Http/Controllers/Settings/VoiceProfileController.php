<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\UserVoiceBiometric;
use App\Services\Voice\VoiceBiometricService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VoiceProfileController extends Controller
{
    public function __construct(
        protected VoiceBiometricService $voiceService
    ) {}

    /**
     * Show voice authentication settings page
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $biometric = $user->voiceBiometric;

        return Inertia::render('settings/voice', [
            'status' => session('status'),
            'voiceData' => [
                'is_enrolled' => $biometric !== null && $biometric->is_active,
                'sample_count' => $biometric?->sample_count ?? 0,
                'similarity_baseline' => $biometric?->similarity_baseline ? (float) $biometric->similarity_baseline : null,
                'last_authenticated_at' => $biometric?->last_authenticated_at?->diffForHumans(),
                'updated_at' => $biometric?->updated_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * Get challenge for enrollment
     */
    public function challenge(): JsonResponse
    {
        $challenge = $this->voiceService->generateChallenge();
        return response()->json([
            'success' => true,
            'challenge' => $challenge,
        ]);
    }

    /**
     * Enroll voice with 3 sample audio recordings
     */
    public function enroll(Request $request): JsonResponse
    {
        $request->validate([
            'samples' => 'required|array|min:1|max:5',
            'samples.*' => 'required|file|mimes:wav,webm,ogg,mp3,audio/wav,audio/webm|max:10240',
        ]);

        $user = $request->user();
        $files = $request->file('samples');
        $paths = array_map(fn($f) => $f->getRealPath(), $files);

        try {
            $record = $this->voiceService->enroll($user, $paths);

            return response()->json([
                'success' => true,
                'message' => 'ลงทะเบียนเอกลักษณ์เสียงสำเร็จเรียบร้อย',
                'data' => [
                    'is_enrolled' => true,
                    'sample_count' => $record->sample_count,
                    'similarity_baseline' => (float) $record->similarity_baseline,
                    'last_authenticated_at' => null,
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'เกิดข้อผิดพลาดในการลงทะเบียนเสียง: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Test voice against enrolled biometric
     */
    public function test(Request $request): JsonResponse
    {
        $request->validate([
            'audio' => 'required|file|mimes:wav,webm,ogg,mp3,audio/wav,audio/webm|max:10240',
        ]);

        $user = $request->user();
        $file = $request->file('audio');

        try {
            $res = $this->voiceService->verify($user, $file->getRealPath());

            return response()->json([
                'success' => true,
                'is_match' => $res['is_match'] ?? false,
                'similarity' => $res['similarity'] ?? 0,
                'threshold' => $res['threshold'] ?? 0.78,
                'baseline' => $res['baseline'] ?? null,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'การทดสอบเสียงขัดข้อง: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete/revoke enrolled voice
     */
    public function destroy(Request $request): JsonResponse
    {
        $user = $request->user();
        $biometric = $user->voiceBiometric;

        if ($biometric) {
            $biometric->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'ยกเลิกข้อมูลเสียงเรียบร้อยแล้ว',
        ]);
    }
}
