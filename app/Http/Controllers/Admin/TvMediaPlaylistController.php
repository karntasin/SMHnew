<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TvMediaPlaylist;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TvMediaPlaylistController extends Controller
{
    public function index(string $boardKey = 'default')
    {
        $keys = \App\Models\TvClinicRoom::normalizeBoardKeys($boardKey);
        $items = TvMediaPlaylist::whereIn('board_key', $keys)
            ->orderBy('sort_order')
            ->get();

        return view('admin.tv.playlist', compact('items', 'boardKey'));
    }

    public function store(Request $request, string $boardKey = 'default')
    {
        // ตรวจสอบข้อผิดพลาดของ PHP file upload ล่วงหน้า เพื่อแจ้งเตือนภาษาไทยที่ชัดเจน
        if ($request->input('media_type') !== 'youtube') {
            if (empty($_FILES) && empty($_POST) && isset($_SERVER['CONTENT_LENGTH']) && (int) $_SERVER['CONTENT_LENGTH'] > 0) {
                return back()->withErrors(['file' => 'ขนาดไฟล์ที่อัปโหลดใหญ่เกินขีดจำกัดสูงสุดของระบบ (POST max size) กรุณาลดขนาดไฟล์']);
            }
            if (isset($_FILES['file']) && $_FILES['file']['error'] !== UPLOAD_ERR_OK && $_FILES['file']['error'] !== UPLOAD_ERR_NO_FILE) {
                $errCode = $_FILES['file']['error'];
                $errText = match ($errCode) {
                    UPLOAD_ERR_INI_SIZE => 'ขนาดไฟล์ใหญ่เกินกว่าที่เซิร์ฟเวอร์กำหนด (' . ini_get('upload_max_filesize') . ') กรุณาลดขนาดไฟล์',
                    UPLOAD_ERR_FORM_SIZE => 'ขนาดไฟล์ใหญ่เกินขีดจำกัดของแบบฟอร์ม',
                    UPLOAD_ERR_PARTIAL => 'ไฟล์ถูกอัปโหลดขึ้นมาไม่สมบูรณ์ กรุณาลองใหม่อีกครั้ง',
                    UPLOAD_ERR_NO_TMP_DIR => 'ไม่พบโฟลเดอร์ชั่วคราวบนเซิร์ฟเวอร์ (upload_tmp_dir)',
                    UPLOAD_ERR_CANT_WRITE => 'เซิร์ฟเวอร์ไม่สามารถบันทึกไฟล์ลงดิสก์ได้',
                    default => 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์ (รหัส: ' . $errCode . ')',
                };
                return back()->withErrors(['file' => $errText]);
            }
        }

        $data = $request->validate([
            'media_type' => 'required|in:video,image,youtube',
            'title' => 'nullable|string|max:255',
            'file' => 'nullable|file|mimes:mp4,jpg,jpeg,png,webp,gif|max:102400',
            'url' => 'nullable|url|max:255',
            'duration_seconds' => 'nullable|integer|min:0|max:3600',
            'sort_order' => 'nullable|integer|min:0',
        ], [
            'file.uploaded' => 'อัปโหลดไฟล์ไม่สำเร็จ: ขนาดไฟล์อาจใหญ่เกินกำหนด หรือเกิดปัญหาการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง',
            'file.mimes' => 'รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP, GIF) หรือวิดีโอ (MP4) เท่านั้น',
            'file.max' => 'ขนาดไฟล์ต้องไม่เกิน 100MB',
            'media_type.required' => 'กรุณาเลือกประเภทสื่อ',
        ]);

        if ($data['media_type'] === 'youtube') {
            if (empty($data['url'])) {
                return back()->withErrors(['url' => 'โปรดระบุ YouTube URL']);
            }
            $filePath = $data['url'];
            $dbMediaType = 'video';
            $defaultDuration = 30;
        } else {
            if (! $request->hasFile('file')) {
                return back()->withErrors(['file' => 'โปรดเลือกไฟล์สื่อที่ต้องการอัปโหลด']);
            }
            $path = $request->file('file')->store('tv-media', 'public');
            $filePath = asset('storage/' . $path);
            $dbMediaType = $data['media_type'];
            $defaultDuration = ($dbMediaType === 'video') ? 0 : 15;
        }

        $primaryKey = match (strtolower(trim($boardKey))) {
            '003', 'er', 'tv-er' => '003',
            '013', 'drug', 'tv-drug', 'pharmacy' => '013',
            default => 'default',
        };

        TvMediaPlaylist::create([
            'board_key' => $primaryKey,
            'media_type' => $dbMediaType,
            'title' => $data['title'] ?? null,
            'file_path' => $filePath,
            'duration_seconds' => array_key_exists('duration_seconds', $data) && $data['duration_seconds'] !== null
                ? (int) $data['duration_seconds']
                : $defaultDuration,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => true,
        ]);

        $this->clearMediaCache($primaryKey);

        return back()->with('status', 'เพิ่มสื่อเรียบร้อย');
    }

    public function update(Request $request, TvMediaPlaylist $item)
    {
        $data = $request->validate([
            'title' => 'nullable|string|max:255',
            'duration_seconds' => 'nullable|integer|min:0|max:3600',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $item->update([
            'title' => $data['title'] ?? $item->title,
            'duration_seconds' => array_key_exists('duration_seconds', $data) ? (int) $data['duration_seconds'] : $item->duration_seconds,
            'sort_order' => $data['sort_order'] ?? $item->sort_order,
        ]);

        $this->clearMediaCache($item->board_key);

        return back()->with('status', 'อัปเดตข้อมูลสื่อเรียบร้อย');
    }

    public function toggle(TvMediaPlaylist $item)
    {
        $item->update(['is_active' => ! $item->is_active]);
        $this->clearMediaCache($item->board_key);
        return back();
    }

    public function reorder(Request $request)
    {
        $data = $request->validate([
            'order' => 'required|array',
            'order.*' => 'integer|exists:tv_media_playlists,id',
        ]);

        foreach ($data['order'] as $index => $id) {
            TvMediaPlaylist::where('id', $id)->update(['sort_order' => $index]);
        }

        \Illuminate\Support\Facades\Cache::flush();

        return response()->json(['ok' => true]);
    }

    public function destroy(TvMediaPlaylist $item)
    {
        $boardKey = $item->board_key;
        if (str_starts_with($item->file_path, '/storage/')) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $item->file_path));
        }
        $item->delete();

        $this->clearMediaCache($boardKey);

        return back()->with('status', 'ลบสื่อเรียบร้อย');
    }

    private function clearMediaCache(string $boardKey): void
    {
        $keys = \App\Models\TvClinicRoom::normalizeBoardKeys($boardKey);
        foreach ($keys as $k) {
            \Illuminate\Support\Facades\Cache::forget("tv-board:{$k}:media");
        }
    }
}
