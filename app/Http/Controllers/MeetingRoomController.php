<?php

namespace App\Http\Controllers;

use App\Models\MeetingRoom;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class MeetingRoomController extends Controller
{
    public function index()
    {
        $rooms = MeetingRoom::query()
            ->withCount('bookings')
            ->orderByRaw("CASE WHEN status = 'active' THEN 0 ELSE 1 END")
            ->orderBy('name')
            ->get()
            ->map(fn (MeetingRoom $room) => $this->transformRoom($room));

        return Inertia::render('AdminHub/rooms/Rooms', [
            'rooms' => $rooms,
            'facilityOptions' => MeetingRoom::facilityOptions(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateRoom($request);

        $imageFile = $validated['image'] ?? null;
        unset($validated['image']);

        $room = MeetingRoom::create($validated);

        if ($imageFile) {
            $path = $imageFile->store('meeting-rooms', 'public');
            $room->update(['image_path' => $path]);
        }

        return back()->with('success', 'เพิ่มห้องประชุมเรียบร้อยแล้ว');
    }

    public function update(Request $request, MeetingRoom $meetingRoom)
    {
        $validated = $this->validateRoom($request);

        $imageFile = $validated['image'] ?? null;
        unset($validated['image']);

        $meetingRoom->update($validated);

        if ($imageFile) {
            if ($meetingRoom->image_path) {
                Storage::disk('public')->delete($meetingRoom->image_path);
            }
            $path = $imageFile->store('meeting-rooms', 'public');
            $meetingRoom->update(['image_path' => $path]);
        }

        return back()->with('success', 'อัปเดตห้องประชุมเรียบร้อยแล้ว');
    }

    public function destroy(MeetingRoom $meetingRoom)
    {
        if ($meetingRoom->bookings()->exists()) {
            return back()->withErrors([
                'room' => 'ไม่สามารถลบห้องที่มีประวัติการจองได้ กรุณาปิดการใช้งานแทน',
            ]);
        }

        if ($meetingRoom->image_path) {
            Storage::disk('public')->delete($meetingRoom->image_path);
        }

        $meetingRoom->delete();

        return back()->with('success', 'ลบห้องประชุมเรียบร้อยแล้ว');
    }

    protected function validateRoom(Request $request): array
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'capacity' => 'required|integer|min:1|max:1000',
            'location' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:2000',
            'status' => 'required|in:active,inactive,maintenance',
            'color' => 'nullable|string|max:20',
            'requires_approval' => 'nullable|boolean',
            'facilities' => 'nullable|array',
            'facilities.*' => 'string|max:50',
            'image' => 'nullable|image|max:5120',
        ]);

        $validated['color'] = $validated['color'] ?? '#0ea5e9';
        $validated['requires_approval'] = (bool) ($validated['requires_approval'] ?? true);
        $validated['is_active'] = ($validated['status'] ?? 'active') === 'active';
        $validated['facilities'] = array_values($validated['facilities'] ?? []);

        return $validated;
    }

    protected function transformRoom(MeetingRoom $room): array
    {
        return [
            'id' => $room->id,
            'name' => $room->name,
            'capacity' => $room->capacity,
            'location' => $room->location,
            'description' => $room->description,
            'status' => $room->status ?: ($room->is_active ? 'active' : 'inactive'),
            'color' => $room->color ?: '#0ea5e9',
            'facilities' => $room->facilities ?? [],
            'requires_approval' => (bool) $room->requires_approval,
            'image_url' => $room->image_url,
            'bookings_count' => $room->bookings_count ?? 0,
        ];
    }
}
