<?php

namespace App\Http\Controllers;

use App\Services\ServerMonitorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ServerMonitorController extends Controller
{
    private function authorizeMonitor(): void
    {
        if (! request()->user()?->can('server-monitor.index')) {
            abort(403, 'เฉพาะผู้ดูแลระบบเท่านั้น');
        }
    }

    public function index(): Response
    {
        $this->authorizeMonitor();

        $service = app(ServerMonitorService::class);

        return Inertia::render('ServerMonitor/Dashboard', [
            'initial' => $service->dashboardData('24h'),
            'ranges' => [
                ['value' => '1h', 'label' => '1 ชั่วโมง'],
                ['value' => '6h', 'label' => '6 ชั่วโมง'],
                ['value' => '24h', 'label' => '24 ชั่วโมง'],
                ['value' => '7d', 'label' => '7 วัน'],
            ],
        ]);
    }

    public function metrics(Request $request): JsonResponse
    {
        $this->authorizeMonitor();

        $range = $request->string('range', '24h')->toString();
        if (! in_array($range, ['1h', '6h', '24h', '7d'], true)) {
            $range = '24h';
        }

        return response()->json(
            app(ServerMonitorService::class)->dashboardData($range)
        );
    }

    public function checkNow(): JsonResponse
    {
        $this->authorizeMonitor();

        $service = app(ServerMonitorService::class);
        $results = $service->runAllChecks(false);

        return response()->json([
            'ok' => true,
            'results' => collect($results)->map(fn ($r) => [
                'server_key' => $r['server_key'],
                'status' => $r['status'],
                'message' => $r['message'],
                'checked_at' => $r['checked_at']->toDateTimeString(),
            ]),
            'dashboard' => $service->dashboardData('24h'),
        ]);
    }
}
