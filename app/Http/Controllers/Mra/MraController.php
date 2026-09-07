<?php

namespace App\Http\Controllers\Mra;

use App\Http\Controllers\Controller;
use App\Models\Mra\MraAudit;
use App\Models\Mra\MraAuditDetail;
use App\Models\Mra\MraCategory;
use App\Models\Mra\MraCriteria;
use App\Models\Hosxp\Patient;
use App\Services\HosxpService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class MraController extends Controller
{
    protected $hosxpService;

    public function __construct(HosxpService $hosxpService)
    {
        $this->hosxpService = $hosxpService;
    }

    /**
     * แสดงรายการ Audit ทั้งหมด
     */
    public function index(Request $request)
    {
        $query = MraAudit::with('auditor')
            ->orderBy('created_at', 'desc');

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Filter by audit_type
        if ($request->filled('audit_type')) {
            $query->where('audit_type', $request->audit_type);
        }

        // Filter by date range
        if ($request->filled('date_from')) {
            $query->whereDate('visit_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('visit_date', '<=', $request->date_to);
        }

        // Filter by score range
        if ($request->filled('score_range')) {
            switch ($request->score_range) {
                case 'high':
                    $query->where('accuracy_percentage', '>=', 90);
                    break;
                case 'medium':
                    $query->whereBetween('accuracy_percentage', [70, 89.99]);
                    break;
                case 'low':
                    $query->where('accuracy_percentage', '<', 70)
                          ->where('accuracy_percentage', '>', 0);
                    break;
            }
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('hn', 'like', "%{$search}%")
                  ->orWhere('vn', 'like', "%{$search}%")
                  ->orWhere('patient_name', 'like', "%{$search}%");
            });
        }

        $audits = $query->paginate(15)->withQueryString();

        // Get summary stats
        $stats = [
            'total' => MraAudit::count(),
            'pending' => MraAudit::where('status', 'pending')->count(),
            'in_progress' => MraAudit::where('status', 'in_progress')->count(),
            'audited' => MraAudit::whereIn('status', ['audited', 'corrected'])->count(),
            'avg_accuracy' => MraAudit::whereIn('status', ['audited', 'corrected'])
                ->avg('accuracy_percentage') ?? 0,
        ];

        return Inertia::render('MRA/Index', [
            'audits' => $audits,
            'stats' => $stats,
            'filters' => $request->only(['status', 'audit_type', 'date_from', 'date_to', 'search', 'score_range']),
        ]);
    }

    /**
     * Dashboard with statistics
     */
    public function dashboard()
    {
        // Overall stats
        $thisMonthStart = now()->startOfMonth();
        $lastMonthStart = now()->subMonth()->startOfMonth();
        $lastMonthEnd = now()->subMonth()->endOfMonth();

        $stats = [
            'total_audits' => MraAudit::count(),
            'pending_audits' => MraAudit::where('status', 'pending')->count(),
            'in_progress_audits' => MraAudit::where('status', 'in_progress')->count(),
            'completed_audits' => MraAudit::whereIn('status', ['audited', 'corrected'])->count(),
            'avg_accuracy' => round(MraAudit::whereIn('status', ['audited', 'corrected'])
                ->avg('accuracy_percentage') ?? 0, 2),
            'this_month_audits' => MraAudit::where('created_at', '>=', $thisMonthStart)->count(),
            'this_month_accuracy' => round(MraAudit::whereIn('status', ['audited', 'corrected'])
                ->where('audited_at', '>=', $thisMonthStart)
                ->avg('accuracy_percentage') ?? 0, 2),
            'last_month_accuracy' => round(MraAudit::whereIn('status', ['audited', 'corrected'])
                ->whereBetween('audited_at', [$lastMonthStart, $lastMonthEnd])
                ->avg('accuracy_percentage') ?? 0, 2),
            'target_accuracy' => 90, // เป้าหมายตามเกณฑ์ สรพ.
        ];

        // Monthly trend (last 6 months)
        $monthlyTrends = collect();
        for ($i = 5; $i >= 0; $i--) {
            $monthStart = now()->subMonths($i)->startOfMonth();
            $monthEnd = now()->subMonths($i)->endOfMonth();
            $monthLabel = $monthStart->locale('th')->isoFormat('MMM');
            
            $monthStats = MraAudit::whereIn('status', ['audited', 'corrected'])
                ->whereBetween('audited_at', [$monthStart, $monthEnd])
                ->selectRaw('COUNT(*) as total, AVG(accuracy_percentage) as accuracy')
                ->first();

            $monthlyTrends->push([
                'month' => $monthLabel,
                'total' => $monthStats->total ?? 0,
                'accuracy' => round($monthStats->accuracy ?? 0, 1),
            ]);
        }

        // Accuracy by category
        $categoryStats = MraCategory::active()
            ->with(['criteria' => function($q) {
                $q->active();
            }])
            ->get()
            ->map(function($category) {
                $details = MraAuditDetail::whereHas('criteria', function($q) use ($category) {
                    $q->where('mra_category_id', $category->id);
                })->get();

                $total = $details->whereIn('result', ['pass', 'fail'])->count();
                $passed = $details->where('result', 'pass')->count();
                $failed = $details->where('result', 'fail')->count();

                return [
                    'id' => $category->id,
                    'code' => $category->code,
                    'name' => $category->name,
                    'total_audits' => $total,
                    'pass_count' => $passed,
                    'fail_count' => $failed,
                    'accuracy' => $total > 0 ? round(($passed / $total) * 100, 1) : 0,
                ];
            });

        // Top errors
        $topErrors = MraAuditDetail::where('result', 'fail')
            ->with(['criteria.category'])
            ->select('mra_criteria_id', DB::raw('COUNT(*) as fail_count'))
            ->groupBy('mra_criteria_id')
            ->orderByDesc('fail_count')
            ->limit(10)
            ->get()
            ->map(function($item) {
                $totalAudits = MraAuditDetail::where('mra_criteria_id', $item->mra_criteria_id)->count();
                return [
                    'criteria_code' => $item->criteria?->code ?? '',
                    'criteria_name' => $item->criteria?->name ?? 'Unknown',
                    'category_name' => $item->criteria?->category?->name ?? '',
                    'fail_count' => $item->fail_count,
                    'percentage' => $totalAudits > 0 ? round(($item->fail_count / $totalAudits) * 100, 1) : 0,
                ];
            });

        // Recent audits
        $recentAudits = MraAudit::with('auditor')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function($audit) {
                return [
                    'id' => $audit->id,
                    'hn' => $audit->hn,
                    'patient_name' => $audit->patient_name,
                    'visit_date' => $audit->visit_date,
                    'status' => $audit->status,
                    'accuracy_percentage' => $audit->accuracy_percentage,
                    'auditor_name' => $audit->auditor?->name,
                    'audited_at' => $audit->audited_at,
                ];
            });

        return Inertia::render('MRA/Dashboard', [
            'stats' => $stats,
            'monthlyTrends' => $monthlyTrends,
            'categoryStats' => $categoryStats,
            'topErrors' => $topErrors,
            'recentAudits' => $recentAudits,
        ]);
    }

    /**
     * แสดงหน้าสร้าง Audit ใหม่
     */
    public function create()
    {
        return Inertia::render('MRA/Create');
    }

    /**
     * ค้นหาผู้ป่วยจาก HN
     */
    public function searchPatient(Request $request)
    {
        $hn = $request->input('hn');
        
        if (!$hn) {
            return response()->json(['error' => 'HN is required'], 400);
        }

        try {
            $patient = $this->hosxpService->findPatient($hn);

            if ($patient) {
                // ดึง visits ล่าสุด
                $recentVisits = $this->hosxpService->getRecentVisits($hn, 10);

                return response()->json([
                    'patient' => $patient,
                    'recent_visits' => $recentVisits,
                ]);
            } else {
                return response()->json(['error' => 'Patient not found'], 404);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'Database connection error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * ดึงข้อมูล Visit สำหรับ Audit
     */
    public function getVisitData(Request $request)
    {
        $vn = $request->input('vn');
        
        if (!$vn) {
            return response()->json(['error' => 'VN is required'], 400);
        }

        try {
            $data = $this->hosxpService->getMraPreFillData($vn);

            if ($data) {
                return response()->json($data);
            } else {
                return response()->json(['error' => 'Visit not found'], 404);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * ดึงเกณฑ์การตรวจสอบ
     */
    public function getCriteria(Request $request)
    {
        $auditType = $request->input('audit_type', 'opd');

        $categories = MraCategory::active()
            ->with(['criteria' => function($q) {
                $q->active()->orderBy('sort_order');
            }])
            ->get()
            ->map(function($category) {
                return [
                    'id' => $category->id,
                    'code' => $category->code,
                    'name' => $category->name,
                    'name_en' => $category->name_en,
                    'description' => $category->description,
                    'weight' => $category->weight,
                    'criteria' => $category->criteria->map(function($c) {
                        return [
                            'id' => $c->id,
                            'code' => $c->code,
                            'name' => $c->name,
                            'name_en' => $c->name_en,
                            'description' => $c->description,
                            'audit_guide' => $c->audit_guide,
                            'data_type' => $c->data_type,
                            'max_score' => $c->max_score,
                            'is_required' => $c->is_required,
                        ];
                    }),
                ];
            });

        return response()->json([
            'categories' => $categories,
            'total_criteria' => MraCriteria::active()->count(),
            'total_max_score' => MraCriteria::active()->sum('max_score'),
        ]);
    }

    /**
     * Auto-check criteria จาก HOSxP
     */
    public function autoCheck(Request $request)
    {
        $vn = $request->input('vn');
        
        if (!$vn) {
            return response()->json(['error' => 'VN is required'], 400);
        }

        $criteria = MraCriteria::active()
            ->whereIn('data_type', ['auto', 'both'])
            ->get();

        $results = [];
        foreach ($criteria as $criterion) {
            $check = $this->hosxpService->autoCheckCriteria($vn, $criterion->code);
            $results[$criterion->code] = [
                'criteria_id' => $criterion->id,
                'criteria_name' => $criterion->name,
                'passed' => $check['passed'],
                'value' => $check['value'],
                'message' => $check['message'],
                'max_score' => $criterion->max_score,
            ];
        }

        return response()->json([
            'vn' => $vn,
            'auto_checks' => $results,
            'checked_count' => count($results),
        ]);
    }

    /**
     * บันทึก Audit ใหม่
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'vn' => 'nullable|string',
            'an' => 'nullable|string',
            'hn' => 'required|string',
            'cid' => 'nullable|string|max:32',
            'patient_name' => 'required|string',
            'birthdate' => 'nullable|date',
            'pttype' => 'nullable|string',
            'pttype_name' => 'nullable|string',
            'visit_date' => 'required|date',
            'visit_time' => 'nullable|string',
            'doctor_name' => 'nullable|string',
            'doctor_code' => 'nullable|string',
            'department' => 'nullable|string',
            'department_code' => 'nullable|string',
            'chief_complaint' => 'nullable|string',
            'pdx' => 'nullable|string',
            'pdx_icd10' => 'nullable|string',
            'bp_systolic' => 'nullable|integer',
            'bp_diastolic' => 'nullable|integer',
            'pulse' => 'nullable|numeric',
            'temperature' => 'nullable|numeric',
            'respiratory_rate' => 'nullable|integer',
            'audit_type' => 'required|in:opd,ipd',
        ]);

        // ใช้ HN จาก HOSxP เป็นหลัก และดึงชื่อ/CID เต็มฝั่งเซิร์ฟเวอร์ (ไม่เชื่อค่าจากเบราว์เซอร์ที่ถูก mask)
        $hosxpPatient = $this->hosxpService->findPatient($validated['hn']);
        if ($hosxpPatient) {
            if (! empty($hosxpPatient['hn'])) {
                $validated['hn'] = $hosxpPatient['hn'];
            }
            if (! empty($hosxpPatient['patient_name'])) {
                $validated['patient_name'] = $hosxpPatient['patient_name'];
            }
            if (! empty($hosxpPatient['cid'])) {
                $validated['cid'] = preg_replace('/\D+/', '', (string) $hosxpPatient['cid']);
            }
        }
        if (! empty($validated['cid']) && (strlen((string) $validated['cid']) !== 13 || str_contains((string) $validated['cid'], '*'))) {
            $validated['cid'] = null;
        }

        $audit = MraAudit::create([
            ...$validated,
            'auditor_id' => Auth::id(),
            'status' => 'pending',
        ]);

        return redirect()->route('mra.audit', $audit->id)
            ->with('success', 'สร้าง Audit สำเร็จ กรุณาดำเนินการตรวจสอบ');
    }

    /**
     * หน้าตรวจสอบ Audit
     */
    public function audit(MraAudit $audit)
    {
        $audit->load(['details.criteria.category', 'auditor']);

        // Get all criteria
        $categories = MraCategory::active()
            ->with(['criteria' => function($q) {
                $q->active()->orderBy('sort_order');
            }])
            ->get();

        // Prepare existing results
        $existingResults = $audit->details->keyBy('mra_criteria_id');

        return Inertia::render('MRA/AuditForm', [
            'audit' => $audit,
            'categories' => $categories,
            'existingResults' => $existingResults,
        ]);
    }

    /**
     * บันทึกผลการตรวจสอบ
     */
    public function saveAuditResults(Request $request, MraAudit $audit)
    {
        $validated = $request->validate([
            'results' => 'required|array',
            'results.*.criteria_id' => 'required|exists:mra_criteria,id',
            'results.*.result' => 'required|in:pass,fail,na,pending',
            'results.*.hosxp_value' => 'nullable|string',
            'results.*.auditor_comment' => 'nullable|string',
            'summary_notes' => 'nullable|string',
            'finalize' => 'boolean',
        ]);

        DB::transaction(function() use ($validated, $audit) {
            // ลบ details เก่า
            $audit->details()->delete();

            // บันทึก details ใหม่
            foreach ($validated['results'] as $result) {
                $criteria = MraCriteria::find($result['criteria_id']);
                
                $obtainedScore = 0;
                if ($result['result'] === 'pass') {
                    $obtainedScore = $criteria->max_score;
                }

                $audit->details()->create([
                    'mra_criteria_id' => $result['criteria_id'],
                    'category' => $criteria->category->name,
                    'item_code' => $criteria->code,
                    'item_description' => $criteria->name,
                    'hosxp_value' => $result['hosxp_value'] ?? null,
                    'max_score' => $criteria->max_score,
                    'obtained_score' => $obtainedScore,
                    'is_correct' => $result['result'] === 'pass',
                    'result' => $result['result'],
                    'auditor_comment' => $result['auditor_comment'] ?? null,
                ]);
            }

            // Update audit notes
            if (isset($validated['summary_notes'])) {
                $audit->update(['summary_notes' => $validated['summary_notes']]);
            }

            // Calculate and update scores
            $audit->calculateScores();

            // Finalize if requested
            if ($validated['finalize'] ?? false) {
                $audit->markAsAudited();
            }
        });

        $message = ($validated['finalize'] ?? false) 
            ? 'บันทึกและสรุปผลการตรวจสอบเรียบร้อยแล้ว' 
            : 'บันทึกผลการตรวจสอบเรียบร้อยแล้ว';

        return redirect()->back()->with('success', $message);
    }

    /**
     * แสดงรายละเอียด Audit
     */
    public function show(MraAudit $audit)
    {
        $audit->load(['details.criteria.category', 'auditor']);
        
        // Get all categories with criteria
        $categories = MraCategory::active()
            ->with(['criteria' => function($q) {
                $q->active()->orderBy('sort_order');
            }])
            ->get();

        return Inertia::render('MRA/Show', [
            'audit' => $audit,
            'categories' => $categories,
        ]);
    }

    /**
     * Update existing audit (legacy)
     */
    public function update(Request $request, MraAudit $audit)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,audited,corrected',
            'summary_notes' => 'nullable|string',
        ]);

        $audit->update($validated);

        if ($validated['status'] === 'audited') {
            $audit->calculateScores();
            $audit->update(['audited_at' => now()]);
        }

        return redirect()->back()->with('success', 'Audit updated successfully.');
    }

    /**
     * ลบ Audit
     */
    public function destroy(MraAudit $audit)
    {
        $audit->delete();
        return redirect()->route('mra.index')->with('success', 'ลบ Audit เรียบร้อยแล้ว');
    }

    /**
     * Statistics API
     */
    public function statistics(Request $request)
    {
        $fromDate = $request->input('from_date', now()->startOfMonth()->format('Y-m-d'));
        $toDate = $request->input('to_date', now()->format('Y-m-d'));

        $stats = [
            'period' => [
                'from' => $fromDate,
                'to' => $toDate,
            ],
            'summary' => [
                'total_audits' => MraAudit::whereBetween('visit_date', [$fromDate, $toDate])->count(),
                'completed_audits' => MraAudit::where('status', 'audited')
                    ->whereBetween('visit_date', [$fromDate, $toDate])->count(),
                'avg_accuracy' => round(MraAudit::where('status', 'audited')
                    ->whereBetween('visit_date', [$fromDate, $toDate])
                    ->avg('accuracy_percentage') ?? 0, 2),
                'target' => 90,
            ],
        ];

        return response()->json($stats);
    }

    /**
     * รายงาน MRA
     */
    public function reports(Request $request)
    {
        $fromDate = $request->input('from_date', now()->startOfMonth()->format('Y-m-d'));
        $toDate = $request->input('to_date', now()->format('Y-m-d'));

        // Statistics summary
        $stats = [
            'total_audits' => MraAudit::whereBetween('visit_date', [$fromDate, $toDate])->count(),
            'completed_audits' => MraAudit::whereIn('status', ['audited', 'corrected'])
                ->whereBetween('visit_date', [$fromDate, $toDate])->count(),
            'avg_accuracy' => round(MraAudit::whereIn('status', ['audited', 'corrected'])
                ->whereBetween('visit_date', [$fromDate, $toDate])
                ->avg('accuracy_percentage') ?? 0, 2),
            'target' => 90,
        ];

        // Category statistics
        $categoryStats = MraCategory::active()
            ->get()
            ->map(function($category) use ($fromDate, $toDate) {
                $details = MraAuditDetail::whereHas('audit', function($q) use ($fromDate, $toDate) {
                    $q->whereBetween('visit_date', [$fromDate, $toDate])
                      ->whereIn('status', ['audited', 'corrected']);
                })->whereHas('criteria', function($q) use ($category) {
                    $q->where('mra_category_id', $category->id);
                })->get();

                $total = $details->whereIn('result', ['pass', 'fail'])->count();
                $passed = $details->where('result', 'pass')->count();

                return [
                    'id' => $category->id,
                    'code' => $category->code,
                    'name' => $category->name,
                    'total' => $total,
                    'passed' => $passed,
                    'failed' => $total - $passed,
                    'accuracy' => $total > 0 ? round(($passed / $total) * 100, 1) : 0,
                ];
            });

        // Top errors
        $topErrors = MraAuditDetail::where('result', 'fail')
            ->whereHas('audit', function($q) use ($fromDate, $toDate) {
                $q->whereBetween('visit_date', [$fromDate, $toDate]);
            })
            ->with(['criteria.category'])
            ->select('mra_criteria_id', DB::raw('COUNT(*) as fail_count'))
            ->groupBy('mra_criteria_id')
            ->orderByDesc('fail_count')
            ->limit(10)
            ->get()
            ->map(function($item) {
                return [
                    'criteria_code' => $item->criteria?->code ?? '',
                    'criteria_name' => $item->criteria?->name ?? 'Unknown',
                    'category_name' => $item->criteria?->category?->name ?? '',
                    'fail_count' => $item->fail_count,
                ];
            });

        return Inertia::render('MRA/Reports', [
            'stats' => $stats,
            'categoryStats' => $categoryStats,
            'topErrors' => $topErrors,
            'filters' => [
                'from_date' => $fromDate,
                'to_date' => $toDate,
            ],
        ]);
    }

    /**
     * ตั้งค่า MRA
     */
    public function settings()
    {
        $categories = MraCategory::with(['criteria' => function($q) {
            $q->orderBy('sort_order');
        }])->orderBy('sort_order')->get();

        return Inertia::render('MRA/Settings', [
            'categories' => $categories,
        ]);
    }
}
