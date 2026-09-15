<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveBalance extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'leave_type_id',
        'year',
        'entitled_days',
        'used_days',
        'carry_over_days',
    ];

    protected function casts(): array
    {
        return [
            'entitled_days' => 'decimal:1',
            'used_days' => 'decimal:1',
            'carry_over_days' => 'decimal:1',
        ];
    }

    public function getRemainingDaysAttribute(): float
    {
        return (float) $this->entitled_days + (float) $this->carry_over_days - (float) $this->used_days;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function leaveType()
    {
        return $this->belongsTo(LeaveType::class);
    }
}
