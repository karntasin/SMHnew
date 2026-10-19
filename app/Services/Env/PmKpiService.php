<?php

namespace App\Services\Env;

use App\Models\EnvAsset;
use App\Models\EnvPmWorkOrder;
use App\Models\EnvPmWorkOrderPart;
use App\Models\MaintenanceRequest;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class PmKpiService
{
    /**
     * @return array<string, mixed>
     */
    public function summarize(int $year, ?int $month = null): array
    {
        [$start, $end] = $this->period($year, $month);

        $due = EnvPmWorkOrder::query()
            ->where('status', '!=', 'cancelled')
            ->whereBetween('due_date', [$start->toDateString(), $end->toDateString()]);

        $dueTotal = (clone $due)->count();
        $onTime = (clone $due)
            ->where('status', 'completed')
            ->whereNotNull('completed_at')
            ->whereRaw('DATE(completed_at) <= due_date')
            ->count();

        $overdue = EnvPmWorkOrder::query()
            ->whereIn('status', EnvPmWorkOrder::OPEN_STATUSES)
            ->whereDate('due_date', '<', now()->toDateString())
            ->count();

        $repairs = MaintenanceRequest::query()
            ->whereNotNull('env_asset_id')
            ->where('status', 'completed')
            ->whereNotNull('started_at')
            ->whereNotNull('completed_at')
            ->whereBetween('completed_at', [$start, $end])
            ->get(['id', 'env_asset_id', 'started_at', 'completed_at']);

        $mttrHours = $this->averageHours($repairs->map(function (MaintenanceRequest $request) {
            return $request->started_at->diffInMinutes($request->completed_at) / 60;
        }));

        $mtbf = $this->mtbfHours();

        $completed = EnvPmWorkOrder::query()
            ->with(['parts', 'asset:id,name,stock_number,annual_pm_budget'])
            ->where('status', 'completed')
            ->whereBetween('completed_at', [$start, $end])
            ->get();

        $labor = round((float) $completed->sum('labor_cost'), 2);
        $parts = round($completed->sum(function (EnvPmWorkOrder $order) {
            return $order->parts->sum(fn (EnvPmWorkOrderPart $part) => (float) $part->qty * (float) $part->unit_cost);
        }), 2);

        $annualBudget = round((float) EnvAsset::query()->sum('annual_pm_budget'), 2);
        $periodBudget = $month ? round($annualBudget / 12, 2) : $annualBudget;

        $byAsset = $completed
            ->groupBy('asset_id')
            ->map(function (Collection $rows) {
                $asset = $rows->first()?->asset;
                $laborCost = round((float) $rows->sum('labor_cost'), 2);
                $partsCost = round($rows->sum(function (EnvPmWorkOrder $order) {
                    return $order->parts->sum(fn (EnvPmWorkOrderPart $part) => (float) $part->qty * (float) $part->unit_cost);
                }), 2);

                return [
                    'asset_id' => $asset?->id,
                    'name' => $asset?->name,
                    'stock_number' => $asset?->stock_number,
                    'labor_cost' => $laborCost,
                    'parts_cost' => $partsCost,
                    'cost' => round($laborCost + $partsCost, 2),
                    'budget' => $asset?->annual_pm_budget,
                ];
            })
            ->sortByDesc('cost')
            ->take(8)
            ->values()
            ->all();

        return [
            'compliance_rate' => $dueTotal > 0 ? round($onTime / $dueTotal * 100, 1) : null,
            'compliance_on_time' => $onTime,
            'compliance_total' => $dueTotal,
            'overdue' => $overdue,
            'mttr_hours' => $mttrHours,
            'mttr_samples' => $repairs->count(),
            'mtbf_hours' => $mtbf['hours'],
            'mtbf_samples' => $mtbf['samples'],
            'labor_cost' => $labor,
            'parts_cost' => $parts,
            'cost' => round($labor + $parts, 2),
            'budget' => $annualBudget,
            'budget_for_period' => $periodBudget,
            'by_asset' => $byAsset,
        ];
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function period(int $year, ?int $month): array
    {
        if ($month) {
            $start = Carbon::create($year, $month, 1)->startOfMonth();

            return [$start, $start->copy()->endOfMonth()];
        }

        $start = Carbon::create($year, 1, 1)->startOfYear();

        return [$start, $start->copy()->endOfYear()];
    }

    /**
     * @param  Collection<int, float>  $hours
     */
    private function averageHours(Collection $hours): ?float
    {
        if ($hours->isEmpty()) {
            return null;
        }

        return round($hours->avg(), 1);
    }

    /**
     * @return array{hours: ?float, samples: int}
     */
    private function mtbfHours(): array
    {
        $repairs = MaintenanceRequest::query()
            ->whereNotNull('env_asset_id')
            ->where('status', 'completed')
            ->whereNotNull('completed_at')
            ->orderBy('completed_at')
            ->get(['env_asset_id', 'completed_at'])
            ->groupBy('env_asset_id');

        $gaps = collect();
        foreach ($repairs as $rows) {
            $times = $rows->values();
            for ($i = 1; $i < $times->count(); $i++) {
                $gaps->push($times[$i - 1]->completed_at->diffInMinutes($times[$i]->completed_at) / 60);
            }
        }

        return [
            'hours' => $this->averageHours($gaps),
            'samples' => $gaps->count(),
        ];
    }
}
