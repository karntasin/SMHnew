<?php

namespace App\Http\Controllers;

use App\Models\MaintenanceCategory;
use App\Models\MaintenancePriority;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MaintenanceSettingController extends Controller
{
    public function index()
    {
        return Inertia::render('maintenance/Settings', [
            'categories' => MaintenanceCategory::all(),
            'priorities' => MaintenancePriority::all(),
        ]);
    }

    public function storeCategory(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        MaintenanceCategory::create($validated);

        return back()->with('success', 'เพิ่มหมวดหมู่เรียบร้อยแล้ว');
    }

    public function updateCategory(Request $request, MaintenanceCategory $category)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $category->update($validated);

        return back()->with('success', 'อัปเดตหมวดหมู่เรียบร้อยแล้ว');
    }

    public function destroyCategory(MaintenanceCategory $category)
    {
        $category->delete();
        return back()->with('success', 'ลบหมวดหมู่เรียบร้อยแล้ว');
    }

    // Similar methods for Priorities...
    public function storePriority(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'level' => 'required|integer',
            'color' => 'nullable|string',
        ]);

        MaintenancePriority::create($validated);

        return back()->with('success', 'เพิ่มระดับความสำคัญเรียบร้อยแล้ว');
    }

    public function updatePriority(Request $request, MaintenancePriority $priority)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'level' => 'required|integer',
            'color' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $priority->update($validated);

        return back()->with('success', 'อัปเดตระดับความสำคัญเรียบร้อยแล้ว');
    }

    public function destroyPriority(MaintenancePriority $priority)
    {
        $priority->delete();
        return back()->with('success', 'ลบระดับความสำคัญเรียบร้อยแล้ว');
    }
}
