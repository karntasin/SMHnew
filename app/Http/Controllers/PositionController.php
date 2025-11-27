<?php

namespace App\Http\Controllers;

use App\Models\Position;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PositionController extends Controller
{
    public function index(Request $request)
    {
        $query = Position::query();

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $positions = $query->orderBy('name')->paginate(15)->withQueryString();

        return Inertia::render('settings/positions/Index', [
            'positions' => $positions,
            'filters' => $request->only(['search']),
        ]);
    }

    public function create()
    {
        return Inertia::render('settings/positions/Form');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:positions,name'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        Position::create($validated);

        return redirect()->route('settings.positions.index')
            ->with('success', 'เพิ่มตำแหน่งงานสำเร็จ');
    }

    public function edit(Position $position)
    {
        return Inertia::render('settings/positions/Form', [
            'position' => $position,
        ]);
    }

    public function update(Request $request, Position $position)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:positions,name,' . $position->id],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $position->update($validated);

        return redirect()->route('settings.positions.index')
            ->with('success', 'แก้ไขตำแหน่งงานสำเร็จ');
    }

    public function destroy(Position $position)
    {
        // ตรวจสอบว่ามีผู้ใช้ที่ใช้ตำแหน่งนี้อยู่หรือไม่
        if ($position->users()->count() > 0) {
            return redirect()->route('settings.positions.index')
                ->with('error', 'ไม่สามารถลบได้ เนื่องจากมีผู้ใช้งานที่ใช้ตำแหน่งนี้อยู่');
        }

        $position->delete();

        return redirect()->route('settings.positions.index')
            ->with('success', 'ลบตำแหน่งงานสำเร็จ');
    }
}
