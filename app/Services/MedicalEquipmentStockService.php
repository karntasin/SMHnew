<?php

namespace App\Services;

use App\Models\MedicalEquipment;
use App\Models\MedicalEquipmentBorrowing;
use App\Models\MedicalEquipmentStockLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class MedicalEquipmentStockService
{
    public function reserve(MedicalEquipment $equipment, int $quantity, ?MedicalEquipmentBorrowing $borrowing = null, ?string $reason = null): void
    {
        $this->adjust($equipment, -$quantity, 'out', $borrowing, $reason ?? 'จองสต็อกสำหรับการยืม');
    }

    public function release(MedicalEquipment $equipment, int $quantity, ?MedicalEquipmentBorrowing $borrowing = null, ?string $reason = null): void
    {
        $this->adjust($equipment, $quantity, 'return', $borrowing, $reason ?? 'คืนสต็อกจากการยกเลิก/ปฏิเสธ');
    }

    public function manualAdjust(MedicalEquipment $equipment, int $newTotal, ?string $reason = null): void
    {
        DB::transaction(function () use ($equipment, $newTotal, $reason) {
            $equipment = MedicalEquipment::lockForUpdate()->findOrFail($equipment->id);
            $before = $equipment->quantity_total;
            $diff = $newTotal - $before;
            $available = max(0, (int) $equipment->quantity_available + $diff);

            $equipment->update([
                'quantity_total' => $newTotal,
                'quantity_available' => min($available, $newTotal),
                'status' => $available > 0 ? 'available' : $equipment->status,
            ]);

            MedicalEquipmentStockLog::create([
                'equipment_id' => $equipment->id,
                'user_id' => Auth::id(),
                'type' => 'adjust',
                'quantity_change' => $diff,
                'quantity_before' => $before,
                'quantity_after' => $newTotal,
                'reason' => $reason ?? 'ปรับจำนวนสต็อก',
            ]);
        });
    }

    private function adjust(
        MedicalEquipment $equipment,
        int $quantityChange,
        string $type,
        ?MedicalEquipmentBorrowing $borrowing,
        string $reason
    ): void {
        DB::transaction(function () use ($equipment, $quantityChange, $type, $borrowing, $reason) {
            $equipment = MedicalEquipment::lockForUpdate()->findOrFail($equipment->id);
            $before = (int) $equipment->quantity_available;
            $after = $before + $quantityChange;

            if ($after < 0) {
                throw new RuntimeException('สต็อกไม่เพียงพอ (คงเหลือ '.$before.' ชิ้น)');
            }

            $equipment->update([
                'quantity_available' => $after,
                'status' => $after === 0 ? 'borrowed' : ($equipment->status === 'borrowed' && $after > 0 ? 'available' : $equipment->status),
            ]);

            MedicalEquipmentStockLog::create([
                'equipment_id' => $equipment->id,
                'borrowing_id' => $borrowing?->id,
                'user_id' => Auth::id(),
                'type' => $type,
                'quantity_change' => $quantityChange,
                'quantity_before' => $before,
                'quantity_after' => $after,
                'reason' => $reason,
            ]);
        });
    }
}
