<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\FshhChat\FshhChatSyncService;
use App\Services\FshhChat\SystemsCatalogSearchService;
use App\Services\OrganizationChat\OrganizationChatService;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class OrganizationChatApiController extends Controller
{
    public function __construct(
        private readonly OrganizationChatService $chat,
        private readonly FshhChatSyncService $fshhChat,
        private readonly SystemsCatalogSearchService $systemsCatalog,
    ) {}

    public function handle(Request $request): JsonResponse
    {
        if ($request->isMethod('OPTIONS')) {
            return $this->json([], 204);
        }

        $action = (string) $request->input('action', 'health');

        try {
            $payload = match ($action) {
                'health' => $this->chat->health(),

                'searchSystems' => $this->handleSearchSystems($request),

                'users', 'getUsers' => [
                    'success' => true,
                    'users' => $this->chat->getUsers(),
                ],

                'user', 'me', 'currentUser' => [
                    'success' => true,
                    'user' => $this->chat->serializeUser(
                        $this->chat->resolveSessionUser($request->input('sessionToken'))
                    ),
                ],

                'authenticateWithLine', 'lineLogin' => $this->handleLineLogin($request),

                'passwordLogin' => $this->handlePasswordLogin($request),

                'conversations', 'getConversations' => [
                    'success' => true,
                    'conversations' => $this->chat->getUserConversations(
                        $this->chat->resolveSessionUser($request->input('sessionToken'))->id
                    ),
                ],

                'conversation', 'getOrCreateConversation' => [
                    'success' => true,
                    'conversation' => $this->chat->getOrCreateConversation(
                        $this->chat->resolveSessionUser($request->input('sessionToken'))->id,
                        (int) $request->input('otherUserId', $request->input('userId2', 0)),
                    ),
                ],

                'messages', 'getMessages' => [
                    'success' => true,
                    'messages' => $this->chat->getMessages(
                        $this->chat->resolveSessionUser($request->input('sessionToken'))->id,
                        (int) $request->input('conversationId', 0),
                    ),
                ],

                'sendMessage', 'send' => $this->chat->sendMessage(
                    $this->chat->resolveSessionUser($request->input('sessionToken'))->id,
                    (int) $request->input('toUserId', $request->input('receiverId', 0)),
                    (string) $request->input('message', $request->input('text', '')),
                ),

                'markRead' => $this->chat->markRead(
                    $this->chat->resolveSessionUser($request->input('sessionToken'))->id,
                    (int) $request->input('conversationId', 0),
                ),

                'unread', 'unreadCount' => [
                    'success' => true,
                    'unread' => $this->chat->getUnreadCount(
                        $this->chat->resolveSessionUser($request->input('sessionToken'))->id
                    ),
                ],

                'poll', 'inbox', 'pollInbox' => $this->chat->pollInbox(
                    $this->chat->resolveSessionUser($request->input('sessionToken'))->id,
                    $request->filled('conversationId') ? (int) $request->input('conversationId') : null,
                    $request->input('since') ? (string) $request->input('since') : null,
                ),

                'searchUsers' => [
                    'success' => true,
                    'users' => $this->chat->searchUsers(
                        (string) $request->input('q', $request->input('query', '')),
                    ),
                ],

                'logout' => $this->chat->destroySession(
                    $request->input('sessionToken') ? (string) $request->input('sessionToken') : null
                ),

                'ai', 'askAi' => $this->handleAi($request),

                default => throw new \InvalidArgumentException('Unknown action: '.$action),
            };

            return $this->json($payload);
        } catch (\Throwable $e) {
            $status = $e->getMessage() === 'SESSION_EXPIRED' ? 401 : 400;

            return $this->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], $status);
        }
    }

    private function handleLineLogin(Request $request): array
    {
        $idToken = (string) $request->input('idToken', '');

        if ($idToken !== '') {
            return $this->chat->authenticateWithLine($idToken);
        }

        return $this->chat->lineLogin(
            (string) $request->input('lineUserId', ''),
            (string) $request->input('displayName', 'LINE User'),
            $request->input('pictureUrl') ? (string) $request->input('pictureUrl') : null,
        );
    }

    /**
     * เข้า S-Chat ด้วยอีเมล/รหัสผ่านบัญชีเว็บแอป แล้วออก sessionToken
     *
     * @return array{success: bool, sessionToken?: string, error?: string}
     */
    private function handlePasswordLogin(Request $request): array
    {
        $login = trim((string) $request->input('email', $request->input('login', '')));
        $password = (string) $request->input('password', '');

        if ($login === '') {
            return ['success' => false, 'error' => 'กรุณากรอกอีเมลหรือชื่อผู้ใช้'];
        }
        if ($password === '') {
            return ['success' => false, 'error' => 'กรุณากรอกรหัสผ่าน'];
        }

        $throttleKey = Str::transliterate(Str::lower($login).'|'.$request->ip());
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            event(new Lockout($request));
            $seconds = RateLimiter::availableIn($throttleKey);

            return [
                'success' => false,
                'error' => 'ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอ '.$seconds.' วินาที',
            ];
        }

        $user = User::findForLogin($login);
        if (! $user || ! Hash::check($password, (string) $user->password)) {
            RateLimiter::hit($throttleKey);
            try {
                app(\App\Services\Security\SecurityMonitor::class)->recordFailedLogin(
                    $login,
                    (string) $request->ip(),
                );
            } catch (\Throwable) {
                // อย่าให้ระบบแจ้งเตือนทำให้ล็อกอินพัง
            }

            return ['success' => false, 'error' => 'อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง'];
        }

        RateLimiter::clear($throttleKey);

        if ($user->needsPasswordChange() || $user->needsUsername()) {
            $origin = rtrim((string) config('app.url'), '/');
            $msg = $user->needsUsername()
                ? 'กรุณาตั้งชื่อผู้ใช้และรหัสผ่านก่อนใช้งาน S-Chat'
                : 'กรุณาตั้งรหัสผ่านใหม่ก่อนใช้งาน S-Chat';

            return [
                'success' => false,
                'mustChangePassword' => true,
                'error' => $msg,
                'passwordSettingsUrl' => $origin.'/login?redirect='.rawurlencode('/settings/password'),
            ];
        }

        $session = $this->fshhChat->createChatSession($user);
        if (($session['success'] ?? false) !== true) {
            return [
                'success' => false,
                'error' => (string) ($session['error'] ?? 'เปิด S-Chat ไม่สำเร็จ'),
            ];
        }

        return [
            'success' => true,
            'sessionToken' => (string) $session['sessionToken'],
        ];
    }

    private function handleAi(Request $request): array
    {
        $message = (string) $request->input('message', $request->input('question', $request->input('text', '')));
        if (trim($message) === '') {
            return [
                'success' => false,
                'error' => 'กรุณาระบุคำถามหรือข้อความ',
            ];
        }

        $history = $request->input('history');
        if (! is_array($history)) {
            $history = null;
        }

        return $this->chat->askCustomLlm($message, $history);
    }

    /**
     * Worker → Laravel: ค้นหาระบบ SMH ตามสิทธิ์ผู้ใช้
     *
     * @return array<string, mixed>
     */
    private function handleSearchSystems(Request $request): array
    {
        if (! $this->chatSecretMatches($request)) {
            return ['success' => false, 'error' => 'Unauthorized'];
        }

        $laravelUserId = (int) $request->input('laravelUserId', 0);
        $query = (string) $request->input('query', $request->input('q', $request->input('message', '')));

        $throttleKey = 'schat-systems:'.$laravelUserId.'|'.$request->ip();
        if (RateLimiter::tooManyAttempts($throttleKey, 30)) {
            return [
                'success' => false,
                'error' => 'ค้นหาบ่อยเกินไป กรุณารอสักครู่',
            ];
        }
        RateLimiter::hit($throttleKey, 60);

        return $this->systemsCatalog->search($laravelUserId, $query);
    }

    private function chatSecretMatches(Request $request): bool
    {
        $expected = (string) config('services.fshh_chat.secret', '');
        if ($expected === '') {
            return false;
        }

        $given = (string) $request->header('X-Chat-Secret', '');

        return $given !== '' && hash_equals($expected, $given);
    }

    private function json(array $payload, int $status = 200): JsonResponse
    {
        return response()
            ->json($payload, $status, $this->corsHeaders(), JSON_UNESCAPED_UNICODE);
    }

    /** @return array<string, string> */
    private function corsHeaders(): array
    {
        return [
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Chat-Secret',
            'Access-Control-Max-Age' => '86400',
        ];
    }
}
