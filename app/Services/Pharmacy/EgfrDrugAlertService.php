<?php

namespace App\Services\Pharmacy;

use App\Data\EgfrDrugAlertCatalog;
use App\Services\HosxpConnectionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class EgfrDrugAlertService
{
    public function __construct(private HosxpConnectionService $hosxp) {}

    /** @return array{connected: bool, database: ?string, message: string, checked_at: ?string, response_ms: ?int} */
    public function connectionStatus(): array
    {
        return $this->hosxp->check(false);
    }

    /**
     * @return array{
     *   connected: bool,
     *   connection: array<string, mixed>,
     *   filters: array<string, mixed>,
     *   summary: array<string, int>,
     *   alerts: list<array<string, mixed>>,
     *   catalog_count: int,
     *   catalog_groups: list<string>
     * }
     */
    public function scan(?string $startDate = null, ?string $endDate = null, ?string $severity = null, int $limit = 200): array
    {
        $status = $this->connectionStatus();
        $start = $startDate ?: now('Asia/Bangkok')->subDays(30)->toDateString();
        $end = $endDate ?: now('Asia/Bangkok')->toDateString();
        $limit = max(20, min(500, $limit));

        $catalog = EgfrDrugAlertCatalog::byIcode();
        $groups = array_values(array_unique(array_map(
            static fn (array $d) => $d['group'],
            array_values($catalog)
        )));

        $empty = [
            'connected' => (bool) ($status['connected'] ?? false),
            'connection' => $status,
            'filters' => [
                'start_date' => $start,
                'end_date' => $end,
                'severity' => $severity,
                'limit' => $limit,
            ],
            'summary' => [
                'prescriptions' => 0,
                'alerts' => 0,
                'contraindicated' => 0,
                'alert' => 0,
                'dose_exceeded' => 0,
                'missing_egfr' => 0,
                'patients' => 0,
            ],
            'alerts' => [],
            'catalog_count' => count($catalog),
            'catalog_groups' => $groups,
        ];

        if (! ($status['connected'] ?? false)) {
            return $empty;
        }

        try {
            $conn = DB::connection('hosxp');
            $icodes = array_keys($catalog);

            $rows = $conn->table('opitemrece as oi')
                ->join('drugitems as d', 'd.icode', '=', 'oi.icode')
                ->leftJoin('patient as p', 'p.hn', '=', 'oi.hn')
                ->leftJoin('drugusage as u', 'u.drugusage', '=', 'oi.drugusage')
                ->whereIn('oi.icode', $icodes)
                ->whereBetween('oi.vstdate', [$start, $end])
                ->orderByDesc('oi.vstdate')
                ->orderByDesc('oi.vn')
                ->limit(3000)
                ->get([
                    'oi.hn',
                    'oi.vn',
                    'oi.icode',
                    'oi.qty',
                    'oi.vstdate',
                    'oi.drugusage',
                    'd.name as drug_name',
                    'd.strength as drug_strength',
                    'u.code as usage_code',
                    'u.name1 as usage_name1',
                    'u.name2 as usage_name2',
                    'u.name3 as usage_name3',
                    'u.shortlist as usage_shortlist',
                    'u.iperdose as usage_iperdose',
                    'u.iperday as usage_iperday',
                    DB::raw("CONCAT(IFNULL(p.pname,''), IFNULL(p.fname,''), ' ', IFNULL(p.lname,'')) as patient_name"),
                ]);

            $hns = $rows->pluck('hn')->filter()->unique()->values()->all();
            $egfrMap = $this->latestEgfrByHn($conn, $hns);

            $allAlerts = [];
            $summary = $empty['summary'];
            $summary['prescriptions'] = $rows->count();
            $seenPatients = [];

            foreach ($rows as $row) {
                $icode = (string) $row->icode;
                $drug = $catalog[$icode] ?? null;
                if (! $drug) {
                    continue;
                }

                $hn = (string) $row->hn;
                $egfrInfo = $egfrMap[$hn] ?? null;
                $egfr = $egfrInfo['egfr'] ?? null;
                $strengthMg = isset($drug['strength_mg']) && is_numeric($drug['strength_mg'])
                    ? (float) $drug['strength_mg']
                    : $this->parseStrengthMg((string) ($row->drug_strength ?? ''));

                // ขนาดที่สั่ง/วัน = ความแรง(mg) × จำนวนเม็ดต่อครั้ง × จำนวนครั้งต่อวัน
                $usage = DrugUsageDoseParser::parse(
                    $row->usage_name1 ?? null,
                    $row->usage_name2 ?? null,
                    $row->usage_name3 ?? null,
                    $row->usage_code ?? null,
                    $row->usage_shortlist ?? null,
                    $row->usage_iperdose ?? null,
                    $row->usage_iperday ?? null,
                    $strengthMg
                );

                $dailyMg = $usage['daily_mg'];
                $maxDose = null;
                $bandNote = '';
                $bandSeverity = 'ok';
                $severityHit = null;
                $doseExceeded = false;

                if ($egfr === null) {
                    $severityHit = 'missing_egfr';
                    $bandNote = 'ไม่พบค่า eGFR ล่าสุดใน ovst_gfr — ควรตรวจก่อนจ่ายยา';
                } else {
                    $eval = EgfrDrugAlertCatalog::evaluate($drug, (float) $egfr) ?? [
                        'severity' => 'ok',
                        'note' => '',
                        'max_dose_mg' => null,
                    ];
                    $bandSeverity = (string) ($eval['severity'] ?? 'ok');
                    $bandNote = (string) ($eval['note'] ?? '');
                    $maxDose = isset($eval['max_dose_mg']) ? (float) $eval['max_dose_mg'] : null;
                    $doseExceeded = $maxDose !== null && $dailyMg !== null && $dailyMg > ($maxDose + 0.01);

                    if ($bandSeverity === 'contraindicated') {
                        $severityHit = 'contraindicated';
                    } elseif ($doseExceeded) {
                        // เกิน Max ตามช่วง eGFR — ถ้าช่วงนั้นเป็น ALERT ในไฟล์ ให้แสดง ALERT
                        $severityHit = $bandSeverity === 'alert' ? 'alert' : 'dose_exceeded';
                        $bandNote = sprintf(
                            'ALERT · eGFR %.1f อยู่ในช่วงที่ต้องปรับขนาด (Max %.0f mg/วัน) แต่สั่ง %.0f mg/วัน — เกินเพดาน',
                            (float) $egfr,
                            $maxDose,
                            $dailyMg
                        );
                    } else {
                        // ไม่เกิน Max → ไม่แจ้ง
                        continue;
                    }
                }

                $calcParts = [];
                if ($strengthMg !== null) {
                    $calcParts[] = $strengthMg.' mg';
                }
                if ($usage['tablets_per_dose'] !== null) {
                    $calcParts[] = $usage['tablets_per_dose'].' เม็ด/ครั้ง';
                }
                if ($usage['times_per_day'] !== null) {
                    $calcParts[] = $usage['times_per_day'].' ครั้ง/วัน';
                }

                $allAlerts[] = [
                    'hn' => $hn,
                    'vn' => (string) $row->vn,
                    'patient_name' => trim((string) $row->patient_name) ?: '—',
                    'vstdate' => (string) $row->vstdate,
                    'icode' => $icode,
                    'drug_name' => (string) ($row->drug_name ?: $drug['name']),
                    'drug_group' => $drug['group'],
                    'strength' => trim((string) ($row->drug_strength ?? '')) ?: ($strengthMg ? $strengthMg.' mg' : null),
                    'strength_mg' => $strengthMg,
                    'qty' => is_numeric($row->qty) ? (float) $row->qty : null,
                    'usage_text' => $usage['usage_text'],
                    'usage_code' => $usage['usage_code'],
                    'tablets_per_dose' => $usage['tablets_per_dose'],
                    'times_per_day' => $usage['times_per_day'],
                    'daily_tablets' => $usage['daily_tablets'],
                    'daily_mg' => $dailyMg,
                    'dose_calc' => $calcParts !== [] ? implode(' × ', $calcParts) : null,
                    'dose_exceeded' => $doseExceeded,
                    'egfr' => $egfr !== null ? round((float) $egfr, 1) : null,
                    'egfr_date' => $egfrInfo['vstdate'] ?? null,
                    'severity' => $severityHit,
                    'severity_label' => $this->severityLabel((string) $severityHit),
                    'note' => $bandNote,
                    'max_dose_mg' => $maxDose,
                    'egfr_band' => $bandSeverity,
                ];
            }

            // นับสรุปแบบไม่ซ้ำตามระดับหลัก (ผลรวมชิป = ทั้งหมด)
            foreach ($allAlerts as $item) {
                $sev = (string) $item['severity'];
                $summary[$sev] = ($summary[$sev] ?? 0) + 1;
                $summary['alerts']++;
                $seenPatients[(string) $item['hn']] = true;
            }
            $summary['patients'] = count($seenPatients);

            // กรองรายการตามชิปที่เลือก หลังนับสรุปครบแล้ว
            $alerts = $allAlerts;
            if ($severity) {
                $alerts = array_values(array_filter(
                    $allAlerts,
                    static fn (array $item) => ($item['severity'] ?? '') === $severity
                ));
            }

            usort($alerts, static function (array $a, array $b) {
                $rank = [
                    'contraindicated' => 0,
                    'alert' => 1,
                    'dose_exceeded' => 2,
                    'missing_egfr' => 3,
                ];
                $ra = $rank[$a['severity']] ?? 9;
                $rb = $rank[$b['severity']] ?? 9;
                if ($ra !== $rb) {
                    return $ra <=> $rb;
                }

                return strcmp($b['vstdate'], $a['vstdate']);
            });

            $empty['summary'] = $summary;
            $empty['alerts'] = array_slice($alerts, 0, $limit);

            return $empty;
        } catch (Throwable $e) {
            Log::warning('EgfrDrugAlert scan failed: '.$e->getMessage());
            $empty['connection']['message'] = 'ดึงข้อมูลไม่สำเร็จ: '.$e->getMessage();
            $empty['connected'] = false;

            return $empty;
        }
    }

    /**
     * @param  \Illuminate\Database\Connection  $conn
     * @param  list<string>  $hns
     * @return array<string, array{egfr: float, vstdate: string}>
     */
    private function latestEgfrByHn($conn, array $hns): array
    {
        if ($hns === []) {
            return [];
        }

        $map = [];
        foreach (array_chunk($hns, 80) as $chunk) {
            $placeholders = implode(',', array_fill(0, count($chunk), '?'));
            $sql = "SELECT x.hn, x.egfr, x.vstdate
                FROM (
                    SELECT v.hn, g.egfr, v.vstdate,
                           ROW_NUMBER() OVER (PARTITION BY v.hn ORDER BY v.vstdate DESC) AS rn
                    FROM vn_stat v
                    INNER JOIN ovst_gfr g ON g.vn = v.vn
                    WHERE v.hn IN ({$placeholders})
                      AND g.egfr IS NOT NULL
                      AND TRIM(CAST(g.egfr AS CHAR)) <> ''
                ) x
                WHERE x.rn = 1";

            try {
                $rows = $conn->select($sql, $chunk);
            } catch (Throwable) {
                $rows = [];
                foreach ($chunk as $hn) {
                    $one = $conn->selectOne(
                        'SELECT v.hn, g.egfr, v.vstdate
                         FROM vn_stat v
                         LEFT JOIN ovst_gfr g ON g.vn = v.vn
                         WHERE v.hn = ?
                           AND g.egfr IS NOT NULL
                         ORDER BY v.vstdate DESC
                         LIMIT 1',
                        [$hn]
                    );
                    if ($one) {
                        $rows[] = $one;
                    }
                }
            }

            foreach ($rows as $row) {
                $hn = (string) $row->hn;
                $egfr = is_numeric($row->egfr) ? (float) $row->egfr : null;
                if ($hn === '' || $egfr === null) {
                    continue;
                }
                $map[$hn] = [
                    'egfr' => $egfr,
                    'vstdate' => (string) $row->vstdate,
                ];
            }
        }

        return $map;
    }

    private function parseStrengthMg(string $strength): ?float
    {
        if (preg_match('/([\d]+(?:\.\d+)?)\s*mg/i', $strength, $m)) {
            return (float) $m[1];
        }

        return null;
    }

    public function severityLabel(string $severity): string
    {
        return match ($severity) {
            'contraindicated' => 'ห้ามใช้',
            'alert' => 'ALERT',
            'dose_exceeded' => 'ขนาดเกิน Max',
            'missing_egfr' => 'ไม่มีค่า eGFR',
            default => $severity,
        };
    }

    /** @return list<array<string, mixed>> */
    public function catalogForUi(): array
    {
        return array_values(EgfrDrugAlertCatalog::drugs());
    }
}
