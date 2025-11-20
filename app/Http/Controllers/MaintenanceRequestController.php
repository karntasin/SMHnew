<?php

namespace App\Http\Controllers;

use App\Models\MaintenanceRequest;
use App\Models\MaintenanceCategory;
use App\Models\MaintenancePriority;
use App\Models\MaintenanceRequestImage;
use App\Models\MaintenanceRequestTimeline;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class MaintenanceRequestController extends Controller
{
    public function index(Request $request)
    {
        $query = MaintenanceRequest::with(['category', 'priority', 'requester', 'technician'])
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

        $maintenanceRequest = MaintenanceRequest::create([
            'ticket_number' => $ticketNumber,
            'requester_id' => Auth::id(),
            'title' => $validated['title'],
            'description' => $validated['description'],
            'location' => $validated['location'],
            'category_id' => $validated['category_id'],
            'priority_id' => $validated['priority_id'],
            'status' => 'pending',
        ]);

        // Handle Images
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $path = $image->store('maintenance-images', 'public');
                MaintenanceRequestImage::create([
                    'maintenance_request_id' => $maintenanceRequest->id,
                    'image_path' => $path,
                    // 'uploaded_by' => Auth::id(), // Column does not exist
                ]);
            }
        }

        // Create Timeline Entry
        MaintenanceRequestTimeline::create([
            'maintenance_request_id' => $maintenanceRequest->id,
            'user_id' => Auth::id(),
            'action' => 'created',
            'description' => 'สร้างใบแจ้งซ่อม',
            'new_values' => $maintenanceRequest->toArray(),
        ]);

        return redirect()->route('maintenance.requests.index')
            ->with('success', 'สร้างใบแจ้งซ่อมเรียบร้อยแล้ว');
    }

    public function show(MaintenanceRequest $maintenanceRequest)
    {
        $maintenanceRequest->load(['category', 'priority', 'requester', 'technician', 'images', 'timeline.user']);

        return Inertia::render('maintenance/requests/Show', [
            'maintenanceRequest' => $maintenanceRequest,
        ]);
    }

    public function update(Request $request, MaintenanceRequest $maintenanceRequest)
    {
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

    public function destroy(MaintenanceRequest $maintenanceRequest)
    {
        $maintenanceRequest->delete();
        return redirect()->route('maintenance.requests.index')->with('success', 'ลบใบแจ้งซ่อมเรียบร้อยแล้ว');
    }
}
