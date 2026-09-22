<?php

namespace App\Services\Pharmacy;

use App\Models\Pharmacy\PharmacyItem;
use App\Models\Pharmacy\PharmacyItemUnit;
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
     * ดึง/สร้างยาหรือเวชภัณฑ์มิใช่ยาจาก HOSxP ตาม icode
     */
    public function resolveItemFromHosxp(string $icode): PharmacyItem
    {
        $icode = trim($icode);
        $existing = PharmacyItem::query()->where('icode', $icode)->first();
        if ($existing) {
            $this->ensureBaseUnit($existing);

            return $existing;
        }

        $name = $icode;
        $strength = null;
        $unit = null;
        $group = null;
        $itemType = 'drug';
        $incomeCode = null;
        $meta = [];

        try {
            $status = $this->hosxp->check(false);
            if ($status['connected'] ?? false) {
                // 1. ตรวจสอบใน drugitems ก่อน
                $row = DB::connection('hosxp')->table('drugitems')
                    ->where('icode', $icode)
                    ->first(['icode', 'name', 'strength', 'units', 'drugaccount', 'income']);
                if ($row) {
                    $name = (string) ($row->name ?: $icode);
                    $strength = $row->strength ? (string) $row->strength : null;
                    $unit = $row->units ? (string) $row->units : null;
                    $group = $row->drugaccount ? (string) $row->drugaccount : null;
                    $isNondrug = str_starts_with(trim($name), '(ว)') || ($row->income ?? null) === '05';
                    $itemType = $isNondrug ? 'nondrug' : 'drug';
                    $incomeCode = $isNondrug ? '05' : ($row->income ?? null);
                } else {
                    // 2. ถ้าไม่พบใน drugitems ให้ตรวจสอบใน nondrugitems (income = '05' ค่าเวชภัณฑ์ที่มิใช่ยา)
                    $nondrug = DB::connection('hosxp')->table('nondrugitems as n')
                        ->leftJoin('income as i', 'i.income', '=', 'n.income')
                        ->leftJoin('nhso_adp_type as nac', 'nac.nhso_adp_type_id', '=', 'n.nhso_adp_type_id')
                        ->where('n.icode', $icode)
                        ->where('n.income', '05')
                        ->first([
                            'n.icode', 'n.name', 'n.unit', 'n.price', 'n.income',
                            'i.name as income_name', 'nac.nhso_adp_type_name',
                        ]);
                    if ($nondrug) {
                        $name = (string) ($nondrug->name ?: $icode);
                        $unit = $nondrug->unit ? (string) $nondrug->unit : 'ชิ้น';
                        $group = $nondrug->nhso_adp_type_name ?: 'ค่าเวชภัณฑ์ที่มิใช่ยา';
                        $itemType = 'nondrug';
                        $incomeCode = '05';
                        $meta = [
                            'income' => '05',
                            'income_name' => $nondrug->income_name ?: 'ค่าเวชภัณฑ์ที่มิใช่ยา',
                            'nhso_adp_type_name' => $nondrug->nhso_adp_type_name,
                            'price' => (float) ($nondrug->price ?? 0),
                        ];
                    }
                }
            }
        } catch (Throwable $e) {
            if ($e instanceof RuntimeException) {
                throw $e;
            }
        }

        if (! isset($row) && ! isset($nondrug)) {
            throw new RuntimeException("ไม่พบรหัสยา/เวชภัณฑ์ {$icode} ในฐานข้อมูล HOSxP");
        }

        $item = PharmacyItem::query()->create([
            'icode' => $icode,
            'name' => $name,
            'item_type' => $itemType,
            'income_code' => $incomeCode,
            'strength' => $strength,
            'unit' => $unit,
            'base_unit' => $unit ?: 'หน่วย',
            'dispense_unit' => $unit ?: 'หน่วย',
            'drug_group' => $group,
            'is_active' => true,
            'meta' => $meta ?: null,
            'hosxp_synced_at' => now(),
        ]);

        $this->ensureBaseUnit($item);

        return $item;
    }

    /**
     * นำเข้า/อัปเดต master ยาจาก HOSxP โดยไม่แก้ไขตาราง HOSxP
     *
     * @return array{imported:int,updated:int,total:int}
     */
    public function importHosxpDrugItems(int $limit = 0): array
    {
        $query = DB::connection('hosxp')->table('drugitems')
            ->orderBy('icode')
            ->select(['icode', 'name', 'strength', 'units', 'drugaccount', 'income', 'istatus']);
        if ($limit > 0) {
            $query->limit($limit);
        }

        $imported = 0;
        $updated = 0;
        $query->chunk(500, function ($rows) use (&$imported, &$updated) {
            foreach ($rows as $row) {
                $icode = trim((string) $row->icode);
                if ($icode === '') {
                    continue;
                }
                $name = trim((string) ($row->name ?? '')) ?: $icode;
                $isNondrug = str_starts_with(trim($name), '(ว)') || (($row->income ?? null) === '05');
                $unit = trim((string) ($row->units ?? '')) ?: 'หน่วย';
                $item = PharmacyItem::query()->where('icode', $icode)->first();
                $values = [
                    'name' => $name,
                    'item_type' => $isNondrug ? 'nondrug' : 'drug',
                    'income_code' => $isNondrug ? '05' : ($row->income ?? null),
                    'strength' => trim((string) ($row->strength ?? '')) ?: null,
                    'unit' => $unit,
                    'base_unit' => $item?->base_unit ?: $unit,
                    'dispense_unit' => $item?->dispense_unit ?: $unit,
                    'drug_group' => trim((string) ($row->drugaccount ?? '')) ?: null,
                    'is_active' => ! isset($row->istatus) || $row->istatus === null || strtoupper((string) $row->istatus) === 'Y' || $isNondrug,
                    'hosxp_synced_at' => now(),
                ];
                if ($item) {
                    $item->update($values);
                    $updated++;
                } else {
                    $item = PharmacyItem::query()->create(['icode' => $icode] + $values);
                    $imported++;
                }
                $this->ensureBaseUnit($item);
            }
        });

        return ['imported' => $imported, 'updated' => $updated, 'total' => $imported + $updated];
    }

    /**
     * นำเข้า/อัปเดต master ค่าเวชภัณฑ์ที่มิใช่ยาจาก HOSxP nondrugitems (income = '05')
     *
     * @return array{imported:int,updated:int,total:int}
     */
    public function importHosxpNondrugItems(int $limit = 0): array
    {
        $query = DB::connection('hosxp')->table('nondrugitems as n')
            ->leftJoin('income as i', 'i.income', '=', 'n.income')
            ->leftJoin('nhso_adp_type as nac', 'nac.nhso_adp_type_id', '=', 'n.nhso_adp_type_id')
            ->where('n.income', '05')
            ->orderBy('n.name')
            ->select([
                'n.icode',
                'n.name',
                'n.unit',
                'n.price',
                'n.istatus',
                'n.income',
                'i.name as income_name',
                'nac.nhso_adp_type_name',
            ]);

        if ($limit > 0) {
            $query->limit($limit);
        }

        $imported = 0;
        $updated = 0;
        $query->chunk(500, function ($rows) use (&$imported, &$updated) {
            foreach ($rows as $row) {
                $icode = trim((string) $row->icode);
                if ($icode === '') {
                    continue;
                }
                $unit = trim((string) ($row->unit ?? '')) ?: 'ชิ้น';
                $item = PharmacyItem::query()->where('icode', $icode)->first();
                $values = [
                    'name' => trim((string) ($row->name ?? '')) ?: $icode,
                    'item_type' => 'nondrug',
                    'income_code' => '05',
                    'strength' => null,
                    'unit' => $unit,
                    'base_unit' => $item?->base_unit ?: $unit,
                    'dispense_unit' => $item?->dispense_unit ?: $unit,
                    'drug_group' => trim((string) ($row->nhso_adp_type_name ?? '')) ?: 'ค่าเวชภัณฑ์ที่มิใช่ยา',
                    'is_active' => true,
                    'hosxp_synced_at' => now(),
                    'meta' => array_merge($item?->meta ?? [], [
                        'income' => '05',
                        'income_name' => $row->income_name ?: 'ค่าเวชภัณฑ์ที่มิใช่ยา',
                        'price' => (float) ($row->price ?? 0),
                        'nhso_adp_type_name' => $row->nhso_adp_type_name,
                    ]),
                ];

                if ($item) {
                    $item->update($values);
                    $updated++;
                } else {
                    $item = PharmacyItem::query()->create(['icode' => $icode] + $values);
                    $imported++;
                }
                $this->ensureBaseUnit($item);
            }
        });

        return ['imported' => $imported, 'updated' => $updated, 'total' => $imported + $updated];
    }

    public function searchHosxpDrugs(string $q, int $limit = 30): array
    {
        $q = trim($q);
        if ($q === '') {
            return [];
        }

        $remoteDrugs = [];
        $remoteNonDrugs = [];

        try {
            $status = $this->hosxp->check(false);
            if ($status['connected'] ?? false) {
                // 1. ค้นหาใน drugitems (เรียงรายการที่เปิดใช้งานมาก่อน)
                $remoteDrugs = DB::connection('hosxp')->table('drugitems')
                    ->where(function ($query) use ($q) {
                        $query->where('icode', 'like', "%{$q}%")
                            ->orWhere('name', 'like', "%{$q}%");
                    })
                    ->orderByRaw("CASE WHEN istatus = 'Y' OR istatus IS NULL THEN 0 ELSE 1 END")
                    ->orderBy('name')
                    ->limit($limit)
                    ->get(['icode', 'name', 'strength', 'units', 'income', 'istatus'])
                    ->map(function ($r) {
                        $isNondrug = str_starts_with(trim((string) $r->name), '(ว)') || ($r->income ?? null) === '05';
                        return [
                            'icode' => (string) $r->icode,
                            'name' => (string) $r->name,
                            'strength' => $r->strength ? (string) $r->strength : null,
                            'unit' => $r->units ? (string) $r->units : null,
                            'item_type' => $isNondrug ? 'nondrug' : 'drug',
                            'income_name' => $isNondrug ? 'ค่าเวชภัณฑ์ที่มิใช่ยา' : null,
                        ];
                    })
                    ->all();

                // 2. ค้นหาใน nondrugitems (income = '05' ค่าเวชภัณฑ์ที่มิใช่ยา - ไม่ตัดสิทธิ์ istatus N เพราะ 72% เป็นรหัสเวชภัณฑ์คลัง)
                $remoteNonDrugs = DB::connection('hosxp')->table('nondrugitems as n')
                    ->leftJoin('income as i', 'i.income', '=', 'n.income')
                    ->where('n.income', '05')
                    ->where(function ($query) use ($q) {
                        $query->where('n.icode', 'like', "%{$q}%")
                            ->orWhere('n.name', 'like', "%{$q}%");
                    })
                    ->orderByRaw("CASE WHEN n.istatus = 'Y' OR n.istatus IS NULL THEN 0 ELSE 1 END")
                    ->orderBy('n.name')
                    ->limit($limit)
                    ->get(['n.icode', 'n.name', 'n.unit', 'i.name as income_name', 'n.istatus'])
                    ->map(fn ($r) => [
                        'icode' => (string) $r->icode,
                        'name' => (string) $r->name,
                        'strength' => null,
                        'unit' => $r->unit ? (string) $r->unit : 'ชิ้น',
                        'item_type' => 'nondrug',
                        'income_name' => $r->income_name ?: 'ค่าเวชภัณฑ์ที่มิใช่ยา',
                    ])
                    ->all();
            }
        } catch (\Throwable) {}

        // 3. ค้นหาในรายการยาและเวชภัณฑ์ท้องถิ่น (ค้นหาทั้ง icode, ชื่อ, บาร์โค้ด)
        $local = PharmacyItem::query()->with('units')
            ->where(function ($query) use ($q) {
                $query->where('icode', 'like', "%{$q}%")
                    ->orWhere('name', 'like', "%{$q}%")
                    ->orWhere('barcode', $q)
                    ->orWhereHas('units', fn ($u) => $u->where('barcode', $q))
                    ->orWhereHas('barcodes', fn ($b) => $b->where('barcode', $q)->where('is_active', true));
            })
            ->limit($limit)
            ->get()
            ->map(function (PharmacyItem $i) {
                $isNondrug = $i->item_type === 'nondrug' || str_starts_with(trim($i->name), '(ว)');
                return [
                    'icode' => $i->icode,
                    'name' => $i->name,
                    'strength' => $i->strength,
                    'unit' => $i->unit,
                    'item_type' => $isNondrug ? 'nondrug' : 'drug',
                    'income_name' => $isNondrug ? 'ค่าเวชภัณฑ์ที่มิใช่ยา' : null,
                    'base_unit' => $i->baseUnitName(),
                    'units' => $i->units->map(fn ($u) => [
                        'id' => $u->id, 'name' => $u->name,
                        'factor_to_base' => (float) $u->factor_to_base,
                    ])->all(),
                ];
            })
            ->all();

        return collect($remoteDrugs)
            ->concat($remoteNonDrugs)
            ->concat($local)
            ->unique('icode')
            ->values()
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
     *   unit_id?: int|null,
     *   received_at: string,
     *   expires_at?: ?string,
     *   supplier?: ?string,
     *   invoice_no?: ?string,
     *   invoice_date?: ?string,
     *   invoice_unit_price?: float|int|string|null,
     *   invoice_total_price?: float|int|string|null,
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
            $packageQty = round((float) $data['qty'], 2);
            if ($packageQty <= 0) {
                throw new RuntimeException('จำนวนรับเข้าต้องมากกว่า 0');
            }
            if (! empty($data['packaging_chain']) && is_array($data['packaging_chain'])) {
                $unit = app(PharmacyUnitService::class)->ensureHierarchy($item, $data['packaging_chain'], 'receive');
            } else {
                $unit = $this->resolveUnit($item, isset($data['unit_id']) ? (int) $data['unit_id'] : null, 'receive');
            }
            $factor = (float) $unit->factor_to_base;
            $qty = round($packageQty * $factor, 2);
            $unitPrice = isset($data['invoice_unit_price']) && $data['invoice_unit_price'] !== ''
                ? round((float) $data['invoice_unit_price'], 4)
                : null;
            $totalPrice = isset($data['invoice_total_price']) && $data['invoice_total_price'] !== ''
                ? round((float) $data['invoice_total_price'], 2)
                : ($unitPrice !== null ? round($packageQty * $unitPrice, 2) : null);

            $lot = PharmacyLot::query()->create([
                'item_id' => $item->id,
                'location_id' => $location->id,
                'received_unit_id' => $unit->id,
                'received_package_qty' => $packageQty,
                'unit_factor' => $factor,
                'lot_no' => trim((string) $data['lot_no']),
                'received_at' => $data['received_at'],
                'expires_at' => $data['expires_at'] ?? null,
                'qty_received' => $qty,
                'qty_remaining' => $qty,
                'supplier' => $data['supplier'] ?? null,
                'invoice_no' => $data['invoice_no'] ?? null,
                'invoice_date' => $data['invoice_date'] ?? null,
                'invoice_unit_price' => $unitPrice,
                'invoice_total_price' => $totalPrice,
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
                'transaction_unit_id' => $unit->id,
                'transaction_qty' => $packageQty,
                'unit_factor' => $factor,
                'from_location_id' => null,
                'to_location_id' => $location->id,
                'qty' => $qty,
                'balance_after' => $after,
                'reference_type' => 'manual',
                'reference_id' => (string) $lot->id,
                'user_id' => Auth::id(),
                'note' => "รับเข้า {$packageQty} {$unit->name} = {$qty} {$item->baseUnitName()} · lot {$lot->lot_no}",
            ]);

            return $lot->load(['item', 'location']);
        });
    }

    /**
     * เบิกจากคลัง → ห้องยา (FEFO ตามวันหมดอายุ)
     */
    public function transfer(
        int $fromLocationId,
        int $toLocationId,
        string $icode,
        float $transactionQty,
        ?int $unitId = null,
        ?string $note = null,
        ?array $packagingChain = null,
    ): array {
        if ($fromLocationId === $toLocationId) {
            throw new RuntimeException('ต้นทางและปลายทางต้องต่างกัน');
        }
        if ($transactionQty <= 0) {
            throw new RuntimeException('จำนวนเบิกต้องมากกว่า 0');
        }

        return DB::transaction(function () use ($fromLocationId, $toLocationId, $icode, $transactionQty, $unitId, $note, $packagingChain) {
            $from = PharmacyLocation::query()->lockForUpdate()->findOrFail($fromLocationId);
            $to = PharmacyLocation::query()->lockForUpdate()->findOrFail($toLocationId);
            $item = $this->resolveItemFromHosxp($icode);
            if (! empty($packagingChain)) {
                $unit = app(PharmacyUnitService::class)->ensureHierarchy($item, $packagingChain, 'transfer');
            } else {
                $unit = $this->resolveUnit($item, $unitId, 'transfer');
            }
            $factor = (float) $unit->factor_to_base;
            $qty = round($transactionQty * $factor, 2);

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
                    'invoice_date' => $lot->invoice_date?->toDateString(),
                    'invoice_unit_price' => $lot->invoice_unit_price,
                    'invoice_total_price' => $lot->invoice_total_price !== null
                        ? round((float) $lot->invoice_total_price * ($take / max((float) $lot->qty_received, 0.0001)), 2)
                        : null,
                    'qr_token' => Str::lower((string) Str::ulid()),
                    'status' => 'active',
                    'received_by' => Auth::id(),
                    'notes' => 'โอนจาก '.$from->code.' lot #'.$lot->id,
                ]);

                PharmacyStockMovement::query()->create([
                    'type' => 'transfer_out',
                    'item_id' => $item->id,
                    'lot_id' => $lot->id,
                    'transaction_unit_id' => $unit->id,
                    'transaction_qty' => round($take / $factor, 2),
                    'unit_factor' => $factor,
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
                    'transaction_unit_id' => $unit->id,
                    'transaction_qty' => round($take / $factor, 2),
                    'unit_factor' => $factor,
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
                'transaction_qty' => $transactionQty,
                'unit' => $unit,
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
        ?int $unitId = null,
    ): PharmacyStockMovement {
        if ($qty <= 0) {
            throw new RuntimeException('จำนวนจ่ายต้องมากกว่า 0');
        }

        return DB::transaction(function () use ($pharmacyLocationId, $icode, $qty, $hn, $vn, $vstdate, $referenceId, $unitId) {
            $location = PharmacyLocation::query()->lockForUpdate()->findOrFail($pharmacyLocationId);
            $item = PharmacyItem::query()->where('icode', $icode)->first()
                ?? $this->resolveItemFromHosxp($icode);

            $unit = $this->resolveUnit($item, $unitId, 'dispense');
            $transactionQty = $qty;
            $qty = round($transactionQty * (float) $unit->factor_to_base, 2);

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
                'transaction_unit_id' => $unit->id,
                'transaction_qty' => $transactionQty,
                'unit_factor' => (float) $unit->factor_to_base,
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

    public function issueFromPharmacy(
        int $pharmacyLocationId,
        string $icode,
        float $qty,
        string $reason = 'department',
        ?string $referenceId = null,
        ?string $recipient = null,
        ?int $unitId = null,
        ?string $note = null,
    ): PharmacyStockMovement {
        if ($qty <= 0) {
            throw new RuntimeException('จำนวนตัดยาต้องมากกว่า 0');
        }

        return DB::transaction(function () use ($pharmacyLocationId, $icode, $qty, $reason, $referenceId, $recipient, $unitId, $note) {
            $location = PharmacyLocation::query()->lockForUpdate()->findOrFail($pharmacyLocationId);
            $item = PharmacyItem::query()->where('icode', $icode)->first()
                ?? $this->resolveItemFromHosxp($icode);

            $unit = $this->resolveUnit($item, $unitId, 'dispense');
            $transactionQty = $qty;
            $qty = round($transactionQty * (float) $unit->factor_to_base, 2);

            $balance = $this->lockBalance($location->id, $item->id);
            if ((float) $balance->qty_on_hand < $qty) {
                throw new RuntimeException('สต็อกห้องยาไม่พอสำหรับ '.$item->name.' (คงเหลือ '.$balance->qty_on_hand.' '.$item->baseUnitName().')');
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
                $this->syncBalanceToLots($location->id, $item->id, max(0, (float) $balance->qty_on_hand - $qty));
            }

            $balance->qty_on_hand = (float) $balance->qty_on_hand - $qty;
            $balance->save();

            $reasonLabels = [
                'department' => 'เบิกจ่ายให้หน่วยงาน/หอผู้ป่วย',
                'patient' => 'จ่ายยาผู้ป่วย',
                'damaged' => 'ตัดยาชำรุด/แตกหัก/เสียหาย',
                'expired' => 'ตัดยาหมดอายุ/ส่งทำลาย',
                'borrow' => 'ยืมระหว่างหน่วยงาน/รพ.',
                'other' => 'ตัดยาออก (อื่นๆ)',
            ];
            $reasonText = $reasonLabels[$reason] ?? 'ตัดยาออก';
            $fullNote = $reasonText . ($recipient ? " [{$recipient}]" : '') . ($note ? " · {$note}" : '');

            return PharmacyStockMovement::query()->create([
                'type' => 'dispense',
                'item_id' => $item->id,
                'lot_id' => $lastLotId,
                'transaction_unit_id' => $unit->id,
                'transaction_qty' => $transactionQty,
                'unit_factor' => (float) $unit->factor_to_base,
                'from_location_id' => $location->id,
                'to_location_id' => null,
                'qty' => $qty,
                'balance_after' => (float) $balance->qty_on_hand,
                'reference_type' => $reason,
                'reference_id' => $referenceId,
                'user_id' => Auth::id(),
                'note' => $fullNote,
            ]);
        });
    }

    public function returnToPharmacy(
        int $pharmacyLocationId,
        string $icode,
        float $qty,
        string $reason = 'patient_return',
        ?string $referenceId = null,
        ?string $source = null,
        ?int $unitId = null,
        ?string $expiresAt = null,
        ?string $note = null,
        ?int $lotId = null,
    ): PharmacyStockMovement {
        if ($qty <= 0) {
            throw new RuntimeException('จำนวนคืนยาต้องมากกว่า 0');
        }

        return DB::transaction(function () use ($pharmacyLocationId, $icode, $qty, $reason, $referenceId, $source, $unitId, $expiresAt, $note, $lotId) {
            $location = PharmacyLocation::query()->lockForUpdate()->findOrFail($pharmacyLocationId);
            $item = PharmacyItem::query()->where('icode', $icode)->first()
                ?? $this->resolveItemFromHosxp($icode);

            $unit = $this->resolveUnit($item, $unitId, 'dispense');
            $transactionQty = $qty;
            $qty = round($transactionQty * (float) $unit->factor_to_base, 2);

            $balance = $this->lockBalance($location->id, $item->id);
            $balance->qty_on_hand = (float) $balance->qty_on_hand + $qty;
            $balance->save();

            $targetLot = null;
            if ($lotId) {
                $targetLot = PharmacyLot::query()
                    ->where('id', $lotId)
                    ->where('item_id', $item->id)
                    ->lockForUpdate()
                    ->first();
            }

            if (! $targetLot && $expiresAt) {
                $targetLot = PharmacyLot::query()
                    ->where('item_id', $item->id)
                    ->where('location_id', $location->id)
                    ->whereDate('expires_at', $expiresAt)
                    ->lockForUpdate()
                    ->first();
            }

            if (! $targetLot) {
                $targetLot = PharmacyLot::query()
                    ->where('item_id', $item->id)
                    ->where('location_id', $location->id)
                    ->where('status', 'active')
                    ->orderByDesc('id')
                    ->lockForUpdate()
                    ->first();
            }

            if ($targetLot) {
                $targetLot->qty_remaining = (float) $targetLot->qty_remaining + $qty;
                if ($targetLot->status === 'depleted') {
                    $targetLot->status = 'active';
                }
                $targetLot->save();
            } else {
                $targetLot = PharmacyLot::query()->create([
                    'item_id' => $item->id,
                    'location_id' => $location->id,
                    'lot_no' => 'RET-' . now()->format('ymd-His'),
                    'received_at' => now()->toDateString(),
                    'expires_at' => $expiresAt ?: now()->addYear()->toDateString(),
                    'qty_received' => $qty,
                    'qty_remaining' => $qty,
                    'received_package_qty' => $transactionQty,
                    'received_unit_id' => $unit->id,
                    'unit_factor' => (float) $unit->factor_to_base,
                    'qr_token' => \Illuminate\Support\Str::lower((string) \Illuminate\Support\Str::ulid()),
                    'status' => 'active',
                    'received_by' => Auth::id(),
                    'notes' => 'รับคืนเข้าห้องยา: ' . ($source ?: 'ผู้ป่วย/แผนก'),
                ]);
            }

            $reasonLabels = [
                'patient_return' => 'ผู้ป่วยนำยามาคืน',
                'department_return' => 'หน่วยงาน/หอผู้ป่วย คืนยา',
                'order_cancel' => 'ยกเลิกใบสั่งยา/สั่งผิด',
                'other_return' => 'รับคืนยา (อื่นๆ)',
            ];
            $reasonText = $reasonLabels[$reason] ?? 'รับคืนยา';
            $fullNote = $reasonText . ($source ? " [{$source}]" : '') . ($note ? " · {$note}" : '');

            return PharmacyStockMovement::query()->create([
                'type' => 'return',
                'item_id' => $item->id,
                'lot_id' => $targetLot->id,
                'transaction_unit_id' => $unit->id,
                'transaction_qty' => $transactionQty,
                'unit_factor' => (float) $unit->factor_to_base,
                'from_location_id' => null,
                'to_location_id' => $location->id,
                'qty' => $qty,
                'balance_after' => (float) $balance->qty_on_hand,
                'reference_type' => $reason,
                'reference_id' => $referenceId,
                'user_id' => Auth::id(),
                'note' => $fullNote,
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
            ->whereExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('pharmacy_stock_balances')
                    ->whereColumn('pharmacy_stock_balances.item_id', 'pharmacy_lots.item_id')
                    ->whereColumn('pharmacy_stock_balances.location_id', 'pharmacy_lots.location_id')
                    ->where('pharmacy_stock_balances.qty_on_hand', '>', 0);
            })
            ->orderBy('expires_at')
            ->limit(30)
            ->get();

        $activeLotsCount = PharmacyLot::query()
            ->where('status', 'active')
            ->where('qty_remaining', '>', 0)
            ->whereExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('pharmacy_stock_balances')
                    ->whereColumn('pharmacy_stock_balances.item_id', 'pharmacy_lots.item_id')
                    ->whereColumn('pharmacy_stock_balances.location_id', 'pharmacy_lots.location_id')
                    ->where('pharmacy_stock_balances.qty_on_hand', '>', 0);
            })
            ->count();

        return [
            'locations' => $locations,
            'totals' => [
                'items' => PharmacyItem::query()->count(),
                'lots_active' => $activeLotsCount,
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

    /**
     * ปรับยอด Lot ยาให้สอดคล้องกับยอดคงเหลือใหม่ (FEFO)
     */
    public function syncBalanceToLots(int $locationId, int $itemId, float $newQty): void
    {
        $newQty = round(max(0, $newQty), 2);

        $activeLots = PharmacyLot::query()
            ->where('location_id', $locationId)
            ->where('item_id', $itemId)
            ->where('status', 'active')
            ->where('qty_remaining', '>', 0)
            ->orderByRaw('CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END')
            ->orderBy('expires_at')
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        if ($newQty <= 0.0001) {
            foreach ($activeLots as $lot) {
                $lot->update([
                    'qty_remaining' => 0,
                    'status' => 'closed',
                ]);
            }
            return;
        }

        $currentTotal = round((float) $activeLots->sum('qty_remaining'), 2);

        if ($currentTotal > $newQty) {
            $toDeduct = round($currentTotal - $newQty, 2);
            $reversedLots = $activeLots->sortByDesc('id');
            foreach ($reversedLots as $lot) {
                if ($toDeduct <= 0) break;
                $rem = (float) $lot->qty_remaining;
                $take = min($rem, $toDeduct);
                $remAfter = round($rem - $take, 2);
                $lot->update([
                    'qty_remaining' => $remAfter,
                    'status' => $remAfter <= 0.0001 ? 'depleted' : 'active',
                ]);
                $toDeduct = round($toDeduct - $take, 2);
            }
        } elseif ($currentTotal < $newQty) {
            $diff = round($newQty - $currentTotal, 2);
            if ($activeLots->isNotEmpty()) {
                $latest = $activeLots->sortByDesc('id')->first();
                $latest->update([
                    'qty_remaining' => round((float) $latest->qty_remaining + $diff, 2),
                ]);
            } else {
                PharmacyLot::query()->create([
                    'item_id' => $itemId,
                    'location_id' => $locationId,
                    'lot_no' => 'ADJ-' . now('Asia/Bangkok')->format('ymd'),
                    'received_at' => now('Asia/Bangkok')->toDateString(),
                    'expires_at' => null,
                    'qty_received' => $diff,
                    'qty_remaining' => $diff,
                    'qr_token' => Str::lower((string) Str::ulid()),
                    'status' => 'active',
                    'received_by' => Auth::id(),
                    'notes' => 'Lot ปรับยอดคงเหลืออัตโนมัติ',
                ]);
            }
        }
    }

    /**
     * ซิงก์และตรวจสอบความถูกต้องระหว่างตารางคงเหลือ (pharmacy_stock_balances)
     * และประวัติ Lot (pharmacy_lots)
     *
     * @return array{closed_lots:int,synced_balances:int,fixed_discrepancies:int}
     */
    public function reconcileStockAndLots(?int $locationId = null): array
    {
        return DB::transaction(function () use ($locationId) {
            $closedLots = 0;
            $syncedBalances = 0;
            $fixedDiscrepancies = 0;

            // 1. ปิด Lot ที่ตกค้าง: หาก item ใน location นั้นไม่มี stock balance หรือ qty_on_hand <= 0
            $query = PharmacyLot::query()
                ->where('status', 'active')
                ->where('qty_remaining', '>', 0);

            if ($locationId) {
                $query->where('location_id', $locationId);
            }

            $activeLots = $query->lockForUpdate()->get();

            foreach ($activeLots as $lot) {
                $balance = PharmacyStockBalance::query()
                    ->where('location_id', $lot->location_id)
                    ->where('item_id', $lot->item_id)
                    ->first();

                if (! $balance || (float) $balance->qty_on_hand <= 0.0001) {
                    $lot->update([
                        'status' => 'closed',
                        'qty_remaining' => 0,
                    ]);
                    $closedLots++;
                }
            }

            // 2. ตรวจสอบทุก balance ที่ qty_on_hand > 0: คำนวณผลรวม active lots
            $balanceQuery = PharmacyStockBalance::query()->where('qty_on_hand', '>', 0);
            if ($locationId) {
                $balanceQuery->where('location_id', $locationId);
            }
            $balances = $balanceQuery->lockForUpdate()->get();

            foreach ($balances as $b) {
                $lotsSum = (float) PharmacyLot::query()
                    ->where('location_id', $b->location_id)
                    ->where('item_id', $b->item_id)
                    ->where('status', 'active')
                    ->where('qty_remaining', '>', 0)
                    ->sum('qty_remaining');

                if (abs($lotsSum - (float) $b->qty_on_hand) > 0.0001) {
                    if ($lotsSum > 0) {
                        $b->update(['qty_on_hand' => $lotsSum]);
                        $fixedDiscrepancies++;
                    } else {
                        PharmacyLot::query()->create([
                            'item_id' => $b->item_id,
                            'location_id' => $b->location_id,
                            'lot_no' => 'INIT-' . now('Asia/Bangkok')->format('ymd'),
                            'received_at' => now('Asia/Bangkok')->toDateString(),
                            'expires_at' => null,
                            'qty_received' => (float) $b->qty_on_hand,
                            'qty_remaining' => (float) $b->qty_on_hand,
                            'qr_token' => Str::lower((string) Str::ulid()),
                            'status' => 'active',
                            'received_by' => Auth::id(),
                            'notes' => 'Lot ปรับยอดสอดคล้องอัตโนมัติ (Reconciled)',
                        ]);
                        $syncedBalances++;
                    }
                }
            }

            return [
                'closed_lots' => $closedLots,
                'synced_balances' => $syncedBalances,
                'fixed_discrepancies' => $fixedDiscrepancies,
            ];
        });
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

    private function ensureBaseUnit(PharmacyItem $item): PharmacyItemUnit
    {
        $name = $item->baseUnitName();

        return PharmacyItemUnit::query()->firstOrCreate(
            ['item_id' => $item->id, 'name' => $name],
            [
                'factor_to_base' => 1,
                'usage_context' => 'all',
                'is_default_receive' => true,
                'is_default_transfer' => true,
                'is_default_dispense' => true,
                'is_active' => true,
            ],
        );
    }

    private function resolveUnit(PharmacyItem $item, ?int $unitId, string $context): PharmacyItemUnit
    {
        $this->ensureBaseUnit($item);
        $query = $item->units()->where('is_active', true);
        if ($unitId) {
            return (clone $query)->whereKey($unitId)->firstOrFail();
        }

        $flag = match ($context) {
            'receive' => 'is_default_receive',
            'transfer' => 'is_default_transfer',
            'dispense' => 'is_default_dispense',
            default => null,
        };

        return ($flag ? (clone $query)->where($flag, true)->first() : null)
            ?? (clone $query)->where('factor_to_base', 1)->first()
            ?? $this->ensureBaseUnit($item);
    }
}
