<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TvDisplaySetting;
use Illuminate\Http\Request;

class TvDisplaySettingController extends Controller
{
    private function normalizeKey(string $boardKey): string
    {
        return match (strtolower(trim($boardKey))) {
            '003', 'er', 'tv-er' => '003',
            '013', 'drug', 'tv-drug', 'pharmacy' => '013',
            default => 'default',
        };
    }

    public function edit(string $boardKey = 'default')
    {
        $primaryKey = $this->normalizeKey($boardKey);
        $setting = TvDisplaySetting::firstOrCreate(['board_key' => $primaryKey]);
        return view('admin.tv.settings', compact('setting', 'boardKey'));
    }

    public function update(Request $request, string $boardKey = 'default')
    {
        $primaryKey = $this->normalizeKey($boardKey);
        $data = $request->validate([
            'left_media_mode' => 'required|in:video,image_slider,rss_news',
            'left_panel_width_percent' => 'required|integer|min:20|max:60',
            'chime_enabled' => 'boolean',
            'tts_enabled' => 'boolean',
            'tts_voice_locale' => 'nullable|string|max:10',
            'rss_feed_url' => 'nullable|url',
            'queue_poll_seconds' => 'required|integer|min:3|max:60',
            // Font size settings
            'font_room_title' => 'nullable|string|max:10',
            'font_calling_no' => 'nullable|string|max:10',
            'font_calling_name' => 'nullable|string|max:10',
            'font_waiting_no' => 'nullable|string|max:10',
            'font_waiting_name' => 'nullable|string|max:10',
            // Background color
            'bg_color' => 'nullable|string|max:30',
            // Wait badge toggle
            'show_wait_badge' => 'boolean',
            // Drug 2-column customization settings
            'drug_col1_title' => 'nullable|string|max:100',
            'drug_col2_title' => 'nullable|string|max:100',
            'drug_col1_border_color' => 'nullable|string|max:30',
            'drug_col2_border_color' => 'nullable|string|max:30',
            'drug_col1_waiting_title' => 'nullable|string|max:100',
            'drug_col2_waiting_title' => 'nullable|string|max:100',
            // ER Triage & Countdown settings
            'er_show_triage' => 'boolean',
            'er_show_countdown' => 'boolean',
            'er_triage_target_1' => 'nullable|integer|min:0|max:1440',
            'er_triage_target_2' => 'nullable|integer|min:0|max:1440',
            'er_triage_target_3' => 'nullable|integer|min:0|max:1440',
            'er_triage_target_4' => 'nullable|integer|min:0|max:1440',
            'er_triage_target_5' => 'nullable|integer|min:0|max:1440',
        ]);

        $data['right_panel_width_percent'] = 100 - $data['left_panel_width_percent'];
        $data['chime_enabled'] = $request->boolean('chime_enabled');
        $data['tts_enabled'] = $request->boolean('tts_enabled');
        $data['show_wait_badge'] = $request->boolean('show_wait_badge');
        $data['er_show_triage'] = $request->boolean('er_show_triage');
        $data['er_show_countdown'] = $request->boolean('er_show_countdown');

        // Normalize font fields: empty string -> 'auto'
        foreach (['font_room_title', 'font_calling_no', 'font_calling_name', 'font_waiting_no', 'font_waiting_name'] as $field) {
            if (empty($data[$field]) || $data[$field] === '') {
                $data[$field] = 'auto';
            }
        }

        // Normalize bg_color: empty string -> null
        if (empty($data['bg_color'])) {
            $data['bg_color'] = null;
        }

        $setting = TvDisplaySetting::firstOrCreate(['board_key' => $primaryKey]);
        $setting->update($data);

        return back()->with('status', 'บันทึกการตั้งค่าเรียบร้อย');
    }
}
