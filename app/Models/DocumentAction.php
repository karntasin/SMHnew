<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentAction extends Model
{
    protected $guarded = [];

    protected $casts = [
        'acknowledged_at' => 'datetime',
        'reminder_sent_at' => 'datetime',
        'implementation_updated_at' => 'datetime',
        'is_current' => 'boolean',
    ];

    public function document()
    {
        return $this->belongsTo(Document::class);
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function receiverUser()
    {
        return $this->belongsTo(User::class, 'receiver_user_id');
    }

    public function receiverDepartment()
    {
        return $this->belongsTo(Department::class, 'receiver_department_id');
    }

    public function acknowledgedByUser()
    {
        return $this->belongsTo(User::class, 'acknowledged_by');
    }
    
    // Check if this action needs a reminder (>3 hours without acknowledgment)
    public function needsReminder(): bool
    {
        if ($this->action_type !== 'forward') {
            return false;
        }
        
        if ($this->acknowledged_at) {
            return false;
        }
        
        if ($this->reminder_sent_at) {
            return false; // Already sent
        }
        
        return $this->created_at->lt(now()->subHours(3));
    }
}
