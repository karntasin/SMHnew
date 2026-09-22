<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TvClinicRoom extends Model
{
    protected $connection = 'mysql';
    protected $table = 'tv_clinic_rooms';

    protected $fillable = [
        'board_key', 'hosxp_cur_dep', 'display_name', 'is_active', 'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function scopeActiveForBoard($query, string $boardKey = 'default')
    {
        return $query->where('board_key', $boardKey)
            ->where('is_active', true)
            ->orderBy('sort_order');
    }
}
