<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class CalendarEvent extends Model
{
    use HasFactory;

    protected $table = 'app_calendar_events';
    protected $connection = 'mysql';

    protected $fillable = [
        'user_id',
        'scope', // 'personal', 'hospital', 'hr'
        'title',
        'description',
        'location',
        'start_time',
        'end_time',
        'is_all_day',
        'color',
        'category',
        'priority', // 'low', 'normal', 'high', 'urgent'
        'department_id',
        'visibility', // 'private', 'department', 'public'
        'status', // 'scheduled', 'in_progress', 'completed', 'cancelled'
        'google_event_id',
        'ical_uid',
        'metadata',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'is_all_day' => 'boolean',
        'metadata' => 'array',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($event) {
            if (empty($event->ical_uid)) {
                $event->ical_uid = (string) Str::uuid().'@fshh.app';
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function reminders(): HasMany
    {
        return $this->hasMany(CalendarReminder::class, 'event_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(CalendarEventAttachment::class, 'event_id');
    }

    /**
     * Scope for querying events accessible by a given user
     */
    public function scopeAccessibleBy($query, User $user)
    {
        $userDeptIds = $user->departments()->pluck('departments.id')->toArray();
        $isHrOrAdmin = $user->hasRole(['Super Admin', 'Admin', 'HR', 'ผู้ดูแลระบบ'])
            || in_array($user->department_id, [1, 2]);

        $canViewHospital = $user->hasAnyRole(['admin', 'Admin', 'superUser', 'superuser', 'Super Admin', 'header', 'Header'])
            || (method_exists($user, 'departmentLeaders') && $user->departmentLeaders()->exists());

        return $query->where(function ($q) use ($user, $userDeptIds, $isHrOrAdmin, $canViewHospital) {
            // 1. Personal events owned by user
            $q->where(function ($sub) use ($user) {
                $sub->where('scope', 'personal')
                    ->where('user_id', $user->id);
            });

            // 2. Hospital-wide events (Restricted ONLY to admin, superuser, header)
            if ($canViewHospital) {
                $q->orWhere(function ($sub) {
                    $sub->where('scope', 'hospital')
                        ->where('visibility', 'public');
                });
            }

            // 3. HR events (accessible to HR, or public/targeted department)
            $q->orWhere(function ($sub) use ($user, $userDeptIds, $isHrOrAdmin) {
                $sub->where('scope', 'hr')
                    ->where(function ($hrSub) use ($user, $userDeptIds, $isHrOrAdmin) {
                        if ($isHrOrAdmin) {
                            $hrSub->whereRaw('1=1');
                        } else {
                            $hrSub->where('visibility', 'public')
                                ->orWhere(function ($deptSub) use ($userDeptIds) {
                                    $deptSub->where('visibility', 'department')
                                        ->whereIn('department_id', $userDeptIds);
                                })
                                ->orWhere('user_id', $user->id);
                        }
                    });
            });
        });
    }

    /**
     * Generate Google Calendar 1-Click Template URL
     */
    public function getGoogleCalendarUrlAttribute(): string
    {
        $base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';

        if ($this->is_all_day) {
            $dates = $this->start_time->format('Ymd') . '/' . $this->end_time->addDay()->format('Ymd');
        } else {
            $dates = $this->start_time->setTimezone('UTC')->format('Ymd\THis\Z') . '/' . $this->end_time->setTimezone('UTC')->format('Ymd\THis\Z');
        }

        $params = [
            'text' => $this->title,
            'dates' => $dates,
            'details' => trim(($this->description ?? '') . "\n\nขอบเขต: " . $this->scope_label . "\nระบบ รพ.ค่ายสุรสิงหนาท"),
            'location' => $this->location ?? 'โรงพยาบาลค่ายสุรสิงหนาท',
        ];

        return $base . '&' . http_build_query($params);
    }

    public function getScopeLabelAttribute(): string
    {
        return match ($this->scope) {
            'personal' => 'ส่วนตัว',
            'hospital' => 'ภาพรวม รพ.',
            'hr' => 'งาน HR',
            default => 'ทั่วไป',
        };
    }
}
