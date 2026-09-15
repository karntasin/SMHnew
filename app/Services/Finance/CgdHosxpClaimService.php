<?php

namespace App\Services\Finance;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class CgdHosxpClaimService
{
    /** @var array{has_ovst_patient_record: bool, has_patient_outsider: bool}|null */
    private ?array $schema = null;

    public function available(): bool
    {
        try {
            if (! config('database.connections.hosxp')) {
                return false;
            }
            DB::connection('hosxp')->getPdo();

            return true;
        } catch (\Throwable $e) {
            Log::warning('HOSxP unavailable for CGD claim: '.$e->getMessage());

            return false;
        }
    }

    /**
     * ดึง Visit จาก HOSxP
     * - ถ้าส่ง $visitDates มา จะดึงเฉพาะวันที่ตรงกับวันเข้ารักษาในไฟล์ STM (ไม่ขาด/ไม่เกิน)
     * - ถ้าไม่ส่ง จะใช้ช่วง start-end แบบเดิม
     *
     * @param  list<string>  $visitDates  รายการวันที่ Y-m-d จากไฟล์ STM
     * @return array<int, array<string, mixed>>
     */
    public function fetchClaims(
        string $startDate,
        string $endDate,
        string $pttypeLike = '12%',
        array $excludeDeps = ['021'],
        array $visitDates = [],
    ): array {
        $excludeDeps = array_values(array_filter(array_map('strval', $excludeDeps)));
        if ($excludeDeps === []) {
            $excludeDeps = ['021'];
        }

        $this->prepareHeavyQuery();

        $visitDates = $this->normalizeVisitDates($visitDates);
        $mapped = [];

        if ($visitDates !== []) {
            foreach (array_chunk($visitDates, 31) as $dateChunk) {
                foreach ($this->selectClaimRows($dateChunk, null, null, $pttypeLike, $excludeDeps) as $row) {
                    $mapped[] = $this->mapClaimRow($row);
                }
            }

            return $mapped;
        }

        foreach ($this->monthWindows($startDate, $endDate) as [$from, $to]) {
            foreach ($this->selectClaimRows([], $from, $to, $pttypeLike, $excludeDeps) as $row) {
                $mapped[] = $this->mapClaimRow($row);
            }
        }

        return $mapped;
    }

    /**
     * ดึง Visit จาก HOSxP เป็นช่วง (ลดการใช้ RAM ของผลลัพธ์ชุดเดียว)
     *
     * @param  list<string>  $visitDates
     * @param  list<string>  $excludeDeps
     * @return list<object>
     */
    private function selectClaimRows(
        array $visitDates,
        ?string $startDate,
        ?string $endDate,
        string $pttypeLike,
        array $excludeDeps,
    ): array {
        $schema = $this->detectSchema();
        $depPlaceholders = implode(',', array_fill(0, count($excludeDeps), '?'));
        $nameExpr = $this->patientNameSql($schema);
        $pidExpr = $this->pidSql($schema);
        $extraJoins = $this->extraJoinsSql($schema);

        if ($visitDates !== []) {
            $datePlaceholders = implode(',', array_fill(0, count($visitDates), '?'));
            $dateClause = "v.vstdate IN ($datePlaceholders)";
            $params = array_merge($visitDates, $excludeDeps, [$pttypeLike]);
        } else {
            $dateClause = 'v.vstdate BETWEEN ? AND ?';
            $params = array_merge([(string) $startDate, (string) $endDate], $excludeDeps, [$pttypeLike]);
        }

        $sql = "
            SELECT
                v.vn,
                v.hn,
                {$pidExpr} AS pid,
                {$nameExpr} AS patient_name,
                SUBSTRING(
                    REPLACE(
                        REPLACE(
                            CONCAT(DATE_ADD(ov.vstdate, INTERVAL 543 YEAR), IFNULL(ov.vsttime, '000000')),
                            '-',
                            ''
                        ),
                        ':',
                        ''
                    ),
                    3
                ) AS seq_no,
                v.vstdate AS visit_date,
                ov.vsttime AS visit_time,
                (IFNULL(v.inc03,0) + IFNULL(v.inc17,0)) AS drug,
                IFNULL(v.inc02,0) AS artificial_organ,
                (
                    IFNULL(v.inc01,0) + IFNULL(v.inc04,0) + IFNULL(v.inc05,0) + IFNULL(v.inc06,0) +
                    IFNULL(v.inc07,0) + IFNULL(v.inc08,0) + IFNULL(v.inc09,0) + IFNULL(v.inc10,0) +
                    IFNULL(v.inc11,0) + IFNULL(v.inc12,0) + IFNULL(v.inc13,0) + IFNULL(v.inc14,0) +
                    IFNULL(v.inc15,0) + IFNULL(v.inc16,0)
                ) AS service_charge,
                (
                    IFNULL(v.inc01,0) + IFNULL(v.inc02,0) + IFNULL(v.inc03,0) + IFNULL(v.inc17,0) +
                    IFNULL(v.inc04,0) + IFNULL(v.inc05,0) + IFNULL(v.inc06,0) + IFNULL(v.inc07,0) +
                    IFNULL(v.inc08,0) + IFNULL(v.inc09,0) + IFNULL(v.inc10,0) + IFNULL(v.inc11,0) +
                    IFNULL(v.inc12,0) + IFNULL(v.inc13,0) + IFNULL(v.inc14,0) + IFNULL(v.inc15,0) +
                    IFNULL(v.inc16,0)
                ) AS total,
                IFNULL(v.paid_money,0) AS paid_money,
                IFNULL(v.uc_money,0) AS uc_money,
                k.department,
                COALESCE(NULLIF(TRIM(v.pttype), ''), NULLIF(TRIM(ov.pttype), '')) AS pttype_code,
                COALESCE(py.name, py_ov.name) AS pttype_name,
                COALESCE(py.hipdata_code, py_ov.hipdata_code) AS hipdata_code,
                COALESCE(py.hipdata_pttype, py_ov.hipdata_pttype) AS hipdata_pttype
            FROM vn_stat v
            LEFT JOIN ovst ov ON ov.vn = v.vn
            LEFT JOIN patient p ON p.hn = v.hn
            {$extraJoins}
            LEFT JOIN kskdepartment k ON k.depcode = ov.main_dep
            LEFT JOIN pttype py ON py.pttype = v.pttype
            LEFT JOIN pttype py_ov ON py_ov.pttype = ov.pttype
            WHERE {$dateClause}
              AND ov.an IS NULL
              AND ov.main_dep NOT IN ($depPlaceholders)
              AND v.pttype LIKE ?
            GROUP BY v.vn
            ORDER BY v.vn
        ";

        return DB::connection('hosxp')->select($sql, $params);
    }

