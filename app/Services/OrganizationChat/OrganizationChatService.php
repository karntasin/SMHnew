<?php

namespace App\Services\OrganizationChat;

use App\Models\ChatConversation;
use App\Models\ChatMessage;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class OrganizationChatService
{
    private const SESSION_TTL_HOURS = 6;

    public function __construct(
        private readonly LineIdTokenService $lineIdToken,
    ) {}

    public function health(): array
    {
        return [
            'success' => true,
            'system' => 'FSHH Chat',
            'version' => '6.0-laravel',
            'message' => 'API is working',
            'time' => now()->toIso8601String(),
        ];
    }

    public function createSession(User $user): array
    {
        $token = strtoupper(str_replace('-', '', (string) Str::uuid()));

        Cache::put($this->sessionKey($token), $user->id, now()->addHours(self::SESSION_TTL_HOURS));

        return [
            'token' => $token,
            'expiresAt' => now()->addHours(self::SESSION_TTL_HOURS)->toIso8601String(),
        ];
    }

    public function destroySession(?string $token): array
    {
        if ($token) {
            Cache::forget($this->sessionKey($token));
        }

        return ['success' => true];
    }

    public function resolveSessionUser(?string $token): User
    {
        if (! $token) {
            throw new \RuntimeException('SESSION_EXPIRED');
        }

        $userId = Cache::get($this->sessionKey($token));

        if (! $userId) {
            throw new \RuntimeException('SESSION_EXPIRED');
        }

        $user = User::query()->find($userId);

        if (! $user) {
            throw new \RuntimeException('ไม่พบข้อมูลผู้ใช้งาน');
        }

        return $user;
    }

    public function authenticateWithLine(string $idToken): array
    {
        $profile = $this->lineIdToken->verify($idToken);

        if (! $profile['success']) {
            throw new \RuntimeException($profile['error'] ?? 'LINE Login ไม่สำเร็จ');
        }

        $user = $this->findOrCreateUserFromLine(
            $profile['sub'],
            $profile['name'],
            $profile['picture'] ?? null,
            $profile['email'] ?? null,
        );

        return $this->loginResponse($user);
    }

    public function lineLogin(string $lineUserId, string $displayName, ?string $pictureUrl): array
    {
        if ($lineUserId === '') {
            throw new \RuntimeException('ต้องมี idToken หรือ lineUserId');
        }

        $user = User::query()->where('line_id', $lineUserId)->first();

        if (! $user) {
            $user = $this->findOrCreateUserFromLine($lineUserId, $displayName, $pictureUrl);
        } else {
            $this->updateUserProfileFromLine($user, $displayName, $pictureUrl);
        }

        return $this->loginResponse($user);
    }

    public function serializeUser(User $user): array
    {
        $department = $user->primaryDepartment();

        return [
            'userId' => (string) $user->id,
            'lineUserId' => (string) ($user->line_id ?? ''),
            'displayName' => $user->display_name,
            'department' => $department?->name ?? '',
            'email' => (string) ($user->email ?? ''),
            'avatar' => (string) ($user->avatar_url ?? ''),
            'status' => 'online',
            'createdAt' => $user->created_at?->toIso8601String() ?? '',
            'lastLogin' => $user->updated_at?->toIso8601String() ?? '',
        ];
    }

    /** @return array<int, array<string, mixed>> */
    public function getUsers(): array
    {
        $users = User::query()
            ->with(['departments'])
            ->orderByRaw('COALESCE(NULLIF(name, ""), line_display_name) ASC')
            ->get();

        return $this->dedupeUsersByLineId($users)
            ->map(fn (User $user) => $this->serializeUser($user))
            ->values()
            ->all();
    }

    /** @return array<int, array<string, mixed>> */
    public function searchUsers(string $query): array
    {
        $query = trim($query);

        if ($query === '') {
            return $this->getUsers();
        }

        $like = '%'.$query.'%';

        $users = User::query()
            ->with(['departments'])
            ->where(function ($builder) use ($like) {
                $builder
                    ->where('name', 'like', $like)
                    ->orWhere('line_display_name', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->orWhere('line_id', 'like', $like);
            })
            ->orderByRaw('COALESCE(NULLIF(name, ""), line_display_name) ASC')
            ->limit(50)
            ->get();

        return $this->dedupeUsersByLineId($users)
            ->map(fn (User $user) => $this->serializeUser($user))
            ->values()
            ->all();
    }

    public function getOrCreateConversation(int $userId, int $otherUserId): array
    {
        if ($otherUserId <= 0) {
            throw new \RuntimeException('ไม่พบผู้ใช้งาน');
        }

        if ($userId === $otherUserId) {
            throw new \RuntimeException('ไม่สามารถสนทนากับตัวเองได้');
        }

        [$a, $b] = [min($userId, $otherUserId), max($userId, $otherUserId)];

        $conversation = ChatConversation::query()->firstOrCreate([
            'user1_id' => $a,
            'user2_id' => $b,
        ]);

        return [
            'success' => true,
            'conversationId' => (string) $conversation->id,
        ];
    }

    /** @return array<int, array<string, mixed>> */
    public function getUserConversations(int $userId): array
    {
        $conversations = ChatConversation::query()
            ->where(function ($query) use ($userId) {
                $query->where('user1_id', $userId)
                    ->orWhere('user2_id', $userId);
            })
            ->orderByDesc('updated_at')
            ->get();

        if ($conversations->isEmpty()) {
            return [];
        }

        $conversationIds = $conversations->pluck('id')->all();
        $otherUserIds = $conversations
            ->map(fn (ChatConversation $c) => $c->otherUserId($userId))
            ->unique()
            ->values()
            ->all();

        $usersMap = User::query()
            ->with(['departments'])
            ->whereIn('id', $otherUserIds)
            ->get()
            ->keyBy('id');

        $meta = $this->buildConversationMessageMeta($userId, $conversationIds);

        return $conversations
            ->map(function (ChatConversation $conversation) use ($userId, $usersMap, $meta) {
                $conversationId = (string) $conversation->id;
                $otherUserId = $conversation->otherUserId($userId);
                $otherUser = $usersMap->get($otherUserId);
                $last = $meta['lastByConv'][$conversationId] ?? null;

                return [
                    'conversationId' => $conversationId,
                    'user1Id' => (string) $conversation->user1_id,
                    'user2Id' => (string) $conversation->user2_id,
                    'otherUser' => $otherUser ? $this->serializeUser($otherUser) : null,
                    'lastMessage' => $last['message'] ?? '',
                    'lastMessageAt' => $last['timestamp'] ?? '',
                    'unreadCount' => $meta['unreadByConv'][$conversationId] ?? 0,
                    'createdAt' => $conversation->created_at?->toIso8601String() ?? '',
                    'updatedAt' => $conversation->updated_at?->toIso8601String() ?? '',
                ];
            })
            ->sortByDesc(fn (array $row) => strtotime($row['lastMessageAt'] ?: $row['updatedAt'] ?: '0'))
            ->values()
            ->all();
    }

    /** @return array<int, array<string, mixed>> */
    public function getMessages(int $userId, int $conversationId, int $limit = 80, ?string $since = null): array
    {
        $conversation = $this->requireConversationAccess($userId, $conversationId);

        $query = ChatMessage::query()
            ->where('conversation_id', $conversation->id)
            ->orderByDesc('id');

        if ($since) {
            $sinceTime = strtotime($since);
            if ($sinceTime) {
                $query->where('created_at', '>', date('Y-m-d H:i:s', $sinceTime));
            }
            $limit = max($limit, 200);
        }

        $messages = $query->limit($limit)->get()->reverse()->values();

        return $messages->map(fn (ChatMessage $message) => $this->serializeMessage($message))->all();
    }

    public function sendMessage(int $senderId, int $receiverId, string $message): array
    {
        $cleanMessage = trim($message);

        if ($cleanMessage === '') {
            throw new \RuntimeException('กรุณาระบุข้อความ');
        }

        $sender = User::query()->find($senderId);
        $receiver = User::query()->find($receiverId);

        if (! $sender) {
            throw new \RuntimeException('ไม่พบผู้ส่ง');
        }

        if (! $receiver) {
            throw new \RuntimeException('ไม่พบผู้รับ');
        }

        $conversationData = $this->getOrCreateConversation($senderId, $receiverId);
        $conversation = ChatConversation::query()->findOrFail((int) $conversationData['conversationId']);

        $chatMessage = ChatMessage::query()->create([
            'conversation_id' => $conversation->id,
            'sender_id' => $senderId,
            'receiver_id' => $receiverId,
            'message_type' => 'text',
            'message' => $cleanMessage,
            'is_read' => false,
        ]);

        $conversation->touch();

        return [
            'success' => true,
            'messageId' => $this->messagePublicId($chatMessage),
            'conversationId' => (string) $conversation->id,
            'senderId' => (string) $senderId,
            'receiverId' => (string) $receiverId,
            'message' => $cleanMessage,
            'timestamp' => $chatMessage->created_at?->toIso8601String() ?? now()->toIso8601String(),
            'isRead' => false,
        ];
    }

    public function markRead(int $userId, int $conversationId): array
    {
        $conversation = $this->requireConversationAccess($userId, $conversationId);

        ChatMessage::query()
            ->where('conversation_id', $conversation->id)
            ->where('receiver_id', $userId)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return ['success' => true];
    }

    public function getUnreadCount(int $userId): int
    {
        return (int) ChatMessage::query()
            ->where('receiver_id', $userId)
            ->where('is_read', false)
            ->count();
    }

    public function pollInbox(int $userId, ?int $conversationId, ?string $since): array
    {
        $conversations = $this->getUserConversations($userId);
        $unread = array_sum(array_column($conversations, 'unreadCount'));

        $messages = [];

        if ($conversationId) {
            $messages = $this->getMessages(
                $userId,
                $conversationId,
                $since ? 200 : 80,
                $since,
            );
        }

        return [
            'success' => true,
            'unread' => $unread,
            'conversations' => $conversations,
            'messages' => $messages,
            'serverTime' => now()->toIso8601String(),
        ];
    }

    private function loginResponse(User $user): array
    {
        $user->touch();

        $session = $this->createSession($user);

        return [
            'success' => true,
            'sessionToken' => $session['token'],
            'expiresAt' => $session['expiresAt'],
            'user' => $this->serializeUser($user->fresh(['departments'])),
        ];
    }

    private function findOrCreateUserFromLine(
        string $lineUserId,
        string $displayName,
        ?string $pictureUrl,
        ?string $email = null,
    ): User {
        $user = User::query()->where('line_id', $lineUserId)->first();

        if (! $user && $email) {
            $user = User::query()->where('email', $email)->first();
            if ($user) {
                $user->update([
                    'line_id' => $lineUserId,
                    'line_display_name' => $displayName,
                    'line_picture_url' => $pictureUrl,
                    'avatar' => $user->avatar ?: $pictureUrl,
                ]);
            }
        }

        if (! $user) {
            $email = $email ?: $lineUserId.'@line.login';

            if (User::query()->where('email', $email)->exists()) {
                throw new \RuntimeException('พบบัญชีอีเมลนี้อยู่แล้ว กรุณาเข้าสู่ระบบแล้วผูก LINE ที่โปรไฟล์');
            }

            $user = User::create([
                'name' => '',
                'line_display_name' => $displayName,
                'email' => $email,
                'password' => bcrypt(Str::random(32)),
                'line_id' => $lineUserId,
                'avatar' => $pictureUrl,
                'line_picture_url' => $pictureUrl,
                'profile_completed' => false,
            ]);

            if (method_exists($user, 'assignRole')) {
                $user->assignRole('user');
            }
        } else {
            $this->updateUserProfileFromLine($user, $displayName, $pictureUrl);
        }

        return $user->fresh(['departments']);
    }

    private function updateUserProfileFromLine(User $user, string $displayName, ?string $pictureUrl): void
    {
        $user->update([
            'line_display_name' => $displayName ?: $user->line_display_name,
            'line_picture_url' => $pictureUrl ?: $user->line_picture_url,
            'avatar' => ($user->avatar === $user->line_picture_url || ! $user->avatar)
                ? ($pictureUrl ?: $user->avatar)
                : $user->avatar,
        ]);
    }

    /** @param Collection<int, User> $users */
    private function dedupeUsersByLineId(Collection $users): Collection
    {
        $map = [];

        foreach ($users as $user) {
            $key = $user->line_id ? (string) $user->line_id : ('id:'.$user->id);
            $prev = $map[$key] ?? null;

            if (! $prev) {
                $map[$key] = $user;
                continue;
            }

            $prevTime = strtotime((string) ($prev->updated_at ?? $prev->created_at ?? '')) ?: 0;
            $newTime = strtotime((string) ($user->updated_at ?? $user->created_at ?? '')) ?: 0;
            $map[$key] = $newTime >= $prevTime ? $user : $prev;
        }

        return collect(array_values($map));
    }

    /** @param array<int, int> $conversationIds */
    private function buildConversationMessageMeta(int $userId, array $conversationIds): array
    {
        if ($conversationIds === []) {
            return ['lastByConv' => [], 'unreadByConv' => []];
        }

        $lastByConv = [];
        $unreadByConv = [];

        $latestIds = ChatMessage::query()
            ->selectRaw('conversation_id, MAX(id) as max_id')
            ->whereIn('conversation_id', $conversationIds)
            ->groupBy('conversation_id')
            ->pluck('max_id', 'conversation_id');

        if ($latestIds->isNotEmpty()) {
            $latestMessages = ChatMessage::query()
                ->whereIn('id', $latestIds->values())
                ->get()
                ->keyBy('conversation_id');

            foreach ($latestMessages as $conversationId => $message) {
                $lastByConv[(string) $conversationId] = [
                    'message' => $message->message,
                    'timestamp' => $message->created_at?->toIso8601String() ?? '',
                ];
            }
        }

        $unreadRows = ChatMessage::query()
            ->selectRaw('conversation_id, COUNT(*) as unread_count')
            ->whereIn('conversation_id', $conversationIds)
            ->where('receiver_id', $userId)
            ->where('is_read', false)
            ->groupBy('conversation_id')
            ->get();

        foreach ($unreadRows as $row) {
            $unreadByConv[(string) $row->conversation_id] = (int) $row->unread_count;
        }

        return [
            'lastByConv' => $lastByConv,
            'unreadByConv' => $unreadByConv,
        ];
    }

    private function requireConversationAccess(int $userId, int $conversationId): ChatConversation
    {
        $conversation = ChatConversation::query()->find($conversationId);

        if (! $conversation || ! $conversation->involvesUser($userId)) {
            throw new \RuntimeException('ไม่มีสิทธิ์เข้าถึง Conversation นี้');
        }

        return $conversation;
    }

    private function serializeMessage(ChatMessage $message): array
    {
        return [
            'messageId' => $this->messagePublicId($message),
            'conversationId' => (string) $message->conversation_id,
            'senderId' => (string) $message->sender_id,
            'receiverId' => (string) $message->receiver_id,
            'messageType' => $message->message_type ?: 'text',
            'message' => $message->message,
            'timestamp' => $message->created_at?->toIso8601String() ?? '',
            'isRead' => (bool) $message->is_read,
        ];
    }

    private function messagePublicId(ChatMessage $message): string
    {
        return 'M'.$message->id;
    }

    private function sessionKey(string $token): string
    {
        return 'org_chat_session:'.$token;
    }
}
