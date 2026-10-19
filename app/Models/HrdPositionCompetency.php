<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdPositionCompetency extends Model
{
    protected $fillable = ['position_id', 'competency_id', 'expected_level'];

    public function position()
    {
        return $this->belongsTo(Position::class);
    }

    public function competency()
    {
        return $this->belongsTo(HrdCompetency::class, 'competency_id');
    }
}
