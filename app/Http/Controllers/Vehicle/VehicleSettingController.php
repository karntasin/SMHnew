<?php

namespace App\Http\Controllers\Vehicle;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Models\VehicleCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class VehicleSettingController extends Controller
{
    public function index()
    {
        $vehicles = Vehicle::with('category')
            ->withCount('bookings')
            ->orderByRaw("CASE WHEN status = 'available' THEN 0 WHEN status = 'busy' THEN 1 ELSE 2 END")
            ->orderBy('license_plate')
            ->get()
            ->map(fn (Vehicle $vehicle) => [
                'id' => $vehicle->id,
                'license_plate' => $vehicle->license_plate,
                'brand' => $vehicle->brand,
                'model' => $vehicle->model,
                'color' => $vehicle->color,
                'seats' => $vehicle->seats,
                'status' => $vehicle->status,
                'is_active' => (bool) $vehicle->is_active,
                'category_id' => $vehicle->category_id,
                'category' => $vehicle->category ? [
                    'id' => $vehicle->category->id,
                    'name' => $vehicle->category->name,
                    'color' => $vehicle->category->color,
                ] : null,
                'image_url' => $vehicle->image_url,
                'bookings_count' => $vehicle->bookings_count ?? 0,
            ]);

        $categories = VehicleCategory::withCount('vehicles')
            ->orderBy('order')
            ->get();

        return Inertia::render('vehicles/settings/Index', [
            'vehicles' => $vehicles,
            'categories' => $categories,
        ]);
    }

    public function storeVehicle(Request $request)
    {
        $validated = $this->validateVehicle($request);
        $image = $validated['image'] ?? null;
        unset($validated['image']);

        if (isset($validated['capacity'])) {
            $validated['seats'] = $validated['capacity'];
            unset($validated['capacity']);
        }

        $validated['is_active'] = true;

        $vehicle = Vehicle::create($validated);

        if ($image) {
            $path = $image->store('vehicles', 'public');
            $vehicle->update(['image' => $path]);
        }

        return back()->with('success', 'เพิ่มรถเรียบร้อยแล้ว');
    }

    public function updateVehicle(Request $request, Vehicle $vehicle)
    {
        $validated = $this->validateVehicle($request, $vehicle->id);
        $image = $validated['image'] ?? null;
        unset($validated['image']);

        if (isset($validated['capacity'])) {
            $validated['seats'] = $validated['capacity'];
            unset($validated['capacity']);
        }

        $vehicle->update($validated);

        if ($image) {
            if ($vehicle->image) {
                Storage::disk('public')->delete($vehicle->image);
            }
            $path = $image->store('vehicles', 'public');
            $vehicle->update(['image' => $path]);
        }

        return back()->with('success', 'แก้ไขข้อมูลรถเรียบร้อยแล้ว');
    }

    public function destroyVehicle(Vehicle $vehicle)
    {
        if ($vehicle->bookings()->exists()) {
            return back()->withErrors([
                'vehicle' => 'ไม่สามารถลบรถที่มีประวัติการจองได้ กรุณาเปลี่ยนสถานะเป็นซ่อมบำรุงแทน',
            ]);
        }

        if ($vehicle->image) {
            Storage::disk('public')->delete($vehicle->image);
        }

        $vehicle->delete();

        return back()->with('success', 'ลบรถเรียบร้อยแล้ว');
    }

    public function storeCategory(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'icon' => 'nullable|string',
            'color' => 'nullable|string',
            'description' => 'nullable|string',
        ]);

        $maxOrder = VehicleCategory::max('order') ?? 0;
        $validated['order'] = $maxOrder + 1;
        $validated['is_active'] = true;
        $validated['color'] = $validated['color'] ?? '#10b981';

        VehicleCategory::create($validated);

        return back()->with('success', 'เพิ่มประเภทรถเรียบร้อยแล้ว');
    }

    public function updateCategory(Request $request, VehicleCategory $category)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'icon' => 'nullable|string',
            'color' => 'nullable|string',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $category->update($validated);

        return back()->with('success', 'บันทึกข้อมูลเรียบร้อยแล้ว');
    }

    public function destroyCategory(VehicleCategory $category)
    {
        if ($category->vehicles()->count() > 0) {
            return back()->with('error', 'ไม่สามารถลบประเภทนี้ได้เนื่องจากมีรถในระบบที่ใช้งานอยู่');
        }

        $category->delete();

        return back()->with('success', 'ลบประเภทรถเรียบร้อยแล้ว');
    }

    protected function validateVehicle(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'license_plate' => 'required|string|max:50|unique:vehicles,license_plate,'.($ignoreId ?: 'NULL').',id',
            'brand' => 'required|string|max:100',
            'model' => 'required|string|max:100',
            'category_id' => 'required|exists:vehicle_categories,id',
            'capacity' => 'required|integer|min:1|max:100',
            'color' => 'nullable|string|max:50',
            'status' => 'required|in:available,maintenance,busy',
            'image' => 'nullable|image|max:5120',
        ]);
    }
}
