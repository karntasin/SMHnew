<?php

namespace App\Http\Controllers\Mra;

use App\Http\Controllers\Controller;
use App\Models\Mra\MraAudit;
use App\Models\Mra\MraAuditDetail;
use App\Models\Mra\MraCategory;
use App\Models\Mra\MraCriteria;
use App\Models\Hosxp\Patient;
use App\Services\HosxpService;
use App\Services\ThaiPdfService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class MraController extends Controller
{
    private const HOSPITAL_NAME = 'โรงพยาบาลค่ายสุรสิงหนาท';

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
        return Inertia::render('MRA/Dashboard', $this->dashboardPayload());
    }

    public function exportDashboardPdf(ThaiPdfService $pdf): Response
    {
        $data = $this->dashboardPayload();
        [$fontRegularUri, $fontBoldUri] = $pdf->fontUris();
        $now = now()->timezone(config('app.timezone'));

        $html = view('mra.dashboard-pdf', [
            'hospitalName' => self::HOSPITAL_NAME,
            'stats' => $data['stats'],
            'monthlyTrends' => $data['monthlyTrends'],
            'categoryStats' => $data['categoryStats'],
            'topErrors' => $data['topErrors'],
            'recentAudits' => $data['recentAudits'],
            'generatedAt' => $this->formatThaiDateTime($now),
            'generatedAtDate' => $this->formatThaiDate($now),
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
            'statusLabel' => fn (string $status) => $this->mraStatusLabel($status),
            'formatVisitDate' => function ($value) {
                if (! $value) {
                    return '-';
                }

                return $this->formatThaiDate(Carbon::parse($value)->timezone(config('app.timezone')));
            },
        ])->render();

        return response($pdf->render($html, 'portrait', true), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="ภาพรวม-MRA.pdf"',
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
                // ใช้ HN จาก HOSxP (มีศูนย์นำหน้า) เพื่อดึง visits และบันทึกต่อ
                $canonicalHn = $patient['hn'] ?? $this->hosxpService->normalizeHn($hn);
                $visitType = $request->input('visit_type');
                $limit = min(max((int) $request->input('limit', 30), 5), 100);
                $recentVisits = $this->hosxpService->getRecentVisits($canonicalHn, $limit, $visitType);

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
            ->forAuditType($auditType)
            ->with(['criteria' => function ($q) {
                $q->active()->orderBy('sort_order');
            }])
            ->get()
            ->map(fn ($category) => $this->serializeCategory($category));

        $criteriaQuery = MraCriteria::active()->whereHas('category', fn ($q) => $q->forAuditType($auditType)->active());

        return response()->json([
            'categories' => $categories,
            'audit_type' => $auditType,
            'standard' => 'MRA 2563 (สปสช./สรพ./HA)',
            'passing_score' => 80,
            'total_criteria' => (clone $criteriaQuery)->count(),
            'total_max_score' => (clone $criteriaQuery)->sum('max_score'),
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

        $auditType = $request->input('audit_type');

        $criteria = MraCriteria::active()
            ->whereIn('data_type', ['auto', 'both'])
            ->when($auditType, function ($q) use ($auditType) {
                $q->whereHas('category', fn ($cq) => $cq->forAuditType($auditType)->active());
            })
            ->get();

        $results = [];
        foreach ($criteria as $criterion) {
            $check = $this->hosxpService->autoCheckCriteria($vn, $criterion->code);
            $results[$criterion->code] = [
                'criteria_id' => $criterion->id,
                'criteria_name' => $criterion->name,
                'passed' => $check['passed'],
                'value' => $check['value'] ?? null,
                'message' => $check['message'] ?? null,
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
        $validated['hn'] = $hosxpPatient['hn'] ?? $this->hosxpService->normalizeHn($validated['hn']);
        if ($hosxpPatient) {
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
        if (! empty($validated['vn'])) {
            $validated['vn'] = (string) $validated['vn'];
        }
        if (! empty($validated['an'])) {
            $validated['an'] = (string) $validated['an'];
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

        $categories = MraCategory::active()
            ->forAuditType($audit->audit_type ?: 'opd')
            ->with(['criteria' => function ($q) {
                $q->active()->orderBy('sort_order');
            }])
            ->get()
            ->map(fn ($category) => $this->serializeCategory($category));

        $existingResults = $audit->details->keyBy('mra_criteria_id');

        return Inertia::render('MRA/AuditForm', [
            'audit' => $audit,
            'categories' => $categories,
            'existingResults' => $existingResults,
            'passingScore' => 80,
            'standardLabel' => 'MRA 2563 · ' . strtoupper($audit->audit_type ?: 'opd'),
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
            $scores = $audit->calculateScores();

            // Finalize if requested
            if ($validated['finalize'] ?? false) {
                if (($scores['total_max_score'] ?? 0) <= 0) {
                    abort(422, 'ไม่สามารถสรุปผลได้ เพราะทุกรายการเป็น N/A — กรุณาประเมินอย่างน้อย 1 ข้อ');
                }
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
        
        $categories = MraCategory::active()
            ->forAuditType($audit->audit_type ?: 'opd')
            ->with(['criteria' => function ($q) {
                $q->active()->orderBy('sort_order');
            }])
            ->get()
            ->map(fn ($category) => $this->serializeCategory($category));

        return Inertia::render('MRA/Show', [
            'audit' => $audit,
            'categories' => $categories,
            'passingScore' => 80,
        ]);
    }

    /**
     * ส่งออกรายงาน PDF ผลการตรวจสอบเวชระเบียน
     */
    public function exportPdf(MraAudit $audit, ThaiPdfService $pdf): Response
    {
        $audit->load(['details.criteria.category', 'auditor']);

        $categories = MraCategory::active()
            ->forAuditType($audit->audit_type ?: 'opd')
            ->with(['criteria' => function ($q) {
                $q->active()->orderBy('sort_order');
            }])
            ->get();

        $detailsByCriteria = $audit->details->keyBy('mra_criteria_id');

        $categoryBlocks = $categories->map(function (MraCategory $category) use ($detailsByCriteria) {
            $rows = $category->criteria->map(function ($criterion) use ($detailsByCriteria, $category) {
                $detail = $detailsByCriteria->get($criterion->id);
                $result = $detail?->result ?? 'pending';
                $maxScore = (float) ($detail?->max_score ?? $criterion->max_score ?? 0);
                $obtained = $result === 'pass' ? $maxScore : 0;

                return [
                    'code' => $criterion->code,
                    'name' => $criterion->name,
                    'hosxp_value' => $detail?->hosxp_value,
                    'result' => $result,
                    'max_score' => $maxScore,
                    'obtained_score' => $obtained,
                    'comment' => trim((string) ($detail?->auditor_comment ?? '')),
                ];
            })->values();

            $scored = $rows->filter(fn ($r) => in_array($r['result'], ['pass', 'fail'], true));
            $pass = $scored->where('result', 'pass')->count();
            $fail = $scored->where('result', 'fail')->count();
            $maxScore = $scored->sum('max_score');
            $obtainedScore = $scored->where('result', 'pass')->sum('max_score');

            return [
                'code' => $category->code,
                'name' => $category->name,
                'name_en' => $category->name_en,
                'pass' => $pass,
                'fail' => $fail,
                'na' => $rows->where('result', 'na')->count(),
                'max_score' => $maxScore,
                'obtained_score' => $obtainedScore,
                'percent' => $maxScore > 0 ? round(($obtainedScore / $maxScore) * 100, 1) : 0,
                'rows' => $rows,
            ];
        })->values();

        $failedItems = $categoryBlocks
            ->flatMap(function ($block) {
                return collect($block['rows'])
                    ->where('result', 'fail')
                    ->map(fn ($row) => array_merge($row, [
                        'category_code' => $block['code'],
                        'category_name' => $block['name'],
                    ]));
            })
            ->values();

        $failCount = max(0, (int) ($audit->total_items ?? 0) - (int) ($audit->correct_items ?? 0));
        if ($failCount === 0 && $failedItems->isNotEmpty()) {
            $failCount = $failedItems->count();
        }

        [$fontRegularUri, $fontBoldUri] = $pdf->fontUris();
        $now = now()->timezone(config('app.timezone'));

        $statusLabels = [
            'pending' => 'รอตรวจสอบ',
            'in_progress' => 'กำลังตรวจสอบ',
            'audited' => 'ตรวจสอบแล้ว',
            'corrected' => 'แก้ไขแล้ว',
        ];

        $html = view('mra.audit-result-pdf', [
            'hospitalName' => self::HOSPITAL_NAME,
            'audit' => $audit,
            'patientNameMasked' => \App\Support\PiiMask::patientName($audit->patient_name),
            'cidMasked' => \App\Support\PiiMask::cid($audit->cid),
            'categoryBlocks' => collect(\App\Support\PiiMask::maskTree($categoryBlocks->toArray())),
            'failedItems' => collect(\App\Support\PiiMask::maskTree($failedItems->toArray())),
            'failCount' => $failCount,
            'statusLabel' => $statusLabels[$audit->status] ?? $audit->status,
            'auditTypeLabel' => strtoupper((string) ($audit->audit_type ?: 'opd')),
            'generatedAt' => $this->formatThaiDateTime($now),
            'generatedAtDate' => $this->formatThaiDate($now),
            'visitDateLabel' => $audit->visit_date
                ? $this->formatThaiDate(Carbon::parse($audit->visit_date)->timezone(config('app.timezone')))
                : '-',
            'auditedAtLabel' => $audit->audited_at
                ? $this->formatThaiDateTime(Carbon::parse($audit->audited_at)->timezone(config('app.timezone')))
                : null,
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
        ])->render();

        $filename = 'MRA-'.$audit->hn.'-'.$audit->id.'.pdf';

        return response($pdf->render($html, 'portrait'), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
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
     * รายงาน MRA — แยก OPD / IPD
     */
    public function reports(Request $request)
    {
        $fromDate = $request->input('from_date', now()->startOfMonth()->format('Y-m-d'));
        $toDate = $request->input('to_date', now()->format('Y-m-d'));
        $channel = $request->input('channel', 'all');

        return Inertia::render('MRA/Reports', $this->reportsPayload($fromDate, $toDate, $channel));
    }

    public function exportReportsPdf(Request $request, ThaiPdfService $pdf): Response
    {
        $fromDate = $request->input('from_date', now()->startOfMonth()->format('Y-m-d'));
        $toDate = $request->input('to_date', now()->format('Y-m-d'));
        $channel = $request->input('channel', 'all');
        $data = $this->reportsPayload($fromDate, $toDate, $channel);
        $channel = $data['filters']['channel'];
        $overviewStats = match ($channel) {
            'opd' => $data['opd']['stats'],
            'ipd' => $data['ipd']['stats'],
            default => $data['stats'],
        };

        [$fontRegularUri, $fontBoldUri] = $pdf->fontUris();
        $now = now()->timezone(config('app.timezone'));
        $channelLabel = match ($data['filters']['channel']) {
            'opd' => 'ผู้ป่วยนอก (OPD)',
            'ipd' => 'ผู้ป่วยใน (IPD)',
            default => 'ทั้งหมด (OPD + IPD)',
        };

        $html = view('mra.reports-pdf', [
            'hospitalName' => self::HOSPITAL_NAME,
            'stats' => $overviewStats,
            'opd' => $data['opd'],
            'ipd' => $data['ipd'],
            'filters' => $data['filters'],
            'channelLabel' => $channelLabel,
            'fromDateLabel' => $this->formatThaiDate(Carbon::parse($data['filters']['from_date'])->timezone(config('app.timezone'))),
            'toDateLabel' => $this->formatThaiDate(Carbon::parse($data['filters']['to_date'])->timezone(config('app.timezone'))),
            'generatedAt' => $this->formatThaiDateTime($now),
            'generatedAtDate' => $this->formatThaiDate($now),
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
        ])->render();

        return response($pdf->render($html, 'portrait', true), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="รายงานสรุป-MRA.pdf"',
        ]);
    }

    /**
     * ตั้งค่า MRA
     */
    public function settings()
    {
        $categories = MraCategory::with(['criteria' => function ($q) {
            $q->orderBy('sort_order');
        }])
            ->orderBy('audit_type')
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($category) => $this->serializeCategory($category));

        return Inertia::render('MRA/Settings', [
            'categories' => $categories,
            'standardLabel' => 'Medical Record Audit Guideline ปี 2563 (สปสช./สรพ./HA)',
            'passingScore' => 80,
            'opdCount' => MraCategory::where('audit_type', 'opd')->count(),
            'ipdCount' => MraCategory::where('audit_type', 'ipd')->count(),
        ]);
    }

    /**
     * คู่มือใช้งานระบบ MRA
     */
    public function guide()
    {
        return Inertia::render('MRA/Guide');
    }

    private function serializeCategory(MraCategory $category): array
    {
        return [
            'id' => $category->id,
            'code' => $category->code,
            'audit_type' => $category->audit_type,
            'section_key' => $category->section_key,
            'name' => $category->name,
            'name_en' => $category->name_en,
            'description' => $category->description,
            'hint' => $category->hint,
            'weight' => $category->weight,
            'is_conditional' => (bool) $category->is_conditional,
            'is_required_section' => (bool) $category->is_required_section,
            'criteria' => $category->criteria->map(function ($c) {
                return [
                    'id' => $c->id,
                    'code' => $c->code,
                    'group_key' => $c->group_key,
                    'group_title' => $c->group_title,
                    'name' => $c->name,
                    'name_en' => $c->name_en,
                    'description' => $c->description,
                    'audit_guide' => $c->audit_guide,
                    'data_type' => $c->data_type,
                    'max_score' => $c->max_score,
                    'is_required' => (bool) $c->is_required,
                    'is_bonus' => (bool) $c->is_bonus,
                    'is_active' => (bool) $c->is_active,
                    'sort_order' => $c->sort_order,
                ];
            })->values(),
        ];
    }

    /**
     * @return array{stats: array, monthlyTrends: \Illuminate\Support\Collection, categoryStats: \Illuminate\Support\Collection, topErrors: \Illuminate\Support\Collection, recentAudits: \Illuminate\Support\Collection}
     */
    private function dashboardPayload(): array
    {
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
            'target_accuracy' => 90,
        ];

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

        $categoryStats = MraCategory::active()
            ->orderBy('audit_type')
            ->orderBy('sort_order')
            ->get()
            ->map(function ($category) {
                $details = MraAuditDetail::whereHas('criteria', function ($q) use ($category) {
                    $q->where('mra_category_id', $category->id);
                })->get();

                $total = $details->whereIn('result', ['pass', 'fail'])->count();
                $passed = $details->where('result', 'pass')->count();
                $failed = $details->where('result', 'fail')->count();

                return [
                    'id' => $category->id,
                    'code' => $category->code,
                    'name' => $category->name,
                    'audit_type' => $category->audit_type,
                    'total_audits' => $total,
                    'pass_count' => $passed,
                    'fail_count' => $failed,
                    'accuracy' => $total > 0 ? round(($passed / $total) * 100, 1) : 0,
                ];
            });

        $topErrors = MraAuditDetail::where('result', 'fail')
            ->with(['criteria.category'])
            ->select('mra_criteria_id', DB::raw('COUNT(*) as fail_count'))
            ->groupBy('mra_criteria_id')
            ->orderByDesc('fail_count')
            ->limit(10)
            ->get()
            ->map(function ($item) {
                $totalAudits = MraAuditDetail::where('mra_criteria_id', $item->mra_criteria_id)->count();

                return [
                    'criteria_code' => $item->criteria?->code ?? '',
                    'criteria_name' => $item->criteria?->name ?? 'Unknown',
                    'category_name' => $item->criteria?->category?->name ?? '',
                    'fail_count' => $item->fail_count,
                    'percentage' => $totalAudits > 0 ? round(($item->fail_count / $totalAudits) * 100, 1) : 0,
                ];
            });

        $recentAudits = MraAudit::with('auditor')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($audit) {
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

        return [
            'stats' => $stats,
            'monthlyTrends' => $monthlyTrends,
            'categoryStats' => $categoryStats,
            'topErrors' => $topErrors,
            'recentAudits' => $recentAudits,
        ];
    }

    /**
     * @return array{stats: array, opd: array, ipd: array, categoryStats: \Illuminate\Support\Collection, topErrors: \Illuminate\Support\Collection, filters: array}
     */
    private function reportsPayload(string $fromDate, string $toDate, string $channel): array
    {
        $channel = in_array($channel, ['all', 'opd', 'ipd'], true) ? $channel : 'all';

        $buildStats = function (?string $auditType) use ($fromDate, $toDate) {
            $query = MraAudit::whereBetween('visit_date', [$fromDate, $toDate]);
            if ($auditType) {
                $query->where('audit_type', $auditType);
            }

            $completed = (clone $query)->whereIn('status', ['audited', 'corrected']);

            return [
                'total_audits' => (clone $query)->count(),
                'completed_audits' => (clone $completed)->count(),
                'avg_accuracy' => round((clone $completed)->avg('accuracy_percentage') ?? 0, 2),
                'passed_audits' => (clone $completed)->where('accuracy_percentage', '>=', 80)->count(),
                'target' => 80,
            ];
        };

        $buildCategoryStats = function (string $auditType) use ($fromDate, $toDate) {
            return MraCategory::active()
                ->forAuditType($auditType)
                ->orderBy('sort_order')
                ->get()
                ->map(function ($category) use ($fromDate, $toDate, $auditType) {
                    $details = MraAuditDetail::whereHas('audit', function ($q) use ($fromDate, $toDate, $auditType) {
                        $q->whereBetween('visit_date', [$fromDate, $toDate])
                            ->where('audit_type', $auditType)
                            ->whereIn('status', ['audited', 'corrected']);
                    })->whereHas('criteria', function ($q) use ($category) {
                        $q->where('mra_category_id', $category->id);
                    })->get();

                    $total = $details->whereIn('result', ['pass', 'fail'])->count();
                    $passed = $details->where('result', 'pass')->count();

                    return [
                        'id' => $category->id,
                        'code' => $category->code,
                        'name' => $category->name,
                        'audit_type' => $auditType,
                        'total' => $total,
                        'passed' => $passed,
                        'failed' => $total - $passed,
                        'accuracy' => $total > 0 ? round(($passed / $total) * 100, 1) : 0,
                    ];
                })
                ->values();
        };

        $buildTopErrors = function (string $auditType) use ($fromDate, $toDate) {
            return MraAuditDetail::where('result', 'fail')
                ->whereHas('audit', function ($q) use ($fromDate, $toDate, $auditType) {
                    $q->whereBetween('visit_date', [$fromDate, $toDate])
                        ->where('audit_type', $auditType)
                        ->whereIn('status', ['audited', 'corrected']);
                })
                ->whereHas('criteria.category', function ($q) use ($auditType) {
                    $q->where('audit_type', $auditType);
                })
                ->with(['criteria.category'])
                ->select('mra_criteria_id', DB::raw('COUNT(*) as fail_count'))
                ->groupBy('mra_criteria_id')
                ->orderByDesc('fail_count')
                ->limit(10)
                ->get()
                ->map(function ($item) use ($auditType) {
                    return [
                        'criteria_code' => $item->criteria?->code ?? '',
                        'criteria_name' => $item->criteria?->name ?? 'Unknown',
                        'category_name' => $item->criteria?->category?->name ?? '',
                        'audit_type' => $auditType,
                        'fail_count' => $item->fail_count,
                    ];
                })
                ->values();
        };

        $opdCategories = $buildCategoryStats('opd');
        $ipdCategories = $buildCategoryStats('ipd');
        $opdErrors = $buildTopErrors('opd');
        $ipdErrors = $buildTopErrors('ipd');

        return [
            'stats' => $buildStats(null),
            'opd' => [
                'stats' => $buildStats('opd'),
                'categoryStats' => $opdCategories,
                'topErrors' => $opdErrors,
            ],
            'ipd' => [
                'stats' => $buildStats('ipd'),
                'categoryStats' => $ipdCategories,
                'topErrors' => $ipdErrors,
            ],
            'categoryStats' => $opdCategories->concat($ipdCategories)->values(),
            'topErrors' => $opdErrors->concat($ipdErrors)
                ->sortByDesc('fail_count')
                ->take(10)
                ->values(),
            'filters' => [
                'from_date' => $fromDate,
                'to_date' => $toDate,
                'channel' => $channel,
            ],
        ];
    }

    private function mraStatusLabel(string $status): string
    {
        return match ($status) {
            'pending' => 'รอตรวจสอบ',
            'in_progress' => 'กำลังตรวจ',
            'audited' => 'เสร็จสิ้น',
            'corrected' => 'แก้ไขแล้ว',
            default => $status,
        };
    }

    private function formatThaiDate(Carbon $dt): string
    {
        $months = [1 => 'ม.ค.', 2 => 'ก.พ.', 3 => 'มี.ค.', 4 => 'เม.ย.', 5 => 'พ.ค.', 6 => 'มิ.ย.',
            7 => 'ก.ค.', 8 => 'ส.ค.', 9 => 'ก.ย.', 10 => 'ต.ค.', 11 => 'พ.ย.', 12 => 'ธ.ค.'];

        return $dt->day.' '.$months[(int) $dt->month].' '.($dt->year + 543);
    }

    private function formatThaiDateTime(Carbon $dt): string
    {
        return $this->formatThaiDate($dt).' เวลา '.$dt->format('H:i').' น.';
    }
}
