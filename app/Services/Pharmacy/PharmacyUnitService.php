<?php

namespace App\Services\Pharmacy;

use App\Models\Pharmacy\PharmacyItem;
use App\Models\Pharmacy\PharmacyItemBarcode;
use App\Models\Pharmacy\PharmacyItemUnit;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class PharmacyUnitService
{
    public function save(PharmacyItem $item, array $data, ?PharmacyItemUnit $unit = null): PharmacyItemUnit
    {
        return DB::transaction(function () use ($item, $data, $unit) {
            $parentId = isset($data['parent_unit_id']) && $data['parent_unit_id'] !== ''
                ? (int) $data['parent_unit_id']
                : null;
            $parent = $parentId
                ? $item->units()->lockForUpdate()->findOrFail($parentId)
                : null;

            if ($unit && $parent && ($parent->id === $unit->id || $this->isDescendant($parent, $unit->id))) {
                throw new RuntimeException('ไม่สามารถเลือกหน่วยตนเองหรือหน่วยลูกเป็นหน่วยย่อยได้');
            }

            $contains = $parent ? round((float) ($data['contains_qty'] ?? 0), 4) : 1.0;
            if ($contains <= 0) {
                throw new RuntimeException('จำนวนหน่วยย่อยต้องมากกว่า 0');
            }

            $data['parent_unit_id'] = $parent?->id;
            $data['contains_qty'] = $contains;
            $data['factor_to_base'] = $parent
                ? round($contains * (float) $parent->factor_to_base, 4)
                : 1;

            $unit ??= new PharmacyItemUnit(['item_id' => $item->id]);
            $unit->fill($data);
            $unit->item_id = $item->id;
            $unit->save();

            if (! empty($data['barcode'])) {
                $code = trim((string) $data['barcode']);
                $existingBarcode = PharmacyItemBarcode::query()->where('barcode', $code)->lockForUpdate()->first();
                if ($existingBarcode && (int) $existingBarcode->item_id !== (int) $item->id) {
                    $otherItem = PharmacyItem::query()->find($existingBarcode->item_id);
                    $otherName = $otherItem?->name ?: 'ยาอื่น';
                    throw new RuntimeException("บาร์โค้ดนี้ถูกผูกไว้กับยาตัวอื่นแล้ว ({$otherName})");
                }

                if ($existingBarcode && (int) $existingBarcode->unit_id !== (int) $unit->id) {
                    PharmacyItemUnit::query()
                        ->where('item_id', $item->id)
                        ->where('id', $existingBarcode->unit_id)
                        ->update(['barcode' => null]);
                }

                PharmacyItemBarcode::query()->updateOrCreate(
                    ['barcode' => $code],
                    [
                        'item_id' => $item->id, 'unit_id' => $unit->id,
                        'symbology' => 'AUTO', 'label' => 'บาร์โค้ดหลัก '.$unit->name,
                        'is_primary' => true, 'is_active' => true,
                    ],
                );
            }

            $this->recalculateChildren($unit);

            return $unit->fresh(['parentUnit', 'packagingType', 'barcodes']);
        });
    }

    public function recalculateItem(PharmacyItem $item): void
    {
        DB::transaction(function () use ($item) {
            $item->units()->whereNull('parent_unit_id')->update([
                'contains_qty' => 1, 'factor_to_base' => 1,
            ]);
            $item->units()->whereNull('parent_unit_id')->get()
                ->each(fn (PharmacyItemUnit $root) => $this->recalculateChildren($root));
        });
    }

    /**
     * สร้าง/อัปเดตโครงสร้างหน่วยจากเล็กไปใหญ่
     * เช่น [เม็ด, แพ็ค×10, กล่อง×100] → คืนหน่วยนอกสุด (กล่อง)
     *
     * @param  array<int, array{name:string,contains_qty?:float|int|string,packaging_type_id?:int|null,barcode?:string|null}>  $levels
     */
    public function ensureHierarchy(PharmacyItem $item, array $levels, string $defaultContext = 'receive'): PharmacyItemUnit
    {
        if ($levels === []) {
            throw new RuntimeException('ต้องระบุหน่วยบรรจุอย่างน้อย 1 ระดับ');
        }

        return DB::transaction(function () use ($item, $levels, $defaultContext) {
            $parent = null;
            $outer = null;

            foreach (array_values($levels) as $index => $level) {
                $name = trim((string) ($level['name'] ?? ''));
                if ($name === '') {
                    if ($index === 0) {
                        $name = $item->baseUnitName();
                    } elseif (! empty($level['packaging_type_id'])) {
                        $pt = PharmacyPackagingType::query()->find($level['packaging_type_id']);
                        $name = $pt?->name ?: ('ระดับที่ '.($index + 1));
                    } else {
                        $name = 'ระดับที่ '.($index + 1);
                    }
                }

                $contains = $index === 0 ? 1.0 : round((float) ($level['contains_qty'] ?? 0), 4);
                if ($contains <= 0) {
                    throw new RuntimeException("จำนวนหน่วยย่อยของ {$name} ต้องมากกว่า 0");
                }

                $existing = $item->units()->where('name', $name)->first();
                $payload = [
                    'name' => $name,
                    'parent_unit_id' => $parent?->id,
                    'contains_qty' => $contains,
                    'packaging_type_id' => ! empty($level['packaging_type_id']) ? (int) $level['packaging_type_id'] : null,
                    'barcode' => trim((string) ($level['barcode'] ?? '')) ?: null,
                    'usage_context' => 'all',
                    'is_active' => true,
                    'is_default_receive' => $defaultContext === 'receive' && $index === count($levels) - 1,
                    'is_default_transfer' => $defaultContext === 'transfer' && $index === count($levels) - 1,
                    'is_default_dispense' => $index === 0,
                    'sort_order' => $index,
                ];

                if ($payload['is_default_receive'] || $payload['is_default_transfer'] || $payload['is_default_dispense']) {
                    foreach (['receive', 'transfer', 'dispense'] as $context) {
                        if ($payload['is_default_'.$context] ?? false) {
                            $item->units()->update(['is_default_'.$context => false]);
                        }
                    }
                }

                $outer = $this->save($item, $payload, $existing);
                $parent = $outer;
            }

            return $outer->fresh(['parentUnit', 'packagingType']);
        });
    }

    private function recalculateChildren(PharmacyItemUnit $parent): void
    {
        $parent->childUnits()->lockForUpdate()->get()->each(function (PharmacyItemUnit $child) use ($parent) {
            $child->factor_to_base = round(
                (float) $child->contains_qty * (float) $parent->factor_to_base,
                4,
            );
            $child->save();
            $this->recalculateChildren($child);
        });
    }

    private function isDescendant(PharmacyItemUnit $candidate, int $ancestorId): bool
    {
        $cursor = $candidate;
        while ($cursor->parent_unit_id) {
            if ((int) $cursor->parent_unit_id === $ancestorId) {
                return true;
            }
            $cursor = $cursor->parentUnit;
            if (! $cursor) {
                break;
            }
        }

        return false;
    }
}
