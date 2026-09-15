<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeamHaMember extends Model
{
    public const ROLE_CHAIR = 'chair';

    public const ROLE_VICE_CHAIR = 'vice_chair';

    public const ROLE_COMMITTEE = 'committee';

    public const ROLE_SECRETARY = 'secretary';

    public const ROLE_ASSISTANT_SECRETARY = 'assistant_secretary';

    public const ROLES = [
        self::ROLE_CHAIR => 'ประธาน',
        self::ROLE_VICE_CHAIR => 'รองประธาน',
        self::ROLE_COMMITTEE => 'กรรมการ',
        self::ROLE_SECRETARY => 'เลขานุการ',
        self::ROLE_ASSISTANT_SECRETARY => 'ผู้ช่วยเลขานุการ',
    ];

    public const ROLE_SORT = [
        self::ROLE_CHAIR => 1,
        self::ROLE_VICE_CHAIR => 2,
        self::ROLE_COMMITTEE => 3,
        self::ROLE_SECRETARY => 4,
        self::ROLE_ASSISTANT_SECRETARY => 5,
    ];

    protected $table = 'teamha_members';

    protected $fillable = [
        'teamha_id',
        'user_id',
        'name',
        'role',
        'job_title',
        'sort_order',
    ];

    protected $appends = [
        'role_label',
    ];

    public function team(): BelongsTo
    {
        return $this->belongsTo(TeamHa::class, 'teamha_id');
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
}
