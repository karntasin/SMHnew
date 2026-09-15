<?php

namespace App\Http\Controllers\Im;

use App\Http\Controllers\Controller;
use App\Models\Im\Asset;
use App\Models\Im\AssetDisposal;
use App\Models\Im\AssetRepair;
use App\Models\Im\ChangeRequest;
use App\Models\Im\Competency;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
        ])->latest()->get();

        $competencies = Competency::with('user:id,name')->latest('assessed_at')->get();
        $changes = ChangeRequest::with('approver:id,name')->latest()->take(200)->get();

        $utilized = $assets->whereNotNull('utilization');

        return Inertia::render('Im/Resource', [
            'assets' => $assets,
            'competencies' => $competencies,
            'changes' => $changes,
            'staff' => User::orderBy('name')->get(['id', 'name']),
            'deviceTypes' => Asset::DEVICE_TYPES,
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
            ],
        ]);
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
}
