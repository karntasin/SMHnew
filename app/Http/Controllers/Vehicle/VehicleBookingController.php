<?php

namespace App\Http\Controllers\Vehicle;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleBooking;
use App\Models\VehicleCategory;
use App\Notifications\VehicleBookingApprovedNotification;
use App\Notifications\VehicleDriverNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Carbon\Carbon;

class VehicleBookingController extends Controller
{
    public function index(Request $request)
    {
        $filter = $request->input('filter', 'all'); // all, pending, today, my
        
        $query = VehicleBooking::with(['user', 'vehicle', 'driver'])
            ->orderBy('start_datetime', 'desc');

        if ($filter === 'pending') {
            $query->where('status', 'pending');
        } elseif ($filter === 'today') {
            $today = Carbon::today();
            $query->whereDate('start_datetime', $today);
        } elseif ($filter === 'my') {
            $query->where('user_id', Auth::id());
        }

        $bookings = $query->paginate(10)->withQueryString();

        // Stats
        $stats = [
            'total' => VehicleBooking::count(),
            'pending' => VehicleBooking::where('status', 'pending')->count(),
            'today' => VehicleBooking::whereDate('start_datetime', Carbon::today())->count(),
            'approved' => VehicleBooking::where('status', 'approved')->count(),
        ];

        return Inertia::render('vehicles/bookings/List', [
            'bookings' => $bookings,
            'stats' => $stats,
            'filters' => $request->only(['filter']),
        ]);
    }

    public function create()
    {
        // Fetch vehicles with their category to help frontend selection
        $vehicles = Vehicle::with('category')
            ->where('status', '!=', 'maintenance')
            ->where('is_active', true)
            ->get();
            
        // We still pass categories if needed, but user wants to select vehicle directly
        $categories = VehicleCategory::where('is_active', true)->orderBy('order')->get();

        return Inertia::render('vehicles/bookings/Create', [
            'categories' => $categories,
            'vehicles' => $vehicles,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vehicle_id' => 'required|exists:vehicles,id', // Changed to required per user request
            'vehicle_category_id' => 'nullable|exists:vehicle_categories,id', // Made nullable, we can infer it
            'purpose' => 'required|string|max:255',
            'destination' => 'required|string|max:255',
            'passenger_count' => 'required|integer|min:1',
            'start_datetime' => 'required|date|after:now',
            'end_datetime' => 'required|date|after:start_datetime',
            'note' => 'nullable|string',
        ]);

        // If category is missing but vehicle is selected, try to fill it
        if (empty($validated['vehicle_category_id']) && !empty($validated['vehicle_id'])) {
            $vehicle = Vehicle::find($validated['vehicle_id']);
            if ($vehicle && $vehicle->category_id) {
                $validated['vehicle_category_id'] = $vehicle->category_id;
            }
        }

        // Check for overlaps ONLY if a specific vehicle is selected
        if (!empty($validated['vehicle_id'])) {
            $overlap = VehicleBooking::where('vehicle_id', $validated['vehicle_id'])
                ->where('status', '!=', 'cancelled')
                ->where('status', '!=', 'rejected')
                ->where(function ($query) use ($validated) {
                    $query->whereBetween('start_datetime', [$validated['start_datetime'], $validated['end_datetime']])
                        ->orWhereBetween('end_datetime', [$validated['start_datetime'], $validated['end_datetime']])
                        ->orWhere(function ($q) use ($validated) {
                            $q->where('start_datetime', '<=', $validated['start_datetime'])
                                ->where('end_datetime', '>=', $validated['end_datetime']);
                        });
                })
                ->exists();

            if ($overlap) {
                return back()->withErrors(['vehicle_id' => 'รถคันนี้ถูกจองแล้วในช่วงเวลาดังกล่าว']);
            }
        }

        $booking = new VehicleBooking($validated);
        $booking->user_id = Auth::id();
        $booking->booking_number = 'VB-' . date('Ymd') . '-' . rand(1000, 9999);
        $booking->status = 'pending';
        
        $booking->save();

        return redirect()->route('vehicles.bookings.index')->with('success', 'บันทึกคำขอใช้รถเรียบร้อยแล้ว');
    }

