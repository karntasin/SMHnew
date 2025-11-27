<?php

namespace App\Http\Controllers;

use App\Models\Department;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DepartmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Department::query();

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $departments = $query->orderBy('name')->paginate(15)->withQueryString();

        return Inertia::render('settings/departments/Index', [
            'departments' => $departments,
            'filters' => $request->only(['search']),
        ]);
    }

    public function create()
    {
        return Inertia::render('settings/departments/Form');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50', 'unique:departments,code'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_active' => ['boolean'],
        ]);

        $validated['is_active'] = $validated['is_active'] ?? true;

        Department::create($validated);

        return redirect()->route('settings.departments.index')
            ->with('success', 'เพิ่มแผนกสำเร็จ');
    }

    public function edit(Department $department)
    {
        return Inertia::render('settings/departments/Form', [
            'department' => $department,
        ]);
    }

    public function update(Request $request, Department $department)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50', 'unique:departments,code,' . $department->id],
            'description' => ['nullable', 'string', 'max:500'],
            'is_active' => ['boolean'],
        ]);

        $department->update($validated);

        return redirect()->route('settings.departments.index')
            ->with('success', 'แก้ไขแผนกสำเร็จ');
    }

    public function destroy(Department $department)
    {
        $department->delete();

        return redirect()->route('settings.departments.index')
            ->with('success', 'ลบแผนกสำเร็จ');
    }
}
