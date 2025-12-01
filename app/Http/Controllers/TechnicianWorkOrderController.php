<?php

namespace App\Http\Controllers;

use App\Models\MaintenanceRequest;
use App\Models\MaintenanceRequestTimeline;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class TechnicianWorkOrderController extends Controller
{
    /**
     * แสดงรายการใบงานสำหรับช่าง
     */
    public function index(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        
        // ตรวจสอบว่า user มีตำแหน่งช่างหรือไม่
        $technicianPositions = ['ช่างส่งกำลัง', 'ช่างIT', 'ช่างไฟฟ้า', 'ช่างประปา', 'ช่างทั่วไป'];
        $userPositions = $user->positions->pluck('name')->toArray();
        
        $isTechnician = !empty(array_intersect($technicianPositions, $userPositions));
        $isHeadTech = $user->hasRole('headtec') || $user->hasRole('admin');
        
        if (!$isTechnician && !$isHeadTech) {
            abort(403, 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
        }

        $query = MaintenanceRequest::with(['category', 'priority', 'requester', 'images', 'technician'])
            ->latest();

        // Filter by status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filter pending requests (for new work orders)
        if ($request->get('filter') === 'pending') {
            $query->where('status', 'pending');
        }

        // Filter my work (assigned to me)
        if ($request->get('filter') === 'my_work') {
            $query->where('assigned_to', $user->id);
        }

        $workOrders = $query->paginate(10);

        // นับจำนวนใบงานตามสถานะ
        $stats = [
            'pending' => MaintenanceRequest::where('status', 'pending')->count(),
            'in_progress' => MaintenanceRequest::where('status', 'in_progress')->count(),
            'completed' => MaintenanceRequest::where('status', 'completed')->count(),
            'my_work' => MaintenanceRequest::where('assigned_to', $user->id)
                ->whereIn('status', ['pending', 'in_progress', 'assigned'])
                ->count(),
        ];

        // Get list of technicians for assignment (only for Head Tech)
        $technicians = [];
        if ($isHeadTech) {
            $technicians = \App\Models\User::whereHas('positions', function($q) use ($technicianPositions) {
                $q->whereIn('name', $technicianPositions);
            })->orWhereHas('roles', function($q) {
                $q->where('name', 'technician');
            })->get(['id', 'name']);
        }

        return Inertia::render('maintenance/WorkOrders', [
            'workOrders' => $workOrders,
            'stats' => $stats,
            'filters' => $request->only(['status', 'filter']),
            'userPositions' => $userPositions,
            'isHeadTech' => $isHeadTech,
            'technicians' => $technicians,
        ]);
    }

    /**
     * มอบหมายงาน (Assign work order) - For Head Tech
     */
    public function assign(Request $request, MaintenanceRequest $workOrder)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        
        if (!$user->hasRole('headtec') && !$user->hasRole('admin')) {
            abort(403, 'คุณไม่มีสิทธิ์มอบหมายงาน');
        }

        $validated = $request->validate([
            'technician_id' => 'required|exists:users,id',
        ]);

        $oldValues = $workOrder->toArray();

        $workOrder->update([
            'assigned_to' => $validated['technician_id'],
            'status' => 'assigned',
            'assigned_at' => now(),
        ]);

        MaintenanceRequestTimeline::create([
            'maintenance_request_id' => $workOrder->id,
            'user_id' => $user->id,
            'action' => 'assigned',
            'description' => 'หัวหน้าช่างมอบหมายงาน',
            'old_values' => $oldValues,
            'new_values' => $workOrder->toArray(),
        ]);

        return back()->with('success', 'มอบหมายงานเรียบร้อยแล้ว');
    }

    /**
     * แสดงรายละเอียดใบงาน
     */
    public function show(MaintenanceRequest $workOrder)
    {
        $workOrder->load(['category', 'priority', 'requester', 'technician', 'images', 'timeline.user']);

        return Inertia::render('maintenance/WorkOrderDetail', [
            'workOrder' => $workOrder,
        ]);
    }

    /**
     * รับงาน (Accept work order)
     */
    public function accept(MaintenanceRequest $workOrder)
    {
        $user = Auth::user();

        // Allow accepting if status is 'assigned' (assigned to this tech)
        if ($workOrder->status !== 'assigned') {
            return back()->with('error', 'ใบงานนี้ยังไม่ได้มอบหมาย หรือถูกรับไปแล้ว');
        }

        // If assigned, ensure it's assigned to this user
        if ($workOrder->status === 'assigned' && $workOrder->assigned_to !== $user->id) {
             return back()->with('error', 'ใบงานนี้ไม่ได้มอบหมายให้คุณ');
        }

        $oldValues = $workOrder->toArray();

        $workOrder->update([
            // assigned_to is already set
            'status' => 'in_progress',
            'started_at' => now(),
        ]);

        MaintenanceRequestTimeline::create([
            'maintenance_request_id' => $workOrder->id,
            'user_id' => $user->id,
            'action' => 'accepted',
            'description' => 'ช่างรับงานแล้ว',
            'old_values' => $oldValues,
            'new_values' => $workOrder->toArray(),
        ]);

        return back()->with('success', 'รับงานเรียบร้อยแล้ว');
    }

    /**
     * อัปเดตสถานะใบงาน
     */
    public function updateStatus(Request $request, MaintenanceRequest $workOrder)
    {
        $validated = $request->validate([
            'status' => 'required|in:in_progress,maintenance_completed,cancelled',
            'technician_notes' => 'nullable|string',
            'resolution' => 'nullable|string',
            'cost' => 'nullable|numeric|min:0',
        ]);

        $user = Auth::user();
        $oldValues = $workOrder->toArray();

        $updateData = [
            'status' => $validated['status'],
            'technician_notes' => $validated['technician_notes'] ?? $workOrder->technician_notes,
        ];

        if ($validated['status'] === 'maintenance_completed') {
            $updateData['completed_at'] = now(); // Tech completed time
            $updateData['resolution'] = $validated['resolution'] ?? null;
            $updateData['cost'] = $validated['cost'] ?? null;
        }

        if ($validated['status'] === 'cancelled') {
            $updateData['cancelled_at'] = now();
        }

        $workOrder->update($updateData);

        $actionMap = [
            'in_progress' => 'started',
            'maintenance_completed' => 'maintenance_completed',
            'cancelled' => 'cancelled',
        ];

        $descriptionMap = [
            'in_progress' => 'เริ่มดำเนินการ',
            'maintenance_completed' => 'ดำเนินการซ่อมเสร็จสิ้น (รอผู้แจ้งตรวจสอบ)',
            'cancelled' => 'ยกเลิกใบงาน',
        ];

        MaintenanceRequestTimeline::create([
            'maintenance_request_id' => $workOrder->id,
            'user_id' => $user->id,
            'action' => $actionMap[$validated['status']] ?? 'updated',
            'description' => $descriptionMap[$validated['status']] ?? 'อัปเดตข้อมูล',
            'old_values' => $oldValues,
            'new_values' => $workOrder->toArray(),
        ]);

        return back()->with('success', 'อัปเดตสถานะเรียบร้อยแล้ว');
    }
}
