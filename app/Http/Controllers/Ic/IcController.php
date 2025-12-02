<?php

namespace App\Http\Controllers\Ic;

use App\Http\Controllers\Controller;
use App\Models\Ic\IcSurveillanceLog;
use App\Models\Ic\IcIncident;
use App\Models\Ic\IcHandHygieneObservation;
use App\Models\Ic\IcEnvironmentCheck;
use App\Models\Ic\IcDeviceDay;
use App\Models\Ic\IcAntibioticUse;
use App\Models\Ic\IcOutbreak;
use App\Models\Ic\IcOutbreakCase;
use App\Models\Ic\IcEducationRecord;
use App\Models\Ic\IcEducationAttendee;
use App\Models\Ic\IcSetting;
use App\Models\Hosxp\Ipt;
use App\Models\Hosxp\DrugItems;
use App\Models\Hosxp\Ward;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class IcController extends Controller
{
    // ==========================================
    // DASHBOARD
    // ==========================================
    public function index()
    {
        $currentMonth = now()->month;
        $currentYear = now()->year;

        // Get device days for rate calculation
        $deviceDaysThisMonth = IcDeviceDay::whereMonth('record_date', $currentMonth)
            ->whereYear('record_date', $currentYear)
            ->selectRaw('
                SUM(patient_days) as total_patient_days,
                SUM(urinary_catheter_days) as total_catheter_days,
                SUM(central_line_days) as total_central_line_days,
                SUM(ventilator_days) as total_ventilator_days
            ')
            ->first();

        // Calculate HAI rates
        $confirmedInfections = IcSurveillanceLog::where('status', 'confirmed')
            ->whereMonth('infection_date', $currentMonth)
            ->whereYear('infection_date', $currentYear)
            ->get();

        $cautiCount = $confirmedInfections->where('infection_type', 'CAUTI')->count();
        $clabsiCount = $confirmedInfections->where('infection_type', 'CLABSI')->count();
        $vapCount = $confirmedInfections->where('infection_type', 'VAP')->count();

        // Calculate rates per 1000 device days
        $cautiRate = $deviceDaysThisMonth?->total_catheter_days > 0 
            ? round(($cautiCount / $deviceDaysThisMonth->total_catheter_days) * 1000, 2) 
            : 0;
        $clabsiRate = $deviceDaysThisMonth?->total_central_line_days > 0 
            ? round(($clabsiCount / $deviceDaysThisMonth->total_central_line_days) * 1000, 2) 
            : 0;
        $vapRate = $deviceDaysThisMonth?->total_ventilator_days > 0 
            ? round(($vapCount / $deviceDaysThisMonth->total_ventilator_days) * 1000, 2) 
            : 0;

        // Hand Hygiene Compliance
        $handHygieneThisMonth = IcHandHygieneObservation::whereMonth('observation_date', $currentMonth)
            ->whereYear('observation_date', $currentYear)
            ->selectRaw('
                SUM(moment_1_opportunities + moment_2_opportunities + moment_3_opportunities + moment_4_opportunities + moment_5_opportunities) as total_opportunities,
                SUM(moment_1_compliances + moment_2_compliances + moment_3_compliances + moment_4_compliances + moment_5_compliances) as total_compliances
            ')
            ->first();

        $handHygieneRate = $handHygieneThisMonth?->total_opportunities > 0
            ? round(($handHygieneThisMonth->total_compliances / $handHygieneThisMonth->total_opportunities) * 100, 1)
            : 0;

        // Targets from settings
        $targets = [
            'hand_hygiene' => IcSetting::getValue('hand_hygiene_target', 85),
            'cauti' => IcSetting::getValue('cauti_target', 3.5),
            'clabsi' => IcSetting::getValue('clabsi_target', 1.5),
            'vap' => IcSetting::getValue('vap_target', 5.0),
        ];

        // Dashboard Stats
        $stats = [
            'total_infections' => IcSurveillanceLog::count(),
            'active_infections' => IcSurveillanceLog::whereIn('status', ['confirmed', 'suspected'])
                ->whereNull('outcome')
                ->orWhere('outcome', 'ongoing')
                ->count(),
            'incidents_this_month' => IcIncident::whereMonth('incident_date', $currentMonth)->count(),
            'hand_hygiene_rate' => $handHygieneRate,
            'cauti_rate' => $cautiRate,
            'clabsi_rate' => $clabsiRate,
            'vap_rate' => $vapRate,
            'active_outbreaks' => IcOutbreak::whereIn('status', ['investigating', 'active'])->count(),
            'pending_antibiotic_reviews' => IcAntibioticUse::where('appropriateness', 'pending')->count(),
            'targets' => $targets,
            'infection_by_ward' => IcSurveillanceLog::select('ward_name', DB::raw('count(*) as total'))
                ->whereMonth('infection_date', $currentMonth)
                ->groupBy('ward_name')
                ->get(),
            'infection_by_type' => IcSurveillanceLog::select('infection_type', DB::raw('count(*) as total'))
                ->whereMonth('infection_date', $currentMonth)
                ->whereYear('infection_date', $currentYear)
                ->groupBy('infection_type')
                ->get(),
            'recent_incidents' => IcIncident::with('reporter')
                ->orderBy('incident_date', 'desc')
                ->take(5)
                ->get(),
            'monthly_trend' => $this->getMonthlyTrend(),
        ];

        return Inertia::render('IC/Index', [
            'stats' => $stats,
        ]);
    }

    private function getMonthlyTrend()
    {
        $trends = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $month = $date->month;
            $year = $date->year;

            $infections = IcSurveillanceLog::where('status', 'confirmed')
                ->whereMonth('infection_date', $month)
                ->whereYear('infection_date', $year)
                ->count();

            $handHygiene = IcHandHygieneObservation::whereMonth('observation_date', $month)
                ->whereYear('observation_date', $year)
                ->selectRaw('
                    SUM(moment_1_opportunities + moment_2_opportunities + moment_3_opportunities + moment_4_opportunities + moment_5_opportunities) as total_opportunities,
                    SUM(moment_1_compliances + moment_2_compliances + moment_3_compliances + moment_4_compliances + moment_5_compliances) as total_compliances
                ')
                ->first();

            $hhRate = $handHygiene?->total_opportunities > 0
                ? round(($handHygiene->total_compliances / $handHygiene->total_opportunities) * 100, 1)
                : null;

            $trends[] = [
                'month' => $date->format('M Y'),
                'month_thai' => $this->getThaiMonth($month) . ' ' . ($year + 543),
                'infections' => $infections,
                'hand_hygiene_rate' => $hhRate,
            ];
        }
        return $trends;
    }

    private function getThaiMonth($month)
    {
        $months = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        return $months[$month] ?? '';
    }

    // ==========================================
    // SURVEILLANCE
    // ==========================================
    public function surveillance(Request $request)
    {
        $query = IcSurveillanceLog::with('reporter');

        // Filters
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('infection_type')) {
            $query->where('infection_type', $request->infection_type);
        }
        if ($request->filled('ward')) {
            $query->where('ward_name', $request->ward);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('infection_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('infection_date', '<=', $request->date_to);
        }

        $logs = $query->orderBy('created_at', 'desc')->paginate(15);

        // Stats
        $stats = [
            'total' => IcSurveillanceLog::count(),
            'confirmed' => IcSurveillanceLog::where('status', 'confirmed')->count(),
            'suspected' => IcSurveillanceLog::where('status', 'suspected')->count(),
            'this_month' => IcSurveillanceLog::whereMonth('infection_date', now()->month)->count(),
        ];

        return Inertia::render('IC/Surveillance', [
            'logs' => $logs,
            'stats' => $stats,
            'filters' => $request->only(['status', 'infection_type', 'ward', 'date_from', 'date_to']),
        ]);
    }

    public function searchAdmissions(Request $request)
    {
        $search = $request->input('hn'); // can be HN or name
        $date = $request->input('date');

        // Helper function to get ward name
        $getWardName = function ($wardCode) {
            if (!$wardCode) return null;
            $ward = Ward::where('ward', $wardCode)->first();
            return $ward ? $ward->name : $wardCode;
        };

        if (!$search && !$date) {
            // Return recent admissions if no search criteria
            $admissions = Ipt::with('patient')
                ->select('an', 'hn', 'regdate', 'ward', 'dchdate')
                ->orderBy('regdate', 'desc')
                ->limit(20)
                ->get()
                ->map(function ($item) use ($getWardName) {
                    return [
                        'an' => $item->an,
                        'hn' => $item->hn,
                        'patient_name' => $item->patient ? ($item->patient->pname . $item->patient->fname . ' ' . $item->patient->lname) : 'Unknown',
                        'regdate' => $item->regdate,
                        'ward' => $getWardName($item->ward),
                        'ward_code' => $item->ward,
                        'dchdate' => $item->dchdate,
                    ];
                });
            return response()->json($admissions);
        }

        // Search by HN (exact match) or patient name (partial match)
        $query = Ipt::with('patient')
            ->select('an', 'hn', 'regdate', 'ward', 'dchdate');

        if ($search) {
            // Check if search looks like HN (numeric) or name (contains Thai/English letters)
            if (preg_match('/^\d+$/', $search)) {
                // Search by HN (exact or partial match)
                $query->where('hn', 'like', "%{$search}%");
            } else {
                // Search by patient name using join
                $query->whereHas('patient', function ($q) use ($search) {
                    $q->where(DB::raw("CONCAT(pname, fname, ' ', lname)"), 'like', "%{$search}%")
                      ->orWhere('fname', 'like', "%{$search}%")
                      ->orWhere('lname', 'like', "%{$search}%");
                });
            }
        }

        if ($date) {
            $query->whereDate('regdate', $date);
        }

        $admissions = $query->orderBy('regdate', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($item) use ($getWardName) {
                return [
                    'an' => $item->an,
                    'hn' => $item->hn,
                    'patient_name' => $item->patient ? ($item->patient->pname . $item->patient->fname . ' ' . $item->patient->lname) : 'Unknown',
                    'regdate' => $item->regdate,
                    'ward' => $getWardName($item->ward),
                    'ward_code' => $item->ward,
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
            'device_related' => 'nullable|string',
            'organism' => 'nullable|string',
            'culture_date' => 'nullable|date',
            'sensitivity_pattern' => 'nullable|string',
            'status' => 'required|in:suspected,confirmed,rejected',
            'onset_type' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        // Calculate days after admission
        $daysAfterAdmission = null;
        if ($validated['admit_date'] && $validated['infection_date']) {
            $daysAfterAdmission = Carbon::parse($validated['infection_date'])
                ->diffInDays(Carbon::parse($validated['admit_date']));
        }

        IcSurveillanceLog::create([
            ...$validated,
            'days_after_admission' => $daysAfterAdmission,
            'reporter_id' => Auth::id(),
        ]);

        return redirect()->back()->with('success', 'บันทึกข้อมูลเฝ้าระวังเรียบร้อยแล้ว');
    }

    public function updateSurveillance(Request $request, IcSurveillanceLog $log)
    {
        $validated = $request->validate([
            'status' => 'required|in:suspected,confirmed,rejected',
            'outcome' => 'nullable|in:recovered,ongoing,deceased,transferred',
            'notes' => 'nullable|string',
        ]);

        $log->update($validated);

        return redirect()->back()->with('success', 'อัปเดตข้อมูลเรียบร้อยแล้ว');
    }

    // ==========================================
    // INCIDENTS
    // ==========================================
    public function incidents(Request $request)
    {
        $query = IcIncident::with('reporter');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('severity')) {
            $query->where('severity', $request->severity);
        }
        if ($request->filled('type')) {
            $query->where('incident_type', $request->type);
        }

        $incidents = $query->orderBy('incident_date', 'desc')->paginate(15);

        $stats = [
            'total' => IcIncident::count(),
            'this_month' => IcIncident::whereMonth('incident_date', now()->month)->count(),
            'pending_follow_up' => IcIncident::where('status', '!=', 'resolved')
                ->whereNotNull('follow_up_date')
                ->whereDate('follow_up_date', '<=', now())
                ->count(),
            'by_type' => IcIncident::select('incident_type', DB::raw('count(*) as total'))
                ->groupBy('incident_type')
                ->get(),
        ];

        return Inertia::render('IC/Incidents', [
            'incidents' => $incidents,
            'stats' => $stats,
            'filters' => $request->only(['status', 'severity', 'type']),
        ]);
    }

    public function storeIncident(Request $request)
    {
        $validated = $request->validate([
            'incident_date' => 'required|date',
            'location' => 'required|string',
            'incident_type' => 'required|string',
            'source_patient_hn' => 'nullable|string',
            'source_patient_status' => 'nullable|string',
            'description' => 'required|string',
            'severity' => 'required|in:low,medium,high,critical',
            'action_taken' => 'nullable|string',
            'pep_given' => 'nullable|boolean',
            'follow_up_date' => 'nullable|date',
        ]);

        IcIncident::create([
            ...$validated,
            'reporter_id' => Auth::id(),
            'status' => 'reported',
        ]);

        return redirect()->back()->with('success', 'รายงานอุบัติการณ์เรียบร้อยแล้ว');
    }

    public function updateIncident(Request $request, IcIncident $incident)
    {
        $validated = $request->validate([
            'status' => 'required|in:reported,investigating,resolved',
            'action_taken' => 'nullable|string',
            'baseline_labs' => 'nullable|string',
            'outcome' => 'nullable|string',
        ]);

        $incident->update($validated);

        return redirect()->back()->with('success', 'อัปเดตข้อมูลเรียบร้อยแล้ว');
    }

    // ==========================================
    // HAND HYGIENE
    // ==========================================
    public function handHygiene(Request $request)
    {
        $query = IcHandHygieneObservation::with('reporter');

        if ($request->filled('ward')) {
            $query->where('ward_name', $request->ward);
        }
        if ($request->filled('profession')) {
            $query->where('profession', $request->profession);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('observation_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('observation_date', '<=', $request->date_to);
        }

        $observations = $query->orderBy('observation_date', 'desc')->paginate(15);

        // Calculate overall compliance
        $overallStats = IcHandHygieneObservation::selectRaw('
            SUM(moment_1_opportunities) as m1_opp, SUM(moment_1_compliances) as m1_comp,
            SUM(moment_2_opportunities) as m2_opp, SUM(moment_2_compliances) as m2_comp,
            SUM(moment_3_opportunities) as m3_opp, SUM(moment_3_compliances) as m3_comp,
            SUM(moment_4_opportunities) as m4_opp, SUM(moment_4_compliances) as m4_comp,
            SUM(moment_5_opportunities) as m5_opp, SUM(moment_5_compliances) as m5_comp
        ')
        ->whereMonth('observation_date', now()->month)
        ->whereYear('observation_date', now()->year)
        ->first();

        $stats = [
            'target' => IcSetting::getValue('hand_hygiene_target', 85),
            'overall_rate' => $this->calculateOverallHandHygieneRate($overallStats),
            'by_moment' => [
                ['moment' => 1, 'name' => 'Before touching patient', 'rate' => $this->calculateMomentRate($overallStats, 1)],
                ['moment' => 2, 'name' => 'Before clean/aseptic procedure', 'rate' => $this->calculateMomentRate($overallStats, 2)],
                ['moment' => 3, 'name' => 'After body fluid exposure', 'rate' => $this->calculateMomentRate($overallStats, 3)],
                ['moment' => 4, 'name' => 'After touching patient', 'rate' => $this->calculateMomentRate($overallStats, 4)],
                ['moment' => 5, 'name' => 'After touching surroundings', 'rate' => $this->calculateMomentRate($overallStats, 5)],
            ],
            'by_profession' => IcHandHygieneObservation::select('profession')
                ->selectRaw('
                    SUM(moment_1_opportunities + moment_2_opportunities + moment_3_opportunities + moment_4_opportunities + moment_5_opportunities) as total_opp,
                    SUM(moment_1_compliances + moment_2_compliances + moment_3_compliances + moment_4_compliances + moment_5_compliances) as total_comp
                ')
                ->whereMonth('observation_date', now()->month)
                ->groupBy('profession')
                ->get()
                ->map(function ($item) {
                    return [
                        'profession' => $item->profession,
                        'rate' => $item->total_opp > 0 ? round(($item->total_comp / $item->total_opp) * 100, 1) : 0,
                    ];
                }),
        ];

        return Inertia::render('IC/HandHygiene', [
            'observations' => $observations,
            'stats' => $stats,
            'filters' => $request->only(['ward', 'profession', 'date_from', 'date_to']),
        ]);
    }

    private function calculateOverallHandHygieneRate($stats)
    {
        if (!$stats) return 0;
        $totalOpp = ($stats->m1_opp ?? 0) + ($stats->m2_opp ?? 0) + ($stats->m3_opp ?? 0) + ($stats->m4_opp ?? 0) + ($stats->m5_opp ?? 0);
        $totalComp = ($stats->m1_comp ?? 0) + ($stats->m2_comp ?? 0) + ($stats->m3_comp ?? 0) + ($stats->m4_comp ?? 0) + ($stats->m5_comp ?? 0);
        return $totalOpp > 0 ? round(($totalComp / $totalOpp) * 100, 1) : 0;
    }

    private function calculateMomentRate($stats, $moment)
    {
        if (!$stats) return 0;
        $opp = $stats->{"m{$moment}_opp"} ?? 0;
        $comp = $stats->{"m{$moment}_comp"} ?? 0;
        return $opp > 0 ? round(($comp / $opp) * 100, 1) : 0;
    }

    public function storeHandHygiene(Request $request)
    {
        $validated = $request->validate([
            'observation_date' => 'required|date',
            'ward_name' => 'required|string',
            'observer_name' => 'required|string',
            'profession' => 'required|string',
            'moment_1_opportunities' => 'required|integer|min:0',
            'moment_1_compliances' => 'required|integer|min:0',
            'moment_2_opportunities' => 'required|integer|min:0',
            'moment_2_compliances' => 'required|integer|min:0',
            'moment_3_opportunities' => 'required|integer|min:0',
            'moment_3_compliances' => 'required|integer|min:0',
            'moment_4_opportunities' => 'required|integer|min:0',
            'moment_4_compliances' => 'required|integer|min:0',
            'moment_5_opportunities' => 'required|integer|min:0',
            'moment_5_compliances' => 'required|integer|min:0',
            'hand_hygiene_method' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        IcHandHygieneObservation::create([
            ...$validated,
            'reporter_id' => Auth::id(),
        ]);

        return redirect()->back()->with('success', 'บันทึกข้อมูล Hand Hygiene เรียบร้อยแล้ว');
    }

    // ==========================================
    // ENVIRONMENT CHECK
    // ==========================================
    public function environment(Request $request)
    {
        $query = IcEnvironmentCheck::with('reporter');

        if ($request->filled('area')) {
            $query->where('area_name', $request->area);
        }
        if ($request->filled('check_type')) {
            $query->where('check_type', $request->check_type);
        }
        if ($request->filled('result')) {
            $query->where('result', $request->result);
        }

        $checks = $query->orderBy('check_date', 'desc')->paginate(15);

        $stats = [
            'total_checks' => IcEnvironmentCheck::count(),
            'this_month' => IcEnvironmentCheck::whereMonth('check_date', now()->month)->count(),
            'pass_rate' => $this->calculateEnvironmentPassRate(),
            'by_type' => IcEnvironmentCheck::select('check_type', DB::raw('count(*) as total'))
                ->groupBy('check_type')
                ->get(),
            'failed_areas' => IcEnvironmentCheck::where('result', 'fail')
                ->whereMonth('check_date', now()->month)
                ->select('area_name', DB::raw('count(*) as failures'))
                ->groupBy('area_name')
                ->get(),
        ];

        return Inertia::render('IC/Environment', [
            'checks' => $checks,
            'stats' => $stats,
            'filters' => $request->only(['area', 'check_type', 'result']),
        ]);
    }

    private function calculateEnvironmentPassRate()
    {
        $total = IcEnvironmentCheck::whereMonth('check_date', now()->month)
            ->whereIn('result', ['pass', 'fail'])
            ->count();
        $passed = IcEnvironmentCheck::whereMonth('check_date', now()->month)
            ->where('result', 'pass')
            ->count();
        return $total > 0 ? round(($passed / $total) * 100, 1) : 0;
    }

    public function storeEnvironment(Request $request)
    {
        $validated = $request->validate([
            'check_date' => 'required|date',
            'area_name' => 'required|string',
            'check_type' => 'required|string',
            'sampling_site' => 'nullable|string',
            'organism_found' => 'nullable|string',
            'result' => 'required|in:pass,fail,pending',
            'cfu_count' => 'nullable|numeric',
            'equipment_name' => 'nullable|string',
            'sterilization_method' => 'nullable|string',
            'indicator_passed' => 'nullable|boolean',
            'corrective_action' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        IcEnvironmentCheck::create([
            ...$validated,
            'reporter_id' => Auth::id(),
        ]);

        return redirect()->back()->with('success', 'บันทึกข้อมูล Environment Check เรียบร้อยแล้ว');
    }

    // ==========================================
    // DEVICE DAYS
    // ==========================================
    public function deviceDays(Request $request)
    {
        $query = IcDeviceDay::with('reporter');

        if ($request->filled('ward')) {
            $query->where('ward_name', $request->ward);
        }
        if ($request->filled('month')) {
            $query->whereMonth('record_date', $request->month);
        }
        if ($request->filled('year')) {
            $query->whereYear('record_date', $request->year);
        }

        $records = $query->orderBy('record_date', 'desc')->paginate(15);

        // Monthly summary
        $monthlySummary = IcDeviceDay::selectRaw('
            DATE_FORMAT(record_date, "%Y-%m") as month,
            SUM(patient_days) as total_patient_days,
            SUM(urinary_catheter_days) as total_catheter_days,
            SUM(central_line_days) as total_central_line_days,
            SUM(ventilator_days) as total_ventilator_days
        ')
        ->groupBy(DB::raw('DATE_FORMAT(record_date, "%Y-%m")'))
        ->orderBy('month', 'desc')
        ->take(12)
        ->get();

        return Inertia::render('IC/DeviceDays', [
            'records' => $records,
            'monthlySummary' => $monthlySummary,
            'filters' => $request->only(['ward', 'month', 'year']),
        ]);
    }

    public function storeDeviceDays(Request $request)
    {
        $validated = $request->validate([
            'record_date' => 'required|date',
            'ward_name' => 'required|string',
            'patient_days' => 'required|integer|min:0',
            'urinary_catheter_days' => 'required|integer|min:0',
            'central_line_days' => 'required|integer|min:0',
            'ventilator_days' => 'required|integer|min:0',
            'peripheral_iv_days' => 'nullable|integer|min:0',
            'ng_tube_days' => 'nullable|integer|min:0',
            'notes' => 'nullable|string',
        ]);

        IcDeviceDay::updateOrCreate(
            [
                'record_date' => $validated['record_date'],
                'ward_name' => $validated['ward_name'],
            ],
            [
                ...$validated,
                'reporter_id' => Auth::id(),
            ]
        );

        return redirect()->back()->with('success', 'บันทึกข้อมูล Device Days เรียบร้อยแล้ว');
    }

    // ==========================================
    // ANTIBIOTIC STEWARDSHIP
    // ==========================================
    public function antibiotic(Request $request)
    {
        $query = IcAntibioticUse::with('reporter');

        if ($request->filled('appropriateness')) {
            $query->where('appropriateness', $request->appropriateness);
        }
        if ($request->filled('antibiotic_class')) {
            $query->where('antibiotic_class', $request->antibiotic_class);
        }
        if ($request->filled('ward')) {
            $query->where('ward_name', $request->ward);
        }

        $records = $query->orderBy('start_date', 'desc')->paginate(15);

        $stats = [
            'total_records' => IcAntibioticUse::count(),
            'pending_review' => IcAntibioticUse::where('appropriateness', 'pending')->count(),
            'appropriate_rate' => $this->calculateAntibioticAppropriatenessRate(),
            'by_class' => IcAntibioticUse::select('antibiotic_class', DB::raw('count(*) as total'))
                ->whereNotNull('antibiotic_class')
                ->groupBy('antibiotic_class')
                ->get(),
            'by_indication' => IcAntibioticUse::select('indication', DB::raw('count(*) as total'))
                ->groupBy('indication')
                ->get(),
        ];

        return Inertia::render('IC/Antibiotic', [
            'records' => $records,
            'stats' => $stats,
            'filters' => $request->only(['appropriateness', 'antibiotic_class', 'ward']),
        ]);
    }

    private function calculateAntibioticAppropriatenessRate()
    {
        $total = IcAntibioticUse::whereIn('appropriateness', ['appropriate', 'inappropriate'])->count();
        $appropriate = IcAntibioticUse::where('appropriateness', 'appropriate')->count();
        return $total > 0 ? round(($appropriate / $total) * 100, 1) : 0;
    }

    public function storeAntibiotic(Request $request)
    {
        $validated = $request->validate([
            'hn' => 'required|string',
            'an' => 'nullable|string',
            'patient_name' => 'required|string',
            'ward_name' => 'required|string',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date',
            'antibiotic_name' => 'required|string',
            'antibiotic_class' => 'nullable|string',
            'route' => 'required|string',
            'dose' => 'nullable|string',
            'frequency' => 'nullable|string',
            'indication' => 'required|string',
            'culture_site' => 'nullable|string',
            'organism' => 'nullable|string',
            'sensitivity_pattern' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        IcAntibioticUse::create([
            ...$validated,
            'appropriateness' => 'pending',
            'reporter_id' => Auth::id(),
        ]);

        return redirect()->back()->with('success', 'บันทึกข้อมูลการใช้ยาปฏิชีวนะเรียบร้อยแล้ว');
    }

    public function reviewAntibiotic(Request $request, IcAntibioticUse $record)
    {
        $validated = $request->validate([
            'appropriateness' => 'required|in:appropriate,inappropriate,need_review',
            'recommendation' => 'nullable|string',
        ]);

        $record->update([
            ...$validated,
            'reviewed_by' => Auth::user()->name,
        ]);

        return redirect()->back()->with('success', 'บันทึก Review เรียบร้อยแล้ว');
    }

    /**
     * Search drugs from drugitems table in HOSxP
     */
    public function searchDrugs(Request $request)
    {
        $search = $request->input('q');

        if (!$search || strlen($search) < 2) {
            return response()->json([]);
        }

        $drugs = DrugItems::where('name', 'like', '%' . $search . '%')
            ->select('icode', 'name')
            ->orderBy('name')
            ->limit(30)
            ->get()
            ->map(function ($item) {
                return [
                    'icode' => $item->icode,
                    'name' => $item->name,
                ];
            });

        return response()->json($drugs);
    }

    // ==========================================
    // OUTBREAK
    // ==========================================
    public function outbreak(Request $request)
    {
        $query = IcOutbreak::with(['reporter', 'cases']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $outbreaks = $query->orderBy('detection_date', 'desc')->paginate(10);

        $stats = [
            'total' => IcOutbreak::count(),
            'active' => IcOutbreak::whereIn('status', ['investigating', 'active'])->count(),
            'resolved_this_year' => IcOutbreak::where('status', 'resolved')
                ->whereYear('resolved_date', now()->year)
                ->count(),
        ];

        return Inertia::render('IC/Outbreak', [
            'outbreaks' => $outbreaks,
            'stats' => $stats,
            'filters' => $request->only(['status']),
        ]);
    }

    public function storeOutbreak(Request $request)
    {
        $validated = $request->validate([
            'outbreak_name' => 'required|string',
            'detection_date' => 'required|date',
            'pathogen' => 'nullable|string',
            'affected_area' => 'required|string',
            'severity' => 'required|in:minor,moderate,major,critical',
            'source_investigation' => 'nullable|string',
            'control_measures' => 'nullable|string',
        ]);

        IcOutbreak::create([
            ...$validated,
            'status' => 'investigating',
            'total_cases' => 0,
            'staff_cases' => 0,
            'patient_cases' => 0,
            'reported_by' => Auth::id(),
        ]);

        return redirect()->back()->with('success', 'บันทึก Outbreak เรียบร้อยแล้ว');
    }

    public function updateOutbreak(Request $request, IcOutbreak $outbreak)
    {
        $validated = $request->validate([
            'status' => 'required|in:investigating,active,controlled,resolved',
            'resolved_date' => 'nullable|date',
            'control_measures' => 'nullable|string',
            'lessons_learned' => 'nullable|string',
        ]);

        $outbreak->update($validated);

        return redirect()->back()->with('success', 'อัปเดต Outbreak เรียบร้อยแล้ว');
    }

    public function addOutbreakCase(Request $request, IcOutbreak $outbreak)
    {
        $validated = $request->validate([
            'case_type' => 'required|in:patient,staff,visitor',
            'hn' => 'nullable|string',
            'patient_name' => 'nullable|string',
            'staff_name' => 'nullable|string',
            'symptom_onset_date' => 'required|date',
            'symptoms' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $case = $outbreak->cases()->create([
            ...$validated,
            'outcome' => 'ongoing',
        ]);

        // Update outbreak counts
        $outbreak->increment('total_cases');
        if ($validated['case_type'] === 'patient') {
            $outbreak->increment('patient_cases');
        } elseif ($validated['case_type'] === 'staff') {
            $outbreak->increment('staff_cases');
        }

        return redirect()->back()->with('success', 'เพิ่ม Case เรียบร้อยแล้ว');
    }

    public function storeOutbreakCase(Request $request, IcOutbreak $outbreak)
    {
        $validated = $request->validate([
            'hn' => 'nullable|string',
            'patient_name' => 'required|string',
            'onset_date' => 'required|date',
            'symptoms' => 'nullable|string',
            'is_index_case' => 'nullable|boolean',
        ]);

        $outbreak->cases()->create([
            'case_type' => 'patient',
            'hn' => $validated['hn'],
            'patient_name' => $validated['patient_name'],
            'symptom_onset_date' => $validated['onset_date'],
            'symptoms' => $validated['symptoms'],
            'is_index_case' => $validated['is_index_case'] ?? false,
            'outcome' => 'ongoing',
        ]);

        // Update outbreak counts
        $outbreak->increment('total_cases');
        $outbreak->increment('patient_cases');

        return redirect()->back()->with('success', 'เพิ่ม Case เรียบร้อยแล้ว');
    }

    // ==========================================
    // EDUCATION
    // ==========================================
    public function education(Request $request)
    {
        $query = IcEducationRecord::with(['creator', 'attendees']);

        if ($request->filled('topic')) {
            $query->where('topic', $request->topic);
        }
        if ($request->filled('type')) {
            $query->where('training_type', $request->type);
        }

        $records = $query->orderBy('training_date', 'desc')->paginate(10);

        $stats = [
            'total_trainings' => IcEducationRecord::count(),
            'this_year' => IcEducationRecord::whereYear('training_date', now()->year)->count(),
            'total_participants' => IcEducationRecord::sum('total_participants'),
            'avg_pass_rate' => round(IcEducationRecord::avg('pass_rate') ?? 0, 1),
            'by_topic' => IcEducationRecord::select('topic', DB::raw('count(*) as total'))
                ->groupBy('topic')
                ->get(),
        ];

        return Inertia::render('IC/Education', [
            'records' => $records,
            'stats' => $stats,
            'filters' => $request->only(['topic', 'type']),
        ]);
    }

    public function storeEducation(Request $request)
    {
        $validated = $request->validate([
            'topic' => 'required|string',
            'training_type' => 'required|string',
            'target_audience' => 'required|string',
            'trainer_name' => 'required|string',
            'training_date' => 'required|date',
            'duration_hours' => 'required|numeric|min:0.5',
            'location' => 'nullable|string',
            'objectives' => 'nullable|string',
            'description' => 'nullable|string',
        ]);

        IcEducationRecord::create([
            'training_title' => $validated['topic'],
            'training_date' => $validated['training_date'],
            'training_type' => $validated['training_type'],
            'topic' => $validated['topic'],
            'target_audience' => $validated['target_audience'],
            'trainer_name' => $validated['trainer_name'],
            'duration_hours' => $validated['duration_hours'],
            'location' => $validated['location'],
            'content_summary' => $validated['objectives'],
            'notes' => $validated['description'],
            'total_participants' => 0,
            'total_passed' => 0,
            'pass_rate' => 0,
            'created_by' => Auth::id(),
        ]);

        return redirect()->back()->with('success', 'บันทึกข้อมูลการอบรมเรียบร้อยแล้ว');
    }

    public function storeEducationAttendee(Request $request, IcEducationRecord $education)
    {
        $validated = $request->validate([
            'employee_code' => 'required|string',
            'employee_name' => 'required|string',
            'department' => 'required|string',
            'post_test_score' => 'nullable|numeric|min:0|max:100',
        ]);

        $education->attendees()->create([
            ...$validated,
            'passed' => $validated['post_test_score'] >= 80,
        ]);

        // Update total_participants
        $education->increment('total_participants');
        if (($validated['post_test_score'] ?? 0) >= 80) {
            $education->increment('total_passed');
        }

        // Recalculate pass rate
        $education->update([
            'pass_rate' => $education->total_participants > 0 
                ? round(($education->total_passed / $education->total_participants) * 100, 2)
                : 0,
        ]);

        return redirect()->back()->with('success', 'เพิ่มผู้เข้าอบรมเรียบร้อยแล้ว');
    }

    // ==========================================
    // REPORTS
    // ==========================================
    public function reports(Request $request)
    {
        $startDate = $request->input('start_date', now()->startOfYear()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->format('Y-m-d'));

        // Monthly HAI Data
        $monthlyHai = $this->getMonthlyHaiData($startDate, $endDate);
        
        // Hygiene Compliance
        $hygieneCompliance = $this->getHygieneComplianceData($startDate, $endDate);
        
        // Antibiotic Stats
        $antibioticStats = $this->getAntibioticStatsData($startDate, $endDate);
        
        // Summary
        $summary = [
            'total_hai' => IcSurveillanceLog::where('status', 'confirmed')
                ->whereBetween('infection_date', [$startDate, $endDate])->count(),
            'total_patient_days' => IcDeviceDay::whereBetween('record_date', [$startDate, $endDate])
                ->sum('patient_days'),
            'avg_hai_rate' => $this->calculateAvgHaiRate($startDate, $endDate),
            'avg_compliance' => $this->calculateAvgHandHygieneCompliance($startDate, $endDate),
            'total_trainings' => IcEducationRecord::whereBetween('training_date', [$startDate, $endDate])->count(),
            'total_trained' => IcEducationRecord::whereBetween('training_date', [$startDate, $endDate])
                ->sum('total_participants'),
        ];

        // Targets
        $targets = [
            'hai_rate' => IcSetting::getValue('hai_rate_target', 5.0),
            'hand_hygiene' => IcSetting::getValue('hand_hygiene_target', 85),
            'antibiotic_appropriate' => IcSetting::getValue('antibiotic_appropriate_target', 80),
        ];

        return Inertia::render('IC/Reports', [
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'monthly_hai' => $monthlyHai,
            'hygiene_compliance' => $hygieneCompliance,
            'antibiotic_stats' => $antibioticStats,
            'summary' => $summary,
            'targets' => $targets,
        ]);
    }

    private function getMonthlyHaiData($startDate, $endDate)
    {
        $result = [];
        $start = Carbon::parse($startDate)->startOfMonth();
        $end = Carbon::parse($endDate)->endOfMonth();

        while ($start <= $end) {
            $month = $start->month;
            $year = $start->year;

            // HAI counts
            $haiCounts = IcSurveillanceLog::where('status', 'confirmed')
                ->whereMonth('infection_date', $month)
                ->whereYear('infection_date', $year)
                ->select('infection_type', DB::raw('count(*) as total'))
                ->groupBy('infection_type')
                ->pluck('total', 'infection_type');

            // Device days
            $deviceDays = IcDeviceDay::whereMonth('record_date', $month)
                ->whereYear('record_date', $year)
                ->selectRaw('
                    SUM(patient_days) as patient_days,
                    SUM(urinary_catheter_days) as catheter_days,
                    SUM(central_line_days) as central_line_days,
                    SUM(ventilator_days) as ventilator_days
                ')
                ->first();

            $patientDays = $deviceDays?->patient_days ?? 0;
            $cautiCount = $haiCounts['CAUTI'] ?? 0;
            $clabsiCount = $haiCounts['CLABSI'] ?? 0;
            $vapCount = $haiCounts['VAP'] ?? 0;

            $result[] = [
                'month' => $start->format('M Y'),
                'hai_count' => array_sum($haiCounts->toArray()),
                'patient_days' => $patientDays,
                'hai_rate' => $patientDays > 0 ? round((array_sum($haiCounts->toArray()) / $patientDays) * 1000, 2) : 0,
                'cauti_count' => $cautiCount,
                'cauti_rate' => ($deviceDays?->catheter_days ?? 0) > 0 ? round(($cautiCount / $deviceDays->catheter_days) * 1000, 2) : 0,
                'clabsi_count' => $clabsiCount,
                'clabsi_rate' => ($deviceDays?->central_line_days ?? 0) > 0 ? round(($clabsiCount / $deviceDays->central_line_days) * 1000, 2) : 0,
                'vap_count' => $vapCount,
                'vap_rate' => ($deviceDays?->ventilator_days ?? 0) > 0 ? round(($vapCount / $deviceDays->ventilator_days) * 1000, 2) : 0,
            ];

            $start->addMonth();
        }

        return $result;
    }

    private function getHygieneComplianceData($startDate, $endDate)
    {
        $result = [];
        $start = Carbon::parse($startDate)->startOfMonth();
        $end = Carbon::parse($endDate)->endOfMonth();

        while ($start <= $end) {
            $data = IcHandHygieneObservation::whereMonth('observation_date', $start->month)
                ->whereYear('observation_date', $start->year)
                ->selectRaw('
                    SUM(moment_1_opportunities + moment_2_opportunities + moment_3_opportunities + moment_4_opportunities + moment_5_opportunities) as total_opportunities,
                    SUM(moment_1_compliances + moment_2_compliances + moment_3_compliances + moment_4_compliances + moment_5_compliances) as compliant
                ')
                ->first();

            $result[] = [
                'month' => $start->format('M Y'),
                'total_observations' => $data?->total_opportunities ?? 0,
                'compliant' => $data?->compliant ?? 0,
                'compliance_rate' => ($data?->total_opportunities ?? 0) > 0 
                    ? round(($data->compliant / $data->total_opportunities) * 100, 1) 
                    : 0,
            ];

            $start->addMonth();
        }

        return $result;
    }

    private function getAntibioticStatsData($startDate, $endDate)
    {
        $total = IcAntibioticUse::whereBetween('start_date', [$startDate, $endDate])->count();
        $appropriate = IcAntibioticUse::whereBetween('start_date', [$startDate, $endDate])
            ->where('appropriateness', 'appropriate')
            ->count();
        $reviewed = IcAntibioticUse::whereBetween('start_date', [$startDate, $endDate])
            ->whereIn('appropriateness', ['appropriate', 'inappropriate'])
            ->count();

        return [
            'total_uses' => $total,
            'appropriate_rate' => $reviewed > 0 ? round(($appropriate / $reviewed) * 100, 1) : 0,
            'by_class' => IcAntibioticUse::whereBetween('start_date', [$startDate, $endDate])
                ->select('antibiotic_class', DB::raw('count(*) as count'))
                ->whereNotNull('antibiotic_class')
                ->groupBy('antibiotic_class')
                ->orderByDesc('count')
                ->take(10)
                ->get(),
        ];
    }

    private function calculateAvgHaiRate($startDate, $endDate)
    {
        $totalHai = IcSurveillanceLog::where('status', 'confirmed')
            ->whereBetween('infection_date', [$startDate, $endDate])
            ->count();
        $totalPatientDays = IcDeviceDay::whereBetween('record_date', [$startDate, $endDate])
            ->sum('patient_days');

        return $totalPatientDays > 0 ? round(($totalHai / $totalPatientDays) * 1000, 2) : 0;
    }

    private function calculateAvgHandHygieneCompliance($startDate, $endDate)
    {
        $data = IcHandHygieneObservation::whereBetween('observation_date', [$startDate, $endDate])
            ->selectRaw('
                SUM(moment_1_opportunities + moment_2_opportunities + moment_3_opportunities + moment_4_opportunities + moment_5_opportunities) as total_opp,
                SUM(moment_1_compliances + moment_2_compliances + moment_3_compliances + moment_4_compliances + moment_5_compliances) as total_comp
            ')
            ->first();

        return ($data?->total_opp ?? 0) > 0 ? round(($data->total_comp / $data->total_opp) * 100, 1) : 0;
    }

    public function exportReports(Request $request)
    {
        // For now, return a simple response - can implement PDF/Excel export later
        return response()->json(['message' => 'Export functionality will be implemented']);
    }

    // ==========================================
    // SETTINGS
    // ==========================================
    public function settings()
    {
        $settings = [
            'hand_hygiene_target' => IcSetting::getValue('hand_hygiene_target', 85),
            'cauti_target' => IcSetting::getValue('cauti_target', 3.5),
            'clabsi_target' => IcSetting::getValue('clabsi_target', 1.5),
            'vap_target' => IcSetting::getValue('vap_target', 5.0),
            'hai_rate_target' => IcSetting::getValue('hai_rate_target', 5.0),
            'antibiotic_appropriate_target' => IcSetting::getValue('antibiotic_appropriate_target', 80),
            'environment_pass_target' => IcSetting::getValue('environment_pass_target', 95),
        ];

        return Inertia::render('IC/Settings', [
            'settings' => $settings,
        ]);
    }

    public function updateSettings(Request $request)
    {
        $validated = $request->validate([
            'hand_hygiene_target' => 'required|numeric|min:0|max:100',
            'cauti_target' => 'required|numeric|min:0',
            'clabsi_target' => 'required|numeric|min:0',
            'vap_target' => 'required|numeric|min:0',
            'hai_rate_target' => 'required|numeric|min:0',
            'antibiotic_appropriate_target' => 'required|numeric|min:0|max:100',
            'environment_pass_target' => 'required|numeric|min:0|max:100',
        ]);

        foreach ($validated as $key => $value) {
            IcSetting::setValue($key, $value);
        }

        return redirect()->back()->with('success', 'บันทึกการตั้งค่าเรียบร้อยแล้ว');
    }
}
