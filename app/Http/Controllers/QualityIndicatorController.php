<?php

namespace App\Http\Controllers;

use App\Models\QualityIndicator;
use App\Models\QualityIndicatorEntry;
use App\Models\Department;
use App\Models\TeamHa;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class QualityIndicatorController extends Controller
{
    public function index(Request $request)
    {
        $type = $request->query('type', 'department'); // 'department', 'ha_team', 'organization'
        
        $query = QualityIndicator::where('type', $type)
            ->with(['department', 'team'])
            ->orderBy('category')
            ->orderBy('code');

        if ($request->has('department_id') && $type === 'department') {
            $query->where('department_id', $request->department_id);
        }

        if ($request->has('team_id') && $type === 'ha_team') {
            $query->where('team_id', $request->team_id);
        }

        $indicators = $query->get();
        
        $departments = Department::select('id', 'name')->get();
        $teams = TeamHa::select('id', 'abbreviation', 'name_th')->get();

        return Inertia::render('QualityIndicators/Index', [
            'indicators' => $indicators,
            'type' => $type,
            'departments' => $departments,
            'teams' => $teams,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:department,ha_team,organization',
            'department_id' => 'nullable|required_if:type,department|exists:departments,id',
            'team_id' => 'nullable|required_if:type,ha_team|exists:teamha,id',
            'code' => 'nullable|string|unique:quality_indicators,code',
            'name' => 'required|string',
            'category' => 'nullable|string',
            'unit' => 'required|string',
            'target_value' => 'nullable|numeric',
            'target_operator' => 'required|in:<,>,<=,>=,=',
            'frequency' => 'required|string',
            'description' => 'nullable|string',
            'formula_description' => 'nullable|string',
        ]);

        QualityIndicator::create($validated);

        return redirect()->back()->with('success', 'Indicator created successfully.');
    }

    public function update(Request $request, QualityIndicator $indicator)
    {
        $validated = $request->validate([
            'code' => 'nullable|string|unique:quality_indicators,code,' . $indicator->id,
            'name' => 'required|string',
            'category' => 'nullable|string',
            'unit' => 'required|string',
            'target_value' => 'nullable|numeric',
            'target_operator' => 'required|in:<,>,<=,>=,=',
            'frequency' => 'required|string',
            'description' => 'nullable|string',
            'formula_description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $indicator->update($validated);

        return redirect()->back()->with('success', 'Indicator updated successfully.');
    }

    public function show(QualityIndicator $indicator)
    {
        $indicator->load(['entries' => function ($query) {
            $query->orderBy('period_date', 'desc')->limit(24); // Last 2 years
        }]);

        return Inertia::render('QualityIndicators/Show', [
            'indicator' => $indicator
        ]);
    }

    public function storeEntry(Request $request, QualityIndicator $indicator)
    {
        $validated = $request->validate([
            'period_date' => 'required|date',
            'numerator' => 'nullable|numeric',
            'denominator' => 'nullable|numeric',
            'result_value' => 'required|numeric',
            'notes' => 'nullable|string',
        ]);

        $validated['created_by'] = Auth::id();

        // Check for existing entry
        $entry = $indicator->entries()->where('period_date', $validated['period_date'])->first();

        if ($entry) {
            $entry->update($validated);
            $message = 'Data updated successfully.';
        } else {
            $indicator->entries()->create($validated);
            $message = 'Data entry added successfully.';
        }

        return redirect()->back()->with('success', $message);
    }

    public function dashboard()
    {
        // Fetch indicators with their latest entry
        $indicators = QualityIndicator::with(['entries' => function ($query) {
            $query->orderBy('period_date', 'desc')->limit(1);
        }])->where('is_active', true)->get();

        return Inertia::render('QualityIndicators/Dashboard', [
            'indicators' => $indicators
        ]);
    }

    public function destroy(QualityIndicator $indicator)
    {
        $indicator->delete();
        return redirect()->route('quality-indicators.index')->with('success', 'Indicator deleted successfully.');
    }
}
