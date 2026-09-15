<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Hospital aggregates shared by the main dashboard and FSHH Chat.
 * Totals only — no patient names, CID, HN/AN lists.
 */
class HosxpHospitalStatsService
{
    /**
     * @return array<string, mixed>
     */
    public function chatSnapshot(): array
    {
        try {
            if (! config('database.connections.hosxp')) {
                return ['available' => false];
            }
            DB::connection('hosxp')->getPdo();
        } catch (\Throwable) {
            return ['available' => false, 'note' => 'เว็บแอปยังต่อคลังสถิติโรงพยาบาลไม่ได้'];
        }

        $conn = DB::connection('hosxp');
        $today = now()->toDateString();
        $monthStart = now()->copy()->startOfMonth()->toDateString();

        $todayOps = $this->todayOperations($conn, $today, $monthStart);
        $monthVisits = $this->visitCounts($conn, $monthStart, $today);
        $monthRevenue = (float) $conn->table('opitemrece')
            ->whereBetween('vstdate', [$monthStart, $today])
            ->sum('sum_price');
        $appointments = $this->appointmentStats($conn, $monthStart, $today, $today);

        return [
            'available' => true,
            'source' => 'สูตรเดียวกับแดชบอร์ดหลักของเว็บแอป (ยอดรวม ไม่มีรายชื่อคนไข้)',
            'definitions' => [
                'today.opd' => 'Visit ผู้ป่วยนอกวันนี้ จาก ovst.vstdate — ตรงช่อง OPD วันนี้บนแดชบอร์ด ไม่ใช่การ์ดใหญ่ที่นับช่วงวันที่เลือก',
                'today.opd_cost' => 'ค่ารักษา OPD วันนี้ ไม่รวมรายการที่มี AN (IPD)',
                'today.payment.total' => 'ยอดค่าบริการวันนี้ รวมทุกสถานะการชำระ จาก opitemrece',
                'today.appointments' => 'นัดวันนี้จาก oapp.nextdate — มาตามนัดถ้า patient_visit=Y หรือมี visit_vn หรือมี visit ใน ovst วันเดียวกัน',
                'month' => 'ยอดเดือนปฏิทินปัจจุบัน ไม่ใช่ช่วง 6 เดือนบนการ์ดใหญ่ของแดชบอร์ด',
                'top5_diseases_opd' => '5 โรคที่พบบ่อยสุดเดือนนี้ จาก ovstdiag diagtype=1 (ชื่อจาก icd101 ถ้าวางได้)',
                'top_drugs' => 'ยาที่จ่ายมากสุดเดือนนี้ จาก opitemrece + drugitems (ชื่อยาและปริมาณ ไม่มีรายคน)',
                'department_visits' => 'จำนวน visit รายแผนกเดือนนี้ จาก ovst.main_dep + kskdepartment',
            ],
            'today' => [
                'date' => $today,
                'opd' => $todayOps['opd'],
                'ipd_admit' => $todayOps['ipd_admit'],
                'ipd_census' => $todayOps['ipd_census'],
                'er' => $todayOps['er'],
                'refer_out' => $todayOps['refer_out'],
                'opd_cost' => round((float) $todayOps['opd_cost'], 2),
                'revenue' => round((float) $todayOps['opd_cost'], 2),
                'payment' => $todayOps['payment'],
                'beds' => $todayOps['beds'],
                'appointments' => $appointments['today'],
            ],
            'month' => [
                'from' => $monthStart,
                'to' => $today,
                'opd' => $monthVisits['opd'],
                'ipd' => $monthVisits['ipd'],
                'er' => $monthVisits['er'],
                'revenue' => round($monthRevenue, 2),
                'revenue_by_right' => $this->revenueByRight($conn, $monthStart, $today),
                'appointments' => $appointments['period'],
                'top5_diseases_opd' => $this->topDiagnoses($conn, $monthStart, $today, 5),
                'department_visits' => $this->departmentVisits($conn, $monthStart, $today, 10),
                'top_drugs' => $this->topDrugs($conn, $monthStart, $today, 10),
            ],
        ];
    }