    public function show(VehicleBooking $booking)
    {
        $booking->load(['user', 'vehicle', 'driver', 'approver', 'category']);
        $availableVehicles = [];
        $drivers = [];
        
        // If pending, load available vehicles for assignment
        if ($booking->status === 'pending') {
            $availableVehicles = Vehicle::where('status', '!=', 'maintenance')
                ->where('is_active', true)
                ->where('category_id', $booking->vehicle_category_id)
                ->whereDoesntHave('bookings', function ($query) use ($booking) {
                    $query->where('status', '!=', 'cancelled')
                        ->where('status', '!=', 'rejected')
                        ->where('id', '!=', $booking->id)
                        ->where(function ($q) use ($booking) {
                            $q->whereBetween('start_datetime', [$booking->start_datetime, $booking->end_datetime])
                                ->orWhereBetween('end_datetime', [$booking->start_datetime, $booking->end_datetime])
                                ->orWhere(function ($sq) use ($booking) {
                                    $sq->where('start_datetime', '<=', $booking->start_datetime)
                                        ->where('end_datetime', '>=', $booking->end_datetime);
                                });
                        });
                })
                ->get();
        }

        // Load drivers for assignment (users with 'driver' role)
        $drivers = User::role('driver')
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        // Check if current user can approve (admin or hdriver)
        $canApprove = Auth::user()->hasAnyRole(['admin', 'hdriver']);

        return Inertia::render('vehicles/bookings/Show', [
            'booking' => $booking,
            'availableVehicles' => $availableVehicles,
            'drivers' => $drivers,
            'canApprove' => $canApprove,
        ]);
    }

    public function update(Request $request, VehicleBooking $booking)
    {
        // Handle action-based updates (Edit/Revoke approval)
        if ($request->has('action')) {
            $action = $request->input('action');
            $user = Auth::user();
            
            // Check permission for edit/revoke
            if (!$user->hasAnyRole(['admin', 'hdriver'])) {
                abort(403, 'คุณไม่มีสิทธิ์แก้ไขการอนุมัติ');
            }
            
            if ($action === 'edit_approval') {
                // Only edit if booking is approved
                if ($booking->status !== 'approved') {
                    return back()->withErrors(['error' => 'สามารถแก้ไขได้เฉพาะรายการที่อนุมัติแล้วเท่านั้น']);
                }
                
                $oldDriverId = $booking->driver_id;
                $newDriverId = $request->input('driver_id');
                
                // Update vehicle if changed
                if ($request->has('vehicle_id')) {
                    $booking->vehicle_id = $request->input('vehicle_id');
                }
                
                // Update driver if changed
                if ($newDriverId && $newDriverId !== 'none' && $newDriverId !== '') {
                    $driver = User::find($newDriverId);
                    if ($driver && $driver->hasRole('driver')) {
                        // Reset confirmation if driver changed
                        if ($oldDriverId != $newDriverId) {
                            $booking->driver_id = $newDriverId;
                            $booking->driver_confirmed_at = null;
                            $booking->driver_rejection_reason = null;
                            $booking->save();
                            
                            // Notify new driver
                            $driver->notify(new VehicleDriverNotification($booking, 'assigned'));
                            
                            // Notify the requester about driver change
                            $booking->user->notify(new VehicleBookingApprovedNotification($booking, 'driver_changed'));
                            
                            return back()->with('success', 'แก้ไขการอนุมัติและแจ้งเตือนคนขับใหม่เรียบร้อยแล้ว');
                        }
                    }
                } else {
                    // Remove driver assignment
                    $booking->driver_id = null;
                    $booking->driver_confirmed_at = null;
                    $booking->driver_rejection_reason = null;
                }
                
                $booking->save();
                return back()->with('success', 'แก้ไขการอนุมัติเรียบร้อยแล้ว');
            }
            
            if ($action === 'revoke_approval') {
                // Only revoke if booking is approved
                if ($booking->status !== 'approved') {
                    return back()->withErrors(['error' => 'สามารถยกเลิกการอนุมัติได้เฉพาะรายการที่อนุมัติแล้วเท่านั้น']);
                }
                
                $booking->status = 'pending';
                $booking->approved_by = null;
                $booking->approved_at = null;
                $booking->approval_reason = null;
                $booking->vehicle_id = null;
                $booking->driver_id = null;
                $booking->driver_confirmed_at = null;
                $booking->driver_rejection_reason = null;
                $booking->save();
                
                // Notify the requester about revoked approval
                $booking->user->notify(new VehicleBookingApprovedNotification($booking, 'approval_revoked'));
                
                return back()->with('success', 'ยกเลิกการอนุมัติเรียบร้อยแล้ว รายการกลับสู่สถานะรอดำเนินการ');
            }
        }
        
        // Handle status updates (Approve/Reject)
        if ($request->has('status')) {
            $status = $request->input('status');
            
            if ($status === 'approved') {
                // Check permission for approval
                $user = Auth::user();
                if (!$user->hasAnyRole(['admin', 'hdriver'])) {
                    abort(403, 'คุณไม่มีสิทธิ์อนุมัติการใช้รถ');
                }

                $booking->status = 'approved';
                $booking->approved_by = Auth::id();
                $booking->approved_at = now();
                $booking->approval_reason = $request->input('reason');
                
                // Assign vehicle if provided
                if ($request->has('vehicle_id')) {
                    $booking->vehicle_id = $request->input('vehicle_id');
                }

                // Ensure vehicle is assigned
                if (!$booking->vehicle_id) {
                    return back()->withErrors(['vehicle_id' => 'กรุณาจัดรถก่อนอนุมัติ']);
                }
                
                // Assign driver if provided (check for non-empty value, not 'none')
                $driverId = $request->input('driver_id');
                if ($driverId && $driverId !== 'none' && $driverId !== '') {
                    $driver = User::find($driverId);
                    if ($driver && $driver->hasRole('driver')) {
                        $booking->driver_id = $driverId;
                        $booking->driver_confirmed_at = null; // Reset confirmation
                        $booking->save();
                        
                        // Notify the driver about the assignment
                        $driver->notify(new VehicleDriverNotification($booking, 'assigned'));
                        
                        // Notify the requester about approval with driver info
                        $booking->user->notify(new VehicleBookingApprovedNotification($booking, 'approved'));
                        
                        return back()->with('success', 'อนุมัติการใช้รถและแจ้งเตือนคนขับเรียบร้อยแล้ว');
                    }
                }
                
                // Save without driver
                $booking->save();
                
                // Notify the requester about approval
                $booking->user->notify(new VehicleBookingApprovedNotification($booking, 'approved'));
                
                return back()->with('success', 'อนุมัติการใช้รถเรียบร้อยแล้ว');
            } elseif ($status === 'rejected') {
                $booking->status = 'rejected';
                $booking->rejected_at = now();
                $booking->rejection_reason = $request->input('reason');
                $booking->save();
                
                // Notify the requester about rejection
                $booking->user->notify(new VehicleBookingApprovedNotification($booking, 'rejected'));
                
                return back()->with('success', 'ปฏิเสธการใช้รถเรียบร้อยแล้ว');
            } elseif ($status === 'cancelled') {
                $booking->status = 'cancelled';
                $booking->cancelled_at = now();
                $booking->cancellation_reason = $request->input('reason');
            } elseif ($status === 'completed') {
                // Only assigned driver who confirmed can complete the booking
                $user = Auth::user();
                if ($booking->driver_id !== $user->id) {
                    abort(403, 'เฉพาะคนขับที่ได้รับมอบหมายเท่านั้นที่สามารถจบงานได้');
                }
                if (!$booking->driver_confirmed_at) {
                    abort(403, 'กรุณายืนยันรับงานก่อนจบงาน');
                }
                
                $booking->status = 'completed';
                $booking->completed_at = now();
                $booking->completed_by = Auth::id();
                // Update mileage if provided
                if ($request->has('end_mileage')) {
                    $booking->end_mileage = $request->input('end_mileage');
                    if ($booking->start_mileage) {
                        $booking->distance_km = $booking->end_mileage - $booking->start_mileage;
                    }
                }
                
                $booking->save();
                
                // Notify the requester that the trip is completed
                $booking->user->notify(new VehicleBookingApprovedNotification($booking, 'completed'));
                
                return back()->with('success', 'บันทึกจบงานเรียบร้อยแล้ว');
            }

            $booking->save();
            return back()->with('success', 'Booking status updated.');
        }

        // Handle normal update
        $validated = $request->validate([
            'vehicle_id' => 'required|exists:vehicles,id',
            'purpose' => 'required|string|max:255',
            'destination' => 'required|string|max:255',
            'passenger_count' => 'required|integer|min:1',
            'start_datetime' => 'required|date',
            'end_datetime' => 'required|date|after:start_datetime',
            'note' => 'nullable|string',
        ]);

        $booking->update($validated);

        return back()->with('success', 'Booking updated successfully.');
    }

