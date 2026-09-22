<?php

namespace App\Models\Pharmacy;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PharmacyItemUnit extends Model
{
    protected $fillable = [
        'item_id', 'parent_unit_id', 'packaging_type_id', 'name', 'contains_qty',
        'factor_to_base', 'barcode', 'usage_context', 'description',
        'is_default_receive', 'is_default_transfer', 'is_default_dispense',
        'is_active', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'contains_qty' => 'decimal:4', 'factor_to_base' => 'decimal:4',
            'is_default_receive' => 'boolean', 'is_default_transfer' => 'boolean',
            'is_default_dispense' => 'boolean', 'is_active' => 'boolean',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(PharmacyItem::class, 'item_id');
    }

    public function parentUnit(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_unit_id');
    }

    public function childUnits(): HasMany
    {
        return $this->hasMany(self::class, 'parent_unit_id');
    }

    public function packagingType(): BelongsTo
    {
        return $this->belongsTo(PharmacyPackagingType::class, 'packaging_type_id');
    }

    public function barcodes(): HasMany
    {
        return $this->hasMany(PharmacyItemBarcode::class, 'unit_id');
    }

    public function hierarchyLabel(): string
    {
        if (! $this->parentUnit) {
            return "1 {$this->name} (หน่วยฐาน)";
        }

        return "1 {$this->name} = ".rtrim(rtrim(number_format((float) $this->contains_qty, 4), '0'), '.')." {$this->parentUnit->name}";
    }

    public function toBase(float $quantity): float
    {
        return round($quantity * (float) $this->factor_to_base, 4);
    }
}
