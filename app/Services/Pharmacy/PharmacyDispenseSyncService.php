<?php

namespace App\Services\Pharmacy;

use App\Models\Pharmacy\PharmacyDispenseSync;
use App\Models\Pharmacy\PharmacyItem;
use App\Models\Pharmacy\PharmacyLocation;
use App\Models\Pharmacy\PharmacyLot;
use App\Models\Pharmacy\PharmacyStockBalance;
use App\Models\Pharmacy\PharmacyStockMovement;
use App\Services\HosxpConnectionService;
use App\Support\PiiMask;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class PharmacyDispenseSyncService
{
    public function __construct(
        private readonly HosxpConnectionService $hosxp,
        private readonly PharmacyInventoryService $inventory,
    ) {}

    /**
     * ดึงใบสั่งจาก HOSxP แล้วตัดสต็อกห้องยา (OPD + IPD รวมกันตามคำขอ)
     *
     * @return array{ok:bool,message:string,scanned:int,deducted:int,skipped:int,insufficient:int}
     */
    public function sync(?string $date = null, ?int $pharmacyLocationId = null, ?string $catalog = null): array
    {
        if ($catalog === null) {
            $drug = $this->sync($date, null, 'drug');
            $supply = $this->sync($date, null, 'nondrug');

            return [
                'ok' => ($drug['ok'] ?? false) && ($supply['ok'] ?? false),
                'message' => 'ยา: '.($drug['message'] ?? '').' | เวชภัณฑ์: '.($supply['message'] ?? ''),
                'scanned' => (int) ($drug['scanned'] ?? 0) + (int) ($supply['scanned'] ?? 0),
                'deducted' => (int) ($drug['deducted'] ?? 0) + (int) ($supply['deducted'] ?? 0),
                'skipped' => (int) ($drug['skipped'] ?? 0) + (int) ($supply['skipped'] ?? 0),
                'insufficient' => (int) ($drug['insufficient'] ?? 0) + (int) ($supply['insufficient'] ?? 0),
            ];
        }

        $catalog = $this->inventory->normalizeCatalog($catalog);
        $this->inventory->ensureDefaultLocations();
        $date = $date ?: now('Asia/Bangkok')->toDateString();
        $label = $catalog === 'nondrug' ? 'จุดจ่ายเวชภัณฑ์' : 'ห้องยา OPD';

        $pharmacy = $pharmacyLocationId
            ? PharmacyLocation::query()->where('type', 'pharmacy')->where('catalog', $catalog)->find($pharmacyLocationId)
            : $this->inventory->defaultDispenseLocation($catalog);

        if (! $pharmacy) {
            return [
                'ok' => false,
                'message' => "ยังไม่มีตำแหน่ง{$label}",
                'scanned' => 0,
                'deducted' => 0,
                'skipped' => 0,
                'insufficient' => 0,
            ];
        }

        $status = $this->hosxp->check(false);
        if (! ($status['connected'] ?? false)) {
            return [
                'ok' => false,
                'message' => (string) ($status['message'] ?? 'เชื่อมต่อ HOSxP ไม่ได้'),
                'scanned' => 0,
                'deducted' => 0,
                'skipped' => 0,
                'insufficient' => 0,
            ];
        }

        $trackedIcodes = PharmacyItem::query()->ofCatalog($catalog)->pluck('icode')->filter()->values()->all();
        if ($trackedIcodes === []) {
            $emptyLabel = $catalog === 'nondrug' ? 'เวชภัณฑ์' : 'ยา';

            return [
                'ok' => true,
                'message' => "ยังไม่มีรายการ{$emptyLabel}ในคลังแอป — รับเข้าก่อนจึงจะตัดจ่ายได้",
                'scanned' => 0,
                'deducted' => 0,
                'skipped' => 0,
                'insufficient' => 0,
            ];
        }

        try {
            // OPD + IPD รวมกัน (ไม่กรอง oi.an)
            $rows = DB::connection('hosxp')->table('opitemrece as oi')
                ->leftJoin('patient as pt', 'pt.hn', '=', 'oi.hn')
                ->whereIn('oi.icode', $trackedIcodes)
                ->whereDate('oi.vstdate', $date)
                ->whereNotNull('oi.qty')
                ->orderBy('oi.vn')
                ->limit(3000)
                ->get([
                    'oi.hn', 'oi.vn', 'oi.an', 'oi.icode', 'oi.qty', 'oi.vstdate',
                    'pt.pname', 'pt.fname', 'pt.lname',
                ]);
        } catch (Throwable $e) {
            Log::warning('Pharmacy dispense sync HOSxP failed: '.$e->getMessage());

            return [
                'ok' => false,
                'message' => 'ดึงใบสั่งไม่สำเร็จ: '.$e->getMessage(),
                'scanned' => 0,
                'deducted' => 0,
                'skipped' => 0,
                'insufficient' => 0,
            ];
        }

        $deducted = 0;
        $skipped = 0;
        $insufficient = 0;

        foreach ($rows as $row) {
            $qty = (float) $row->qty;
            if ($qty <= 0) {
                continue;
            }
            $visitId = (string) ($row->vn ?: $row->an ?: 'visit');
            $key = implode('|', [
                (string) $row->hn,
                $visitId,
                (string) $row->icode,
                (string) $row->vstdate,
                rtrim(rtrim(number_format($qty, 2, '.', ''), '0'), '.'),
            ]);

            // ตรวจสอบว่าเคยตัดจ่าย หรือเคยยกเลิก หรือเคยย้อนคืนแล้วหรือไม่
            $existing = PharmacyDispenseSync::query()->where('hosxp_key', $key)->first();
            if ($existing) {
                if (in_array($existing->status, ['deducted', 'cancelled', 'reversed'], true)) {
                    $skipped++;
                    continue;
                }
            }

            $patientName = PiiMask::name($row->pname, $row->fname, $row->lname) ?: 'ผู้ป่วย';

            try {
                $movement = $this->inventory->dispenseFromPharmacy(
                    (int) $pharmacy->id,
                    (string) $row->icode,
                    $qty,
                    (string) $row->hn,
                    (string) ($row->vn ?: $row->an),
                    (string) $row->vstdate,
                    $key,
                );

                PharmacyDispenseSync::query()->updateOrCreate(
                    ['hosxp_key' => $key],
                    [
                        'hn' => (string) $row->hn,
                        'vn' => (string) ($row->vn ?? ''),
                        'an' => (string) ($row->an ?? ''),
                        'patient_name' => $patientName,
                        'icode' => (string) $row->icode,
                        'vstdate' => (string) $row->vstdate,
                        'qty' => $qty,
                        'status' => 'deducted',
                        'movement_id' => $movement->id,
                        'message' => null,
                    ]
                );
                $deducted++;
            } catch (Throwable $e) {
                // สต็อกไม่พอ -> บันทึกเป็นสถานะยาค้างจ่าย (insufficient)
                PharmacyDispenseSync::query()->updateOrCreate(
                    ['hosxp_key' => $key],
                    [
                        'hn' => (string) $row->hn,
                        'vn' => (string) ($row->vn ?? ''),
                        'an' => (string) ($row->an ?? ''),
                        'patient_name' => $patientName,
                        'icode' => (string) $row->icode,
                        'vstdate' => (string) $row->vstdate,
                        'qty' => $qty,
                        'status' => 'insufficient',
                        'movement_id' => null,
                        'message' => $e->getMessage(),
                    ]
                );
                $insufficient++;
            }
        }

        return [
            'ok' => true,
            'message' => "{$label} สแกน {$rows->count()} · ตัดได้ {$deducted} · ข้าม {$skipped} · สต็อกไม่พอ/ค้างจ่าย {$insufficient}",
            'scanned' => $rows->count(),
            'deducted' => $deducted,
            'skipped' => $skipped,
            'insufficient' => $insufficient,
        ];
    }

    /**
     * จำลองการตัดจ่าย (Dry Run / Preview) โดยยังไม่ตัดสต็อกจริง
     *
     * @return array{ok:bool,message:string,stats:array,items:list<array>}
     */
    public function preview(string $startDate, string $endDate, ?int $pharmacyLocationId = null, ?string $catalog = 'drug'): array
    {
        $catalog = $this->inventory->normalizeCatalog($catalog);
        $this->inventory->ensureDefaultLocations();
        $label = $catalog === 'nondrug' ? 'จุดจ่ายเวชภัณฑ์' : 'ห้องยา OPD';

        $pharmacy = $pharmacyLocationId
            ? PharmacyLocation::query()->where('type', 'pharmacy')->where('catalog', $catalog)->find($pharmacyLocationId)
            : $this->inventory->defaultDispenseLocation($catalog);

        if (! $pharmacy) {
            return ['ok' => false, 'message' => "ไม่พบตำแหน่ง{$label}", 'items' => [], 'stats' => []];
        }

        $trackedItems = PharmacyItem::query()->ofCatalog($catalog)->get()->keyBy('icode');
        $trackedIcodes = $trackedItems->keys()->all();
        if ($trackedIcodes === []) {
            return ['ok' => false, 'message' => 'ยังไม่มีรายการยา/เวชภัณฑ์ในระบบคลัง', 'items' => [], 'stats' => []];
        }

        $status = $this->hosxp->check(false);
        if (! ($status['connected'] ?? false)) {
            return ['ok' => false, 'message' => 'เชื่อมต่อ HOSxP ไม่ได้', 'items' => [], 'stats' => []];
        }

        try {
            // ดึงทั้ง OPD และ IPD จาก HOSxP
            $rows = DB::connection('hosxp')->table('opitemrece as oi')
                ->leftJoin('patient as pt', 'pt.hn', '=', 'oi.hn')
                ->whereIn('oi.icode', $trackedIcodes)
                ->whereBetween('oi.vstdate', [$startDate, $endDate])
                ->whereNotNull('oi.qty')
                ->orderBy('oi.vstdate')
                ->orderBy('oi.vn')
                ->limit(4000)
                ->get([
                    'oi.hn', 'oi.vn', 'oi.an', 'oi.icode', 'oi.qty', 'oi.vstdate',
                    'pt.pname', 'pt.fname', 'pt.lname',
                ]);
        } catch (Throwable $e) {
            return ['ok' => false, 'message' => 'ดึงข้อมูล HOSxP ไม่สำเร็จ: '.$e->getMessage(), 'items' => [], 'stats' => []];
        }

        $existingSyncs = PharmacyDispenseSync::query()
            ->whereIn('icode', $trackedIcodes)
            ->whereBetween('vstdate', [$startDate, $endDate])
            ->get()
            ->keyBy('hosxp_key');

        $balances = PharmacyStockBalance::query()
            ->where('location_id', $pharmacy->id)
            ->whereIn('item_id', $trackedItems->pluck('id'))
            ->pluck('qty_on_hand', 'item_id')
            ->all();

        $simulatedBalances = [];
        foreach ($trackedItems as $icode => $item) {
            $simulatedBalances[$icode] = (float) ($balances[$item->id] ?? 0);
        }

        $items = [];
        $totalOrders = 0;
        $alreadyDeducted = 0;
        $readyToDeduct = 0;
        $insufficientCount = 0;
        $cancelledCount = 0;
        $reversedCount = 0;

        foreach ($rows as $row) {
            $qty = (float) $row->qty;
            if ($qty <= 0) {
                continue;
            }
            $totalOrders++;
            $visitId = (string) ($row->vn ?: $row->an ?: 'visit');
            $key = implode('|', [
                (string) $row->hn,
                $visitId,
                (string) $row->icode,
                (string) $row->vstdate,
                rtrim(rtrim(number_format($qty, 2, '.', ''), '0'), '.'),
            ]);

            $item = $trackedItems->get((string) $row->icode);
            $patientName = PiiMask::name($row->pname, $row->fname, $row->lname) ?: 'ผู้ป่วย';
            $visitType = ! empty($row->an) ? 'IPD' : 'OPD';

            $existing = $existingSyncs->get($key);
            $currentStock = (float) ($balances[$item?->id] ?? 0);
            $simRemaining = $simulatedBalances[(string) $row->icode] ?? 0;

            $previewStatus = 'ready_to_deduct';
            $deficit = 0.0;

            if ($existing) {
                if ($existing->status === 'deducted') {
                    $previewStatus = 'already_deducted';
                    $alreadyDeducted++;
                } elseif ($existing->status === 'cancelled') {
                    $previewStatus = 'cancelled';
                    $cancelledCount++;
                } elseif ($existing->status === 'reversed') {
                    $previewStatus = 'reversed';
                    $reversedCount++;
                } else {
                    if ($simRemaining >= $qty) {
                        $previewStatus = 'ready_to_deduct';
                        $simulatedBalances[(string) $row->icode] -= $qty;
                        $readyToDeduct++;
                    } else {
                        $previewStatus = 'insufficient';
                        $deficit = round($qty - max(0, $simRemaining), 2);
                        $insufficientCount++;
                    }
                }
            } else {
                if ($simRemaining >= $qty) {
                    $previewStatus = 'ready_to_deduct';
                    $simulatedBalances[(string) $row->icode] -= $qty;
                    $readyToDeduct++;
                } else {
                    $previewStatus = 'insufficient';
                    $deficit = round($qty - max(0, $simRemaining), 2);
                    $insufficientCount++;
                }
            }

            $items[] = [
                'key' => $key,
                'sync_id' => $existing?->id,
                'hn' => (string) $row->hn,
                'vn' => (string) ($row->vn ?? ''),
                'an' => (string) ($row->an ?? ''),
                'visit_type' => $visitType,
                'patient_name' => $patientName,
                'vstdate' => (string) $row->vstdate,
                'icode' => (string) $row->icode,
                'item_name' => $item?->name ?: (string) $row->icode,
                'strength' => $item?->strength,
                'unit' => $item?->unit ?: 'หน่วย',
                'qty' => $qty,
                'current_stock' => $currentStock,
                'simulated_remaining' => max(0, round($simRemaining - $qty, 2)),
                'preview_status' => $previewStatus,
                'deficit' => $deficit,
            ];
        }

        // จัดกลุ่มสรุปตามรายชื่อยา (Group by Drug)
        $grouped = [];
        foreach ($items as $it) {
            $code = $it['icode'];
            if (! isset($grouped[$code])) {
                $grouped[$code] = [
                    'icode' => $code,
                    'item_name' => $it['item_name'],
                    'strength' => $it['strength'],
                    'unit' => $it['unit'],
                    'current_stock' => $it['current_stock'],
                    'total_ordered' => 0.0,
                    'can_deduct_qty' => 0.0,
                    'deficit_qty' => 0.0,
                    'status' => 'full',
                    'orders_count' => 0,
                    'orders' => [],
                ];
            }
            $grouped[$code]['total_ordered'] += (float) $it['qty'];
            $grouped[$code]['orders_count']++;
            $grouped[$code]['orders'][] = [
                'key' => $it['key'],
                'hn' => $it['hn'],
                'vn' => $it['vn'],
                'an' => $it['an'],
                'visit_type' => $it['visit_type'],
                'patient_name' => $it['patient_name'],
                'qty' => $it['qty'],
                'vstdate' => $it['vstdate'],
                'preview_status' => $it['preview_status'],
            ];
        }

        foreach ($grouped as $code => &$g) {
            $g['total_ordered'] = round($g['total_ordered'], 2);
            $stock = $g['current_stock'];
            $ordered = $g['total_ordered'];

            if ($stock >= $ordered) {
                $g['can_deduct_qty'] = $ordered;
                $g['deficit_qty'] = 0.0;
                $g['status'] = 'full';
            } elseif ($stock > 0) {
                $g['can_deduct_qty'] = $stock;
                $g['deficit_qty'] = round($ordered - $stock, 2);
                $g['status'] = 'partial';
            } else {
                $g['can_deduct_qty'] = 0.0;
                $g['deficit_qty'] = $ordered;
                $g['status'] = 'insufficient';
            }
        }
        unset($g);
        $groupedItems = array_values($grouped);

        return [
            'ok' => true,
            'message' => "จำลองตรวจสอบ {$startDate} ถึง {$endDate} พบ {$totalOrders} รายการ (" . count($groupedItems) . " ชนิดยา)",
            'stats' => [
                'total_orders' => $totalOrders,
                'total_drugs' => count($groupedItems),
                'already_deducted' => $alreadyDeducted,
                'ready_to_deduct' => $readyToDeduct,
                'insufficient' => $insufficientCount,
                'cancelled' => $cancelledCount,
                'reversed' => $reversedCount,
            ],
            'items' => $items,
            'grouped_items' => $groupedItems,
        ];
    }

    /**
     * ดำเนินการตัดจ่ายจริงจากการจำลอง (Commit Preview)
     */
    public function commitPreview(
        string $startDate,
        string $endDate,
        string $mode = 'all',
        array $selectedKeys = [],
        ?int $pharmacyLocationId = null,
        ?string $catalog = 'drug'
    ): array {
        $previewResult = $this->preview($startDate, $endDate, $pharmacyLocationId, $catalog);
        if (! ($previewResult['ok'] ?? false)) {
            return $previewResult;
        }

        $items = $previewResult['items'];
        $selectedLookup = array_flip($selectedKeys);
        $deducted = 0;
        $insufficient = 0;
        $skipped = 0;

        $catalog = $this->inventory->normalizeCatalog($catalog);
        $pharmacy = $pharmacyLocationId
            ? PharmacyLocation::query()->where('type', 'pharmacy')->where('catalog', $catalog)->find($pharmacyLocationId)
            : $this->inventory->defaultDispenseLocation($catalog);

        if (! $pharmacy) {
            return ['ok' => false, 'message' => 'ไม่พบตำแหน่งห้องยา'];
        }

        foreach ($items as $item) {
            $key = $item['key'];
            if ($selectedKeys !== [] && ! isset($selectedLookup[$key])) {
                continue;
            }

            if (in_array($item['preview_status'], ['already_deducted', 'cancelled', 'reversed'], true)) {
                $skipped++;
                continue;
            }

            if ($mode === 'only_ready' && $item['preview_status'] !== 'ready_to_deduct') {
                $skipped++;
                continue;
            }

            try {
                $movement = $this->inventory->dispenseFromPharmacy(
                    (int) $pharmacy->id,
                    (string) $item['icode'],
                    (float) $item['qty'],
                    (string) $item['hn'],
                    (string) ($item['vn'] ?: $item['an']),
                    (string) $item['vstdate'],
                    $key,
                );

                PharmacyDispenseSync::query()->updateOrCreate(
                    ['hosxp_key' => $key],
                    [
                        'hn' => (string) $item['hn'],
                        'vn' => (string) $item['vn'],
                        'an' => (string) $item['an'],
                        'patient_name' => $item['patient_name'],
                        'icode' => (string) $item['icode'],
                        'vstdate' => (string) $item['vstdate'],
                        'qty' => (float) $item['qty'],
                        'status' => 'deducted',
                        'movement_id' => $movement->id,
                        'message' => null,
                    ]
                );
                $deducted++;
            } catch (Throwable $e) {
                if ($mode === 'all') {
                    PharmacyDispenseSync::query()->updateOrCreate(
                        ['hosxp_key' => $key],
                        [
                            'hn' => (string) $item['hn'],
                            'vn' => (string) $item['vn'],
                            'an' => (string) $item['an'],
                            'patient_name' => $item['patient_name'],
                            'icode' => (string) $item['icode'],
                            'vstdate' => (string) $item['vstdate'],
                            'qty' => (float) $item['qty'],
                            'status' => 'insufficient',
                            'movement_id' => null,
                            'message' => $e->getMessage(),
                        ]
                    );
                    $insufficient++;
                } else {
                    $skipped++;
                }
            }
        }

        return [
            'ok' => true,
            'message' => "ดำเนินการตัดจ่ายจริงสำเร็จ {$deducted} รายการ · เข้าสู่ระบบยาค้างจ่าย {$insufficient} รายการ · ข้าม {$skipped} รายการ",
            'deducted' => $deducted,
            'insufficient' => $insufficient,
            'skipped' => $skipped,
        ];
    }

    /**
     * ตัดจ่ายยาค้างจ่ายเมื่อมียาเข้ามา (Fulfill Owed)
     */
    public function fulfillOwed(int $id, ?int $pharmacyLocationId = null): array
    {
        $sync = PharmacyDispenseSync::query()->findOrFail($id);
        if (! in_array($sync->status, ['insufficient', 'failed'], true)) {
            return ['ok' => false, 'message' => 'รายการนี้ไม่ได้อยู่ในสถานะยาค้างจ่าย (สถานะปัจจุบัน: '.$sync->status.')'];
        }

        $item = PharmacyItem::query()->where('icode', $sync->icode)->first();
        if (! $item) {
            return ['ok' => false, 'message' => "ไม่พบข้อมูลยา {$sync->icode} ในระบบ"];
        }

        $catalog = $item->isNondrug() ? 'nondrug' : 'drug';
        $pharmacy = $pharmacyLocationId
            ? PharmacyLocation::query()->where('type', 'pharmacy')->where('catalog', $catalog)->find($pharmacyLocationId)
            : $this->inventory->defaultDispenseLocation($catalog);

        if (! $pharmacy) {
            return ['ok' => false, 'message' => 'ไม่พบตำแหน่งห้องยา'];
        }

        try {
            $movement = $this->inventory->dispenseFromPharmacy(
                (int) $pharmacy->id,
                (string) $sync->icode,
                (float) $sync->qty,
                (string) $sync->hn,
                (string) ($sync->vn ?: $sync->an),
                $sync->vstdate?->toDateString(),
                $sync->hosxp_key,
            );

            $sync->update([
                'status' => 'deducted',
                'movement_id' => $movement->id,
                'fulfilled_at' => now(),
                'fulfilled_by' => Auth::id(),
                'message' => null,
            ]);

            return ['ok' => true, 'message' => "ตัดจ่ายยาค้างจ่าย {$sync->icode} ({$item->name}) จำนวน {$sync->qty} สำเร็จแล้ว"];
        } catch (Throwable $e) {
            return ['ok' => false, 'message' => 'ตัดจ่ายไม่สำเร็จ (สต็อกห้องยายังไม่พอ): '.$e->getMessage()];
        }
    }

    /**
     * ตัดจ่ายยาค้างจ่ายทั้งหมดที่สต็อกพร้อมจ่ายแล้ว
     */
    public function fulfillAllReady(?int $pharmacyLocationId = null, ?string $catalog = null): array
    {
        $catalog = $this->inventory->normalizeCatalog($catalog);
        $pharmacy = $pharmacyLocationId
            ? PharmacyLocation::query()->where('type', 'pharmacy')->where('catalog', $catalog)->find($pharmacyLocationId)
            : $this->inventory->defaultDispenseLocation($catalog);

        if (! $pharmacy) {
            return ['ok' => false, 'message' => 'ไม่พบตำแหน่งห้องยา', 'retried' => 0, 'success' => 0];
        }

        $records = PharmacyDispenseSync::query()
            ->whereIn('status', ['insufficient', 'failed'])
            ->whereIn('icode', PharmacyItem::query()->ofCatalog($catalog)->select('icode'))
            ->orderBy('vstdate')
            ->orderBy('id')
            ->limit(300)
            ->get();

        if ($records->isEmpty()) {
            return ['ok' => true, 'message' => 'ไม่มีรายการยาค้างจ่ายที่ต้องดำเนินการ', 'retried' => 0, 'success' => 0];
        }

        $retried = 0;
        $success = 0;

        foreach ($records as $record) {
            $retried++;
            try {
                $movement = $this->inventory->dispenseFromPharmacy(
                    (int) $pharmacy->id,
                    (string) $record->icode,
                    (float) $record->qty,
                    (string) $record->hn,
                    (string) ($record->vn ?: $record->an),
                    $record->vstdate?->toDateString(),
                    $record->hosxp_key,
                );

                $record->update([
                    'status' => 'deducted',
                    'movement_id' => $movement->id,
                    'fulfilled_at' => now(),
                    'fulfilled_by' => Auth::id(),
                    'message' => null,
                ]);
                $success++;
            } catch (Throwable) {
                // ยังไม่พอ ปล่อยเป็น insufficient ต่อไป
            }
        }

        return [
            'ok' => true,
            'message' => "ตรวจสอบรายการยาค้างจ่าย {$retried} รายการ · ตัดจ่ายสำเร็จ {$success} รายการ",
            'retried' => $retried,
            'success' => $success,
        ];
    }

    /**
     * ยกเลิกรายการยาค้างจ่าย (Cancel Owed)
     */
    public function cancelOwed(int $id, string $reason, ?int $userId = null): array
    {
        $sync = PharmacyDispenseSync::query()->findOrFail($id);
        if (! in_array($sync->status, ['insufficient', 'failed'], true)) {
            return ['ok' => false, 'message' => 'สามารถยกเลิกได้เฉพาะรายการยาค้างจ่ายเท่านั้น'];
        }

        $sync->update([
            'status' => 'cancelled',
            'cancel_reason' => $reason,
            'cancelled_at' => now(),
            'cancelled_by' => $userId ?: Auth::id(),
            'message' => 'ยกเลิกรายการค้างจ่าย: '.$reason,
        ]);

        return ['ok' => true, 'message' => "ยกเลิกรายการยาค้างจ่ายรหัส {$sync->icode} เรียบร้อยแล้ว"];
    }

    /**
     * กู้คืนข้อมูลการตัดจ่ายหากตัดผิด (Rollback / Undo Dispense)
     */
    public function rollbackDispense(int $id, string $reason, ?int $userId = null): array
    {
        $sync = PharmacyDispenseSync::query()->with(['movement'])->findOrFail($id);
        if ($sync->status !== 'deducted') {
            return [
                'ok' => false,
                'message' => 'สามารถกู้คืนได้เฉพาะรายการที่ตัดจ่ายสำเร็จเท่านั้น (สถานะปัจจุบัน: '.$sync->status.')',
            ];
        }

        $userId = $userId ?: Auth::id();

        return DB::transaction(function () use ($sync, $reason, $userId) {
            $movement = $sync->movement;
            $locationId = $movement?->from_location_id;
            $itemId = $movement?->item_id;
            $qty = (float) $sync->qty;

            $revMovement = null;

            if ($locationId && $itemId) {
                // 1. คืนยอด balance
                $balance = PharmacyStockBalance::query()->lockForUpdate()
                    ->where('location_id', $locationId)
                    ->where('item_id', $itemId)
                    ->first();
                if ($balance) {
                    $balance->qty_on_hand = (float) $balance->qty_on_hand + $qty;
                    $balance->save();
                }

                // 2. คืนยอดเข้า Lot
                $lot = null;
                if ($movement->lot_id) {
                    $lot = PharmacyLot::query()->lockForUpdate()->find($movement->lot_id);
                    if ($lot) {
                        $lot->qty_remaining = (float) $lot->qty_remaining + $qty;
                        if ($lot->status === 'depleted') {
                            $lot->status = 'active';
                        }
                        $lot->save();
                    }
                }

                if (! $lot) {
                    $lot = PharmacyLot::query()->lockForUpdate()
                        ->where('location_id', $locationId)
                        ->where('item_id', $itemId)
                        ->orderByDesc('id')
                        ->first();
                    if ($lot) {
                        $lot->qty_remaining = (float) $lot->qty_remaining + $qty;
                        if ($lot->status === 'depleted') {
                            $lot->status = 'active';
                        }
                        $lot->save();
                    }
                }

                // 3. สร้าง stock movement ย้อนกลับ
                $revMovement = PharmacyStockMovement::query()->create([
                    'type' => 'return',
                    'item_id' => $itemId,
                    'lot_id' => $lot?->id,
                    'from_location_id' => null,
                    'to_location_id' => $locationId,
                    'qty' => $qty,
                    'balance_after' => $balance?->qty_on_hand,
                    'reference_type' => 'rollback_dispense',
                    'reference_id' => $sync->hosxp_key,
                    'hn' => $sync->hn,
                    'vn' => $sync->vn,
                    'vstdate' => $sync->vstdate,
                    'user_id' => $userId,
                    'note' => 'กู้คืนการตัดจ่าย HOSxP (ตัดผิด): '.$reason,
                ]);
            }

            // 4. อัปเดตสถานะ sync
            $sync->update([
                'status' => 'reversed',
                'cancel_reason' => $reason,
                'reversed_at' => now(),
                'reversed_by' => $userId,
                'reverse_movement_id' => $revMovement?->id,
                'message' => 'กู้คืนการตัดจ่ายแล้ว: '.$reason,
            ]);

            return [
                'ok' => true,
                'message' => "กู้คืนการตัดจ่ายรหัส {$sync->icode} จำนวน {$qty} เรียบร้อยแล้ว (คืนสต็อกเข้าห้องยาเรียบร้อย)",
            ];
        });
    }

    /**
     * ดำเนินการลองตัดสต็อกใหม่ (Retry) สำหรับรายการที่เคยตัดไม่สำเร็จ
     */
    public function retryFailed(?int $id = null, ?int $pharmacyLocationId = null, ?string $catalog = null): array
    {
        return $this->fulfillAllReady($pharmacyLocationId, $catalog);
    }

    /**
     * กู้คืนสต็อก HOSxP ทั้งหมดที่เคยตัดจ่ายไปแล้ว (Rollback All) เพื่อคืนสต็อกกลับห้องยา
     *
     * @return array{ok:bool,message:string,reverted_count:int,total_qty:float}
     */
    public function rollbackAllHosxpDispenses(?string $startDate = null, ?string $endDate = null, ?int $userId = null): array
    {
        $userId = $userId ?: Auth::id();

        $query = PharmacyDispenseSync::query()->where('status', 'deducted');
        if ($startDate && $endDate) {
            $query->whereBetween('vstdate', [$startDate, $endDate]);
        }

        $records = $query->get();
        if ($records->isEmpty()) {
            return [
                'ok' => true,
                'message' => 'ไม่พบรายการที่ตัดจ่ายสำเร็จที่ต้องกู้คืน',
                'reverted_count' => 0,
                'total_qty' => 0.0,
            ];
        }

        return DB::transaction(function () use ($records, $userId) {
            $pharmacy = PharmacyLocation::query()->where('code', 'PHARM-OPD')->first()
                ?? PharmacyLocation::query()->where('type', 'pharmacy')->first();
            $locationId = $pharmacy?->id ?: 2;

            $itemsMap = PharmacyItem::query()->whereIn('icode', $records->pluck('icode')->unique())->get()->keyBy('icode');

            $totalQty = 0.0;
            $count = 0;
            $qtyByItem = [];

            foreach ($records as $rec) {
                $qty = (float) $rec->qty;
                $totalQty += $qty;
                $count++;
                $item = $itemsMap->get($rec->icode);
                if ($item) {
                    $qtyByItem[$item->id] = ($qtyByItem[$item->id] ?? 0.0) + $qty;
                }

                $rec->update([
                    'status' => 'reversed',
                    'cancel_reason' => 'กู้คืนสต็อก HOSxP ทั้งหมดตามคำสั่งผู้ใช้',
                    'reversed_at' => now(),
                    'reversed_by' => $userId,
                    'message' => 'กู้คืนการตัดจ่ายแล้ว (คืนสต็อกเข้าห้องยา)',
                ]);
            }

            foreach ($qtyByItem as $itemId => $restoringQty) {
                $balance = PharmacyStockBalance::query()->lockForUpdate()
                    ->where('location_id', $locationId)
                    ->where('item_id', $itemId)
                    ->first();
                if ($balance) {
                    $balance->qty_on_hand = (float) $balance->qty_on_hand + $restoringQty;
                    $balance->save();
                }

                $lot = PharmacyLot::query()->lockForUpdate()
                    ->where('location_id', $locationId)
                    ->where('item_id', $itemId)
                    ->orderByDesc('id')
                    ->first();
                if ($lot) {
                    $lot->qty_remaining = (float) $lot->qty_remaining + $restoringQty;
                    if ($lot->status === 'depleted') {
                        $lot->status = 'active';
                    }
                    $lot->save();
                }

                PharmacyStockMovement::query()->create([
                    'type' => 'return',
                    'item_id' => $itemId,
                    'lot_id' => $lot?->id,
                    'from_location_id' => null,
                    'to_location_id' => $locationId,
                    'qty' => $restoringQty,
                    'balance_after' => $balance?->qty_on_hand,
                    'reference_type' => 'rollback_all_hosxp',
                    'reference_id' => 'rollback-all-'.now()->format('YmdHis'),
                    'user_id' => $userId,
                    'note' => 'กู้คืนสต็อก HOSxP ทั้งหมดตามคำสั่งผู้ใช้ (ย้อนคืนสต็อกเข้าห้องยา)',
                ]);
            }

            return [
                'ok' => true,
                'message' => "กู้คืนข้อมูลสำเร็จ {$count} รายการ (รวม {$totalQty} หน่วย) โดยคืนสต็อกกลับเข้าห้องยา OPD เรียบร้อยแล้ว",
                'reverted_count' => $count,
                'total_qty' => round($totalQty, 2),
            ];
        });
    }
}
