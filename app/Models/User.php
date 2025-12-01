<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Spatie\Permission\Traits\HasRoles;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\HasMedia;

class User extends Authenticatable implements HasMedia
{
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
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasRoles, InteractsWithMedia;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'line_id',
        'line_display_name',
        'avatar',
        'line_picture_url',
        'profile_completed',
        'position',
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
            'profile_completed' => 'boolean',
        ];
    }

    /**
     * Get the avatar URL (prioritize uploaded avatar, fallback to LINE picture)
     */
    public function getAvatarUrlAttribute(): ?string
    {
        if ($this->avatar && !str_starts_with($this->avatar, 'http')) {
            return asset('storage/' . $this->avatar);
        }
        return $this->avatar ?? $this->line_picture_url;
    }

    /**
     * Get display name (prioritize real name, fallback to LINE display name)
     */
    public function getDisplayNameAttribute(): string
    {
        return $this->name ?: $this->line_display_name ?: 'Unknown';
    }

    public function mediaFolders()
    {
        return $this->hasMany(MediaFolder::class);
    }
}
