<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KmDocument extends Model
{
    protected $fillable = [
        'document_number',
        'title',
        'description',
        'file_path',
        'version',
        'is_current',
        'effective_date',
        'category_id',
        'user_id',
        'group_id'
    ];

    protected $casts = [
        'is_current' => 'boolean',
        'effective_date' => 'date',
    ];

    public function category()
    {
        return $this->belongsTo(KmCategory::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function readReceipts()
    {
        return $this->hasMany(KmReadReceipt::class, 'document_id');
    }

    public function ratings()
    {
        return $this->morphMany(KmRating::class, 'rateable');
    }
}
