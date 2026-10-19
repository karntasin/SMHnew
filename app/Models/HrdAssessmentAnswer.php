<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdAssessmentAnswer extends Model
{
    protected $fillable = ['response_id', 'item_id', 'value'];

    public function response()
    {
        return $this->belongsTo(HrdAssessmentResponse::class, 'response_id');
    }

    public function item()
    {
        return $this->belongsTo(HrdAssessmentItem::class, 'item_id');
    }
}
