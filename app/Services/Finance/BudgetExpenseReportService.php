<?php

namespace App\Services\Finance;

use App\Services\HosxpSchema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BudgetExpenseReportService
{
    private const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    /** @var array<string, bool> */
    private array $schema = [];

    public function currentFiscalYear(): int
    {
        $now = now()->timezone('Asia/Bangkok');
        $year = (int) $now->format('Y');
        $month = (int) $now->format('n');

        return $month >= 10 ? $year + 544 : $year + 543;
    }

    /**
     * @return array{0: string, 1: string}
     */
    public function fiscalRange(int $fiscalYearBe): array
    {
        $startYear = $fiscalYearBe - 544;
        $endYear = $fiscalYearBe - 543;

        return [
            sprintf('%04d-10-01', $startYear),
            sprintf('%04d-09-30', $endYear),
        ];
    }

    /**
     * @return list<array{value: int, label: string, start_date: string, end_date: string}>
     */
    public function yearOptions(int $count = 8): array
    {
        $current = $this->currentFiscalYear();
        $options = [];

        for ($i = 0; $i < $count; $i++) {
            $year = $current - $i;
            [$start, $end] = $this->fiscalRange($year);
            $options[] = [
                'value' => $year,
                'label' => 'ปีงบประมาณ '.$year,
                'start_date' => $start,
                'end_date' => $end,
            ];
        }

        return $options;
    }

    public function resolveFiscalYear(mixed $input): int
    {
        $current = $this->currentFiscalYear();
        if ($input === null || $input === '') {
            return $current;
        }

        if (! preg_match('/^\d{4}$/', (string) $input)) {
            throw new \InvalidArgumentException('ปีงบประมาณไม่ถูกต้อง');
        }

        $year = (int) $input;
        if ($year < $current - 15 || $year > $current + 1) {
            throw new \InvalidArgumentException('ปีงบประมาณอยู่นอกช่วงที่รองรับ');
        }

        return $year;
    }

    public function formatThaiDate(string $iso): string
    {
        $ts = strtotime($iso);
        if (! $ts) {
            return $iso;
        }

        $month = self::THAI_MONTHS[(int) date('n', $ts) - 1];

        return date('j', $ts).' '.$month.' '.(date('Y', $ts) + 543);
    }

    public function hasHosxpConnection(): bool
    {
        try {
            if (! config('database.connections.hosxp')) {
                return false;
            }
            DB::connection('hosxp')->getPdo();

            return true;
        } catch (\Exception $e) {
            Log::warning('HOSxP connection not available: '.$e->getMessage());

            return false;
        }
    }

    /**
     * @return array{
     *     summary: array<string, float|int>,
     *     monthly: list<array<string, float|int|string>>,
     *     by_income: list<array<string, float|int|string>>,
     *     by_pttype: list<array<string, float|int|string>>
     * }
     */
    public function build(int $fiscalYearBe): array
    {
        $this->extendExecutionTime();
        [$startDate, $endDate] = $this->fiscalRange($fiscalYearBe);
        $conn = DB::connection('hosxp');
        $this->initSchema($conn);

        if (! HosxpSchema::columnExists($conn, 'opitemrece', 'sum_price')) {
            throw new \RuntimeException('ไม่พบคอลัมน์ opitemrece.sum_price ใน HOSxP');
        }

        $base = $this->baseQuery($conn, $startDate, $endDate);
        $summary = $this->summary($base);
        $monthly = $this->monthly($base, $startDate);
        $byIncome = $this->byIncome($base, (float) $summary['total_amount']);
        $byPttype = $this->byPttype($base, (float) $summary['total_amount']);

        return [
            'summary' => $summary,
            'monthly' => $monthly,
            'by_income' => $byIncome,
            'by_pttype' => $byPttype,
        ];
    }

    private function extendExecutionTime(int $seconds = 300): void
    {
        if (function_exists('set_time_limit')) {
            @set_time_limit($seconds);
        }
    }

    private function initSchema($conn): void
    {
        if ($this->schema !== []) {
            return;
        }

        $this->schema = [
            'oi_an' => HosxpSchema::columnExists($conn, 'opitemrece', 'an'),
            'paidst' => HosxpSchema::columnExists($conn, 'opitemrece', 'paidst'),
            'income' => HosxpSchema::columnExists($conn, 'opitemrece', 'income'),
            'income_table' => HosxpSchema::tableExists($conn, 'income'),
            'pttype_table' => HosxpSchema::tableExists($conn, 'pttype'),
            'ipt' => HosxpSchema::tableExists($conn, 'ipt'),
            'ovst' => HosxpSchema::tableExists($conn, 'ovst'),
        ];
    }

    private function ipdConditionSql(): string
    {
        $parts = [];
        if ($this->schema['oi_an']) {
            $parts[] = "(oi.an IS NOT NULL AND TRIM(oi.an) <> '')";
        }
        if ($this->schema['ovst']) {
            $parts[] = "(o.an IS NOT NULL AND TRIM(o.an) <> '')";
        }
        if ($parts === []) {
            return '0 = 1';
        }

        return '('.implode(' OR ', $parts).')';
    }

    private function opdConditionSql(): string
    {
        return 'NOT ('.$this->ipdConditionSql().')';
    }

    private function iptJoinAnSql(): string
    {
        if ($this->schema['oi_an'] && $this->schema['ovst']) {
            return "IF(oi.an IS NOT NULL AND TRIM(oi.an) <> '', oi.an, o.an)";
        }
        if ($this->schema['oi_an']) {
            return 'oi.an';
        }

        return 'o.an';
    }

    private function paidExpression(): string
    {
        return "TRIM(COALESCE(oi.paidst, ''))";
    }

    private function baseQuery($conn, string $startDate, string $endDate)
    {
        $query = $conn->table('opitemrece as oi')
            ->whereBetween('oi.vstdate', [$startDate, $endDate]);

        if ($this->schema['ovst']) {
            $query->leftJoin('ovst as o', 'o.vn', '=', 'oi.vn');
        }

        if ($this->schema['ipt'] && ($this->schema['oi_an'] || $this->schema['ovst'])) {
            $query->leftJoin(DB::raw('ipt i'), DB::raw('i.an'), '=', DB::raw($this->iptJoinAnSql()));
        }

        return $query;
    }

    /**
     * @param  \Illuminate\Database\Query\Builder  $base
     * @return array<string, float|int>
     */
    private function summary($base): array
    {
        $ipd = $this->ipdConditionSql();
        $opd = $this->opdConditionSql();
        $ipdKey = match (true) {
            $this->schema['oi_an'] && $this->schema['ovst'] => "COALESCE(NULLIF(TRIM(oi.an), ''), NULLIF(TRIM(o.an), ''), oi.vn)",
            $this->schema['oi_an'] => "COALESCE(NULLIF(TRIM(oi.an), ''), oi.vn)",
            $this->schema['ovst'] => "COALESCE(NULLIF(TRIM(o.an), ''), oi.vn)",
            default => 'oi.vn',
        };

        $row = (clone $base)
            ->selectRaw('COALESCE(SUM(oi.sum_price), 0) as total_amount')
            ->selectRaw("COALESCE(SUM(CASE WHEN {$opd} THEN oi.sum_price ELSE 0 END), 0) as opd_amount")
            ->selectRaw("COALESCE(SUM(CASE WHEN {$ipd} THEN oi.sum_price ELSE 0 END), 0) as ipd_amount")
            ->selectRaw('COUNT(*) as total_items')
            ->selectRaw("COUNT(DISTINCT CASE WHEN {$opd} THEN oi.vn END) as opd_visits")
            ->selectRaw("COUNT(DISTINCT CASE WHEN {$ipd} THEN {$ipdKey} END) as ipd_visits")
            ->selectRaw($this->paymentSelectSql())
            ->first();

        $total = (float) ($row->total_amount ?? 0);
        $opdAmount = (float) ($row->opd_amount ?? 0);
        $ipdAmount = (float) ($row->ipd_amount ?? 0);

        return [
            'total_amount' => $total,
            'opd_amount' => $opdAmount,
            'ipd_amount' => $ipdAmount,
            'opd_share' => $total > 0 ? round($opdAmount / $total * 100, 1) : 0,
            'ipd_share' => $total > 0 ? round($ipdAmount / $total * 100, 1) : 0,
            'cash_amount' => (float) ($row->cash_amount ?? 0),
            'debt_amount' => (float) ($row->debt_amount ?? 0),
            'unpaid_amount' => (float) ($row->unpaid_amount ?? 0),
            'other_amount' => (float) ($row->other_amount ?? 0),
            'total_items' => (int) ($row->total_items ?? 0),
            'opd_visits' => (int) ($row->opd_visits ?? 0),
            'ipd_visits' => (int) ($row->ipd_visits ?? 0),
        ];
    }

    private function paymentSelectSql(): string
    {
        if (! $this->schema['paidst']) {
            return '0 as cash_amount, 0 as debt_amount, 0 as unpaid_amount, COALESCE(SUM(oi.sum_price), 0) as other_amount';
        }

        $paid = $this->paidExpression();

        return "
            COALESCE(SUM(CASE WHEN {$paid} IN ('01', '03') THEN oi.sum_price ELSE 0 END), 0) as cash_amount,
            COALESCE(SUM(CASE WHEN {$paid} = '02' THEN oi.sum_price ELSE 0 END), 0) as debt_amount,
            COALESCE(SUM(CASE WHEN {$paid} = '00' THEN oi.sum_price ELSE 0 END), 0) as unpaid_amount,
            COALESCE(SUM(CASE WHEN {$paid} NOT IN ('00', '01', '02', '03') THEN oi.sum_price ELSE 0 END), 0) as other_amount
        ";
    }

    /**
     * @param  \Illuminate\Database\Query\Builder  $base
     * @return list<array<string, float|int|string>>
     */
    private function monthly($base, string $startDate): array
    {
        $ipd = $this->ipdConditionSql();
        $opd = $this->opdConditionSql();

        $rows = (clone $base)
            ->selectRaw('YEAR(oi.vstdate) as y')
            ->selectRaw('MONTH(oi.vstdate) as m')
            ->selectRaw("COALESCE(SUM(CASE WHEN {$opd} THEN oi.sum_price ELSE 0 END), 0) as opd")
            ->selectRaw("COALESCE(SUM(CASE WHEN {$ipd} THEN oi.sum_price ELSE 0 END), 0) as ipd")
            ->selectRaw('COALESCE(SUM(oi.sum_price), 0) as total')
            ->selectRaw($this->paymentSelectSql())
            ->groupByRaw('YEAR(oi.vstdate), MONTH(oi.vstdate)')
            ->get()
            ->keyBy(fn ($row) => sprintf('%04d-%02d', $row->y, $row->m));

        $cursor = new \DateTimeImmutable($startDate);
        $months = [];

        for ($i = 0; $i < 12; $i++) {
            $point = $cursor->modify("+{$i} months");
            $key = $point->format('Y-m');
            $row = $rows->get($key);
            $opdAmount = (float) ($row->opd ?? 0);
            $ipdAmount = (float) ($row->ipd ?? 0);
            $monthIndex = (int) $point->format('n') - 1;
            $label = self::THAI_MONTHS[$monthIndex].' '.((int) $point->format('Y') + 543);

            $months[] = [
                'key' => $key,
                'label' => $label,
                'opd' => $opdAmount,
                'ipd' => $ipdAmount,
                'total' => (float) ($row->total ?? ($opdAmount + $ipdAmount)),
                'cash' => (float) ($row->cash_amount ?? 0),
                'debt' => (float) ($row->debt_amount ?? 0),
                'unpaid' => (float) ($row->unpaid_amount ?? 0),
                'other' => (float) ($row->other_amount ?? 0),
            ];
        }

        return $months;
    }

    /**
     * @param  \Illuminate\Database\Query\Builder  $base
     * @return list<array<string, float|int|string>>
     */
    private function byIncome($base, float $totalAmount): array
    {
        if (! $this->schema['income']) {
            return [];
        }

        $ipd = $this->ipdConditionSql();
        $opd = $this->opdConditionSql();
        $code = "COALESCE(NULLIF(TRIM(oi.income), ''), '-')";
        $query = clone $base;

        if ($this->schema['income_table']) {
            $query->leftJoin('income as inc', 'inc.income', '=', 'oi.income');
            $name = "CASE WHEN {$code} = '-' THEN 'ไม่ระบุหมวด' ELSE COALESCE(NULLIF(inc.name, ''), {$code}) END";
        } else {
            $name = "CASE WHEN {$code} = '-' THEN 'ไม่ระบุหมวด' ELSE {$code} END";
        }

        return $query
            ->selectRaw("{$code} as income_code")
            ->selectRaw("{$name} as income_name")
            ->selectRaw("COALESCE(SUM(CASE WHEN {$opd} THEN oi.sum_price ELSE 0 END), 0) as opd_amount")
            ->selectRaw("COALESCE(SUM(CASE WHEN {$ipd} THEN oi.sum_price ELSE 0 END), 0) as ipd_amount")
            ->selectRaw('COALESCE(SUM(oi.sum_price), 0) as total_amount')
            ->selectRaw('COUNT(*) as items')
            ->groupByRaw($code)
            ->groupByRaw($name)
            ->orderByDesc('total_amount')
            ->get()
            ->map(function ($row) use ($totalAmount) {
                $total = (float) $row->total_amount;

                return [
                    'income_code' => (string) $row->income_code,
                    'income_name' => (string) $row->income_name,
                    'opd_amount' => (float) $row->opd_amount,
                    'ipd_amount' => (float) $row->ipd_amount,
                    'total_amount' => $total,
                    'items' => (int) $row->items,
                    'share_percent' => $totalAmount > 0 ? round($total / $totalAmount * 100, 1) : 0,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @param  \Illuminate\Database\Query\Builder  $base
     * @return list<array<string, float|int|string>>
     */
    private function byPttype($base, float $totalAmount): array
    {
        $ipd = $this->ipdConditionSql();
        $opd = $this->opdConditionSql();
        $iptCode = $this->schema['ipt'] ? "NULLIF(TRIM(i.pttype), '')" : 'NULL';
        $ovstCode = $this->schema['ovst'] ? "NULLIF(TRIM(o.pttype), '')" : 'NULL';
        $code = "CASE WHEN {$ipd} THEN COALESCE({$iptCode}, {$ovstCode}, '-') ELSE COALESCE({$ovstCode}, '-') END";

        $query = clone $base;
        if ($this->schema['pttype_table']) {
            $query->leftJoin(DB::raw('pttype pt'), DB::raw('pt.pttype'), '=', DB::raw($code));
            $name = "COALESCE(NULLIF(pt.name, ''), {$code}, 'ไม่ระบุสิทธิ')";
        } else {
            $name = "CASE WHEN {$code} = '-' THEN 'ไม่ระบุสิทธิ' ELSE {$code} END";
        }

        return $query
            ->selectRaw("{$code} as pttype_code")
            ->selectRaw("{$name} as pttype_name")
            ->selectRaw("COALESCE(SUM(CASE WHEN {$opd} THEN oi.sum_price ELSE 0 END), 0) as opd_amount")
            ->selectRaw("COALESCE(SUM(CASE WHEN {$ipd} THEN oi.sum_price ELSE 0 END), 0) as ipd_amount")
            ->selectRaw('COALESCE(SUM(oi.sum_price), 0) as total_amount')
            ->selectRaw('COUNT(*) as items')
            ->selectRaw($this->paymentSelectSql())
            ->groupByRaw($code)
            ->groupByRaw($name)
            ->orderByDesc('total_amount')
            ->get()
            ->map(function ($row) use ($totalAmount) {
                $total = (float) $row->total_amount;

                return [
                    'pttype_code' => (string) $row->pttype_code,
                    'pttype_name' => (string) $row->pttype_name,
                    'opd_amount' => (float) $row->opd_amount,
                    'ipd_amount' => (float) $row->ipd_amount,
                    'cash_amount' => (float) ($row->cash_amount ?? 0),
                    'debt_amount' => (float) ($row->debt_amount ?? 0),
                    'unpaid_amount' => (float) ($row->unpaid_amount ?? 0),
                    'other_amount' => (float) ($row->other_amount ?? 0),
                    'total_amount' => $total,
                    'items' => (int) $row->items,
                    'share_percent' => $totalAmount > 0 ? round($total / $totalAmount * 100, 1) : 0,
                ];
            })
            ->values()
            ->all();
    }
}
