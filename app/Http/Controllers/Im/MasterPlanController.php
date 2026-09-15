<?php

namespace App\Http\Controllers\Im;

use App\Http\Controllers\Controller;
use App\Models\Im\ActionPlan;
use App\Models\Im\ItPlan;
use App\Models\Im\PlanAttachment;
use App\Models\Im\StrategicMapping;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class MasterPlanController extends Controller
{
    public function index(Request $request): Response
    {
        $plans = ItPlan::query()
            ->with('attachments')
            ->withCount(['mappings', 'actionPlans', 'attachments'])
            ->orderByDesc('year')
            ->get();

        $activePlanId = (int) $request->query('plan', optional($plans->first())->id);
        $activePlan = $plans->firstWhere('id', $activePlanId) ?? $plans->first();

        $mappings = $activePlan
            ? StrategicMapping::where('it_plan_id', $activePlan->id)->latest()->get()
            : collect();

        $actionPlans = $activePlan
            ? ActionPlan::where('it_plan_id', $activePlan->id)->with('attachments')->orderBy('start_date')->get()
            : collect();

        // Multi-year overview (ย้อนหลัง 3 ปี)
        $multiYear = ItPlan::query()
            ->withCount('actionPlans')
            ->orderByDesc('year')
            ->take(3)
            ->get()
            ->map(function (ItPlan $plan) {
                $aps = ActionPlan::where('it_plan_id', $plan->id)->get();
                $done = $aps->where('status', 'done')->count();

                return [
                    'year' => $plan->year,
                    'title' => $plan->title,
                    'projects' => $aps->count(),
                    'done' => $done,
                    'completion' => $aps->count() ? round($done / $aps->count() * 100) : 0,
                    'budget' => (float) $aps->sum('budget'),
                    'actual_budget' => (float) $aps->sum('actual_budget'),
                ];
            });

        $avgAccuracy = $mappings->count() ? round($mappings->avg('analysis_accuracy'), 1) : 0;

        return Inertia::render('Im/MasterPlan', [
            'plans' => $plans,
            'activePlanId' => $activePlan?->id,
            'mappings' => $mappings,
            'actionPlans' => $actionPlans,
            'multiYear' => $multiYear,
            'summary' => [
                'avg_accuracy' => $avgAccuracy,
                'accuracy_ok' => $avgAccuracy >= 50,
                'total_budget' => (float) $actionPlans->sum('budget'),
                'actual_budget' => (float) $actionPlans->sum('actual_budget'),
                'projects' => $actionPlans->count(),
                'full_year_projects' => $actionPlans->filter(fn ($a) => $a->duration_months >= 12)->count(),
            ],
        ]);
    }

    public function storePlan(Request $request)
    {
        $data = $request->validate([
            'year' => 'required|integer|min:2500|max:2600',
            'title' => 'required|string|max:255',
            'vision' => 'nullable|string',
            'status' => 'nullable|in:draft,active,closed',
            ...$this->fileRules(false),
        ]);
        unset($data['files']);
        $data['created_by'] = Auth::id();
        $plan = ItPlan::create($data);
        $this->storeUploadedFiles($plan, $request);

        return back()->with('success', 'สร้างแผนแม่บทเรียบร้อย');
    }

    public function updatePlan(Request $request, ItPlan $plan)
    {
        $data = $request->validate([
            'year' => 'required|integer|min:2500|max:2600',
            'title' => 'required|string|max:255',
            'vision' => 'nullable|string',
            'status' => 'nullable|in:draft,active,closed',
        ]);
        $plan->update($data);

        return back()->with('success', 'อัปเดตแผนแม่บทเรียบร้อย');
    }

    public function destroyPlan(ItPlan $plan)
    {
        $plan->load(['attachments', 'actionPlans.attachments']);
        $plan->attachments->each->delete();
        $plan->actionPlans->each(fn (ActionPlan $action) => $action->attachments->each->delete());
        $plan->delete();

        return back()->with('success', 'ลบแผนแม่บทเรียบร้อย');
    }

    public function storeMapping(Request $request)
    {
        $data = $request->validate([
            'it_plan_id' => 'required|exists:im_it_plans,id',
            'hospital_strategy' => 'required|string',
            'it_strategy' => 'required|string',
            'success_factor' => 'nullable|string',
            'analysis_accuracy' => 'required|numeric|min:0|max:100',
            'note' => 'nullable|string',
        ]);
        StrategicMapping::create($data);

        return back()->with('success', 'บันทึกการเชื่อมโยงยุทธศาสตร์เรียบร้อย');
    }

    public function updateMapping(Request $request, StrategicMapping $mapping)
    {
        $data = $request->validate([
            'hospital_strategy' => 'required|string',
            'it_strategy' => 'required|string',
            'success_factor' => 'nullable|string',
            'analysis_accuracy' => 'required|numeric|min:0|max:100',
            'note' => 'nullable|string',
        ]);
        $mapping->update($data);

        return back()->with('success', 'อัปเดตการเชื่อมโยงยุทธศาสตร์เรียบร้อย');
    }

    public function destroyMapping(StrategicMapping $mapping)
    {
        $mapping->delete();

        return back()->with('success', 'ลบรายการเรียบร้อย');
    }

    public function storeAction(Request $request)
    {
        $data = $this->validateAction($request, true);
        unset($data['files']);
        $action = ActionPlan::create($data);
        $this->storeUploadedFiles($action, $request);

        return back()->with('success', 'สร้างโครงการเรียบร้อย');
    }

    public function updateAction(Request $request, ActionPlan $action)
    {
        $data = $this->validateAction($request, false);
        unset($data['files']);
        $action->update($data);
        $this->storeUploadedFiles($action, $request);

        return back()->with('success', 'อัปเดตโครงการเรียบร้อย');
    }

    public function destroyAction(ActionPlan $action)
    {
        $action->load('attachments');
        $action->attachments->each->delete();
        $action->delete();

        return back()->with('success', 'ลบโครงการเรียบร้อย');
    }

    public function storePlanAttachments(Request $request, ItPlan $plan)
    {
        $request->validate($this->fileRules(true));
        $count = $this->storeUploadedFiles($plan, $request);

        return back()->with('success', 'แนบไฟล์แผนแม่บท '.$count.' ไฟล์เรียบร้อย');
    }

    public function storeActionAttachments(Request $request, ActionPlan $action)
    {
        $request->validate($this->fileRules(true));
        $count = $this->storeUploadedFiles($action, $request);

        return back()->with('success', 'แนบไฟล์โครงการ '.$count.' ไฟล์เรียบร้อย');
    }

    public function destroyAttachment(PlanAttachment $attachment)
    {
        $attachment->delete();

        return back()->with('success', 'ลบไฟล์แนบเรียบร้อย');
    }

    private function validateAction(Request $request, bool $withPlan): array
    {
        $rules = [
            'project' => 'required|string|max:255',
            'objective' => 'nullable|string',
            'budget' => 'required|numeric|min:0',
            'actual_budget' => 'nullable|numeric|min:0',
            'owner' => 'nullable|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'status' => 'nullable|in:planned,in_progress,done,cancelled',
            'progress' => 'nullable|integer|min:0|max:100',
            'pdca_stage' => 'nullable|in:plan,do,check,act',
            'problems' => 'nullable|string',
            'lessons_learned' => 'nullable|string',
            ...$this->fileRules(false),
        ];
        if ($withPlan) {
            $rules['it_plan_id'] = 'required|exists:im_it_plans,id';
        }

        return $request->validate($rules);
    }

    /** @return array<string, string> */
    private function fileRules(bool $required): array
    {
        return [
            'files' => ($required ? 'required' : 'nullable').'|array|max:10',
            'files.*' => 'file|max:20480|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,gif,zip,txt',
        ];
    }

    private function storeUploadedFiles(ItPlan|ActionPlan $model, Request $request): int
    {
        $files = $request->file('files', []);
        if (! is_array($files)) {
            $files = $files ? [$files] : [];
        }

        $count = 0;
        foreach ($files as $file) {
            if (! $file) {
                continue;
            }
            $path = $file->store('im/plan-attachments', 'public');
            $model->attachments()->create([
                'original_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'mime_type' => $file->getClientMimeType() ?: $file->getMimeType(),
                'size' => $file->getSize(),
                'uploaded_by' => Auth::id(),
            ]);
            $count++;
        }

        return $count;
    }
}