    public function destroy(VehicleBooking $booking)
    {
        if ($booking->status !== 'pending') {
            return back()->with('error', 'Cannot delete a booking that is not pending.');
        }
        $booking->delete();
        return redirect()->route('vehicles.bookings.index')->with('success', 'Booking deleted.');
    }

    public function calendar(Request $request)
    {
        $start = Carbon::parse($request->input('start'));
        $end = Carbon::parse($request->input('end'));

        $bookings = VehicleBooking::with('vehicle')
            ->where('status', '!=', 'cancelled')
            ->where('status', '!=', 'rejected')
            ->whereBetween('start_datetime', [$start, $end])
            ->get()
            ->map(function ($booking) {
                return [
                    'id' => $booking->id,
                    'title' => $booking->vehicle->license_plate . ' - ' . $booking->purpose,
                    'start' => $booking->start_datetime->toIso8601String(),
                    'end' => $booking->end_datetime->toIso8601String(),
                    'backgroundColor' => $booking->status === 'pending' ? '#f59e0b' : ($booking->status === 'approved' ? '#10b981' : '#6b7280'),
                    'borderColor' => $booking->status === 'pending' ? '#f59e0b' : ($booking->status === 'approved' ? '#10b981' : '#6b7280'),
                    'extendedProps' => [
                        'vehicle' => $booking->vehicle->name,
                        'user' => $booking->user->name,
                        'status' => $booking->status,
                    ]
                ];
            });

        return response()->json($bookings);
    }

