<?php

namespace App\Services\Pharmacy;

use App\Models\Pharmacy\PharmacyDispenseSync;
use App\Models\Pharmacy\PharmacyItem;
use App\Models\Pharmacy\PharmacyLocation;
use App\Services\HosxpConnectionService;
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
     * ดึงใบสั่งจาก HOSxP แล้วตัดสต็อกห้องยา (เฉพาะยาที่มีในคลังแอป)
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
        $label = $catalog === 'nondrug' ? 'จุดจ่ายเวชภัณฑ์' : 'ห้องยา';

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
            $rows = DB::connection('hosxp')->table('opitemrece as oi')
                ->whereIn('oi.icode', $trackedIcodes)
                ->whereDate('oi.vstdate', $date)
                ->whereNotNull('oi.qty')
                ->orderBy('oi.vn')
                ->limit(2000)
                ->get(['oi.hn', 'oi.vn', 'oi.icode', 'oi.qty', 'oi.vstdate']);
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
            $key = implode('|', [
                (string) $row->hn,
                (string) $row->vn,
                (string) $row->icode,
                (string) $row->vstdate,
                rtrim(rtrim(number_format($qty, 2, '.', ''), '0'), '.'),
            ]);

            if (PharmacyDispenseSync::query()->where('hosxp_key', $key)->exists()) {
                $skipped++;
                continue;
            }

            try {
                $movement = $this->inventory->dispenseFromPharmacy(
                    (int) $pharmacy->id,
                    (string) $row->icode,
                    $qty,
                    (string) $row->hn,
                    (string) $row->vn,
                    (string) $row->vstdate,
                    $key,
                );

                PharmacyDispenseSync::query()->create([
                    'hosxp_key' => $key,
                    'hn' => (string) $row->hn,
                    'vn' => (string) $row->vn,
                    'icode' => (string) $row->icode,
                    'vstdate' => (string) $row->vstdate,
                    'qty' => $qty,
                    'status' => 'deducted',
                    'movement_id' => $movement->id,
                    'message' => null,
                ]);
                $deducted++;
            } catch (Throwable $e) {
                PharmacyDispenseSync::query()->create([
                    'hosxp_key' => $key,
                    'hn' => (string) $row->hn,
                    'vn' => (string) $row->vn,
                    'icode' => (string) $row->icode,
                    'vstdate' => (string) $row->vstdate,
                    'qty' => $qty,
                    'status' => 'insufficient',
                    'movement_id' => null,
                    'message' => $e->getMessage(),
                ]);
                $insufficient++;
            }
        }

        return [
            'ok' => true,
            'message' => "{$label} สแกน {$rows->count()} · ตัดได้ {$deducted} · ข้าม {$skipped} · สต็อกไม่พอ {$insufficient}",
            'scanned' => $rows->count(),
            'deducted' => $deducted,
            'skipped' => $skipped,
            'insufficient' => $insufficient,
        ];
    }

    /**
     * ดำเนินการลองตัดสต็อกใหม่ (Retry) สำหรับรายการที่เคยตัดไม่สำเร็จ (สต็อกไม่พอ)
     *
     * @return array{ok:bool,message:string,retried:int,success:int}
     */
    public function retryFailed(?int $id = null, ?int $pharmacyLocationId = null, ?string $catalog = null): array
    {
        $catalog = $this->inventory->normalizeCatalog($catalog);
        $this->inventory->ensureDefaultLocations();
        $label = $catalog === 'nondrug' ? 'จุดจ่ายเวชภัณฑ์' : 'ห้องยา';
        $pharmacy = $pharmacyLocationId
            ? PharmacyLocation::query()->where('type', 'pharmacy')->where('catalog', $catalog)->find($pharmacyLocationId)
            : $this->inventory->defaultDispenseLocation($catalog);

        if (! $pharmacy) {
            return ['ok' => false, 'message' => "ไม่พบ{$label}", 'retried' => 0, 'success' => 0];
        }

        $query = PharmacyDispenseSync::query()
            ->whereIn('status', ['insufficient', 'failed'])
            ->whereIn('icode', PharmacyItem::query()->ofCatalog($catalog)->select('icode'));
        if ($id) {
            $query->where('id', $id);
        }

        $records = $query->limit(200)->get();
        if ($records->isEmpty()) {
            return ['ok' => true, 'message' => 'ไม่มีรายการที่ต้องลองตัดใหม่', 'retried' => 0, 'success' => 0];
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
                    (string) $record->vn,
                    (string) $record->vstdate,
                    $record->hosxp_key,
                );

                $record->update([
                    'status' => 'deducted',
                    'movement_id' => $movement->id,
                    'message' => null,
                ]);
                $success++;
            } catch (Throwable $e) {
                $record->update([
                    'message' => 'ลองใหม่ล้มเหลว: '.$e->getMessage(),
                ]);
            }
        }

        return [
            'ok' => true,
            'message' => "ดำเนินการลองใหม่ {$retried} รายการ · ตัดสต็อกสำเร็จ {$success} รายการ",
            'retried' => $retried,
            'success' => $success,
        ];
    }
}
