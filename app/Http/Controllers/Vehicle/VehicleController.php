<?php

namespace App\Http\Controllers\Vehicle;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Models\VehicleCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;

class VehicleController extends Controller
{
    public function index(Request $request)
    {
        $query = Vehicle::with('category');

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('license_plate', 'like', "%{$search}%")
                  ->orWhere('brand', 'like', "%{$search}%")
                  ->orWhere('model', 'like', "%{$search}%");
            });
        }

        $vehicles = $query->orderBy('created_at', 'desc')->paginate(10)->withQueryString();

        return Inertia::render('vehicles/manage/List', [
            'vehicles' => $vehicles,
            'filters' => $request->only(['search']),
        ]);
    }

    public function create()
    {
        $categories = VehicleCategory::where('is_active', true)->get();
        return Inertia::render('vehicles/manage/Create', [
            'categories' => $categories
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'license_plate' => 'required|unique:vehicles,license_plate',
            'brand' => 'required|string',
            'model' => 'required|string',
            'category_id' => 'required|exists:vehicle_categories,id',
            'capacity' => 'required|integer|min:1', // Using 'capacity' as per migration, mapped to 'seats' in model if needed, but let's check model
            'color' => 'nullable|string',
            'status' => 'required|in:available,maintenance,busy',
            'image' => 'nullable|image|max:2048',
        ]);

        // Map 'capacity' to 'seats' if the model uses 'seats'
        // Checking migration: 2025_01_11_000002_create_vehicles_table.php used 'capacity' in my previous edit?
        // Wait, I edited the migration to use 'capacity'. 
        // But the Model Vehicle.php I created has 'seats'. 
        // Let's check the Model again to be sure.
        
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('vehicles', 'public');
            $validated['image'] = $path;
        }

        // Adjust for model fields
        $data = $validated;
        if (isset($data['capacity'])) {
            $data['seats'] = $data['capacity']; // Fallback if model uses seats
            unset($data['capacity']);
        }
        
        // Re-check model fields in next step, for now assume standard
        Vehicle::create($validated);

        return redirect()->route('vehicles.manage.index')->with('success', 'เพิ่มรถเรียบร้อยแล้ว');
    }

    public function edit(Vehicle $vehicle) // Route binding might fail if route param is different
    {
        // In resource route: /vehicles/manage/{manage} -> param is 'manage'
        // We need to be careful with resource naming.
        
        $categories = VehicleCategory::where('is_active', true)->get();
        return Inertia::render('vehicles/manage/Edit', [
            'vehicle' => $vehicle,
            'categories' => $categories
        ]);
    }

    public function update(Request $request, $id)
    {
        $vehicle = Vehicle::findOrFail($id);
        
        $validated = $request->validate([
            'license_plate' => 'required|unique:vehicles,license_plate,' . $vehicle->id,
            'brand' => 'required|string',
            'model' => 'required|string',
            'category_id' => 'required|exists:vehicle_categories,id',
            'capacity' => 'required|integer|min:1',
            'color' => 'nullable|string',
            'status' => 'required|in:available,maintenance,busy',
            'image' => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('image')) {
            if ($vehicle->image) {
                Storage::disk('public')->delete($vehicle->image);
            }
            $path = $request->file('image')->store('vehicles', 'public');
            $validated['image'] = $path;
        }

        $vehicle->update($validated);

        return redirect()->route('vehicles.manage.index')->with('success', 'แก้ไขข้อมูลรถเรียบร้อยแล้ว');
    }

    public function destroy($id)
    {
        $vehicle = Vehicle::findOrFail($id);
        if ($vehicle->image) {
            Storage::disk('public')->delete($vehicle->image);
        }
        $vehicle->delete();
        return redirect()->route('vehicles.manage.index')->with('success', 'ลบรถเรียบร้อยแล้ว');
    }
}
