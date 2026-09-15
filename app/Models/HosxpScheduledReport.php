<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HosxpScheduledReport extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'report_id',
        'params',
        'format',
        'frequency',
        'day_of_month',
        'day_of_week',
        'run_time',
        'next_run_at',
        'last_run_at',
        'last_file_path',
        'is_active',
    ];

    protected $casts = [
        'params' => 'array',
        'is_active' => 'boolean',
        'next_run_at' => 'datetime',
        'last_run_at' => 'datetime',
        'run_time' => 'datetime:H:i',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function computeNextRun(?Carbon $from = null): Carbon
    {
        $from = ($from ?? now())->timezone('Asia/Bangkok');
        $time = $this->run_time ? Carbon::parse($this->run_time)->format('H:i') : '06:00';
        [$hour, $minute] = array_map('intval', explode(':', $time));

        $next = $from->copy()->setTime($hour, $minute, 0);

        if ($this->frequency === 'daily') {
            if ($next->lte($from)) {
                $next->addDay();
            }

            return $next;
        }

        if ($this->frequency === 'weekly') {
            $targetDow = $this->day_of_week ?? 1;
            $next->next($this->dowName($targetDow));
            if ($next->lte($from)) {
                $next->addWeek();
            }

            return $next;
        }

        $dom = min(max((int) ($this->day_of_month ?? 1), 1), 28);
        $next = $from->copy()->day($dom)->setTime($hour, $minute, 0);
        if ($next->lte($from)) {
            $next->addMonth()->day($dom);
        }

        return $next;
    }

    private function dowName(int $dow): string
    {
        return match ($dow) {
            0 => 'Sunday',
            1 => 'Monday',
            2 => 'Tuesday',
            3 => 'Wednesday',
            4 => 'Thursday',
            5 => 'Friday',
            6 => 'Saturday',
            default => 'Monday',
        };
    }
}
