<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Spatie\Permission\Traits\HasRoles;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Facades\Hash;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\HasMedia;

class User extends Authenticatable implements HasMedia
{
    public const INITIAL_PASSWORD = '123456';

    /** @deprecated ใช้ INITIAL_PASSWORD — คงไว้ตรวจ migration ของเก่า */
    public const LEGACY_ADMIN_RESET_PASSWORD = 'ResetPasswordNya';

    /**
     * Many-to-many relationship: User positions
     */
    public function positions()
    {
        return $this->belongsToMany(Position::class, 'position_user');
    }

    /**
     * Single department relationship (legacy)
     */
    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Many-to-many relationship: User departments (สามารถอยู่ได้หลายแผนก)
     */
    public function departments()
    {
        return $this->belongsToMany(Department::class, 'department_user')
                    ->withPivot('is_primary')
                    ->withTimestamps();
    }

    /**
     * Get primary department (แผนกหลัก)
     */
    public function primaryDepartment()
    {
        return $this->departments()->wherePivot('is_primary', true)->first();
    }

    /**
     * Many-to-many relationship: User HA teams (สามารถสังกัดได้หลายทีม HA หรือไม่ระบุก็ได้)
     */
    public function haTeams()
    {
        return $this->belongsToMany(TeamHa::class, 'teamha_user', 'user_id', 'teamha_id')
                    ->withTimestamps();
    }

    public function departmentLeaders()
    {
        return $this->hasMany(DepartmentLeader::class);
    }

    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasRoles, InteractsWithMedia;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'prefix',
        'email',
        'username',
        'cid',
        'password',
        'must_change_password',
        'password_changed_at',
        'line_id',
        'line_display_name',
        'chat_display_name',
        'avatar',
        'signature_path',
        'stamp_path',
        'line_picture_url',
        'profile_completed',
        'position',
        'phone',
        'department_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'cid',
    ];

    protected $appends = [
        'cid_masked',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'must_change_password' => 'boolean',
            'password_changed_at' => 'datetime',
            'profile_completed' => 'boolean',
        ];
    }

    /**
     * ตั้งรหัสเริ่มต้น (123456) และบังคับเปลี่ยนครั้งถัดไป
     */
    public function assignInitialPassword(): void
    {
        $this->forceFill([
            'password' => self::INITIAL_PASSWORD,
            'must_change_password' => true,
            'password_changed_at' => null,
        ])->save();
    }

    public function needsPasswordChange(): bool
    {
        if ($this->must_change_password) {
            return true;
        }

        $hash = (string) ($this->getAuthPassword() ?? '');
        if ($hash === '') {
            return true;
        }

        return Hash::check(self::INITIAL_PASSWORD, $hash);
    }

    /** ผู้ใช้กำหนดรหัสผ่านของตนเองแล้ว (ไม่ว่างเปล่า และไม่ใช่รหัสเริ่มต้น) */
    public function hasPasswordSet(): bool
    {
        $hash = (string) ($this->getAuthPassword() ?? '');
        if ($hash === '') {
            return false;
        }

        return ! $this->needsPasswordChange();
    }

    public function markPasswordChanged(): void
    {
        $this->forceFill([
            'must_change_password' => false,
            'password_changed_at' => now(),
        ])->save();
    }

    public function hasRealEmail(): bool
    {
        $email = strtolower(trim((string) $this->email));

        return $email !== '' && ! str_ends_with($email, '@line.login');
    }

    public function needsUsername(): bool
    {
        return ! $this->hasRealEmail() && trim((string) ($this->username ?? '')) === '';
    }

    /** รหัสที่ผู้ใช้ตั้งเอง และมีอีเมลจริงหรือ username สำหรับเข้าสู่ระบบ */
    public function isLoginReady(): bool
    {
        return ! $this->needsPasswordChange() && ! $this->needsUsername();
    }

    public static function findForLogin(string $identifier): ?self
    {
        $login = strtolower(trim($identifier));
        if ($login === '') {
            return null;
        }

        return static::query()
            ->where(function ($query) use ($login) {
                $query->whereRaw('LOWER(email) = ?', [$login])
                    ->orWhereRaw('LOWER(username) = ?', [$login]);
            })
            ->first();
    }

    /** @return array<int, string|\Illuminate\Validation\Rules\Unique> */
    public static function usernameRules(?int $ignoreUserId = null): array
    {
        $unique = \Illuminate\Validation\Rule::unique('users', 'username');
        if ($ignoreUserId) {
            $unique = $unique->ignore($ignoreUserId);
        }

        return [
            'required',
            'string',
            'min:3',
            'max:50',
            'regex:/^[A-Za-z0-9._-]+$/',
            $unique,
        ];
    }

    public function getCidMaskedAttribute(): ?string
    {
        return \App\Support\PiiMask::cid($this->attributes['cid'] ?? null);
    }

    /**
     * Get the avatar URL (prioritize uploaded avatar, fallback to LINE picture)
     */
    public function getAvatarUrlAttribute(): ?string
    {
        if ($this->avatar && !str_starts_with($this->avatar, 'http')) {
            return url('storage/' . ltrim($this->avatar, '/'));
        }
        return $this->avatar ?: $this->line_picture_url;
    }

    /**
     * Get display name (prioritize real name, fallback to LINE display name)
     */
    public function getDisplayNameAttribute(): string
    {
        return $this->name ?: $this->line_display_name ?: 'Unknown';
    }

    /**
     * ชื่อที่แสดงใน S-Chat — ถ้าว่างใช้ชื่อจริง / ชื่อ LINE
     */
    public function getChatNameAttribute(): string
    {
        $custom = trim((string) $this->chat_display_name);

        return $custom !== '' ? $custom : $this->display_name;
    }

    public function mediaFolders()
    {
        return $this->hasMany(MediaFolder::class);
    }
}
