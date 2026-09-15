<?php

namespace App\Http\Controllers;

use App\Services\OrganizationChat\OrganizationChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganizationChatApiController extends Controller
{
    public function __construct(
        private readonly OrganizationChatService $chat,
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
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization',
            'Access-Control-Max-Age' => '86400',
        ];
    }
}
