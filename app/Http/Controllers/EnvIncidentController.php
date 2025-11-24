<?php

namespace App\Http\Controllers;

use App\Models\EnvIncident;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

use App\Notifications\IncidentReported;
use Illuminate\Support\Facades\Notification;

class EnvIncidentController extends Controller
{
    public function index()
    {
        $incidents = EnvIncident::with(['reporter', 'assignee'])
            ->orderBy('created_at', 'desc')
            ->get();

        // Calculate MTTR (Mean Time To Repair) in hours
        $resolvedIncidents = $incidents->where('status', 'closed')->whereNotNull('start_time')->whereNotNull('end_time');
        $mttr = 0;
        if ($resolvedIncidents->count() > 0) {
            $totalDuration = $resolvedIncidents->sum(function ($incident) {
                return $incident->end_time->diffInHours($incident->start_time);
            });
            $mttr = round($totalDuration / $resolvedIncidents->count(), 2);
        }

        return Inertia::render('Env/Incidents/Index', [
            'incidents' => $incidents,
            'mttr' => $mttr,
            'users' => User::select('id', 'name')->get(), // For assignment
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'incident_type' => 'required|string',
            'location' => 'required|string',
            'severity' => 'required|in:low,medium,high,critical',
            'description' => 'required|string',
        ]);

        $incident = EnvIncident::create([
            'reporter_id' => Auth::id(),
            'incident_type' => $request->incident_type,
            'location' => $request->location,
            'severity' => $request->severity,
            'description' => $request->description,
            'status' => 'reported',
        ]);

        // Notify Admin (User ID 1)
        $admin = User::find(1);
        if ($admin) {
            $admin->notify(new IncidentReported($incident));
        }

        return redirect()->back()->with('success', 'บันทึกการแจ้งอุบัติการณ์เรียบร้อยแล้ว');
    }

    public function update(Request $request, EnvIncident $incident)
    {
        $validated = $request->validate([
            'status' => 'sometimes|in:reported,accepted,in_progress,resolved,closed',
            'assigned_to' => 'nullable|exists:users,id',
            'action_taken' => 'nullable|string',
            'resolution_notes' => 'nullable|string',
            'satisfaction_rating' => 'nullable|integer|min:1|max:5',
        ]);

        // Handle status transitions and timestamps
        if ($request->has('status')) {
            if ($request->status === 'in_progress' && !$incident->start_time) {
                $incident->start_time = Carbon::now();
            }
            if ($request->status === 'resolved' && !$incident->end_time) {
                $incident->end_time = Carbon::now();
            }
        }

        $incident->update($validated);

        return redirect()->back()->with('success', 'อัปเดตข้อมูลอุบัติการณ์เรียบร้อยแล้ว');
    }

    public function destroy(EnvIncident $incident)
    {
        $incident->delete();
        return redirect()->back()->with('success', 'ลบข้อมูลอุบัติการณ์เรียบร้อยแล้ว');
    }
}
