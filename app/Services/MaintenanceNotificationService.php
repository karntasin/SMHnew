<?php

namespace App\Services;

use App\Models\MaintenanceRequest;
use App\Models\User;
use App\Models\Position;
use App\Notifications\MaintenanceRequestNotification;

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
    const IT_CATEGORIES = ['คอมพิวเตอร์', 'IT', 'คอมพิวเตอร์/IT', 'Computer', 'เครือข่าย', 'Network'];

    /**
     * ส่งแจ้งเตือนไปยังช่างที่รับผิดชอบตามหมวดหมู่
     */
    public function notifyTechnicians(MaintenanceRequest $maintenanceRequest, string $action = 'created'): void
    {
        // Load category relationship
        $maintenanceRequest->load('category');
        
        // ตรวจสอบว่าหมวดหมู่เป็น IT หรือไม่
        $isITCategory = $this->isITCategory($maintenanceRequest->category->name ?? '');
        
        // กำหนดตำแหน่งที่ต้องส่งแจ้งเตือน
        $targetPosition = $isITCategory ? self::POSITION_IT : self::POSITION_TECHNICIAN;
        
        // ดึง users ที่มีตำแหน่งตรงกัน
        $users = $this->getUsersByPosition($targetPosition);
        
        // ส่งแจ้งเตือน
        foreach ($users as $user) {
            $user->notify(new MaintenanceRequestNotification($maintenanceRequest, $action));
        }
    }

    /**
     * ตรวจสอบว่าหมวดหมู่เป็น IT หรือไม่
     */
    protected function isITCategory(string $categoryName): bool
    {
        foreach (self::IT_CATEGORIES as $itCategory) {
            if (stripos($categoryName, $itCategory) !== false) {
                return true;
            }
        }
        return false;
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
