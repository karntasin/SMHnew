<?php

namespace App\Models\Ic;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class IcEducationAttendee extends Model
{
    protected $fillable = [
        'education_record_id',
        'user_id',
        'attendee_name',
        'department',
        'pre_test_score',
        'post_test_score',
        'passed',
    ];

    protected $casts = [
        'pre_test_score' => 'decimal:2',
        'post_test_score' => 'decimal:2',
        'passed' => 'boolean',
    ];

    public function educationRecord()
    {
        return $this->belongsTo(IcEducationRecord::class, 'education_record_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
