<?php

namespace App\Http\Controllers;

use App\Models\MaintenanceRequest;
use App\Models\MaintenanceCategory;
use App\Models\MaintenancePriority;
use App\Models\MaintenanceRequestImage;
use App\Models\MaintenanceRequestTimeline;
use App\Services\MaintenanceNotificationService;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class MaintenanceRequestController extends Controller
{
    protected $notificationService;

    public function __construct(MaintenanceNotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    public function index(Request $request)
    {
        \Illuminate\Support\Facades\Log::info('MaintenanceRequestController::index called', ['user' => Auth::id()]);

        $query = MaintenanceRequest::with(['category', 'priority', 'requester', 'technician', 'images'])
            ->latest();

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $requests = $query->paginate(10);

        return Inertia::render('maintenance/requests/Index', [
            'requests' => $requests,
            'filters' => $request->only(['status']),
        ]);
    }

    public function myRequests(Request $request)
    {
        $user = Auth::user();
        $query = MaintenanceRequest::with(['category', 'priority', 'technician', 'requester'])
            ->where(function($q) use ($user) {
                $q->where('user_id', $user->id);
                // If user has a department, include requests from that department
                if ($user->department_id) {
                    $q->orWhereHas('requester', function($sq) use ($user) {
                        $sq->where('department_id', $user->department_id);
                    });
                }
            })
            ->latest();

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $requests = $query->paginate(10);

        return Inertia::render('maintenance/requests/MyRequests', [
            'requests' => $requests,
            'filters' => $request->only(['status']),
        ]);
    }

    public function create()
    {
        return Inertia::render('maintenance/requests/Create', [
            'categories' => MaintenanceCategory::where('is_active', true)->get(),
            'priorities' => MaintenancePriority::where('is_active', true)->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'location' => 'required|string|max:255',
            'category_id' => 'nullable|exists:maintenance_categories,id',
            'priority_id' => 'nullable|exists:maintenance_priorities,id',
            'images.*' => 'nullable|image|max:10240', // 10MB max
        ]);

        // Generate Ticket Number
        $date = now()->format('Ymd');
        $lastTicket = MaintenanceRequest::where('ticket_number', 'like', "MR-$date-%")->latest()->first();
        $sequence = $lastTicket ? intval(substr($lastTicket->ticket_number, -4)) + 1 : 1;
        $ticketNumber = "MR-$date-" . str_pad($sequence, 4, '0', STR_PAD_LEFT);

        $maintenanceRequest = DB::transaction(function () use ($validated, $request, $ticketNumber) {
            $maintenanceRequest = MaintenanceRequest::create([
                'ticket_number' => $ticketNumber,
                'user_id' => Auth::id(),
                'title' => $validated['title'],
                'description' => $validated['description'],
                'location' => $validated['location'],
                'category_id' => $validated['category_id'],
                'priority_id' => $validated['priority_id'],
                'status' => 'pending',
            ]);

            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $image) {
                    $path = $image->store('maintenance-images', 'public');
                    MaintenanceRequestImage::create([
                        'maintenance_request_id' => $maintenanceRequest->id,
                        'image_path' => $path,
                    ]);
                }
            }

            MaintenanceRequestTimeline::create([
                'maintenance_request_id' => $maintenanceRequest->id,
                'user_id' => Auth::id(),
                'action' => 'created',
                'description' => 'สร้างใบแจ้งซ่อม',
                'new_values' => $maintenanceRequest->toArray(),
            ]);

            return $maintenanceRequest;
        });

        $this->notificationService->notifyTechnicians($maintenanceRequest, 'created');

        return redirect()->route('maintenance.requests.index')
            ->with('success', 'สร้างใบแจ้งซ่อมเรียบร้อยแล้ว');
    }

    public function show(MaintenanceRequest $maintenanceRequest)
    {
        $maintenanceRequest->load(['category', 'priority', 'requester', 'technician', 'images', 'timeline.user']);

        $technicians = [];
        $user = Auth::user();
        
        // If user is admin or headtec, load technicians list for assignment
        if ($user->hasRole(['admin', 'headtec'])) {
            $technicianPositions = ['ช่างส่งกำลัง', 'ช่างIT', 'ช่างไฟฟ้า', 'ช่างประปา', 'ช่างทั่วไป'];
            $technicians = User::whereHas('positions', function($q) use ($technicianPositions) {
                $q->whereIn('name', $technicianPositions);
            })->get(['id', 'name']);
        }

        // Determine if user can manage (edit/update) the request
        $canManage = false;
        if ($user->hasRole(['admin', 'headtec'])) {
            $canManage = true;
        } elseif ($user->hasRole('technician')) {
            // Technician can only manage if assigned to them
            $canManage = $maintenanceRequest->technician_id === $user->id;
        }

        return Inertia::render('maintenance/requests/Show', [
            'maintenanceRequest' => $maintenanceRequest,
            'technicians' => $technicians,
            'canAssign' => $user->hasRole(['admin', 'headtec']),
            'canClose' => $user->id === $maintenanceRequest->user_id,
            'canManage' => $canManage,
        ]);
    }

    public function update(Request $request, MaintenanceRequest $maintenanceRequest)
    {
        $user = Auth::user();

        // Restriction for technicians
        if ($user->hasRole('technician') && !$user->hasRole(['admin', 'headtec'])) {
             if ($maintenanceRequest->technician_id !== $user->id) {
                return back()->with('error', 'คุณไม่มีสิทธิ์จัดการใบงานนี้ (ต้องได้รับมอบหมายก่อน)');
             }
        }

        // Implement update logic (e.g., status change, assigning technician)
        // For now, basic update
        $validated = $request->validate([
            'status' => 'sometimes|string',
            'technician_notes' => 'nullable|string',
        ]);

        $oldValues = $maintenanceRequest->toArray();
        $maintenanceRequest->update($validated);
        $newValues = $maintenanceRequest->toArray();

        MaintenanceRequestTimeline::create([
            'maintenance_request_id' => $maintenanceRequest->id,
            'user_id' => Auth::id(),
            'action' => 'updated',
            'description' => 'อัปเดตข้อมูลใบแจ้งซ่อม',
            'old_values' => $oldValues,
            'new_values' => $newValues,
        ]);

        return back()->with('success', 'อัปเดตข้อมูลเรียบร้อยแล้ว');
    }

    public function assign(Request $request, MaintenanceRequest $maintenanceRequest)
    {
        $user = Auth::user();
        if (!$user->hasRole(['admin', 'headtec'])) {
            abort(403, 'Unauthorized');
        }

        $validated = $request->validate([
            'technician_id' => 'required|exists:users,id',
        ]);

        $oldValues = $maintenanceRequest->toArray();

        $maintenanceRequest->update([
            'technician_id' => $validated['technician_id'],
            'status' => 'assigned',
            'assigned_at' => now(),
        ]);

        $technician = User::find($validated['technician_id']);

        MaintenanceRequestTimeline::create([
            'maintenance_request_id' => $maintenanceRequest->id,
            'user_id' => $user->id,
            'action' => 'assigned',
            'description' => "มอบหมายงานให้ {$technician->name}",
            'old_values' => $oldValues,
            'new_values' => $maintenanceRequest->toArray(),
        ]);

        return back()->with('success', 'มอบหมายงานเรียบร้อยแล้ว');
    }

    public function close(Request $request, MaintenanceRequest $maintenanceRequest)
    {
        $user = Auth::user();
        if ($user->id !== $maintenanceRequest->user_id && ! $user->hasRole('admin')) {
            abort(403, 'Unauthorized');
        }

        if ($maintenanceRequest->status !== 'maintenance_completed') {
            return back()->with('error', 'ไม่สามารถปิดงานได้ในสถานะนี้');
        }

        $oldValues = $maintenanceRequest->toArray();

        $maintenanceRequest->update([
            'status' => 'completed',
        ]);

        MaintenanceRequestTimeline::create([
            'maintenance_request_id' => $maintenanceRequest->id,
            'user_id' => $user->id,
            'action' => 'closed',
            'description' => 'ปิดงานแจ้งซ่อม',
            'old_values' => $oldValues,
            'new_values' => $maintenanceRequest->toArray(),
        ]);

        return back()->with('success', 'ปิดงานเรียบร้อยแล้ว ขอบคุณสำหรับการประเมิน');
    }

    public function destroy(MaintenanceRequest $maintenanceRequest)
    {
        $maintenanceRequest->delete();
        return redirect()->route('maintenance.requests.index')->with('success', 'ลบใบแจ้งซ่อมเรียบร้อยแล้ว');
    }

    public function edit(MaintenanceRequest $maintenanceRequest)
    {
        // Check permission: only requester or admin can edit
        if (Auth::id() !== $maintenanceRequest->user_id && ! Auth::user()->hasRole('admin')) {
            abort(403);
        }

        return Inertia::render('maintenance/requests/Edit', [
            'maintenanceRequest' => $maintenanceRequest,
            'categories' => MaintenanceCategory::where('is_active', true)->get(),
            'priorities' => MaintenancePriority::where('is_active', true)->get(),
        ]);
    }

    public function cancel(MaintenanceRequest $maintenanceRequest)
    {
        if (Auth::id() !== $maintenanceRequest->user_id && ! Auth::user()->hasRole('admin')) {
            abort(403);
        }

        if ($maintenanceRequest->status !== 'pending') {
            return back()->with('error', 'สามารถยกเลิกได้เฉพาะรายการที่รอดำเนินการเท่านั้น');
        }

        $maintenanceRequest->update(['status' => 'cancelled']);

        MaintenanceRequestTimeline::create([
            'maintenance_request_id' => $maintenanceRequest->id,
            'user_id' => Auth::id(),
            'action' => 'cancelled',
            'description' => 'ยกเลิกใบแจ้งซ่อม',
            'new_values' => $maintenanceRequest->toArray(),
        ]);

        return back()->with('success', 'ยกเลิกรายการเรียบร้อยแล้ว');
    }
}
