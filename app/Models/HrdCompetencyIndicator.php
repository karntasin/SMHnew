<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdCompetencyIndicator extends Model
{
    protected $fillable = ['competency_id', 'level', 'behavior'];

    public function competency()
    {
        return $this->belongsTo(HrdCompetency::class, 'competency_id');
    }
}
