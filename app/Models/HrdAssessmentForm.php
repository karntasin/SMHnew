<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdAssessmentForm extends Model
{
    protected $fillable = [
        'code', 'title', 'description', 'kind', 'visibility',
        'is_system', 'is_active', 'sort', 'disclaimer',
    ];

    protected $casts = [
        'is_system' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function sections()
    {
        return $this->hasMany(HrdAssessmentSection::class, 'form_id')->orderBy('sort');
    }

    public function submissions()
    {
        return $this->hasMany(HrdAssessmentSubmission::class, 'form_id');
    }

    public function responses()
    {
        return $this->hasMany(HrdAssessmentResponse::class, 'form_id');
    }
}
