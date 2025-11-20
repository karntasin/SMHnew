<?php

namespace App\Http\Controllers\Vehicle;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Models\VehicleBooking;
use App\Models\VehicleCategory;
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

        return Inertia::render('vehicles/bookings/Show', [
            'booking' => $booking,
            'availableVehicles' => $availableVehicles,
        ]);
    }

    public function update(Request $request, VehicleBooking $booking)
    {
        // Handle status updates (Approve/Reject)
        if ($request->has('status')) {
            $status = $request->input('status');
            
            if ($status === 'approved') {
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
                
                // Assign driver if provided
                if ($request->has('driver_id')) {
                    $booking->driver_id = $request->input('driver_id');
                }
            } elseif ($status === 'rejected') {
                $booking->status = 'rejected';
                $booking->rejected_at = now();
                $booking->rejection_reason = $request->input('reason');
            } elseif ($status === 'cancelled') {
                $booking->status = 'cancelled';
                $booking->cancelled_at = now();
                $booking->cancellation_reason = $request->input('reason');
            } elseif ($status === 'completed') {
                $booking->status = 'completed';
                $booking->completed_at = now();
                // Update mileage if provided
                if ($request->has('end_mileage')) {
                    $booking->end_mileage = $request->input('end_mileage');
                    $booking->distance_km = $booking->end_mileage - $booking->start_mileage;
                }
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
}
