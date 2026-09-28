<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TvMediaPlaylist extends Model
{
    protected $connection = 'mysql';
    protected $table = 'tv_media_playlists';

    protected $fillable = [
        'board_key', 'media_type', 'title', 'file_path',
        'duration_seconds', 'sort_order', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function scopeActiveForBoard($query, string $boardKey = 'default')
    {
        $keys = TvClinicRoom::normalizeBoardKeys($boardKey);
        return $query->whereIn('board_key', $keys)
            ->where('is_active', true)
            ->orderBy('sort_order');
    }
}
