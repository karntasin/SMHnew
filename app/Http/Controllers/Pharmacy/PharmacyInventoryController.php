<?php

namespace App\Http\Controllers\Pharmacy;

use App\Http\Controllers\Controller;
use App\Models\Pharmacy\PharmacyLot;
use App\Models\Pharmacy\PharmacyLocation;
use App\Models\Pharmacy\PharmacyStockBalance;
use App\Models\Pharmacy\PharmacyStockMovement;
use App\Services\Pharmacy\PharmacyDispenseSyncService;
use App\Services\Pharmacy\PharmacyInventoryService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PharmacyInventoryController extends Controller
{
    public function __construct(
        private readonly PharmacyInventoryService $inventory,
        private readonly PharmacyDispenseSyncService $dispenseSync,
    ) {}

    public function index(): Response
    {
        return Inertia::render('Pharmacy/Inventory/Index', [
            'summary' => $this->inventory->dashboardSummary(),
        ]);
    }

    public function stock(Request $request): Response
    {
        $this->inventory->ensureDefaultLocations();
        $locationId = $request->integer('location_id') ?: null;
        $q = trim((string) $request->query('q', ''));

        $query = PharmacyStockBalance::query()->with(['item', 'location']);
        if ($locationId) {
            $query->where('location_id', $locationId);
        }
        if ($q !== '') {
            $query->whereHas('item', function ($b) use ($q) {
                $b->where('icode', 'like', "%{$q}%")->orWhere('name', 'like', "%{$q}%");
            });
        }

        $rows = $query->orderBy('qty_on_hand')->limit(300)->get()->map(function (PharmacyStockBalance $b) {
            return [
                'id' => $b->id,
                'qty_on_hand' => (float) $b->qty_on_hand,
                'reorder_level' => (float) $b->reorder_level,
                'min_level' => (float) $b->min_level,
                'available' => $b->available(),
                'is_low' => $b->isLow(),
                'is_empty' => $b->isEmpty(),
                'item' => [
                    'icode' => $b->item?->icode,
                    'name' => $b->item?->name,
                    'strength' => $b->item?->strength,
                    'unit' => $b->item?->unit,
                ],
                'location' => [
                    'id' => $b->location?->id,
                    'name' => $b->location?->name,
                    'type' => $b->location?->type,
                ],
            ];
        });

        return Inertia::render('Pharmacy/Inventory/Stock', [
            'rows' => $rows,
            'locations' => PharmacyLocation::query()->where('is_active', true)->orderBy('sort_order')->get(['id', 'code', 'name', 'type']),
            'filters' => [
                'location_id' => $locationId,
                'q' => $q,
            ],
        ]);
    }

    public function receiveForm(): Response
    {
        $this->inventory->ensureDefaultLocations();

        return Inertia::render('Pharmacy/Inventory/Receive', [
            'locations' => PharmacyLocation::query()->where('is_active', true)->orderBy('sort_order')->get(['id', 'code', 'name', 'type']),
        ]);
    }

    public function receiveStore(Request $request)
    {
        $data = $request->validate([
            'icode' => 'required|string|max:20',
            'location_id' => 'required|exists:pharmacy_locations,id',
            'lot_no' => 'required|string|max:80',
            'qty' => 'required|numeric|min:0.01',
            'received_at' => 'required|date',
            'expires_at' => 'nullable|date|after_or_equal:received_at',
            'supplier' => 'nullable|string|max:255',
            'invoice_no' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:2000',
            'reorder_level' => 'nullable|numeric|min:0',
            'min_level' => 'nullable|numeric|min:0',
        ]);

        $lot = $this->inventory->receive($data);

        return redirect()
            ->route('pharmacy.inventory.lots.show', $lot->id)
            ->with('success', 'รับเข้ายาและสร้าง QR lot แล้ว');
    }

    public function transferForm(): Response
    {
        $this->inventory->ensureDefaultLocations();

        return Inertia::render('Pharmacy/Inventory/Transfer', [
            'locations' => PharmacyLocation::query()->where('is_active', true)->orderBy('sort_order')->get(['id', 'code', 'name', 'type']),
        ]);
    }

    public function transferStore(Request $request)
    {
        $data = $request->validate([
            'from_location_id' => 'required|exists:pharmacy_locations,id',
            'to_location_id' => 'required|exists:pharmacy_locations,id|different:from_location_id',
            'icode' => 'required|string|max:20',
            'qty' => 'required|numeric|min:0.01',
            'note' => 'nullable|string|max:2000',
        ]);

        $result = $this->inventory->transfer(
            (int) $data['from_location_id'],
            (int) $data['to_location_id'],
            (string) $data['icode'],
            (float) $data['qty'],
            $data['note'] ?? null,
        );

        return redirect()
            ->route('pharmacy.inventory.index')
            ->with('success', 'เบิกยา '.$result['qty'].' หน่วย จาก '.$result['from']->name.' → '.$result['to']->name);
    }

    public function lots(Request $request): Response
    {
        $q = trim((string) $request->query('q', ''));
        $query = PharmacyLot::query()->with(['item', 'location'])->latest('id');
        if ($q !== '') {
            $query->where(function ($b) use ($q) {
                $b->where('lot_no', 'like', "%{$q}%")
                    ->orWhere('qr_token', 'like', "%{$q}%")
                    ->orWhereHas('item', fn ($i) => $i->where('icode', 'like', "%{$q}%")->orWhere('name', 'like', "%{$q}%"));
            });
        }

        $lots = $query->limit(200)->get()->map(fn (PharmacyLot $l) => [
            'id' => $l->id,
            'lot_no' => $l->lot_no,
            'qr_token' => $l->qr_token,
            'qr_payload' => $l->qrPayload(),
            'received_at' => $l->received_at?->toDateString(),
            'expires_at' => $l->expires_at?->toDateString(),
            'qty_received' => (float) $l->qty_received,
            'qty_remaining' => (float) $l->qty_remaining,
            'status' => $l->status,
            'supplier' => $l->supplier,
            'item' => ['icode' => $l->item?->icode, 'name' => $l->item?->name, 'strength' => $l->item?->strength],
            'location' => ['name' => $l->location?->name, 'type' => $l->location?->type],
        ]);

        return Inertia::render('Pharmacy/Inventory/Lots', [
            'lots' => $lots,
            'filters' => ['q' => $q],
        ]);
    }

    public function lotShow(PharmacyLot $lot): Response
    {
        $lot->load(['item', 'location', 'receiver']);

        return Inertia::render('Pharmacy/Inventory/LotShow', [
            'lot' => [
                'id' => $lot->id,
                'lot_no' => $lot->lot_no,
                'qr_token' => $lot->qr_token,
                'qr_payload' => $lot->qrPayload(),
                'received_at' => $lot->received_at?->toDateString(),
                'expires_at' => $lot->expires_at?->toDateString(),
                'qty_received' => (float) $lot->qty_received,
                'qty_remaining' => (float) $lot->qty_remaining,
                'status' => $lot->status,
                'supplier' => $lot->supplier,
                'invoice_no' => $lot->invoice_no,
                'notes' => $lot->notes,
                'item' => [
                    'icode' => $lot->item?->icode,
                    'name' => $lot->item?->name,
                    'strength' => $lot->item?->strength,
                    'unit' => $lot->item?->unit,
                ],
                'location' => [
                    'name' => $lot->location?->name,
                    'code' => $lot->location?->code,
                    'type' => $lot->location?->type,
                ],
                'received_by' => $lot->receiver?->name,
            ],
        ]);
    }

    public function movements(Request $request): Response
    {
        $rows = PharmacyStockMovement::query()
            ->with(['item', 'lot', 'fromLocation', 'toLocation', 'user'])
            ->latest('id')
            ->limit(200)
            ->get()
            ->map(fn (PharmacyStockMovement $m) => [
                'id' => $m->id,
                'type' => $m->type,
                'qty' => (float) $m->qty,
                'hn' => $m->hn,
                'vn' => $m->vn,
                'vstdate' => $m->vstdate?->toDateString(),
                'note' => $m->note,
                'created_at' => optional($m->created_at)?->timezone('Asia/Bangkok')->format('Y-m-d H:i'),
                'item' => ['icode' => $m->item?->icode, 'name' => $m->item?->name],
                'lot_no' => $m->lot?->lot_no,
                'from' => $m->fromLocation?->name,
                'to' => $m->toLocation?->name,
                'user' => $m->user?->name,
            ]);

        return Inertia::render('Pharmacy/Inventory/Movements', [
            'rows' => $rows,
        ]);
    }

    public function searchDrugs(Request $request)
    {
        $q = trim((string) $request->query('q', ''));

        return response()->json([
            'data' => $this->inventory->searchHosxpDrugs($q),
        ]);
    }

    public function syncDispense(Request $request)
    {
        $date = $request->input('date') ?: now('Asia/Bangkok')->toDateString();
        $result = $this->dispenseSync->sync(is_string($date) ? $date : null);

        return back()->with($result['ok'] ? 'success' : 'error', $result['message']);
    }

    public function updateThreshold(Request $request, PharmacyStockBalance $balance)
    {
        $data = $request->validate([
            'reorder_level' => 'nullable|numeric|min:0',
            'min_level' => 'nullable|numeric|min:0',
        ]);
        $balance->update([
            'reorder_level' => $data['reorder_level'] ?? $balance->reorder_level,
            'min_level' => $data['min_level'] ?? $balance->min_level,
        ]);

        return back()->with('success', 'บันทึกเกณฑ์แจ้งเตือนแล้ว');
    }
}
