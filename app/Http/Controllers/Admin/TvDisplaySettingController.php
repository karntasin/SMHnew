<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TvDisplaySetting;
use Illuminate\Http\Request;

class TvDisplaySettingController extends Controller
{
    public function edit(string $boardKey = 'default')
    {
        $setting = TvDisplaySetting::firstOrCreate(['board_key' => $boardKey]);
        return view('admin.tv.settings', compact('setting'));
    }

    public function update(Request $request, string $boardKey = 'default')
    {
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

        $setting = TvDisplaySetting::firstOrCreate(['board_key' => $boardKey]);
        $setting->update($data);

        return redirect()
            ->route('admin.tv.settings.edit', $boardKey)
            ->with('status', 'บันทึกการตั้งค่าเรียบร้อย');
    }
}
