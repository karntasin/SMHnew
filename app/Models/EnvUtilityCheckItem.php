<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EnvUtilityCheckItem extends Model
{
    protected $fillable = ['check_id', 'checklist_id', 'status', 'value', 'notes'];

    public function check()
    {
        return $this->belongsTo(EnvUtilityCheck::class, 'check_id');
    }

    public function checklist()
    {
        return $this->belongsTo(EnvUtilityChecklist::class, 'checklist_id');
    }
}
