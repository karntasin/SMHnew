<?php

namespace App\Http\Controllers\Im;

use App\Http\Controllers\Controller;
use App\Models\Im\MrAudit;
use App\Models\Mra\MraAudit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class MedicalRecordController extends Controller
{
    public function index(Request $request): Response
    {
        $type = $request->query('type'); // OPD|IPD|null

        $query = MrAudit::query()->with('creator:id,name')->latest('audit_date');
        if (in_array($type, ['OPD', 'IPD'], true)) {
            $query->where('record_type', $type);
        }
        $audits = $query->take(300)->get();

        $opd = $audits->where('record_type', 'OPD');
        $ipd = $audits->where('record_type', 'IPD');

        // คะแนนเฉลี่ยรายหัวข้อ (Quality Development Plan)
        $itemScores = [];
        foreach ($audits as $audit) {
            foreach (($audit->items ?? []) as $item) {
                $name = $item['name'] ?? null;
                if (! $name) {
                    continue;
                }
                $itemScores[$name][] = (float) ($item['percent'] ?? 0);
            }
        }
        $byItem = collect($itemScores)->map(fn ($scores, $name) => [
            'name' => $name,
            'avg' => round(array_sum($scores) / count($scores), 1),
            'count' => count($scores),
        ])->values()->sortBy('avg')->values();

        // คะแนนเฉลี่ยรายแพทย์
        $byDoctor = $audits->whereNotNull('doctor')->groupBy('doctor')->map(fn ($rows, $doctor) => [
            'doctor' => $doctor,
            'avg' => round($rows->avg('percent'), 1),
            'count' => $rows->count(),
        ])->values()->sortByDesc('avg')->values();

        return Inertia::render('Im/MedicalRecord', [
            'type' => $type,
            'audits' => $audits->values(),
            'byItem' => $byItem,
            'byDoctor' => $byDoctor,
            'summary' => [
                'total' => $audits->count(),
                'opd_avg' => $opd->count() ? round($opd->avg('percent'), 1) : 0,
                'ipd_avg' => $ipd->count() ? round($ipd->avg('percent'), 1) : 0,
                'above_80' => $audits->where('percent', '>=', 80)->count(),
                'above_95' => $audits->where('percent', '>=', 95)->count(),
                'discrepancies' => $audits->filter(fn ($a) => ! empty($a->discrepancy))->count(),
            ],
            'mra' => $this->mraReport(in_array($type, ['OPD', 'IPD'], true) ? $type : null),
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validateAudit($request);
        $data = $this->computeScore($data);
        $data['created_by'] = Auth::id();

        MrAudit::create($data);

        return back()->with('success', 'บันทึกการตรวจเวชระเบียนเรียบร้อย');
    }

    public function update(Request $request, MrAudit $audit)
    {
        $data = $this->validateAudit($request);
        $data = $this->computeScore($data);
        $audit->update($data);

        return back()->with('success', 'อัปเดตการตรวจเวชระเบียนเรียบร้อย');
    }

    public function destroy(MrAudit $audit)
    {
        $audit->delete();

        return back()->with('success', 'ลบรายการเรียบร้อย');
    }

    private function computeScore(array $data): array
    {
        $items = $data['items'] ?? [];
        $total = 0;
        $max = 0;
        foreach ($items as &$item) {
            $score = (float) ($item['score'] ?? 0);
            $maxItem = (float) ($item['max'] ?? 0);
            $total += $score;
            $max += $maxItem;
            $item['percent'] = $maxItem > 0 ? round($score / $maxItem * 100, 1) : 0;
        }
        unset($item);

        $data['items'] = $items;
        $data['total_score'] = $total;
        $data['max_score'] = $max ?: 100;
        $data['percent'] = $max > 0 ? round($total / $max * 100, 1) : 0;
        $data['star_level'] = $data['percent'] >= 95 ? 3 : ($data['percent'] >= 80 ? 2 : 1);

        return $data;
    }

    private function validateAudit(Request $request): array
    {
        return $request->validate([
            'record_type' => 'required|in:OPD,IPD',
            'patient_ref' => 'nullable|string|max:32',
            'doctor' => 'nullable|string|max:255',
            'audit_date' => 'required|date',
            'auditor' => 'nullable|string|max:255',
            'items' => 'nullable|array',
            'items.*.name' => 'required|string|max:255',
            'items.*.score' => 'required|numeric|min:0',
            'items.*.max' => 'required|numeric|min:0',
            'note' => 'nullable|string',
            'print_checked' => 'boolean',
            'discrepancy' => 'nullable|string',
        ]);
    }

    /**
     * สรุปผลการตรวจจากระบบ MRA (สรพ. 2563) เพื่อรายงานในหน้า IM หมวดเวชระเบียน
     *
     * @return array{
     *     summary: array<string, float|int>,
     *     monthly: list<array{month: string, total: int, avg: float}>,
     *     by_category: list<array{id: int, code: string, name: string, audit_type: string, total: int, passed: int, avg: float}>,
     *     by_doctor: list<array{doctor: string, avg: float, count: int}>,
     *     top_errors: list<array{criteria_code: string, criteria_name: string, category_name: string, fail_count: int}>,
     *     audits: list<array<string, mixed>>
     * }
     */
    private function mraReport(?string $type): array
    {
        $mraType = $type ? strtolower($type) : null;
        $completedStatuses = ['audited', 'corrected'];

        $base = MraAudit::query()->when($mraType, fn ($q) => $q->where('audit_type', $mraType));
        $completed = (clone $base)->whereIn('status', $completedStatuses);

        $opdAvg = round((float) (MraAudit::query()
            ->where('audit_type', 'opd')
            ->when($mraType, fn ($q) => $q->where('audit_type', $mraType))
            ->whereIn('status', $completedStatuses)
            ->avg('accuracy_percentage') ?? 0), 1);
        $ipdAvg = round((float) (MraAudit::query()
            ->where('audit_type', 'ipd')
            ->when($mraType, fn ($q) => $q->where('audit_type', $mraType))
            ->whereIn('status', $completedStatuses)
            ->avg('accuracy_percentage') ?? 0), 1);

        $thaiMonths = [1 => 'ม.ค.', 2 => 'ก.พ.', 3 => 'มี.ค.', 4 => 'เม.ย.', 5 => 'พ.ค.', 6 => 'มิ.ย.',
            7 => 'ก.ค.', 8 => 'ส.ค.', 9 => 'ก.ย.', 10 => 'ต.ค.', 11 => 'พ.ย.', 12 => 'ธ.ค.'];

        $monthly = [];
        for ($i = 5; $i >= 0; $i--) {
            $start = now()->subMonths($i)->startOfMonth();
            $end = now()->subMonths($i)->endOfMonth();
            $row = (clone $completed)
                ->whereBetween('audited_at', [$start, $end])
                ->selectRaw('COUNT(*) as total, AVG(accuracy_percentage) as accuracy')
                ->first();
            $monthly[] = [
                'month' => $thaiMonths[(int) $start->month].' '.substr((string) ($start->year + 543), -2),
                'total' => (int) ($row->total ?? 0),
                'avg' => round((float) ($row->accuracy ?? 0), 1),
            ];
        }

        $byCategory = DB::table('mra_audit_details as d')
            ->join('mra_audits as a', 'a.id', '=', 'd.mra_audit_id')
            ->join('mra_criteria as c', 'c.id', '=', 'd.mra_criteria_id')
            ->join('mra_categories as cat', 'cat.id', '=', 'c.mra_category_id')
            ->whereIn('a.status', $completedStatuses)
            ->whereIn('d.result', ['pass', 'fail'])
            ->when($mraType, fn ($q) => $q->where('a.audit_type', $mraType))
            ->groupBy('cat.id', 'cat.code', 'cat.name', 'cat.audit_type', 'cat.sort_order')
            ->orderBy('cat.audit_type')
            ->orderBy('cat.sort_order')
            ->selectRaw("cat.id, cat.code, cat.name, cat.audit_type, COUNT(*) as total, SUM(CASE WHEN d.result = 'pass' THEN 1 ELSE 0 END) as passed")
            ->get()
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'code' => (string) $row->code,
                'name' => (string) $row->name,
                'audit_type' => strtoupper((string) $row->audit_type),
                'total' => (int) $row->total,
                'passed' => (int) $row->passed,
                'avg' => (int) $row->total > 0 ? round(((int) $row->passed / (int) $row->total) * 100, 1) : 0,
            ])
            ->values()
            ->all();

        $byDoctor = (clone $completed)
            ->whereNotNull('doctor_name')
            ->where('doctor_name', '!=', '')
            ->selectRaw('doctor_name as doctor, COUNT(*) as count, ROUND(AVG(accuracy_percentage), 1) as avg')
            ->groupBy('doctor_name')
            ->orderByDesc('avg')
            ->limit(20)
            ->get()
            ->map(fn ($row) => [
                'doctor' => (string) $row->doctor,
                'avg' => (float) $row->avg,
                'count' => (int) $row->count,
            ])
            ->values()
            ->all();

        $topErrors = DB::table('mra_audit_details as d')
            ->join('mra_audits as a', 'a.id', '=', 'd.mra_audit_id')
            ->join('mra_criteria as c', 'c.id', '=', 'd.mra_criteria_id')
            ->join('mra_categories as cat', 'cat.id', '=', 'c.mra_category_id')
            ->where('d.result', 'fail')
            ->whereIn('a.status', $completedStatuses)
            ->when($mraType, fn ($q) => $q->where('a.audit_type', $mraType))
            ->groupBy('c.id', 'c.code', 'c.name', 'cat.name')
            ->orderByDesc('fail_count')
            ->limit(8)
            ->selectRaw('c.code as criteria_code, c.name as criteria_name, cat.name as category_name, COUNT(*) as fail_count')
            ->get()
            ->map(fn ($row) => [
                'criteria_code' => (string) $row->criteria_code,
                'criteria_name' => (string) $row->criteria_name,
                'category_name' => (string) $row->category_name,
                'fail_count' => (int) $row->fail_count,
            ])
            ->values()
            ->all();

        $audits = (clone $base)
            ->with('auditor:id,name')
            ->orderByRaw("CASE status WHEN 'in_progress' THEN 0 WHEN 'pending' THEN 1 WHEN 'audited' THEN 2 ELSE 3 END")
            ->orderByDesc('audited_at')
            ->orderByDesc('id')
            ->limit(40)
            ->get()
            ->map(function (MraAudit $audit) {
                $percent = round((float) $audit->accuracy_percentage, 1);

                return [
                    'id' => $audit->id,
                    'audit_type' => strtoupper((string) ($audit->audit_type ?: 'opd')),
                    'hn' => $audit->hn,
                    'an' => $audit->an,
                    'patient_name' => $audit->patient_name,
                    'doctor' => $audit->doctor_name,
                    'visit_date' => optional($audit->visit_date)?->toDateString(),
                    'audited_at' => optional($audit->audited_at)?->toDateString(),
                    'status' => $audit->status,
                    'percent' => $percent,
                    'total_score' => (float) $audit->total_obtained_score,
                    'max_score' => (float) $audit->total_max_score,
                    'star_level' => $percent >= 95 ? 3 : ($percent >= 80 ? 2 : 1),
                    'auditor' => $audit->auditor?->name,
                ];
            })
            ->values()
            ->all();

        return [
            'summary' => [
                'total' => (clone $base)->count(),
                'completed' => (clone $completed)->count(),
                'pending' => (clone $base)->whereIn('status', ['pending', 'in_progress'])->count(),
                'avg' => round((float) ((clone $completed)->avg('accuracy_percentage') ?? 0), 1),
                'opd_avg' => $opdAvg,
                'ipd_avg' => $ipdAvg,
                'above_80' => (clone $completed)->where('accuracy_percentage', '>=', 80)->count(),
                'above_95' => (clone $completed)->where('accuracy_percentage', '>=', 95)->count(),
            ],
            'monthly' => $monthly,
            'by_category' => $byCategory,
            'by_doctor' => $byDoctor,
            'top_errors' => $topErrors,
            'audits' => $audits,
        ];
    }
}
