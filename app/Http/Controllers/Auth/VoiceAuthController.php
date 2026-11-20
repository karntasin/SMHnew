<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Voice\VoiceBiometricService;
use App\Support\PostLoginRedirect;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class VoiceAuthController extends Controller
{
    public function __construct(
        protected VoiceBiometricService $voiceService
    ) {}

    /**
     * Search users by name, username, email for live auto-suggest
     */
    public function searchUsers(Request $request): JsonResponse
    {
        $query = trim((string) $request->query('q', ''));
        if (mb_strlen($query) < 2) {
            return response()->json(['users' => []]);
        }

        $users = User::query()
            ->with('voiceBiometric')
            ->where(function ($q) use ($query) {
                $q->where('name', 'LIKE', "%{$query}%")
                    ->orWhere('email', 'LIKE', "%{$query}%")
                    ->orWhere('username', 'LIKE', "%{$query}%")
                    ->orWhereRaw('CONCAT(COALESCE(prefix, ""), " ", name) LIKE ?', ["%{$query}%"]);
            })
            ->limit(8)
            ->get()
            ->map(function ($u) {
                return [
                    'id' => $u->id,
                    'display_name' => ($u->prefix ? $u->prefix . ' ' : '') . $u->name,
                    'name' => $u->name,
                    'email' => $u->email,
                    'username' => $u->username,
                    'has_voice' => (bool) ($u->voiceBiometric && $u->voiceBiometric->is_active),
                ];
            });

        return response()->json(['users' => $users]);
    }

    /**
     * Get a dynamic challenge phrase + token for liveness verification
     */
    public function challenge(Request $request): JsonResponse
    {
        $identifier = $request->query('identifier');
        $challenge = $this->voiceService->generateChallenge($identifier);

        $matchedUser = null;
        if (!empty($identifier)) {
            $user = User::findForLogin($identifier);
            if ($user) {
                $matchedUser = [
                    'id' => $user->id,
                    'display_name' => ($user->prefix ? $user->prefix . ' ' : '') . $user->name,
                    'name' => $user->name,
                    'email' => $user->email,
                    'username' => $user->username,
                    'has_voice' => (bool) ($user->voiceBiometric && $user->voiceBiometric->is_active),
                ];
            }
        }

        return response()->json([
            'success' => true,
            'challenge' => $challenge,
            'matched_user' => $matchedUser,
        ]);
    }

    /**
     * 1:1 Voice Authentication Login
     * Matches by email, username, real staff first/last name
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'identifier' => 'required|string',
            'challenge_token' => 'required|string',
            'audio' => 'required|file|mimes:wav,webm,ogg,mp3,audio/wav,audio/webm|max:10240',
            'spoken_text' => 'nullable|string',
            'remember' => 'nullable|boolean',
        ]);

        $token = $request->input('challenge_token');
        $spokenText = $request->input('spoken_text');

        if (!$this->voiceService->validateChallenge($token, $spokenText)) {
            return response()->json([
                'success' => false,
                'message' => 'รหัสยืนยันตัวตนหมดอายุหรือผิดพลาด กรุณาลองใหม่อีกครั้ง',
            ], 422);
        }

        $identifier = trim($request->input('identifier'));
        $user = User::findForLogin($identifier);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'ไม่พบบัญชีผู้ใช้นี้ในระบบ (ตรวจสอบชื่อ-สกุล อีเมล หรือชื่อผู้ใช้)',
            ], 404);
        }

        $audioFile = $request->file('audio');
        $tempPath = $audioFile->getRealPath();

        try {
            $verification = $this->voiceService->verify($user, $tempPath);

            if (!$verification['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $verification['message'] ?? 'ไม่สามารถตรวจสอบเสียงได้',
                    'error_code' => $verification['error'] ?? null,
                ], 422);
            }

            if (!$verification['is_match']) {
                return response()->json([
                    'success' => false,
                    'message' => 'ระดับความคล้ายคลึงของเสียงไม่ผ่านเกณฑ์ความปลอดภัย (' . round($verification['similarity'] * 100, 1) . '%) กรุณาลองใหม่อีกครั้ง',
                    'similarity' => $verification['similarity'],
                    'threshold' => $verification['threshold'],
                ], 401);
            }

            // Log in user
            $remember = (bool) $request->input('remember', false);
            Auth::login($user, $remember);
            $request->session()->regenerate();

            $intended = $request->session()->pull('url.intended');
            $redirectUrl = PostLoginRedirect::sanitizeIntendedOnCurrentHost(
                is_string($intended) ? $intended : null,
                'menus-hub',
                $request
            );

            $displayName = ($user->prefix ? $user->prefix . ' ' : '') . $user->name;

            return response()->json([
                'success' => true,
                'message' => 'ยืนยันตัวตนด้วยเสียงสำเร็จ ยินดีต้อนรับ ' . $displayName,
                'similarity' => $verification['similarity'],
                'threshold' => $verification['threshold'] ?? 0.70,
                'redirect_url' => $redirectUrl,
            ]);

        } catch (\Throwable $e) {
            Log::error('Voice login error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'เกิดข้อผิดพลาดในการประมวลผลเสียง: ' . $e->getMessage(),
            ], 500);
        }
    }
}
