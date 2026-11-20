<?php

namespace App\Services\Finance;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BudgetExpenseReportService
{
    private const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

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
            Log::warning('HOSxP connection not available in BudgetExpenseReport: '.$e->getMessage());

            return false;
        }
    }

    private function extendExecutionTime(int $seconds = 300): void
    {
        if (function_exists('set_time_limit')) {
            @set_time_limit($seconds);
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

        // 1. สรุปข้อมูลผู้ป่วยนอก (OPD) จาก vn_stat โดยแยกผู้ป่วยที่ไม่ได้ Admit (o.an is null)
        $opdSummary = $conn->table('vn_stat as v')
            ->leftJoin('ovst as o', 'o.vn', '=', 'v.vn')
            ->whereBetween('v.vstdate', [$startDate, $endDate])
            ->where(function ($q) {
                $q->whereNull('o.an')->orWhere('o.an', '');
            })
            ->selectRaw('
                COUNT(DISTINCT v.vn) as visits,
                SUM(COALESCE(v.income, 0)) as total,
                SUM(COALESCE(v.paid_money, 0)) as cash,
                SUM(COALESCE(v.uc_money, 0)) as debt,
                SUM(COALESCE(v.remain_money, 0)) as unpaid
            ')
            ->first();

        // 2. สรุปข้อมูลผู้ป่วยใน (IPD) จาก an_stat ที่จำหน่ายในรอบปีงบประมาณ (dchdate)
        $ipdSummary = $conn->table('an_stat as ast')
            ->whereBetween('ast.dchdate', [$startDate, $endDate])
            ->whereNotNull('ast.dchdate')
            ->where('ast.dchdate', '<>', '')
            ->where('ast.dchdate', '<>', '0000-00-00')
            ->selectRaw('
                COUNT(DISTINCT ast.an) as visits,
                SUM(COALESCE(ast.income, 0)) as total,
                SUM(COALESCE(ast.paid_money, 0)) as cash,
                SUM(COALESCE(ast.uc_money, 0)) as debt,
                SUM(COALESCE(ast.remain_money, 0)) as unpaid
            ')
            ->first();

        $opdTotal = (float) ($opdSummary->total ?? 0);
        $ipdTotal = (float) ($ipdSummary->total ?? 0);
        $totalAmount = $opdTotal + $ipdTotal;

        $opdVisits = (int) ($opdSummary->visits ?? 0);
        $ipdVisits = (int) ($ipdSummary->visits ?? 0);

        $cashTotal = (float) ($opdSummary->cash ?? 0) + (float) ($ipdSummary->cash ?? 0);
        $debtTotal = (float) ($opdSummary->debt ?? 0) + (float) ($ipdSummary->debt ?? 0);
        $unpaidTotal = (float) ($opdSummary->unpaid ?? 0) + (float) ($ipdSummary->unpaid ?? 0);
        $otherTotal = max(0.0, round($totalAmount - ($cashTotal + $debtTotal + $unpaidTotal), 2));

        $summary = [
            'total_amount' => $totalAmount,
            'opd_amount' => $opdTotal,
            'ipd_amount' => $ipdTotal,
            'opd_share' => $totalAmount > 0 ? round($opdTotal / $totalAmount * 100, 1) : 0,
            'ipd_share' => $totalAmount > 0 ? round($ipdTotal / $totalAmount * 100, 1) : 0,
            'cash_amount' => $cashTotal,
            'debt_amount' => $debtTotal,
            'unpaid_amount' => $unpaidTotal,
            'other_amount' => $otherTotal,
            'total_items' => $opdVisits + $ipdVisits,
            'opd_visits' => $opdVisits,
            'ipd_visits' => $ipdVisits,
        ];

        // 3. ข้อมูลรายเดือน 12 เดือน (ต.ค. - ก.ย.)
        $monthly = $this->buildMonthly($conn, $startDate, $endDate);

        // 4. หมวดรายได้
        $byIncome = $this->buildByIncome($conn, $startDate, $endDate, $totalAmount);

        // 5. สิทธิการรักษา
        $byPttype = $this->buildByPttype($conn, $startDate, $endDate, $totalAmount);

        return [
            'summary' => $summary,
            'monthly' => $monthly,
            'by_income' => $byIncome,
            'by_pttype' => $byPttype,
        ];
    }

    /**
     * @return list<array<string, float|int|string>>
     */
    private function buildMonthly($conn, string $startDate, string $endDate): array
    {
        $monthlyOpd = $conn->table('vn_stat as v')
            ->leftJoin('ovst as o', 'o.vn', '=', 'v.vn')
            ->whereBetween('v.vstdate', [$startDate, $endDate])
            ->where(function ($q) {
                $q->whereNull('o.an')->orWhere('o.an', '');
            })
            ->selectRaw('
                YEAR(v.vstdate) as y,
                MONTH(v.vstdate) as m,
                SUM(COALESCE(v.income, 0)) as total,
                SUM(COALESCE(v.paid_money, 0)) as cash,
                SUM(COALESCE(v.uc_money, 0)) as debt,
                SUM(COALESCE(v.remain_money, 0)) as unpaid
            ')
            ->groupBy('y', 'm')
            ->get()
            ->keyBy(fn ($r) => sprintf('%04d-%02d', $r->y, $r->m));

        $monthlyIpd = $conn->table('an_stat as ast')
            ->whereBetween('ast.dchdate', [$startDate, $endDate])
            ->whereNotNull('ast.dchdate')
            ->where('ast.dchdate', '<>', '')
            ->where('ast.dchdate', '<>', '0000-00-00')
            ->selectRaw('
                YEAR(ast.dchdate) as y,
                MONTH(ast.dchdate) as m,
                SUM(COALESCE(ast.income, 0)) as total,
                SUM(COALESCE(ast.paid_money, 0)) as cash,
                SUM(COALESCE(ast.uc_money, 0)) as debt,
                SUM(COALESCE(ast.remain_money, 0)) as unpaid
            ')
            ->groupBy('y', 'm')
            ->get()
            ->keyBy(fn ($r) => sprintf('%04d-%02d', $r->y, $r->m));

        $cursor = new \DateTimeImmutable($startDate);
        $months = [];

        for ($i = 0; $i < 12; $i++) {
            $point = $cursor->modify("+{$i} months");
            $key = $point->format('Y-m');
            $opdRow = $monthlyOpd->get($key);
            $ipdRow = $monthlyIpd->get($key);

            $opd = (float) ($opdRow->total ?? 0);
            $ipd = (float) ($ipdRow->total ?? 0);
            $cash = (float) ($opdRow->cash ?? 0) + (float) ($ipdRow->cash ?? 0);
            $debt = (float) ($opdRow->debt ?? 0) + (float) ($ipdRow->debt ?? 0);
            $unpaid = (float) ($opdRow->unpaid ?? 0) + (float) ($ipdRow->unpaid ?? 0);
            $total = $opd + $ipd;
            $other = max(0.0, round($total - ($cash + $debt + $unpaid), 2));

            $monthIndex = (int) $point->format('n') - 1;
            $label = self::THAI_MONTHS[$monthIndex].' '.((int) $point->format('Y') + 543);

            $months[] = [
                'key' => $key,
                'label' => $label,
                'opd' => $opd,
                'ipd' => $ipd,
                'total' => $total,
                'cash' => $cash,
                'debt' => $debt,
                'unpaid' => $unpaid,
                'other' => $other,
            ];
        }

        return $months;
    }

    /**
     * @return list<array<string, float|int|string>>
     */
    private function buildByIncome($conn, string $startDate, string $endDate, float $totalAmount): array
    {
        $incomeNames = $conn->table('income')->pluck('name', 'income');

        $opdIncs = $conn->table('vn_stat as v')
            ->leftJoin('ovst as o', 'o.vn', '=', 'v.vn')
            ->whereBetween('v.vstdate', [$startDate, $endDate])
            ->where(function ($q) {
                $q->whereNull('o.an')->orWhere('o.an', '');
            })
            ->selectRaw('
                SUM(inc01) as inc01, COUNT(CASE WHEN inc01 > 0 THEN 1 END) as inc01_cnt,
                SUM(inc02) as inc02, COUNT(CASE WHEN inc02 > 0 THEN 1 END) as inc02_cnt,
                SUM(inc03) as inc03, COUNT(CASE WHEN inc03 > 0 THEN 1 END) as inc03_cnt,
                SUM(inc04) as inc04, COUNT(CASE WHEN inc04 > 0 THEN 1 END) as inc04_cnt,
                SUM(inc05) as inc05, COUNT(CASE WHEN inc05 > 0 THEN 1 END) as inc05_cnt,
                SUM(inc06) as inc06, COUNT(CASE WHEN inc06 > 0 THEN 1 END) as inc06_cnt,
                SUM(inc07) as inc07, COUNT(CASE WHEN inc07 > 0 THEN 1 END) as inc07_cnt,
                SUM(inc08) as inc08, COUNT(CASE WHEN inc08 > 0 THEN 1 END) as inc08_cnt,
                SUM(inc09) as inc09, COUNT(CASE WHEN inc09 > 0 THEN 1 END) as inc09_cnt,
                SUM(inc10) as inc10, COUNT(CASE WHEN inc10 > 0 THEN 1 END) as inc10_cnt,
                SUM(inc11) as inc11, COUNT(CASE WHEN inc11 > 0 THEN 1 END) as inc11_cnt,
                SUM(inc12) as inc12, COUNT(CASE WHEN inc12 > 0 THEN 1 END) as inc12_cnt,
                SUM(inc13) as inc13, COUNT(CASE WHEN inc13 > 0 THEN 1 END) as inc13_cnt,
                SUM(inc14) as inc14, COUNT(CASE WHEN inc14 > 0 THEN 1 END) as inc14_cnt,
                SUM(inc15) as inc15, COUNT(CASE WHEN inc15 > 0 THEN 1 END) as inc15_cnt,
                SUM(inc16) as inc16, COUNT(CASE WHEN inc16 > 0 THEN 1 END) as inc16_cnt,
                SUM(inc17) as inc17, COUNT(CASE WHEN inc17 > 0 THEN 1 END) as inc17_cnt,
                SUM(income) as total
            ')
            ->first();

        $ipdIncs = $conn->table('an_stat as ast')
            ->whereBetween('ast.dchdate', [$startDate, $endDate])
            ->whereNotNull('ast.dchdate')
            ->where('ast.dchdate', '<>', '')
            ->where('ast.dchdate', '<>', '0000-00-00')
            ->selectRaw('
                SUM(inc01) as inc01, COUNT(CASE WHEN inc01 > 0 THEN 1 END) as inc01_cnt,
                SUM(inc02) as inc02, COUNT(CASE WHEN inc02 > 0 THEN 1 END) as inc02_cnt,
                SUM(inc03) as inc03, COUNT(CASE WHEN inc03 > 0 THEN 1 END) as inc03_cnt,
                SUM(inc04) as inc04, COUNT(CASE WHEN inc04 > 0 THEN 1 END) as inc04_cnt,
                SUM(inc05) as inc05, COUNT(CASE WHEN inc05 > 0 THEN 1 END) as inc05_cnt,
                SUM(inc06) as inc06, COUNT(CASE WHEN inc06 > 0 THEN 1 END) as inc06_cnt,
                SUM(inc07) as inc07, COUNT(CASE WHEN inc07 > 0 THEN 1 END) as inc07_cnt,
                SUM(inc08) as inc08, COUNT(CASE WHEN inc08 > 0 THEN 1 END) as inc08_cnt,
                SUM(inc09) as inc09, COUNT(CASE WHEN inc09 > 0 THEN 1 END) as inc09_cnt,
                SUM(inc10) as inc10, COUNT(CASE WHEN inc10 > 0 THEN 1 END) as inc10_cnt,
                SUM(inc11) as inc11, COUNT(CASE WHEN inc11 > 0 THEN 1 END) as inc11_cnt,
                SUM(inc12) as inc12, COUNT(CASE WHEN inc12 > 0 THEN 1 END) as inc12_cnt,
                SUM(inc13) as inc13, COUNT(CASE WHEN inc13 > 0 THEN 1 END) as inc13_cnt,
                SUM(inc14) as inc14, COUNT(CASE WHEN inc14 > 0 THEN 1 END) as inc14_cnt,
                SUM(inc15) as inc15, COUNT(CASE WHEN inc15 > 0 THEN 1 END) as inc15_cnt,
                SUM(inc16) as inc16, COUNT(CASE WHEN inc16 > 0 THEN 1 END) as inc16_cnt,
                SUM(inc17) as inc17, COUNT(CASE WHEN inc17 > 0 THEN 1 END) as inc17_cnt,
                SUM(income) as total
            ')
            ->first();

        // คำนวณค่ายาในบัญชี (ED) และนอกบัญชี (NED) ตาม drugitems.drugaccount ตรงตามสรุปมูลค่ารักษาพยาบาล
        $opdDrug = $conn->table('opitemrece as o')
            ->leftJoin('drugitems as d', 'd.icode', '=', 'o.icode')
            ->whereBetween('o.vstdate', [$startDate, $endDate])
            ->where(function ($q) {
                $q->whereNull('o.an')->orWhere('o.an', '');
            })
            ->whereIn('o.income', ['03', '17'])
            ->selectRaw("
                SUM(CASE WHEN d.drugaccount IS NOT NULL AND TRIM(d.drugaccount) <> '' AND UPPER(TRIM(d.drugaccount)) <> 'NED' THEN o.sum_price ELSE 0 END) as ed,
                SUM(CASE WHEN d.drugaccount IS NULL OR TRIM(d.drugaccount) = '' OR UPPER(TRIM(d.drugaccount)) = 'NED' THEN o.sum_price ELSE 0 END) as ned
            ")
            ->first();

        $ipdDrug = $conn->table('opitemrece as o')
            ->join('an_stat as a', 'a.an', '=', 'o.an')
            ->leftJoin('drugitems as d', 'd.icode', '=', 'o.icode')
            ->whereBetween('a.dchdate', [$startDate, $endDate])
            ->whereNotNull('a.dchdate')
            ->where('a.dchdate', '<>', '')
            ->where('a.dchdate', '<>', '0000-00-00')
            ->whereIn('o.income', ['03', '17'])
            ->selectRaw("
                SUM(CASE WHEN d.drugaccount IS NOT NULL AND TRIM(d.drugaccount) <> '' AND UPPER(TRIM(d.drugaccount)) <> 'NED' THEN o.sum_price ELSE 0 END) as ed,
                SUM(CASE WHEN d.drugaccount IS NULL OR TRIM(d.drugaccount) = '' OR UPPER(TRIM(d.drugaccount)) = 'NED' THEN o.sum_price ELSE 0 END) as ned
            ")
            ->first();

        $defs = [
            '01' => ['name' => $incomeNames['01'] ?? 'ค่าห้องและค่าอาหาร', 'col' => 'inc01'],
            '02' => ['name' => $incomeNames['02'] ?? 'ค่าอวัยวะเทียมและอุปกรณ์', 'col' => 'inc02'],
            '03' => ['name' => 'ค่ายาในบัญชียาหลักแห่งชาติ (ED)', 'col' => 'inc03', 'opd' => (float) ($opdDrug->ed ?? 0), 'ipd' => (float) ($ipdDrug->ed ?? 0)],
            '04' => ['name' => $incomeNames['04'] ?? 'ค่ายากลับบ้าน', 'col' => 'inc04'],
            '05' => ['name' => $incomeNames['05'] ?? 'ค่าเวชภัณฑ์ที่มิใช่ยา', 'col' => 'inc05'],
            '06' => ['name' => $incomeNames['06'] ?? 'ค่าบริการโลหิตและส่วนประกอบ', 'col' => 'inc06'],
            '07' => ['name' => $incomeNames['07'] ?? 'ค่าตรวจวินิจฉัยทางเทคนิคการแพทย์และพยาธิ', 'col' => 'inc07'],
            '08' => ['name' => $incomeNames['08'] ?? 'ค่าตรวจวินิจฉัยและรักษาทางรังสีวิทยา', 'col' => 'inc08'],
            '09' => ['name' => $incomeNames['09'] ?? 'ค่าตรวจวินิจฉัยโดยวิธีพิเศษอื่นๆ', 'col' => 'inc09'],
            '10' => ['name' => $incomeNames['10'] ?? 'ค่าอุปกรณ์ของใช้และเครื่องมือทางการแพทย์', 'col' => 'inc10'],
            '11' => ['name' => $incomeNames['11'] ?? 'ค่าทำหัตถการ และวิสัญญี', 'col' => 'inc11'],
            '12' => ['name' => $incomeNames['12'] ?? 'ค่าบริการทางพยาบาล', 'col' => 'inc12'],
            '13' => ['name' => $incomeNames['13'] ?? 'ค่าบริการทางทันตกรรม', 'col' => 'inc13'],
            '14' => ['name' => $incomeNames['14'] ?? 'ค่าบริการทางกายภาพบำบัดและฟื้นฟู', 'col' => 'inc14'],
            '15' => ['name' => $incomeNames['15'] ?? 'ค่านวดและแพทย์แผนไทย', 'col' => 'inc15'],
            '16' => ['name' => $incomeNames['16'] ?? 'ค่าบริการอื่น ๆ ที่ไม่เกี่ยวกับการรักษาพยาบาล', 'col' => 'inc16'],
            '17' => ['name' => 'ค่ายานอกบัญชียาหลักแห่งชาติ (NED)', 'col' => 'inc17', 'opd' => (float) ($opdDrug->ned ?? 0), 'ipd' => (float) ($ipdDrug->ned ?? 0)],
        ];

        $rows = [];
        foreach ($defs as $code => $meta) {
            $col = $meta['col'];
            $opd = isset($meta['opd']) ? $meta['opd'] : (float) ($opdIncs->{$col} ?? 0);
            $ipd = isset($meta['ipd']) ? $meta['ipd'] : (float) ($ipdIncs->{$col} ?? 0);
            $tot = $opd + $ipd;
            if ($tot > 0) {
                $rows[] = [
                    'income_code' => $code,
                    'income_name' => $meta['name'],
                    'opd_amount' => $opd,
                    'ipd_amount' => $ipd,
                    'total_amount' => $tot,
                    'items' => (int) ($opdIncs->{$col.'_cnt'} ?? 0) + (int) ($ipdIncs->{$col.'_cnt'} ?? 0),
                    'share_percent' => $totalAmount > 0 ? round($tot / $totalAmount * 100, 1) : 0,
                ];
            }
        }
        usort($rows, fn ($a, $b) => $b['total_amount'] <=> $a['total_amount']);

        return $rows;
    }

    /**
     * @return list<array<string, float|int|string>>
     */
    private function buildByPttype($conn, string $startDate, string $endDate, float $totalAmount): array
    {
        // OPD by pttype
        $opdPttypes = $conn->table('vn_stat as v')
            ->leftJoin('ovst as o', 'o.vn', '=', 'v.vn')
            ->leftJoin('pttype as pt', 'pt.pttype', '=', 'v.pttype')
            ->whereBetween('v.vstdate', [$startDate, $endDate])
            ->where(function ($q) {
                $q->whereNull('o.an')->orWhere('o.an', '');
            })
            ->selectRaw('
                COALESCE(NULLIF(TRIM(v.pttype), \'\'), \'-\') as pttype_code,
                COALESCE(pt.name, NULLIF(TRIM(v.pttype), \'\'), \'ไม่ระบุสิทธิ\') as pttype_name,
                COUNT(DISTINCT v.vn) as opd_items,
                SUM(COALESCE(v.income, 0)) as opd_amount,
                SUM(COALESCE(v.paid_money, 0)) as cash_amount,
                SUM(COALESCE(v.uc_money, 0)) as debt_amount,
                SUM(COALESCE(v.remain_money, 0)) as unpaid_amount
            ')
            ->groupByRaw("COALESCE(NULLIF(TRIM(v.pttype), ''), '-')")
            ->groupByRaw("COALESCE(pt.name, NULLIF(TRIM(v.pttype), ''), 'ไม่ระบุสิทธิ')")
            ->get()
            ->keyBy('pttype_code');

        // IPD by pttype
        $ipdPttypes = $conn->table('an_stat as ast')
            ->leftJoin('pttype as pt', 'pt.pttype', '=', 'ast.pttype')
            ->whereBetween('ast.dchdate', [$startDate, $endDate])
            ->whereNotNull('ast.dchdate')
            ->where('ast.dchdate', '<>', '')
            ->where('ast.dchdate', '<>', '0000-00-00')
            ->selectRaw('
                COALESCE(NULLIF(TRIM(ast.pttype), \'\'), \'-\') as pttype_code,
                COALESCE(pt.name, NULLIF(TRIM(ast.pttype), \'\'), \'ไม่ระบุสิทธิ\') as pttype_name,
                COUNT(DISTINCT ast.an) as ipd_items,
                SUM(COALESCE(ast.income, 0)) as ipd_amount,
                SUM(COALESCE(ast.paid_money, 0)) as cash_amount,
                SUM(COALESCE(ast.uc_money, 0)) as debt_amount,
                SUM(COALESCE(ast.remain_money, 0)) as unpaid_amount
            ')
            ->groupByRaw("COALESCE(NULLIF(TRIM(ast.pttype), ''), '-')")
            ->groupByRaw("COALESCE(pt.name, NULLIF(TRIM(ast.pttype), ''), 'ไม่ระบุสิทธิ')")
            ->get()
            ->keyBy('pttype_code');

        $allCodes = $opdPttypes->keys()->merge($ipdPttypes->keys())->unique()->values();

        $list = $allCodes->map(function ($code) use ($opdPttypes, $ipdPttypes, $totalAmount) {
            $opd = $opdPttypes->get($code);
            $ipd = $ipdPttypes->get($code);
            $name = $opd->pttype_name ?? $ipd->pttype_name ?? 'ไม่ระบุสิทธิ';
            $opdAmount = (float) ($opd->opd_amount ?? 0);
            $ipdAmount = (float) ($ipd->ipd_amount ?? 0);
            $total = $opdAmount + $ipdAmount;
            $cash = (float) ($opd->cash_amount ?? 0) + (float) ($ipd->cash_amount ?? 0);
            $debt = (float) ($opd->debt_amount ?? 0) + (float) ($ipd->debt_amount ?? 0);
            $unpaid = (float) ($opd->unpaid_amount ?? 0) + (float) ($ipd->unpaid_amount ?? 0);
            $other = max(0.0, round($total - ($cash + $debt + $unpaid), 2));
            $items = (int) ($opd->opd_items ?? 0) + (int) ($ipd->ipd_items ?? 0);

            return [
                'pttype_code' => (string) $code,
                'pttype_name' => (string) $name,
                'opd_amount' => $opdAmount,
                'ipd_amount' => $ipdAmount,
                'cash_amount' => $cash,
                'debt_amount' => $debt,
                'unpaid_amount' => $unpaid,
                'other_amount' => $other,
                'total_amount' => $total,
                'items' => $items,
                'share_percent' => $totalAmount > 0 ? round($total / $totalAmount * 100, 1) : 0,
            ];
        })->sortByDesc('total_amount')->values()->all();

        return $list;
    }
}
