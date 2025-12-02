<?php

namespace App\Models\Ic;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class IcEducationRecord extends Model
{
    protected $fillable = [
        'training_title',
        'training_date',
        'training_type',
        'topic',
        'target_audience',
        'total_participants',
        'total_passed',
        'pass_rate',
        'trainer_name',
        'duration_hours',
        'location',
        'content_summary',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'training_date' => 'date',
        'pass_rate' => 'decimal:2',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function attendees()
    {
        return $this->hasMany(IcEducationAttendee::class, 'education_record_id');
    }

    // Auto calculate pass rate
    public function calculatePassRate()
    {
        if ($this->total_participants === 0) {
            return 0;
        }
        return round(($this->total_passed / $this->total_participants) * 100, 2);
    }
}
