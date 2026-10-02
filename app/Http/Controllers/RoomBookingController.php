<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\MeetingRoom;
use App\Models\RoomBooking;
use App\Models\User;
use App\Notifications\RoomBookingNotification;
use App\Services\FshhChat\AdminHubChatNotifier;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RoomBookingController extends Controller
{
    public function index(Request $request)
    {
        $rooms = MeetingRoom::query()
            ->active()
            ->orderBy('name')
            ->get()
            ->map(fn (MeetingRoom $room) => $this->transformRoom($room));

        $upcoming = RoomBooking::with(['room', 'user'])
            ->where('status', '!=', 'rejected')
            ->where('status', '!=', 'cancelled')
            ->where('end_time', '>=', Carbon::now('Asia/Bangkok'))
            ->orderBy('start_time')
            ->limit(8)
            ->get()
            ->map(fn (RoomBooking $booking) => $this->transformBooking($booking));

        $todayBookings = RoomBooking::with(['room', 'user'])
            ->where('status', '!=', 'rejected')
            ->where('status', '!=', 'cancelled')
            ->whereDate('start_time', Carbon::today('Asia/Bangkok'))
            ->orderBy('start_time')
            ->get()
            ->map(fn (RoomBooking $booking) => $this->transformBooking($booking));

        $stats = [
            'total_bookings' => RoomBooking::count(),
            'pending_approval' => RoomBooking::where('status', 'pending')->count(),
            'today_bookings' => RoomBooking::whereDate('start_time', Carbon::today('Asia/Bangkok'))->count(),
            'active_rooms' => MeetingRoom::active()->count(),
        ];

        return Inertia::render('AdminHub/rooms/Index', [
            'rooms' => $rooms,
            'upcoming' => $upcoming,
            'todayBookings' => $todayBookings,
            'stats' => $stats,
            'facilityOptions' => MeetingRoom::facilityOptions(),
            'preselectRoomId' => $request->integer('room_id') ?: null,
            'openCreate' => $request->boolean('action') && $request->input('action') === 'create',
        ]);
    }

    public function bookings(Request $request)
    {
        $rooms = MeetingRoom::query()->orderBy('name')->get()->map(fn (MeetingRoom $room) => $this->transformRoom($room));
        $filter = $request->input('filter', 'all');

        $query = RoomBooking::with(['room', 'user'])->orderBy('start_time', 'desc');

        if ($filter === 'pending') {
            $query->where('status', 'pending');
        } elseif ($filter === 'today') {
            $query->whereDate('start_time', Carbon::today('Asia/Bangkok'));
        }

        $bookings = $query->get()->map(fn (RoomBooking $booking) => $this->transformBooking($booking));

        $stats = [
            'total_bookings' => RoomBooking::count(),
            'pending_approval' => RoomBooking::where('status', 'pending')->count(),
            'today_bookings' => RoomBooking::whereDate('start_time', Carbon::today('Asia/Bangkok'))->count(),
            'active_rooms' => MeetingRoom::active()->count(),
        ];

        return Inertia::render('AdminHub/rooms/List', [
            'rooms' => $rooms,
            'bookings' => $bookings,
            'stats' => $stats,
            'currentFilter' => $filter,
        ]);
    }

    public function calendar()
    {
        $events = RoomBooking::with(['room', 'user'])
            ->where('status', '!=', 'rejected')
            ->where('status', '!=', 'cancelled')
            ->orderBy('start_time')
            ->get()
            ->map(function (RoomBooking $booking) {
                $room = $booking->room;

                return [
                    'id' => $booking->id,
                    'title' => $booking->title,
                    'calendar_title' => ($room?->name ? $room->name.' · ' : '').$booking->title,
                    'start' => $booking->start_time?->timezone('Asia/Bangkok')->toIso8601String(),
                    'end' => $booking->end_time?->timezone('Asia/Bangkok')->toIso8601String(),
                    'status' => $booking->status,
                    'attendees_count' => $booking->attendees_count,
                    'description' => $booking->description,
                    'backgroundColor' => $room->color ?? '#0ea5e9',
                    'borderColor' => $room->color ?? '#0ea5e9',
                    'url' => route('rooms.bookings.show', $booking->id),
                    'user' => [
                        'name' => $booking->user?->name ?? 'Unknown',
                    ],
                    'room' => $room ? [
                        'id' => $room->id,
                        'name' => $room->name,
                        'location' => $room->location,
                        'capacity' => $room->capacity,
                        'color' => $room->color ?: '#0ea5e9',
                        'image_url' => $room->image_url,
                    ] : null,
                ];
            });

        return response()->json($events);
    }

    public function meetingRooms()
    {
        return response()->json(
            MeetingRoom::active()->orderBy('name')->get()->map(fn (MeetingRoom $room) => $this->transformRoom($room))
        );
    }

    public function myBookings()
    {
        $rooms = MeetingRoom::query()->orderBy('name')->get()->map(fn (MeetingRoom $room) => $this->transformRoom($room));

        $bookings = RoomBooking::with(['room', 'user'])
            ->where('user_id', auth()->id())
            ->orderBy('start_time', 'desc')
            ->get()
            ->map(fn (RoomBooking $booking) => $this->transformBooking($booking));

        $stats = [
            'total_bookings' => RoomBooking::where('user_id', auth()->id())->count(),
            'pending_approval' => RoomBooking::where('user_id', auth()->id())->where('status', 'pending')->count(),
            'today_bookings' => RoomBooking::where('user_id', auth()->id())->whereDate('start_time', Carbon::today('Asia/Bangkok'))->count(),
            'active_rooms' => MeetingRoom::active()->count(),
        ];

        return Inertia::render('AdminHub/rooms/List', [
            'rooms' => $rooms,
            'bookings' => $bookings,
            'stats' => $stats,
            'currentFilter' => 'my',
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'room_id' => 'required|exists:meeting_rooms,id',
            'start_date' => 'required|date',
            'start_time' => 'required',
            'end_time' => 'required',
            'attendees_count' => 'nullable|integer|min:1',
            'description' => 'nullable|string',
        ]);

        $start = Carbon::parse($validated['start_date'].' '.$validated['start_time'], 'Asia/Bangkok');
        $end = Carbon::parse($validated['start_date'].' '.$validated['end_time'], 'Asia/Bangkok');

        if ($end <= $start) {
            return back()->withErrors(['end_time' => 'เวลาสิ้นสุดต้องหลังเวลาเริ่ม']);
        }

        $room = MeetingRoom::findOrFail($validated['room_id']);
        if (($validated['attendees_count'] ?? 0) > $room->capacity) {
            return back()->withErrors([
                'attendees_count' => "จำนวนผู้เข้าร่วมเกินความจุห้อง ({$room->capacity} คน)",
            ]);
        }

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
            return back()->withErrors(['room_id' => 'ห้องประชุมไม่ว่างในช่วงเวลาดังกล่าว กรุณาเลือกเวลาอื่นหรือห้องอื่น']);
        }

        $needsApproval = (bool) ($room->requires_approval ?? true);

        $booking = RoomBooking::create([
            'room_id' => $validated['room_id'],
            'user_id' => auth()->id(),
            'title' => $validated['title'],
            'start_time' => $start,
            'end_time' => $end,
            'description' => $validated['description'] ?? null,
            'attendees_count' => $validated['attendees_count'] ?? null,
            'status' => $needsApproval ? 'pending' : 'approved',
        ]);

        $booking->user->notify(new RoomBookingNotification($booking, 'booking_created'));
        $this->notifyITCenterStaff($booking, 'new_booking');

        $message = $needsApproval
            ? 'จองห้องประชุมสำเร็จ รอการอนุมัติ'
            : 'จองห้องประชุมสำเร็จ (อนุมัติอัตโนมัติ)';

        return back()->with('success', $message);
    }

    public function show($id)
    {
        $booking = RoomBooking::with(['room', 'user.department'])->findOrFail($id);
        $rooms = MeetingRoom::active()->orderBy('name')->get()->map(fn (MeetingRoom $room) => $this->transformRoom($room));

        $currentUser = auth()->user();
        $canManage = $currentUser?->hasAnyRole(['admin', 'hroom']) ?? false;
        $isOwner = $currentUser && (int) $booking->user_id === (int) $currentUser->id;
        $canEdit = ($isOwner || $canManage) && ! in_array($booking->status, ['cancelled', 'rejected']);

        return Inertia::render('AdminHub/rooms/Show', [
            'rooms' => $rooms,
            'can_edit' => $canEdit,
            'booking' => [
                'id' => $booking->id,
                'user_id' => $booking->user_id,
                'room_id' => $booking->room_id,
                'title' => $booking->title,
                'description' => $booking->description,
                'start_time' => $booking->start_time?->timezone('Asia/Bangkok')->toIso8601String(),
                'end_time' => $booking->end_time?->timezone('Asia/Bangkok')->toIso8601String(),
                'booking_date' => $booking->start_time?->timezone('Asia/Bangkok')->format('Y-m-d'),
                'start_time_hi' => $booking->start_time?->timezone('Asia/Bangkok')->format('H:i'),
                'end_time_hi' => $booking->end_time?->timezone('Asia/Bangkok')->format('H:i'),
                'status' => $booking->status,
                'can_edit' => $canEdit,
                'room' => $this->transformRoom($booking->room),
                'user' => [
                    'id' => $booking->user->id,
                    'name' => $booking->user->name,
                    'email' => $booking->user->email,
                    'department' => $booking->user->department ? $booking->user->department->name : '-',
                ],
                'attendees_count' => $booking->attendees_count,
                'created_at' => $booking->created_at?->timezone('Asia/Bangkok')->toIso8601String(),
            ],
        ]);
    }

    public function update(Request $request, $id)
    {
        $booking = RoomBooking::findOrFail($id);
        $user = auth()->user();

        $isOwner = (int) $booking->user_id === (int) $user->id;
        $canManage = $user->hasAnyRole(['admin', 'hroom']);

        if (! $isOwner && ! $canManage) {
            abort(403, 'คุณไม่มีสิทธิ์แก้ไขการจองนี้');
        }

        if (in_array($booking->status, ['cancelled', 'rejected'])) {
            return back()->withErrors(['title' => 'ไม่สามารถแก้ไขรายการจองที่ถูกยกเลิกหรือไม่อนุมัติแล้วได้']);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'room_id' => 'required|exists:meeting_rooms,id',
            'start_date' => 'required|date',
            'start_time' => 'required',
            'end_time' => 'required',
            'attendees_count' => 'nullable|integer|min:1',
            'description' => 'nullable|string',
        ]);

        $start = Carbon::parse($validated['start_date'].' '.$validated['start_time'], 'Asia/Bangkok');
        $end = Carbon::parse($validated['start_date'].' '.$validated['end_time'], 'Asia/Bangkok');

        if ($end <= $start) {
            return back()->withErrors(['end_time' => 'เวลาสิ้นสุดต้องหลังเวลาเริ่ม']);
        }

        $room = MeetingRoom::findOrFail($validated['room_id']);
        if (($validated['attendees_count'] ?? 0) > $room->capacity) {
            return back()->withErrors([
                'attendees_count' => "จำนวนผู้เข้าร่วมเกินความจุห้อง ({$room->capacity} คน)",
            ]);
        }

        // Check overlap excluding this booking
        $overlap = RoomBooking::where('room_id', $validated['room_id'])
            ->where('id', '!=', $booking->id)
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
            return back()->withErrors(['room_id' => 'ห้องประชุมไม่ว่างในช่วงเวลาดังกล่าว กรุณาเลือกเวลาอื่นหรือห้องอื่น']);
        }

        $timeOrRoomChanged = (int) $booking->room_id !== (int) $validated['room_id']
            || $booking->start_time->format('Y-m-d H:i') !== $start->format('Y-m-d H:i')
            || $booking->end_time->format('Y-m-d H:i') !== $end->format('Y-m-d H:i');

        $newStatus = $booking->status;
        if ($timeOrRoomChanged && ! $canManage && (bool) ($room->requires_approval ?? true)) {
            $newStatus = 'pending';
        }

        $booking->update([
            'room_id' => $validated['room_id'],
            'title' => $validated['title'],
            'start_time' => $start,
            'end_time' => $end,
            'description' => $validated['description'] ?? null,
            'attendees_count' => $validated['attendees_count'] ?? null,
            'status' => $newStatus,
        ]);

        $this->notifyITCenterStaff($booking, 'booking_updated');

        $message = ($newStatus === 'pending' && $timeOrRoomChanged && $booking->getOriginal('status') === 'approved')
            ? 'แก้ไขข้อมูลการจองสำเร็จ (เนื่องจากมีการเปลี่ยนห้องหรือเวลา จึงต้องรอการอนุมัติใหม่อีกครั้ง)'
            : 'แก้ไขข้อมูลการจองห้องประชุมเรียบร้อยแล้ว';

        return back()->with('success', $message);
    }

    public function approve($id)
    {
        $booking = RoomBooking::findOrFail($id);
        $booking->update(['status' => 'approved']);
        $booking->user->notify(new RoomBookingNotification($booking, 'approved'));

        return back()->with('success', 'อนุมัติการจองเรียบร้อยแล้ว');
    }

    public function destroy($id)
    {
        $booking = RoomBooking::findOrFail($id);

        if ($booking->status === 'pending') {
            $booking->update(['status' => 'rejected']);
            $booking->user->notify(new RoomBookingNotification($booking, 'rejected'));
        } else {
            $booking->update(['status' => 'cancelled']);
            $booking->user->notify(new RoomBookingNotification($booking, 'cancelled'));
        }

        return back()->with('success', 'ยกเลิกการจองเรียบร้อยแล้ว');
    }

    protected function transformRoom(?MeetingRoom $room): ?array
    {
        if (! $room) {
            return null;
        }

        return [
            'id' => $room->id,
            'name' => $room->name,
            'capacity' => $room->capacity,
            'location' => $room->location,
            'description' => $room->description,
            'status' => $room->status ?: ($room->is_active ? 'active' : 'inactive'),
            'color' => $room->color ?: '#0ea5e9',
            'facilities' => $room->facilities ?? [],
            'requires_approval' => (bool) ($room->requires_approval ?? true),
            'image_url' => $room->image_url,
        ];
    }

    protected function transformBooking(RoomBooking $booking): array
    {
        $currentUser = auth()->user();
        $canManage = $currentUser?->hasAnyRole(['admin', 'hroom']) ?? false;
        $isOwner = $currentUser && (int) $booking->user_id === (int) $currentUser->id;
        $canEdit = ($isOwner || $canManage) && ! in_array($booking->status, ['cancelled', 'rejected']);

        return [
            'id' => $booking->id,
            'user_id' => $booking->user_id,
            'room_id' => $booking->room_id,
            'title' => $booking->title,
            'description' => $booking->description,
            'start_time' => $booking->start_time?->timezone('Asia/Bangkok')->toIso8601String(),
            'end_time' => $booking->end_time?->timezone('Asia/Bangkok')->toIso8601String(),
            'booking_date' => $booking->start_time?->timezone('Asia/Bangkok')->format('Y-m-d'),
            'start_time_hi' => $booking->start_time?->timezone('Asia/Bangkok')->format('H:i'),
            'end_time_hi' => $booking->end_time?->timezone('Asia/Bangkok')->format('H:i'),
            'status' => $booking->status,
            'can_edit' => $canEdit,
            'room' => $this->transformRoom($booking->room),
            'user' => [
                'id' => $booking->user?->id,
                'name' => $booking->user ? $booking->user->name : 'Unknown',
            ],
            'attendees_count' => $booking->attendees_count,
        ];
    }

    protected function notifyITCenterStaff(RoomBooking $booking, string $actionType): void
    {
        $itDepartment = Department::where('name', 'like', '%ศูนย์สารสนเทศ%')
            ->orWhere('name', 'like', '%สารสนเทศ%')
            ->orWhere('name', 'like', '%IT%')
            ->first();

        $recipients = collect();
        if ($itDepartment) {
            $recipients = $recipients->merge(User::where('department_id', $itDepartment->id)->get());
        }

        $admins = User::whereHas('roles', fn ($q) => $q->whereIn('name', ['admin', 'hroom']))->get();
        foreach ($admins as $admin) {
            if (! $itDepartment || (int) $admin->department_id !== (int) $itDepartment->id) {
                $recipients->push($admin);
            }
        }

        $bookerId = (int) $booking->user_id;
        $recipients
            ->unique('id')
            ->reject(fn (User $user) => (int) $user->id === $bookerId)
            ->each(fn (User $user) => $user->notify(new RoomBookingNotification($booking, $actionType)));

        if ($actionType === 'new_booking') {
            app(AdminHubChatNotifier::class)->roomBookingCreated($booking);
        }
    }
}
