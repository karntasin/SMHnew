<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdAssessmentItem extends Model
{
    protected $fillable = ['section_id', 'prompt', 'reverse_scored', 'sort'];

    protected $casts = [
        'reverse_scored' => 'boolean',
    ];

    public function section()
    {
        return $this->belongsTo(HrdAssessmentSection::class, 'section_id');
    }
}
