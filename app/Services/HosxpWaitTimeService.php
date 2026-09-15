<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * ระยะเวลารอคอยจาก HOSxP ตาราง service_time
 * ตามแนวทาง ovst.service1–service20 (I'm ARM / HOSxP Tip)
 *
 * service20 = ลงทะเบียนก่อนพิมพ์ใบสั่งยา
 * service3  = พิมพ์ใบสั่งยา / ส่งตรวจ
 * service4  = เริ่มซักประวัติ
 * service11 = ซักประวัติเสร็จ
 * service5  = แพทย์เริ่มตรวจ
 * service12 = แพทย์สั่งยาเสร็จ / ห้องฉุกเฉินบันทึกการให้บริการ
 * service13 = รับ LAB
 * service14 = รายงานผล LAB
 * service6  = ห้องยาเริ่ม Key ยา
 * service16 = จ่ายยาให้ผู้ป่วย
 *
 * ห้องยา: ถ้ามี service6 ใช้ 16-6 ไม่เช่นนั้นใช้ 16-12
 */
class HosxpWaitTimeService
{
    public const ALERT_MINUTES = 60;

    public const MAX_REASONABLE_MINUTES = 600;

    /** @return array<string, mixed> */
    public function empty(int $target = self::ALERT_MINUTES): array
    {
        return [
            'summary' => [
                'avg_los_minutes' => 0.0,
                'within_wait_target' => 0,
                'within_wait_rate' => 0.0,
                'wait_target_minutes' => $target,
                'wait_measured' => 0,
                'waiting_now' => 0,
                'waiting_over_60' => 0,
                'waiting_lab' => 0,
                'waiting_lab_over_60' => 0,
                'waiting_pharmacy' => 0,
                'waiting_pharmacy_over_60' => 0,
                'avg_in_hospital_minutes' => 0.0,
                'avg_lab_minutes' => 0.0,
                'avg_pharmacy_minutes' => 0.0,
                'wait_source' => 'service_time',
            ],
            'bands' => [],
            'stages' => [],
            'queue' => [],
            'lab_queue' => [],
            'pharmacy_queue' => [],
        ];
    }

    /**
     * @return array{summary: array<string, mixed>, bands: array<int, array<string, mixed>>, stages: array<int, array<string, mixed>>, queue: array<int, array<string, mixed>>}
     */
    public function dashboard($conn, string $code, string $start, string $end, string $mode = 'opd', int $target = self::ALERT_MINUTES): array
    {
        $empty = $this->empty($target);

        if (! HosxpSchema::tableExists($conn, 'service_time')) {
            return $empty;
        }

        try {
            $summary = $this->buildSummary($conn, $code, $start, $end, $mode, $target);
            $live = $this->liveCounts($conn, $code, $mode, $target);
            $summary['waiting_now'] = $live['waiting_now'];
            $summary['waiting_over_60'] = $live['waiting_over_60'];
            $summary['waiting_lab'] = $live['waiting_lab'];
            $summary['waiting_lab_over_60'] = $live['waiting_lab_over_60'];
            $summary['waiting_pharmacy'] = $live['waiting_pharmacy'];
            $summary['waiting_pharmacy_over_60'] = $live['waiting_pharmacy_over_60'];
            $summary['avg_in_hospital_minutes'] = $live['avg_in_hospital_minutes'];
            $summary['avg_lab_minutes'] = $live['avg_lab_minutes'];
            $summary['avg_pharmacy_minutes'] = $live['avg_pharmacy_minutes'];

            return [
                'summary' => $summary,
                'bands' => $this->buildBands($conn, $code, $start, $end, $mode, $target),
                'stages' => $this->buildStages($conn, $code, $start, $end, $mode, $target),
                'queue' => $this->buildQueue($conn, $code, $mode, $target),
                'lab_queue' => $this->buildLabQueue($conn, $code, $target),
                'pharmacy_queue' => $this->buildPharmacyQueue($conn, $code, $target),
            ];
        } catch (Throwable $e) {
            Log::warning('HosxpWaitTime dashboard failed: '.$e->getMessage());

            return $empty;
        }
    }

    /**
     * นับคิวที่กำลังรอวันนี้ สำหรับการ์ดหน้ารวมแผนก
     *
     * @return array{waiting_now: int, waiting_over_60: int, waiting_lab: int, waiting_lab_over_60: int, waiting_pharmacy: int, waiting_pharmacy_over_60: int, avg_in_hospital_minutes: float, avg_lab_minutes: float, avg_pharmacy_minutes: float}
     */
    public function liveCounts($conn, string $code, string $mode = 'opd', int $target = self::ALERT_MINUTES): array
    {
        $empty = [
            'waiting_now' => 0,
            'waiting_over_60' => 0,
            'waiting_lab' => 0,
            'waiting_lab_over_60' => 0,
            'waiting_pharmacy' => 0,
            'waiting_pharmacy_over_60' => 0,
            'avg_in_hospital_minutes' => 0.0,
            'avg_lab_minutes' => 0.0,
            'avg_pharmacy_minutes' => 0.0,
        ];

        if (! HosxpSchema::tableExists($conn, 'service_time')) {
            return $empty;
        }

        try {
            $doneCol = $this->doneColumn($mode);
            $waitStart = $this->waitStartSql($mode);
            $hospitalStart = $this->hospitalStartSql();
            $waitedSql = $this->liveMinutesSql($waitStart);
            $inHospitalSql = $this->liveMinutesSql($hospitalStart);
            $s13 = $this->nullTime('st.service13');
            $s14 = $this->nullTime('st.service14');
            $labWaitedSql = $this->liveMinutesSql($s13);

            $row = $conn->selectOne("
                SELECT
                    COUNT(*) as waiting_now,
                    SUM(CASE WHEN waited >= ? AND waited <= ? THEN 1 ELSE 0 END) as waiting_over_60,
                    ROUND(AVG(CASE WHEN in_hospital BETWEEN 0 AND ? THEN in_hospital END), 1) as avg_in_hospital
                FROM (
                    SELECT
                        CASE WHEN {$waitStart} IS NOT NULL THEN {$waitedSql} ELSE NULL END as waited,
                        CASE WHEN {$hospitalStart} IS NOT NULL THEN {$inHospitalSql} ELSE NULL END as in_hospital
                    FROM ovst o
                    INNER JOIN service_time st ON st.vn = o.vn
                    WHERE o.main_dep = ?
                      AND o.vstdate = CURDATE()
                      AND {$doneCol} IS NULL
                      AND ({$hospitalStart} IS NOT NULL OR {$waitStart} IS NOT NULL)
                ) t
            ", [$target, self::MAX_REASONABLE_MINUTES, 960, $code]);

            $lab = $conn->selectOne("
                SELECT
                    COUNT(*) as waiting_lab,
                    SUM(CASE WHEN waited >= ? AND waited <= ? THEN 1 ELSE 0 END) as waiting_lab_over_60,
                    ROUND(AVG(CASE WHEN waited BETWEEN 0 AND ? THEN waited END), 1) as avg_lab
                FROM (
                    SELECT {$labWaitedSql} as waited
                    FROM ovst o
                    INNER JOIN service_time st ON st.vn = o.vn
                    WHERE o.main_dep = ?
                      AND o.vstdate = CURDATE()
                      AND {$s13} IS NOT NULL
                      AND {$s14} IS NULL
                ) t
                WHERE waited BETWEEN 0 AND ?
            ", [$target, self::MAX_REASONABLE_MINUTES, self::MAX_REASONABLE_MINUTES, $code, self::MAX_REASONABLE_MINUTES]);

            $s6 = $this->nullTime('st.service6');
            $s16 = $this->nullTime('st.service16');
            $pharmacyWaitedSql = $this->liveMinutesSql($s6);

            $pharmacy = $conn->selectOne("
                SELECT
                    COUNT(*) as waiting_pharmacy,
                    SUM(CASE WHEN waited >= ? AND waited <= ? THEN 1 ELSE 0 END) as waiting_pharmacy_over_60,
                    ROUND(AVG(CASE WHEN waited BETWEEN 0 AND ? THEN waited END), 1) as avg_pharmacy
                FROM (
                    SELECT {$pharmacyWaitedSql} as waited
                    FROM ovst o
                    INNER JOIN service_time st ON st.vn = o.vn
                    WHERE o.main_dep = ?
                      AND o.vstdate = CURDATE()
                      AND {$s6} IS NOT NULL
                      AND {$s16} IS NULL
                ) t
                WHERE waited BETWEEN 0 AND ?
            ", [$target, self::MAX_REASONABLE_MINUTES, self::MAX_REASONABLE_MINUTES, $code, self::MAX_REASONABLE_MINUTES]);

            return [
                'waiting_now' => (int) ($row->waiting_now ?? 0),
                'waiting_over_60' => (int) ($row->waiting_over_60 ?? 0),
                'waiting_lab' => (int) ($lab->waiting_lab ?? 0),
                'waiting_lab_over_60' => (int) ($lab->waiting_lab_over_60 ?? 0),
                'waiting_pharmacy' => (int) ($pharmacy->waiting_pharmacy ?? 0),
                'waiting_pharmacy_over_60' => (int) ($pharmacy->waiting_pharmacy_over_60 ?? 0),
                'avg_in_hospital_minutes' => round((float) ($row->avg_in_hospital ?? 0), 1),
                'avg_lab_minutes' => round((float) ($lab->avg_lab ?? 0), 1),
                'avg_pharmacy_minutes' => round((float) ($pharmacy->avg_pharmacy ?? 0), 1),
            ];
        } catch (Throwable $e) {
            Log::warning('HosxpWaitTime liveCounts failed: '.$e->getMessage());

            return $empty;
        }
    }

    /** @return array<string, mixed> */
    private function buildSummary($conn, string $code, string $start, string $end, string $mode, int $target): array
    {
        $waitStart = $this->waitStartSql($mode);
        $endTime = $this->doneTimeSql($mode);
        $mins = $this->minutesSql($waitStart, $endTime);

        $row = $conn->selectOne("
            SELECT
                ROUND(AVG(CASE WHEN mins BETWEEN 0 AND ? THEN mins END), 1) as avg_wait,
                SUM(CASE WHEN mins BETWEEN 0 AND ? THEN 1 ELSE 0 END) as within_target,
                SUM(CASE WHEN mins BETWEEN 0 AND ? THEN 1 ELSE 0 END) as measured,
                SUM(CASE WHEN mins > ? AND mins <= ? THEN 1 ELSE 0 END) as over_target
            FROM (
                SELECT {$mins} as mins
                FROM ovst o
                INNER JOIN service_time st ON st.vn = o.vn
                WHERE o.main_dep = ?
                  AND o.vstdate BETWEEN ? AND ?
                  AND {$waitStart} IS NOT NULL
                  AND {$endTime} IS NOT NULL
            ) t
        ", [
            self::MAX_REASONABLE_MINUTES,
            $target,
            self::MAX_REASONABLE_MINUTES,
            $target,
            self::MAX_REASONABLE_MINUTES,
            $code,
            $start,
            $end,
        ]);

        $measured = (int) ($row->measured ?? 0);
        $within = (int) ($row->within_target ?? 0);

        return [
            'avg_los_minutes' => round((float) ($row->avg_wait ?? 0), 1),
            'within_wait_target' => $within,
            'within_wait_rate' => $measured > 0 ? round(($within / $measured) * 100, 1) : 0.0,
            'wait_target_minutes' => $target,
            'wait_measured' => $measured,
            'wait_over_target' => (int) ($row->over_target ?? 0),
            'wait_source' => 'service_time',
        ];
    }

    /** @return array<int, array{code: string, name: string, total: number}> */
    private function buildBands($conn, string $code, string $start, string $end, string $mode, int $target): array
    {
        $waitStart = $this->waitStartSql($mode);
        $endTime = $this->doneTimeSql($mode);
        $mins = $this->minutesSql($waitStart, $endTime);
        $midLabel = '31-'.$target.' นาที';

        $rows = $conn->select("
            SELECT band as name, COUNT(*) as total, MIN(sort_no) as sort_no
            FROM (
                SELECT
                    CASE
                        WHEN mins < 0 OR mins > ? THEN 'ข้อมูลผิดปกติ'
                        WHEN mins <= 15 THEN '≤ 15 นาที'
                        WHEN mins <= 30 THEN '16-30 นาที'
                        WHEN mins <= ? THEN ?
                        WHEN mins <= 90 THEN '61-90 นาที'
                        WHEN mins <= 120 THEN '91-120 นาที'
                        ELSE '> 120 นาที'
                    END as band,
                    CASE
                        WHEN mins < 0 OR mins > ? THEN 7
                        WHEN mins <= 15 THEN 1
                        WHEN mins <= 30 THEN 2
                        WHEN mins <= ? THEN 3
                        WHEN mins <= 90 THEN 4
                        WHEN mins <= 120 THEN 5
                        ELSE 6
                    END as sort_no
                FROM (
                    SELECT {$mins} as mins
                    FROM ovst o
                    INNER JOIN service_time st ON st.vn = o.vn
                    WHERE o.main_dep = ?
                      AND o.vstdate BETWEEN ? AND ?
                      AND {$waitStart} IS NOT NULL
                      AND {$endTime} IS NOT NULL
                ) t
            ) b
            GROUP BY band
            ORDER BY sort_no
        ", [
            self::MAX_REASONABLE_MINUTES,
            $target,
            $midLabel,
            self::MAX_REASONABLE_MINUTES,
            $target,
            $code,
            $start,
            $end,
        ]);

        return collect($rows)->map(fn ($row) => [
            'code' => (string) $row->name,
            'name' => (string) $row->name,
            'total' => (int) $row->total,
            'alert' => in_array((string) $row->name, ['61-90 นาที', '91-120 นาที', '> 120 นาที'], true),
        ])->values()->all();
    }

    /** @return array<int, array<string, mixed>> */
    private function buildStages($conn, string $code, string $start, string $end, string $mode, int $target): array
    {
        $arrival = $this->arrivalSql();
        $s4 = $this->nullTime('st.service4');
        $s11 = $this->nullTime('st.service11');
        $s5 = $this->nullTime('st.service5');
        $s12 = $this->nullTime('st.service12');
        $s13 = $this->nullTime('st.service13');
        $s14 = $this->nullTime('st.service14');
        $pharmacy = $this->pharmacyMinutesSql();

        $defs = match ($mode) {
            'er' => [
                ['code' => 'wait_triage', 'name' => 'รอเริ่มซักประวัติ', 'hint' => 'ลงทะเบียน → เริ่มซักประวัติ (service20/3 → 4)', 'sql' => $this->minutesSql($arrival, $s4)],
                ['code' => 'screening', 'name' => 'ระยะคัดกรอง', 'hint' => 'เริ่มซักประวัติ → ซักประวัติเสร็จ (service4 → 11)', 'sql' => $this->minutesSql($s4, $s11)],
                ['code' => 'to_er', 'name' => 'รอรับบริการ ER', 'hint' => 'ลงทะเบียน → บันทึกบริการ ER (service20/3 → 12)', 'sql' => $this->minutesSql($arrival, $s12)],
                ['code' => 'to_doctor', 'name' => 'รอพบแพทย์ ER', 'hint' => 'ลงทะเบียน → แพทย์เริ่มตรวจ (service5) เมื่อมีบันทึก', 'sql' => $this->minutesSql($arrival, $s5)],
                ['code' => 'wait_lab', 'name' => 'รอ LAB', 'hint' => 'รับ LAB → รายงานผล (service13 → 14)', 'sql' => $this->minutesSql($s13, $s14)],
                ['code' => 'wait_pharmacy', 'name' => 'รอจ่ายยา', 'hint' => 'เริ่ม Key ยาหรือตรวจเสร็จ → จ่ายยา (service6/12 → 16)', 'sql' => $pharmacy],
            ],
            'clinic' => [
                ['code' => 'wait_start', 'name' => 'รอเริ่มบริการ', 'hint' => 'ลงทะเบียน → เริ่มซักประวัติ (service20 → 4)', 'sql' => $this->minutesSql($arrival, $s4)],
                ['code' => 'service_span', 'name' => 'ระยะให้บริการ', 'hint' => 'เริ่มซักประวัติ → ปิดบริการ (service4 → 12)', 'sql' => $this->minutesSql($s4, $s12)],
                ['code' => 'to_done', 'name' => 'อยู่ในแผนก', 'hint' => 'ลงทะเบียน → ปิดบริการ (service20 → 12)', 'sql' => $this->minutesSql($arrival, $s12)],
                ['code' => 'wait_lab', 'name' => 'รอ LAB', 'hint' => 'รับ LAB → รายงานผล (service13 → 14)', 'sql' => $this->minutesSql($s13, $s14)],
                ['code' => 'wait_pharmacy', 'name' => 'รอจ่ายยา', 'hint' => 'เริ่ม Key ยาหรือตรวจเสร็จ → จ่ายยา (service6/12 → 16)', 'sql' => $pharmacy],
            ],
            default => [
                ['code' => 'wait_screen', 'name' => 'รอคัดกรอง', 'hint' => 'ลงทะเบียน → เริ่มซักประวัติ (service20 → 4)', 'sql' => $this->minutesSql($arrival, $s4)],
                ['code' => 'screening', 'name' => 'ระยะคัดกรอง', 'hint' => 'เริ่มซักประวัติ → ซักประวัติเสร็จ (service4 → 11)', 'sql' => $this->minutesSql($s4, $s11)],
                ['code' => 'wait_doctor', 'name' => 'รอพบแพทย์', 'hint' => 'เริ่มซักประวัติ → แพทย์เริ่มตรวจ (service4 → 5)', 'sql' => $this->minutesSql($s4, $s5)],
                ['code' => 'wait_lab', 'name' => 'รอ LAB', 'hint' => 'รับ LAB → รายงานผล (service13 → 14)', 'sql' => $this->minutesSql($s13, $s14)],
                ['code' => 'wait_pharmacy', 'name' => 'รอจ่ายยา', 'hint' => 'เริ่ม Key ยาหรือตรวจเสร็จ → จ่ายยา (service6/12 → 16)', 'sql' => $pharmacy],
            ],
        };

        $selects = [];
        foreach ($defs as $i => $def) {
            $alias = 's'.$i;
            $selects[] = "ROUND(AVG(CASE WHEN {$alias} BETWEEN 0 AND ".self::MAX_REASONABLE_MINUTES." THEN {$alias} END), 1) as {$alias}_avg";
            $selects[] = "SUM(CASE WHEN {$alias} BETWEEN 0 AND ".self::MAX_REASONABLE_MINUTES." THEN 1 ELSE 0 END) as {$alias}_n";
            $selects[] = "SUM(CASE WHEN {$alias} > {$target} AND {$alias} <= ".self::MAX_REASONABLE_MINUTES." THEN 1 ELSE 0 END) as {$alias}_over";
        }

        $inner = [];
        foreach ($defs as $i => $def) {
            $inner[] = $def['sql'].' as s'.$i;
        }

        $row = $conn->selectOne('
            SELECT '.implode(', ', $selects).'
            FROM (
                SELECT '.implode(', ', $inner).'
                FROM ovst o
                INNER JOIN service_time st ON st.vn = o.vn
                WHERE o.main_dep = ?
                  AND o.vstdate BETWEEN ? AND ?
            ) t
        ', [$code, $start, $end]);

        $out = [];
        foreach ($defs as $i => $def) {
            $avgKey = 's'.$i.'_avg';
            $nKey = 's'.$i.'_n';
            $overKey = 's'.$i.'_over';
            $out[] = [
                'code' => $def['code'],
                'name' => $def['name'],
                'hint' => $def['hint'],
                'avg' => round((float) ($row->{$avgKey} ?? 0), 1),
                'measured' => (int) ($row->{$nKey} ?? 0),
                'over_target' => (int) ($row->{$overKey} ?? 0),
            ];
        }

        return $out;
    }

    /** @return array<int, array<string, mixed>> */
    private function buildQueue($conn, string $code, string $mode, int $target): array
    {
        $s4 = $this->nullTime('st.service4');
        $s11 = $this->nullTime('st.service11');
        $s5 = $this->nullTime('st.service5');
        $s12 = $this->nullTime('st.service12');
        $hospitalStart = $this->hospitalStartSql();
        $waitStart = $this->waitStartSql($mode);
        $doneCol = $this->doneColumn($mode);
        $waitedSql = $this->liveMinutesSql($waitStart);
        $inHospitalSql = $this->liveMinutesSql($hospitalStart);
        $hasPatient = HosxpSchema::tableExists($conn, 'patient');
        $hasEr = $mode === 'er' && HosxpSchema::tableExists($conn, 'er_regist');
        $hasErType = $hasEr && HosxpSchema::tableExists($conn, 'er_emergency_type');

        $nameSql = $hasPatient
            ? "TRIM(CONCAT(IFNULL(pt.pname,''), IFNULL(pt.fname,''), ' ', IFNULL(pt.lname,'')))"
            : "''";
        $joinPatient = $hasPatient ? 'LEFT JOIN patient pt ON pt.hn = o.hn' : '';
        $joinEr = $hasEr ? 'LEFT JOIN er_regist er ON er.vn = o.vn' : '';
        $joinErType = $hasErType ? 'LEFT JOIN er_emergency_type et ON et.er_emergency_type = er.er_emergency_type' : '';
        $erTypeSql = $hasErType ? "COALESCE(NULLIF(et.name,''), '')" : "''";

        if ($mode === 'er') {
            $stageSql = "CASE
                WHEN {$s12} IS NOT NULL THEN 'รับบริการแล้ว'
                WHEN {$s5} IS NOT NULL THEN 'แพทย์กำลังตรวจ'
                WHEN {$s11} IS NOT NULL THEN 'คัดกรองแล้ว รอแพทย์'
                WHEN {$s4} IS NOT NULL THEN 'กำลังคัดกรอง'
                ELSE 'รอรับบริการ ER'
            END";
        } elseif ($mode === 'clinic') {
            $stageSql = "CASE
                WHEN {$s12} IS NOT NULL THEN 'ให้บริการแล้ว'
                WHEN {$s11} IS NOT NULL THEN 'กำลังให้บริการ'
                WHEN {$s4} IS NOT NULL THEN 'เริ่มซักประวัติ'
                ELSE 'รอเริ่มบริการ'
            END";
        } else {
            $stageSql = "CASE
                WHEN {$s5} IS NOT NULL THEN 'พบแพทย์แล้ว'
                WHEN {$s11} IS NOT NULL THEN 'รอพบแพทย์'
                WHEN {$s4} IS NOT NULL THEN 'กำลังคัดกรอง'
                ELSE 'รอคัดกรอง'
            END";
        }

        $rows = $conn->select("
            SELECT * FROM (
                SELECT
                    o.vn,
                    o.hn,
                    {$nameSql} as patient_name,
                    {$hospitalStart} as arrived_at,
                    {$s4} as screen_start,
                    {$s11} as screen_end,
                    {$s5} as doctor_start,
                    {$s12} as service_done,
                    CASE WHEN {$waitStart} IS NOT NULL THEN {$waitedSql} ELSE NULL END as waited,
                    CASE WHEN {$hospitalStart} IS NOT NULL THEN {$inHospitalSql} ELSE NULL END as in_hospital,
                    {$stageSql} as stage,
                    {$erTypeSql} as er_type
                FROM ovst o
                INNER JOIN service_time st ON st.vn = o.vn
                {$joinPatient}
                {$joinEr}
                {$joinErType}
                WHERE o.main_dep = ?
                  AND o.vstdate = CURDATE()
                  AND {$doneCol} IS NULL
                  AND ({$hospitalStart} IS NOT NULL OR {$waitStart} IS NOT NULL)
            ) t
            WHERE (waited IS NULL OR waited BETWEEN 0 AND ?)
              AND (in_hospital IS NULL OR in_hospital BETWEEN 0 AND 960)
            ORDER BY (waited >= {$target}) DESC, waited DESC, in_hospital DESC
            LIMIT 40
        ", [$code, self::MAX_REASONABLE_MINUTES]);

        return collect($rows)->map(function ($row) use ($target) {
            $waited = $row->waited === null ? null : (int) $row->waited;
            $inHospital = $row->in_hospital === null ? null : (int) $row->in_hospital;

            return [
                'vn' => (string) $row->vn,
                'hn' => (string) $row->hn,
                'name' => trim((string) ($row->patient_name ?? '')) ?: 'ไม่ระบุชื่อ',
                'arrived_at' => substr((string) ($row->arrived_at ?? ''), 0, 8),
                'stage' => (string) ($row->stage ?? ''),
                'er_type' => (string) ($row->er_type ?? ''),
                'waited' => $waited,
                'in_hospital' => $inHospital,
                'alert' => $waited !== null && $waited >= $target,
            ];
        })->values()->all();
    }

    /** @return array<int, array<string, mixed>> */
    private function buildLabQueue($conn, string $code, int $target): array
    {
        $s13 = $this->nullTime('st.service13');
        $s14 = $this->nullTime('st.service14');
        $hospitalStart = $this->hospitalStartSql();
        $labWaitedSql = $this->liveMinutesSql($s13);
        $hasPatient = HosxpSchema::tableExists($conn, 'patient');
        $nameSql = $hasPatient
            ? "TRIM(CONCAT(IFNULL(pt.pname,''), IFNULL(pt.fname,''), ' ', IFNULL(pt.lname,'')))"
            : "''";
        $joinPatient = $hasPatient ? 'LEFT JOIN patient pt ON pt.hn = o.hn' : '';

        try {
            $rows = $conn->select("
                SELECT * FROM (
                    SELECT
                        o.vn,
                        o.hn,
                        {$nameSql} as patient_name,
                        {$hospitalStart} as arrived_at,
                        {$s13} as lab_start,
                        {$labWaitedSql} as waited
                    FROM ovst o
                    INNER JOIN service_time st ON st.vn = o.vn
                    {$joinPatient}
                    WHERE o.main_dep = ?
                      AND o.vstdate = CURDATE()
                      AND {$s13} IS NOT NULL
                      AND {$s14} IS NULL
                ) t
                WHERE waited BETWEEN 0 AND ?
                ORDER BY (waited >= {$target}) DESC, waited DESC
                LIMIT 40
            ", [$code, self::MAX_REASONABLE_MINUTES]);
        } catch (Throwable $e) {
            Log::warning('HosxpWaitTime lab queue failed: '.$e->getMessage());

            return [];
        }

        return collect($rows)->map(function ($row) use ($target) {
            $waited = (int) ($row->waited ?? 0);

            return [
                'vn' => (string) $row->vn,
                'hn' => (string) $row->hn,
                'name' => trim((string) ($row->patient_name ?? '')) ?: 'ไม่ระบุชื่อ',
                'arrived_at' => substr((string) ($row->arrived_at ?? ''), 0, 8),
                'lab_start' => substr((string) ($row->lab_start ?? ''), 0, 8),
                'waited' => $waited,
                'alert' => $waited >= $target,
            ];
        })->values()->all();
    }

    /** @return array<int, array<string, mixed>> */
    private function buildPharmacyQueue($conn, string $code, int $target): array
    {
        $s6 = $this->nullTime('st.service6');
        $s16 = $this->nullTime('st.service16');
        $pharmacyWaitedSql = $this->liveMinutesSql($s6);
        $hasPatient = HosxpSchema::tableExists($conn, 'patient');
        $nameSql = $hasPatient
            ? "TRIM(CONCAT(IFNULL(pt.pname,''), IFNULL(pt.fname,''), ' ', IFNULL(pt.lname,'')))"
            : "''";
        $joinPatient = $hasPatient ? 'LEFT JOIN patient pt ON pt.hn = o.hn' : '';

        try {
            $rows = $conn->select("
                SELECT * FROM (
                    SELECT
                        o.vn,
                        o.hn,
                        {$nameSql} as patient_name,
                        {$s6} as lab_start,
                        {$pharmacyWaitedSql} as waited
                    FROM ovst o
                    INNER JOIN service_time st ON st.vn = o.vn
                    {$joinPatient}
                    WHERE o.main_dep = ?
                      AND o.vstdate = CURDATE()
                      AND {$s6} IS NOT NULL
                      AND {$s16} IS NULL
                ) t
                WHERE waited BETWEEN 0 AND ?
                ORDER BY (waited >= {$target}) DESC, waited DESC
                LIMIT 40
            ", [$code, self::MAX_REASONABLE_MINUTES]);
        } catch (Throwable $e) {
            Log::warning('HosxpWaitTime pharmacy queue failed: '.$e->getMessage());

            return [];
        }

        return collect($rows)->map(function ($row) use ($target) {
            $waited = (int) ($row->waited ?? 0);

            return [
                'vn' => (string) $row->vn,
                'hn' => (string) $row->hn,
                'name' => trim((string) ($row->patient_name ?? '')) ?: 'ไม่ระบุชื่อ',
                'arrived_at' => substr((string) ($row->lab_start ?? ''), 0, 8),
                'lab_start' => substr((string) ($row->lab_start ?? ''), 0, 8),
                'stage' => 'รอจ่ายยา',
                'waited' => $waited,
                'alert' => $waited >= $target,
            ];
        })->values()->all();
    }

    private function waitStartSql(string $mode): string
    {
        return $mode === 'opd' ? $this->nullTime('st.service4') : $this->arrivalSql();
    }

    private function doneColumn(string $mode): string
    {
        return $mode === 'opd' ? 'st.service5' : 'st.service12';
    }

    private function doneTimeSql(string $mode): string
    {
        return $this->nullTime($this->doneColumn($mode));
    }

    private function pharmacyMinutesSql(): string
    {
        $s6 = $this->nullTime('st.service6');
        $s12 = $this->nullTime('st.service12');
        $s16 = $this->nullTime('st.service16');

        return "CASE WHEN {$s6} IS NOT NULL THEN ".$this->minutesSql($s6, $s16).' ELSE '.$this->minutesSql($s12, $s16).' END';
    }

    private function hospitalStartSql(): string
    {
        return $this->nullTime('st.service20');
    }

    private function arrivalSql(): string
    {
        return 'COALESCE('
            .$this->nullTime('st.service20').', '
            .$this->nullTime('st.service3').', '
            .$this->nullTime('st.vsttime').', '
            .$this->nullTime('o.vsttime')
            .')';
    }

    private function nullTime(string $expr): string
    {
        return "NULLIF(NULLIF(CAST({$expr} AS CHAR), ''), '00:00:00')";
    }

    private function minutesSql(string $startTimeSql, string $endTimeSql, string $dateSql = 'o.vstdate'): string
    {
        return "CASE
            WHEN {$startTimeSql} IS NULL OR {$endTimeSql} IS NULL THEN NULL
            WHEN {$endTimeSql} >= {$startTimeSql}
                THEN TIMESTAMPDIFF(MINUTE, TIMESTAMP({$dateSql}, {$startTimeSql}), TIMESTAMP({$dateSql}, {$endTimeSql}))
            ELSE TIMESTAMPDIFF(MINUTE, TIMESTAMP({$dateSql}, {$startTimeSql}), TIMESTAMP(DATE_ADD({$dateSql}, INTERVAL 1 DAY), {$endTimeSql}))
        END";
    }

    private function liveMinutesSql(string $startTimeSql, string $dateSql = 'o.vstdate'): string
    {
        return "TIMESTAMPDIFF(MINUTE, TIMESTAMP({$dateSql}, {$startTimeSql}), NOW())";
    }
}
