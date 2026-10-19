<?php

namespace App\Http\Controllers;

use App\Models\EnvPmStandard;
use App\Models\EnvPmStandardPart;
use App\Models\EnvPmStandardTask;
use App\Models\EnvSparePart;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class EnvPmStandardController extends Controller
{
    public function index()
    {
        $standards = EnvPmStandard::query()
            ->with(['tasks', 'parts.sparePart'])
            ->orderBy('name')
            ->get();

        return Inertia::render('Env/PM/Standards', [
            'standards' => $standards,
            'parts' => EnvSparePart::query()->where('is_active', true)->orderBy('name')->get(['id', 'code', 'name', 'unit']),
            'frequencies' => EnvPmStandard::FREQUENCIES,
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validateStandard($request);
        DB::transaction(function () use ($data) {
            $standard = EnvPmStandard::create($this->payload($data));
            $this->syncChildren($standard, $data);
        });

        return back()->with('success', 'บันทึกแผนมาตรฐานแล้ว');
    }

    public function update(Request $request, EnvPmStandard $standard)
    {
        $data = $this->validateStandard($request);
        DB::transaction(function () use ($standard, $data) {
            $standard->update($this->payload($data));
            $standard->tasks()->delete();
            $standard->parts()->delete();
            $this->syncChildren($standard, $data);
        });

        return back()->with('success', 'อัปเดตแผนมาตรฐานแล้ว');
    }

    public function destroy(EnvPmStandard $standard)
    {
        $standard->delete();

        return back()->with('success', 'ลบแผนมาตรฐานแล้ว');
    }

    /**
     * @return array<string, mixed>
     */
    private function validateStandard(Request $request): array
    {
        $request->merge([
            'meter_interval' => $request->input('meter_interval') === '' ? null : $request->input('meter_interval'),
            'tasks' => collect($request->input('tasks', []))
                ->map(function ($task) {
                    if (! is_array($task)) {
                        return $task;
                    }
                    foreach (['min_value', 'max_value', 'unit', 'acceptable_criteria'] as $key) {
                        if (($task[$key] ?? null) === '') {
                            $task[$key] = null;
                        }
                    }

                    return $task;
                })
                ->filter(fn ($task) => is_array($task) && filled($task['task_name'] ?? null))
                ->values()
                ->all(),
            'parts' => collect($request->input('parts', []))
                ->filter(fn ($part) => is_array($part) && filled($part['spare_part_id'] ?? null))
                ->values()
                ->all(),
        ]);

        return $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'frequency' => ['required', Rule::in(array_keys(EnvPmStandard::FREQUENCIES))],
            'basis' => 'required|in:time,meter',
            'interval_value' => 'required|integer|min:1',
            'meter_unit' => 'nullable|string|max:40',
            'meter_interval' => 'nullable|numeric|min:0',
            'sop' => 'nullable|string',
            'estimated_labor_minutes' => 'required|integer|min:0',
            'is_active' => 'nullable|boolean',
            'tasks' => 'array',
            'tasks.*.task_name' => 'required|string|max:255',
            'tasks.*.acceptable_criteria' => 'nullable|string',
            'tasks.*.unit' => 'nullable|string|max:40',
            'tasks.*.min_value' => 'nullable|numeric',
            'tasks.*.max_value' => 'nullable|numeric',
            'tasks.*.input_type' => 'required|in:check,number,text',
            'parts' => 'array',
            'parts.*.spare_part_id' => 'required|exists:env_spare_parts,id',
            'parts.*.qty_required' => 'required|numeric|min:0.001',
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function payload(array $data): array
    {
        return [
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'frequency' => $data['frequency'],
            'basis' => $data['basis'],
            'interval_value' => $data['interval_value'],
            'meter_unit' => $data['basis'] === 'meter' ? ($data['meter_unit'] ?? null) : null,
            'meter_interval' => $data['basis'] === 'meter' ? ($data['meter_interval'] ?? null) : null,
            'sop' => $data['sop'] ?? null,
            'estimated_labor_minutes' => $data['estimated_labor_minutes'],
            'is_active' => (bool) ($data['is_active'] ?? true),
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function syncChildren(EnvPmStandard $standard, array $data): void
    {
        foreach (array_values($data['tasks'] ?? []) as $index => $task) {
            EnvPmStandardTask::create([
                'standard_id' => $standard->id,
                'sort' => $index,
                'task_name' => $task['task_name'],
                'acceptable_criteria' => $task['acceptable_criteria'] ?? null,
                'unit' => $task['unit'] ?? null,
                'min_value' => $task['min_value'] ?? null,
                'max_value' => $task['max_value'] ?? null,
                'input_type' => $task['input_type'],
            ]);
        }

        $seen = [];
        foreach ($data['parts'] ?? [] as $part) {
            $partId = (int) $part['spare_part_id'];
            if (isset($seen[$partId])) {
                continue;
            }
            $seen[$partId] = true;
            EnvPmStandardPart::create([
                'standard_id' => $standard->id,
                'spare_part_id' => $partId,
                'qty_required' => $part['qty_required'],
            ]);
        }
    }
}
