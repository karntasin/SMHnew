<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalendarReminder extends Model
{
    use HasFactory;

    protected $table = 'app_calendar_reminders';
    protected $connection = 'mysql';

    protected $fillable = [
        'event_id',
        'user_id',
        'remind_at',
        'reminder_type',
        'offset_minutes',
        'max_repeats',
        'repeat_interval_minutes',
        'sent_count',
        'last_sent_at',
        'channel',
        'status',
    ];

    protected $casts = [
        'remind_at' => 'datetime',
        'last_sent_at' => 'datetime',
        'offset_minutes' => 'integer',
        'max_repeats' => 'integer',
        'repeat_interval_minutes' => 'integer',
        'sent_count' => 'integer',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(CalendarEvent::class, 'event_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
