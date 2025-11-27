<?php

namespace App\Http\Controllers;

use App\Models\TeamHa;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TeamhaController extends Controller
{
    public function index(Request $request)
    {
        $query = TeamHa::query();

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('abbreviation', 'like', "%{$search}%")
                  ->orWhere('name_th', 'like', "%{$search}%")
                  ->orWhere('name_en', 'like', "%{$search}%");
            });
        }

        $teams = $query->orderBy('abbreviation')->paginate(15)->withQueryString();

        return Inertia::render('settings/teamha/Index', [
            'teams' => $teams,
            'filters' => $request->only(['search']),
        ]);
    }

    public function create()
    {
        return Inertia::render('settings/teamha/Form');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'abbreviation' => ['required', 'string', 'max:50', 'unique:teamha,abbreviation'],
            'name_th' => ['required', 'string', 'max:255'],
            'name_en' => ['nullable', 'string', 'max:255'],
        ]);

        TeamHa::create($validated);

        return redirect()->route('settings.teamha.index')
            ->with('success', 'เพิ่มทีม HA สำเร็จ');
    }

    public function edit(TeamHa $teamha)
    {
        return Inertia::render('settings/teamha/Form', [
            'team' => $teamha,
        ]);
    }

    public function update(Request $request, TeamHa $teamha)
    {
        $validated = $request->validate([
            'abbreviation' => ['required', 'string', 'max:50', 'unique:teamha,abbreviation,' . $teamha->id],
            'name_th' => ['required', 'string', 'max:255'],
            'name_en' => ['nullable', 'string', 'max:255'],
        ]);

        $teamha->update($validated);

        return redirect()->route('settings.teamha.index')
            ->with('success', 'แก้ไขทีม HA สำเร็จ');
    }

    public function destroy(TeamHa $teamha)
    {
        $teamha->delete();

        return redirect()->route('settings.teamha.index')
            ->with('success', 'ลบทีม HA สำเร็จ');
    }
}
