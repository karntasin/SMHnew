<?php

namespace App\Http\Controllers\Vehicle;

use App\Http\Controllers\Controller;
use App\Models\VehicleCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class VehicleSettingController extends Controller
{
    public function index()
    {
        $categories = VehicleCategory::orderBy('order')->get();
        return Inertia::render('vehicles/settings/Index', [
            'categories' => $categories
        ]);
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
}
