<?php

namespace App\Models\Pharmacy;

use Illuminate\Database\Eloquent\Model;

class DrugPricingTier extends Model
{
    protected $connection = 'mysql';

    protected $table = 'drug_pricing_tiers';

    protected $guarded = ['id'];

    protected $casts = [
        'min_cost' => 'float',
        'max_cost' => 'float',
        'base_price' => 'float',
        'base_cost' => 'float',
        'multiplier_percent' => 'float',
        'order' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * คำนวณราคาขายตามเกณฑ์ของ Tier นี้
     */
    public function calculatePrice(float $unitCost, bool $round = true): float
    {
        $calculated = 0.0;

        if ($this->calc_type === 'fixed') {
            $calculated = (float) $this->base_price;
        } elseif ($this->calc_type === 'markup_percent' || $this->calc_type === 'multiplier_cost') {
            $calculated = $unitCost * (1 + ($this->multiplier_percent / 100));
        } elseif ($this->calc_type === 'base_plus_percent' || $this->calc_type === 'markup_excess') {
            $excess = max(0.0, $unitCost - (float) $this->base_cost);
            $calculated = (float) $this->base_price + ($excess * ($this->multiplier_percent / 100));
        } else {
            $calculated = (float) $this->base_price;
        }

        if ($round) {
            return self::roundHospitalPrice($calculated);
        }

        return round($calculated, 2);
    }

    /**
     * ปัดเศษตามมาตรฐานราคาขายยาโรงพยาบาลรัฐ:
     * - น้อยกว่า 10 บาท: ปัดเป็นเท่าของ 0.25 บาท
     * - 10 ถึง 100 บาท: ปัดเป็นเท่าของ 0.50 บาท
     * - มากกว่า 100 บาท: ปัดเป็นบาทถ้วน (<0.50 ปัดลง, >=0.50 ปัดขึ้น)
     */
    public static function roundHospitalPrice(float $price): float
    {
        if ($price <= 0) {
            return 0.0;
        }

        if ($price < 10.0) {
            return round($price * 4) / 4;
        }

        if ($price <= 100.0) {
            return round($price * 2) / 2;
        }

        return round($price);
    }

    /**
     * เกณฑ์ค่าเริ่มต้นตามหนังสือเวียน กค 0417/ว 177 และ กค 0422.2/ว 111 (Regressive Markup)
     *
     * @return list<array<string, mixed>>
     */
    public static function defaultTiers(): array
    {
        return [
            [
                'name' => 'ช่วงที่ 1: ทุน 0.01 – 0.20 บาท',
                'min_cost' => 0.0001,
                'max_cost' => 0.2000,
                'calc_type' => 'fixed',
                'base_price' => 0.5000,
                'base_cost' => 0.0000,
                'multiplier_percent' => 0.00,
                'order' => 1,
                'is_active' => true,
            ],
            [
                'name' => 'ช่วงที่ 2: ทุน 0.21 – 0.50 บาท',
                'min_cost' => 0.2001,
                'max_cost' => 0.5000,
                'calc_type' => 'fixed',
                'base_price' => 1.0000,
                'base_cost' => 0.0000,
                'multiplier_percent' => 0.00,
                'order' => 2,
                'is_active' => true,
            ],
            [
                'name' => 'ช่วงที่ 3: ทุน 0.51 – 1.00 บาท',
                'min_cost' => 0.5001,
                'max_cost' => 1.0000,
                'calc_type' => 'fixed',
                'base_price' => 1.5000,
                'base_cost' => 0.0000,
                'multiplier_percent' => 0.00,
                'order' => 3,
                'is_active' => true,
            ],
            [
                'name' => 'ช่วงที่ 4: ทุน 1.01 – 10.00 บาท',
                'min_cost' => 1.0001,
                'max_cost' => 10.0000,
                'calc_type' => 'base_plus_percent',
                'base_price' => 1.5000,
                'base_cost' => 1.0000,
                'multiplier_percent' => 125.00,
                'order' => 4,
                'is_active' => true,
            ],
            [
                'name' => 'ช่วงที่ 5: ทุน 10.01 – 100.00 บาท',
                'min_cost' => 10.0001,
                'max_cost' => 100.0000,
                'calc_type' => 'base_plus_percent',
                'base_price' => 13.0000,
                'base_cost' => 10.0000,
                'multiplier_percent' => 120.00,
                'order' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'ช่วงที่ 6: ทุน 100.01 – 1,000.00 บาท',
                'min_cost' => 100.0001,
                'max_cost' => 1000.0000,
                'calc_type' => 'base_plus_percent',
                'base_price' => 126.0000,
                'base_cost' => 100.0000,
                'multiplier_percent' => 115.00,
                'order' => 6,
                'is_active' => true,
            ],
            [
                'name' => 'ช่วงที่ 7: ทุนมากกว่า 1,000.00 บาทขึ้นไป',
                'min_cost' => 1000.0001,
                'max_cost' => null,
                'calc_type' => 'base_plus_percent',
                'base_price' => 1161.0000,
                'base_cost' => 1000.0000,
                'multiplier_percent' => 110.00,
                'order' => 7,
                'is_active' => true,
            ],
        ];
    }
}
