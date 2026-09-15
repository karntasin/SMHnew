<?php

namespace App\Models\Im;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Timesheet extends Model
{
    protected $table = 'im_timesheets';

    protected $fillable = [
        'user_id', 'staff_name', 'work_date', 'hours', 'category', 'activity', 'note',
        'source', 'external_id', 'sheet_tab', 'start_time', 'end_time',
    ];

    protected $casts = [
        'work_date' => 'date',
        'hours' => 'float',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
