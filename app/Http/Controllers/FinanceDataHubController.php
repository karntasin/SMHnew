<?php

namespace App\Http\Controllers;

use App\Models\Finance\CgdReconciliation;
use App\Models\Finance\CgdStmBatch;
use App\Services\Finance\CgdHosxpClaimService;
use App\Support\Finance\DataHubSchemes;
use Inertia\Inertia;
use Inertia\Response;

class FinanceDataHubController extends Controller
{
    public function __construct(
        private readonly CgdHosxpClaimService $hosxp,
    ) {}

    public function index(): Response
    {
        $latest = CgdReconciliation::query()->with('batch')->latest()->first();
        $schemes = collect(DataHubSchemes::all())->map(function (array $meta) {
            return [
                'key' => $meta['key'],
                'title' => $meta['title'],
                'short' => $meta['short'],
                'subtitle' => $meta['subtitle'],
                'description' => $meta['description'],
                'import_label' => $meta['import_label'],
                'import_hint' => $meta['import_hint'],
                'icon' => $meta['icon'],
                'tone' => $meta['tone'],
                'status' => $meta['status'],
                'dashboard_url' => route($meta['dashboard_route']),
                'import_url' => route($meta['import_route']),
            ];
        })->values()->all();

        return Inertia::render('Finance/DataHub/Index', [
            'hosxpReady' => $this->hosxp->available(),
            'stats' => [
                'batch_count' => CgdStmBatch::count(),
                'row_count' => (int) CgdStmBatch::sum('row_count'),
                'total_claim' => (float) CgdStmBatch::sum('total_claim'),
                'total_approved' => (float) CgdStmBatch::sum('total_approved'),
                'latest_shortfall' => (float) ($latest?->total_shortfall ?? 0),
                'latest_matched_short' => (int) ($latest?->matched_short ?? 0),
                'ready_modules' => collect($schemes)->where('status', 'ready')->count(),
                'planned_modules' => collect($schemes)->where('status', 'planned')->count(),
            ],
            'schemes' => $schemes,
        ]);
    }
}
