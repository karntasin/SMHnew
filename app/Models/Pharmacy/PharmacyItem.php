<?php

namespace App\Models\Pharmacy;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PharmacyItem extends Model
{
    protected $fillable = [
        'icode', 'name', 'item_type', 'income_code', 'strength', 'unit', 'base_unit', 'dispense_unit',
        'barcode', 'hosxp_synced_at', 'drug_group', 'is_active', 'meta',
        'is_had', 'is_cold_chain', 'storage_temp', 'is_narcotic', 'had_alert_text',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_had' => 'boolean',
            'is_cold_chain' => 'boolean',
            'is_narcotic' => 'boolean',
            'hosxp_synced_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function balances(): HasMany
    {
        return $this->hasMany(PharmacyStockBalance::class, 'item_id');
    }

    public function lots(): HasMany
    {
        return $this->hasMany(PharmacyLot::class, 'item_id');
    }

    public function units(): HasMany
    {
        return $this->hasMany(PharmacyItemUnit::class, 'item_id')->orderBy('sort_order');
    }

    public function barcodes(): HasMany
    {
        return $this->hasMany(PharmacyItemBarcode::class, 'item_id');
    }

    public function baseUnitName(): string
    {
        return $this->base_unit ?: $this->unit ?: 'หน่วย';
    }

    public function isNondrug(): bool
    {
        return $this->item_type === 'nondrug';
    }

    public function itemTypeLabel(): string
    {
        return $this->isNondrug() ? 'ค่าเวชภัณฑ์ที่มิใช่ยา' : 'ยา';
    }
}
