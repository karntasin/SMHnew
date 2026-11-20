<?php

namespace App\Http\Controllers\Im;

use App\Http\Controllers\Controller;
use App\Models\Im\Asset;
use App\Models\Im\AssetDisposal;
use App\Models\Im\AssetRepair;
use App\Models\Im\ChangeRequest;
use App\Models\Im\Competency;
use App\Models\User;
use App\Services\ThaiPdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ResourceController extends Controller
{
    public function index(): Response
    {
        $assets = Asset::with([
            'repairs' => fn ($q) => $q->latest('reported_at')->latest('id')->limit(20),
            'openRepair',
            'disposals' => fn ($q) => $q->latest('disposed_at')->latest('id')->limit(10),
            'systemSpec',
        ])
        ->leftJoin('im_asset_specs', 'im_assets.id', '=', 'im_asset_specs.asset_id')
        ->select('im_assets.*')
        ->orderByRaw('CASE WHEN im_asset_specs.last_seen_at >= DATE_SUB(NOW(), INTERVAL 25 MINUTE) THEN 1 ELSE 0 END DESC')
        ->orderBy('im_asset_specs.last_seen_at', 'desc')
        ->orderBy('im_assets.id', 'desc')
        ->get();

        // Sanitize security status: omit Real-time Protection and self-agent false positives
        foreach ($assets as $a) {
            if ($a->systemSpec && is_array($a->systemSpec->security_status)) {
                $sec = $a->systemSpec->security_status;
                if (! empty($sec['alerts'])) {
                    $sec['alerts'] = array_values(array_filter($sec['alerts'], function ($al) {
                        $low = strtolower((string) $al);
                        return ! str_contains($low, 'real-time protection')
                            && ! str_contains($low, 'realtime protection')
                            && ! str_contains($low, 'quarantined')
                            && ! str_contains($low, 'remediated')
                            && ! str_contains($low, 'microsoft defender antivirus has detected')
                            && ! str_contains($low, 'powershell')
                            && ! str_contains($low, 'smh-agent')
                            && ! str_contains($low, 'rustdesk');
                    }));
                }
                if (! empty($sec['active_threats'])) {
                    $sec['active_threats'] = array_values(array_filter($sec['active_threats'], function ($t) {
                        $action = strtolower((string) ($t['action_taken'] ?? ''));
                        if (in_array($action, ['quarantined', 'removed', 'cleaned', 'remediated/quarantined', 'remediated'], true)) {
                            return false;
                        }
                        $path = strtolower((string) ($t['path'] ?? ''));
                        $name = strtolower((string) ($t['name'] ?? ''));
                        return ! str_contains($path, 'powershell.exe')
                            && ! str_contains($path, 'smh-agent')
                            && ! str_contains($path, 'rustdesk')
                            && ! str_contains($path, 'ar25b4kv5ysi')
                            && ! str_contains($name, 'microsoft defender antivirus has detected');
                    }));
                }
                if (empty($sec['alerts']) && empty($sec['active_threats']) && empty($sec['vpn_detected']) && empty($sec['anomalies']['hacker_tools'])) {
                    $sec['threat_score'] = 0;
                    $sec['threat_level'] = 'normal';
                    $a->systemSpec->threat_score = 0;
                    $a->systemSpec->threat_level = 'normal';
                }
                $a->systemSpec->security_status = $sec;
            }
        }

        $competencies = Competency::with('user:id,name')->latest('assessed_at')->get();
        $changes = ChangeRequest::with('approver:id,name')->latest()->take(200)->get();

        $utilized = $assets->whereNotNull('utilization');

        return Inertia::render('Im/Resource', [
            'assets' => $assets,
            'competencies' => $competencies,
            'changes' => $changes,
            'staff' => User::orderBy('name')->get(['id', 'name']),
            'deviceTypes' => Asset::DEVICE_TYPES,
            'serverLanIp' => $this->getServerLanIp(),
            'summary' => [
                'hardware' => $assets->where('type', 'hardware')->count(),
                'software' => $assets->where('type', 'software')->count(),
                'network' => $assets->where('type', 'network')->count(),
                'active' => $assets->where('status', 'active')->count(),
                'repair' => $assets->where('status', 'repair')->count(),
                'disposed' => $assets->where('status', 'disposed')->count(),
                'expired_license' => $assets->where('license_status', 'expired')->count(),
                'avg_utilization' => $utilized->count() ? round($utilized->avg('utilization'), 1) : 0,
                'high_utilization' => $utilized->where('utilization', '>=', 80)->count(),
                'competency_gap' => $competencies->filter(fn ($c) => $c->gap < 0)->count(),
                'pending_changes' => $changes->where('status', 'pending')->count(),
                'threats_count' => $assets->filter(fn ($a) => ($a->systemSpec?->threat_level === 'critical'))->count(),
                'vpn_count' => $assets->filter(fn ($a) => ($a->systemSpec?->vpn_detected))->count(),
                'warning_count' => $assets->filter(fn ($a) => ($a->systemSpec?->threat_level === 'warning'))->count(),
            ],
        ]);
    }

    /**
     * Get real-time status and live metrics for a computer asset
     * Does NOT save logs to DB; uses transient cache and direct ping
     */
    public function liveStatus(Request $request, Asset $asset): JsonResponse
    {
        // Signal agent that admin is actively watching (triggers live streaming if agent reports)
        Cache::put('im_live_watch_'.$asset->id, true, 30);

        $spec = $asset->systemSpec;
        $ip = $spec?->ip_address;

        $pingResult = ['ok' => false, 'ms' => null];
        if ($ip && filter_var($ip, FILTER_VALIDATE_IP)) {
            $pingResult = $this->pingHost($ip);
        }

        $liveStats = Cache::get('im_live_stats_'.$asset->id);
        $liveSecurity = Cache::get('im_live_security_'.$asset->id) ?? $spec?->security_status;
        $lastSeenTimestamp = Cache::get('im_agent_last_seen_'.$asset->id);

        $isOnline = $pingResult['ok'] || ($lastSeenTimestamp && (time() - $lastSeenTimestamp < 150));

        return response()->json([
            'asset_id' => $asset->id,
            'online' => $isOnline,
            'ping_ms' => $pingResult['ms'],
            'last_seen_at' => $spec?->last_seen_at?->toIso8601String(),
            'live_stats' => $liveStats,
            'spec' => $spec,
            'security' => $liveSecurity,
            'threat_level' => $spec?->threat_level ?? 'normal',
            'threat_score' => $spec?->threat_score ?? 0,
            'vpn_detected' => (bool) ($spec?->vpn_detected ?? false),
        ]);
    }

    /**
     * Create Service Desk ticket or repair request directly from security alert
     */
    public function reportThreatTicket(Request $request, Asset $asset): JsonResponse
    {
        $spec = $asset->systemSpec;
        $security = Cache::get('im_live_security_'.$asset->id) ?? $spec?->security_status ?? [];
        $threatLevel = $spec?->threat_level ?? 'warning';
        $isVpn = (bool) ($spec?->vpn_detected ?? false);

        $alertLines = ! empty($security['alerts']) ? implode("\n- ", (array) $security['alerts']) : 'พบพฤติกรรมที่ไม่พึงประสงค์หรือการใช้งาน VPN';

        $type = $request->input('type', 'ticket');

        if ($type === 'repair') {
            $repair = AssetRepair::create([
                'asset_id' => $asset->id,
                'repair_no' => $this->nextDocNo('REP', AssetRepair::class, 'repair_no'),
                'reported_at' => now()->toDateString(),
                'symptom' => "[ความมั่นคงปลอดภัย] {$alertLines}",
                'reported_by' => Auth::user()?->name ?? 'ระบบตรวจจับอัตโนมัติ',
                'status' => 'open',
                'note' => 'ส่งตรวจสอบ/ล้างเครื่องเนื่องจากตรวจพบความเสี่ยงด้านความปลอดภัยไซเบอร์หรือ VPN',
            ]);
            $asset->update(['status' => 'repair']);

            return response()->json([
                'success' => true,
                'message' => 'สร้างใบแจ้งซ่อม/ตรวจสอบเครื่องเรียบร้อย',
                'repair' => $repair,
            ]);
        }

        // Default: Create ServiceTicket
        $ticketNo = 'TK-'.date('ymd').'-'.str_pad((string) (\App\Models\Im\ServiceTicket::whereDate('created_at', today())->count() + 1), 3, '0', STR_PAD_LEFT);
        $title = $threatLevel === 'critical'
            ? "[ภัยคุกคามไซเบอร์] ตรวจพบมัลแวร์/การโจมตีบนเครื่อง {$asset->name}"
            : ($isVpn ? "[ตรวจพบ VPN] เครื่อง {$asset->name} มีการเชื่อมต่อเครือข่ายภายนอกผ่าน VPN" : "[แจ้งเตือนความปลอดภัย] ตรวจพบความเสี่ยงบนเครื่อง {$asset->name}");

        $ticket = \App\Models\Im\ServiceTicket::create([
            'ticket_no' => $ticketNo,
            'title' => $title,
            'description' => "รายงานจากระบบตรวจจับความปลอดภัย (FSHH Security Radar):\n- {$alertLines}\n\nข้อมูลเครื่อง:\n- ทะเบียน: {$asset->asset_code}\n- ชื่อเครื่อง: {$asset->name}\n- IP: " . ($spec?->ip_address ?? '-') . "\n- MAC: " . ($asset->mac_address ?: ($spec?->mac_address ?: '-')) . "\n- แผนก/ที่ตั้ง: " . ($asset->department ?: '-') . " / " . ($asset->location ?: '-') . "\n- ผู้ใช้งานล่าสุด: " . ($asset->assigned_user ?: ($spec?->logged_user ?: '-')) . "\n- รายงานโดย: " . (Auth::user()?->name ?? 'เจ้าหน้าที่ไอที') . "\n- วันที่ตรวจพบ: " . now()->format('d/m/Y H:i:s'),
            'requester' => Auth::user()?->name ?? 'FSHH Security Radar',
            'department' => $asset->department ?: 'กลุ่มงานสารสนเทศทางการแพทย์ (IM)',
            'category' => 'ความปลอดภัย (Security)',
            'priority' => $threatLevel === 'critical' ? 'urgent' : 'high',
            'sla_hours' => $threatLevel === 'critical' ? 4 : 12,
            'status' => 'open',
            'opened_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "สร้างตั๋วงาน {$ticket->ticket_no} ใน Service Desk เรียบร้อย",
            'ticket' => $ticket,
        ]);
    }

    private function pingHost(string $host): array
    {
        $flag = PHP_OS_FAMILY === 'Windows' ? '-n 1 -w 800' : '-c 1 -W 1';
        $cmd = 'ping '.$flag.' '.escapeshellarg($host).' 2>&1';

        try {
            $output = shell_exec($cmd) ?? '';
        } catch (\Throwable) {
            return ['ok' => false, 'ms' => null];
        }

        if (preg_match('/(?:time[=<]|เวลา=)\s*(\d+)\s*ms/i', $output, $m)) {
            return ['ok' => true, 'ms' => (int) $m[1]];
        }

        if (stripos($output, 'TTL=') !== false || stripos($output, 'ttl=') !== false) {
            return ['ok' => true, 'ms' => 1];
        }

        return ['ok' => false, 'ms' => null];
    }

    private function getServerLanIp(): string
    {
        $ip = gethostbyname(gethostname());
        if ($ip && filter_var($ip, FILTER_VALIDATE_IP) && ! str_starts_with($ip, '127.')) {
            return $ip;
        }

        return '192.168.1.214';
    }

    public function storeAsset(Request $request)
    {
        Asset::create($this->prepareAssetData($request));
        app(\App\Services\Im\AssetMacLookup::class)->forgetCache();

        return back()->with('success', 'เพิ่มทรัพยากรเรียบร้อย');
    }

    public function updateAsset(Request $request, Asset $asset)
    {
        $asset->update($this->prepareAssetData($request));
        app(\App\Services\Im\AssetMacLookup::class)->forgetCache();

        return back()->with('success', 'อัปเดตทรัพยากรเรียบร้อย');
    }

    public function destroyAsset(Asset $asset)
    {
        $asset->delete();
        app(\App\Services\Im\AssetMacLookup::class)->forgetCache();

        return back()->with('success', 'ลบทรัพยากรเรียบร้อย');
    }

    public function storeRepair(Request $request, Asset $asset)
    {
        if ($asset->status === 'disposed') {
            throw ValidationException::withMessages([
                'asset_id' => 'ทรัพย์สินที่จำหน่ายแล้วไม่สามารถส่งซ่อมได้',
            ]);
        }

        if ($asset->status === 'repair' || $asset->openRepair()->exists()) {
            throw ValidationException::withMessages([
                'asset_id' => 'มีรายการส่งซ่อมที่ยังไม่ปิดงานอยู่แล้ว',
            ]);
        }

        $data = $request->validate([
            'reported_at' => 'required|date',
            'symptom' => 'required|string',
            'vendor' => 'nullable|string|max:255',
            'cost' => 'nullable|numeric|min:0',
            'reported_by' => 'nullable|string|max:255',
            'handled_by' => 'nullable|string|max:255',
            'note' => 'nullable|string',
        ]);

        DB::transaction(function () use ($asset, $data) {
            AssetRepair::create([
                ...$data,
                'asset_id' => $asset->id,
                'repair_no' => $this->nextDocNo('REP', AssetRepair::class, 'repair_no'),
                'status' => 'open',
                'reported_by' => $data['reported_by'] ?: Auth::user()?->name,
            ]);

            $asset->update(['status' => 'repair']);
        });

        return back()->with('success', 'บันทึกการส่งซ่อมเรียบร้อย');
    }

    public function completeRepair(Request $request, Asset $asset, AssetRepair $repair)
    {
        if ($repair->asset_id !== $asset->id) {
            abort(404);
        }

        if ($repair->status !== 'open') {
            throw ValidationException::withMessages([
                'repair' => 'รายการซ่อมนี้ปิดงานแล้ว',
            ]);
        }

        $data = $request->validate([
            'returned_at' => 'required|date',
            'result' => 'required|string',
            'cost' => 'nullable|numeric|min:0',
            'handled_by' => 'nullable|string|max:255',
            'note' => 'nullable|string',
            'status' => 'nullable|in:done,cancelled',
        ]);

        $finalStatus = $data['status'] ?? 'done';

        DB::transaction(function () use ($asset, $repair, $data, $finalStatus) {
            $repair->update([
                'returned_at' => $data['returned_at'],
                'result' => $data['result'],
                'cost' => $data['cost'] ?? $repair->cost,
                'handled_by' => $data['handled_by'] ?: ($repair->handled_by ?: Auth::user()?->name),
                'note' => $data['note'] ?? $repair->note,
                'status' => $finalStatus,
            ]);

            if ($asset->status === 'repair') {
                $asset->update(['status' => 'active']);
            }
        });

        return back()->with('success', $finalStatus === 'cancelled' ? 'ยกเลิกการส่งซ่อมเรียบร้อย' : 'รับคืนจากการซ่อมเรียบร้อย');
    }

    public function storeDisposal(Request $request, Asset $asset)
    {
        if ($asset->status === 'disposed') {
            throw ValidationException::withMessages([
                'asset_id' => 'ทรัพย์สินนี้จำหน่ายแล้ว',
            ]);
        }

        if ($asset->status === 'repair' || $asset->openRepair()->exists()) {
            throw ValidationException::withMessages([
                'asset_id' => 'กรุณารับคืนจากการซ่อมก่อนจำหน่าย',
            ]);
        }

        $data = $request->validate([
            'disposed_at' => 'required|date',
            'method' => 'required|in:sell,donate,destroy,other',
            'reason' => 'required|string',
            'document_ref' => 'nullable|string|max:255',
            'approved_by' => 'nullable|string|max:255',
            'note' => 'nullable|string',
        ]);

        DB::transaction(function () use ($asset, $data) {
            AssetDisposal::create([
                ...$data,
                'asset_id' => $asset->id,
                'disposal_no' => $this->nextDocNo('DSP', AssetDisposal::class, 'disposal_no'),
                'approved_by' => $data['approved_by'] ?: Auth::user()?->name,
            ]);

            $asset->update(['status' => 'disposed']);
        });

        return back()->with('success', 'บันทึกการจำหน่ายเรียบร้อย');
    }

    private function validateAsset(Request $request): array
    {
        return $request->validate([
            'asset_code' => 'nullable|string|max:48',
            'name' => 'required|string|max:255',
            'brand' => 'nullable|string|max:255',
            'type' => 'required|in:hardware,software,network',
            'device_type' => 'nullable|string|max:64',
            'spec' => 'nullable|string',
            'cpu' => 'nullable|string|max:255',
            'os' => 'nullable|string|max:255',
            'mac_address' => 'nullable|string|max:64',
            'license_status' => 'required|in:licensed,free,expired,na',
            'quantity' => 'required|integer|min:1',
            'capacity' => 'nullable|string|max:255',
            'utilization' => 'nullable|numeric|min:0|max:100',
            'location' => 'nullable|string|max:255',
            'assigned_user' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:255',
            'status' => 'required|in:active,repair,disposed',
            'note' => 'nullable|string',
        ]);
    }

    /** @return array<string, mixed> */
    private function prepareAssetData(Request $request): array
    {
        $data = $this->validateAsset($request);
        $normalized = \App\Services\Im\AssetMacLookup::normalize($data['mac_address'] ?? null);
        $data['mac_address'] = $normalized;

        return $data;
    }

    private function nextDocNo(string $prefix, string $modelClass, string $column): string
    {
        $date = date('Ymd');
        $count = $modelClass::whereDate('created_at', today())->count() + 1;

        return $prefix.'-'.$date.'-'.str_pad((string) $count, 4, '0', STR_PAD_LEFT);
    }

    public function storeCompetency(Request $request)
    {
        $data = $this->validateCompetency($request);
        $data['gap'] = $data['actual_level'] - $data['required_level'];
        Competency::create($data);

        return back()->with('success', 'บันทึกการประเมินสมรรถนะเรียบร้อย');
    }

    public function updateCompetency(Request $request, Competency $competency)
    {
        $data = $this->validateCompetency($request);
        $data['gap'] = $data['actual_level'] - $data['required_level'];
        $competency->update($data);

        return back()->with('success', 'อัปเดตสมรรถนะเรียบร้อย');
    }

    public function destroyCompetency(Competency $competency)
    {
        $competency->delete();

        return back()->with('success', 'ลบรายการเรียบร้อย');
    }

    private function validateCompetency(Request $request): array
    {
        return $request->validate([
            'user_id' => 'nullable|exists:users,id',
            'staff_name' => 'required|string|max:255',
            'competency' => 'required|string|max:255',
            'required_level' => 'required|integer|min:1|max:5',
            'actual_level' => 'required|integer|min:1|max:5',
            'idp' => 'nullable|string',
            'assessed_at' => 'nullable|date',
        ]);
    }

    public function storeChange(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'requested_by' => 'nullable|string|max:255',
            'category' => 'nullable|string|max:255',
            'impact' => 'required|in:low,medium,high',
            'risk_note' => 'nullable|string',
            'planned_date' => 'nullable|date',
            'note' => 'nullable|string',
        ]);
        $data['cr_no'] = 'CR-'.date('ymd').'-'.str_pad((string) (ChangeRequest::whereDate('created_at', today())->count() + 1), 3, '0', STR_PAD_LEFT);
        $data['status'] = 'pending';
        $data['requested_by'] = $data['requested_by'] ?: Auth::user()?->name;

        ChangeRequest::create($data);

        return back()->with('success', 'ส่งคำขอเปลี่ยนแปลงเรียบร้อย');
    }

    public function updateChangeStatus(Request $request, ChangeRequest $change)
    {
        $data = $request->validate([
            'status' => 'required|in:pending,approved,rejected,implemented',
            'note' => 'nullable|string',
        ]);

        if (in_array($data['status'], ['approved', 'rejected'])) {
            $data['approved_by'] = Auth::id();
            $data['approved_at'] = now();
        }

        $change->update($data);

        return back()->with('success', 'อัปเดตสถานะคำขอเรียบร้อย');
    }

    public function destroyChange(ChangeRequest $change)
    {
        $change->delete();

        return back()->with('success', 'ลบคำขอเรียบร้อย');
    }

    /**
     * Export Computer Assets report as PDF categorized by computer type, CPU and OS
     */
    public function exportComputersPdf(Request $request, ThaiPdfService $pdf): HttpResponse
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);

        $selectedDeviceType = $request->query('device_type');
        $selectedCpu = $request->query('cpu');
        $selectedOs = $request->query('os');
        $selectedStatus = $request->query('status');
        $selectedDept = $request->query('department');

        $query = Asset::with(['systemSpec'])
            ->where(function ($q) {
                $q->whereIn('device_type', ['computer', 'notebook', 'server'])
                    ->orWhereNotNull('cpu')
                    ->orWhereNotNull('os');
            });

        if ($selectedDeviceType && $selectedDeviceType !== 'all') {
            $query->where('device_type', $selectedDeviceType);
        }

        if ($selectedStatus && $selectedStatus !== 'all') {
            $query->where('status', $selectedStatus);
        }

        if ($selectedDept && $selectedDept !== 'all') {
            $query->where('department', $selectedDept);
        }

        $assets = $query->orderBy('device_type')
            ->orderBy('department')
            ->orderBy('name')
            ->get();

        // Filter CPU & OS in PHP collection so both im_assets and im_asset_specs are respected
        if ($selectedCpu && $selectedCpu !== 'all') {
            $assets = $assets->filter(function ($a) use ($selectedCpu) {
                $cpu = trim((string) ($a->cpu ?: ($a->systemSpec?->cpu_name ?: '')));
                $family = self::normalizeCpuFamily($cpu);
                return $family === $selectedCpu || $cpu === $selectedCpu || stripos($cpu, $selectedCpu) !== false;
            });
        }

        if ($selectedOs && $selectedOs !== 'all') {
            $assets = $assets->filter(function ($a) use ($selectedOs) {
                $os = trim((string) ($a->os ?: ($a->systemSpec?->os_name ?: '')));
                $family = self::normalizeOsFamily($os);
                return $family === $selectedOs || $os === $selectedOs || stripos($os, $selectedOs) !== false;
            });
        }

        // Summary counts
        $totalCount = $assets->count();
        $statusCounts = [
            'active' => $assets->where('status', 'active')->count(),
            'repair' => $assets->where('status', 'repair')->count(),
            'disposed' => $assets->whereIn('status', ['disposed', 'retired'])->count(),
        ];

        // CPU Breakdown Summary (Group by normalized CPU family e.g. Core i3, Core i5, Ryzen 5)
        $cpuCounts = $assets->groupBy(function ($a) {
            $c = trim((string) ($a->cpu ?: ($a->systemSpec?->cpu_name ?: '')));
            return self::normalizeCpuFamily($c);
        })->map(fn ($group, $name) => [
            'name' => $name,
            'count' => $group->count(),
            'percentage' => $totalCount > 0 ? round(($group->count() / $totalCount) * 100, 1) : 0,
        ])->sortByDesc('count')->values();

        // OS Breakdown Summary (Group by normalized OS family e.g. Windows 11, Windows 10, Windows 7)
        $osCounts = $assets->groupBy(function ($a) {
            $o = trim((string) ($a->os ?: ($a->systemSpec?->os_name ?: '')));
            return self::normalizeOsFamily($o);
        })->map(fn ($group, $name) => [
            'name' => $name,
            'count' => $group->count(),
            'percentage' => $totalCount > 0 ? round(($group->count() / $totalCount) * 100, 1) : 0,
        ])->sortByDesc('count')->values();

        // Device Type Labels
        $deviceTypeLabels = [
            'computer' => 'คอมพิวเตอร์ตั้งโต๊ะ (Desktop PC)',
            'notebook' => 'คอมพิวเตอร์พกพา (Notebook / Laptop)',
            'server' => 'เครื่องแม่ข่าย (Server)',
            'other' => 'อุปกรณ์ประมวลผลอื่นๆ',
        ];

        $groupedAssets = $assets->groupBy(function ($a) {
            $dt = $a->device_type ?: 'computer';
            return in_array($dt, ['computer', 'notebook', 'server'], true) ? $dt : 'other';
        })->map(function ($items, $key) use ($deviceTypeLabels) {
            return [
                'type_key' => $key,
                'type_label' => $deviceTypeLabels[$key] ?? $key,
                'count' => $items->count(),
                'items' => $items->sortBy([
                    ['cpu', 'asc'],
                    ['os', 'asc'],
                    ['name', 'asc'],
                ])->values(),
            ];
        });

        [$fontRegularUri, $fontBoldUri] = $pdf->fontUris();

        // Thai Buddhist Year formatting
        $thaiMonths = [
            1 => 'มกราคม', 2 => 'กุมภาพันธ์', 3 => 'มีนาคม', 4 => 'เมษายน',
            5 => 'พฤษภาคม', 6 => 'มิถุนายน', 7 => 'กรกฎาคม', 8 => 'สิงหาคม',
            9 => 'กันยายน', 10 => 'ตุลาคม', 11 => 'พฤศจิกายน', 12 => 'ธันวาคม',
        ];
        $now = now()->timezone(config('app.timezone', 'Asia/Bangkok'));
        $generatedAt = $now->day . ' ' . ($thaiMonths[$now->month] ?? '') . ' ' . ($now->year + 543) . ' เวลา ' . $now->format('H:i') . ' น.';

        $filtersApplied = [];
        if ($selectedDeviceType && $selectedDeviceType !== 'all') {
            $filtersApplied[] = 'ประเภท: ' . ($deviceTypeLabels[$selectedDeviceType] ?? $selectedDeviceType);
        }
        if ($selectedCpu && $selectedCpu !== 'all') {
            $filtersApplied[] = 'CPU: ' . $selectedCpu;
        }
        if ($selectedOs && $selectedOs !== 'all') {
            $filtersApplied[] = 'OS: ' . $selectedOs;
        }
        if ($selectedStatus && $selectedStatus !== 'all') {
            $filtersApplied[] = 'สถานะ: ' . ($selectedStatus === 'active' ? 'ปกติ' : ($selectedStatus === 'repair' ? 'ส่งซ่อม' : 'จำหน่าย'));
        }
        if ($selectedDept && $selectedDept !== 'all') {
            $filtersApplied[] = 'แผนก: ' . $selectedDept;
        }

        $html = view('im.resource-computers-pdf', [
            'hospitalName' => 'โรงพยาบาลค่ายสุรสิงหนาท',
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
            'totalCount' => $totalCount,
            'statusCounts' => $statusCounts,
            'cpuCounts' => $cpuCounts,
            'osCounts' => $osCounts,
            'groupedAssets' => $groupedAssets,
            'generatedAt' => $generatedAt,
            'filtersApplied' => $filtersApplied,
        ])->render();

        $output = $pdf->render($html, 'landscape', true);

        return response($output, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="fshh-it-computers-report-' . now()->format('Ymd-His') . '.pdf"',
        ]);
    }

    public static function normalizeCpuFamily(?string $cpu): string
    {
        if (! $cpu || ! trim($cpu)) {
            return 'ไม่ระบุ CPU';
        }
        $s = mb_strtolower(trim($cpu), 'UTF-8');

        if (preg_match('/\bi3\b|core[ -]?i3|core\(tm\)[ -]?i3|\bi3[- ]/i', $s)) {
            return 'Core i3';
        }
        if (preg_match('/\bi5\b|core[ -]?i5|core\(tm\)[ -]?i5|\bi5[- ]/i', $s)) {
            return 'Core i5';
        }
        if (preg_match('/\bi7\b|core[ -]?i7|core\(tm\)[ -]?i7|\bi7[- ]/i', $s)) {
            return 'Core i7';
        }
        if (preg_match('/\bi9\b|core[ -]?i9|core\(tm\)[ -]?i9|\bi9[- ]/i', $s)) {
            return 'Core i9';
        }
        if (preg_match('/ryzen[ -]?3|ryzne[ -]?3/i', $s)) {
            return 'Ryzen 3';
        }
        if (preg_match('/ryzen[ -]?5|ryzne[ -]?5/i', $s)) {
            return 'Ryzen 5';
        }
        if (preg_match('/ryzen[ -]?7|ryzne[ -]?7/i', $s)) {
            return 'Ryzen 7';
        }
        if (preg_match('/ryzen[ -]?9|ryzne[ -]?9/i', $s)) {
            return 'Ryzen 9';
        }
        if (preg_match('/ryzen/i', $s)) {
            return 'AMD Ryzen';
        }
        if (preg_match('/pentium|g550|g[0-9]{3}/i', $s)) {
            return 'Pentium';
        }
        if (preg_match('/celeron/i', $s)) {
            return 'Celeron';
        }
        if (preg_match('/xeon/i', $s)) {
            return 'Intel Xeon';
        }
        if (preg_match('/intel/i', $s)) {
            return 'Intel อื่นๆ';
        }

        return 'อื่นๆ';
    }

    public static function normalizeOsFamily(?string $os): string
    {
        if (! $os || ! trim($os)) {
            return 'ไม่ระบุ OS';
        }
        $s = mb_strtolower(trim($os), 'UTF-8');

        if (preg_match('/win(?:dows)?[ -]?11/i', $s)) {
            return 'Windows 11';
        }
        if (preg_match('/win(?:dows)?[ -]?10/i', $s)) {
            return 'Windows 10';
        }
        if (preg_match('/win(?:dows)?[ -]?8(?:\.1)?/i', $s)) {
            return 'Windows 8 / 8.1';
        }
        if (preg_match('/win(?:dows)?[ -]?7/i', $s)) {
            return 'Windows 7';
        }
        if (preg_match('/win(?:dows)?[ -]?xp/i', $s)) {
            return 'Windows XP';
        }
        if (preg_match('/server/i', $s)) {
            return 'Windows Server';
        }
        if (preg_match('/linux|ubuntu|debian/i', $s)) {
            return 'Linux';
        }
        if (preg_match('/mac|macos|darwin/i', $s)) {
            return 'macOS';
        }
        if (preg_match('/win/i', $s)) {
            return 'Windows อื่นๆ';
        }

        return 'อื่นๆ';
    }
}
