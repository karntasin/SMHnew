<?php

namespace App\Models\Im;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChangeRequest extends Model
{
    protected $table = 'im_change_requests';

    protected $fillable = [
        'cr_no', 'title', 'description', 'requested_by', 'category', 'impact',
        'risk_note', 'status', 'approved_by', 'approved_at', 'planned_date', 'note',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'planned_date' => 'date',
    ];

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
