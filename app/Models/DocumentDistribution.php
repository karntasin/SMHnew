<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentDistribution extends Model
{
    protected $fillable = [
        'document_id',
        'department_id',
        'user_id',
        'status',
        'acknowledged_at',
        'note',
    ];

    protected $casts = [
        'acknowledged_at' => 'datetime',
    ];

    public function document()
    {
        return $this->belongsTo(Document::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
