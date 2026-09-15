<?php

namespace App\Http\Controllers;

use App\Models\MedicalEquipmentCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MedicalEquipmentSettingController extends Controller
{
    public function index()
    {
        return Inertia::render('equipment-borrowing/settings/Index', [
            'categories' => MedicalEquipmentCategory::orderBy('sort_order')->get(),
        ]);
    }

    public function storeCategory(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:20',
            'description' => 'nullable|string',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        MedicalEquipmentCategory::create([
            ...$validated,
            'is_active' => true,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return back()->with('success', 'เพิ่มหมวดหมู่เรียบร้อยแล้ว');
    }

    public function updateCategory(Request $request, MedicalEquipmentCategory $category)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:20',
            'description' => 'nullable|string',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        $category->update($validated);

        return back()->with('success', 'บันทึกหมวดหมู่เรียบร้อยแล้ว');
    }

    public function destroyCategory(MedicalEquipmentCategory $category)
    {
        if ($category->equipment()->exists()) {
            return back()->with('error', 'ไม่สามารถลบได้ มีอุปกรณ์ในหมวดนี้');
        }

        $category->delete();

        return back()->with('success', 'ลบหมวดหมู่เรียบร้อยแล้ว');
    }
}
