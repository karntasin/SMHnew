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

    public static function normalizeBoardKeys(string $boardKey): array
    {
        return match (strtolower(trim($boardKey))) {
            '002', 'tv', 'opd', 'default' => ['default', '002', 'tv', 'opd'],
            '003', 'er', 'tv-er' => ['003', 'er', 'tv-er'],
            '013', 'drug', 'tv-drug', 'pharmacy' => ['013', 'drug', 'tv-drug', 'pharmacy'],
            default => [$boardKey],
        };
    }

    public function scopeActiveForBoard($query, string $boardKey = 'default')
    {
        $keys = self::normalizeBoardKeys($boardKey);
        return $query->whereIn('board_key', $keys)
            ->where('is_active', true)
            ->orderBy('sort_order');
    }
}
