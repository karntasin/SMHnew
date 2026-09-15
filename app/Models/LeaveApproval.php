<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveApproval extends Model
{
    use HasFactory;

    protected $fillable = [
        'leave_request_id',
        'step',
        'role_label',
        'approver_id',
        'action',
        'comment',
        'acted_at',
    ];

    protected function casts(): array
    {
        return [
            'approver_id' => 'integer',
            'step' => 'integer',
            'acted_at' => 'datetime',
        ];
    }

    public function leaveRequest()
    {
        return $this->belongsTo(LeaveRequest::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approver_id');
    }
}
