<?php

namespace App\Http\Controllers;

use App\Models\EnvAsset;
use App\Models\EnvAssetInspectionCancellationLog;
use App\Models\EnvAssetInspectionCycle;
use App\Models\EnvAssetInspectionItem;
use App\Services\ThaiPdfService;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class EnvAssetInspectionController extends Controller
{
    public function cyclesIndex(Request $request): Response
    {
        $cycles = EnvAssetInspectionCycle::query()
            ->where('status', '!=', 'cancelled')
            ->withCount([
                'items',
                'items as pending_count' => fn ($q) => $q->where('result', 'pending'),
                'items as pass_count' => fn ($q) => $q->where('result', 'pass'),
                'items as fail_count' => fn ($q) => $q->where('result', 'fail'),
            ])
            ->with(['creator:id,name', 'canceller:id,name'])
            ->latest('id')
            ->get()
            ->map(fn (EnvAssetInspectionCycle $cycle) => $this->serializeCycle($cycle));

        $catalogTotal = EnvAsset::query()->where('inspection_status', 'inspect')->count();
        $q = trim((string) $request->query('q', ''));

        $availableQuery = EnvAsset::query()
            ->where('inspection_status', 'inspect')
            ->with(['line:id,code,name,short_name'])
            ->when($q !== '', function ($builder) use ($q) {
                $builder->where(function ($inner) use ($q) {
                    $inner->where('name', 'like', "%{$q}%")
                        ->orWhere('stock_number', 'like', "%{$q}%")
                        ->orWhere('serial_number', 'like', "%{$q}%")
                        ->orWhere('issue_location', 'like', "%{$q}%")
                        ->orWhere('location', 'like', "%{$q}%");
                });
            })
            ->orderBy('name')
            ->orderBy('stock_number');

        $availableAssets = (clone $availableQuery)
            ->limit(500)
            ->get()
            ->map(fn (EnvAsset $asset) => $this->serializeAvailableAsset($asset));

        return Inertia::render('Env/Assets/Inspection/Cycles', [
            'cycles' => $cycles,
            'catalogTotal' => $catalogTotal,
            'availableAssets' => $availableAssets,
            'availableTotal' => $availableQuery->count(),
            'filters' => ['q' => $q ?: null],
            'statuses' => collect(EnvAssetInspectionCycle::STATUSES)
                ->map(fn ($label, $value) => compact('value', 'label'))
                ->values(),
        ]);
    }

    public function storeCycle(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:191'],
            'fiscal_year' => ['nullable', 'string', 'max:16'],
            'period_start' => ['nullable', 'date'],
            'period_end' => ['nullable', 'date', 'after_or_equal:period_start'],
            'default_scheduled_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'select_all' => ['sometimes', 'boolean'],
            'asset_ids' => ['sometimes', 'array'],
            'asset_ids.*' => ['integer', 'exists:env_assets,id'],
            'scheduled_date' => ['nullable', 'date'],
        ]);

        $period = $this->normalizePeriod(
            $data['period_start'] ?? $data['default_scheduled_date'] ?? null,
            $data['period_end'] ?? $data['period_start'] ?? $data['default_scheduled_date'] ?? null,
        );

        $cycle = EnvAssetInspectionCycle::create([
            'name' => $data['name'],
            'fiscal_year' => $data['fiscal_year'] ?? null,
            'period_start' => $period['start'],
            'period_end' => $period['end'],
            'default_scheduled_date' => $period['start'],
            'notes' => $data['notes'] ?? null,
            'status' => 'draft',
            'created_by' => $request->user()?->id,
        ]);

        $registered = $this->registerAssetsIntoCycle(
            $cycle,
            (bool) ($data['select_all'] ?? false),
            $data['asset_ids'] ?? [],
            $data['scheduled_date'] ?? null,
        );

        $message = 'สร้างวงรอบการตรวจแล้ว';
        if ($registered > 0) {
            $message .= " และลงทะเบียนครุภัณฑ์ {$registered} รายการ";
        }

        return redirect()
            ->route('env.assets.inspection.cycles.show', [
                'cycle' => $cycle,
                'tab' => $registered > 0 ? 'schedule' : 'register',
            ])
            ->with('success', $message);
    }

    public function updateCycle(Request $request, EnvAssetInspectionCycle $cycle): RedirectResponse
    {
        if ($cycle->isCancelled()) {
            return back()->with('error', 'วงรอบนี้ถูกยกเลิกแล้ว ไม่สามารถแก้ไขได้');
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:191'],
            'fiscal_year' => ['nullable', 'string', 'max:16'],
            'period_start' => ['nullable', 'date'],
            'period_end' => ['nullable', 'date', 'after_or_equal:period_start'],
            'default_scheduled_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $period = $this->normalizePeriod(
            $data['period_start'] ?? $data['default_scheduled_date'] ?? null,
            $data['period_end'] ?? $data['period_start'] ?? $data['default_scheduled_date'] ?? null,
        );

        $cycle->update([
            'name' => $data['name'],
            'fiscal_year' => $data['fiscal_year'] ?? null,
            'period_start' => $period['start'],
            'period_end' => $period['end'],
            'default_scheduled_date' => $period['start'],
            'notes' => $data['notes'] ?? null,
        ]);

        return back()->with('success', 'แก้ไขข้อมูลวงรอบแล้ว');
    }

    public function cancelCycle(Request $request, EnvAssetInspectionCycle $cycle): RedirectResponse
    {
        if ($cycle->isCancelled()) {
            return back()->with('error', 'วงรอบนี้ถูกยกเลิกไว้แล้ว');
        }

        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:1000'],
            'confirm_force' => ['sometimes', 'boolean'],
        ]);

        $counts = $this->resultCountsForQuery($cycle->items());
        $hadResults = ($counts['pass'] + $counts['fail']) > 0;

        if ($hadResults && ! ($data['confirm_force'] ?? false)) {
            return back()->with('error', sprintf(
                'วงรอบนี้มีการบันทึกผลตรวจแล้ว (ผ่าน %d / ไม่ผ่าน %d) — กรุณายืนยันอีกครั้งเพื่อยกเลิก',
                $counts['pass'],
                $counts['fail']
            ));
        }

        $previousStatus = $cycle->status;

        DB::transaction(function () use ($cycle, $data, $counts, $hadResults, $request, $previousStatus) {
            $cycle->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancelled_by' => $request->user()?->id,
                'cancel_reason' => $data['reason'] ?? null,
            ]);

            $this->logCancellation($cycle, [
                'action' => 'cancel_cycle',
                'mode' => 'cancel_cycle',
                'items_count' => $counts['total'],
                'pending_count' => $counts['pending'],
                'pass_count' => $counts['pass'],
                'fail_count' => $counts['fail'],
                'had_results' => $hadResults,
                'force_confirmed' => (bool) ($data['confirm_force'] ?? false),
                'reason' => $data['reason'] ?? null,
                'cancelled_by' => $request->user()?->id,
                'meta' => [
                    'cycle_name' => $cycle->name,
                    'previous_status' => $previousStatus,
                ],
            ]);
        });

        return back()->with('success', 'ยกเลิกวงรอบการตรวจแล้ว');
    }

    public function showCycle(Request $request, EnvAssetInspectionCycle $cycle): Response
    {
        $cycle->loadCount([
            'items',
            'items as pending_count' => fn ($q) => $q->where('result', 'pending'),
            'items as pass_count' => fn ($q) => $q->where('result', 'pass'),
            'items as fail_count' => fn ($q) => $q->where('result', 'fail'),
        ])->load(['creator:id,name', 'canceller:id,name']);

        $tab = (string) $request->query('tab', 'register');
        if (! in_array($tab, ['register', 'schedule', 'results'], true)) {
            $tab = 'register';
        }

        $q = trim((string) $request->query('q', ''));
        $resultFilter = (string) $request->query('result', '');
        if ($resultFilter !== '' && ! isset(EnvAssetInspectionItem::RESULTS[$resultFilter])) {
            $resultFilter = '';
        }

        $itemsQuery = $cycle->items()
            ->with(['asset.line:id,code,name,short_name', 'inspector:id,name'])
            ->when($q !== '', function ($builder) use ($q) {
                $builder->where(function ($inner) use ($q) {
                    $inner->where('department_label', 'like', "%{$q}%")
                        ->orWhereHas('asset', function ($asset) use ($q) {
                            $asset->where('name', 'like', "%{$q}%")
                                ->orWhere('stock_number', 'like', "%{$q}%")
                                ->orWhere('serial_number', 'like', "%{$q}%");
                        });
                });
            })
            ->when($resultFilter !== '', fn ($builder) => $builder->where('result', $resultFilter))
            ->orderByRaw('scheduled_date is null')
            ->orderBy('scheduled_date')
            ->orderBy('id');

        $items = $itemsQuery->get()->map(fn (EnvAssetInspectionItem $item) => $this->serializeItem($item));

        $registeredIds = $cycle->items()->pluck('asset_id');

        $availableQuery = EnvAsset::query()
            ->where('inspection_status', 'inspect')
            ->whereNotIn('id', $registeredIds)
            ->with(['line:id,code,name,short_name'])
            ->when($q !== '' && $tab === 'register', function ($builder) use ($q) {
                $builder->where(function ($inner) use ($q) {
                    $inner->where('name', 'like', "%{$q}%")
                        ->orWhere('stock_number', 'like', "%{$q}%")
                        ->orWhere('serial_number', 'like', "%{$q}%")
                        ->orWhere('issue_location', 'like', "%{$q}%")
                        ->orWhere('location', 'like', "%{$q}%");
                });
            })
            ->orderBy('name')
            ->orderBy('stock_number');

        $availableAssets = $availableQuery
            ->limit(500)
            ->get()
            ->map(fn (EnvAsset $asset) => $this->serializeAvailableAsset($asset));

        $availableTotal = EnvAsset::query()
            ->where('inspection_status', 'inspect')
            ->whereNotIn('id', $registeredIds)
            ->count();

        $cancellations = $cycle->cancellationLogs()
            ->with('canceller:id,name')
            ->latest('id')
            ->limit(50)
            ->get()
            ->map(fn (EnvAssetInspectionCancellationLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'action_label' => $log->action_label,
                'mode' => $log->mode,
                'scheduled_date' => optional($log->scheduled_date)->format('Y-m-d'),
                'scheduled_date_label' => $this->formatThaiDate($log->scheduled_date),
                'items_count' => $log->items_count,
                'pending_count' => $log->pending_count,
                'pass_count' => $log->pass_count,
                'fail_count' => $log->fail_count,
                'had_results' => $log->had_results,
                'force_confirmed' => $log->force_confirmed,
                'reason' => $log->reason,
                'canceller_name' => $log->canceller?->name,
                'created_at' => $this->formatThaiDateTime($log->created_at),
            ]);

        return Inertia::render('Env/Assets/Inspection/CycleShow', [
            'cycle' => $this->serializeCycle($cycle),
            'items' => $items,
            'availableAssets' => $availableAssets,
            'availableTotal' => $availableTotal,
            'cancellations' => $cancellations,
            'results' => collect(EnvAssetInspectionItem::RESULTS)
                ->map(fn ($label, $value) => compact('value', 'label'))
                ->values(),
            'filters' => [
                'tab' => $tab,
                'q' => $q,
                'result' => $resultFilter ?: null,
            ],
        ]);
    }

    public function storeItems(Request $request, EnvAssetInspectionCycle $cycle): RedirectResponse
    {
        if ($cycle->isCancelled()) {
            return back()->with('error', 'วงรอบนี้ถูกยกเลิกแล้ว ไม่สามารถลงทะเบียนเพิ่มได้');
        }

        $data = $request->validate([
            'select_all' => ['sometimes', 'boolean'],
            'asset_ids' => ['sometimes', 'array'],
            'asset_ids.*' => ['integer', 'exists:env_assets,id'],
            'scheduled_date' => ['nullable', 'date'],
        ]);

        $selectAll = (bool) ($data['select_all'] ?? false);
        $assetIds = $data['asset_ids'] ?? [];
        $scheduledDate = $data['scheduled_date'] ?? null;

        if (! $selectAll && $assetIds === []) {
            return back()->with('error', 'กรุณาเลือกครุภัณฑ์อย่างน้อย 1 รายการ');
        }

        $count = $this->registerAssetsIntoCycle($cycle, $selectAll, $assetIds, $scheduledDate);
        if ($count === 0) {
            return back()->with('error', 'ไม่พบครุภัณฑ์ที่เลือก หรือลงทะเบียนครบแล้ว');
        }

        return back()->with('success', "ลงทะเบียนครุภัณฑ์ {$count} รายการแล้ว");
    }

    public function updateDates(Request $request, EnvAssetInspectionCycle $cycle): RedirectResponse
    {
        if ($cycle->isCancelled()) {
            return back()->with('error', 'วงรอบนี้ถูกยกเลิกแล้ว ไม่สามารถแก้ไขวันนัดได้');
        }

        $data = $request->validate([
            'scheduled_date' => ['nullable', 'date'],
            'overwrite' => ['sometimes', 'boolean'],
            'period_start' => ['nullable', 'date'],
            'period_end' => ['nullable', 'date', 'after_or_equal:period_start'],
            'item_dates' => ['sometimes', 'array'],
            'item_dates.*.id' => ['required', 'integer'],
            'item_dates.*.scheduled_date' => ['nullable', 'date'],
        ]);

        DB::transaction(function () use ($cycle, $data) {
            if (array_key_exists('period_start', $data) || array_key_exists('period_end', $data)) {
                $period = $this->normalizePeriod(
                    $data['period_start'] ?? optional($cycle->period_start)->format('Y-m-d'),
                    $data['period_end'] ?? optional($cycle->period_end)->format('Y-m-d'),
                );
                $cycle->update([
                    'period_start' => $period['start'],
                    'period_end' => $period['end'],
                    'default_scheduled_date' => $period['start'] ?: $cycle->default_scheduled_date,
                ]);
            }

            if (! empty($data['item_dates'])) {
                foreach ($data['item_dates'] as $row) {
                    EnvAssetInspectionItem::query()
                        ->where('cycle_id', $cycle->id)
                        ->where('id', $row['id'])
                        ->update([
                            'scheduled_date' => $row['scheduled_date'] ?? null,
                            'updated_at' => now(),
                        ]);
                }
            }

            if (! empty($data['scheduled_date'])) {
                $query = EnvAssetInspectionItem::query()->where('cycle_id', $cycle->id);
                if (! ($data['overwrite'] ?? false)) {
                    $query->whereNull('scheduled_date');
                }
                $query->update([
                    'scheduled_date' => $data['scheduled_date'],
                    'updated_at' => now(),
                ]);

                $cycle->update(['default_scheduled_date' => $data['scheduled_date']]);
            }
        });

        $cycle->refreshStatus();

        return back()->with('success', 'อัปเดตวันตรวจแล้ว');
    }

    public function cancelByDate(Request $request, EnvAssetInspectionCycle $cycle): RedirectResponse
    {
        if ($cycle->isCancelled()) {
            return back()->with('error', 'วงรอบนี้ถูกยกเลิกแล้ว');
        }

        $data = $request->validate([
            'scheduled_date' => ['required', 'date'],
            'mode' => ['sometimes', Rule::in(['clear_date', 'remove_items'])],
            'reason' => ['nullable', 'string', 'max:1000'],
            'confirm_force' => ['sometimes', 'boolean'],
        ]);

        $date = $data['scheduled_date'];
        $mode = $data['mode'] ?? 'clear_date';

        $query = EnvAssetInspectionItem::query()
            ->where('cycle_id', $cycle->id)
            ->whereDate('scheduled_date', $date);

        $counts = $this->resultCountsForQuery($query);
        if ($counts['total'] === 0) {
            return back()->with('error', 'ไม่พบรายการที่มีวันนัดตรวจในวันที่เลือก');
        }

        $hadResults = ($counts['pass'] + $counts['fail']) > 0;
        if ($hadResults && ! ($data['confirm_force'] ?? false)) {
            return back()->with('error', sprintf(
                'วันที่ %s มีผลตรวจแล้ว (ผ่าน %d / ไม่ผ่าน %d) — กรุณายืนยันอีกครั้งเพื่อยกเลิก',
                $date,
                $counts['pass'],
                $counts['fail']
            ));
        }

        DB::transaction(function () use ($cycle, $query, $mode, $date, $data, $counts, $hadResults, $request) {
            if ($mode === 'remove_items') {
                (clone $query)->delete();
            } else {
                (clone $query)->update([
                    'scheduled_date' => null,
                    'updated_at' => now(),
                ]);
            }

            if ($cycle->default_scheduled_date?->format('Y-m-d') === $date) {
                $cycle->update(['default_scheduled_date' => null]);
            }

            $this->logCancellation($cycle, [
                'action' => 'cancel_by_date',
                'mode' => $mode,
                'scheduled_date' => $date,
                'items_count' => $counts['total'],
                'pending_count' => $counts['pending'],
                'pass_count' => $counts['pass'],
                'fail_count' => $counts['fail'],
                'had_results' => $hadResults,
                'force_confirmed' => (bool) ($data['confirm_force'] ?? false),
                'reason' => $data['reason'] ?? null,
                'cancelled_by' => $request->user()?->id,
            ]);

            $cycle->refreshStatus();
        });

        $message = $mode === 'remove_items'
            ? "ยกเลิกและนำออกจากวงรอบ {$counts['total']} รายการ (วันที่ {$date})"
            : "ยกเลิกวันนัดตรวจ {$counts['total']} รายการ (วันที่ {$date})";

        return back()->with('success', $message);
    }

    public function updateItem(Request $request, EnvAssetInspectionCycle $cycle, EnvAssetInspectionItem $item): RedirectResponse
    {
        abort_unless($item->cycle_id === $cycle->id, 404);

        if ($cycle->isCancelled()) {
            return back()->with('error', 'วงรอบนี้ถูกยกเลิกแล้ว ไม่สามารถบันทึกผลได้');
        }

        $data = $request->validate([
            'department_label' => ['sometimes', 'nullable', 'string', 'max:255'],
            'scheduled_date' => ['sometimes', 'nullable', 'date'],
            'result' => ['sometimes', Rule::in(array_keys(EnvAssetInspectionItem::RESULTS))],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        if (array_key_exists('result', $data)) {
            if ($data['result'] === 'pending') {
                $data['inspected_at'] = null;
                $data['inspected_by'] = null;
            } else {
                $data['inspected_at'] = now();
                $data['inspected_by'] = $request->user()?->id;
            }
        }

        $item->update($data);
        $cycle->refreshStatus();

        return back()->with('success', 'บันทึกรายการตรวจแล้ว');
    }

    public function destroyItem(Request $request, EnvAssetInspectionCycle $cycle, EnvAssetInspectionItem $item): RedirectResponse
    {
        abort_unless($item->cycle_id === $cycle->id, 404);

        if ($cycle->isCancelled()) {
            return back()->with('error', 'วงรอบนี้ถูกยกเลิกแล้ว');
        }

        $confirmForce = $request->boolean('confirm_force');
        $reason = $request->input('reason');

        $hadResults = $item->result !== 'pending';
        if ($hadResults && ! $confirmForce) {
            $label = EnvAssetInspectionItem::RESULTS[$item->result] ?? $item->result;

            return back()->with('error', "รายการนี้บันทึกผลตรวจแล้ว ({$label}) — กรุณายืนยันอีกครั้งเพื่อนำออกจากวงรอบ");
        }

        DB::transaction(function () use ($cycle, $item, $confirmForce, $reason, $hadResults, $request) {
            $item->loadMissing('asset:id,name');

            $this->logCancellation($cycle, [
                'action' => 'remove_item',
                'mode' => 'remove_item',
                'scheduled_date' => optional($item->scheduled_date)->format('Y-m-d'),
                'items_count' => 1,
                'pending_count' => $item->result === 'pending' ? 1 : 0,
                'pass_count' => $item->result === 'pass' ? 1 : 0,
                'fail_count' => $item->result === 'fail' ? 1 : 0,
                'had_results' => $hadResults,
                'force_confirmed' => $confirmForce,
                'reason' => is_string($reason) ? $reason : null,
                'cancelled_by' => $request->user()?->id,
                'meta' => [
                    'item_id' => $item->id,
                    'asset_id' => $item->asset_id,
                    'asset_name' => $item->asset?->name,
                    'result' => $item->result,
                ],
            ]);

            $item->delete();
            $cycle->refreshStatus();
        });

        return back()->with('success', 'นำรายการออกจากวงรอบแล้ว');
    }

    public function completeCycle(EnvAssetInspectionCycle $cycle): RedirectResponse
    {
        if ($cycle->isCancelled()) {
            return back()->with('error', 'วงรอบนี้ถูกยกเลิกแล้ว');
        }

        $pending = $cycle->items()->where('result', 'pending')->count();
        if ($pending > 0) {
            return back()->with('error', "ยังมีรายการรอตรวจ {$pending} รายการ ไม่สามารถปิดวงรอบได้");
        }

        if ($cycle->items()->count() === 0) {
            return back()->with('error', 'ยังไม่มีรายการในวงรอบ');
        }

        $cycle->update(['status' => 'completed']);

        return back()->with('success', 'ปิดวงรอบการตรวจแล้ว');
    }

    public function preparePdf(EnvAssetInspectionCycle $cycle, ThaiPdfService $pdf): HttpResponse
    {
        @ini_set('memory_limit', '1024M');
        @set_time_limit(300);

        $cycle->load(['items.asset.line:id,code,name,short_name']);
        [$fontRegularUri, $fontBoldUri] = $pdf->fontUris();

        $groups = [];
        $no = 0;
        foreach ($cycle->items->sortBy(fn ($i) => [
            $i->department_label ?: 'ไม่ระบุแผนก',
            optional($i->scheduled_date)?->format('Y-m-d') ?? '9999',
            $i->asset?->name ?? '',
        ]) as $item) {
            $asset = $item->asset;
            if (! $asset) {
                continue;
            }
            $dept = trim((string) ($item->department_label ?: 'ไม่ระบุแผนก')) ?: 'ไม่ระบุแผนก';
            $brand = trim((string) ($asset->brand ?? ''));
            $model = trim((string) ($asset->model ?? ''));
            $brandModel = trim($brand.($brand && $model ? ' / ' : '').$model);
            $no++;
            $groups[$dept][] = [
                'no' => $no,
                'name' => $this->pdfCell((string) $asset->name, 70),
                'stock_number' => $this->pdfCell((string) ($asset->stock_number ?? ''), 24) ?: '-',
                'brand_model' => $this->pdfCell($brandModel, 36) ?: '-',
                'serial_number' => $this->pdfCell((string) ($asset->serial_number ?? ''), 24) ?: '-',
                'scheduled_date' => $this->formatThaiDate($item->scheduled_date) ?: '-',
                'line_name' => $asset->line?->short_name ?: $asset->line?->name ?: '-',
            ];
        }

        $html = view('env.assets-inspection-prepare-pdf', [
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
            'hospitalName' => config('department_data.hospital_name', config('app.name', 'โรงพยาบาล')),
            'cycle' => [
                'name' => $cycle->name,
                'fiscal_year' => $cycle->fiscal_year,
                'period_label' => $this->formatThaiDateRange($cycle->period_start, $cycle->period_end)
                    ?: $this->formatThaiDate($cycle->default_scheduled_date),
                'default_scheduled_date' => $this->formatThaiDate($cycle->default_scheduled_date),
                'notes' => $cycle->notes,
            ],
            'groups' => $groups,
            'total' => $no,
            'generatedAt' => $this->formatThaiDateTime(now()),
            'generatedDate' => $this->formatThaiDate(now()),
        ])->render();

        $filename = 'env-inspection-prepare-'.$cycle->id.'-'.now()->format('Ymd-Hi').'.pdf';

        return response($pdf->render($html, 'landscape'), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }

    public function resultPdf(EnvAssetInspectionCycle $cycle, ThaiPdfService $pdf): HttpResponse
    {
        @ini_set('memory_limit', '1024M');
        @set_time_limit(300);

        $cycle->load(['items.asset.line:id,code,name,short_name', 'items.inspector:id,name']);
        [$fontRegularUri, $fontBoldUri] = $pdf->fontUris();

        $counts = [
            'pending' => 0,
            'pass' => 0,
            'fail' => 0,
        ];
        $detailRows = [];
        $no = 0;

        foreach ($cycle->items->sortBy(fn ($i) => [
            $i->result === 'fail' ? 0 : ($i->result === 'pending' ? 1 : 2),
            $i->department_label ?: '',
            $i->asset?->name ?? '',
        ]) as $item) {
            $asset = $item->asset;
            if (! $asset) {
                continue;
            }
            $counts[$item->result] = ($counts[$item->result] ?? 0) + 1;
            $no++;
            $brand = trim((string) ($asset->brand ?? ''));
            $model = trim((string) ($asset->model ?? ''));
            $brandModel = trim($brand.($brand && $model ? ' / ' : '').$model);

            $detailRows[] = [
                'no' => $no,
                'result_label' => EnvAssetInspectionItem::RESULTS[$item->result] ?? $item->result,
                'result' => $item->result,
                'name' => $this->pdfCell((string) $asset->name, 60),
                'stock_number' => $this->pdfCell((string) ($asset->stock_number ?? ''), 22) ?: '-',
                'brand_model' => $this->pdfCell($brandModel, 30) ?: '-',
                'serial_number' => $this->pdfCell((string) ($asset->serial_number ?? ''), 22) ?: '-',
                'department' => $this->pdfCell((string) ($item->department_label ?: '-'), 36),
                'scheduled_date' => $this->formatThaiDate($item->scheduled_date) ?: '-',
                'inspected_at' => $this->formatThaiDate($item->inspected_at) ?: '-',
                'notes' => $this->pdfCell((string) ($item->notes ?? ''), 50) ?: '-',
            ];
        }

        $html = view('env.assets-inspection-result-pdf', [
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
            'hospitalName' => config('department_data.hospital_name', config('app.name', 'โรงพยาบาล')),
            'cycle' => [
                'name' => $cycle->name,
                'fiscal_year' => $cycle->fiscal_year,
                'status_label' => $cycle->status_label,
                'period_label' => $this->formatThaiDateRange($cycle->period_start, $cycle->period_end)
                    ?: $this->formatThaiDate($cycle->default_scheduled_date),
                'notes' => $cycle->notes,
            ],
            'counts' => $counts,
            'detailRows' => $detailRows,
            'total' => $no,
            'generatedAt' => $this->formatThaiDateTime(now()),
            'generatedDate' => $this->formatThaiDate(now()),
        ])->render();

        $filename = 'env-inspection-result-'.$cycle->id.'-'.now()->format('Ymd-Hi').'.pdf';

        return response($pdf->render($html, 'landscape'), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }

    /**
     * @param  list<int>  $assetIds
     */
    private function registerAssetsIntoCycle(
        EnvAssetInspectionCycle $cycle,
        bool $selectAll,
        array $assetIds,
        ?string $scheduledDate,
    ): int {
        $registeredIds = $cycle->items()->pluck('asset_id');

        $assetsQuery = EnvAsset::query()
            ->where('inspection_status', 'inspect')
            ->whereNotIn('id', $registeredIds);

        if (! $selectAll) {
            if ($assetIds === []) {
                return 0;
            }
            $assetsQuery->whereIn('id', $assetIds);
        }

        $assets = $assetsQuery->get(['id', 'issue_location', 'location']);
        if ($assets->isEmpty()) {
            return 0;
        }

        $now = now();
        $rows = $assets->map(fn (EnvAsset $asset) => [
            'cycle_id' => $cycle->id,
            'asset_id' => $asset->id,
            'department_label' => $this->departmentLabelFor($asset),
            'scheduled_date' => $scheduledDate,
            'result' => 'pending',
            'created_at' => $now,
            'updated_at' => $now,
        ])->all();

        foreach (array_chunk($rows, 200) as $chunk) {
            EnvAssetInspectionItem::insert($chunk);
        }

        if ($scheduledDate && ! $cycle->default_scheduled_date) {
            $cycle->update(['default_scheduled_date' => $scheduledDate]);
        }

        $cycle->refreshStatus();

        return $assets->count();
    }

    private function departmentLabelFor(EnvAsset $asset): string
    {
        $label = trim((string) ($asset->issue_location ?: $asset->location ?: ''));

        return $label !== '' ? $label : 'ไม่ระบุแผนก';
    }

    /**
     * @return array<string, mixed>
     */
    /**
     * @param  \Illuminate\Database\Eloquent\Builder<\App\Models\EnvAssetInspectionItem>|\Illuminate\Database\Eloquent\Relations\HasMany  $query
     * @return array{total: int, pending: int, pass: int, fail: int}
     */
    private function resultCountsForQuery($query): array
    {
        $base = clone $query;

        return [
            'total' => (clone $base)->count(),
            'pending' => (clone $base)->where('result', 'pending')->count(),
            'pass' => (clone $base)->where('result', 'pass')->count(),
            'fail' => (clone $base)->where('result', 'fail')->count(),
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function logCancellation(EnvAssetInspectionCycle $cycle, array $payload): void
    {
        EnvAssetInspectionCancellationLog::create([
            'cycle_id' => $cycle->id,
            'action' => $payload['action'],
            'mode' => $payload['mode'] ?? null,
            'scheduled_date' => $payload['scheduled_date'] ?? null,
            'items_count' => (int) ($payload['items_count'] ?? 0),
            'pending_count' => (int) ($payload['pending_count'] ?? 0),
            'pass_count' => (int) ($payload['pass_count'] ?? 0),
            'fail_count' => (int) ($payload['fail_count'] ?? 0),
            'had_results' => (bool) ($payload['had_results'] ?? false),
            'force_confirmed' => (bool) ($payload['force_confirmed'] ?? false),
            'reason' => $payload['reason'] ?? null,
            'meta' => $payload['meta'] ?? null,
            'cancelled_by' => $payload['cancelled_by'] ?? null,
        ]);
    }

    private function serializeCycle(EnvAssetInspectionCycle $cycle): array
    {
        if ($cycle->relationLoaded('canceller') === false && $cycle->cancelled_by) {
            $cycle->load('canceller:id,name');
        }

        return [
            'id' => $cycle->id,
            'name' => $cycle->name,
            'fiscal_year' => $cycle->fiscal_year,
            'status' => $cycle->status,
            'status_label' => $cycle->status_label,
            'period_start' => optional($cycle->period_start)->format('Y-m-d'),
            'period_end' => optional($cycle->period_end)->format('Y-m-d'),
            'period_label' => $this->formatThaiDateRange($cycle->period_start, $cycle->period_end)
                ?: $this->formatThaiDate($cycle->default_scheduled_date),
            'default_scheduled_date' => optional($cycle->default_scheduled_date ?: $cycle->period_start)->format('Y-m-d'),
            'notes' => $cycle->notes,
            'created_by' => $cycle->created_by,
            'creator_name' => $cycle->creator?->name,
            'cancelled_at' => $this->formatThaiDateTime($cycle->cancelled_at),
            'cancelled_by_name' => $cycle->canceller?->name,
            'cancel_reason' => $cycle->cancel_reason,
            'is_cancelled' => $cycle->isCancelled(),
            'items_count' => (int) ($cycle->items_count ?? $cycle->items()->count()),
            'pending_count' => (int) ($cycle->pending_count ?? 0),
            'pass_count' => (int) ($cycle->pass_count ?? 0),
            'fail_count' => (int) ($cycle->fail_count ?? 0),
            'created_at' => $this->formatThaiDateTime($cycle->created_at),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeItem(EnvAssetInspectionItem $item): array
    {
        $asset = $item->asset;

        return [
            'id' => $item->id,
            'cycle_id' => $item->cycle_id,
            'asset_id' => $item->asset_id,
            'department_label' => $item->department_label,
            'scheduled_date' => optional($item->scheduled_date)->format('Y-m-d'),
            'scheduled_date_label' => $this->formatThaiDate($item->scheduled_date),
            'result' => $item->result,
            'result_label' => $item->result_label,
            'notes' => $item->notes,
            'inspected_at' => optional($item->inspected_at)->format('Y-m-d H:i'),
            'inspected_at_label' => $this->formatThaiDateTime($item->inspected_at),
            'inspector_name' => $item->inspector?->name,
            'asset' => $asset ? [
                'id' => $asset->id,
                'name' => $asset->name,
                'stock_number' => $asset->stock_number,
                'serial_number' => $asset->serial_number,
                'brand' => $asset->brand,
                'model' => $asset->model,
                'risk_level' => $asset->risk_level,
                'risk_level_label' => EnvAsset::RISK_LEVELS[$asset->risk_level] ?? $asset->risk_level,
                'issue_location' => $asset->issue_location,
                'location' => $asset->location,
                'line' => $asset->line ? [
                    'id' => $asset->line->id,
                    'name' => $asset->line->name,
                    'short_name' => $asset->line->short_name,
                ] : null,
            ] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeAvailableAsset(EnvAsset $asset): array
    {
        return [
            'id' => $asset->id,
            'name' => $asset->name,
            'stock_number' => $asset->stock_number,
            'serial_number' => $asset->serial_number,
            'brand' => $asset->brand,
            'model' => $asset->model,
            'risk_level' => $asset->risk_level,
            'risk_level_label' => EnvAsset::RISK_LEVELS[$asset->risk_level] ?? $asset->risk_level,
            'issue_location' => $asset->issue_location,
            'location' => $asset->location,
            'line' => $asset->line ? [
                'id' => $asset->line->id,
                'name' => $asset->line->name,
                'short_name' => $asset->line->short_name,
            ] : null,
        ];
    }

    private function pdfCell(string $value, int $maxLen): string
    {
        $value = trim(preg_replace('/\s+/u', ' ', $value) ?? '');
        if ($value === '') {
            return '';
        }
        if (mb_strlen($value) <= $maxLen) {
            return $value;
        }

        return mb_substr($value, 0, $maxLen - 1).'…';
    }

    /**
     * @return array{start: ?string, end: ?string}
     */
    private function normalizePeriod(?string $start, ?string $end): array
    {
        $start = $start ?: null;
        $end = $end ?: null;

        if ($start && ! $end) {
            $end = $start;
        }
        if ($end && ! $start) {
            $start = $end;
        }

        if ($start && $end && $end < $start) {
            [$start, $end] = [$end, $start];
        }

        return ['start' => $start, 'end' => $end];
    }

    private function formatThaiDate(mixed $date): ?string
    {
        if (! $date) {
            return null;
        }

        $dt = $date instanceof CarbonInterface
            ? Carbon::instance($date)->timezone(config('app.timezone'))
            : Carbon::parse($date)->timezone(config('app.timezone'));

        $months = [
            1 => 'ม.ค.', 2 => 'ก.พ.', 3 => 'มี.ค.', 4 => 'เม.ย.', 5 => 'พ.ค.', 6 => 'มิ.ย.',
            7 => 'ก.ค.', 8 => 'ส.ค.', 9 => 'ก.ย.', 10 => 'ต.ค.', 11 => 'พ.ย.', 12 => 'ธ.ค.',
        ];

        return $dt->day.' '.$months[(int) $dt->month].' '.($dt->year + 543);
    }

    private function formatThaiDateTime(mixed $date): ?string
    {
        if (! $date) {
            return null;
        }

        $dt = $date instanceof CarbonInterface
            ? Carbon::instance($date)->timezone(config('app.timezone'))
            : Carbon::parse($date)->timezone(config('app.timezone'));

        return $this->formatThaiDate($dt).' เวลา '.$dt->format('H:i').' น.';
    }

    private function formatThaiDateRange(mixed $start, mixed $end): ?string
    {
        $startLabel = $this->formatThaiDate($start);
        $endLabel = $this->formatThaiDate($end);

        if ($startLabel && $endLabel) {
            return $startLabel === $endLabel ? $startLabel : $startLabel.' – '.$endLabel;
        }

        return $startLabel ?: $endLabel;
    }
}
