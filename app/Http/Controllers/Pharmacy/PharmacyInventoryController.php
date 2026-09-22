<?php

namespace App\Http\Controllers\Pharmacy;

use App\Http\Controllers\Controller;
use App\Models\Pharmacy\PharmacyDispenseSync;
use App\Models\Pharmacy\PharmacyItem;
use App\Models\Pharmacy\PharmacyItemBarcode;
use App\Models\Pharmacy\PharmacyLocation;
use App\Models\Pharmacy\PharmacyLot;
use App\Models\Pharmacy\PharmacyPackagingType;
use App\Models\Pharmacy\PharmacySetting;
use App\Models\Pharmacy\PharmacyStockBalance;
use App\Models\Pharmacy\PharmacyStockMovement;
use App\Services\Pharmacy\PharmacyDispenseSyncService;
use App\Services\Pharmacy\PharmacyInventoryService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
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
        $specialType = $request->query('special_type');
        $itemType = $request->query('item_type', 'all');
        $expiryFilter = $request->query('expiry', 'all');

        $query = PharmacyStockBalance::query()->with(['item', 'location']);
        if ($locationId) {
            $query->where('location_id', $locationId);
        }
        if ($q !== '') {
            $query->whereHas('item', function ($b) use ($q) {
                $b->where('icode', 'like', "%{$q}%")->orWhere('name', 'like', "%{$q}%");
            });
        }
        if ($itemType === 'drug') {
            $query->whereHas('item', fn ($iq) => $iq->where('item_type', 'drug')->orWhereNull('item_type'));
        } elseif ($itemType === 'nondrug') {
            $query->whereHas('item', fn ($iq) => $iq->where('item_type', 'nondrug'));
        }
        if ($specialType === 'had') {
            $query->whereHas('item', fn ($iq) => $iq->where('is_had', true));
        } elseif ($specialType === 'cold_chain') {
            $query->whereHas('item', fn ($iq) => $iq->where('is_cold_chain', true));
        } elseif ($specialType === 'narcotic') {
            $query->whereHas('item', fn ($iq) => $iq->where('is_narcotic', true));
        }

        // Preload active lots grouped by location_id and item_id
        $activeLotsGrouped = PharmacyLot::query()
            ->where('status', 'active')
            ->where('qty_remaining', '>', 0)
            ->orderByRaw('CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END')
            ->orderBy('expires_at')
            ->orderBy('id')
            ->get()
            ->groupBy(fn ($l) => $l->location_id . '_' . $l->item_id);

        $today = now('Asia/Bangkok')->startOfDay();

        $allRows = $query->orderBy('qty_on_hand')->limit(500)->get()->map(function (PharmacyStockBalance $b) use ($activeLotsGrouped, $today) {
            $key = $b->location_id . '_' . $b->item_id;
            $itemLots = $activeLotsGrouped->get($key, collect());

            $firstWithExpiry = $itemLots->first(fn ($l) => $l->expires_at !== null);
            $nearestExpiry = $firstWithExpiry?->expires_at?->toDateString();

            $daysUntilExpiry = null;
            $expiryStatus = 'normal';
            if ($nearestExpiry) {
                $daysUntilExpiry = (int) $today->diffInDays(\Carbon\Carbon::parse($nearestExpiry)->startOfDay(), false);
                if ($daysUntilExpiry < 0) {
                    $expiryStatus = 'expired';
                } elseif ($daysUntilExpiry <= 30) {
                    $expiryStatus = 'critical';
                } elseif ($daysUntilExpiry <= 90) {
                    $expiryStatus = 'warning';
                } elseif ($daysUntilExpiry <= 180) {
                    $expiryStatus = 'notice';
                }
            }

            return [
                'id' => $b->id,
                'location_id' => $b->location_id,
                'item_id' => $b->item_id,
                'qty_on_hand' => (float) $b->qty_on_hand,
                'reorder_level' => (float) $b->reorder_level,
                'min_level' => (float) $b->min_level,
                'available' => $b->available(),
                'is_low' => $b->isLow(),
                'is_empty' => $b->isEmpty(),
                'nearest_expiry' => $nearestExpiry,
                'days_until_expiry' => $daysUntilExpiry,
                'expiry_status' => $expiryStatus,
                'active_lots_count' => $itemLots->count(),
                'lots' => $itemLots->map(fn ($l) => [
                    'id' => $l->id,
                    'lot_no' => $l->lot_no,
                    'qty_remaining' => (float) $l->qty_remaining,
                    'expires_at' => $l->expires_at?->toDateString(),
                    'days_until_expiry' => $l->expires_at ? (int) $today->diffInDays(\Carbon\Carbon::parse($l->expires_at)->startOfDay(), false) : null,
                ])->all(),
                'item' => [
                    'id' => $b->item?->id,
                    'icode' => $b->item?->icode,
                    'name' => $b->item?->name,
                    'item_type' => $b->item?->item_type ?? 'drug',
                    'item_type_label' => $b->item?->itemTypeLabel(),
                    'income_code' => $b->item?->income_code,
                    'strength' => $b->item?->strength,
                    'unit' => $b->item?->unit,
                    'is_had' => (bool) ($b->item?->is_had ?? false),
                    'is_cold_chain' => (bool) ($b->item?->is_cold_chain ?? false),
                    'is_narcotic' => (bool) ($b->item?->is_narcotic ?? false),
                    'storage_temp' => $b->item?->storage_temp,
                    'had_alert_text' => $b->item?->had_alert_text,
                ],
                'location' => [
                    'id' => $b->location?->id,
                    'name' => $b->location?->name,
                    'type' => $b->location?->type,
                ],
            ];
        });

        // Compute aggregate stats across loaded balances
        $stats = [
            'total_items' => $allRows->count(),
            'total_active_lots' => $allRows->sum('active_lots_count'),
            'expiring_90d' => $allRows->filter(fn ($r) => $r['days_until_expiry'] !== null && $r['days_until_expiry'] <= 90 && $r['days_until_expiry'] >= 0)->count(),
            'critical_30d' => $allRows->filter(fn ($r) => $r['days_until_expiry'] !== null && $r['days_until_expiry'] <= 30 && $r['days_until_expiry'] >= 0)->count(),
            'expired' => $allRows->filter(fn ($r) => $r['days_until_expiry'] !== null && $r['days_until_expiry'] < 0)->count(),
            'out_of_stock' => $allRows->filter(fn ($r) => $r['is_empty'])->count(),
            'drug_items' => $allRows->filter(fn ($r) => ($r['item']['item_type'] ?? '') !== 'nondrug')->count(),
            'nondrug_items' => $allRows->filter(fn ($r) => ($r['item']['item_type'] ?? '') === 'nondrug')->count(),
        ];

        // Apply expiry filter if specified
        $filteredRows = $allRows;
        if ($expiryFilter === 'expiring_90') {
            $filteredRows = $allRows->filter(fn ($r) => $r['days_until_expiry'] !== null && $r['days_until_expiry'] <= 90 && $r['days_until_expiry'] >= 0)->values();
        } elseif ($expiryFilter === 'critical_30') {
            $filteredRows = $allRows->filter(fn ($r) => $r['days_until_expiry'] !== null && $r['days_until_expiry'] <= 30 && $r['days_until_expiry'] >= 0)->values();
        } elseif ($expiryFilter === 'expired') {
            $filteredRows = $allRows->filter(fn ($r) => $r['days_until_expiry'] !== null && $r['days_until_expiry'] < 0)->values();
        }

        return Inertia::render('Pharmacy/Inventory/Stock', [
            'rows' => $filteredRows->values()->all(),
            'stats' => $stats,
            'locations' => PharmacyLocation::query()->where('is_active', true)->orderBy('sort_order')->get(['id', 'code', 'name', 'type']),
            'filters' => [
                'location_id' => $locationId,
                'q' => $q,
                'special_type' => $specialType,
                'item_type' => $itemType,
                'expiry' => $expiryFilter,
            ],
        ]);
    }

    public function receiveForm(): Response
    {
        $this->inventory->ensureDefaultLocations();

        return Inertia::render('Pharmacy/Inventory/Receive', [
            'locations' => PharmacyLocation::query()->where('is_active', true)->orderBy('sort_order')->get(['id', 'code', 'name', 'type']),
            'packagingTypes' => PharmacyPackagingType::query()->where('is_active', true)->orderBy('sort_order')->get(['id', 'code', 'name']),
            'initialBarcode' => request()->query('barcode'),
        ]);
    }

    public function receiveStore(Request $request)
    {
        $data = $request->validate([
            'icode' => 'required|string|max:20',
            'location_id' => 'required|exists:pharmacy_locations,id',
            'lot_no' => 'required|string|max:80',
            'qty' => 'required|numeric|min:0.01',
            'unit_id' => 'nullable|exists:pharmacy_item_units,id',
            'barcode' => 'nullable|string|max:150',
            'packaging_chain' => 'nullable|array',
            'packaging_chain.*.name' => 'nullable|string|max:50',
            'packaging_chain.*.contains_qty' => 'nullable|numeric|min:0.0001',
            'packaging_chain.*.packaging_type_id' => 'nullable|exists:pharmacy_packaging_types,id',
            'packaging_chain.*.barcode' => 'nullable|string|max:150',
            'received_at' => 'required|date',
            'expires_at' => 'nullable|date|after_or_equal:received_at',
            'supplier' => 'nullable|string|max:255',
            'invoice_no' => 'nullable|string|max:255',
            'invoice_date' => 'nullable|date',
            'invoice_unit_price' => 'nullable|numeric|min:0',
            'invoice_total_price' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:2000',
            'reorder_level' => 'nullable|numeric|min:0',
            'min_level' => 'nullable|numeric|min:0',
        ]);

        $lot = $this->inventory->receive($data);

        // หากมีการระบุบาร์โค้ด ให้ผูกบาร์โค้ดเข้ากับยานี้ทันที
        if (! empty($data['barcode'])) {
            $code = trim((string) $data['barcode']);
            PharmacyItemBarcode::query()->firstOrCreate(
                ['barcode' => $code],
                [
                    'item_id' => $lot->item_id,
                    'symbology' => 'AUTO',
                    'label' => 'บาร์โค้ดยา ' . ($lot->item?->name ?? ''),
                    'is_primary' => true,
                    'is_active' => true,
                ],
            );
        }

        return redirect()
            ->route('pharmacy.inventory.lots.show', $lot->id)
            ->with('success', 'รับเข้ายาและสร้าง QR lot แล้ว');
    }

    public function transferForm(): Response
    {
        $this->inventory->ensureDefaultLocations();

        return Inertia::render('Pharmacy/Inventory/Transfer', [
            'locations' => PharmacyLocation::query()->where('is_active', true)->orderBy('sort_order')->get(['id', 'code', 'name', 'type']),
            'packagingTypes' => PharmacyPackagingType::query()->where('is_active', true)->orderBy('sort_order')->get(['id', 'code', 'name']),
            'initialBarcode' => request()->query('barcode'),
        ]);
    }

    public function transferStore(Request $request)
    {
        $data = $request->validate([
            'from_location_id' => 'required|exists:pharmacy_locations,id',
            'to_location_id' => 'required|exists:pharmacy_locations,id|different:from_location_id',
            'icode' => 'required|string|max:20',
            'qty' => 'required|numeric|min:0.01',
            'unit_id' => 'nullable|exists:pharmacy_item_units,id',
            'packaging_chain' => 'nullable|array',
            'packaging_chain.*.name' => 'nullable|string|max:50',
            'packaging_chain.*.contains_qty' => 'nullable|numeric|min:0.0001',
            'packaging_chain.*.packaging_type_id' => 'nullable|exists:pharmacy_packaging_types,id',
            'packaging_chain.*.barcode' => 'nullable|string|max:150',
            'note' => 'nullable|string|max:2000',
        ]);

        $result = $this->inventory->transfer(
            (int) $data['from_location_id'],
            (int) $data['to_location_id'],
            (string) $data['icode'],
            (float) $data['qty'],
            isset($data['unit_id']) ? (int) $data['unit_id'] : null,
            $data['note'] ?? null,
            $data['packaging_chain'] ?? null,
        );

        return redirect()
            ->route('pharmacy.inventory.index')
            ->with('success', 'เบิกยา '.$result['qty'].' หน่วย จาก '.$result['from']->name.' → '.$result['to']->name);
    }

    public function lots(Request $request): Response
    {
        $q = trim((string) $request->query('q', ''));
        $locationId = $request->integer('location_id') ?: null;
        $status = trim((string) $request->query('status', ''));

        $query = PharmacyLot::query()->with(['item', 'location', 'receivedUnit'])->latest('id');
        if ($q !== '') {
            $query->where(function ($b) use ($q) {
                $b->where('lot_no', 'like', "%{$q}%")
                    ->orWhere('qr_token', 'like', "%{$q}%")
                    ->orWhereHas('item', fn ($i) => $i->where('icode', 'like', "%{$q}%")->orWhere('name', 'like', "%{$q}%"));
            });
        }
        if ($locationId) {
            $query->where('location_id', $locationId);
        }
        if ($status !== '' && $status !== 'all') {
            if ($status === 'expiring') {
                $query->whereNotNull('expires_at')
                    ->where('expires_at', '<=', now()->addDays(90)->toDateString())
                    ->where('expires_at', '>=', now()->toDateString())
                    ->where('qty_remaining', '>', 0);
            } elseif ($status === 'expired') {
                $query->whereNotNull('expires_at')
                    ->where('expires_at', '<', now()->toDateString());
            } else {
                $query->where('status', $status);
            }
        }

        $lots = $query->limit(300)->get()->map(fn (PharmacyLot $l) => [
            'id' => $l->id,
            'item_id' => $l->item_id,
            'location_id' => $l->location_id,
            'received_unit_id' => $l->received_unit_id,
            'lot_no' => $l->lot_no,
            'qr_token' => $l->qr_token,
            'qr_payload' => $l->qrPayload(),
            'received_at' => $l->received_at?->toDateString(),
            'expires_at' => $l->expires_at?->toDateString(),
            'qty_received' => (float) $l->qty_received,
            'qty_remaining' => (float) $l->qty_remaining,
            'status' => $l->status,
            'supplier' => $l->supplier,
            'invoice_no' => $l->invoice_no,
            'invoice_date' => $l->invoice_date?->toDateString(),
            'invoice_unit_price' => $l->invoice_unit_price !== null ? (float) $l->invoice_unit_price : null,
            'invoice_total_price' => $l->invoice_total_price !== null ? (float) $l->invoice_total_price : null,
            'received_package_qty' => $l->received_package_qty !== null ? (float) $l->received_package_qty : null,
            'received_unit' => $l->receivedUnit?->name,
            'unit_factor' => (float) $l->unit_factor,
            'notes' => $l->notes,
            'item' => [
                'id' => $l->item?->id,
                'icode' => $l->item?->icode,
                'name' => $l->item?->name,
                'item_type' => $l->item?->item_type ?? 'drug',
                'item_type_label' => $l->item?->itemTypeLabel(),
                'strength' => $l->item?->strength,
                'unit' => $l->item?->unit,
            ],
            'location' => [
                'id' => $l->location?->id,
                'name' => $l->location?->name,
                'type' => $l->location?->type,
            ],
        ]);

        return Inertia::render('Pharmacy/Inventory/Lots', [
            'lots' => $lots,
            'locations' => PharmacyLocation::query()->where('is_active', true)->orderBy('sort_order')->get(['id', 'name', 'code', 'type']),
            'filters' => [
                'q' => $q,
                'location_id' => $locationId,
                'status' => $status,
            ],
        ]);
    }

    public function lotShow(PharmacyLot $lot): Response
    {
        $lot->load(['item.units', 'location', 'receiver', 'receivedUnit']);

        return Inertia::render('Pharmacy/Inventory/LotShow', [
            'hospitalName' => PharmacySetting::query()->where('key', 'hospital_label_header')->value('value') ?: 'โรงพยาบาลค่ายสุรสิงหนาท',
            'locations' => PharmacyLocation::query()->where('is_active', true)->orderBy('sort_order')->get(['id', 'name', 'code', 'type']),
            'units' => $lot->item?->units ?? [],
            'lot' => [
                'id' => $lot->id,
                'item_id' => $lot->item_id,
                'location_id' => $lot->location_id,
                'received_unit_id' => $lot->received_unit_id,
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
                'invoice_date' => $lot->invoice_date?->toDateString(),
                'invoice_unit_price' => $lot->invoice_unit_price !== null ? (float) $lot->invoice_unit_price : null,
                'invoice_total_price' => $lot->invoice_total_price !== null ? (float) $lot->invoice_total_price : null,
                'received_package_qty' => $lot->received_package_qty !== null ? (float) $lot->received_package_qty : null,
                'received_unit' => $lot->receivedUnit?->name,
                'unit_factor' => (float) $lot->unit_factor,
                'notes' => $lot->notes,
                'item' => [
                    'id' => $lot->item?->id,
                    'icode' => $lot->item?->icode,
                    'name' => $lot->item?->name,
                    'item_type' => $lot->item?->item_type ?? 'drug',
                    'item_type_label' => $lot->item?->itemTypeLabel(),
                    'strength' => $lot->item?->strength,
                    'unit' => $lot->item?->unit,
                ],
                'location' => [
                    'id' => $lot->location?->id,
                    'name' => $lot->location?->name,
                    'code' => $lot->location?->code,
                    'type' => $lot->location?->type,
                ],
                'received_by' => $lot->receiver?->name,
            ],
        ]);
    }

    public function lotUpdate(Request $request, PharmacyLot $lot): RedirectResponse
    {
        $validated = $request->validate([
            'lot_no' => ['required', 'string', 'max:100'],
            'expires_at' => ['nullable', 'date'],
            'received_at' => ['nullable', 'date'],
            'location_id' => ['required', 'exists:pharmacy_locations,id'],
            'received_unit_id' => ['nullable', 'exists:pharmacy_item_units,id'],
            'received_package_qty' => ['nullable', 'numeric', 'min:0'],
            'unit_factor' => ['nullable', 'numeric', 'min:0.0001'],
            'qty_received' => ['nullable', 'numeric', 'min:0'],
            'qty_remaining' => ['required', 'numeric', 'min:0'],
            'supplier' => ['nullable', 'string', 'max:255'],
            'invoice_no' => ['nullable', 'string', 'max:100'],
            'invoice_date' => ['nullable', 'date'],
            'invoice_unit_price' => ['nullable', 'numeric', 'min:0'],
            'invoice_total_price' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', 'in:active,depleted,expired,damaged,returned,quarantine'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'regenerate_qr' => ['nullable', 'boolean'],
            'sync_stock' => ['nullable', 'boolean'],
        ]);

        $syncStock = $request->boolean('sync_stock', true);
        $oldLocationId = (int) $lot->location_id;
        $newLocationId = (int) $validated['location_id'];
        $oldQtyRemaining = (float) $lot->qty_remaining;
        $newQtyRemaining = (float) $validated['qty_remaining'];

        if ($syncStock) {
            if ($oldLocationId !== $newLocationId) {
                // Moved from old location to new location
                $oldBalance = PharmacyStockBalance::firstOrCreate(['location_id' => $oldLocationId, 'item_id' => $lot->item_id]);
                $oldBalance->qty_on_hand = max(0, (float) $oldBalance->qty_on_hand - $oldQtyRemaining);
                $oldBalance->save();

                $newBalance = PharmacyStockBalance::firstOrCreate(['location_id' => $newLocationId, 'item_id' => $lot->item_id]);
                $newBalance->qty_on_hand = (float) $newBalance->qty_on_hand + $newQtyRemaining;
                $newBalance->save();

                PharmacyStockMovement::create([
                    'type' => 'adjust',
                    'item_id' => $lot->item_id,
                    'lot_id' => $lot->id,
                    'from_location_id' => $oldLocationId,
                    'to_location_id' => $newLocationId,
                    'qty' => $newQtyRemaining,
                    'balance_after' => $newBalance->qty_on_hand,
                    'user_id' => Auth::id(),
                    'note' => "แก้ไขและย้าย Lot {$lot->lot_no} จากคลังเดิมสู่คลังใหม่ (คงเหลือ {$newQtyRemaining})",
                ]);
            } else {
                $delta = round($newQtyRemaining - $oldQtyRemaining, 2);
                if (abs($delta) > 0.0001) {
                    $balance = PharmacyStockBalance::firstOrCreate(['location_id' => $newLocationId, 'item_id' => $lot->item_id]);
                    $balance->qty_on_hand = max(0, (float) $balance->qty_on_hand + $delta);
                    $balance->save();

                    PharmacyStockMovement::create([
                        'type' => 'adjust',
                        'item_id' => $lot->item_id,
                        'lot_id' => $lot->id,
                        'from_location_id' => $delta < 0 ? $newLocationId : null,
                        'to_location_id' => $delta > 0 ? $newLocationId : null,
                        'qty' => $delta,
                        'balance_after' => $balance->qty_on_hand,
                        'user_id' => Auth::id(),
                        'note' => "ปรับปรุงยอดคงเหลือ Lot {$lot->lot_no}: {$oldQtyRemaining} -> {$newQtyRemaining} (ผลต่าง " . ($delta > 0 ? "+{$delta}" : "{$delta}") . ")",
                    ]);
                }
            }
        }

        if ($request->boolean('regenerate_qr')) {
            $lot->qr_token = Str::lower((string) Str::ulid());
        }

        $status = $validated['status'];
        if ($newQtyRemaining <= 0 && $status === 'active') {
            $status = 'depleted';
        } elseif ($newQtyRemaining > 0 && $status === 'depleted') {
            $status = 'active';
        }

        $lot->update([
            'lot_no' => trim($validated['lot_no']),
            'location_id' => $newLocationId,
            'received_at' => $validated['received_at'] ?? null,
            'expires_at' => $validated['expires_at'] ?? null,
            'received_unit_id' => $validated['received_unit_id'] ?? $lot->received_unit_id,
            'received_package_qty' => isset($validated['received_package_qty']) && $validated['received_package_qty'] !== '' ? (float) $validated['received_package_qty'] : $lot->received_package_qty,
            'unit_factor' => isset($validated['unit_factor']) && $validated['unit_factor'] !== '' ? (float) $validated['unit_factor'] : ((float) ($lot->unit_factor ?: 1.0)),
            'qty_received' => isset($validated['qty_received']) && $validated['qty_received'] !== '' ? (float) $validated['qty_received'] : ((float) ($lot->qty_received ?: $newQtyRemaining)),
            'qty_remaining' => $newQtyRemaining,
            'supplier' => $validated['supplier'] ?? null,
            'invoice_no' => $validated['invoice_no'] ?? null,
            'invoice_date' => $validated['invoice_date'] ?? null,
            'invoice_unit_price' => isset($validated['invoice_unit_price']) && $validated['invoice_unit_price'] !== '' ? (float) $validated['invoice_unit_price'] : null,
            'invoice_total_price' => isset($validated['invoice_total_price']) && $validated['invoice_total_price'] !== '' ? (float) $validated['invoice_total_price'] : null,
            'status' => $status,
            'notes' => $validated['notes'] ?? null,
        ]);

        return back()->with('success', "แก้ไขข้อมูล Lot {$lot->lot_no} เรียบร้อยแล้ว");
    }

    public function lotDestroy(Request $request, PharmacyLot $lot): RedirectResponse
    {
        $lotNo = $lot->lot_no;
        $itemName = $lot->item?->name ?? 'รายการยา';
        $locationId = $lot->location_id;
        $itemId = $lot->item_id;
        $qtyRemaining = (float) $lot->qty_remaining;
        $adjustBalance = $request->boolean('adjust_balance', true);

        if ($adjustBalance && $qtyRemaining > 0) {
            $balance = PharmacyStockBalance::where('location_id', $locationId)->where('item_id', $itemId)->first();
            if ($balance) {
                $balance->qty_on_hand = max(0, (float) $balance->qty_on_hand - $qtyRemaining);
                $balance->save();

                PharmacyStockMovement::create([
                    'type' => 'adjust',
                    'item_id' => $itemId,
                    'lot_id' => null,
                    'from_location_id' => $locationId,
                    'qty' => -$qtyRemaining,
                    'balance_after' => $balance->qty_on_hand,
                    'user_id' => Auth::id(),
                    'note' => "ลบ Lot {$lotNo} ออกจากระบบ (ตัดยอดคงเหลือ {$qtyRemaining})",
                ]);
            }
        }

        $lot->delete();

        return redirect()->route('pharmacy.inventory.lots')->with('success', "ลบ Lot {$lotNo} ({$itemName}) และรหัส QR เรียบร้อยแล้ว");
    }

    public function lotRegenerateQr(PharmacyLot $lot): RedirectResponse
    {
        $lot->update(['qr_token' => Str::lower((string) Str::ulid())]);

        return back()->with('success', "สร้างรหัส QR Token ใหม่สำหรับ Lot {$lot->lot_no} สำเร็จ");
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
                'item' => [
                    'icode' => $m->item?->icode,
                    'name' => $m->item?->name,
                    'item_type' => $m->item?->item_type ?? 'drug',
                    'item_type_label' => $m->item?->itemTypeLabel(),
                ],
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

    public function itemUnits(string $icode)
    {
        $item = $this->inventory->resolveItemFromHosxp($icode);
        $item->load(['units.parentUnit', 'units.packagingType', 'units.barcodes']);

        return response()->json([
            'data' => [
                'item' => [
                    'id' => $item->id, 'icode' => $item->icode, 'name' => $item->name,
                    'item_type' => $item->item_type ?? 'drug',
                    'item_type_label' => $item->itemTypeLabel(),
                    'base_unit' => $item->baseUnitName(),
                ],
                'units' => $item->units()->where('is_active', true)->get()->map(fn ($unit) => [
                    'id' => $unit->id, 'name' => $unit->name,
                    'factor_to_base' => (float) $unit->factor_to_base,
                    'contains_qty' => (float) $unit->contains_qty,
                    'parent_unit_id' => $unit->parent_unit_id,
                    'parent_unit' => $unit->parentUnit?->name,
                    'hierarchy_label' => $unit->hierarchyLabel(),
                    'packaging_type' => $unit->packagingType?->name,
                    'barcodes' => $unit->barcodes->where('is_active', true)->pluck('barcode')->values(),
                    'is_default_receive' => $unit->is_default_receive,
                    'is_default_transfer' => $unit->is_default_transfer,
                    'is_default_dispense' => $unit->is_default_dispense,
                ]),
            ],
        ]);
    }

    public function syncDispense(Request $request)
    {
        $date = $request->input('date') ?: now('Asia/Bangkok')->toDateString();
        $result = $this->dispenseSync->sync(is_string($date) ? $date : null);

        return back()->with($result['ok'] ? 'success' : 'error', $result['message']);
    }

    public function manualDispense(Request $request)
    {
        $data = $request->validate([
            'location_id' => 'required|exists:pharmacy_locations,id',
            'icode' => 'required|string|max:20',
            'unit_id' => 'required|exists:pharmacy_item_units,id',
            'qty' => 'required|numeric|min:0.01',
            'note' => 'nullable|string|max:1000',
        ]);
        $movement = $this->inventory->dispenseFromPharmacy(
            (int) $data['location_id'], (string) $data['icode'], (float) $data['qty'],
            referenceId: 'manual-'.now()->format('YmdHisv'),
            unitId: (int) $data['unit_id'],
        );
        if (! empty($data['note'])) {
            $movement->update(['note' => 'ตัดจ่ายจากการสแกน: '.$data['note']]);
        }

        return back()->with('success', 'ตัดจ่ายจากห้องยาเรียบร้อยแล้ว');
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

    public function updateBalance(Request $request, PharmacyStockBalance $balance)
    {
        $data = $request->validate([
            'qty_on_hand' => 'required|numeric|min:0',
            'min_level' => 'nullable|numeric|min:0',
            'reorder_level' => 'nullable|numeric|min:0',
            'note' => 'nullable|string|max:1000',
        ]);

        $oldQty = (float) $balance->qty_on_hand;
        $newQty = (float) $data['qty_on_hand'];
        $diff = round($newQty - $oldQty, 2);

        DB::transaction(function () use ($balance, $data, $oldQty, $newQty, $diff) {
            $balance->update([
                'qty_on_hand' => $newQty,
                'min_level' => $data['min_level'] ?? $balance->min_level,
                'reorder_level' => $data['reorder_level'] ?? $balance->reorder_level,
            ]);

            // Sync with active lots so lots always equal the balance
            $this->inventory->syncBalanceToLots($balance->location_id, $balance->item_id, $newQty);

            if (abs($diff) > 0.0001) {
                PharmacyStockMovement::query()->create([
                    'type' => 'adjust',
                    'item_id' => $balance->item_id,
                    'lot_id' => null,
                    'from_location_id' => $diff < 0 ? $balance->location_id : null,
                    'to_location_id' => $diff > 0 ? $balance->location_id : null,
                    'qty' => abs($diff),
                    'balance_after' => $newQty,
                    'reference_type' => 'manual',
                    'reference_id' => 'adjust-balance-' . $balance->id,
                    'user_id' => Auth::id(),
                    'note' => 'ปรับยอดคงเหลือในคลัง: ' . ($data['note'] ?? 'แก้ไขยอดโดยตรง') . " (จาก {$oldQty} เป็น {$newQty})",
                ]);
            }
        });

        return back()->with('success', 'อัปเดตข้อมูลคงเหลือของ ' . ($balance->item?->name ?? 'ยา') . ' เรียบร้อยแล้ว');
    }

    public function destroyBalance(PharmacyStockBalance $balance)
    {
        $itemName = $balance->item?->name ?? 'รายการยา';
        $locationName = $balance->location?->name ?? 'คลัง';
        $qty = (float) $balance->qty_on_hand;

        DB::transaction(function () use ($balance, $qty) {
            if ($qty > 0) {
                PharmacyStockMovement::query()->create([
                    'type' => 'adjust',
                    'item_id' => $balance->item_id,
                    'lot_id' => null,
                    'from_location_id' => $balance->location_id,
                    'to_location_id' => null,
                    'qty' => $qty,
                    'balance_after' => 0,
                    'reference_type' => 'manual',
                    'reference_id' => 'delete-balance-' . $balance->id,
                    'user_id' => Auth::id(),
                    'note' => "ลบรายการสต็อกคงเหลือออกจากระบบ (ตัดยอดคงเหลือเดิม {$qty})",
                ]);
            }

            // CRITICAL FIX: Close all active lots for this item at this location so no ghost lots or phantom expiry alerts remain
            PharmacyLot::query()
                ->where('location_id', $balance->location_id)
                ->where('item_id', $balance->item_id)
                ->where('status', 'active')
                ->update([
                    'status' => 'closed',
                    'qty_remaining' => 0,
                ]);

            $balance->delete();
        });

        return back()->with('success', "ลบรายการคงเหลือของ {$itemName} ใน {$locationName} เรียบร้อยแล้ว");
    }

    public function reconcileStock(Request $request)
    {
        $locationId = $request->integer('location_id') ?: null;
        $result = $this->inventory->reconcileStockAndLots($locationId);

        $msg = "ซิงก์ความสอดคล้องระหว่างสต็อกและ Lot สำเร็จ (ปิด Lot ตกค้าง: {$result['closed_lots']}, ซิงก์ยอดคงเหลือ: {$result['synced_balances']}, แก้ไขยอดคลาดเคลื่อน: {$result['fixed_discrepancies']})";

        return back()->with('success', $msg);
    }

    public function stockCard(Request $request): Response
    {
        $this->inventory->ensureDefaultLocations();
        $locations = PharmacyLocation::query()->where('is_active', true)->orderBy('sort_order')->get(['id', 'code', 'name', 'type']);
        $locationId = $request->integer('location_id') ?: null;
        $icode = trim((string) $request->query('icode', ''));
        $startDate = $request->query('start_date') ?: now('Asia/Bangkok')->startOfMonth()->toDateString();
        $endDate = $request->query('end_date') ?: now('Asia/Bangkok')->toDateString();

        $item = null;
        $selectedLocation = $locationId ? $locations->firstWhere('id', $locationId) : null;
        $cardData = null;

        if ($icode !== '') {
            $item = PharmacyItem::query()->with('units')
                ->where('icode', $icode)
                ->orWhere('id', is_numeric($icode) ? (int)$icode : 0)
                ->orWhere('name', 'like', "%{$icode}%")
                ->first();
        }

        if (! $item && ! empty($icode)) {
            try {
                $item = $this->inventory->resolveItemFromHosxp($icode);
            } catch (\Throwable) {}

            if (! $item) {
                try {
                    $found = $this->inventory->searchHosxpDrugs($icode, 1);
                    if (! empty($found[0]['icode'])) {
                        $item = $this->inventory->resolveItemFromHosxp($found[0]['icode']);
                    }
                } catch (\Throwable) {}
            }
        }

        if ($item) {
            // 1. Calculate Starting Balance before $startDate
            $priorQuery = PharmacyStockMovement::query()
                ->where('item_id', $item->id)
                ->where('created_at', '<', $startDate . ' 00:00:00');

            if ($locationId) {
                $priorQuery->where(function ($q) use ($locationId) {
                    $q->where('to_location_id', $locationId)
                      ->orWhere('from_location_id', $locationId);
                });
            }

            $priorMovements = $priorQuery->orderBy('created_at')->orderBy('id')->get();
            $startingBalance = 0.0;
            foreach ($priorMovements as $pm) {
                $isIn = false;
                $isOut = false;
                if ($locationId) {
                    if ($pm->to_location_id == $locationId) $isIn = true;
                    if ($pm->from_location_id == $locationId) $isOut = true;
                } else {
                    if (in_array($pm->type, ['receive', 'transfer_in', 'return'])) $isIn = true;
                    if (in_array($pm->type, ['dispense', 'transfer_out'])) $isOut = true;
                    if ($pm->type === 'adjust') {
                        if ($pm->to_location_id) $isIn = true;
                        if ($pm->from_location_id) $isOut = true;
                    }
                }
                if ($isIn && ! $isOut) $startingBalance += (float) $pm->qty;
                elseif ($isOut && ! $isIn) $startingBalance -= (float) $pm->qty;
            }

            // 2. Movements in Range
            $rangeQuery = PharmacyStockMovement::query()
                ->with(['lot', 'transactionUnit', 'fromLocation', 'toLocation', 'user'])
                ->where('item_id', $item->id)
                ->where('created_at', '>=', $startDate . ' 00:00:00')
                ->where('created_at', '<=', $endDate . ' 23:59:59');

            if ($locationId) {
                $rangeQuery->where(function ($q) use ($locationId) {
                    $q->where('to_location_id', $locationId)
                      ->orWhere('from_location_id', $locationId);
                });
            }

            $rangeMovements = $rangeQuery->orderBy('created_at')->orderBy('id')->get();

            $running = $startingBalance;
            $totalIn = 0.0;
            $totalOut = 0.0;
            $rows = [];

            foreach ($rangeMovements as $m) {
                $inQty = 0.0;
                $outQty = 0.0;

                if ($locationId) {
                    if ($m->to_location_id == $locationId && $m->from_location_id != $locationId) {
                        $inQty = (float) $m->qty;
                    } elseif ($m->from_location_id == $locationId && $m->to_location_id != $locationId) {
                        $outQty = (float) $m->qty;
                    } elseif ($m->type === 'adjust') {
                        if ($m->to_location_id == $locationId) $inQty = (float) $m->qty;
                        if ($m->from_location_id == $locationId) $outQty = (float) $m->qty;
                    }
                } else {
                    if (in_array($m->type, ['receive', 'transfer_in', 'return'])) {
                        $inQty = (float) $m->qty;
                    } elseif (in_array($m->type, ['dispense', 'transfer_out'])) {
                        $outQty = (float) $m->qty;
                    } elseif ($m->type === 'adjust') {
                        if ($m->to_location_id) $inQty = (float) $m->qty;
                        if ($m->from_location_id) $outQty = (float) $m->qty;
                    }
                }

                $running = round($running + $inQty - $outQty, 2);
                $totalIn += $inQty;
                $totalOut += $outQty;

                $typeLabel = match ($m->type) {
                    'receive' => 'รับเข้าคลัง',
                    'transfer_in' => 'รับโอนจาก ' . ($m->fromLocation?->name ?? ''),
                    'transfer_out' => 'โอนไปยัง ' . ($m->toLocation?->name ?? ''),
                    'dispense' => 'จ่ายยา ' . ($m->hn ? "HN {$m->hn}" : ($m->note ?: '')),
                    'return' => 'รับคืนยาเข้าห้องยา ' . ($m->note ?: ''),
                    'adjust' => 'ปรับยอดสต็อก',
                    'count_adjust' => 'ปรับตามตรวจนับ',
                    default => $m->type,
                };

                $rows[] = [
                    'id' => $m->id,
                    'date' => $m->created_at->format('Y-m-d H:i'),
                    'type' => $m->type,
                    'type_label' => $typeLabel,
                    'document_no' => $m->lot?->lot_no ? 'Lot: ' . $m->lot->lot_no : ($m->reference_id ? '#' . $m->reference_id : '—'),
                    'lot_no' => $m->lot?->lot_no,
                    'expires_at' => $m->lot?->expires_at,
                    'in_qty' => $inQty,
                    'out_qty' => $outQty,
                    'balance' => $running,
                    'unit' => $item->baseUnitName(),
                    'package_info' => $m->transaction_qty && $m->transactionUnit
                        ? "{$m->transaction_qty} {$m->transactionUnit->name}"
                        : null,
                    'user_name' => $m->user?->name ?? 'ระบบ',
                    'note' => $m->note,
                ];
            }

            // Current live stock from balances table
            $currentStock = (float) PharmacyStockBalance::query()
                ->where('item_id', $item->id)
                ->when($locationId, fn ($q) => $q->where('location_id', $locationId))
                ->sum('qty_on_hand');

            $cardData = [
                'item' => [
                    'id' => $item->id,
                    'icode' => $item->icode,
                    'name' => $item->name,
                    'item_type' => $item->item_type ?? 'drug',
                    'item_type_label' => $item->itemTypeLabel(),
                    'income_code' => $item->income_code,
                    'strength' => $item->strength,
                    'unit' => $item->baseUnitName(),
                    'base_unit' => $item->base_unit,
                    'is_had' => (bool) ($item->is_had ?? false),
                    'is_cold_chain' => (bool) ($item->is_cold_chain ?? false),
                    'is_narcotic' => (bool) ($item->is_narcotic ?? false),
                    'storage_temp' => $item->storage_temp ?? null,
                    'had_alert_text' => $item->had_alert_text ?? null,
                ],
                'location' => $selectedLocation ? [
                    'id' => $selectedLocation->id,
                    'name' => $selectedLocation->name,
                    'code' => $selectedLocation->code,
                    'type' => $selectedLocation->type,
                ] : null,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'starting_balance' => round($startingBalance, 2),
                'total_in' => round($totalIn, 2),
                'total_out' => round($totalOut, 2),
                'ending_balance' => round($running, 2),
                'current_stock' => $currentStock,
                'movements' => $rows,
            ];
        }

        return Inertia::render('Pharmacy/Inventory/StockCard', [
            'locations' => $locations,
            'hospitalName' => PharmacySetting::query()->where('key', 'hospital_label_header')->value('value') ?: 'โรงพยาบาลค่ายสุรสิงหนาท',
            'filters' => [
                'icode' => $icode,
                'location_id' => $locationId,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'cardData' => $cardData,
        ]);
    }

    public function batchLabels(Request $request): Response
    {
        $this->inventory->ensureDefaultLocations();
        $locations = PharmacyLocation::query()->where('is_active', true)->orderBy('sort_order')->get(['id', 'name', 'type']);
        $locationId = $request->integer('location_id') ?: null;
        $q = trim((string) $request->query('q', ''));

        $query = PharmacyLot::query()
            ->with(['item.units', 'location'])
            ->where('status', 'active')
            ->where('qty_remaining', '>', 0);

        if ($locationId) {
            $query->where('location_id', $locationId);
        }
        if ($q !== '') {
            $query->where(function ($b) use ($q) {
                $b->where('lot_no', 'like', "%{$q}%")
                  ->orWhereHas('item', fn ($iq) => $iq->where('icode', 'like', "%{$q}%")->orWhere('name', 'like', "%{$q}%"));
            });
        }

        $lots = $query->orderByRaw('CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END')
            ->orderBy('expires_at')
            ->limit(100)
            ->get()
            ->map(fn (PharmacyLot $l) => [
                'id' => $l->id,
                'lot_no' => $l->lot_no,
                'qr_token' => $l->qr_token,
                'qr_payload' => "PHARMLOT:{$l->qr_token}",
                'barcode' => $l->item?->barcode ?: $l->lot_no,
                'received_at' => $l->received_at,
                'expires_at' => $l->expires_at,
                'qty_remaining' => (float) $l->qty_remaining,
                'item' => [
                    'id' => $l->item?->id,
                    'icode' => $l->item?->icode,
                    'name' => $l->item?->name,
                    'item_type' => $l->item?->item_type ?? 'drug',
                    'item_type_label' => $l->item?->itemTypeLabel(),
                    'strength' => $l->item?->strength,
                    'unit' => $l->item?->baseUnitName(),
                    'is_had' => (bool) ($l->item?->is_had ?? false),
                    'is_cold_chain' => (bool) ($l->item?->is_cold_chain ?? false),
                    'storage_temp' => $l->item?->storage_temp ?? null,
                ],
                'location' => [
                    'id' => $l->location?->id,
                    'name' => $l->location?->name,
                ],
            ]);

        return Inertia::render('Pharmacy/Inventory/BatchLabels', [
            'locations' => $locations,
            'lots' => $lots,
            'hospitalName' => PharmacySetting::query()->where('key', 'hospital_label_header')->value('value') ?: 'โรงพยาบาลค่ายสุรสิงหนาท',
            'filters' => [
                'location_id' => $locationId,
                'q' => $q,
            ],
        ]);
    }

    public function dispenseSyncHistory(Request $request): Response
    {
        $startDate = $request->query('start_date') ?: now('Asia/Bangkok')->subDays(7)->toDateString();
        $endDate = $request->query('end_date') ?: now('Asia/Bangkok')->toDateString();
        $status = $request->query('status');

        $query = PharmacyDispenseSync::query()
            ->with(['item'])
            ->where('vstdate', '>=', $startDate)
            ->where('vstdate', '<=', $endDate);

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $syncs = $query->orderByDesc('id')->paginate(100)->withQueryString();

        $stats = [
            'total' => PharmacyDispenseSync::query()->whereBetween('vstdate', [$startDate, $endDate])->count(),
            'synced' => PharmacyDispenseSync::query()->whereBetween('vstdate', [$startDate, $endDate])->where('status', 'deducted')->count(),
            'insufficient' => PharmacyDispenseSync::query()->whereBetween('vstdate', [$startDate, $endDate])->where('status', 'insufficient')->count(),
            'failed' => PharmacyDispenseSync::query()->whereBetween('vstdate', [$startDate, $endDate])->where('status', 'failed')->count(),
        ];

        return Inertia::render('Pharmacy/Inventory/DispenseSync', [
            'syncs' => $syncs,
            'stats' => $stats,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'status' => $status ?: 'all',
            ],
        ]);
    }

    public function retryDispenseSync(Request $request)
    {
        $id = $request->integer('id') ?: null;
        $result = $this->dispenseSync->retryFailed($id);

        return back()->with($result['ok'] ? 'success' : 'error', $result['message']);
    }


    public function analytics(Request $request): Response
    {
        $this->inventory->ensureDefaultLocations();
        $locations = PharmacyLocation::query()->where('is_active', true)->orderBy('sort_order')->get(['id', 'name', 'type']);
        $locationId = $request->integer('location_id') ?: null;

        // 1. Calculate Average Daily Usage (ADU) over the last 90 days
        $ninetyDaysAgo = now('Asia/Bangkok')->subDays(90)->toDateString();
        $usageData = PharmacyStockMovement::query()
            ->select('item_id', DB::raw('SUM(qty) as total_dispensed'), DB::raw('COUNT(DISTINCT vstdate) as days_dispensed'))
            ->where('type', 'dispense')
            ->where('created_at', '>=', $ninetyDaysAgo . ' 00:00:00')
            ->when($locationId, fn ($q) => $q->where('from_location_id', $locationId))
            ->groupBy('item_id')
            ->get()
            ->keyBy('item_id');

        // 2. Fetch current balances with items
        $balances = PharmacyStockBalance::query()
            ->with(['item.lots' => fn ($lq) => $lq->where('status', 'active')->where('qty_remaining', '>', 0)])
            ->when($locationId, fn ($q) => $q->where('location_id', $locationId))
            ->get();

        // 3. Compute Stock Value, Days of Supply, ABC classification
        $itemsAnalysis = [];
        $totalInventoryValue = 0.0;

        foreach ($balances as $b) {
            $item = $b->item;
            if (! $item) continue;

            $qtyOnHand = (float) $b->qty_on_hand;
            $activeLots = $item->lots ?? collect();
            $latestLot = $activeLots->sortByDesc('id')->first();
            $unitPrice = (float) ($latestLot?->invoice_unit_price ?? 0);
            $totalValue = round($qtyOnHand * $unitPrice, 2);
            $totalInventoryValue += $totalValue;

            $itemUsage = $usageData->get($item->id);
            $totalDispensed90d = (float) ($itemUsage?->total_dispensed ?? 0);
            $dailyUsage = round($totalDispensed90d / 90, 4);

            $daysOfSupply = $dailyUsage > 0 ? round($qtyOnHand / $dailyUsage, 1) : ($qtyOnHand > 0 ? 999 : 0);

            // Stock Health Status
            $status = 'healthy';
            if ($qtyOnHand <= 0) $status = 'out_of_stock';
            elseif ($daysOfSupply < 7) $status = 'critical_low';
            elseif ($daysOfSupply < 15) $status = 'reorder_needed';
            elseif ($daysOfSupply > 180 && $dailyUsage > 0) $status = 'overstock';
            elseif ($dailyUsage == 0 && $qtyOnHand > 0) $status = 'dead_stock';

            // VEN category (Vital, Essential, Non-essential)
            $ven = 'E';
            if ($item->is_had || $item->is_narcotic || in_array(strtolower($item->drug_group ?? ''), ['ed', 'ned_v', 'vital'])) {
                $ven = 'V';
            } elseif (in_array(strtolower($item->drug_group ?? ''), ['ned', 'cosmetic'])) {
                $ven = 'N';
            }

            $itemsAnalysis[] = [
                'item_id' => $item->id,
                'icode' => $item->icode,
                'name' => $item->name,
                'strength' => $item->strength,
                'unit' => $item->baseUnitName(),
                'qty_on_hand' => $qtyOnHand,
                'unit_price' => $unitPrice,
                'total_value' => $totalValue,
                'daily_usage' => $dailyUsage,
                'dispensed_90d' => $totalDispensed90d,
                'days_of_supply' => $daysOfSupply,
                'status' => $status,
                'ven' => $ven,
                'is_had' => (bool) ($item->is_had ?? false),
                'is_cold_chain' => (bool) ($item->is_cold_chain ?? false),
                'is_narcotic' => (bool) ($item->is_narcotic ?? false),
            ];
        }

        // ABC Calculation by Pareto value
        usort($itemsAnalysis, fn ($a, $b) => $b['total_value'] <=> $a['total_value']);
        $accumulatedValue = 0.0;
        foreach ($itemsAnalysis as &$row) {
            $accumulatedValue += $row['total_value'];
            $pct = $totalInventoryValue > 0 ? ($accumulatedValue / $totalInventoryValue) * 100 : 0;
            if ($pct <= 75) {
                $row['abc'] = 'A';
            } elseif ($pct <= 95) {
                $row['abc'] = 'B';
            } else {
                $row['abc'] = 'C';
            }
            $row['abc_ven'] = $row['abc'] . $row['ven'];
        }
        unset($row);

        // Near-Expiry Lots (within 90 and 180 days)
        $nearExpiryLots = PharmacyLot::query()
            ->with(['item', 'location'])
            ->where('status', 'active')
            ->where('qty_remaining', '>', 0)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now('Asia/Bangkok')->addDays(180)->toDateString())
            ->whereExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('pharmacy_stock_balances')
                    ->whereColumn('pharmacy_stock_balances.item_id', 'pharmacy_lots.item_id')
                    ->whereColumn('pharmacy_stock_balances.location_id', 'pharmacy_lots.location_id')
                    ->where('pharmacy_stock_balances.qty_on_hand', '>', 0);
            })
            ->orderBy('expires_at')
            ->get()
            ->map(fn ($l) => [
                'lot_no' => $l->lot_no,
                'expires_at' => $l->expires_at,
                'days_remaining' => (int) now('Asia/Bangkok')->diffInDays(\Carbon\Carbon::parse($l->expires_at), false),
                'qty_remaining' => (float) $l->qty_remaining,
                'item_name' => $l->item?->name,
                'icode' => $l->item?->icode,
                'unit' => $l->item?->baseUnitName(),
                'location_name' => $l->location?->name,
            ]);

        // ABC-VEN 9-cell counts
        $matrixCounts = [
            'AV' => 0, 'BV' => 0, 'CV' => 0,
            'AE' => 0, 'BE' => 0, 'CE' => 0,
            'AN' => 0, 'BN' => 0, 'CN' => 0,
        ];
        foreach ($itemsAnalysis as $it) {
            $key = $it['abc_ven'] ?? 'CE';
            if (isset($matrixCounts[$key])) {
                $matrixCounts[$key]++;
            }
        }

        return Inertia::render('Pharmacy/Inventory/Analytics', [
            'locations' => $locations,
            'items' => $itemsAnalysis,
            'nearExpiryLots' => $nearExpiryLots,
            'matrixCounts' => $matrixCounts,
            'totalInventoryValue' => $totalInventoryValue,
            'filters' => [
                'location_id' => $locationId,
            ],
        ]);
    }

    public function drugOut(Request $request): Response
    {
        $locations = PharmacyLocation::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        $selectedLocationId = (int) ($request->query('location_id') ?: $locations->firstWhere('type', 'pharmacy')?->id ?: $locations->first()?->id);

        $recentMovements = PharmacyStockMovement::query()
            ->with(['item', 'lot', 'fromLocation', 'toLocation', 'transactionUnit', 'user'])
            ->whereIn('type', ['dispense', 'return'])
            ->when($selectedLocationId, function ($q) use ($selectedLocationId) {
                $q->where(function ($sq) use ($selectedLocationId) {
                    $sq->where('from_location_id', $selectedLocationId)
                       ->orWhere('to_location_id', $selectedLocationId);
                });
            })
            ->latest('id')
            ->limit(50)
            ->get()
            ->map(fn (PharmacyStockMovement $m) => [
                'id' => $m->id,
                'type' => $m->type,
                'created_at' => $m->created_at->format('Y-m-d H:i'),
                'item_name' => $m->item?->name ?? '—',
                'icode' => $m->item?->icode ?? '—',
                'qty' => (float) $m->qty,
                'unit_name' => $m->item?->baseUnitName() ?? 'หน่วย',
                'transaction_qty' => $m->transaction_qty !== null ? (float) $m->transaction_qty : (float) $m->qty,
                'transaction_unit' => $m->transactionUnit?->name ?? $m->item?->baseUnitName() ?? 'หน่วย',
                'from_location' => $m->fromLocation?->name,
                'to_location' => $m->toLocation?->name,
                'lot_no' => $m->lot?->lot_no,
                'reference_id' => $m->reference_id,
                'reference_type' => $m->reference_type,
                'user_name' => $m->user?->name ?? 'ระบบ',
                'note' => $m->note,
            ]);

        $today = now('Asia/Bangkok')->toDateString();
        $todayIssued = PharmacyStockMovement::query()
            ->where('type', 'dispense')
            ->whereDate('created_at', $today)
            ->when($selectedLocationId, fn ($q) => $q->where('from_location_id', $selectedLocationId))
            ->sum('qty');

        $todayIssuedCount = PharmacyStockMovement::query()
            ->where('type', 'dispense')
            ->whereDate('created_at', $today)
            ->when($selectedLocationId, fn ($q) => $q->where('from_location_id', $selectedLocationId))
            ->count();

        $todayReturned = PharmacyStockMovement::query()
            ->where('type', 'return')
            ->whereDate('created_at', $today)
            ->when($selectedLocationId, fn ($q) => $q->where('to_location_id', $selectedLocationId))
            ->sum('qty');

        $todayReturnedCount = PharmacyStockMovement::query()
            ->where('type', 'return')
            ->whereDate('created_at', $today)
            ->when($selectedLocationId, fn ($q) => $q->where('to_location_id', $selectedLocationId))
            ->count();

        return Inertia::render('Pharmacy/Inventory/DrugOut', [
            'locations' => $locations,
            'selectedLocationId' => $selectedLocationId,
            'recentMovements' => $recentMovements,
            'stats' => [
                'today_issued_qty' => (float) $todayIssued,
                'today_issued_count' => $todayIssuedCount,
                'today_returned_qty' => (float) $todayReturned,
                'today_returned_count' => $todayReturnedCount,
            ],
            'initialBarcode' => (string) $request->query('barcode', ''),
        ]);
    }

    public function drugOutIssue(Request $request)
    {
        $data = $request->validate([
            'location_id' => 'required|exists:pharmacy_locations,id',
            'icode' => 'required|string|max:20',
            'qty' => 'required|numeric|min:0.01',
            'unit_id' => 'nullable|exists:pharmacy_item_units,id',
            'reason' => 'required|string|in:department,patient,damaged,expired,borrow,other',
            'recipient' => 'nullable|string|max:150',
            'reference_id' => 'nullable|string|max:100',
            'note' => 'nullable|string|max:500',
        ]);

        try {
            $movement = $this->inventory->issueFromPharmacy(
                pharmacyLocationId: (int) $data['location_id'],
                icode: (string) $data['icode'],
                qty: (float) $data['qty'],
                reason: (string) $data['reason'],
                referenceId: $data['reference_id'] ?? null,
                recipient: $data['recipient'] ?? null,
                unitId: !empty($data['unit_id']) ? (int) $data['unit_id'] : null,
                note: $data['note'] ?? null,
            );

            $itemName = $movement->item?->name ?? $data['icode'];
            return back()->with('success', "ตัดยาออกหน่วยสำเร็จ: {$itemName} จำนวน {$movement->qty} {$movement->item?->baseUnitName()}");
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function drugOutReturn(Request $request)
    {
        $data = $request->validate([
            'location_id' => 'required|exists:pharmacy_locations,id',
            'icode' => 'required|string|max:20',
            'qty' => 'required|numeric|min:0.01',
            'unit_id' => 'nullable|exists:pharmacy_item_units,id',
            'reason' => 'required|string|in:patient_return,department_return,order_cancel,other_return',
            'source' => 'nullable|string|max:150',
            'reference_id' => 'nullable|string|max:100',
            'expires_at' => 'nullable|date',
            'note' => 'nullable|string|max:500',
            'lot_id' => 'nullable|exists:pharmacy_lots,id',
        ]);

        try {
            $movement = $this->inventory->returnToPharmacy(
                pharmacyLocationId: (int) $data['location_id'],
                icode: (string) $data['icode'],
                qty: (float) $data['qty'],
                reason: (string) $data['reason'],
                referenceId: $data['reference_id'] ?? null,
                source: $data['source'] ?? null,
                unitId: !empty($data['unit_id']) ? (int) $data['unit_id'] : null,
                expiresAt: $data['expires_at'] ?? null,
                note: $data['note'] ?? null,
                lotId: !empty($data['lot_id']) ? (int) $data['lot_id'] : null,
            );

            $itemName = $movement->item?->name ?? $data['icode'];
            return back()->with('success', "รับคืนยาเข้าห้องยาสำเร็จ: {$itemName} จำนวน {$movement->qty} {$movement->item?->baseUnitName()}");
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function drugOutStockInfo(Request $request)
    {
        $icode = trim((string) $request->query('icode', ''));
        $locationId = (int) $request->query('location_id', 0);

        if (!$icode || !$locationId) {
            return response()->json(['found' => false, 'error' => 'Missing parameters'], 400);
        }

        $item = PharmacyItem::query()->with('units')->where('icode', $icode)->first();
        if (!$item) {
            try {
                $item = $this->inventory->resolveItemFromHosxp($icode);
            } catch (\Throwable) {}
        }
        if (!$item) {
            return response()->json(['found' => false, 'error' => 'ไม่พบข้อมูลยา']);
        }

        $balance = PharmacyStockBalance::query()
            ->where('item_id', $item->id)
            ->where('location_id', $locationId)
            ->first();

        $lots = PharmacyLot::query()
            ->where('item_id', $item->id)
            ->where('location_id', $locationId)
            ->where('status', 'active')
            ->where('qty_remaining', '>', 0)
            ->orderByRaw('CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END')
            ->orderBy('expires_at')
            ->get(['id', 'lot_no', 'expires_at', 'qty_remaining']);

        return response()->json([
            'found' => true,
            'item' => [
                'id' => $item->id,
                'icode' => $item->icode,
                'name' => $item->name,
                'item_type' => $item->item_type ?? 'drug',
                'item_type_label' => $item->itemTypeLabel(),
                'income_code' => $item->income_code,
                'strength' => $item->strength,
                'unit' => $item->unit,
                'is_had' => (bool) $item->is_had,
                'is_cold_chain' => (bool) $item->is_cold_chain,
                'is_narcotic' => (bool) $item->is_narcotic,
                'units' => $item->units,
            ],
            'qty_on_hand' => (float) ($balance?->qty_on_hand ?? 0),
            'min_level' => (float) ($balance?->min_level ?? 0),
            'reorder_level' => (float) ($balance?->reorder_level ?? 0),
            'active_lots' => $lots,
        ]);
    }
}
