<?php

namespace App\Services\Pharmacy;

use App\Models\Pharmacy\PharmacyDispenseSync;
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
    public function sync(?string $date = null, ?int $pharmacyLocationId = null): array
    {
        $this->inventory->ensureDefaultLocations();
        $date = $date ?: now('Asia/Bangkok')->toDateString();

        $pharmacy = $pharmacyLocationId
            ? PharmacyLocation::query()->where('type', 'pharmacy')->find($pharmacyLocationId)
            : PharmacyLocation::query()->where('type', 'pharmacy')->where('is_active', true)->orderBy('sort_order')->first();

        if (! $pharmacy) {
            return [
                'ok' => false,
                'message' => 'ยังไม่มีตำแหน่งห้องยา',
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

        $trackedIcodes = DB::table('pharmacy_items')->pluck('icode')->filter()->values()->all();
        if ($trackedIcodes === []) {
            return [
                'ok' => true,
                'message' => 'ยังไม่มีรายการยาในคลังแอป — รับเข้าก่อนจึงจะตัดจ่ายได้',
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
            'message' => "สแกน {$rows->count()} · ตัดได้ {$deducted} · ข้าม {$skipped} · สต็อกไม่พอ {$insufficient}",
            'scanned' => $rows->count(),
            'deducted' => $deducted,
            'skipped' => $skipped,
            'insufficient' => $insufficient,
        ];
    }
}
