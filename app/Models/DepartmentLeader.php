<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DepartmentLeader extends Model
{
    public const ROLE_HEAD = 'head';

    public const ROLE_ASSISTANT = 'assistant';

    public const ROLES = [
        self::ROLE_HEAD => 'หัวหน้าแผนกฝ่าย',
        self::ROLE_ASSISTANT => 'ผู้ช่วยแผนกฝ่าย',
    ];

    protected $fillable = [
        'department_id',
        'user_id',
        'role',
        'sort_order',
    ];

    protected $appends = [
        'role_label',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getRoleLabelAttribute(): string
    {
        return self::ROLES[$this->role] ?? $this->role;
    }

    public static function roleOptions(): array
    {
        return collect(self::ROLES)
            ->map(fn (string $label, string $value) => ['value' => $value, 'label' => $label])
            ->values()
            ->all();
    }

    /**
     * ตรวจว่าผู้ใช้เป็นหัวหน้าหรือผู้ช่วยของแผนกหรือไม่
     * ไม่ระบุแผนก = เป็นผู้นำอย่างน้อยหนึ่งแผนก
     * ไม่ระบุบทบาท = ทั้งหัวหน้าและผู้ช่วย
     */
    public static function userLeads(int|User|null $user, ?int $departmentId = null, ?string $role = null): bool
    {
        $userId = $user instanceof User ? $user->id : $user;
        if (! $userId) {
            return false;
        }

        return static::query()
            ->where('user_id', $userId)
            ->when($departmentId, fn ($query) => $query->where('department_id', $departmentId))
            ->when($role, fn ($query) => $query->where('role', $role))
            ->exists();
    }
}
