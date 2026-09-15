<?php

namespace App\Services;

use App\Models\MaintenanceRequest;
use App\Models\MaintenancePriority;
use App\Models\User;
use App\Models\Position;
use App\Notifications\MaintenanceRequestNotification;
use App\Services\FshhChat\FshhChatSyncService;

class MaintenanceNotificationService
{
    /**
     * ชื่อตำแหน่งช่างส่งกำลัง
     */
    const POSITION_TECHNICIAN = 'ช่างส่งกำลัง';

    /**
     * ชื่อตำแหน่งช่าง IT
     */
    const POSITION_IT = 'ช่างIT';

    /**
     * หมวดหมู่ที่ต้องส่งให้ช่าง IT
     */
    const IT_CATEGORIES = [
        'คอมพิวเตอร์',
        'IT',
        'คอมพิวเตอร์/IT',
        'Computer',
        'เครือข่าย',
        'Network',
        'อุปกรณ์คอมพิวเตอร์',
        'สารสนเทศ',
    ];

    /**
     * ส่งแจ้งเตือนไปยังช่างที่รับผิดชอบตามหมวดหมู่
     */
    public function notifyTechnicians(MaintenanceRequest $maintenanceRequest, string $action = 'created'): void
    {
        $maintenanceRequest->loadMissing(['category', 'requester', 'priority']);

        // ตรวจสอบว่าหมวดหมู่เป็น IT หรือไม่
        $isITCategory = $this->isITCategory($maintenanceRequest->category->name ?? '');
        
        // กำหนดตำแหน่งที่ต้องส่งแจ้งเตือน
        $targetPosition = $isITCategory ? self::POSITION_IT : self::POSITION_TECHNICIAN;
        
        // ดึง users ที่มีตำแหน่งตรงกัน
        $users = $this->getUsersByPosition($targetPosition);
        $requesterId = (int) ($maintenanceRequest->user_id ?? 0);

        foreach ($users as $user) {
            if ($requesterId > 0 && (int) $user->id === $requesterId) {
                continue;
            }
            $user->notify(new MaintenanceRequestNotification(
                $maintenanceRequest,
                $action,
                $action !== 'created'
            ));
        }

        $this->notifyDepartmentChat($maintenanceRequest, $action);
    }

    public function isITCategory(string $categoryName): bool
    {
        foreach (self::IT_CATEGORIES as $itCategory) {
            if (stripos($categoryName, $itCategory) !== false) {
                return true;
            }
        }

        return false;
    }

    protected function notifyDepartmentChat(MaintenanceRequest $maintenanceRequest, string $action): void
    {
        $categoryName = (string) ($maintenanceRequest->category->name ?? '');
        $isIT = $this->isITCategory($categoryName);

        $chat = app(FshhChatSyncService::class);
        $department = $isIT ? $chat->itDepartment() : $chat->logisticsDepartment();
        if (! $department) {
            return;
        }

        $messages = [
            'created' => 'มีการแจ้งซ่อมใหม่',
            'assigned' => 'มอบหมายงานซ่อมแล้ว',
            'in_progress' => 'เริ่มดำเนินการซ่อม',
            'completed' => 'งานซ่อมเสร็จสิ้น',
            'cancelled' => 'งานซ่อมถูกยกเลิก',
        ];

        $priority = $maintenanceRequest->priority;
        $priorityName = trim((string) ($priority?->name ?? ''));
        $fields = [
            'เลขที่' => $maintenanceRequest->ticket_number,
            'ผู้แจ้ง' => $maintenanceRequest->requester?->display_name ?: 'ไม่ระบุ',
            'ความสำคัญ' => $priorityName !== '' ? $priorityName : 'ไม่ระบุ',
            'หมวด' => $categoryName !== '' ? $categoryName : 'ไม่ระบุ',
            'เรื่อง' => $maintenanceRequest->title,
            'สถานที่' => $maintenanceRequest->location,
            'รายละเอียด' => $maintenanceRequest->description,
        ];

        $chat->notifyDepartment($department, [
            'title' => trim($this->priorityEmoji($priority).' '.($messages[$action] ?? 'แจ้งซ่อม')),
            'message' => $this->formatDepartmentChatMessage($fields),
            'fields' => $this->chatFieldList($fields),
            'color' => $this->priorityColor($priority),
            'priority' => $priorityName,
        ]);
    }

    /**
     * @param  array<string, mixed>  $fields
     * @return list<array{label: string, value: string}>
     */
    protected function chatFieldList(array $fields): array
    {
        $out = [];
        foreach ($fields as $label => $value) {
            $value = trim((string) $value);
            if ($value === '') {
                continue;
            }
            $out[] = ['label' => (string) $label, 'value' => $value];
        }

        return $out;
    }

    protected function priorityColor(?MaintenancePriority $priority): string
    {
        $color = strtoupper(trim((string) ($priority?->color ?? '')));
        if (preg_match('/^#[0-9A-F]{6}$/', $color)) {
            return $color;
        }

        $name = (string) ($priority?->name ?? '');
        $level = (int) ($priority?->level ?? 0);
        if ($level >= 4 || str_contains($name, 'วิกฤต')) {
            return '#EF4444';
        }
        if ($level === 3 || str_contains($name, 'เร่งด่วน') || str_contains($name, 'ด่วน')) {
            return '#F97316';
        }
        if ($level === 2 || str_contains($name, 'ปานกลาง')) {
            return '#EAB308';
        }
        if ($level === 1 || str_contains($name, 'ปกติ')) {
            return '#22C55E';
        }

        return '#64748B';
    }

    protected function priorityEmoji(?MaintenancePriority $priority): string
    {
        $name = (string) ($priority?->name ?? '');
        $level = (int) ($priority?->level ?? 0);
        if ($level >= 4 || str_contains($name, 'วิกฤต')) {
            return '🔴';
        }
        if ($level === 3 || str_contains($name, 'เร่งด่วน') || str_contains($name, 'ด่วน')) {
            return '🟠';
        }
        if ($level === 2 || str_contains($name, 'ปานกลาง')) {
            return '🟡';
        }

        return '🟢';
    }

    /**
     * @param  array<string, mixed>  $fields
     */
    protected function formatDepartmentChatMessage(array $fields): string
    {
        $lines = [];
        foreach ($fields as $label => $value) {
            $value = trim((string) $value);
            if ($value === '') {
                continue;
            }
            $lines[] = $label.': '.$value;
        }

        return implode("\n", $lines);
    }

    /**
     * ดึง users ที่มีตำแหน่งที่ระบุ
     */
    protected function getUsersByPosition(string $positionName): \Illuminate\Support\Collection
    {
        // ค้นหา position จากชื่อ
        $position = Position::where('name', 'LIKE', "%{$positionName}%")->first();
        
        if (!$position) {
            return collect([]);
        }

        // ดึง users ที่มี position นี้
        return $position->users;
    }

    /**
     * ดึง users ตาม position ID
     */
    public function getUsersByPositionId(int $positionId): \Illuminate\Support\Collection
    {
        $position = Position::find($positionId);
        
        if (!$position) {
            return collect([]);
        }

        return $position->users;
    }
}
