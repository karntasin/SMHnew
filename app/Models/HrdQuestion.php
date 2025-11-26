<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdQuestion extends Model
{
    protected $fillable = ['quiz_id', 'question_text', 'type', 'points', 'order'];

    public function quiz()
    {
        return $this->belongsTo(HrdQuiz::class, 'quiz_id');
    }

    public function answers()
    {
        return $this->hasMany(HrdAnswer::class, 'question_id')->orderBy('order');
    }
}
