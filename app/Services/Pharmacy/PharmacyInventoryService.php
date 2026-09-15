<?php

namespace App\Services\Pharmacy;

use App\Models\Pharmacy\PharmacyItem;
use App\Models\Pharmacy\PharmacyLocation;
use App\Models\Pharmacy\PharmacyLot;
use App\Models\Pharmacy\PharmacyStockBalance;
use App\Models\Pharmacy\PharmacyStockMovement;
use App\Services\HosxpConnectionService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class PharmacyInventoryService
{
    public function __construct(private readonly HosxpConnectionService $hosxp) {}

    public function ensureDefaultLocations(): void
    {
        PharmacyLocation::query()->firstOrCreate(
            ['code' => 'WH-MAIN'],
            ['name' => 'คลังยาหลัก', 'type' => 'warehouse', 'sort_order' => 1]
        );
        PharmacyLocation::query()->firstOrCreate(
            ['code' => 'PHARM-OPD'],
            ['name' => 'ห้องยา OPD', 'type' => 'pharmacy', 'sort_order' => 2]
        );
    }

    /**
     * ดึง/สร้างยาจาก HOSxP drugitems ตาม icode
     */
    public function resolveItemFromHosxp(string $icode): PharmacyItem
    {
        $icode = trim($icode);
        $existing = PharmacyItem::query()->where('icode', $icode)->first();
        if ($existing) {
            return $existing;
        }

        $name = $icode;
        $strength = null;
        $unit = null;
        $group = null;

        try {
            $status = $this->hosxp->check(false);
            if ($status['connected'] ?? false) {
                $row = DB::connection('hosxp')->table('drugitems')
                    ->where('icode', $icode)
                    ->first(['icode', 'name', 'strength', 'units', 'drugaccount']);
                if ($row) {
                    $name = (string) ($row->name ?: $icode);
                    $strength = $row->strength ? (string) $row->strength : null;
                    $unit = $row->units ? (string) $row->units : null;
                    $group = $row->drugaccount ? (string) $row->drugaccount : null;
                }
            }
        } catch (Throwable) {
            // fallback to local stub
        }

        return PharmacyItem::query()->create([
            'icode' => $icode,
            'name' => $name,
            'strength' => $strength,
            'unit' => $unit,
            'drug_group' => $group,
            'is_active' => true,
        ]);
    }

    public function searchHosxpDrugs(string $q, int $limit = 30): array
    {
        $q = trim($q);
        if ($q === '') {
            return [];
        }

        $status = $this->hosxp->check(false);
        if (! ($status['connected'] ?? false)) {
            return PharmacyItem::query()
                ->where(function ($query) use ($q) {
                    $query->where('icode', 'like', "%{$q}%")
                        ->orWhere('name', 'like', "%{$q}%");
                })
                ->limit($limit)
                ->get(['icode', 'name', 'strength', 'unit'])
                ->map(fn (PharmacyItem $i) => [
                    'icode' => $i->icode,
                    'name' => $i->name,
                    'strength' => $i->strength,
                    'unit' => $i->unit,
                ])
                ->all();
        }

        return DB::connection('hosxp')->table('drugitems')
            ->where(function ($query) use ($q) {
                $query->where('icode', 'like', "%{$q}%")
                    ->orWhere('name', 'like', "%{$q}%");
            })
            ->where(function ($query) {
                $query->whereNull('istatus')->orWhere('istatus', 'Y');
            })
            ->orderBy('name')
            ->limit($limit)
            ->get(['icode', 'name', 'strength', 'units'])
            ->map(fn ($r) => [
                'icode' => (string) $r->icode,
                'name' => (string) $r->name,
                'strength' => $r->strength ? (string) $r->strength : null,
                'unit' => $r->units ? (string) $r->units : null,
            ])
            ->all();
    }

    /**
     * รับเข้าคลัง + สร้าง lot + QR token
     *
     * @param  array{
     *   icode: string,
     *   location_id: int,
     *   lot_no: string,
     *   qty: float|int|string,
     *   received_at: string,
     *   expires_at?: ?string,
     *   supplier?: ?string,
     *   invoice_no?: ?string,
     *   notes?: ?string,
     *   reorder_level?: float|int|string|null,
     *   min_level?: float|int|string|null
     * }  $data
     */
    public function receive(array $data): PharmacyLot
    {
        return DB::transaction(function () use ($data) {
            $location = PharmacyLocation::query()->lockForUpdate()->findOrFail($data['location_id']);
            $item = $this->resolveItemFromHosxp((string) $data['icode']);
            $qty = round((float) $data['qty'], 2);
            if ($qty <= 0) {
                throw new RuntimeException('จำนวนรับเข้าต้องมากกว่า 0');
            }

            $lot = PharmacyLot::query()->create([
                'item_id' => $item->id,
                'location_id' => $location->id,
                'lot_no' => trim((string) $data['lot_no']),
                'received_at' => $data['received_at'],
                'expires_at' => $data['expires_at'] ?? null,
                'qty_received' => $qty,
                'qty_remaining' => $qty,
                'supplier' => $data['supplier'] ?? null,
                'invoice_no' => $data['invoice_no'] ?? null,
                'qr_token' => Str::lower((string) Str::ulid()),
                'status' => 'active',
                'received_by' => Auth::id(),
                'notes' => $data['notes'] ?? null,
            ]);

            $balance = $this->lockBalance($location->id, $item->id);
            $before = (float) $balance->qty_on_hand;
            $after = $before + $qty;
            $balance->qty_on_hand = $after;
            if (isset($data['reorder_level']) && $data['reorder_level'] !== null && $data['reorder_level'] !== '') {
                $balance->reorder_level = (float) $data['reorder_level'];
            }
            if (isset($data['min_level']) && $data['min_level'] !== null && $data['min_level'] !== '') {
                $balance->min_level = (float) $data['min_level'];
            }
            $balance->save();

            PharmacyStockMovement::query()->create([
                'type' => 'receive',
                'item_id' => $item->id,
                'lot_id' => $lot->id,
                'from_location_id' => null,
                'to_location_id' => $location->id,
                'qty' => $qty,
                'balance_after' => $after,
                'reference_type' => 'manual',
                'reference_id' => (string) $lot->id,
                'user_id' => Auth::id(),
                'note' => 'รับเข้า lot '.$lot->lot_no,
            ]);

            return $lot->load(['item', 'location']);
        });
    }

    /**
     * เบิกจากคลัง → ห้องยา (FEFO ตามวันหมดอายุ)
     */
    public function transfer(int $fromLocationId, int $toLocationId, string $icode, float $qty, ?string $note = null): array
    {
        if ($fromLocationId === $toLocationId) {
            throw new RuntimeException('ต้นทางและปลายทางต้องต่างกัน');
        }
        if ($qty <= 0) {
            throw new RuntimeException('จำนวนเบิกต้องมากกว่า 0');
        }

        return DB::transaction(function () use ($fromLocationId, $toLocationId, $icode, $qty, $note) {
            $from = PharmacyLocation::query()->lockForUpdate()->findOrFail($fromLocationId);
            $to = PharmacyLocation::query()->lockForUpdate()->findOrFail($toLocationId);
            $item = $this->resolveItemFromHosxp($icode);

            $fromBalance = $this->lockBalance($from->id, $item->id);
            if ((float) $fromBalance->qty_on_hand < $qty) {
                throw new RuntimeException('สต็อกต้นทางไม่พอ (คงเหลือ '.$fromBalance->qty_on_hand.')');
            }

            $remaining = $qty;
            $movedLots = [];

            $lots = PharmacyLot::query()
                ->where('item_id', $item->id)
                ->where('location_id', $from->id)
                ->where('status', 'active')
                ->where('qty_remaining', '>', 0)
                ->orderByRaw('CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END')
                ->orderBy('expires_at')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            foreach ($lots as $lot) {
                if ($remaining <= 0) {
                    break;
                }
                $take = min((float) $lot->qty_remaining, $remaining);
                if ($take <= 0) {
                    continue;
                }

                $lot->qty_remaining = (float) $lot->qty_remaining - $take;
                if ((float) $lot->qty_remaining <= 0.0001) {
                    $lot->qty_remaining = 0;
                    $lot->status = 'depleted';
                }
                $lot->save();

                $destLot = PharmacyLot::query()->create([
                    'item_id' => $item->id,
                    'location_id' => $to->id,
                    'lot_no' => $lot->lot_no,
                    'received_at' => now('Asia/Bangkok')->toDateString(),
                    'expires_at' => $lot->expires_at?->toDateString(),
                    'qty_received' => $take,
                    'qty_remaining' => $take,
                    'supplier' => $lot->supplier,
                    'invoice_no' => $lot->invoice_no,
                    'qr_token' => Str::lower((string) Str::ulid()),
                    'status' => 'active',
                    'received_by' => Auth::id(),
                    'notes' => 'โอนจาก '.$from->code.' lot #'.$lot->id,
                ]);

                PharmacyStockMovement::query()->create([
                    'type' => 'transfer_out',
                    'item_id' => $item->id,
                    'lot_id' => $lot->id,
                    'from_location_id' => $from->id,
                    'to_location_id' => $to->id,
                    'qty' => $take,
                    'balance_after' => null,
                    'reference_type' => 'transfer',
                    'reference_id' => (string) $destLot->id,
                    'user_id' => Auth::id(),
                    'note' => $note,
                ]);

                PharmacyStockMovement::query()->create([
                    'type' => 'transfer_in',
                    'item_id' => $item->id,
                    'lot_id' => $destLot->id,
                    'from_location_id' => $from->id,
                    'to_location_id' => $to->id,
                    'qty' => $take,
                    'balance_after' => null,
                    'reference_type' => 'transfer',
                    'reference_id' => (string) $lot->id,
                    'user_id' => Auth::id(),
                    'note' => $note,
                ]);

                $movedLots[] = [
                    'from_lot_id' => $lot->id,
                    'to_lot_id' => $destLot->id,
                    'lot_no' => $lot->lot_no,
                    'qty' => $take,
                    'qr_token' => $destLot->qr_token,
                ];
                $remaining -= $take;
            }

            if ($remaining > 0.0001) {
                throw new RuntimeException('สต็อก lot ไม่พอสำหรับเบิก (ขาด '.$remaining.')');
            }

            $fromBalance->qty_on_hand = (float) $fromBalance->qty_on_hand - $qty;
            $fromBalance->save();

            $toBalance = $this->lockBalance($to->id, $item->id);
            $toBalance->qty_on_hand = (float) $toBalance->qty_on_hand + $qty;
            $toBalance->save();

            return [
                'item' => $item,
                'from' => $from,
                'to' => $to,
                'qty' => $qty,
                'lots' => $movedLots,
            ];
        });
    }

    /**
     * ตัดจ่ายจากห้องยา (FEFO) — ใช้ตอน sync จาก HOSxP
     */
    public function dispenseFromPharmacy(
        int $pharmacyLocationId,
        string $icode,
        float $qty,
        ?string $hn = null,
        ?string $vn = null,
        ?string $vstdate = null,
        ?string $referenceId = null,
    ): PharmacyStockMovement {
        if ($qty <= 0) {
            throw new RuntimeException('จำนวนจ่ายต้องมากกว่า 0');
        }

        return DB::transaction(function () use ($pharmacyLocationId, $icode, $qty, $hn, $vn, $vstdate, $referenceId) {
            $location = PharmacyLocation::query()->lockForUpdate()->findOrFail($pharmacyLocationId);
            $item = PharmacyItem::query()->where('icode', $icode)->first()
                ?? $this->resolveItemFromHosxp($icode);

            $balance = $this->lockBalance($location->id, $item->id);
            if ((float) $balance->qty_on_hand < $qty) {
                throw new RuntimeException('สต็อกห้องยาไม่พอสำหรับ '.$icode.' (เหลือ '.$balance->qty_on_hand.')');
            }

            $remaining = $qty;
            $lastLotId = null;
            $lots = PharmacyLot::query()
                ->where('item_id', $item->id)
                ->where('location_id', $location->id)
                ->where('status', 'active')
                ->where('qty_remaining', '>', 0)
                ->orderByRaw('CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END')
                ->orderBy('expires_at')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            foreach ($lots as $lot) {
                if ($remaining <= 0) {
                    break;
                }
                $take = min((float) $lot->qty_remaining, $remaining);
                if ($take <= 0) {
                    continue;
                }
                $lot->qty_remaining = (float) $lot->qty_remaining - $take;
                if ((float) $lot->qty_remaining <= 0.0001) {
                    $lot->qty_remaining = 0;
                    $lot->status = 'depleted';
                }
                $lot->save();
                $lastLotId = $lot->id;
                $remaining -= $take;
            }

            if ($remaining > 0.0001) {
                throw new RuntimeException('lot ห้องยาไม่พอสำหรับจ่าย '.$icode);
            }

            $balance->qty_on_hand = (float) $balance->qty_on_hand - $qty;
            $balance->save();

            return PharmacyStockMovement::query()->create([
                'type' => 'dispense',
                'item_id' => $item->id,
                'lot_id' => $lastLotId,
                'from_location_id' => $location->id,
                'to_location_id' => null,
                'qty' => $qty,
                'balance_after' => (float) $balance->qty_on_hand,
                'reference_type' => 'hosxp_opitemrece',
                'reference_id' => $referenceId,
                'hn' => $hn,
                'vn' => $vn,
                'vstdate' => $vstdate,
                'user_id' => Auth::id(),
                'note' => 'ตัดจ่ายตามใบสั่ง HOSxP',
            ]);
        });
    }

    public function dashboardSummary(): array
    {
        $this->ensureDefaultLocations();

        $locations = PharmacyLocation::query()->where('is_active', true)->orderBy('sort_order')->get();
        $balances = PharmacyStockBalance::query()->with(['item', 'location'])->get();

        $low = $balances->filter(fn (PharmacyStockBalance $b) => $b->isLow())->values();
        $empty = $balances->filter(fn (PharmacyStockBalance $b) => $b->isEmpty())->values();
        $expiring = PharmacyLot::query()
            ->with(['item', 'location'])
            ->where('status', 'active')
            ->where('qty_remaining', '>', 0)
            ->whereNotNull('expires_at')
            ->whereDate('expires_at', '<=', now('Asia/Bangkok')->addDays(90)->toDateString())
            ->orderBy('expires_at')
            ->limit(30)
            ->get();

        return [
            'locations' => $locations,
            'totals' => [
                'items' => PharmacyItem::query()->count(),
                'lots_active' => PharmacyLot::query()->where('status', 'active')->where('qty_remaining', '>', 0)->count(),
                'low' => $low->count(),
                'empty' => $empty->count(),
                'expiring_90d' => $expiring->count(),
            ],
            'low_stock' => $low->take(20)->map(fn (PharmacyStockBalance $b) => $this->balancePayload($b))->all(),
            'empty_stock' => $empty->take(20)->map(fn (PharmacyStockBalance $b) => $this->balancePayload($b))->all(),
            'expiring' => $expiring->map(fn (PharmacyLot $l) => [
                'id' => $l->id,
                'lot_no' => $l->lot_no,
                'qr_token' => $l->qr_token,
                'qr_payload' => $l->qrPayload(),
                'expires_at' => $l->expires_at?->toDateString(),
                'qty_remaining' => (float) $l->qty_remaining,
                'item' => ['icode' => $l->item?->icode, 'name' => $l->item?->name],
                'location' => ['code' => $l->location?->code, 'name' => $l->location?->name, 'type' => $l->location?->type],
            ])->all(),
            'by_location' => $locations->map(function (PharmacyLocation $loc) use ($balances) {
                $rows = $balances->where('location_id', $loc->id);

                return [
                    'id' => $loc->id,
                    'code' => $loc->code,
                    'name' => $loc->name,
                    'type' => $loc->type,
                    'sku_count' => $rows->count(),
                    'low' => $rows->filter(fn ($b) => $b->isLow())->count(),
                    'empty' => $rows->filter(fn ($b) => $b->isEmpty())->count(),
                    'qty_total' => round($rows->sum(fn ($b) => (float) $b->qty_on_hand), 2),
                ];
            })->values()->all(),
        ];
    }

    public function alertSnapshot(): array
    {
        $summary = $this->dashboardSummary();

        return [
            'low' => $summary['totals']['low'],
            'empty' => $summary['totals']['empty'],
            'expiring_90d' => $summary['totals']['expiring_90d'],
            'low_stock' => $summary['low_stock'],
            'empty_stock' => $summary['empty_stock'],
            'expiring' => $summary['expiring'],
        ];
    }

    private function lockBalance(int $locationId, int $itemId): PharmacyStockBalance
    {
        $balance = PharmacyStockBalance::query()
            ->where('location_id', $locationId)
            ->where('item_id', $itemId)
            ->lockForUpdate()
            ->first();

        if (! $balance) {
            $balance = PharmacyStockBalance::query()->create([
                'location_id' => $locationId,
                'item_id' => $itemId,
                'qty_on_hand' => 0,
                'qty_reserved' => 0,
                'reorder_level' => 0,
                'min_level' => 0,
            ]);
            $balance = PharmacyStockBalance::query()->whereKey($balance->id)->lockForUpdate()->firstOrFail();
        }

        return $balance;
    }

    private function balancePayload(PharmacyStockBalance $b): array
    {
        return [
            'id' => $b->id,
            'qty_on_hand' => (float) $b->qty_on_hand,
            'reorder_level' => (float) $b->reorder_level,
            'min_level' => (float) $b->min_level,
            'available' => $b->available(),
            'item' => [
                'icode' => $b->item?->icode,
                'name' => $b->item?->name,
                'strength' => $b->item?->strength,
            ],
            'location' => [
                'id' => $b->location?->id,
                'code' => $b->location?->code,
                'name' => $b->location?->name,
                'type' => $b->location?->type,
            ],
        ];
    }
}
