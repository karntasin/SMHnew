<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MaintenanceRequestTimeline extends Model
{
    use HasFactory;

    protected $table = 'maintenance_request_timeline';

    protected $fillable = [
        'maintenance_request_id',
        'user_id',
        'created_by',
        'action',
        'status',
        'description',
        'note',
        'old_values',
        'new_values',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $timeline) {
            if (blank($timeline->status)) {
                $timeline->status = $timeline->action ?: 'updated';
            }
            if (blank($timeline->action)) {
                $timeline->action = $timeline->status;
            }
            if (blank($timeline->created_by) && filled($timeline->user_id)) {
                $timeline->created_by = $timeline->user_id;
            }
            if (blank($timeline->note) && filled($timeline->description)) {
                $timeline->note = $timeline->description;
            }
        });
    }

    public function request()
    {
        return $this->belongsTo(MaintenanceRequest::class, 'maintenance_request_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
