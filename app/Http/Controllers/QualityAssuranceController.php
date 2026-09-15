<?php

namespace App\Http\Controllers;

use App\Models\QualityReview;
use App\Models\QualityAudit;
use App\Models\QualityImprovement;
use App\Models\QualityIndicator;
use App\Models\Department;
use App\Models\TeamHa;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class QualityAssuranceController extends Controller
{
    public function index(Request $request)
    {
        $reviews = QualityReview::query()
            ->with([
                'indicator:id,code,name,unit,target_value,target_operator,type,department_id,team_id',
                'indicator.department:id,name',
                'indicator.team:id,abbreviation,name_th',
            ])
            ->orderBy('schedule_date', 'desc')
            ->get();

        $indicators = QualityIndicator::query()
            ->with(['department:id,name', 'team:id,abbreviation,name_th'])
            ->where('is_active', true)
            ->orderBy('code')
            ->get(['id', 'code', 'name', 'unit', 'target_value', 'target_operator', 'type', 'department_id', 'team_id', 'category', 'frequency']);

        return Inertia::render('QualityAssurance/Index', [
            'reviews' => $reviews,
            'audits' => QualityAudit::orderBy('audit_date', 'desc')->get(),
            'improvements' => QualityImprovement::orderBy('updated_at', 'desc')->get(),
            'indicators' => $indicators->map(fn (QualityIndicator $i) => [
                'id' => $i->id,
                'code' => $i->code,
                'name' => $i->name,
                'unit' => $i->unit,
                'target_value' => $i->target_value,
                'target_operator' => $i->target_operator,
                'type' => $i->type,
                'department_id' => $i->department_id,
                'team_id' => $i->team_id,
                'category' => $i->category,
                'frequency' => $i->frequency,
                'owner_label' => $this->indicatorOwnerLabel($i),
                'label' => trim(($i->code ? $i->code.' — ' : '').$i->name),
            ]),
            'departments' => Department::query()->orderBy('name')->get(['id', 'name']),
            'teams' => TeamHa::query()->orderBy('abbreviation')->get(['id', 'abbreviation', 'name_th']),
            'preselectIndicatorId' => $request->filled('indicator_id') ? (int) $request->query('indicator_id') : null,
        ]);
    }

    // Reviews
    public function storeReview(Request $request)
    {
        QualityReview::create($this->validatedReview($request));

        return redirect()->back()->with('success', 'บันทึกการทบทวนเรียบร้อย');
    }

    public function updateReview(Request $request, QualityReview $review)
    {
        $review->update($this->validatedReview($request));

        return redirect()->back()->with('success', 'อัปเดตการทบทวนเรียบร้อย');
    }

    public function destroyReview(QualityReview $review)
    {
        $review->delete();

        return redirect()->back()->with('success', 'ลบการทบทวนเรียบร้อย');
    }

    private function validatedReview(Request $request): array
    {
        $validated = $request->validate([
            'subject_type' => ['required', Rule::in(['indicator', 'custom'])],
            'quality_indicator_id' => [
                'nullable',
                'required_if:subject_type,indicator',
                'exists:quality_indicators,id',
            ],
            'topic' => 'nullable|string|max:255',
            'review_type' => 'required|string|max:100',
            'schedule_date' => 'required|date',
            'reviewer' => 'nullable|string|max:255',
            'status' => ['required', Rule::in(['Pending', 'In Progress', 'Completed'])],
            'findings' => 'nullable|string',
            'recommendations' => 'nullable|string',
        ], [
            'quality_indicator_id.required_if' => 'กรุณาเลือกตัวชี้วัดคุณภาพที่ต้องการทบทวน',
        ]);

        if ($validated['subject_type'] === 'indicator') {
            $indicator = QualityIndicator::query()->findOrFail($validated['quality_indicator_id']);
            $validated['topic'] = trim(($indicator->code ? $indicator->code.': ' : '').$indicator->name);
            $validated['review_type'] = $validated['review_type'] ?: 'KPI Review';
            if (! in_array($validated['review_type'], ['KPI Review', 'Indicator Review'], true)) {
                $validated['review_type'] = 'KPI Review';
            }
        } else {
            $validated['quality_indicator_id'] = null;
            if (blank($validated['topic'] ?? null)) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'topic' => 'กรุณาระบุหัวข้อการทบทวน',
                ]);
            }
        }

        return $validated;
    }

    private function indicatorOwnerLabel(QualityIndicator $indicator): string
    {
        return match ($indicator->type) {
            'department' => $indicator->department?->name ?: 'แผนก',
            'ha_team' => $indicator->team
                ? trim(($indicator->team->abbreviation ? $indicator->team->abbreviation.' - ' : '').$indicator->team->name_th)
                : 'ทีม HA',
            default => 'ระดับองค์กร',
        };
    }

    // Audits
    public function storeAudit(Request $request)
    {
        $validated = $request->validate([
            'audit_topic' => 'required|string',
            'audit_date' => 'required|date',
            'auditor' => 'required|string',
            'department' => 'nullable|string',
            'score' => 'nullable|numeric',
            'result_summary' => 'nullable|string',
        ]);

        QualityAudit::create($validated);

        return redirect()->back()->with('success', 'Audit recorded successfully.');
    }

    public function updateAudit(Request $request, QualityAudit $audit)
    {
        $validated = $request->validate([
            'audit_topic' => 'required|string',
            'audit_date' => 'required|date',
            'auditor' => 'required|string',
            'department' => 'nullable|string',
            'score' => 'nullable|numeric',
            'result_summary' => 'nullable|string',
        ]);

        $audit->update($validated);

        return redirect()->back()->with('success', 'Audit updated successfully.');
    }

    public function destroyAudit(QualityAudit $audit)
    {
        $audit->delete();

        return redirect()->back()->with('success', 'Audit deleted successfully.');
    }

    // Improvements
    public function storeImprovement(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string',
            'type' => 'required|string',
            'description' => 'nullable|string',
            'status' => 'required|string',
            'progress_percentage' => 'required|integer|min:0|max:100',
            'action_plan' => 'nullable|string',
        ]);

        QualityImprovement::create($validated);

        return redirect()->back()->with('success', 'Improvement project created successfully.');
    }

    public function updateImprovement(Request $request, QualityImprovement $improvement)
    {
        $validated = $request->validate([
            'title' => 'required|string',
            'type' => 'required|string',
            'description' => 'nullable|string',
            'status' => 'required|string',
            'progress_percentage' => 'required|integer|min:0|max:100',
            'action_plan' => 'nullable|string',
        ]);

        $improvement->update($validated);

        return redirect()->back()->with('success', 'Improvement project updated successfully.');
    }

    public function destroyImprovement(QualityImprovement $improvement)
    {
        $improvement->delete();

        return redirect()->back()->with('success', 'Improvement project deleted successfully.');
    }
}
