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
        $items = TvMediaPlaylist::where('board_key', $boardKey)
            ->orderBy('sort_order')
            ->get();

        $routePrefix = 'admin.' . request()->segment(2) . '.';
        return view('admin.tv.playlist', array_merge(compact('items', 'boardKey'), ['routePrefix' => $routePrefix]));
    }

    public function store(Request $request, string $boardKey = 'default')
    {
        $data = $request->validate([
            'media_type' => 'required|in:video,image,youtube',
            'title' => 'nullable|string|max:255',
            'file' => 'nullable|file|mimes:mp4,jpg,jpeg,png,webp|max:102400',
            'url' => 'nullable|url|max:255',
            'duration_seconds' => 'nullable|integer|min:3|max:3600',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        if ($data['media_type'] === 'youtube') {
            if (empty($data['url'])) {
                return back()->withErrors(['url' => 'เนเธเธฃเธ”เธฃเธฐเธเธธ YouTube URL']);
            }
            // เนเธเธฅเธ URL เนเธซเนเน€เธเนเธเธฃเธนเธเนเธเธ embed เน€เธชเธกเธญเธ–เนเธฒเธ—เธณเนเธ”เน (เน€เธเนเธเธ”เธถเธ ID เธญเธญเธเธกเธฒ)
            $filePath = $data['url'];
            $dbMediaType = 'video';
        } else {
            if (! $request->hasFile('file')) {
                return back()->withErrors(['file' => 'เนเธเธฃเธ”เธญเธฑเธเนเธซเธฅเธ”เนเธเธฅเนเธชเธทเนเธญ']);
            }
            $path = $request->file('file')->store('tv-media', 'public');
            $filePath = Storage::url($path);
            $dbMediaType = $data['media_type'];
        }

        TvMediaPlaylist::create([
            'board_key' => $boardKey,
            'media_type' => $dbMediaType,
            'title' => $data['title'] ?? null,
            'file_path' => $filePath,
            'duration_seconds' => $data['duration_seconds'] ?? 10,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => true,
        ]);

        return back()->with('status', 'เน€เธเธดเนเธกเธชเธทเนเธญเน€เธฃเธตเธขเธเธฃเนเธญเธข');
    }

    public function toggle(TvMediaPlaylist $item)
    {
        $item->update(['is_active' => ! $item->is_active]);
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

        return response()->json(['ok' => true]);
    }

    public function destroy(TvMediaPlaylist $item)
    {
        if (str_starts_with($item->file_path, '/storage/')) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $item->file_path));
        }
        $item->delete();

        return back()->with('status', 'เธฅเธเธชเธทเนเธญเน€เธฃเธตเธขเธเธฃเนเธญเธข');
    }
}

