<?php

namespace App\Http\Controllers;

use App\Models\Position;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PositionController extends Controller
{
    public function index(Request $request)
    {
        $query = Position::query()->withCount('users');

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
        return Inertia::render('settings/positions/Form', [
            'positionOptions' => $this->positionOptions(),
        ]);
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
        $positionOptions = $this->positionOptions();
        if (!in_array($position->name, $positionOptions, true)) {
            $positionOptions[] = $position->name;
            sort($positionOptions, SORT_NATURAL | SORT_FLAG_CASE);
        }

        return Inertia::render('settings/positions/Form', [
            'position' => $position,
            'positionOptions' => $positionOptions,
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

    /**
     * Build position dropdown options from current positions and user records.
     *
     * @return array<int, string>
     */
    private function positionOptions(): array
    {
        $fromPositions = Position::query()
            ->pluck('name')
            ->map(fn (?string $name) => trim((string) $name))
            ->filter()
            ->all();

        $fromUsers = User::query()
            ->whereNotNull('position')
            ->pluck('position')
            ->map(fn (?string $name) => trim((string) $name))
            ->filter()
            ->all();

        $options = array_values(array_unique(array_merge($fromPositions, $fromUsers)));
        sort($options, SORT_NATURAL | SORT_FLAG_CASE);

        return $options;
    }
}
