<?php

namespace App\Http\Controllers;

use App\Data\MedicalEquipmentCatalog;
use App\Models\Department;
use App\Models\MedicalEquipment;
use App\Models\MedicalEquipmentCategory;
use App\Services\MedicalEquipmentStockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class MedicalEquipmentController extends Controller
{
    public function __construct(private MedicalEquipmentStockService $stockService) {}

    public function index(Request $request)
    {
        $query = MedicalEquipment::with(['category', 'department'])
            ->orderBy('sort_order')
            ->orderBy('name');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('asset_code', 'like', "%{$search}%")
                    ->orWhere('brand', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return Inertia::render('equipment-borrowing/equipment/Index', [
            'equipment' => $query->paginate(48)->withQueryString(),
            'categories' => MedicalEquipmentCategory::where('is_active', true)->orderBy('sort_order')->get(),
            'departments' => Department::orderBy('name')->get(['id', 'name']),
            'filters' => $request->only(['search', 'category_id', 'status']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'nullable|exists:medical_equipment_categories,id',
            'asset_code' => 'required|string|max:50|unique:medical_equipment,asset_code',
            'name' => 'required|string|max:255',
            'brand' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'serial_number' => 'nullable|string|max:100',
            'location' => 'nullable|string|max:255',
            'department_id' => 'nullable|exists:departments,id',
            'quantity_total' => 'required|integer|min:1',
            'unit' => 'nullable|string|max:20',
            'notes' => 'nullable|string',
            'image' => 'nullable|image|max:5120',
        ]);

        $validated['location'] = $validated['location'] ?: MedicalEquipmentCatalog::STORAGE_LOCATION;

        $qty = (int) $validated['quantity_total'];
        unset($validated['quantity_total'], $validated['image']);

        $equipment = MedicalEquipment::create([
            ...$validated,
            'quantity_total' => $qty,
            'quantity_available' => $qty,
            'status' => 'available',
            'is_active' => true,
        ]);

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('medical-equipment', 'public');
            $equipment->update(['image_path' => $path]);
        }

        return back()->with('success', 'เพิ่มอุปกรณ์เรียบร้อยแล้ว');
    }

    public function update(Request $request, MedicalEquipment $equipment)
    {
        $validated = $request->validate([
            'category_id' => 'nullable|exists:medical_equipment_categories,id',
            'asset_code' => 'required|string|max:50|unique:medical_equipment,asset_code,'.$equipment->id,
            'name' => 'required|string|max:255',
            'brand' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'serial_number' => 'nullable|string|max:100',
            'location' => 'nullable|string|max:255',
            'department_id' => 'nullable|exists:departments,id',
            'quantity_total' => 'required|integer|min:1',
            'status' => 'required|in:available,borrowed,maintenance,retired',
            'is_active' => 'boolean',
            'unit' => 'nullable|string|max:20',
            'notes' => 'nullable|string',
            'image' => 'nullable|image|max:5120',
        ]);

        $newTotal = (int) $validated['quantity_total'];
        unset($validated['quantity_total'], $validated['image']);

        if ($newTotal !== (int) $equipment->quantity_total) {
            $this->stockService->manualAdjust($equipment, $newTotal, 'ปรับจำนวนจากหน้าจัดการอุปกรณ์');
            $equipment->refresh();
        }

        $equipment->update($validated);

        if ($request->hasFile('image')) {
            if ($equipment->image_path) {
                Storage::disk('public')->delete($equipment->image_path);
            }
            $path = $request->file('image')->store('medical-equipment', 'public');
            $equipment->update(['image_path' => $path]);
        }

        return back()->with('success', 'บันทึกอุปกรณ์เรียบร้อยแล้ว');
    }

    public function destroy(MedicalEquipment $equipment)
    {
        if ($equipment->activeBorrowings()->exists()) {
            return back()->with('error', 'ไม่สามารถลบได้ มีรายการยืมที่ยังไม่คืน');
        }

        if ($equipment->image_path) {
            Storage::disk('public')->delete($equipment->image_path);
        }

        $equipment->delete();

        return back()->with('success', 'ลบอุปกรณ์เรียบร้อยแล้ว');
    }

    public function history(MedicalEquipment $equipment)
    {
        $equipment->load(['category', 'department']);

        $borrowings = $equipment->borrowings()
            ->with(['borrower', 'department'])
            ->latest()
            ->paginate(15);

        $stockLogs = $equipment->stockLogs()
            ->with('user')
            ->latest()
            ->take(30)
            ->get();

        return Inertia::render('equipment-borrowing/equipment/History', [
            'equipment' => $equipment,
            'borrowings' => $borrowings,
            'stockLogs' => $stockLogs,
        ]);
    }
}