    /**
     * @return array{opd: int, ipd: int, er: int}
     */
    public function visitCounts($conn, string $from, string $to): array
    {
        $opd = (int) $conn->table('ovst')->whereBetween('vstdate', [$from, $to])->count();
        $ipd = (int) $conn->table('ipt')->whereBetween('regdate', [$from, $to])->count();
        $er = 0;
        if (HosxpSchema::tableExists($conn, 'er_regist')) {
            $er = (int) $conn->table('er_regist as er')
                ->join('ovst as o', 'o.vn', '=', 'er.vn')
                ->whereBetween('o.vstdate', [$from, $to])
                ->where('o.main_dep', '003')
                ->distinct('o.vn')
                ->count('o.vn');
        }

        return ['opd' => $opd, 'ipd' => $ipd, 'er' => $er];
    }

    /**
     * @return array<string, mixed>
     */
    public function todayOperations($conn, string $today, string $monthStart): array
    {
        $visits = $this->visitCounts($conn, $today, $today);
        $ipdCensus = (int) $conn->table('ipt')
            ->where(function ($q) {
                $q->whereNull('dchdate')->orWhere('dchdate', '')->orWhere('dchdate', '0000-00-00');
            })
            ->count();

        $referOutToday = HosxpSchema::tableExists($conn, 'referout')
            ? (int) $conn->table('referout')->where('refer_date', $today)->count()
            : 0;

        $opdCostToday = (float) $conn->table('opitemrece as oi')
            ->leftJoin('ovst as o', 'o.vn', '=', 'oi.vn')
            ->where('oi.vstdate', $today)
            ->where(function ($q) {
                $q->whereNull('oi.an')->orWhere('oi.an', '');
            })
            ->where(function ($q) {
                $q->whereNull('o.an')->orWhere('o.an', '');
            })
            ->sum('oi.sum_price');

        $paymentRows = $conn->table('opitemrece as oi')
            ->leftJoin('paidst as ps', 'ps.paidst', '=', 'oi.paidst')
            ->where('oi.vstdate', $today)
            ->selectRaw("COALESCE(oi.paidst, '-') as paidst")
            ->selectRaw("COALESCE(ps.name, 'ไม่ระบุ') as name")
            ->selectRaw('COALESCE(SUM(oi.sum_price), 0) as total')
            ->groupBy('oi.paidst', 'ps.name')
            ->get();

        $selfPay = 0.0;
        $debt = 0.0;
        $unpaid = 0.0;
        foreach ($paymentRows as $row) {
            $paidst = (string) $row->paidst;
            $total = (float) $row->total;
            if (in_array($paidst, ['01', '03'], true)) {
                $selfPay += $total;
            } elseif ($paidst === '02') {
                $debt += $total;
            } elseif ($paidst === '00') {
                $unpaid += $total;
            }
        }

        $totalBeds = HosxpSchema::tableExists($conn, 'bedno')
            ? (int) $this->nonCowardBedQuery($conn)->count()
            : 0;
        $occupiedBeds = 0;
        if (HosxpSchema::tableExists($conn, 'bedno') && HosxpSchema::columnExists($conn, 'ipt', 'cur_bedno')) {
            $occupiedBeds = (int) $this->nonCowardBedQuery($conn)
                ->join('ipt as i', 'i.cur_bedno', '=', 'b.bedno')
                ->where(function ($q) {
                    $q->whereNull('i.dchdate')->orWhere('i.dchdate', '')->orWhere('i.dchdate', '0000-00-00');
                })
                ->whereNotNull('i.cur_bedno')
                ->where('i.cur_bedno', '<>', '')
                ->distinct('b.bedno')
                ->count('b.bedno');
        }

        $freeBeds = max(0, $totalBeds - $occupiedBeds);
        $daysElapsed = max(1, (int) date('j', strtotime($today)));
        $bedDays = $this->calculateBedDaysThisMonth($conn, $monthStart, $today);
        $occupancyRate = $totalBeds > 0 ? round(($bedDays / ($totalBeds * $daysElapsed)) * 100, 1) : null;

        $adjRwThisMonth = (float) $conn->table('ipt')
            ->whereBetween('dchdate', [$monthStart, $today])
            ->sum('adjrw');

        return [
            'date' => $today,
            'opd' => $visits['opd'],
            'ipd_admit' => $visits['ipd'],
            'ipd_census' => $ipdCensus,
            'er' => $visits['er'],
            'refer_out' => $referOutToday,
            'opd_cost' => $opdCostToday,
            'payment' => [
                'self_pay' => $selfPay,
                'debt' => $debt,
                'unpaid' => $unpaid,
                'total' => $selfPay + $debt + $unpaid,
            ],
            'beds' => [
                'total' => $totalBeds,
                'occupied' => $occupiedBeds,
                'free' => $freeBeds,
                'occupancy_rate' => $occupancyRate,
                'adjrw_month' => round($adjRwThisMonth, 2),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function appointmentStats($conn, string $startDate, string $endDate, string $today): array
    {
        $emptyBucket = [
            'scheduled' => 0,
            'came' => 0,
            'not_came' => 0,
            'pending' => 0,
            'came_rate' => null,
        ];
        $empty = [
            'available' => false,
            'today' => ['date' => $today] + $emptyBucket,
            'period' => $emptyBucket,
            'monthly' => [],
            'source' => 'oapp.nextdate',
            'note' => 'ไม่พบตารางนัดหมาย oapp ใน HOSxP',
        ];

        if (! HosxpSchema::tableExists($conn, 'oapp') || ! HosxpSchema::columnExists($conn, 'oapp', 'nextdate')) {
            return $empty;
        }

        try {
            $cameSql = $this->appointmentCameSql($conn, 'oa');
            $statusFilter = HosxpSchema::columnExists($conn, 'oapp', 'oapp_status_id')
                ? 'AND (oa.oapp_status_id IS NULL OR oa.oapp_status_id <> 4)'
                : '';
            $notCameSql = $this->appointmentNotCameSql($conn, 'oa', $cameSql, $today);

            $select = "
                COUNT(*) AS scheduled,
                SUM(CASE WHEN {$cameSql} THEN 1 ELSE 0 END) AS came,
                SUM(CASE WHEN {$notCameSql} THEN 1 ELSE 0 END) AS not_came
            ";

            $todayRow = $conn->selectOne(
                "SELECT {$select} FROM oapp oa WHERE DATE(oa.nextdate) = ? {$statusFilter}",
                [$today]
            );
            $periodRow = $conn->selectOne(
                "SELECT {$select} FROM oapp oa WHERE DATE(oa.nextdate) BETWEEN ? AND ? {$statusFilter}",
                [$startDate, $endDate]
            );
            $monthlyRows = $conn->select(
                "SELECT YEAR(oa.nextdate) AS y, MONTH(oa.nextdate) AS m, {$select}
                 FROM oapp oa
                 WHERE DATE(oa.nextdate) BETWEEN ? AND ? {$statusFilter}
                 GROUP BY YEAR(oa.nextdate), MONTH(oa.nextdate)
                 ORDER BY y, m",
                [$startDate, $endDate]
            );
        } catch (\Throwable $e) {
            Log::warning('HOSxP appointment stats failed', ['message' => $e->getMessage()]);

            return [
                'available' => false,
                'today' => ['date' => $today] + $emptyBucket,
                'period' => $emptyBucket,
                'monthly' => [],
                'source' => 'oapp.nextdate',
                'note' => 'โหลดยอดนัดหมายจาก HOSxP ไม่สำเร็จ',
            ];
        }

        $rate = fn (array $bucket) => $bucket['scheduled'] > 0
            ? round(($bucket['came'] / $bucket['scheduled']) * 100, 1)
            : null;

        $todayBucket = $this->appointmentBucketFromRow($todayRow);
        $periodBucket = $this->appointmentBucketFromRow($periodRow);
        $monthly = [];
        foreach ($monthlyRows as $row) {
            $bucket = $this->appointmentBucketFromRow($row);
            $y = (int) ($row->y ?? 0);
            $m = (int) ($row->m ?? 0);
            $monthly[] = [
                'y' => $y,
                'm' => $m,
                'label' => sprintf('%04d-%02d', $y, $m),
            ] + $bucket + ['came_rate' => $rate($bucket)];
        }

        return [
            'available' => true,
            'today' => ['date' => $today] + $todayBucket + ['came_rate' => $rate($todayBucket)],
            'period' => $periodBucket + ['came_rate' => $rate($periodBucket)],
            'monthly' => $monthly,
            'source' => 'oapp.nextdate + patient_visit/visit_vn/oapp_status_id + ovst same-day visit',
            'note' => null,
        ];
    }

    /**
     * @return list<array{icd10: string, name: string, total: int}>
     */
    public function topDiagnoses($conn, string $from, string $to, int $limit = 5): array
    {
        try {
            $query = $conn->table('ovstdiag as d')
                ->join('ovst as o', 'o.vn', '=', 'd.vn')
                ->whereBetween('o.vstdate', [$from, $to])
                ->where('d.diagtype', 1);

            if (HosxpSchema::tableExists($conn, 'icd101')) {
                $query->leftJoin('icd101 as icd', 'icd.code', '=', 'd.icd10')
                    ->selectRaw('d.icd10 as icd10')
                    ->selectRaw("COALESCE(NULLIF(TRIM(MAX(icd.tname)), ''), NULLIF(TRIM(MAX(icd.name)), ''), d.icd10) as name")
                    ->selectRaw('COUNT(*) as total')
                    ->groupBy('d.icd10');
            } else {
                $query->selectRaw('d.icd10 as icd10')
                    ->selectRaw('d.icd10 as name')
                    ->selectRaw('COUNT(*) as total')
                    ->groupBy('d.icd10');
            }

            return $query->orderByDesc('total')
                ->limit($limit)
                ->get()
                ->map(fn ($row) => [
                    'icd10' => (string) $row->icd10,
                    'name' => (string) $row->name,
                    'total' => (int) $row->total,
                ])->all();
        } catch (\Throwable $e) {
            Log::warning('HOSxP top diagnoses failed', ['message' => $e->getMessage()]);

            return [];
        }
    }

    /**
     * @return list<array{department: string, total: int}>
     */
    public function departmentVisits($conn, string $from, string $to, int $limit = 10): array
    {
        try {
            $rows = $conn->table('ovst as o')
                ->leftJoin('kskdepartment as dep', 'dep.depcode', '=', 'o.main_dep')
                ->whereBetween('o.vstdate', [$from, $to])
                ->selectRaw("COALESCE(NULLIF(dep.department, ''), NULLIF(o.main_dep, ''), 'ไม่ระบุแผนก') as department")
                ->selectRaw('COUNT(*) as total')
                ->groupByRaw("COALESCE(NULLIF(dep.department, ''), NULLIF(o.main_dep, ''), 'ไม่ระบุแผนก')")
                ->orderByDesc('total')
                ->limit($limit)
                ->get();

            return $rows->map(fn ($row) => [
                'department' => (string) $row->department,
                'total' => (int) $row->total,
            ])->all();
        } catch (\Throwable $e) {
            Log::warning('HOSxP department visits failed', ['message' => $e->getMessage()]);

            return [];
        }
    }

    /**
     * @return list<array{name: string, qty: float, amount: float}>
     */
    public function topDrugs($conn, string $from, string $to, int $limit = 10): array
    {
        if (! HosxpSchema::tableExists($conn, 'drugitems') || ! HosxpSchema::tableExists($conn, 'opitemrece')) {
            return [];
        }

        try {
            $rows = $conn->table('opitemrece as o')
                ->join('drugitems as d', 'd.icode', '=', 'o.icode')
                ->whereBetween('o.vstdate', [$from, $to])
                ->where('d.units', '<>', '-')
                ->selectRaw("COALESCE(NULLIF(TRIM(d.name), ''), o.icode) as name")
                ->selectRaw('COALESCE(SUM(o.qty), 0) as qty')
                ->selectRaw('COALESCE(SUM(o.sum_price), 0) as amount')
                ->groupByRaw("COALESCE(NULLIF(TRIM(d.name), ''), o.icode)")
                ->orderByDesc('qty')
                ->limit($limit)
                ->get();

            return $rows->map(fn ($row) => [
                'name' => (string) $row->name,
                'qty' => round((float) $row->qty, 2),
                'amount' => round((float) $row->amount, 2),
            ])->all();
        } catch (\Throwable $e) {
            Log::warning('HOSxP top drugs failed', ['message' => $e->getMessage()]);

            return [];
        }
    }

    /**
     * @return list<array{name: string, total: float}>
     */
    public function revenueByRight($conn, string $from, string $to): array
    {
        $expr = "COALESCE(NULLIF(pt.name, ''), NULLIF(o.pttype, ''), 'ไม่ระบุสิทธิ')";
        $rows = $conn->table('opitemrece as oi')
            ->join('ovst as o', 'o.vn', '=', 'oi.vn')
            ->leftJoin('pttype as pt', 'pt.pttype', '=', 'o.pttype')
            ->whereBetween('oi.vstdate', [$from, $to])
            ->selectRaw($expr.' as right_name')
            ->selectRaw('ROUND(SUM(oi.sum_price), 2) as total')
            ->groupByRaw($expr)
            ->orderByDesc('total')
            ->limit(20)
            ->get();

        return $rows->map(fn ($row) => [
            'name' => (string) $row->right_name,
            'total' => (float) $row->total,
        ])->all();
    }

    private function appointmentCameSql($conn, string $alias): string
    {
        $parts = [];
        if (HosxpSchema::columnExists($conn, 'oapp', 'oapp_status_id')) {
            $parts[] = "{$alias}.oapp_status_id = 2";
        }
        if (HosxpSchema::columnExists($conn, 'oapp', 'patient_visit')) {
            $parts[] = "UPPER(TRIM(COALESCE({$alias}.patient_visit, ''))) = 'Y'";
        }
        if (HosxpSchema::columnExists($conn, 'oapp', 'visit_vn')) {
            $parts[] = "TRIM(COALESCE({$alias}.visit_vn, '')) <> ''";
        }
        if (
            HosxpSchema::columnExists($conn, 'oapp', 'hn')
            && HosxpSchema::tableExists($conn, 'ovst')
            && HosxpSchema::columnExists($conn, 'ovst', 'hn')
            && HosxpSchema::columnExists($conn, 'ovst', 'vstdate')
        ) {
            $parts[] = "EXISTS (SELECT 1 FROM ovst ov WHERE ov.hn = {$alias}.hn AND ov.vstdate = DATE({$alias}.nextdate))";
        }

        return $parts === [] ? '0' : '('.implode(' OR ', $parts).')';
    }

    private function appointmentNotCameSql($conn, string $alias, string $cameSql, string $today): string
    {
        $todaySql = $conn->getPdo()->quote($today);
        $late = "DATE({$alias}.nextdate) <= {$todaySql}";
        if (HosxpSchema::columnExists($conn, 'oapp', 'oapp_status_id')) {
            $late = "{$alias}.oapp_status_id = 3 OR {$late}";
        }

        return "(NOT ({$cameSql}) AND ({$late}))";
    }

    /**
     * @return array{scheduled: int, came: int, not_came: int, pending: int}
     */
    private function appointmentBucketFromRow(?object $row): array
    {
        $scheduled = (int) ($row->scheduled ?? 0);
        $came = (int) ($row->came ?? 0);
        $notCame = (int) ($row->not_came ?? 0);

        return [
            'scheduled' => $scheduled,
            'came' => $came,
            'not_came' => $notCame,
            'pending' => max(0, $scheduled - $came - $notCame),
        ];
    }

    private function calculateBedDaysThisMonth($conn, string $monthStart, string $today): int
    {
        $rows = $conn->table('ipt as i')
            ->leftJoin('ward as w', 'w.ward', '=', 'i.ward')
            ->select('i.regdate', 'i.dchdate')
            ->where('i.regdate', '<=', $today)
            ->where(function ($q) {
                $q->whereNull('w.name')->orWhere('w.name', 'not like', '%COWARD%');
            })
            ->where(function ($q) use ($monthStart) {
                $q->whereNull('i.dchdate')
                    ->orWhere('i.dchdate', '')
                    ->orWhere('i.dchdate', '0000-00-00')
                    ->orWhere('i.dchdate', '>=', $monthStart);
            })
            ->get();

        $total = 0;
        foreach ($rows as $row) {
            $start = max(strtotime((string) $row->regdate), strtotime($monthStart));
            $dch = (string) ($row->dchdate ?? '');
            $end = ($dch === '' || $dch === '0000-00-00') ? strtotime($today) : min(strtotime($dch), strtotime($today));
            if ($start && $end && $end >= $start) {
                $total += (int) floor(($end - $start) / 86400) + 1;
            }
        }

        return $total;
    }

    private function nonCowardBedQuery($conn)
    {
        return $conn->table('bedno as b')
            ->leftJoin('roomno as r', 'r.roomno', '=', 'b.roomno')
            ->leftJoin('ward as w', 'w.ward', '=', 'r.ward')
            ->where(function ($q) {
                $q->whereNull('w.name')->orWhere('w.name', 'not like', '%COWARD%');
            })
            ->where(function ($q) {
                $q->whereNull('r.name')->orWhere('r.name', 'not like', '%COWARD%');
            });
    }
}
