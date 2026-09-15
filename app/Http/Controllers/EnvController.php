<?php

namespace App\Http\Controllers;

use App\Models\EnvAsset;
use App\Models\EnvAssetLine;
use App\Models\EnvAssetStatusLog;
use Inertia\Inertia;
use Inertia\Response;

class EnvController extends Controller
{
    public function index(): Response
    {
        $statusTotals = EnvAsset::query()
            ->selectRaw('registry_status, COUNT(*) as total, COALESCE(SUM(price),0) as value')
            ->groupBy('registry_status')
            ->get()
            ->keyBy('registry_status');

        $lines = EnvAssetLine::query()
            ->orderBy('sort_order')
            ->get(['id', 'code', 'name', 'short_name'])
            ->map(function (EnvAssetLine $line) {
                $base = EnvAsset::query()->where('line_id', $line->id);
                $byStatus = (clone $base)
                    ->selectRaw('registry_status, COUNT(*) as total')
                    ->groupBy('registry_status')
                    ->pluck('total', 'registry_status');

                return [
                    'id' => $line->id,
                    'code' => $line->code,
                    'name' => $line->name,
                    'short_name' => $line->short_name,
                    'total' => (clone $base)->count(),
                    'normal' => (int) ($byStatus['normal'] ?? 0),
                    'repair' => (int) ($byStatus['repair'] ?? 0),
                    'pending_disposal' => (int) ($byStatus['pending_disposal'] ?? 0),
                    'disposed' => (int) ($byStatus['disposed'] ?? 0),
                    'with_image' => (clone $base)->whereNotNull('image_path')->where('image_path', '!=', '')->count(),
                    'value' => (float) (clone $base)
                        ->whereIn('registry_status', ['normal', 'repair', 'pending_disposal'])
                        ->sum('price'),
                ];
            });

        $recentChanges = EnvAssetStatusLog::query()
            ->with(['asset:id,name,stock_number,line_id', 'asset.line:id,name,short_name'])
            ->latest('id')
            ->limit(8)
            ->get()
            ->map(fn (EnvAssetStatusLog $log) => [
                'id' => $log->id,
                'asset_name' => $log->asset?->name,
                'stock_number' => $log->asset?->stock_number,
                'line' => $log->asset?->line?->short_name ?: $log->asset?->line?->name,
                'from' => EnvAsset::REGISTRY_STATUSES[$log->from_registry_status]
                    ?? $log->from_registry_status,
                'to' => EnvAsset::REGISTRY_STATUSES[$log->to_registry_status]
                    ?? $log->to_registry_status,
                'event_date' => optional($log->event_date)->format('d/m/Y'),
                'note' => $log->note,
            ]);

        $total = EnvAsset::count();
        $withImage = EnvAsset::whereNotNull('image_path')->where('image_path', '!=', '')->count();
        $activeValue = (float) EnvAsset::query()
            ->whereIn('registry_status', ['normal', 'repair', 'pending_disposal'])
            ->sum('price');

        return Inertia::render('Env/Index', [
            'dashboard' => [
                'total' => $total,
                'normal' => (int) ($statusTotals['normal']->total ?? 0),
                'repair' => (int) ($statusTotals['repair']->total ?? 0),
                'pending_disposal' => (int) ($statusTotals['pending_disposal']->total ?? 0),
                'disposed' => (int) ($statusTotals['disposed']->total ?? 0),
                'with_image' => $withImage,
                'image_coverage' => $total > 0 ? round(($withImage / $total) * 100, 1) : 0,
                'value' => $activeValue,
                'status_values' => collect(EnvAsset::REGISTRY_STATUSES)->map(fn ($label, $key) => [
                    'key' => $key,
                    'label' => $label,
                    'total' => (int) ($statusTotals[$key]->total ?? 0),
                    'value' => (float) ($statusTotals[$key]->value ?? 0),
                ])->values(),
                'lines' => $lines,
                'recent_changes' => $recentChanges,
            ],
        ]);
    }
}
