<?php

namespace App\Services\Pharmacy;

use App\Models\Pharmacy\DrugPricingTier;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DrugPricingService
{
    /**
     * ดึงเกณฑ์ช่วงราคาจาก Database หากยังไม่มีให้สร้างค่าเริ่มต้น
     *
     * @return Collection<int, DrugPricingTier>
     */
    public function getTiers(): Collection
    {
        try {
            if (! DB::connection('mysql')->getSchemaBuilder()->hasTable('drug_pricing_tiers')) {
                return collect(DrugPricingTier::defaultTiers())->map(fn ($row) => new DrugPricingTier($row));
            }

            $tiers = DrugPricingTier::query()
                ->where('is_active', true)
                ->orderBy('order')
                ->get();

            if ($tiers->isEmpty()) {
                $this->resetToDefaultTiers();
                $tiers = DrugPricingTier::query()
                    ->where('is_active', true)
                    ->orderBy('order')
                    ->get();
            }

            return $tiers;
        } catch (\Throwable $e) {
            Log::warning('Error loading drug pricing tiers: '.$e->getMessage());

            return collect(DrugPricingTier::defaultTiers())->map(fn ($row) => new DrugPricingTier($row));
        }
    }

    /**
     * บันทึกการแก้ไขเกณฑ์ช่วงราคาที่ผู้ใช้กรอก
     *
     * @param  list<array<string, mixed>>  $tiersData
     */
    public function saveTiers(array $tiersData): array
    {
        DB::connection('mysql')->transaction(function () use ($tiersData) {
            DrugPricingTier::truncate();

            foreach ($tiersData as $index => $item) {
                DrugPricingTier::create([
                    'name' => trim((string) ($item['name'] ?? 'ช่วงที่ '.($index + 1))),
                    'min_cost' => (float) ($item['min_cost'] ?? 0),
                    'max_cost' => isset($item['max_cost']) && $item['max_cost'] !== '' && $item['max_cost'] !== null
                        ? (float) $item['max_cost']
                        : null,
                    'calc_type' => in_array($item['calc_type'] ?? '', ['fixed', 'base_plus_percent', 'markup_percent'], true)
                        ? $item['calc_type']
                        : 'fixed',
                    'base_price' => (float) ($item['base_price'] ?? 0),
                    'base_cost' => (float) ($item['base_cost'] ?? 0),
                    'multiplier_percent' => (float) ($item['multiplier_percent'] ?? 0),
                    'order' => (int) ($item['order'] ?? ($index + 1)),
                    'is_active' => (bool) ($item['is_active'] ?? true),
                ]);
            }
        });

        Cache::forget('pharmacy_drug_catalog_v1');

        return ['success' => true, 'message' => 'บันทึกเกณฑ์ช่วงราคาเรียบร้อยแล้ว'];
    }

    /**
     * รีเซ็ตกลับไปเป็นค่าเริ่มต้นตามระเบียบ ว.111 / ว.177
     */
    public function resetToDefaultTiers(): array
    {
        DB::connection('mysql')->transaction(function () {
            DrugPricingTier::truncate();

            foreach (DrugPricingTier::defaultTiers() as $tier) {
                DrugPricingTier::create($tier);
            }
        });

        Cache::forget('pharmacy_drug_catalog_v1');

        return ['success' => true, 'message' => 'รีเซ็ตเป็นเกณฑ์มาตรฐาน ว.111 เรียบร้อยแล้ว'];
    }

    /**
     * คำนวณราคาขายตามเกณฑ์สำหรับยา 1 รายการ
     *
     * @param  Collection<int, DrugPricingTier>  $tiers
     * @return array{price: float, tier_name: string, tier_id: ?int}
     */
    public function calculateTierPrice(float $unitCost, Collection $tiers, bool $round = true): array
    {
        if ($unitCost <= 0) {
            return [
                'price' => 0.0,
                'tier_name' => 'ราคาทุน 0 บาท',
                'tier_id' => null,
            ];
        }

        foreach ($tiers as $tier) {
            $min = (float) $tier->min_cost;
            $max = $tier->max_cost !== null ? (float) $tier->max_cost : null;

            $match = ($unitCost >= $min) && ($max === null || $unitCost <= $max);

            if ($match) {
                return [
                    'price' => $tier->calculatePrice($unitCost, $round),
                    'tier_name' => $tier->name,
                    'tier_id' => $tier->id,
                ];
            }
        }

        // กรณีไม่เข้าช่วงใดเลย ใช้ทุนบวก 20%
        $fallback = $unitCost * 1.2;

        return [
            'price' => $round ? DrugPricingTier::roundHospitalPrice($fallback) : round($fallback, 2),
            'tier_name' => 'นอกเกณฑ์ (Fallback +20%)',
            'tier_id' => null,
        ];
    }

    /**
     * แปลงปีงบประมาณไทยเป็นช่วงวันที่ ค.ศ.
     * เช่น ปีงบ 2567 -> 2023-10-01 ถึง 2024-09-30
     *
     * @return array{start: string, end: string, year: int, label: string}
     */
    public function fiscalYearRange(int $thaiYear): array
    {
        $adYear = $thaiYear - 543;
        $prevAdYear = $adYear - 1;

        return [
            'start' => "{$prevAdYear}-10-01",
            'end' => "{$adYear}-09-30",
            'year' => $thaiYear,
            'label' => "ปีงบประมาณ {$thaiYear} (1 ต.ค. ".($thaiYear - 1)." – 30 ก.ย. {$thaiYear})",
        ];
    }

    /**
     * รายการปีงบประมาณที่รองรับให้เลือก
     *
     * @return list<array{year: int, label: string, is_current: bool, is_previous: bool}>
     */
    public function availableFiscalYears(): array
    {
        $now = now();
        $currentMonth = (int) $now->format('n');
        $currentAdYear = (int) $now->format('Y');

        // ถ้าเดือน >= 10 เป็นปีงบถัดไป
        $currentFyAd = $currentMonth >= 10 ? $currentAdYear + 1 : $currentAdYear;
        $currentFyThai = $currentFyAd + 543;
        $prevFyThai = $currentFyThai - 1;

        $years = [];
        for ($i = 0; $i < 4; $i++) {
            $fy = $currentFyThai - $i;
            $years[] = [
                'year' => $fy,
                'label' => "ปีงบประมาณ {$fy}".($i === 0 ? ' (ปีงบปัจจุบัน)' : ($i === 1 ? ' (ปีงบก่อนหน้า)' : '')),
                'is_current' => $fy === $currentFyThai,
                'is_previous' => $fy === $prevFyThai,
            ];
        }

        return $years;
    }

    /**
     * ดึงแค็ตตาล็อกยาทั้งหมดจาก HOSxP พร้อมคำนวณราคา ว.111
     *
     * @return array{items: list<array<string, mixed>>, summary: array<string, mixed>}
     */
    public function getDrugCatalogWithPricing(bool $round = true): array
    {
        if (! config('database.connections.hosxp')) {
            return ['items' => [], 'summary' => []];
        }

        $tiers = $this->getTiers();

        return Cache::remember('pharmacy_drug_catalog_v2_'.($round ? 'r' : 'u'), 1800, function () use ($tiers, $round) {
            $conn = DB::connection('hosxp');
            $rows = $conn->table('drugitems')
                ->where(function ($q) {
                    $q->whereNull('istatus')
                        ->orWhere('istatus', '')
                        ->orWhere('istatus', 'Y');
                })
                ->orderBy('name')
                ->select([
                    'icode',
                    'name',
                    'strength',
                    'units',
                    'drugaccount',
                    'unitcost',
                    'unitprice',
                    'income',
                ])
                ->get();

            $items = [];
            $totalDrugs = 0;
            $edCount = 0;
            $nedCount = 0;
            $overTierCount = 0;
            $underTierCount = 0;
            $matchTierCount = 0;
            $noCostCount = 0;
            $totalCostSum = 0.0;
            $totalPriceSum = 0.0;

            foreach ($rows as $row) {
                $cost = (float) ($row->unitcost ?? 0);
                $price = (float) ($row->unitprice ?? 0);
                $account = strtoupper(trim((string) ($row->drugaccount ?? '')));
                $isNed = $account === 'NED' || (string) ($row->income ?? '') === '17' || str_contains(strtoupper((string) $row->name), 'NED');
                $isEd = $account === 'ED' || (string) ($row->income ?? '') === '03';

                $tierCalc = $this->calculateTierPrice($cost, $tiers, $round);
                $tierPrice = $tierCalc['price'];

                $margin = $price - $cost;
                $markup = $cost > 0 ? round(($margin / $cost) * 100, 1) : 0.0;
                $marginPercent = $price > 0 ? round(($margin / $price) * 100, 1) : 0.0;

                $diffVsTier = $price - $tierPrice;
                if ($cost <= 0) {
                    $status = 'no_cost';
                    $noCostCount++;
                } elseif (abs($diffVsTier) < 0.01) {
                    $status = 'match';
                    $matchTierCount++;
                } elseif ($diffVsTier > 0) {
                    $status = 'over';
                    $overTierCount++;
                } else {
                    $status = 'under';
                    $underTierCount++;
                }

                if ($isNed) {
                    $nedCount++;
                } else {
                    $edCount++;
                }

                $totalDrugs++;
                $totalCostSum += $cost;
                $totalPriceSum += $price;

                $items[] = [
                    'icode' => (string) $row->icode,
                    'name' => (string) ($row->name ?? $row->icode),
                    'strength' => (string) ($row->strength ?? ''),
                    'units' => (string) ($row->units ?? ''),
                    'drugaccount' => $isNed ? 'NED' : ($isEd ? 'ED' : ($account ?: 'ED')),
                    'is_ned' => $isNed,
                    'unitcost' => $cost,
                    'unitprice' => $price,
                    'tier_price' => $tierPrice,
                    'tier_name' => $tierCalc['tier_name'],
                    'margin' => round($margin, 2),
                    'markup' => $markup,
                    'margin_percent' => $marginPercent,
                    'diff_vs_tier' => round($diffVsTier, 2),
                    'diff_percent' => $tierPrice > 0 ? round(($diffVsTier / $tierPrice) * 100, 1) : 0.0,
                    'status' => $status,
                ];
            }

            $summary = [
                'total_drugs' => $totalDrugs,
                'ed_count' => $edCount,
                'ned_count' => $nedCount,
                'over_tier_count' => $overTierCount,
                'under_tier_count' => $underTierCount,
                'match_tier_count' => $matchTierCount,
                'no_cost_count' => $noCostCount,
                'avg_cost' => $totalDrugs > 0 ? round($totalCostSum / $totalDrugs, 2) : 0.0,
                'avg_price' => $totalDrugs > 0 ? round($totalPriceSum / $totalDrugs, 2) : 0.0,
                'avg_markup' => $totalCostSum > 0 ? round((($totalPriceSum - $totalCostSum) / $totalCostSum) * 100, 1) : 0.0,
            ];

            return ['items' => $items, 'summary' => $summary];
        });
    }

    /**
     * ประมาณการรายได้และผลกระทบจากยอดจ่ายยาจริงปีงบประมาณก่อนหน้า
     *
     * @param  string  $discountScope  all | ned | ed | over_tier
     * @return array<string, mixed>
     */
    public function getFiscalYearProjections(
        int $thaiFiscalYear,
        float $discountPercent = 0.0,
        string $discountScope = 'all',
        bool $round = true,
    ): array {
        $range = $this->fiscalYearRange($thaiFiscalYear);
        $tiers = $this->getTiers();

        // ดึงยอดจ่ายยาปีงบประมาณจาก opitemrece พร้อมแคช 24 ชม.
        $usageCacheKey = "pharmacy_drug_usage_fy_{$thaiFiscalYear}_v1";
        $usageData = Cache::remember($usageCacheKey, 86400, function () use ($range) {
            if (! config('database.connections.hosxp')) {
                return [];
            }

            $conn = DB::connection('hosxp');

            return $conn->table('opitemrece as oi')
                ->join('drugitems as d', 'd.icode', '=', 'oi.icode')
                ->whereBetween('oi.vstdate', [$range['start'], $range['end']])
                ->selectRaw('oi.icode')
                ->selectRaw('COALESCE(SUM(oi.qty), 0) as total_qty')
                ->selectRaw('COALESCE(SUM(oi.sum_price), 0) as actual_revenue')
                ->selectRaw('COUNT(DISTINCT oi.vn) as visit_count')
                ->groupBy('oi.icode')
                ->get()
                ->keyBy('icode')
                ->toArray();
        });

        // ดึง catalog ยา
        $catalog = $this->getDrugCatalogWithPricing($round);
        $drugsByIcode = collect($catalog['items'])->keyBy('icode');

        $totalQtyDispensed = 0.0;
        $totalActualRevenue = 0.0;
        $totalCurrentRevenue = 0.0;
        $totalTierRevenue = 0.0;
        $totalDiscountedRevenue = 0.0;
        $totalCost = 0.0;

        $projectedRows = [];

        // กลุ่มแจกแจง Markup
        $markupTiers = [
            'below_0' => ['label' => 'ขาดทุน (< 0%)', 'count' => 0, 'revenue' => 0.0],
            '0_to_20' => ['label' => '0 – 20%', 'count' => 0, 'revenue' => 0.0],
            '20_to_50' => ['label' => '20 – 50%', 'count' => 0, 'revenue' => 0.0],
            '50_to_100' => ['label' => '50 – 100%', 'count' => 0, 'revenue' => 0.0],
            'above_100' => ['label' => 'มากกว่า 100%', 'count' => 0, 'revenue' => 0.0],
        ];

        // สรุป ED vs NED
        $accountStats = [
            'ED' => [
                'name' => 'ยาในบัญชียาหลัก (ED)',
                'count' => 0,
                'drugs' => 0,
                'qty' => 0.0,
                'current_revenue' => 0.0,
                'revenue_current' => 0.0,
                'tier_revenue' => 0.0,
                'revenue_w111' => 0.0,
                'discounted_revenue' => 0.0,
                'revenue_discounted' => 0.0,
                'revenue_actual' => 0.0,
                'cost' => 0.0,
            ],
            'NED' => [
                'name' => 'ยานอกบัญชียาหลัก (NED)',
                'count' => 0,
                'drugs' => 0,
                'qty' => 0.0,
                'current_revenue' => 0.0,
                'revenue_current' => 0.0,
                'tier_revenue' => 0.0,
                'revenue_w111' => 0.0,
                'discounted_revenue' => 0.0,
                'revenue_discounted' => 0.0,
                'revenue_actual' => 0.0,
                'cost' => 0.0,
            ],
        ];

        foreach ($usageData as $icode => $usage) {
            $drug = $drugsByIcode->get((string) $icode);
            if (! $drug) {
                continue;
            }

            $qty = (float) $usage->total_qty;
            $actualRev = (float) $usage->actual_revenue;
            $cost = (float) $drug['unitcost'];
            $currentPrice = (float) $drug['unitprice'];
            $tierPrice = (float) $drug['tier_price'];
            $isNed = (bool) $drug['is_ned'];
            $status = (string) $drug['status'];

            // พิจารณาว่ายานี้เข้าเกณฑ์ได้รับส่วนลดจำลองหรือไม่
            $eligibleForDiscount = false;
            if ($discountPercent > 0) {
                if ($discountScope === 'all') {
                    $eligibleForDiscount = true;
                } elseif ($discountScope === 'ned' && $isNed) {
                    $eligibleForDiscount = true;
                } elseif ($discountScope === 'ed' && ! $isNed) {
                    $eligibleForDiscount = true;
                } elseif ($discountScope === 'over_tier' && $status === 'over') {
                    $eligibleForDiscount = true;
                }
            }

            $discountedPrice = $eligibleForDiscount
                ? round($currentPrice * (1 - ($discountPercent / 100)), 2)
                : $currentPrice;

            $itemCostTotal = $qty * $cost;
            $currentRevTotal = $qty * $currentPrice;
            $tierRevTotal = $qty * $tierPrice;
            $discountedRevTotal = $qty * $discountedPrice;

            $totalQtyDispensed += $qty;
            $totalActualRevenue += $actualRev;
            $totalCurrentRevenue += $currentRevTotal;
            $totalTierRevenue += $tierRevTotal;
            $totalDiscountedRevenue += $discountedRevTotal;
            $totalCost += $itemCostTotal;

            $deltaVsCurrent = $discountedRevTotal - $currentRevTotal;

            // สถิติ ED / NED
            $accKey = $isNed ? 'NED' : 'ED';
            $accountStats[$accKey]['drugs']++;
            $accountStats[$accKey]['count']++;
            $accountStats[$accKey]['qty'] += $qty;
            $accountStats[$accKey]['current_revenue'] += $currentRevTotal;
            $accountStats[$accKey]['revenue_current'] += $currentRevTotal;
            $accountStats[$accKey]['tier_revenue'] += $tierRevTotal;
            $accountStats[$accKey]['revenue_w111'] += $tierRevTotal;
            $accountStats[$accKey]['discounted_revenue'] += $discountedRevTotal;
            $accountStats[$accKey]['revenue_discounted'] += $discountedRevTotal;
            $accountStats[$accKey]['revenue_actual'] += $actualRev;
            $accountStats[$accKey]['cost'] += $itemCostTotal;

            // Markup distribution
            $markup = (float) $drug['markup'];
            if ($markup < 0) {
                $markupTiers['below_0']['count']++;
                $markupTiers['below_0']['revenue'] += $currentRevTotal;
            } elseif ($markup <= 20) {
                $markupTiers['0_to_20']['count']++;
                $markupTiers['0_to_20']['revenue'] += $currentRevTotal;
            } elseif ($markup <= 50) {
                $markupTiers['20_to_50']['count']++;
                $markupTiers['20_to_50']['revenue'] += $currentRevTotal;
            } elseif ($markup <= 100) {
                $markupTiers['50_to_100']['count']++;
                $markupTiers['50_to_100']['revenue'] += $currentRevTotal;
            } else {
                $markupTiers['above_100']['count']++;
                $markupTiers['above_100']['revenue'] += $currentRevTotal;
            }

            $projectedRows[] = [
                'icode' => $drug['icode'],
                'name' => $drug['name'],
                'strength' => $drug['strength'],
                'units' => $drug['units'],
                'drugaccount' => $drug['drugaccount'],
                'is_ned' => $isNed,
                'is_ed' => ! $isNed,
                'status' => $status,
                'unitcost' => $cost,
                'unitprice' => $currentPrice,
                'tier_price' => $tierPrice,
                'discounted_price' => $discountedPrice,
                'discount_applied' => $eligibleForDiscount,
                'qty' => $qty,
                'price_before' => $currentPrice,
                'price_after' => $discountedPrice,
                'revenue_before' => round($currentRevTotal, 2),
                'revenue_after' => round($discountedRevTotal, 2),
                'diff_baht' => round($deltaVsCurrent, 2),
                'actual_revenue' => round($actualRev, 2),
                'current_revenue' => round($currentRevTotal, 2),
                'revenue_current' => round($currentRevTotal, 2),
                'revenue_actual' => round($actualRev, 2),
                'tier_revenue' => round($tierRevTotal, 2),
                'discounted_revenue' => round($discountedRevTotal, 2),
                'total_cost' => round($itemCostTotal, 2),
                'delta_vs_current' => round($deltaVsCurrent, 2),
                'margin_current' => round($currentRevTotal - $itemCostTotal, 2),
                'margin_discounted' => round($discountedRevTotal - $itemCostTotal, 2),
            ];
        }

        // จัดอันดับยาที่ได้รับผลกระทบสูงสุดจากการลดราคา (Delta ลดลงมากที่สุด)
        usort($projectedRows, fn ($a, $b) => $a['delta_vs_current'] <=> $b['delta_vs_current']);
        $topAffectedDrugs = array_slice($projectedRows, 0, 50);

        // จัดอันดับยาตามยอดรายได้ปัจจุบันสูงสุด
        $sortedByRevenue = $projectedRows;
        usort($sortedByRevenue, fn ($a, $b) => $b['current_revenue'] <=> $a['current_revenue']);
        $topRevenueDrugs = array_slice($sortedByRevenue, 0, 50);

        // กำไรส่วนเกิน (Gross Margins)
        $actualMargin = $totalActualRevenue - $totalCost;
        $currentMargin = $totalCurrentRevenue - $totalCost;
        $tierMargin = $totalTierRevenue - $totalCost;
        $discountedMargin = $totalDiscountedRevenue - $totalCost;

        // ส่วนต่างผลกระทบต่อรายรับ (Impacts)
        $deltaVsCurrent = $totalDiscountedRevenue - $totalCurrentRevenue;
        $deltaPercentVsCurrent = $totalCurrentRevenue > 0
            ? round(($deltaVsCurrent / $totalCurrentRevenue) * 100, 2)
            : 0.0;

        $deltaVsActual = $totalDiscountedRevenue - $totalActualRevenue;
        $deltaPercentVsActual = $totalActualRevenue > 0
            ? round(($deltaVsActual / $totalActualRevenue) * 100, 2)
            : 0.0;

        $deltaVsTier = $totalDiscountedRevenue - $totalTierRevenue;
        $deltaPercentVsTier = $totalTierRevenue > 0
            ? round(($deltaVsTier / $totalTierRevenue) * 100, 2)
            : 0.0;

        $actualScenario = [
            'label' => '1. รายได้จริงปีงบก่อนหน้า',
            'revenue' => round($totalActualRevenue, 2),
            'cost' => round($totalCost, 2),
            'margin' => round($actualMargin, 2),
            'margin_percent' => $totalActualRevenue > 0 ? round(($actualMargin / $totalActualRevenue) * 100, 1) : 0,
            'color' => '#64748B',
        ];

        $currentScenario = [
            'label' => '2. ประมาณการจากราคาปัจจุบัน',
            'revenue' => round($totalCurrentRevenue, 2),
            'cost' => round($totalCost, 2),
            'margin' => round($currentMargin, 2),
            'margin_percent' => $totalCurrentRevenue > 0 ? round(($currentMargin / $totalCurrentRevenue) * 100, 1) : 0,
            'color' => '#0F766E',
        ];

        $tierScenario = [
            'label' => '3. ประมาณการตามเกณฑ์ ว.111',
            'revenue' => round($totalTierRevenue, 2),
            'cost' => round($totalCost, 2),
            'margin' => round($tierMargin, 2),
            'margin_percent' => $totalTierRevenue > 0 ? round(($tierMargin / $totalTierRevenue) * 100, 1) : 0,
            'color' => '#2563EB',
        ];

        $discountedScenario = [
            'label' => '4. ประมาณการหลังลดราคา ('.$discountPercent.'%)',
            'revenue' => round($totalDiscountedRevenue, 2),
            'cost' => round($totalCost, 2),
            'margin' => round($discountedMargin, 2),
            'margin_percent' => $totalDiscountedRevenue > 0 ? round(($discountedMargin / $totalDiscountedRevenue) * 100, 1) : 0,
            'color' => '#EA580C',
        ];

        $diffCurrentVsActual = [
            'baht' => round($totalCurrentRevenue - $totalActualRevenue, 2),
            'percent' => $totalActualRevenue > 0 ? round((($totalCurrentRevenue - $totalActualRevenue) / $totalActualRevenue) * 100, 2) : 0.0,
        ];
        $diffW111VsCurrent = [
            'baht' => round($totalTierRevenue - $totalCurrentRevenue, 2),
            'percent' => $totalCurrentRevenue > 0 ? round((($totalTierRevenue - $totalCurrentRevenue) / $totalCurrentRevenue) * 100, 2) : 0.0,
        ];
        $diffDiscountVsCurrent = [
            'baht' => round($deltaVsCurrent, 2),
            'percent' => $deltaPercentVsCurrent,
        ];
        $diffDiscountVsActual = [
            'baht' => round($deltaVsActual, 2),
            'percent' => $deltaPercentVsActual,
        ];

        $totalMarkupCount = array_sum(array_column($markupTiers, 'count'));
        foreach ($markupTiers as $key => &$tierItem) {
            $tierItem['range'] = $key;
            $tierItem['percent'] = $totalMarkupCount > 0 ? round(($tierItem['count'] / $totalMarkupCount) * 100, 1) : 0.0;
        }
        unset($tierItem);

        return [
            'fiscal_year' => $range,
            'discount' => [
                'percent' => $discountPercent,
                'scope' => $discountScope,
            ],
            'scenarios' => [
                'actual' => $actualScenario,
                'historical_actual' => $actualScenario,
                'current' => $currentScenario,
                'current_price' => $currentScenario,
                'tier_rule' => $tierScenario,
                'tier_w111' => $tierScenario,
                'discounted' => $discountedScenario,
            ],
            'impact' => [
                'delta_vs_current' => round($deltaVsCurrent, 2),
                'delta_percent_vs_current' => $deltaPercentVsCurrent,
                'delta_vs_actual' => round($deltaVsActual, 2),
                'delta_percent_vs_actual' => $deltaPercentVsActual,
                'delta_vs_tier' => round($deltaVsTier, 2),
                'delta_percent_vs_tier' => $deltaPercentVsTier,
                'margin_impact' => round($discountedMargin - $currentMargin, 2),
                'diff_current_vs_actual' => $diffCurrentVsActual,
                'diff_w111_vs_current' => $diffW111VsCurrent,
                'diff_discount_vs_current' => $diffDiscountVsCurrent,
                'diff_discount_vs_actual' => $diffDiscountVsActual,
            ],
            'account_stats' => array_values($accountStats),
            'markup_distribution' => array_values($markupTiers),
            'top_affected_drugs' => $topAffectedDrugs,
            'top_revenue_drugs' => $topRevenueDrugs,
            'dispensed_by_icode' => collect($projectedRows)->mapWithKeys(fn ($r) => [$r['icode'] => ['qty' => $r['qty'], 'revenue' => $r['actual_revenue']]])->all(),
            'total_dispensed_items' => count($projectedRows),
            'total_qty_dispensed' => round($totalQtyDispensed, 2),
        ];
    }

    /**
     * ดึงข้อมูลรายละเอียดเชิงลึกของรายการยาตัวใดตัวหนึ่ง (Drill-Down Detail)
     * รวมสูตรการคำนวณ ว.111 ทีละขั้นตอน และสถิติการจ่าย 12 เดือนของปีงบประมาณ
     *
     * @return array<string, mixed>
     */
    public function getDrugDetailBreakdown(
        string $icode,
        int $thaiFiscalYear,
        float $discountPercent = 0.0,
        string $discountScope = 'all',
        bool $round = true
    ): array {
        if (! config('database.connections.hosxp')) {
            return ['error' => 'ไม่ได้เชื่อมต่อฐานข้อมูล HOSxP'];
        }

        $cacheKey = "pharmacy_drug_detail_{$icode}_{$thaiFiscalYear}_".($round ? 'r' : 'u')."_{$discountPercent}_{$discountScope}";

        return Cache::remember($cacheKey, 1800, function () use ($icode, $thaiFiscalYear, $discountPercent, $discountScope, $round) {
            $conn = DB::connection('hosxp');

            $drug = $conn->table('drugitems')
                ->where('icode', $icode)
                ->first();

            if (! $drug) {
                return ['error' => "ไม่พบข้อมูลรายการยารหัส {$icode} ในระบบ HOSxP"];
            }

            $unitCost = (float) ($drug->unitcost ?? 0.0);
            $unitPrice = (float) ($drug->unitprice ?? 0.0);
            $account = strtoupper(trim((string) ($drug->drugaccount ?? '')));
            $isNed = $account === 'NED' || (string) ($drug->income ?? '') === '17' || str_contains(strtoupper((string) ($drug->name ?? '')), 'NED');
            $isEd = ! $isNed;

            // คำนวณเกณฑ์ ว.111 ทีละขั้นตอน
            $tiers = $this->getTiers();
            $matchedTier = null;
            $preRoundPrice = 0.0;
            $formulaExplanation = '';

            if ($unitCost <= 0) {
                $formulaExplanation = 'ราคาทุน 0 บาท ไม่สามารถคำนวณตามเกณฑ์ ว.111 ได้';
                $tierPrice = 0.0;
            } else {
                foreach ($tiers as $tier) {
                    $min = (float) $tier->min_cost;
                    $max = $tier->max_cost !== null ? (float) $tier->max_cost : null;

                    if ($unitCost >= $min && ($max === null || $unitCost <= $max)) {
                        $matchedTier = $tier;
                        break;
                    }
                }

                if ($matchedTier) {
                    $calcType = $matchedTier->calc_type;
                    $basePrice = (float) $matchedTier->base_price;
                    $baseCost = (float) $matchedTier->base_cost;
                    $multPct = (float) $matchedTier->multiplier_percent;

                    if ($calcType === 'fixed') {
                        $preRoundPrice = $basePrice;
                        $formulaExplanation = "ราคาขายคงที่ตามเกณฑ์ช่วงราคา = {$basePrice} บาท";
                    } elseif ($calcType === 'markup_percent' || $calcType === 'multiplier_cost') {
                        $preRoundPrice = $unitCost * (1 + ($multPct / 100));
                        $formulaExplanation = "ต้นทุน ({$unitCost}) × (1 + {$multPct}%) = ".round($preRoundPrice, 4).' บาท';
                    } elseif ($calcType === 'base_plus_percent' || $calcType === 'markup_excess') {
                        $excess = max(0.0, $unitCost - $baseCost);
                        $markupAmount = $excess * ($multPct / 100);
                        $preRoundPrice = $basePrice + $markupAmount;
                        $formulaExplanation = "ราคาฐาน ({$basePrice}) + [{$multPct}% × (ต้นทุน {$unitCost} - ทุนฐาน {$baseCost})] = ".round($preRoundPrice, 4).' บาท';
                    } else {
                        $preRoundPrice = $basePrice;
                        $formulaExplanation = "ราคาฐาน = {$basePrice} บาท";
                    }

                    $tierPrice = $round
                        ? DrugPricingTier::roundHospitalPrice($preRoundPrice)
                        : round($preRoundPrice, 2);
                } else {
                    $preRoundPrice = $unitCost * 1.2;
                    $tierPrice = $round
                        ? DrugPricingTier::roundHospitalPrice($preRoundPrice)
                        : round($preRoundPrice, 2);
                    $formulaExplanation = "ไม่อยู่ในเกณฑ์กำหนด คำนวณราคาบวก 20% = {$unitCost} × 1.2 = ".round($preRoundPrice, 4).' บาท';
                }
            }

            // สถานะเปรียบเทียบ ว.111
            $diffVsTier = $unitPrice - $tierPrice;
            if ($unitCost <= 0) {
                $status = 'no_cost';
                $statusLabel = 'ไม่มีข้อมูลทุน';
            } elseif (abs($diffVsTier) < 0.01) {
                $status = 'match';
                $statusLabel = 'ตรงตามเกณฑ์ ว.111';
            } elseif ($diffVsTier > 0) {
                $status = 'over';
                $statusLabel = 'สูงกว่าเกณฑ์ ว.111';
            } else {
                $status = 'under';
                $statusLabel = 'ต่ำกว่าเกณฑ์ ว.111';
            }

            // คำนวณจำลองส่วนลด
            $eligibleForDiscount = false;
            if ($discountPercent > 0) {
                if ($discountScope === 'all') {
                    $eligibleForDiscount = true;
                } elseif ($discountScope === 'ned' && $isNed) {
                    $eligibleForDiscount = true;
                } elseif ($discountScope === 'ed' && $isEd) {
                    $eligibleForDiscount = true;
                } elseif ($discountScope === 'over_tier' && $status === 'over') {
                    $eligibleForDiscount = true;
                }
            }

            $discountedPrice = $eligibleForDiscount
                ? round($unitPrice * (1 - ($discountPercent / 100)), 2)
                : $unitPrice;

            // สถิติจ่ายยา 12 เดือนในรอบปีงบประมาณ
            $range = $this->fiscalYearRange($thaiFiscalYear);
            $adYear = $thaiFiscalYear - 543;
            $prevAdYear = $adYear - 1;

            $monthlyUsage = $conn->table('opitemrece as oi')
                ->where('oi.icode', $icode)
                ->whereBetween('oi.vstdate', [$range['start'], $range['end']])
                ->selectRaw("DATE_FORMAT(oi.vstdate, '%Y-%m') as ym")
                ->selectRaw('COALESCE(SUM(oi.qty), 0) as total_qty')
                ->selectRaw('COALESCE(SUM(oi.sum_price), 0) as total_revenue')
                ->selectRaw("COALESCE(SUM(CASE WHEN oi.vn IS NOT NULL AND (oi.an IS NULL OR oi.an = '') THEN oi.qty ELSE 0 END), 0) as opd_qty")
                ->selectRaw("COALESCE(SUM(CASE WHEN oi.an IS NOT NULL AND oi.an != '' THEN oi.qty ELSE 0 END), 0) as ipd_qty")
                ->selectRaw("COALESCE(SUM(CASE WHEN oi.vn IS NOT NULL AND (oi.an IS NULL OR oi.an = '') THEN oi.sum_price ELSE 0 END), 0) as opd_revenue")
                ->selectRaw("COALESCE(SUM(CASE WHEN oi.an IS NOT NULL AND oi.an != '' THEN oi.sum_price ELSE 0 END), 0) as ipd_revenue")
                ->selectRaw('COUNT(DISTINCT oi.vn) as visit_count')
                ->groupBy('ym')
                ->orderBy('ym')
                ->get()
                ->keyBy('ym');

            // สร้าง 12 เดือนของปีงบประมาณ ต.ค. - ก.ย.
            $monthTemplates = [
                ['m' => '10', 'y' => $prevAdYear, 'name' => 'ต.ค. '.($thaiFiscalYear - 1 - 2500)],
                ['m' => '11', 'y' => $prevAdYear, 'name' => 'พ.ย. '.($thaiFiscalYear - 1 - 2500)],
                ['m' => '12', 'y' => $prevAdYear, 'name' => 'ธ.ค. '.($thaiFiscalYear - 1 - 2500)],
                ['m' => '01', 'y' => $adYear, 'name' => 'ม.ค. '.($thaiFiscalYear - 2500)],
                ['m' => '02', 'y' => $adYear, 'name' => 'ก.พ. '.($thaiFiscalYear - 2500)],
                ['m' => '03', 'y' => $adYear, 'name' => 'มี.ค. '.($thaiFiscalYear - 2500)],
                ['m' => '04', 'y' => $adYear, 'name' => 'เม.ย. '.($thaiFiscalYear - 2500)],
                ['m' => '05', 'y' => $adYear, 'name' => 'พ.ค. '.($thaiFiscalYear - 2500)],
                ['m' => '06', 'y' => $adYear, 'name' => 'มิ.ย. '.($thaiFiscalYear - 2500)],
                ['m' => '07', 'y' => $adYear, 'name' => 'ก.ค. '.($thaiFiscalYear - 2500)],
                ['m' => '08', 'y' => $adYear, 'name' => 'ส.ค. '.($thaiFiscalYear - 2500)],
                ['m' => '09', 'y' => $adYear, 'name' => 'ก.ย. '.($thaiFiscalYear - 2500)],
            ];

            $monthsData = [];
            $totalQty = 0.0;
            $totalActualRevenue = 0.0;
            $totalOpdQty = 0.0;
            $totalIpdQty = 0.0;
            $totalOpdRevenue = 0.0;
            $totalIpdRevenue = 0.0;
            $totalVisits = 0;

            foreach ($monthTemplates as $tmpl) {
                $ym = "{$tmpl['y']}-{$tmpl['m']}";
                $row = $monthlyUsage->get($ym);

                $mQty = (float) ($row->total_qty ?? 0);
                $mRev = (float) ($row->total_revenue ?? 0);
                $mOpdQty = (float) ($row->opd_qty ?? 0);
                $mIpdQty = (float) ($row->ipd_qty ?? 0);
                $mOpdRev = (float) ($row->opd_revenue ?? 0);
                $mIpdRev = (float) ($row->ipd_revenue ?? 0);
                $mVisits = (int) ($row->visit_count ?? 0);

                $totalQty += $mQty;
                $totalActualRevenue += $mRev;
                $totalOpdQty += $mOpdQty;
                $totalIpdQty += $mIpdQty;
                $totalOpdRevenue += $mOpdRev;
                $totalIpdRevenue += $mIpdRev;
                $totalVisits += $mVisits;

                $monthsData[] = [
                    'ym' => $ym,
                    'month_name' => $tmpl['name'],
                    'qty' => $mQty,
                    'revenue' => round($mRev, 2),
                    'opd_qty' => $mOpdQty,
                    'ipd_qty' => $mIpdQty,
                    'opd_revenue' => round($mOpdRev, 2),
                    'ipd_revenue' => round($mIpdRev, 2),
                    'visits' => $mVisits,
                ];
            }

            // คำนวณประมาณการรายได้และผลกระทบของยานี้
            $revCurrent = round($totalQty * $unitPrice, 2);
            $revTier = round($totalQty * $tierPrice, 2);
            $revDiscounted = round($totalQty * $discountedPrice, 2);
            $costTotal = round($totalQty * $unitCost, 2);

            $marginCurrent = round($revCurrent - $costTotal, 2);
            $marginDiscounted = round($revDiscounted - $costTotal, 2);
            $impactBaht = round($revDiscounted - $revCurrent, 2);
            $impactPercent = $revCurrent > 0 ? round(($impactBaht / $revCurrent) * 100, 2) : 0.0;

            return [
                'drug' => [
                    'icode' => (string) $drug->icode,
                    'name' => (string) ($drug->name ?? ''),
                    'generic_name' => (string) ($drug->generic_name ?? ''),
                    'strength' => (string) ($drug->strength ?? ''),
                    'units' => (string) ($drug->units ?? ''),
                    'dosageform' => (string) ($drug->dosageform ?? ''),
                    'drugaccount' => $isNed ? 'NED' : ($account ?: 'ED'),
                    'is_ned' => $isNed,
                    'is_ed' => $isEd,
                    'unitcost' => $unitCost,
                    'unitprice' => $unitPrice,
                    'margin_baht' => round($unitPrice - $unitCost, 2),
                    'margin_percent' => $unitPrice > 0 ? round((($unitPrice - $unitCost) / $unitPrice) * 100, 1) : 0.0,
                    'markup_percent' => $unitCost > 0 ? round((($unitPrice - $unitCost) / $unitCost) * 100, 1) : 0.0,
                    'income' => (string) ($drug->income ?? ''),
                    'istatus' => (string) ($drug->istatus ?? 'Y'),
                ],
                'pricing' => [
                    'tier_name' => $matchedTier ? $matchedTier->name : 'นอกเกณฑ์',
                    'tier_order' => $matchedTier ? $matchedTier->order : 0,
                    'min_cost' => $matchedTier ? (float) $matchedTier->min_cost : 0.0,
                    'max_cost' => $matchedTier && $matchedTier->max_cost !== null ? (float) $matchedTier->max_cost : null,
                    'calc_type' => $matchedTier ? $matchedTier->calc_type : 'fixed',
                    'base_price' => $matchedTier ? (float) $matchedTier->base_price : 0.0,
                    'base_cost' => $matchedTier ? (float) $matchedTier->base_cost : 0.0,
                    'multiplier_percent' => $matchedTier ? (float) $matchedTier->multiplier_percent : 0.0,
                    'formula_explanation' => $formulaExplanation,
                    'pre_round_price' => round($preRoundPrice, 4),
                    'tier_price' => $tierPrice,
                    'rounding_applied' => $round && abs($preRoundPrice - $tierPrice) > 0.001,
                    'diff_vs_tier' => round($diffVsTier, 2),
                    'diff_percent' => $tierPrice > 0 ? round(($diffVsTier / $tierPrice) * 100, 1) : 0.0,
                    'status' => $status,
                    'status_label' => $statusLabel,
                ],
                'simulation' => [
                    'discount_percent' => $discountPercent,
                    'discount_scope' => $discountScope,
                    'eligible_for_discount' => $eligibleForDiscount,
                    'discounted_price' => $discountedPrice,
                    'discount_baht_per_unit' => round($unitPrice - $discountedPrice, 2),
                ],
                'fiscal_year' => $range,
                'monthly_usage' => $monthsData,
                'totals' => [
                    'total_qty' => round($totalQty, 2),
                    'total_revenue_actual' => round($totalActualRevenue, 2),
                    'opd_qty' => round($totalOpdQty, 2),
                    'ipd_qty' => round($totalIpdQty, 2),
                    'opd_revenue' => round($totalOpdRevenue, 2),
                    'ipd_revenue' => round($totalIpdRevenue, 2),
                    'total_visits' => $totalVisits,
                    'cost_total' => $costTotal,
                    'revenue_current' => $revCurrent,
                    'revenue_tier' => $revTier,
                    'revenue_discounted' => $revDiscounted,
                    'margin_current' => $marginCurrent,
                    'margin_discounted' => $marginDiscounted,
                    'impact_baht' => $impactBaht,
                    'impact_percent' => $impactPercent,
                ],
            ];
        });
    }
}
