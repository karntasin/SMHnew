<?php

namespace App\Services\FshhChat;

use App\Models\Department;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class FshhChatSyncService
{
    public function __construct(
        protected readonly FshhChatClient $client,
    ) {}

    public function syncUser(User $user): void
    {
        $lineId = trim((string) $user->line_id);
        if ($lineId === '') {
            return;
        }
        if (! $this->client->isConfigured()) {
            return;
        }

        $this->client->call('syncUser', $this->userPayload($user));
    }

    /**
     * สร้างเซสชันแชทให้ผู้ใช้ที่ล็อกอินเว็บอยู่ แล้วคืน URL เปิด FSHH Chat
     *
     * @return array{success: bool, url?: string, error?: string}
     */
    public function openWebSession(User $user): array
    {
        if (! $this->client->isConfigured()) {
            return ['success' => false, 'error' => 'ยังไม่ได้ตั้งค่า FSHH Chat'];
        }

        $result = $this->client->call('createWebSession', $this->userPayload($user));
        $token = is_array($result) ? (string) ($result['sessionToken'] ?? '') : '';
        if (($result['success'] ?? false) !== true || $token === '') {
            return [
                'success' => false,
                'error' => (string) ($result['error'] ?? 'เปิด FSHH Chat ไม่สำเร็จ'),
            ];
        }

        $base = rtrim((string) config('services.fshh_chat.url'), '/');

        return [
            'success' => true,
            'url' => $base.'/chat?sessionToken='.rawurlencode($token),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function userPayload(User $user): array
    {
        $user->loadMissing('departments');
        $departments = $user->departments
            ->map(fn ($dept) => [
                'id' => $dept->id,
                'name' => $dept->name,
                'code' => $dept->code,
            ])
            ->values()
            ->all();

        $avatar = (string) ($user->avatar_url ?? '');
        if ($avatar === '' || ! str_starts_with($avatar, 'http')) {
            $avatar = (string) ($user->line_picture_url ?? '');
        }

        return [
            'lineUserId' => trim((string) $user->line_id),
            'laravelUserId' => $user->id,
            'displayName' => $user->chat_name,
            'email' => (string) ($user->email ?? ''),
            'avatar' => $avatar,
            'departments' => $departments,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function notifyUser(User $user, array $data): void
    {
        $lineId = trim((string) $user->line_id);
        if ($lineId === '' || ! $this->client->isConfigured()) {
            return;
        }

        $this->syncUser($user);

        $title = (string) ($data['title'] ?? 'แจ้งเตือนจากระบบ');
        $message = (string) ($data['message'] ?? '');

        $result = $this->client->call('notifyUser', [
            'lineUserId' => $lineId,
            'title' => $title,
            'message' => $message,
        ]);

        if (($result['success'] ?? false) !== true) {
            Log::info('FSHH Chat notify skipped', [
                'user_id' => $user->id,
                'error' => $result['error'] ?? 'unknown',
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function notifyDepartment(?Department $department, array $data): void
    {
        if (! $department || ! $this->client->isConfigured()) {
            return;
        }

        $title = trim((string) ($data['title'] ?? 'แจ้งเตือนจากระบบ'));
        $message = trim((string) ($data['message'] ?? ''));
        $text = trim($title.($message !== '' ? "\n\n".$message : ''));
        if ($text === '') {
            return;
        }

        $fields = $this->normalizeChatFields($data['fields'] ?? []);
        $color = $this->sanitizeColor((string) ($data['color'] ?? ''));
        $priority = trim((string) ($data['priority'] ?? ''));
        $payload = [
            'departmentId' => $department->id,
            'departmentName' => $department->name,
            'title' => $title,
            'message' => $text,
        ];
        if ($fields !== [] || $color !== '' || $priority !== '') {
            $payload['messageType'] = 'card';
            $payload['fields'] = $fields;
            $payload['color'] = $color;
            $payload['priority'] = $priority;
        }

        $result = $this->client->call('notifyDepartment', $payload);

        if (($result['success'] ?? false) !== true) {
            Log::info('FSHH Chat department notify skipped', [
                'department_id' => $department->id,
                'error' => $result['error'] ?? 'unknown',
            ]);
        }
    }

    public function itDepartment(): ?Department
    {
        return $this->findDepartmentByAliases(['ศูนย์สารสนเทศ']);
    }

    public function logisticsDepartment(): ?Department
    {
        return $this->findDepartmentByAliases([
            'แผนกส่งกำลังและบริการ+ยานยนต์',
            'แผนกส่งกำลังและบริการ',
            'แผนกส่งกำลังบำรุง',
        ]);
    }

    public function adminDepartment(): ?Department
    {
        return $this->findDepartmentByAliases([
            'ฝ่ายธุรการ',
            'แผนกธุรการและกำลังพล',
            'แผนกธุรการ',
        ]);
    }

    /**
     * @param  array<string, mixed>  $fields
     */
    public function notifyCard(?Department $department, string $title, array $fields, string $color = '#64748B', string $priority = ''): void
    {
        $lines = [];
        foreach ($fields as $label => $value) {
            $value = trim((string) $value);
            if ($value === '') {
                continue;
            }
            $lines[] = $label.': '.$value;
        }

        $this->notifyDepartment($department, [
            'title' => $title,
            'message' => implode("\n", $lines),
            'fields' => $fields,
            'color' => $color,
            'priority' => $priority,
        ]);
    }
    /**
     * @param  list<string>  $aliases
     */
    public function findDepartmentByAliases(array $aliases): ?Department
    {
        foreach ($aliases as $alias) {
            $exact = Department::query()->where('name', $alias)->first();
            if ($exact) {
                return $exact;
            }
        }

        foreach ($aliases as $alias) {
            $like = Department::query()->where('name', 'like', '%'.$alias.'%')->first();
            if ($like) {
                return $like;
            }
        }

        return null;
    }

    /**
     * @param  mixed  $fields
     * @return list<array{label: string, value: string}>
     */
    private function normalizeChatFields(mixed $fields): array
    {
        if (! is_array($fields)) {
            return [];
        }

        $out = [];
        foreach ($fields as $key => $item) {
            if (is_array($item) && (isset($item['label']) || isset($item['value']))) {
                $label = trim((string) ($item['label'] ?? ''));
                $value = trim((string) ($item['value'] ?? ''));
            } else {
                $label = trim((string) $key);
                $value = trim((string) $item);
            }
            if ($label === '' || $value === '') {
                continue;
            }
            $out[] = ['label' => $label, 'value' => $value];
        }

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    public function syncAiContext(): array
    {
        if (! $this->client->isConfigured()) {
            return ['success' => false, 'error' => 'ยังไม่ได้ตั้งค่า FSHH Chat'];
        }

        $payload = app(FshhChatAiContextService::class)->build();

        return $this->client->call('syncAiContext', ['payload' => $payload], 25);
    }

    private function sanitizeColor(string $color): string
    {
        $color = strtoupper(trim($color));

        return preg_match('/^#[0-9A-F]{6}$/', $color) ? $color : '';
    }
}
