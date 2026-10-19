<?php

namespace App\Services\Finance;

use App\Models\Finance\BudgetExpenseLine;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

class BudgetExpenseLedgerService
{
    /**
     * @return list<array{key: string, line_no: int, name: string, capital: bool}>
     */
    public function catalog(): array
    {
        return [
            ['key' => 'drug', 'line_no' => 1, 'name' => 'ค่ายาและเวชภัณฑ์', 'capital' => false],
            ['key' => 'personnel', 'line_no' => 2, 'name' => 'ค่าใช้จ่ายบุคลากร', 'capital' => false],
            ['key' => 'compensation', 'line_no' => 3, 'name' => 'ค่าตอบแทน', 'capital' => false],
            ['key' => 'service', 'line_no' => 4, 'name' => 'ค่าใช้สอย', 'capital' => false],
            ['key' => 'material', 'line_no' => 5, 'name' => 'ค่าวัสดุ', 'capital' => false],
            ['key' => 'utility', 'line_no' => 6, 'name' => 'ค่าสาธารณูปโภค', 'capital' => false],
            ['key' => 'other', 'line_no' => 7, 'name' => 'ค่าใช้จ่ายอื่นๆ', 'capital' => false],
            ['key' => 'capital', 'line_no' => 8, 'name' => 'งบลงทุน', 'capital' => true],
            ['key' => 'nhso', 'line_no' => 9, 'name' => 'ค่าใช้จ่าย สปสช.', 'capital' => false],
            ['key' => 'depreciation', 'line_no' => 10, 'name' => 'ค่าเสื่อมราคารวม', 'capital' => false],
            ['key' => 'doubtful', 'line_no' => 11, 'name' => 'ค่าเผื่อหนี้สงสัยจะสูญ', 'capital' => false],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function forYear(int $fiscalYear): array
    {
        $stored = BudgetExpenseLine::query()
            ->where('fiscal_year', $fiscalYear)
            ->get()
            ->keyBy('line_key');

        $lines = [];
        $total = 0.0;
        $capital = 0.0;

        foreach ($this->catalog() as $item) {
            $amount = (float) ($stored->get($item['key'])?->amount ?? 0);
            $total += $amount;
            if ($item['capital']) {
                $capital += $amount;
            }
            $lines[] = [
                'key' => $item['key'],
                'line_no' => $item['line_no'],
                'name' => $item['name'],
                'amount' => $amount,
                'capital' => $item['capital'],
            ];
        }

        $fileTotal = $this->nullableAmount($stored->get('file_total'));
        $fileSummary = [
            'total' => $fileTotal,
            'operating_result' => $this->nullableAmount($stored->get('file_operating')),
            'capital_deduction' => $this->nullableAmount($stored->get('file_capital')),
            'net_result' => $this->nullableAmount($stored->get('file_net')),
            'ratio' => $this->nullableAmount($stored->get('file_ratio')),
        ];

        return [
            'lines' => $lines,
            'total_amount' => $total,
            'operating_expenses' => $total - $capital,
            'capital_amount' => $capital,
            'file_summary' => $fileSummary,
            'total_mismatch' => $fileTotal !== null && abs($fileTotal - $total) > 1,
            'has_saved' => $stored->isNotEmpty(),
        ];
    }

    /**
     * @param  array<string, mixed>  $amounts
     */
    public function saveAmounts(int $fiscalYear, array $amounts): void
    {
        DB::transaction(function () use ($fiscalYear, $amounts) {
            foreach ($this->catalog() as $item) {
                $raw = $amounts[$item['key']] ?? 0;
                BudgetExpenseLine::query()->updateOrCreate(
                    [
                        'fiscal_year' => $fiscalYear,
                        'line_key' => $item['key'],
                    ],
                    [
                        'sort_order' => $item['line_no'],
                        'name' => $item['name'],
                        'amount' => $this->toAmount($raw),
                        'kind' => 'expense',
                        'source' => 'manual',
                    ]
                );
            }
        });
    }

    /**
     * @return array{matched: int, total_mismatch: bool}
     */
    public function import(int $fiscalYear, string $path): array
    {
        $sheet = IOFactory::load($path)->getActiveSheet();
        $parsed = [
            'expenses' => [],
            'file_total' => null,
            'file_operating' => null,
            'file_capital' => null,
            'file_net' => null,
            'file_ratio' => null,
        ];

        foreach ($sheet->toArray(null, true, true, false) as $row) {
            if (! is_array($row)) {
                continue;
            }
            $this->consumeRow($row, $parsed);
        }

        if ($parsed['expenses'] === []) {
            throw new \InvalidArgumentException('ไม่พบหมวดค่าใช้จ่ายในไฟล์ กรุณาใช้ลำดับ 1–11 หรือชื่อหมวดตามต้นแบบ');
        }

        DB::transaction(function () use ($fiscalYear, $parsed) {
            BudgetExpenseLine::query()->where('fiscal_year', $fiscalYear)->delete();

            foreach ($this->catalog() as $item) {
                BudgetExpenseLine::query()->create([
                    'fiscal_year' => $fiscalYear,
                    'line_key' => $item['key'],
                    'sort_order' => $item['line_no'],
                    'name' => $item['name'],
                    'amount' => (float) ($parsed['expenses'][$item['key']] ?? 0),
                    'kind' => 'expense',
                    'source' => 'excel',
                ]);
            }

            $summaries = [
                'file_total' => ['รวมค่าใช้จ่าย', 90, $parsed['file_total']],
                'file_operating' => ['รายได้สูงกว่า (ต่ำกว่า) ค่าใช้จ่ายจากการดำเนินงาน', 91, $parsed['file_operating']],
                'file_capital' => ['หัก ค่าใช้จ่ายลงทุน', 92, $parsed['file_capital']],
                'file_net' => ['รายได้สูงกว่า (ต่ำกว่า) ค่าใช้จ่ายสุทธิ', 93, $parsed['file_net']],
                'file_ratio' => ['อัตราส่วนตามไฟล์', 94, $parsed['file_ratio']],
            ];

            foreach ($summaries as $key => [$name, $order, $amount]) {
                if ($amount === null) {
                    continue;
                }
                BudgetExpenseLine::query()->create([
                    'fiscal_year' => $fiscalYear,
                    'line_key' => $key,
                    'sort_order' => $order,
                    'name' => $name,
                    'amount' => $amount,
                    'kind' => 'file_summary',
                    'source' => 'excel',
                ]);
            }
        });

        $view = $this->forYear($fiscalYear);

        return [
            'matched' => count($parsed['expenses']),
            'total_mismatch' => (bool) $view['total_mismatch'],
        ];
    }

    /**
     * @param  array<string, mixed>  $parsed
     * @param  list<mixed>  $row
     */
    private function consumeRow(array $row, array &$parsed): void
    {
        $textParts = [];
        $numbers = [];

        foreach ($row as $cell) {
            if ($cell === null || $cell === '') {
                continue;
            }
            $number = $this->parseNumber($cell);
            if ($number !== null && ! $this->looksLikeLabel((string) $cell)) {
                $numbers[] = $number;
                continue;
            }
            $textParts[] = trim((string) $cell);
        }

        $text = $this->normalize(implode('', $textParts));
        if ($text === '' && $numbers === []) {
            return;
        }

        $lineNo = null;
        foreach ($numbers as $number) {
            if ($number >= 1 && $number <= 11 && abs($number - round($number)) < 0.001) {
                $lineNo = (int) round($number);
                break;
            }
        }

        $summaryKey = $this->summaryKey($text);
        if ($summaryKey !== null) {
            [$money, $ratio] = $this->splitMoneyAndRatio($numbers, $lineNo);
            if ($summaryKey === 'file_net') {
                if ($money !== null) {
                    $parsed['file_net'] = $money;
                }
                if ($ratio !== null) {
                    $parsed['file_ratio'] = $ratio;
                }
            } elseif ($money !== null) {
                $parsed[$summaryKey] = $money;
            }

            return;
        }

        $item = $this->matchExpense($text, $lineNo);
        if ($item === null) {
            return;
        }

        $amount = $this->expenseAmount($numbers, $item['line_no']);
        $parsed['expenses'][$item['key']] = $amount;
    }

    /**
     * @param  list<float>  $numbers
     * @return array{0: ?float, 1: ?float}
     */
    private function splitMoneyAndRatio(array $numbers, ?int $lineNo): array
    {
        $values = array_values(array_filter(
            $numbers,
            fn (float $number) => $lineNo === null || abs($number - $lineNo) > 0.001
        ));

        if ($values === []) {
            return [null, null];
        }

        $money = null;
        $ratio = null;
        foreach ($values as $number) {
            if (abs($number) <= 200 && ($money === null || abs($number) < abs($money))) {
                if (abs($number) <= 200 && $this->hasLargerMoney($values, $number)) {
                    $ratio = $number;
                    continue;
                }
            }
            if ($money === null || abs($number) > abs($money)) {
                $money = $number;
            }
        }

        if ($ratio !== null && $money !== null && abs($ratio - $money) < 0.001) {
            $ratio = null;
        }

        return [$money, $ratio];
    }

    /**
     * @param  list<float>  $values
     */
    private function hasLargerMoney(array $values, float $candidate): bool
    {
        foreach ($values as $number) {
            if (abs($number) > 1000 && abs($number - $candidate) > 0.001) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  list<float>  $numbers
     */
    private function expenseAmount(array $numbers, int $lineNo): float
    {
        $values = array_values(array_filter(
            $numbers,
            fn (float $number) => abs($number - $lineNo) > 0.001
        ));

        if ($values === []) {
            return 0.0;
        }

        return (float) $values[array_key_last($values)];
    }

    /**
     * @return array{key: string, line_no: int, name: string, capital: bool}|null
     */
    private function matchExpense(string $normalizedText, ?int $lineNo): ?array
    {
        $catalog = $this->catalog();
        usort($catalog, fn ($a, $b) => mb_strlen($b['name']) <=> mb_strlen($a['name']));

        if ($normalizedText !== '') {
            foreach ($catalog as $item) {
                if (str_contains($normalizedText, $this->normalize($item['name']))) {
                    return $item;
                }
            }
        }

        if ($lineNo === null) {
            return null;
        }

        foreach ($this->catalog() as $item) {
            if ($item['line_no'] === $lineNo) {
                return $item;
            }
        }

        return null;
    }

    private function summaryKey(string $normalizedText): ?string
    {
        if ($normalizedText === '') {
            return null;
        }
        if (str_contains($normalizedText, 'สุทธิ')) {
            return 'file_net';
        }
        if (str_contains($normalizedText, 'จากการดำเนินงาน')) {
            return 'file_operating';
        }
        if (str_contains($normalizedText, 'รวมค่าใช้จ่าย')) {
            return 'file_total';
        }
        if (str_contains($normalizedText, 'ค่าใช้จ่ายลงทุน')) {
            return 'file_capital';
        }

        return null;
    }

    private function looksLikeLabel(string $value): bool
    {
        return (bool) preg_match('/\p{Thai}/u', $value);
    }

    private function normalize(string $text): string
    {
        $text = preg_replace('/\s+/u', '', $text) ?? $text;

        return mb_strtolower($text);
    }

    private function parseNumber(mixed $value): ?float
    {
        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }
        if (! is_string($value)) {
            return null;
        }

        $text = trim($value);
        if ($text === '' || $text === '-') {
            return null;
        }

        $negative = str_contains($text, '(') && str_contains($text, ')');
        $text = str_replace([',', ' ', 'บาท', '%', '(', ')'], '', $text);
        if (! is_numeric($text)) {
            return null;
        }

        $number = (float) $text;

        return $negative ? -$number : $number;
    }

    private function toAmount(mixed $value): float
    {
        if ($value === null || $value === '') {
            return 0.0;
        }

        return round((float) $value, 2);
    }

    private function nullableAmount(?BudgetExpenseLine $line): ?float
    {
        return $line ? (float) $line->amount : null;
    }
}
