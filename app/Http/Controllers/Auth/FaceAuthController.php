<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Face\FaceBiometricService;
use App\Support\PostLoginRedirect;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class FaceAuthController extends Controller
{
    public function __construct(
        protected FaceBiometricService $faceService
    ) {}

    /**
     * Search users by name, username, email for live auto-suggest with face status
     */
    public function searchUsers(Request $request): JsonResponse
    {
        $query = trim((string) $request->query('q', ''));
        if (mb_strlen($query) < 2) {
            return response()->json(['users' => []]);
        }

        $users = User::query()
            ->with('faceBiometric')
            ->where(function ($q) use ($query) {
                $q->where('name', 'LIKE', "%{$query}%")
                    ->orWhere('email', 'LIKE', "%{$query}%")
                    ->orWhere('username', 'LIKE', "%{$query}%")
                    ->orWhereRaw('CONCAT(COALESCE(prefix, ""), " ", name) LIKE ?', ["%{$query}%"]);
            })
            ->limit(8)
            ->get()
            ->map(function ($u) {
                $fb = $u->faceBiometric;
                return [
                    'id' => $u->id,
                    'display_name' => ($u->prefix ? $u->prefix . ' ' : '') . $u->name,
                    'name' => $u->name,
                    'email' => $u->email,
                    'username' => $u->username,
                    'has_face' => (bool) ($fb && $fb->is_active),
                    'auth_mode' => $fb?->auth_mode,
                    'device_name' => $fb?->device_name,
                    'credential_id' => $fb?->credential_id,
                ];
            });

        return response()->json(['users' => $users]);
    }

    /**
     * Get a dynamic challenge for anti-replay and WebAuthn / camera verification
     */
    public function challenge(Request $request): JsonResponse
    {
        $identifier = $request->query('identifier');
        $challenge = $this->faceService->generateChallenge($identifier);

        $matchedUser = null;
        if (!empty($identifier)) {
            $user = User::findForLogin($identifier);
            if ($user) {
                $fb = $user->faceBiometric;
                $matchedUser = [
                    'id' => $user->id,
                    'display_name' => ($user->prefix ? $user->prefix . ' ' : '') . $user->name,
                    'name' => $user->name,
                    'email' => $user->email,
                    'username' => $user->username,
                    'has_face' => (bool) ($fb && $fb->is_active),
                    'auth_mode' => $fb?->auth_mode,
                    'device_name' => $fb?->device_name,
                    'credential_id' => $fb?->credential_id,
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
     * Camera AI Face Authentication Login (Supports both 1:N Auto-Identification and 1:1 Verification)
     */
    public function cameraLogin(Request $request): JsonResponse
    {
        $request->validate([
            'identifier' => 'nullable|string',
            'challenge_token' => 'required|string',
            'vector' => 'required|array|min:128',
            'liveness_passed' => 'required|boolean',
            'remember' => 'nullable|boolean',
            'image' => 'nullable|string',
        ]);

        $token = $request->input('challenge_token');
        $identifier = $request->filled('identifier') ? trim($request->input('identifier')) : null;

        if (!$this->faceService->verifyChallengeToken($token, $identifier)) {
            return response()->json([
                'success' => false,
                'message' => 'รหัส Challenge หมดอายุหรือไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง',
            ], 422);
        }

        if (!$request->boolean('liveness_passed')) {
            return response()->json([
                'success' => false,
                'message' => 'ไม่ผ่านการตรวจจับบุคคลจริง (Liveness Check) กรุณากระพริบตาหรือปฏิบัติตามคำแนะนำ',
            ], 422);
        }

        $vector = array_map('floatval', $request->input('vector'));

        // If no identifier is provided: perform 1:N Auto-Identification across all enrolled staff
        if (empty($identifier)) {
            $verification = $this->faceService->identifyCameraVector($vector);

            if (!$verification['success'] || empty($verification['user'])) {
                return response()->json([
                    'success' => false,
                    'message' => $verification['message'] ?? 'ไม่พบข้อมูลใบหน้าที่ตรงกับเจ้าหน้าที่ในระบบ',
                    'error_code' => $verification['error'] ?? null,
                    'distance' => $verification['distance'] ?? null,
                    'threshold' => $verification['threshold'] ?? null,
                ], 401);
            }

            $user = $verification['user'];
        } else {
            // 1:1 Verification for specific user
            $user = User::findForLogin($identifier);
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'ไม่พบบัญชีผู้ใช้ที่มีชื่อหรืออีเมลนี้ในระบบ',
                ], 404);
            }

            $verification = $this->faceService->verifyCameraVector($user, $vector);

            if (!$verification['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $verification['message'] ?? 'ไม่สามารถตรวจสอบใบหน้าได้',
                    'error_code' => $verification['error'] ?? null,
                ], 422);
            }

            if (!$verification['is_match']) {
                return response()->json([
                    'success' => false,
                    'message' => 'ใบหน้าไม่ตรงกับข้อมูลในระบบ (ระยะห่าง: ' . $verification['distance'] . ' เกณฑ์: ' . $verification['threshold'] . ') กรุณาลองใหม่อีกครั้ง',
                    'distance' => $verification['distance'],
                    'similarity' => $verification['similarity'],
                    'threshold' => $verification['threshold'],
                ], 401);
            }
        }

        // Login user
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
            'message' => 'ยืนยันตัวตนด้วยใบหน้าสำเร็จ ยินดีต้อนรับ ' . $displayName,
            'user' => [
                'id' => $user->id,
                'name' => $displayName,
                'email' => $user->email,
            ],
            'distance' => $verification['distance'] ?? null,
            'similarity' => $verification['similarity'] ?? null,
            'threshold' => $verification['threshold'] ?? null,
            'redirect_url' => $redirectUrl,
        ]);
    }

    /**
     * Apple Face ID / Android Passkey Login (Supports both Usernameless and 1:1)
     */
    public function passkeyLogin(Request $request): JsonResponse
    {
        $request->validate([
            'identifier' => 'nullable|string',
            'challenge_token' => 'required|string',
            'credential_id' => 'required|string',
            'client_data_json' => 'required|string',
            'authenticator_data' => 'required|string',
            'signature' => 'required|string',
            'remember' => 'nullable|boolean',
        ]);

        $token = $request->input('challenge_token');
        $identifier = $request->filled('identifier') ? trim($request->input('identifier')) : null;

        if (!$this->faceService->verifyChallengeToken($token, $identifier)) {
            return response()->json([
                'success' => false,
                'message' => 'รหัส Challenge หมดอายุหรือไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง',
            ], 422);
        }

        if (empty($identifier)) {
            // Usernameless Passkey Verification
            $verification = $this->faceService->verifyPasskeyAssertionUsernameless(
                $request->input('credential_id'),
                $request->input('client_data_json'),
                $request->input('authenticator_data'),
                $request->input('signature')
            );

            if (!$verification['success'] || !$verification['is_match'] || empty($verification['user'])) {
                return response()->json([
                    'success' => false,
                    'message' => $verification['message'] ?? 'การยืนยันตัวตนด้วยชีวมิติล้มเหลว',
                ], 401);
            }

            $user = $verification['user'];
        } else {
            // 1:1 Passkey Verification
            $user = User::findForLogin($identifier);
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'ไม่พบบัญชีผู้ใช้ในระบบ',
                ], 404);
            }

            $verification = $this->faceService->verifyPasskeyAssertion(
                $user,
                $request->input('credential_id'),
                $request->input('client_data_json'),
                $request->input('authenticator_data'),
                $request->input('signature')
            );

            if (!$verification['success'] || !$verification['is_match']) {
                return response()->json([
                    'success' => false,
                    'message' => $verification['message'] ?? 'การยืนยันตัวตนด้วย Face ID ล้มเหลว',
                ], 401);
            }
        }

        // Login user
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
            'message' => 'ยืนยันตัวตนด้วยชีวมิติสำเร็จ ยินดีต้อนรับ ' . $displayName,
            'user' => [
                'id' => $user->id,
                'name' => $displayName,
                'email' => $user->email,
            ],
            'redirect_url' => $redirectUrl,
        ]);
    }

    /**
     * Show face biometric settings page (Inertia)
     */
    public function settings(Request $request): Response
    {
        $user = $request->user();
        $faceBiometric = $user->faceBiometric;

        return Inertia::render('settings/face', [
            'faceData' => [
                'is_enrolled' => (bool) ($faceBiometric && $faceBiometric->is_active),
                'auth_mode' => $faceBiometric?->auth_mode,
                'device_name' => $faceBiometric?->device_name,
                'sample_count' => $faceBiometric?->sample_count ?? 0,
                'similarity_baseline' => $faceBiometric?->similarity_baseline,
                'face_image_url' => $faceBiometric?->face_image_path ? Storage::disk('public')->url($faceBiometric->face_image_path) : null,
                'last_authenticated_at' => $faceBiometric?->last_authenticated_at?->toIso8601String(),
                'updated_at' => $faceBiometric?->updated_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * Enroll AI camera face vectors from settings page
     */
    public function enrollCamera(Request $request): JsonResponse
    {
        $request->validate([
            'vectors' => 'required|array|min:1',
            'vectors.*' => 'required|array|min:128',
            'image' => 'nullable|string', // Optional base64 snapshot
        ]);

        $user = $request->user();
        $vectors = $request->input('vectors');
        $imagePath = null;

        if ($request->filled('image')) {
            $base64 = $request->input('image');
            if (preg_match('/^data:image\/(\w+);base64,/', $base64, $type)) {
                $data = substr($base64, strpos($base64, ',') + 1);
                $decoded = base64_decode($data);
                if ($decoded !== false) {
                    $fileName = 'faces/' . $user->id . '_' . time() . '.jpg';
                    Storage::disk('public')->put($fileName, $decoded);
                    $imagePath = $fileName;
                }
            }
        }

        try {
            $record = $this->faceService->enrollCameraVectors($user, $vectors, $imagePath);

            return response()->json([
                'success' => true,
                'message' => 'ลงทะเบียนใบหน้าสำเร็จ บันทึกตัวอย่าง ' . $record->sample_count . ' มุมเรียบร้อย',
                'faceData' => [
                    'is_enrolled' => true,
                    'auth_mode' => $record->auth_mode,
                    'sample_count' => $record->sample_count,
                    'similarity_baseline' => $record->similarity_baseline,
                    'face_image_url' => $record->face_image_path ? Storage::disk('public')->url($record->face_image_path) : null,
                    'updated_at' => $record->updated_at->toIso8601String(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Camera face enrollment failed', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'เกิดข้อผิดพลาดในการลงทะเบียนใบหน้า: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Enroll Apple Face ID / Android Passkey from settings page
     */
    public function enrollPasskey(Request $request): JsonResponse
    {
        $request->validate([
            'credential_id' => 'required|string',
            'public_key' => 'required|string', // PEM formatted public key
            'device_name' => 'nullable|string|max:128',
        ]);

        $user = $request->user();

        try {
            $record = $this->faceService->enrollPasskey(
                $user,
                $request->input('credential_id'),
                $request->input('public_key'),
                $request->input('device_name')
            );

            return response()->json([
                'success' => true,
                'message' => 'ลงทะเบียนอุปกรณ์ ' . ($record->device_name ?: 'Face ID') . ' สำเร็จ',
                'faceData' => [
                    'is_enrolled' => true,
                    'auth_mode' => $record->auth_mode,
                    'device_name' => $record->device_name,
                    'updated_at' => $record->updated_at->toIso8601String(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Passkey enrollment failed', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'เกิดข้อผิดพลาดในการลงทะเบียน Face ID / Passkey: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete face biometric registration
     */
    public function destroy(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->faceService->deleteBiometric($user);

        return response()->json([
            'success' => true,
            'message' => 'ลบข้อมูลชีวมิติใบหน้าออกจากระบบเรียบร้อยแล้ว',
        ]);
    }
}
