<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TvDisplaySetting extends Model
{
    protected $connection = 'mysql';
    protected $table = 'tv_display_settings';

    protected $fillable = [
        'board_key', 'left_media_mode', 'left_panel_width_percent',
        'right_panel_width_percent', 'chime_enabled', 'tts_enabled',
        'tts_voice_locale', 'rss_feed_url', 'queue_poll_seconds',
    ];

    protected $casts = [
        'chime_enabled' => 'boolean',
        'tts_enabled' => 'boolean',
    ];
}
