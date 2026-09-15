<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\QualityIndicatorImportLog;
use App\Models\TeamHa;
use App\Services\QualityIndicatorImportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class QualityIndicatorImportController extends Controller
{
    public function index(Request $request, QualityIndicatorImportService $service)
    {
        $logs = QualityIndicatorImportLog::query()
            ->with(['user:id,name', 'department:id,name', 'team:id,abbreviation,name_th'])
            ->latest()
            ->limit(30)
            ->get()
            ->map(fn (QualityIndicatorImportLog $log) => $this->transformLog($log, $service));

        $pendingPreview = null;
        $pendingId = session('import_log_id');
        if ($pendingId) {
            $pending = QualityIndicatorImportLog::query()
                ->with(['user:id,name', 'department:id,name', 'team:id,abbreviation,name_th'])
                ->whereKey($pendingId)
                ->where('status', 'pending')
                ->where('user_id', Auth::id())
                ->first();

            if ($pending) {
                $pendingPreview = [
                    'log' => $this->transformLog($pending, $service, true),
                    'preview' => [
                        'can_confirm' => (bool) ($pending->summary['can_confirm'] ?? false),
                        'counts' => [
                            'indicators_create' => $pending->indicators_create,
                            'indicators_update' => $pending->indicators_update,
                            'entries_create' => $pending->entries_create,
                            'entries_update' => $pending->entries_update,
                            'errors' => $pending->row_errors,
                        ],
                        'indicators' => $pending->payload['indicators'] ?? [],
                        'entries' => $pending->payload['entries'] ?? [],
                        'errors' => $pending->payload['errors'] ?? [],
                        'owner_label' => $pending->summary['owner_label']
                            ?? $service->ownerLabel($pending->type, $pending->department_id, $pending->team_id),
                    ],
                ];
            }
        }

        return Inertia::render('QualityIndicators/Import', [
            'departments' => Department::query()->orderBy('name')->get(['id', 'name']),
            'teams' => TeamHa::query()->orderBy('abbreviation')->get(['id', 'abbreviation', 'name_th']),
            'logs' => $logs,
            'pendingPreview' => $pendingPreview,
            'defaults' => [
                'type' => $request->query('type', 'department'),
                'department_id' => $request->query('department_id'),
                'team_id' => $request->query('team_id'),
            ],
        ]);
    }

    public function template(QualityIndicatorImportService $service): BinaryFileResponse
    {
        $path = $service->downloadTemplatePath();

        return response()->download(
            $path,
            'เทมเพลตนำเข้าตัวชี้วัด-โรงพยาบาลค่ายสุรสิงหนาท.xlsx',
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
        );
    }

    public function preview(Request $request, QualityIndicatorImportService $service)
    {
        $validated = $request->validate([
            'type' => 'required|in:organization,department,ha_team',
            'department_id' => 'nullable|required_if:type,department|exists:departments,id',
            'team_id' => 'nullable|required_if:type,ha_team|exists:teamha,id',
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
        ], [
            'file.required' => 'กรุณาเลือกไฟล์ Excel',
            'file.mimes' => 'รองรับเฉพาะไฟล์ .xlsx',
            'department_id.required_if' => 'กรุณาเลือกแผนก/หน่วยงาน',
            'team_id.required_if' => 'กรุณาเลือกทีม HA',
        ]);

        $extension = strtolower($request->file('file')->getClientOriginalExtension());
        if (! in_array($extension, ['xlsx'], true)) {
            return back()->withErrors(['file' => 'กรุณาใช้ไฟล์ .xlsx ตามเทมเพลตของระบบ']);
        }

        $result = $service->preview(
            $request->file('file'),
            $validated['type'],
            isset($validated['department_id']) ? (int) $validated['department_id'] : null,
            isset($validated['team_id']) ? (int) $validated['team_id'] : null,
        );

        return redirect()
            ->route('quality-indicators.import.index')
            ->with('import_log_id', $result['log']->id)
            ->with('success', 'ตรวจสอบไฟล์เรียบร้อย — ตรวจดูตัวอย่างแล้วกดยืนยัน');
    }

    public function confirm(Request $request, QualityIndicatorImportLog $log, QualityIndicatorImportService $service)
    {
        if ((int) $log->user_id !== (int) Auth::id()) {
            abort(403);
        }

        $request->validate([
            'confirm_text' => 'required|in:ยืนยัน',
        ], [
            'confirm_text.in' => 'พิมพ์คำว่า "ยืนยัน" เพื่อดำเนินการนำเข้า',
        ]);

        try {
            $updated = $service->confirm($log);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            return back()->withErrors(['import' => $e->getMessage()]);
        }

        return redirect()
            ->route('quality-indicators.import.index')
            ->with('success', 'นำเข้าข้อมูลเรียบร้อย — '.$this->successMessage($updated))
            ->with('import_log_id', null);
    }

    public function cancel(QualityIndicatorImportLog $log, QualityIndicatorImportService $service)
    {
        if ((int) $log->user_id !== (int) Auth::id()) {
            abort(403);
        }

        $service->cancel($log);

        return back()->with('success', 'ยกเลิกการนำเข้าแล้ว');
    }

    public function show(QualityIndicatorImportLog $log, QualityIndicatorImportService $service)
    {
        $log->load(['user:id,name', 'department:id,name', 'team:id,abbreviation,name_th']);

        return Inertia::render('QualityIndicators/ImportLog', [
            'log' => $this->transformLog($log, $service, true),
        ]);
    }

    private function successMessage(QualityIndicatorImportLog $log): string
    {
        return sprintf(
            'ตัวชี้วัดใหม่ %d / อัปเดต %d · ผลวัดใหม่ %d / อัปเดต %d',
            $log->indicators_create,
            $log->indicators_update,
            $log->entries_create,
            $log->entries_update
        );
    }

    private function transformLog(QualityIndicatorImportLog $log, QualityIndicatorImportService $service, bool $withPayload = false): array
    {
        $data = [
            'id' => $log->id,
            'type' => $log->type,
            'status' => $log->status,
            'original_filename' => $log->original_filename,
            'owner_label' => $log->summary['owner_label']
                ?? $service->ownerLabel($log->type, $log->department_id, $log->team_id),
            'indicators_create' => $log->indicators_create,
            'indicators_update' => $log->indicators_update,
            'entries_create' => $log->entries_create,
            'entries_update' => $log->entries_update,
            'row_errors' => $log->row_errors,
            'summary' => $log->summary,
            'error_message' => $log->error_message,
            'user' => $log->user ? ['id' => $log->user->id, 'name' => $log->user->name] : null,
            'confirmed_at' => $log->confirmed_at?->timezone(config('app.timezone'))->format('d/m/Y H:i'),
            'created_at' => $log->created_at?->timezone(config('app.timezone'))->format('d/m/Y H:i'),
        ];

        if ($withPayload) {
            $data['payload'] = $log->payload;
        }

        return $data;
    }
}
