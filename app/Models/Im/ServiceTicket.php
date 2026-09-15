<?php

namespace App\Models\Im;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceTicket extends Model
{
    protected $table = 'im_service_tickets';

    protected $fillable = [
        'ticket_no', 'title', 'description', 'requester', 'department', 'category',
        'priority', 'sla_hours', 'status', 'assigned_to', 'opened_at', 'resolved_at',
    ];

    protected $casts = [
        'sla_hours' => 'integer',
        'opened_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    protected $appends = ['sla_breached', 'resolution_hours'];

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function getResolutionHoursAttribute(): ?float
    {
        if (! $this->opened_at || ! $this->resolved_at) {
            return null;
        }

        return round($this->opened_at->diffInMinutes($this->resolved_at) / 60, 1);
    }

    public function getSlaBreachedAttribute(): bool
    {
        if (! $this->opened_at) {
            return false;
        }

        $deadline = $this->opened_at->copy()->addHours((int) $this->sla_hours);
        $reference = $this->resolved_at ?? now();

        return $reference->greaterThan($deadline);
    }
}
