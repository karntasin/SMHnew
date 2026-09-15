<?php

namespace App\Http\Controllers\Firewall;

use App\Http\Controllers\Controller;
use App\Models\ThreatIntelIndicator;
use App\Services\FortiGate\FortiGateMonitorService;
use App\Services\FortiGate\FortiGateSyslogProcessManager;
use App\Services\ThreatIntel\ThreatIntelMatcher;
use App\Services\ThreatIntel\ThreatIntelSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FirewallController extends Controller
{
    private function authorizeFirewall(): void
    {
        if (! request()->user()?->can('firewall.index')) {
            abort(403, 'ไม่มีสิทธิ์เข้าถึงโมดูลไฟร์วอลล์');
        }
    }

    public function index(): Response
    {
        $this->authorizeFirewall();
        $service = app(FortiGateMonitorService::class);

        return Inertia::render('Firewall/Dashboard', [
            'initial' => $service->dashboardData('24h'),
            'syslogStatus' => app(FortiGateSyslogProcessManager::class)->status(),
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
        $this->authorizeFirewall();

        $range = $request->string('range', '24h')->toString();
        if (! in_array($range, ['1h', '6h', '24h', '7d'], true)) {
            $range = '24h';
        }

        return response()->json(
            app(FortiGateMonitorService::class)->dashboardData($range)
        );
    }

    public function pollNow(): JsonResponse
    {
        $this->authorizeFirewall();

        $service = app(FortiGateMonitorService::class);
        $result = $service->poll(false);

        return response()->json([
            'ok' => (bool) ($result['ok'] ?? false),
            'message' => $result['message'] ?? null,
            'traffic_log' => $result['traffic_log'] ?? null,
            'dhcp_hosts' => $result['dhcp_hosts'] ?? 0,
            'dashboard' => $service->dashboardData('24h'),
        ]);
    }

    public function webWatch(Request $request): Response
    {
        $this->authorizeFirewall();

        $page = max(1, (int) $request->input('page', 1));
        $logs = app(FortiGateMonitorService::class)->listLogs('web-watch', $page, 50);

        return Inertia::render('Firewall/WebWatch', [
            'logs' => $logs,
            'denyPatterns' => config('fortigate.web_deny_patterns', []),
            'watchPatterns' => config('fortigate.web_watch_patterns', []),
        ]);
    }

    public function threats(Request $request): Response
    {
        $this->authorizeFirewall();

        $page = max(1, (int) $request->input('page', 1));
        $scope = $request->string('scope', 'threats')->toString();
        if (! in_array($scope, ['threats', 'ti-hits', 'risky-ports'], true)) {
            $scope = 'threats';
        }
        $logs = app(FortiGateMonitorService::class)->listLogs($scope, $page, 50);

        return Inertia::render('Firewall/Threats', [
            'logs' => $logs,
            'scope' => $scope,
        ]);
    }

    public function logs(Request $request): Response
    {
        $this->authorizeFirewall();

        $scope = $request->string('scope', 'all')->toString();
        if (! in_array($scope, ['all', 'webfilter', 'app-ctrl', 'web-deny', 'threats', 'ti-hits', 'risky-ports', 'traffic'], true)) {
            $scope = 'all';
        }
        $page = max(1, (int) $request->input('page', 1));
        $logs = app(FortiGateMonitorService::class)->listLogs($scope, $page, 50);

        return Inertia::render('Firewall/Logs', [
            'logs' => $logs,
            'scope' => $scope,
            'trafficLogNote' => 'Traffic จาก Syslog (UDP 5514) จะโชว์ในหัวข้อ «ทราฟฟิก» — API memory/traffic ของ FortiGate เครื่องนี้ยังเป็น 404 อยู่',
        ]);
    }

    public function threatIntel(): Response
    {
        $this->authorizeFirewall();

        $page = max(1, (int) request()->input('page', 1));
        $hits = app(FortiGateMonitorService::class)->listLogs('ti-hits', $page, 30);

        return Inertia::render('Firewall/ThreatIntel', [
            'intel' => app(ThreatIntelSyncService::class)->dashboard(),
            'hits' => $hits,
        ]);
    }

    public function syncThreatIntel(Request $request): RedirectResponse
    {
        $this->authorizeFirewall();

        $feed = $request->string('feed')->toString();
        $only = $feed !== '' ? [$feed] : null;
        $results = app(ThreatIntelSyncService::class)->syncAll($only);

        $ok = collect($results)->contains(fn ($r) => ($r['status'] ?? '') === 'ok');

        return back()->with(
            $ok ? 'success' : 'warning',
            'ซิงก์ Threat Intelligence เสร็จแล้ว — '.collect($results)->map(
                fn ($r, $k) => $k.':'.($r['status'] ?? '?')
            )->implode(', ')
        );
    }

    public function storeCustomIndicator(Request $request): RedirectResponse
    {
        $this->authorizeFirewall();

        $data = $request->validate([
            'type' => 'required|in:ip,domain,url,cidr',
            'value' => 'required|string|max:512',
            'threat_type' => 'nullable|string|max:120',
        ]);

        app(ThreatIntelSyncService::class)->addCustomIndicator(
            $data['type'],
            $data['value'],
            $data['threat_type'] ?? 'custom-blacklist'
        );

        return back()->with('success', 'เพิ่มรายการ blacklist แล้ว');
    }

    public function destroyCustomIndicator(int $id): RedirectResponse
    {
        $this->authorizeFirewall();

        ThreatIntelIndicator::query()
            ->where('id', $id)
            ->whereIn('feed', ['custom', 'thai'])
            ->delete();

        app(ThreatIntelMatcher::class)->flushIndex();

        return back()->with('success', 'ลบรายการแล้ว');
    }

    public function syslogStatus(): JsonResponse
    {
        $this->authorizeFirewall();

        return response()->json(
            app(FortiGateSyslogProcessManager::class)->status()
        );
    }

    public function syslogStart(): JsonResponse
    {
        $this->authorizeFirewall();

        $result = app(FortiGateSyslogProcessManager::class)->start();

        return response()->json($result, ($result['ok'] ?? false) ? 200 : 422);
    }

    public function syslogStop(): JsonResponse
    {
        $this->authorizeFirewall();

        $result = app(FortiGateSyslogProcessManager::class)->stop();

        return response()->json($result, ($result['ok'] ?? false) ? 200 : 422);
    }
}
