<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TvDisplaySetting;
use App\Services\HosxpQueueService;
use Illuminate\Http\Request;

class TvDisplaySettingController extends Controller
{
    public function __construct(
        private readonly HosxpQueueService $queueService
    ) {}

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

    public function labXray(string $boardKey = 'default')
    {
        $primaryKey = $this->normalizeKey($boardKey);
        $setting = TvDisplaySetting::firstOrCreate(['board_key' => $primaryKey]);
        $pendingPatients = $this->queueService->getPendingLabXrayPatients($primaryKey);
        return view('admin.tv.lab_xray', compact('setting', 'boardKey', 'pendingPatients'));
    }

    public function screening(string $boardKey = 'default')
    {
        $primaryKey = $this->normalizeKey($boardKey);
        $setting = TvDisplaySetting::firstOrCreate(['board_key' => $primaryKey]);
        $pendingPatients = $this->queueService->getPendingScreeningPatients($primaryKey);
        return view('admin.tv.screening', compact('setting', 'boardKey', 'pendingPatients'));
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
            // Lab & X-ray Pending Patient View settings
            'lab_xray_enabled' => 'boolean',
            'lab_xray_rotate_seconds' => 'nullable|integer|min:10|max:600',
            'lab_xray_title' => 'nullable|string|max:100',
            'lab_xray_subtitle' => 'nullable|string|max:255',
            'lab_xray_show_confirmed' => 'boolean',
            'lab_xray_show_order_time' => 'boolean',
            'font_lab_oqueue' => 'nullable|string|max:10',
            'font_lab_name' => 'nullable|string|max:10',
            // Screening Department (002) Pending Patient View settings
            'screening_enabled' => 'boolean',
            'screening_rotate_seconds' => 'nullable|integer|min:10|max:600',
            'screening_title' => 'nullable|string|max:100',
            'screening_subtitle' => 'nullable|string|max:255',
            'screening_show_appointment' => 'boolean',
            'screening_show_order_time' => 'boolean',
            'font_screening_oqueue' => 'nullable|string|max:10',
            'font_screening_name' => 'nullable|string|max:10',
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
        $data['lab_xray_enabled'] = $request->boolean('lab_xray_enabled');
        $data['lab_xray_show_confirmed'] = $request->boolean('lab_xray_show_confirmed');
        $data['lab_xray_show_order_time'] = $request->boolean('lab_xray_show_order_time');
        $data['screening_enabled'] = $request->boolean('screening_enabled');
        $data['screening_show_appointment'] = $request->boolean('screening_show_appointment');
        $data['screening_show_order_time'] = $request->boolean('screening_show_order_time');
        $data['er_show_triage'] = $request->boolean('er_show_triage');
        $data['er_show_countdown'] = $request->boolean('er_show_countdown');

        if (empty($data['lab_xray_rotate_seconds'])) {
            $data['lab_xray_rotate_seconds'] = 60;
        }
        if (empty($data['lab_xray_title'])) {
            $data['lab_xray_title'] = 'ผู้ป่วยรอผลตรวจ LAB & X-RAY';
        }

        if (empty($data['screening_rotate_seconds'])) {
            $data['screening_rotate_seconds'] = 60;
        }
        if (empty($data['screening_title'])) {
            $data['screening_title'] = 'ผู้ป่วยรอซักประวัติ / คัดกรอง';
        }
        if (empty($data['screening_subtitle'])) {
            $data['screening_subtitle'] = 'จุดคัดกรองห้องตรวจโรคภายนอก (002)';
        }

        // Normalize font fields: empty string -> 'auto'
        foreach ([
            'font_room_title', 'font_calling_no', 'font_calling_name',
            'font_waiting_no', 'font_waiting_name',
            'font_lab_oqueue', 'font_lab_name',
            'font_screening_oqueue', 'font_screening_name'
        ] as $field) {
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
