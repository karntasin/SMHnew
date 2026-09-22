<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TvClinicRoom;
use Illuminate\Http\Request;

class TvClinicRoomController extends Controller
{
    public function index(string $boardKey = 'default')
    {
        $rooms = TvClinicRoom::where('board_key', $boardKey)
            ->orderBy('sort_order')
            ->get();

        return view('admin.tv.rooms', compact('rooms', 'boardKey'));
    }

    public function store(Request $request, string $boardKey = 'default')
    {
        $data = $request->validate([
            'hosxp_cur_dep' => 'required|string|max:10',
            'display_name' => 'required|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        TvClinicRoom::updateOrCreate(
            ['board_key' => $boardKey, 'hosxp_cur_dep' => $data['hosxp_cur_dep']],
            [
                'display_name' => $data['display_name'],
                'sort_order' => $data['sort_order'] ?? 0,
                'is_active' => true,
            ]
        );

        return back()->with('status', 'เพิ่ม/แก้ไขห้องตรวจเรียบร้อย');
    }

    public function toggle(TvClinicRoom $room)
    {
        $room->update(['is_active' => ! $room->is_active]);
        return back();
    }

    public function destroy(TvClinicRoom $room)
    {
        $room->delete();
        return back()->with('status', 'ลบห้องตรวจเรียบร้อย');
    }
}
