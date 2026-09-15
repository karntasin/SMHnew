<?php

namespace App\Services\Env;

use App\Models\EnvUtilityExpenseCategory;
use App\Models\EnvUtilityExpenseEntry;
use App\Support\ThaiFiscalPeriod;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class EnvUtilityExpenseImportService
{
    /** @var array<string, array{code: string, name: string, flags: array<string, bool>}> */
    private const CATEGORIES = [
        'electricity' => [
            'code' => 'electricity',
            'name' => 'ค่าไฟฟ้า',
            'flags' => ['has_invoice' => true, 'has_medical' => true, 'has_revenue' => true, 'has_admin' => false, 'has_line_items' => true],
        ],
        'water' => [
            'code' => 'water',
            'name' => 'ค่าน้ำประปา',
            'flags' => ['has_invoice' => true, 'has_medical' => true, 'has_revenue' => true, 'has_admin' => false, 'has_line_items' => false],
        ],
        'sp3' => [
            'code' => 'sp3',
            'name' => 'สป.3 ค่าน้ำมันดีเซล',
            'flags' => ['has_invoice' => false, 'has_medical' => true, 'has_revenue' => true, 'has_admin' => false, 'has_line_items' => false],
            'sensitive' => true,
        ],
        'internet' => [
            'code' => 'internet',
            'name' => 'ค่าอินเทอร์เน็ต',
            'flags' => ['has_invoice' => false, 'has_medical' => false, 'has_revenue' => true, 'has_admin' => false, 'has_line_items' => true],
        ],
        'phone' => [
            'code' => 'phone',
            'name' => 'ค่าโทรศัพท์',
            'flags' => ['has_invoice' => false, 'has_medical' => false, 'has_revenue' => true, 'has_admin' => true, 'has_line_items' => false],
        ],
        'postage' => [
            'code' => 'postage',
            'name' => 'ค่าไปรษณีย์',
            'flags' => ['has_invoice' => false, 'has_medical' => false, 'has_revenue' => true, 'has_admin' => true, 'has_line_items' => false],
        ],
        'oxygen' => [
            'code' => 'oxygen',
            'name' => 'ค่าออกซิเจน',
            'flags' => ['has_invoice' => false, 'has_medical' => false, 'has_revenue' => true, 'has_admin' => false, 'has_line_items' => false],
        ],
        'technician' => [
            'code' => 'technician',
            'name' => 'ค่าอุปกรณ์ช่าง',
            'flags' => ['has_invoice' => false, 'has_medical' => false, 'has_revenue' => true, 'has_admin' => false, 'has_line_items' => false],
        ],
        'clinic_electricity' => [
            'code' => 'clinic_electricity',
            'name' => 'ค่าไฟหน่วยตรวจโรค',
            'flags' => ['has_invoice' => false, 'has_medical' => false, 'has_revenue' => true, 'has_admin' => false, 'has_line_items' => false],
        ],
        'clinic_water' => [
            'code' => 'clinic_water',
            'name' => 'ค่าน้ำหน่วยตรวจโรค',
            'flags' => ['has_invoice' => false, 'has_medical' => false, 'has_revenue' => true, 'has_admin' => false, 'has_line_items' => false],
        ],
        'ac_meter' => [
            'code' => 'ac_meter',
            'name' => 'มิเตอร์แอร์',
            'flags' => ['has_invoice' => false, 'has_medical' => false, 'has_revenue' => true, 'has_admin' => false, 'has_line_items' => true],
        ],
    ];

    /**
     * @return array{categories: int, entries: int}
     */
    public function import(string $path, bool $fresh = false): array
    {
        if (! is_file($path)) {
            throw new \InvalidArgumentException("File not found: {$path}");
        }

        $stats = ['categories' => 0, 'entries' => 0];

        DB::transaction(function () use ($path, $fresh, &$stats) {
            if ($fresh) {
                EnvUtilityExpenseEntry::query()->delete();
            }

            $categories = $this->ensureCategories();
            $stats['categories'] = $categories->count();

            $spreadsheet = IOFactory::load($path);

            foreach ($spreadsheet->getSheetNames() as $index => $sheetName) {
                $ws = $spreadsheet->getSheet($index);
                $name = trim($sheetName);

                if (str_contains($name, 'มิเต') || str_contains($name, 'มิเตอ') || str_contains($name, 'แอร์')) {
                    if (! isset($categories['ac_meter'])) {
                        continue;
                    }
                    $stats['entries'] += $this->importAcMeterSheet($ws, $categories['ac_meter']);

                    continue;
                }

                $code = $this->sheetToCategoryCode($name);
                if (! $code || ! isset($categories[$code])) {
                    continue;
                }

                $stats['entries'] += match ($code) {
                    'electricity', 'water' => $this->importInvoiceBudgetSheet($ws, $categories[$code], $code === 'electricity'),
                    'sp3' => $this->importSp3Sheet($ws, $categories[$code]),
                    'internet' => $this->importInternetSheet($ws, $categories[$code]),
                    'phone', 'postage' => $this->importRevenueAdminSheet($ws, $categories[$code]),
                    default => $this->importSimpleRevenueSheet($ws, $categories[$code]),
                };
            }
        });

        return $stats;
    }

    /**
     * @return \Illuminate\Support\Collection<string, EnvUtilityExpenseCategory>
     */
    public function ensureCategories()
    {
        $order = 0;
        $map = collect();
        foreach (self::CATEGORIES as $def) {
            $order++;
            $cat = EnvUtilityExpenseCategory::updateOrCreate(
                ['code' => $def['code']],
                [
                    'name' => $def['name'],
                    'is_sensitive' => (bool) ($def['sensitive'] ?? false),
                    'sort_order' => $order,
                    ...$def['flags'],
                ]
            );
            $map[$def['code']] = $cat;
        }

        return $map;
    }

    private function sheetToCategoryCode(string $name): ?string
    {
        return match (true) {
            str_contains($name, 'ไฟฟ้า') && ! str_contains($name, 'หน่วย') => 'electricity',
            str_contains($name, 'ปะปา') || str_contains($name, 'ประปา') => 'water',
            str_contains($name, 'สป.3') || str_contains($name, 'สป3') => 'sp3',
            str_contains($name, 'อินเตอร์') || str_contains($name, 'อินเทอร์') => 'internet',
            str_contains($name, 'โทรศัพท์') => 'phone',
            str_contains($name, 'ไปรษณีย์') => 'postage',
            str_contains($name, 'ออกซิเจน') || str_contains($name, 'อ๊อกซิเจน') => 'oxygen',
            str_contains($name, 'ช่าง') => 'technician',
            str_contains($name, 'ไฟหน่วย') => 'clinic_electricity',
            str_contains($name, 'น้ำหน่วย') => 'clinic_water',
            default => null,
        };
    }

    private function importInvoiceBudgetSheet(Worksheet $ws, EnvUtilityExpenseCategory $category, bool $allowExtraLines): int
    {
        $count = 0;
        $currentPeriod = null;
        $highestRow = $ws->getHighestDataRow();

        for ($r = 2; $r <= $highestRow; $r++) {
            $a = $this->cell($ws, 1, $r);
            $b = $this->money($this->cell($ws, 2, $r));
            $c = $this->money($this->cell($ws, 3, $r));
            $d = $this->money($this->cell($ws, 4, $r));
            $e = $this->cell($ws, 5, $r);

            if ($a !== '' && (str_contains($a, 'รวม') || str_contains($a, 'เดือนปี'))) {
                continue;
            }

            $period = $a !== '' ? ThaiFiscalPeriod::parse($a) : null;
            if ($period) {
                $currentPeriod = $period;
                $this->upsertEntry($category, $period, [
                    'invoice_amount' => $b,
                    'budget_medical' => $c,
                    'budget_revenue' => $d,
                    'line_label' => '',
                    'note' => $e !== '' ? $e : null,
                ]);
                $count++;

                continue;
            }

            if ($allowExtraLines && $currentPeriod && ($b !== null || $c !== null || $d !== null)) {
                $label = $e !== '' ? $e : 'รายการเพิ่มเติม';
                $this->upsertEntry($category, $currentPeriod, [
                    'invoice_amount' => $b,
                    'budget_medical' => $c,
                    'budget_revenue' => $d,
                    'line_label' => $label,
                    'note' => $e !== '' ? $e : null,
                ]);
                $count++;
            }
        }

        return $count;
    }

    private function importSp3Sheet(Worksheet $ws, EnvUtilityExpenseCategory $category): int
    {
        $count = 0;
        $highestRow = $ws->getHighestDataRow();
        for ($r = 2; $r <= $highestRow; $r++) {
            $a = $this->cell($ws, 1, $r);
            if ($a === '' || str_contains($a, 'รวม') || str_contains($a, 'เดือนปี')) {
                continue;
            }
            $period = ThaiFiscalPeriod::parse($a);
            if (! $period) {
                continue;
            }
            $revenue = $this->money($this->cell($ws, 2, $r));
            $medical = $this->money($this->cell($ws, 3, $r));
            $note = $this->cell($ws, 4, $r);
            if ($revenue === null && $medical === null && $note === '') {
                continue;
            }
            $this->upsertEntry($category, $period, [
                'budget_revenue' => $revenue,
                'budget_medical' => $medical,
                'amount' => $revenue ?? $medical,
                'line_label' => '',
                'note' => $note !== '' ? $note : null,
            ]);
            $count++;
        }

        return $count;
    }

    private function importInternetSheet(Worksheet $ws, EnvUtilityExpenseCategory $category): int
    {
        $count = 0;
        $currentPeriod = null;
        $highestRow = $ws->getHighestDataRow();
        for ($r = 2; $r <= $highestRow; $r++) {
            $a = $this->cell($ws, 1, $r);
            $b = $this->money($this->cell($ws, 2, $r));
            $c = $this->cell($ws, 3, $r);

            if ($a !== '' && str_contains($a, 'รวม')) {
                continue;
            }

            $period = $a !== '' ? ThaiFiscalPeriod::parse($a) : null;
            if ($period) {
                $currentPeriod = $period;
            }
            if (! $currentPeriod || $b === null) {
                continue;
            }

            $label = $c !== '' ? $c : ('รายการ-'.$r);
            $this->upsertEntry($category, $currentPeriod, [
                'budget_revenue' => $b,
                'amount' => $b,
                'line_label' => $label,
                'note' => $c !== '' ? $c : null,
            ]);
            $count++;
        }

        return $count;
    }

    private function importRevenueAdminSheet(Worksheet $ws, EnvUtilityExpenseCategory $category): int
    {
        $count = 0;
        $highestRow = $ws->getHighestDataRow();
        for ($r = 2; $r <= $highestRow; $r++) {
            $a = $this->cell($ws, 1, $r);
            if ($a === '' || str_contains($a, 'รวม') || str_contains($a, 'เดือนปี')) {
                continue;
            }
            $period = ThaiFiscalPeriod::parse($a);
            if (! $period) {
                continue;
            }
            $revenue = $this->money($this->cell($ws, 2, $r));
            $admin = $this->money($this->cell($ws, 3, $r));
            $note = $this->cell($ws, 4, $r);
            if ($revenue === null && $admin === null) {
                continue;
            }
            $this->upsertEntry($category, $period, [
                'budget_revenue' => $revenue,
                'budget_admin' => $admin,
                'amount' => ($revenue ?? 0) + ($admin ?? 0),
                'line_label' => '',
                'note' => $note !== '' ? $note : null,
            ]);
            $count++;
        }

        return $count;
    }

    private function importSimpleRevenueSheet(Worksheet $ws, EnvUtilityExpenseCategory $category): int
    {
        $count = 0;
        $highestRow = $ws->getHighestDataRow();
        for ($r = 2; $r <= $highestRow; $r++) {
            $a = $this->cell($ws, 1, $r);
            if ($a === '' || str_contains($a, 'รวม') || str_contains($a, 'เดือนปี')) {
                continue;
            }
            $period = ThaiFiscalPeriod::parse($a);
            if (! $period) {
                continue;
            }
            $amount = $this->money($this->cell($ws, 2, $r));
            $note = $this->cell($ws, 3, $r);
            if ($amount === null) {
                continue;
            }
            $this->upsertEntry($category, $period, [
                'budget_revenue' => $amount,
                'amount' => $amount,
                'line_label' => '',
                'note' => $note !== '' ? $note : null,
            ]);
            $count++;
        }

        return $count;
    }

    private function importAcMeterSheet(Worksheet $ws, EnvUtilityExpenseCategory $category): int
    {
        $count = 0;
        $highestRow = $ws->getHighestDataRow();

        for ($r = 1; $r <= $highestRow; $r++) {
            $bHeader = $this->cell($ws, 2, $r);
            $dHeader = $this->cell($ws, 4, $r);

            if (! (str_contains($bHeader, 'มิเตอร์') || str_contains($bHeader, 'ประจำแผนก'))) {
                continue;
            }

            $currPeriod = ThaiFiscalPeriod::parse($dHeader);
            if (! $currPeriod) {
                continue;
            }

            for ($row = $r + 1; $row <= $highestRow; $row++) {
                $name = $this->cell($ws, 2, $row);
                if ($name === '' || str_contains($name, 'รวม')) {
                    break;
                }
                if ($name === 'ลำดับ' || str_starts_with($name, 'ทะเบียนคุม')) {
                    break;
                }

                $prev = $this->money($this->cell($ws, 3, $row));
                $curr = $this->money($this->cell($ws, 4, $row));
                $units = $this->money($this->cell($ws, 5, $row));
                $rate = $this->money($this->cell($ws, 6, $row)) ?? (float) config('env_utility.default_ac_rate', 4.45);
                $cost = $this->money($this->cell($ws, 7, $row));
                $note = $this->cell($ws, 8, $row);

                if ($units === null && $prev !== null && $curr !== null) {
                    $units = $curr - $prev;
                }
                if ($cost === null && $units !== null) {
                    $cost = round($units * $rate, 2);
                }
                if ($cost === null) {
                    continue;
                }

                $detail = trim(implode(' · ', array_filter([
                    $prev !== null && $curr !== null ? "มิเตอร์ {$prev}→{$curr}" : null,
                    $units !== null ? "{$units} หน่วย" : null,
                    "อัตรา {$rate}",
                    $note !== '' ? $note : null,
                ])));

                $this->upsertEntry($category, $currPeriod, [
                    'budget_revenue' => $cost,
                    'amount' => $cost,
                    'line_label' => $name,
                    'note' => $detail !== '' ? $detail : null,
                ]);
                $count++;
            }
        }

        return $count;
    }

    /**
     * @param  array{year_be: int, month: int, fiscal_year_be: int}  $period
     * @param  array<string, mixed>  $data
     */
    private function upsertEntry(EnvUtilityExpenseCategory $category, array $period, array $data): void
    {
        $lineLabel = (string) ($data['line_label'] ?? '');

        EnvUtilityExpenseEntry::updateOrCreate(
            [
                'category_id' => $category->id,
                'year_be' => $period['year_be'],
                'month' => $period['month'],
                'line_label' => $lineLabel,
            ],
            [
                'fiscal_year_be' => $period['fiscal_year_be'],
                'invoice_amount' => $data['invoice_amount'] ?? null,
                'budget_medical' => $data['budget_medical'] ?? null,
                'budget_revenue' => $data['budget_revenue'] ?? null,
                'budget_admin' => $data['budget_admin'] ?? null,
                'amount' => $data['amount'] ?? null,
                'note' => $data['note'] ?? null,
            ]
        );
    }

    private function cell(Worksheet $ws, int $col, int $row): string
    {
        $addr = Coordinate::stringFromColumnIndex($col).$row;
        $raw = $ws->getCell($addr)->getFormattedValue();
        $v = trim(preg_replace('/\s+/u', ' ', (string) ($raw ?? '')) ?? '');
        if ($v === '-' || $v === '–' || strcasecmp($v, '#REF!') === 0) {
            return '';
        }

        return $v;
    }

    private function money(string $value): ?float
    {
        if ($value === '') {
            return null;
        }
        $clean = str_replace([',', ' ', 'บาท'], '', $value);
        if ($clean === '' || $clean === '-') {
            return null;
        }
        if (! is_numeric($clean)) {
            return null;
        }

        return round((float) $clean, 2);
    }
}