    /**
     * @return array<string, mixed>
     */
    private function mapClaimRow(object|array $row): array
    {
        $item = (array) $row;
        $item['patient_name'] = $this->cleanName($item['patient_name'] ?? null);
        $item['pid'] = CgdClaimMatchKey::normalizePid($item['pid'] ?? null) ?: null;
        $item['pttype_code'] = trim((string) ($item['pttype_code'] ?? '')) ?: null;
        $item['pttype_name'] = trim((string) ($item['pttype_name'] ?? '')) ?: null;
        $item['hipdata_code'] = trim((string) ($item['hipdata_code'] ?? '')) ?: null;
        $item['pttype_label'] = $this->formatPttypeLabel(
            $item['pttype_code'],
            $item['pttype_name'],
            $item['hipdata_code']
        );
        $item['match_key'] = CgdClaimMatchKey::make(
            $item['hn'] ?? null,
            $item['pid'] ?? null,
            $item['seq_no'] ?? null
        );
        $item['total'] = CgdClaimMatchKey::parseMoney($item['total'] ?? 0);
        $item['drug'] = CgdClaimMatchKey::parseMoney($item['drug'] ?? 0);
        $item['artificial_organ'] = CgdClaimMatchKey::parseMoney($item['artificial_organ'] ?? 0);
        $item['service_charge'] = CgdClaimMatchKey::parseMoney($item['service_charge'] ?? 0);
        $item['paid_money'] = CgdClaimMatchKey::parseMoney($item['paid_money'] ?? 0);
        $item['uc_money'] = CgdClaimMatchKey::parseMoney($item['uc_money'] ?? 0);

        return $item;
    }

    /**
     * @return list<array{0:string,1:string}>
     */
    private function monthWindows(string $startDate, string $endDate): array
    {
        $windows = [];
        $cursor = new \DateTimeImmutable($startDate);
        $end = new \DateTimeImmutable($endDate);

        while ($cursor <= $end) {
            $monthEnd = $cursor->modify('last day of this month');
            $to = $monthEnd < $end ? $monthEnd : $end;
            $windows[] = [$cursor->format('Y-m-d'), $to->format('Y-m-d')];
            $cursor = $to->modify('+1 day');
        }

        return $windows;
    }

