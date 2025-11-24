<?php

namespace App\Http\Controllers;

use App\Models\EnvAsset;
use App\Models\EnvPmSchedule;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class EnvAssetController extends Controller
{
    public function index()
    {
        return Inertia::render('Env/Assets/Index', [
            'assets' => EnvAsset::with('schedule')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'model' => 'nullable|string',
            'serial_number' => 'nullable|string',
            'price' => 'nullable|numeric',
            'location' => 'nullable|string',
            'owner' => 'nullable|string',
            'risk_level' => 'required|in:A,B,C',
            'status' => 'required|in:Active,Inactive,Maintenance,Retired',
            'purchase_date' => 'nullable|date',
            'warranty_expiry' => 'nullable|date',
            // Schedule fields
            'frequency_type' => 'required|in:month,year',
            'frequency_value' => 'required|integer|min:1',
            'next_pm_date' => 'nullable|date',
        ]);

        $asset = EnvAsset::create($request->only([
            'name', 'model', 'serial_number', 'price', 'location', 'owner', 
            'risk_level', 'status', 'purchase_date', 'warranty_expiry'
        ]));

        // Create default schedule
        EnvPmSchedule::create([
            'asset_id' => $asset->id,
            'frequency_type' => $request->frequency_type,
            'frequency_value' => $request->frequency_value,
            'next_pm_date' => $request->next_pm_date ?? Carbon::now()->addMonths($request->frequency_value),
            'checklist_template' => [], // Can be enhanced later
        ]);

        return redirect()->back()->with('success', 'Asset registered successfully.');
    }

    public function update(Request $request, EnvAsset $asset)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'model' => 'nullable|string',
            'serial_number' => 'nullable|string',
            'price' => 'nullable|numeric',
            'location' => 'nullable|string',
            'owner' => 'nullable|string',
            'risk_level' => 'required|in:A,B,C',
            'status' => 'required|in:Active,Inactive,Maintenance,Retired',
            'purchase_date' => 'nullable|date',
            'warranty_expiry' => 'nullable|date',
        ]);

        $asset->update($validated);

        return redirect()->back()->with('success', 'Asset updated successfully.');
    }

    public function destroy(EnvAsset $asset)
    {
        $asset->delete();
        return redirect()->back()->with('success', 'Asset deleted successfully.');
    }
}
