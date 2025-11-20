<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\MeetingRoom;
use App\Models\RoomBooking;
use Carbon\Carbon;

class RoomBookingController extends Controller
{
    public function index(Request $request)
    {
        $rooms = MeetingRoom::all();
        $filter = $request->input('filter', 'all');
        
        $query = RoomBooking::with(['room', 'user'])
            ->orderBy('start_time', 'desc');

        if ($filter === 'pending') {
            $query->where('status', 'pending');
        } elseif ($filter === 'today') {
            $query->whereDate('start_time', Carbon::today());
        }

        $bookings = $query->get()
            ->map(function ($booking) {
                return [
                    'id' => $booking->id,
                    'title' => $booking->title,
                    'start_time' => $booking->start_time->toIso8601String(),
                    'end_time' => $booking->end_time->toIso8601String(),
                    'status' => $booking->status,
                    'room' => $booking->room,
                    'user' => [
                        'name' => $booking->user ? $booking->user->name : 'Unknown',
                    ],
                    'attendees_count' => $booking->attendees_count
                ];
            });

        $stats = [
            'total_bookings' => RoomBooking::count(),
            'pending_approval' => RoomBooking::where('status', 'pending')->count(),
            'today_bookings' => RoomBooking::whereDate('start_time', Carbon::today())->count(),
            'active_rooms' => MeetingRoom::where('status', 'active')->count()
        ];

        return Inertia::render('admin/rooms/List', [
            'rooms' => $rooms,
            'bookings' => $bookings,
            'stats' => $stats,
            'currentFilter' => $filter
        ]);
    }

    public function calendar()
    {
        $events = RoomBooking::with('room')
            ->where('status', '!=', 'rejected')
            ->where('status', '!=', 'cancelled')
            ->get()
            ->map(function ($booking) {
                return [
                    'id' => $booking->id,
                    'title' => $booking->title,
                    'start' => $booking->start_time->toIso8601String(),
                    'end' => $booking->end_time->toIso8601String(),
                    'backgroundColor' => $booking->room->color ?? '#3b82f6',
                    'borderColor' => $booking->room->color ?? '#3b82f6',
                ];
            });
            
        return response()->json($events);
    }

    public function meetingRooms()
    {
        return response()->json(MeetingRoom::where('status', 'active')->get());
    }

    public function myBookings()
    {
        return Inertia::render('admin/rooms/List');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'room_id' => 'required|exists:meeting_rooms,id',
            'start_date' => 'required|date',
            'start_time' => 'required',
            'end_time' => 'required',
            'attendees_count' => 'nullable|integer',
            'description' => 'nullable|string'
        ]);

        $start = Carbon::parse($validated['start_date'] . ' ' . $validated['start_time']);
        $end = Carbon::parse($validated['start_date'] . ' ' . $validated['end_time']);

        if ($end <= $start) {
            return back()->withErrors(['end_time' => 'เวลาสิ้นสุดต้องหลังเวลาเริ่ม']);
        }

        // Check for overlap
        $overlap = RoomBooking::where('room_id', $validated['room_id'])
            ->where('status', '!=', 'cancelled')
            ->where('status', '!=', 'rejected')
            ->where(function ($query) use ($start, $end) {
                $query->where(function ($q) use ($start, $end) {
                    $q->where('start_time', '>=', $start)
                      ->where('start_time', '<', $end);
                })->orWhere(function ($q) use ($start, $end) {
                    $q->where('end_time', '>', $start)
                      ->where('end_time', '<=', $end);
                })->orWhere(function ($q) use ($start, $end) {
                    $q->where('start_time', '<', $start)
                      ->where('end_time', '>', $end);
                });
            })
            ->exists();

        if ($overlap) {
            return back()->withErrors(['room_id' => 'ห้องประชุมไม่ว่างในช่วงเวลาดังกล่าว']);
        }

        RoomBooking::create([
            'room_id' => $validated['room_id'],
            'user_id' => auth()->id(),
            'title' => $validated['title'],
            'start_time' => $start,
            'end_time' => $end,
            'description' => $validated['description'],
            'attendees_count' => $validated['attendees_count'],
            'status' => 'pending'
        ]);

        return back()->with('success', 'จองห้องประชุมสำเร็จ รอการอนุมัติ');
    }

    public function show($id)
    {
        $booking = RoomBooking::with(['room', 'user.department'])->findOrFail($id);
        
        return Inertia::render('admin/rooms/Show', [
            'booking' => [
                'id' => $booking->id,
                'title' => $booking->title,
                'description' => $booking->description,
                'start_time' => $booking->start_time->toIso8601String(),
                'end_time' => $booking->end_time->toIso8601String(),
                'status' => $booking->status,
                'room' => $booking->room,
                'user' => [
                    'id' => $booking->user->id,
                    'name' => $booking->user->name,
                    'email' => $booking->user->email,
                    'department' => $booking->user->department ? $booking->user->department->name : '-'
                ],
                'attendees_count' => $booking->attendees_count,
                'created_at' => $booking->created_at->toIso8601String()
            ]
        ]);
    }

    public function update(Request $request, $id)
    {
        // TODO: Implement booking update
        return back();
    }

    public function approve($id)
    {
        $booking = RoomBooking::findOrFail($id);
        $booking->update(['status' => 'approved']);
        return back()->with('success', 'อนุมัติการจองเรียบร้อยแล้ว');
    }

    public function destroy($id)
    {
        $booking = RoomBooking::findOrFail($id);
        
        if ($booking->status === 'pending') {
             $booking->update(['status' => 'rejected']);
        } else {
             $booking->update(['status' => 'cancelled']);
        }
        
        return to_route('rooms.index')->with('success', 'ยกเลิกการจองเรียบร้อยแล้ว');
    }
}
