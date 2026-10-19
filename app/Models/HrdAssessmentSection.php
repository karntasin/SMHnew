<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdAssessmentSection extends Model
{
    protected $fillable = ['form_id', 'title', 'weight', 'sort'];

    protected $casts = [
        'weight' => 'float',
    ];

    public function form()
    {
        return $this->belongsTo(HrdAssessmentForm::class, 'form_id');
    }

    public function items()
    {
        return $this->hasMany(HrdAssessmentItem::class, 'section_id')->orderBy('sort');
    }
}
