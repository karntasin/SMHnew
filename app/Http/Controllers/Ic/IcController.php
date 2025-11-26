<?php

namespace App\Http\Controllers\Ic;

use App\Http\Controllers\Controller;
use App\Models\Ic\IcSurveillanceLog;
use App\Models\Ic\IcIncident;
use App\Models\Hosxp\Ipt;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class IcController extends Controller
{
    public function index()
    {
        // Dashboard Stats
        $stats = [
            'total_infections' => IcSurveillanceLog::count(),
            'active_infections' => IcSurveillanceLog::where('status', 'confirmed')->count(),
            'incidents_this_month' => IcIncident::whereMonth('incident_date', now()->month)->count(),
            'infection_by_ward' => IcSurveillanceLog::select('ward_name', DB::raw('count(*) as total'))
                ->groupBy('ward_name')
                ->get(),
        ];

        return Inertia::render('IC/Index', [
            'stats' => $stats,
        ]);
    }

    public function surveillance()
    {
        $logs = IcSurveillanceLog::with('reporter')
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return Inertia::render('IC/Surveillance', [
            'logs' => $logs,
        ]);
    }

    public function searchAdmissions(Request $request)
    {
        $hn = $request->input('hn');
        $date = $request->input('date');

        $query = Ipt::with('patient')->select('an', 'hn', 'regdate', 'ward', 'dchdate');

        if ($hn) {
            $query->where('hn', $hn);
        }

        if ($date) {
            $query->whereDate('regdate', $date);
        }
        
        // Limit results if no specific search
        if (!$hn && !$date) {
            $query->orderBy('regdate', 'desc')->limit(20);
        }

        $admissions = $query->get()->map(function ($item) {
            return [
                'an' => $item->an,
                'hn' => $item->hn,
                'patient_name' => $item->patient ? ($item->patient->pname . $item->patient->fname . ' ' . $item->patient->lname) : 'Unknown',
                'regdate' => $item->regdate,
                'ward' => $item->ward, // In real app, map ward code to name
                'dchdate' => $item->dchdate,
            ];
        });

        return response()->json($admissions);
    }

    public function storeSurveillance(Request $request)
    {
        $validated = $request->validate([
            'hn' => 'required|string',
            'an' => 'nullable|string',
            'patient_name' => 'required|string',
            'admit_date' => 'nullable|date',
            'infection_date' => 'required|date',
            'ward_name' => 'nullable|string',
            'infection_type' => 'required|string',
            'organism' => 'nullable|string',
            'status' => 'required|in:suspected,confirmed,rejected',
            'notes' => 'nullable|string',
        ]);

        IcSurveillanceLog::create([
            ...$validated,
            'reporter_id' => Auth::id(),
        ]);

        return redirect()->back()->with('success', 'บันทึกข้อมูลเฝ้าระวังเรียบร้อยแล้ว');
    }

    public function incidents()
    {
        $incidents = IcIncident::with('reporter')
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return Inertia::render('IC/Incidents', [
            'incidents' => $incidents,
        ]);
    }

    public function storeIncident(Request $request)
    {
        $validated = $request->validate([
            'incident_date' => 'required|date',
            'location' => 'required|string',
            'incident_type' => 'required|string',
            'description' => 'required|string',
            'severity' => 'required|in:low,medium,high,critical',
            'action_taken' => 'nullable|string',
        ]);

        IcIncident::create([
            ...$validated,
            'reporter_id' => Auth::id(),
            'status' => 'reported',
        ]);

        return redirect()->back()->with('success', 'รายงานอุบัติการณ์เรียบร้อยแล้ว');
    }
}
