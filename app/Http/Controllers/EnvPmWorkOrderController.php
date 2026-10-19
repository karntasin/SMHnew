<?php

namespace App\Http\Controllers;

use App\Models\EnvAsset;
use App\Models\EnvPmWorkOrder;
use App\Models\EnvSparePart;
use App\Models\MaintenancePriority;
use App\Services\Env\PmWorkOrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class EnvPmWorkOrderController extends Controller
{
    public function index(Request $request)
    {
        $status = (string) $request->query('status', 'open');
        $query = EnvPmWorkOrder::query()
            ->with(['asset:id,name,location,issue_location,risk_level,stock_number', 'assigneeUsers:id,name'])
            ->latest('due_date');

        if ($status === 'open') {
            $query->whereIn('status', EnvPmWorkOrder::OPEN_STATUSES);
        } elseif ($status !== 'all') {
            $query->where('status', $status);
        }

        return Inertia::render('Env/PM/WorkOrders', [
            'orders' => $query->paginate(20)->withQueryString(),
            'status' => $status,
        ]);
    }

    public function assetOptions(Request $request)
    {
        $term = trim((string) $request->query('q', ''));

        $assets = EnvAsset::query()
            ->when($term !== '', function ($query) use ($term) {
                $query->where(function ($inner) use ($term) {
                    $inner->where('name', 'like', "%{$term}%")
                        ->orWhere('stock_number', 'like', "%{$term}%")
                        ->orWhere('control_number', 'like', "%{$term}%")
                        ->orWhere('location', 'like', "%{$term}%")
                        ->orWhere('issue_location', 'like', "%{$term}%");
                });
            })
            ->orderBy('name')
            ->limit(20)
            ->get(['id', 'name', 'stock_number', 'control_number', 'location', 'issue_location', 'risk_level']);

        return response()->json(['assets' => $assets]);
    }

    public function store(Request $request, PmWorkOrderService $service)
    {
        $data = $request->validate([
            'asset_id' => 'required|exists:env_assets,id',
            'due_date' => 'nullable|date',
        ]);

        $asset = EnvAsset::query()->findOrFail($data['asset_id']);
        $result = $service->createManual($asset, $data['due_date'] ?? null);
        $number = $result['work_order']->wo_number;
        $message = $result['created']
            ? "สร้างใบงาน {$number} แล้ว"
            : "เครื่องนี้มีใบงานเปิดอยู่แล้ว {$number}";

        return redirect()
            ->route('env.pm.work-orders.show', $result['work_order'])
            ->with('success', $message);
    }

    public function show(EnvPmWorkOrder $workOrder, PmWorkOrderService $service)
    {
        $workOrder->load([
            'asset:id,name,brand,model,serial_number,stock_number,control_number,location,issue_location,risk_level,owner',
            'schedule',
            'standard.parts.sparePart',
            'tasks',
            'photos',
            'parts.sparePart',
            'assigneeUsers:id,name',
            'correctiveRequest:id,ticket_number,status,title',
        ]);

        return Inertia::render('Env/PM/WorkOrderShow', [
            'order' => $workOrder,
            'technicians' => $service->technicians(),
            'parts' => EnvSparePart::query()->where('is_active', true)->orderBy('name')->get(),
            'priorities' => MaintenancePriority::query()->where('is_active', true)->orderBy('level')->get(['id', 'name', 'level']),
        ]);
    }

    public function assign(Request $request, EnvPmWorkOrder $workOrder, PmWorkOrderService $service)
    {
        $data = $request->validate([
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'integer|exists:users,id',
        ]);

        $service->assign($workOrder, $data['user_ids']);

        return back()->with('success', 'มอบหมายงานแล้ว');
    }

    public function start(EnvPmWorkOrder $workOrder, PmWorkOrderService $service)
    {
        if (! $workOrder->isOpen()) {
            return back()->with('error', 'ใบงานนี้ปิดแล้ว');
        }

        $service->start($workOrder);

        return back()->with('success', 'เริ่มงานแล้ว');
    }

    public function complete(Request $request, EnvPmWorkOrder $workOrder, PmWorkOrderService $service)
    {
        if (! $workOrder->isOpen()) {
            return back()->with('error', 'ใบงานนี้ปิดแล้ว');
        }

        $request->merge([
            'labor_minutes' => $request->input('labor_minutes') === '' ? null : $request->input('labor_minutes'),
            'meter_reading' => $request->input('meter_reading') === '' ? null : $request->input('meter_reading'),
            'priority_id' => $request->input('priority_id') === '' ? null : $request->input('priority_id'),
            'parts' => collect($request->input('parts', []))
                ->filter(fn ($part) => is_array($part) && filled($part['spare_part_id'] ?? null))
                ->values()
                ->all(),
        ]);

        $data = $request->validate([
            'performed_at' => 'required|date',
            'result' => 'required|in:Pass,Fail',
            'findings' => 'nullable|string',
            'labor_minutes' => 'nullable|integer|min:0',
            'meter_reading' => 'nullable|numeric|min:0',
            'priority_id' => 'nullable|exists:maintenance_priorities,id',
            'tasks' => 'array',
            'tasks.*.id' => 'required|integer',
            'tasks.*.result' => 'nullable|in:pass,fail,na',
            'tasks.*.measured_value' => 'nullable|string|max:100',
            'tasks.*.note' => 'nullable|string',
            'parts' => 'array',
            'parts.*.spare_part_id' => 'required|exists:env_spare_parts,id',
            'parts.*.qty' => 'required|numeric|min:0',
        ]);

        $willFail = $data['result'] === 'Fail'
            || collect($data['tasks'] ?? [])->contains(fn ($task) => ($task['result'] ?? '') === 'fail');
        if ($willFail && empty($data['priority_id'])) {
            return back()->withErrors(['priority_id' => 'เลือกความเร่งด่วนของใบแจ้งซ่อม'])->withInput();
        }

        $completed = $service->complete($workOrder, $data);
        $message = $completed->result === 'Fail'
            ? 'บันทึกผลแล้ว และเปิดใบแจ้งซ่อมแก้ไข'
            : 'บันทึกผล PM แล้ว';
        if ($completed->below_min_stock) {
            $message .= ' อะไหล่บางรายการต่ำกว่าสต็อกขั้นต่ำ';
        }

        return redirect()->route('env.pm.work-orders.show', $completed->id)->with('success', $message);
    }

    public function photos(Request $request, EnvPmWorkOrder $workOrder)
    {
        $data = $request->validate([
            'phase' => 'required|in:before,after',
            'photos' => 'required|array|min:1|max:8',
            'photos.*' => 'image|max:8192',
        ]);

        foreach ($request->file('photos', []) as $file) {
            $path = $file->store('env/pm/'.$workOrder->id, 'public');
            $workOrder->photos()->create([
                'phase' => $data['phase'],
                'path' => $path,
            ]);
        }

        return back()->with('success', 'อัปโหลดรูปแล้ว');
    }

    public function destroyPhoto(EnvPmWorkOrder $workOrder, int $photo)
    {
        $row = $workOrder->photos()->whereKey($photo)->firstOrFail();
        Storage::disk('public')->delete($row->path);
        $row->delete();

        return back()->with('success', 'ลบรูปแล้ว');
    }

    public function cancel(EnvPmWorkOrder $workOrder, PmWorkOrderService $service)
    {
        if (! $workOrder->isOpen()) {
            return back()->with('error', 'ใบงานนี้ปิดแล้ว');
        }

        $service->cancel($workOrder);

        return back()->with('success', 'ยกเลิกใบงานแล้ว');
    }
}
