<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\DocumentAction;
use App\Models\DocumentCircularRecipient;

class Document extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'document_date' => 'date',
        'due_date' => 'datetime',
        'escalated_at' => 'datetime',
        'director_signed_at' => 'datetime',
        'archived_at' => 'datetime',
        'director_assigned_departments' => 'array',
    ];

    protected $appends = ['tracking_progress'];

    public function getTrackingProgressAttribute()
    {
        $forwardActions = $this->actions->where('action_type', 'forward');
        $total = $forwardActions->count();
        if ($total === 0) {
            return [
                'total' => 0,
                'acknowledged' => 0,
                'completed' => 0,
                'percent' => 0,
            ];
        }

        $acknowledged = $forwardActions->whereNotNull('acknowledged_at')->count();
        $completed = $forwardActions->whereIn('implementation_status', ['completed', 'not_relevant'])->count();
        $percent = (int) round(($completed / $total) * 100);

        return [
            'total' => $total,
            'acknowledged' => $acknowledged,
            'completed' => $completed,
            'percent' => $percent,
        ];
    }

    public function actions()
    {
        return $this->hasMany(DocumentAction::class);
    }

    public function circularRecipients()
    {
        return $this->hasMany(DocumentCircularRecipient::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }
}