    private function prepareHeavyQuery(): void
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(300);
        DB::connection('hosxp')->disableQueryLog();
    }

    /**
     * @param  list<string|null>  $dates
     * @return list<string>
     */
    private function normalizeVisitDates(array $dates): array
    {
        $normalized = [];
        foreach ($dates as $date) {
            $date = trim((string) $date);
            if ($date === '' || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                continue;
            }
            $normalized[$date] = $date;
        }
        $normalized = array_values($normalized);
        sort($normalized);

        return $normalized;
    }

    private function detectSchema(): array
    {
        if ($this->schema !== null) {
            return $this->schema;
        }

        $builder = Schema::connection('hosxp');
        $this->schema = [
            'has_ovst_patient_record' => $builder->hasTable('ovst_patient_record'),
            'has_patient_outsider' => $builder->hasTable('patient_outsider'),
        ];

        return $this->schema;
    }

    private function extraJoinsSql(array $schema): string
    {
        $joins = [];
        if ($schema['has_ovst_patient_record']) {
            $joins[] = 'LEFT JOIN ovst_patient_record opr ON opr.vn = v.vn';
        }
        if ($schema['has_patient_outsider']) {
            $joins[] = 'LEFT JOIN patient_outsider po ON po.hn = v.hn';
        }

        return implode("\n            ", $joins);
    }

    /**
     * ดึงชื่อผู้ป่วยจาก HOSxP ตาม HN (สำหรับเติมชื่อในรายการ REP Error)
     *
     * @param  list<string>  $hns
     * @return array<string,string> keyed by normalized HN
     */
    public function fetchNamesByHn(array $hns): array
    {
        $hns = array_values(array_unique(array_filter(array_map('strval', $hns))));
        if ($hns === [] || ! $this->available()) {
            return [];
        }

        $padded = [];
        foreach ($hns as $hn) {
            $norm = CgdClaimMatchKey::normalizeHn($hn);
            if ($norm === '') {
                continue;
            }
            $padded[$norm] = true;
            $padded[str_pad($norm, 9, '0', STR_PAD_LEFT)] = true;
            $padded[$hn] = true;
        }
        $lookup = array_keys($padded);
        if ($lookup === []) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($lookup), '?'));
        $schema = $this->detectSchema();
        $nameExpr = $this->patientNameSql($schema);

        try {
            $rows = DB::connection('hosxp')->select(
                "SELECT p.hn, {$nameExpr} AS patient_name
                 FROM patient p
                 WHERE p.hn IN ({$placeholders})",
                $lookup
            );
        } catch (\Throwable $e) {
            Log::warning('HOSxP fetchNamesByHn failed: '.$e->getMessage());

            return [];
        }

        $map = [];
        foreach ($rows as $row) {
            $name = $this->cleanName($row->patient_name ?? null);
            $hnKey = CgdClaimMatchKey::normalizeHn($row->hn ?? null);
            if ($hnKey !== '' && $name && ! isset($map[$hnKey])) {
                $map[$hnKey] = $name;
            }
        }

        return $map;
    }

    private function patientNameSql(array $schema): string
    {
        $pname = ['NULLIF(TRIM(p.pname), \'\')'];
        $fname = ['NULLIF(TRIM(p.fname), \'\')'];
        $lname = ['NULLIF(TRIM(p.lname), \'\')'];

        if ($schema['has_ovst_patient_record']) {
            $pname[] = 'NULLIF(TRIM(opr.pname), \'\')';
            $fname[] = 'NULLIF(TRIM(opr.fname), \'\')';
            $lname[] = 'NULLIF(TRIM(opr.lname), \'\')';
        }
        if ($schema['has_patient_outsider']) {
            $pname[] = 'NULLIF(TRIM(po.pname), \'\')';
            $fname[] = 'NULLIF(TRIM(po.fname), \'\')';
            $lname[] = 'NULLIF(TRIM(po.lname), \'\')';
        }

        return 'TRIM(CONCAT('
            .'COALESCE('.implode(', ', $pname).', \'\'),'
            .'COALESCE('.implode(', ', $fname).', \'\'),'
            .'\' \','
            .'COALESCE('.implode(', ', $lname).', \'\')'
            .'))';
    }

    private function pidSql(array $schema): string
    {
        $parts = [
            'NULLIF(TRIM(p.cid), \'\')',
            'NULLIF(TRIM(v.cid), \'\')',
        ];
        if ($schema['has_ovst_patient_record']) {
            $parts[] = 'NULLIF(TRIM(opr.cid), \'\')';
        }

        return 'COALESCE('.implode(', ', $parts).')';
    }

    private function cleanName(?string $name): ?string
    {
        $name = trim(preg_replace('/\s+/', ' ', (string) $name) ?? '');

        return $name !== '' ? $name : null;
    }

    private function formatPttypeLabel(?string $code, ?string $name, ?string $hipdata = null): ?string
    {
        $code = trim((string) $code);
        $name = trim((string) $name);
        $hipdata = trim((string) $hipdata);

        if ($code === '' && $name === '') {
            return null;
        }

        $label = $code !== '' && $name !== ''
            ? $code.' · '.$name
            : ($name !== '' ? $name : $code);

        if ($hipdata !== '') {
            $label .= ' ('.$hipdata.')';
        }

        return $label;
    }
}
