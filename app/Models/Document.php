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
        'director_signed_at' => 'datetime',
        'archived_at' => 'datetime',
    ];

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
