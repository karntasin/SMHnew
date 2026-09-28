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
        'font_room_title', 'font_calling_no', 'font_calling_name',
        'font_waiting_no', 'font_waiting_name',
        'bg_color', 'show_wait_badge',
        'drug_col1_title', 'drug_col2_title',
        'drug_col1_border_color', 'drug_col2_border_color',
        'drug_col1_waiting_title', 'drug_col2_waiting_title',
        'er_show_triage', 'er_show_countdown',
        'er_triage_target_1', 'er_triage_target_2',
        'er_triage_target_3', 'er_triage_target_4',
        'er_triage_target_5',
    ];

    protected $casts = [
        'chime_enabled' => 'boolean',
        'tts_enabled' => 'boolean',
        'show_wait_badge' => 'boolean',
        'er_show_triage' => 'boolean',
        'er_show_countdown' => 'boolean',
        'er_triage_target_1' => 'integer',
        'er_triage_target_2' => 'integer',
        'er_triage_target_3' => 'integer',
        'er_triage_target_4' => 'integer',
        'er_triage_target_5' => 'integer',
    ];
}