    /**
     * My vehicle booking requests (for the requester)
     */
    public function myRequests(Request $request)
    {
        $query = VehicleBooking::with(['vehicle', 'driver', 'approver', 'category'])
            ->where('user_id', Auth::id())
            ->orderBy('created_at', 'desc');

        // Apply filters
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        if ($request->filled('date_from')) {
            $query->whereDate('start_datetime', '>=', $request->date_from);
        }
        
        if ($request->filled('date_to')) {
            $query->whereDate('start_datetime', '<=', $request->date_to);
        }
        
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('booking_number', 'like', "%{$search}%")
                  ->orWhere('purpose', 'like', "%{$search}%")
                  ->orWhere('destination', 'like', "%{$search}%");
            });
        }

        $bookings = $query->paginate(10)->withQueryString();

        // Stats for this user
        $stats = [
            'total' => VehicleBooking::where('user_id', Auth::id())->count(),
            'pending' => VehicleBooking::where('user_id', Auth::id())->where('status', 'pending')->count(),
            'approved' => VehicleBooking::where('user_id', Auth::id())->where('status', 'approved')->count(),
            'completed' => VehicleBooking::where('user_id', Auth::id())->where('status', 'completed')->count(),
        ];

        return Inertia::render('vehicles/bookings/MyRequests', [
            'bookings' => $bookings,
            'stats' => $stats,
            'filters' => $request->only(['status', 'date_from', 'date_to', 'search']),
        ]);
    }

    /**
     * Assign driver to approved booking (admin/hdriver only)
     */
    public function assignDriver(Request $request, VehicleBooking $booking)
    {
        // Check permission: only admin or hdriver can assign
        $user = Auth::user();
        if (!$user->hasAnyRole(['admin', 'hdriver'])) {
            abort(403, 'คุณไม่มีสิทธิ์มอบหมายคนขับรถ');
        }

        $request->validate([
            'driver_id' => 'required|exists:users,id',
        ]);

        // Verify the user has 'driver' role
        $driver = User::findOrFail($request->driver_id);
        if (!$driver->hasRole('driver')) {
            return back()->withErrors(['driver_id' => 'ผู้ใช้นี้ไม่ใช่คนขับรถ']);
        }

        $booking->driver_id = $request->driver_id;
        $booking->driver_confirmed_at = null; // Reset confirmation
        $booking->driver_rejection_reason = null;
        $booking->save();

        // Notify the driver
        $driver->notify(new VehicleDriverNotification($booking, 'assigned'));

        return back()->with('success', 'มอบหมายคนขับรถเรียบร้อยแล้ว');
    }

    /**
     * Driver confirms or declines the job
     */
    public function confirmDriver(Request $request, VehicleBooking $booking)
    {
        $user = Auth::user();

        // Check if current user is the assigned driver
        if ($booking->driver_id !== $user->id) {
            abort(403, 'คุณไม่ใช่คนขับที่ได้รับมอบหมาย');
        }

        $action = $request->input('action'); // 'confirm' or 'decline'

        if ($action === 'confirm') {
            $booking->driver_confirmed_at = now();
            $booking->driver_rejection_reason = null;
            $booking->save();

            // Notify the approver that driver confirmed
            if ($booking->approver) {
                $booking->approver->notify(new VehicleDriverNotification($booking, 'confirmed'));
            }
            
            // Notify the requester that driver confirmed
            $booking->user->notify(new VehicleBookingApprovedNotification($booking, 'driver_confirmed'));

            return back()->with('success', 'ยืนยันรับงานเรียบร้อยแล้ว');
        } elseif ($action === 'decline') {
            $request->validate([
                'reason' => 'required|string|max:500',
            ]);

            $booking->driver_rejection_reason = $request->reason;
            $booking->driver_id = null; // Remove driver assignment
            $booking->driver_confirmed_at = null;
            $booking->save();

            // Notify the approver that driver declined
            if ($booking->approver) {
                $booking->approver->notify(new VehicleDriverNotification($booking, 'declined'));
            }
            
            // Notify the requester that driver declined
            $booking->user->notify(new VehicleBookingApprovedNotification($booking, 'driver_declined'));

            return back()->with('success', 'ปฏิเสธงานเรียบร้อยแล้ว');
        }

        return back()->withErrors(['action' => 'กรุณาเลือกการกระทำที่ถูกต้อง']);
    }

    /**
     * Get list of drivers for selection
     */
    public function getDrivers()
    {
        $drivers = User::role('driver')
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        return response()->json($drivers);
    }
}
