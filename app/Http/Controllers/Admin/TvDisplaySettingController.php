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
        ]);

        $data['right_panel_width_percent'] = 100 - $data['left_panel_width_percent'];
        $data['chime_enabled'] = $request->boolean('chime_enabled');
        $data['tts_enabled'] = $request->boolean('tts_enabled');

        $setting = TvDisplaySetting::firstOrCreate(['board_key' => $primaryKey]);
        $setting->update($data);

        return back()->with('status', 'บันทึกการตั้งค่าเรียบร้อย');
    }
}
