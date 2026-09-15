<?php

namespace App\Services;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * บริการรายงาน HOSxP — ตรวจ schema อัตโนมัติ, query ตามมาตรฐานตาราง HOSxP
 */
class HosxpReportService
{
    /** @var array<string, bool> */
    private array $tables = [];

    /** @var array<string, array<string, bool>> */
    private array $columns = [];

    public function connectionStatus(): array
    {
        try {
            if (! config('database.connections.hosxp')) {
                return [
                    'connected' => false,
                    'database' => null,
                    'message' => 'ยังไม่ได้ตั้งค่าการเชื่อมต่อ HOSxP',
                ];
            }

            $conn = DB::connection('hosxp');
            $conn->getPdo();
            $this->warmSchemaCache($conn);

            return [
                'connected' => true,
                'database' => $conn->getDatabaseName(),
                'message' => 'เชื่อมต่อฐานข้อมูล HOSxP สำเร็จ',
            ];
        } catch (\Throwable $e) {
            Log::warning('HOSxP report connection failed: '.$e->getMessage());

            return [
                'connected' => false,
                'database' => null,
                'message' => 'ไม่สามารถเชื่อมต่อ HOSxP: '.$e->getMessage(),
            ];
        }
    }

    /** @return array<int, array<string, mixed>> */
    public function reportCatalog(): array
    {
        $status = $this->connectionStatus();
        $connected = $status['connected'];

        $reports = [
            $this->meta('visit_statistics', 'สรุปสถิติการรับบริการ', 'Visit Statistics Summary', 'summary', 'จำนวน OPD/IPD/ER และค่ารักษารวมในช่วงวันที่', true, []),
            $this->meta('opd_summary', 'สรุปผู้ป่วยนอกตามแผนก', 'OPD Summary by Department', 'opd', 'จำนวน visit และค่ารักษาแยกตามแผนก', true, []),
            $this->meta('opd_visit', 'รายละเอียดผู้ป่วยนอก (OPD)', 'OPD Visit Details', 'opd', 'Visit, แผนก, สิทธิ, อาการ, ความดัน, วินิจฉัยหลัก', true, ['has_lab', 'has_drug', 'pttype', 'department']),
            $this->meta('er_visits', 'ผู้ป่วยฉุกเฉิน (ER)', 'Emergency Visits', 'opd', 'รายการ visit ผู้ป่วยฉุกเฉินจาก er_regist', true, ['pttype']),
            $this->meta('diagnosis', 'การวินิจฉัยโรค (ICD-10)', 'Diagnosis Details', 'clinical', 'รายการวินิจฉัย OPD พร้อมชื่อโรค', true, ['icd10', 'diagtype']),
            $this->meta('diagnosis_summary', 'สรุปโรคตาม ICD-10', 'Diagnosis Summary', 'clinical', 'จำนวนผู้ป่วยและ visit แยกตามรหัสโรค', true, ['icd10_prefix']),
            $this->meta('lab_report', 'รายงานผลแล็บ', 'Laboratory Results', 'lab', 'รายการสั่งและผลตรวจห้องปฏิบัติการ', true, ['lab_item_name', 'lab_result_max', 'lab_result_min']),
            $this->meta('drug_report', 'รายงานการสั่งยา', 'Drug Prescriptions', 'pharmacy', 'รายการสั่งยาจาก opitemrece + drugitems', true, ['drug_name', 'visit_type']),
            $this->meta('service_charge', 'สรุปค่ารักษาตามกลุ่มรายได้', 'Charges by Income Group', 'finance', 'สรุปยอดจาก opitemrece แยกกลุ่ม income', true, ['visit_type']),
            $this->meta('xray_report', 'รายงานรังสีวิทยา', 'Radiology Report', 'lab', 'รายการส่งตรวจและผล X-ray', true, []),
            $this->meta('ipd_admission', 'ผู้ป่วยใน (IPD)', 'IPD Admissions', 'ipd', 'การ admit, หอผู้ป่วย, สิทธิ, วินิจฉัยหลัก, LOS', true, ['ward', 'admit_status']),
            $this->meta('ipd_census', 'ผู้ป่วยในอยู่ใน รพ. (Census)', 'Current IPD Census', 'ipd', 'ผู้ป่วยที่ยังไม่ discharge', false, ['ward']),
            $this->meta('appointment', 'นัดหมายผู้ป่วย', 'Appointments', 'opd', 'รายการนัดจากตาราง oapp — ชื่อ, วันที่มา, วันที่นัด, เบอร์โทร, การปฏิบัติตน', true, []),
            $this->meta('patient_list', 'ทะเบียนผู้ป่วย', 'Patient Registry', 'patient', 'ข้อมูลผู้ป่วยพร้อมที่อยู่ — กรองตามช่วง visit ได้', false, ['hn', 'cid', 'name', 'active_in_range']),
            $this->meta('disease_506', 'รายงานโรค รง.506', 'Disease Report 506', 'epidemiology', 'รายงานโรคระบาดตามรหัส 506 จากการวินิจฉัย', true, ['icd10_prefix']),
            $this->meta('disease_506_summary', 'สรุปโรค รง.506', 'Disease 506 Summary', 'epidemiology', 'สรุปจำนวนผู้ป่วยแยกตามรหัส 506', true, []),
            $this->meta('surgery_report', 'รายงานหัตถการ', 'Surgery / OR Report', 'surgery', 'รายการผ่าตัดจาก operation_list', true, []),
            $this->meta('medical_supply', 'รายงานเวชภัณฑ์มิใช่ยา', 'Medical Supplies Usage', 'pharmacy', 'การใช้เวชภัณฑ์จาก nondrugitems', true, ['visit_type']),
        ];

        if ($connected) {
            $conn = DB::connection('hosxp');
            foreach ($reports as &$report) {
                $report['available'] = $this->isReportAvailable($conn, $report['id']);
                if (! $report['available']) {
                    $report['unavailable_reason'] = $this->unavailableReason($report['id']);
                }
            }
            unset($report);
        } else {
            foreach ($reports as &$report) {
                $report['available'] = false;
                $report['unavailable_reason'] = $status['message'];
            }
            unset($report);
        }

        return $reports;
    }

    /** @return array{headers: string[], rows: array<int, array<string, mixed>>, total: int, truncated: bool, meta: array<string, mixed>} */
    public function preview(string $reportId, array $params): array
    {
        $conn = $this->requireConnection();
        [$startDate, $endDate] = $this->parseDateRange($params);
        $previewLimit = 50;

        if ($reportId === 'visit_statistics') {
            $rows = $this->buildVisitStatisticsRows($conn, $startDate, $endDate);
            $definition = $this->headerDefinition($reportId);

            return [
                'headers' => array_column($definition, 'label'),
                'rows' => $rows,
                'total' => count($rows),
                'truncated' => false,
                'meta' => array_merge($this->previewMeta($reportId, $startDate, $endDate), $this->previewExtras($reportId, $startDate, $endDate)),
            ];
        }

        $built = $this->buildFromQuery($conn, $reportId, $params, $startDate, $endDate, $previewLimit);
        $total = $this->countReport($conn, $reportId, $params, $startDate, $endDate);

        return [
            'headers' => $built['headers'],
            'rows' => $built['rows'],
            'total' => $total,
            'truncated' => $total > count($built['rows']),
            'meta' => array_merge($this->previewMeta($reportId, $startDate, $endDate), $this->previewExtras($reportId, $startDate, $endDate)),
        ];
    }

    /** @return array{headers: string[], rows: array<int, array<string, mixed>>, total: int, truncated: bool} */
    public function exportPayload(string $reportId, array $params, int $maxRows = 500): array
    {
        $preview = $this->preview($reportId, array_merge($params, ['limit' => $maxRows]));
        $keys = array_column($this->headerDefinition($reportId), 'key');
        $rows = [];
        foreach ($preview['rows'] as $row) {
            if (array_is_list($row)) {
                $assoc = [];
                foreach ($keys as $i => $key) {
                    $assoc[$key] = $row[$i] ?? '';
                }
                $rows[] = $assoc;
            } else {
                $rows[] = $row;
            }
        }

        return [
            'headers' => $preview['headers'],
            'rows' => $rows,
            'total' => $preview['total'],
            'truncated' => $preview['truncated'],
        ];
    }

    /** @return \Generator<int, array<int, string|int|float|null>> */
    public function exportRows(string $reportId, array $params): \Generator
    {
        $conn = $this->requireConnection();
        [$startDate, $endDate] = $this->parseDateRange($params);
        $limit = min(max((int) ($params['limit'] ?? 5000), 1), 50000);
        $definition = $this->headerDefinition($reportId);
        $headers = array_column($definition, 'label');
        $keys = array_column($definition, 'key');

        yield $headers;

        if ($reportId === 'visit_statistics') {
            foreach ($this->buildVisitStatisticsRows($conn, $startDate, $endDate) as $row) {
                yield array_map(fn ($k) => $row[$k] ?? '', $keys);
            }

            return;
        }

        $query = $this->makeQuery($conn, $reportId, $params, $startDate, $endDate);
        foreach ($query->limit($limit)->cursor() as $row) {
            yield $this->rowToArray($row, $keys);
        }
    }

    public function reportTitle(string $reportId): string
    {
        foreach ($this->baseReportMeta() as $report) {
            if ($report['id'] === $reportId) {
                return $report['name'];
            }
        }

        return $reportId;
    }

    /** @return array<int, array<string, mixed>> */
    private function baseReportMeta(): array
    {
        return [
            $this->meta('visit_statistics', 'สรุปสถิติการรับบริการ', 'Visit Statistics Summary', 'summary', '', true, []),
            $this->meta('opd_summary', 'สรุปผู้ป่วยนอกตามแผนก', 'OPD Summary by Department', 'opd', '', true, []),
            $this->meta('opd_visit', 'รายละเอียดผู้ป่วยนอก (OPD)', 'OPD Visit Details', 'opd', '', true, []),
            $this->meta('er_visits', 'ผู้ป่วยฉุกเฉิน (ER)', 'Emergency Visits', 'opd', '', true, []),
            $this->meta('diagnosis', 'การวินิจฉัยโรค (ICD-10)', 'Diagnosis Details', 'clinical', '', true, []),
            $this->meta('diagnosis_summary', 'สรุปโรคตาม ICD-10', 'Diagnosis Summary', 'clinical', '', true, []),
            $this->meta('lab_report', 'รายงานผลแล็บ', 'Laboratory Results', 'lab', '', true, []),
            $this->meta('drug_report', 'รายงานการสั่งยา', 'Drug Prescriptions', 'pharmacy', '', true, []),
            $this->meta('service_charge', 'สรุปค่ารักษาตามกลุ่มรายได้', 'Charges by Income Group', 'finance', '', true, []),
            $this->meta('xray_report', 'รายงานรังสีวิทยา', 'Radiology Report', 'lab', '', true, []),
            $this->meta('ipd_admission', 'ผู้ป่วยใน (IPD)', 'IPD Admissions', 'ipd', '', true, []),
            $this->meta('ipd_census', 'ผู้ป่วยในอยู่ใน รพ. (Census)', 'Current IPD Census', 'ipd', '', false, []),
            $this->meta('appointment', 'นัดหมายผู้ป่วย', 'Appointments', 'opd', '', true, []),
            $this->meta('patient_list', 'ทะเบียนผู้ป่วย', 'Patient Registry', 'patient', '', false, []),
            $this->meta('disease_506', 'รายงานโรค รง.506', 'Disease Report 506', 'epidemiology', '', true, []),
            $this->meta('disease_506_summary', 'สรุปโรค รง.506', 'Disease 506 Summary', 'epidemiology', '', true, []),
            $this->meta('surgery_report', 'รายงานหัตถการ', 'Surgery / OR Report', 'surgery', '', true, []),
            $this->meta('medical_supply', 'รายงานเวชภัณฑ์มิใช่ยา', 'Medical Supplies Usage', 'pharmacy', '', true, []),
        ];
    }

    private function meta(
        string $id,
        string $name,
        string $nameEn,
        string $category,
        string $description,
        bool $requiresDate,
        array $filters
    ): array {
        return [
            'id' => $id,
            'name' => $name,
            'name_en' => $nameEn,
            'category' => $category,
            'category_label' => $this->categoryLabel($category),
            'description' => $description,
            'requires_date' => $requiresDate,
            'filters' => $filters,
            'available' => true,
        ];
    }

    private function categoryLabel(string $category): string
    {
        return match ($category) {
            'summary' => 'สรุปภาพรวม',
            'patient' => 'ผู้ป่วย',
            'opd' => 'ผู้ป่วยนอก / ER',
            'ipd' => 'ผู้ป่วยใน',
            'clinical' => 'การวินิจฉัย',
            'lab' => 'Lab / รังสี',
            'pharmacy' => 'เภสัช',
            'finance' => 'ค่ารักษา',
            'epidemiology' => 'ระบาดวิทยา (506)',
            'surgery' => 'หัตถการ',
            default => 'อื่นๆ',
        };
    }

    /** @return array<string, mixed> */
    private function previewExtras(string $reportId, string $startDate, string $endDate): array
    {
        $extras = [];
        if (in_array($reportId, ['visit_statistics', 'service_charge', 'opd_summary'], true)) {
            $extras['finance_revenue_url'] = route('finance.revenue', [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ]);
        }

        return $extras;
    }

    private function previewMeta(string $reportId, string $startDate, string $endDate): array
    {
        return [
            'report_id' => $reportId,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'generated_at' => now()->toDateTimeString(),
        ];
    }

    private function requireConnection()
    {
        $status = $this->connectionStatus();
        if (! $status['connected']) {
            throw new \RuntimeException($status['message']);
        }

        return DB::connection('hosxp');
    }

    /** @return array{0: string, 1: string} */
    private function parseDateRange(array $params): array
    {
        $start = $params['start_date'] ?? null;
        $end = $params['end_date'] ?? null;

        if (! $start || ! $end) {
            $endDate = date('Y-m-d');
            $startDate = date('Y-m-d', strtotime('-1 month', strtotime($endDate)));

            return [$startDate, $endDate];
        }

        if (strtotime($start) > strtotime($end)) {
            [$start, $end] = [$end, $start];
        }

        return [$start, $end];
    }

    private function warmSchemaCache($conn): void
    {
        if ($this->tables !== []) {
            return;
        }

        $dbName = $conn->getDatabaseName();
        $tables = $conn->table('information_schema.tables')
            ->where('table_schema', $dbName)
            ->pluck('table_name');

        foreach ($tables as $table) {
            $this->tables[strtolower($table)] = true;
        }
    }

    private function tableExists($conn, string $table): bool
    {
        $this->warmSchemaCache($conn);

        return isset($this->tables[strtolower($table)]);
    }

    private function columnExists($conn, string $table, string $column): bool
    {
        $key = strtolower($table);
        if (! isset($this->columns[$key])) {
            try {
                $cols = $conn->getSchemaBuilder()->getColumnListing($table);
                $this->columns[$key] = array_fill_keys(array_map('strtolower', $cols), true);
            } catch (\Throwable) {
                $this->columns[$key] = [];
            }
        }

        return isset($this->columns[$key][strtolower($column)]);
    }

    private function opitemreceHasAn($conn): bool
    {
        return $this->columnExists($conn, 'opitemrece', 'an');
    }

    private function ipdConditionSql($conn): string
    {
        $parts = [];
        if ($this->opitemreceHasAn($conn)) {
            $parts[] = "(oi.an IS NOT NULL AND TRIM(oi.an) <> '')";
        }
        $parts[] = "(o.an IS NOT NULL AND TRIM(o.an) <> '')";

        return '('.implode(' OR ', $parts).')';
    }

    private function isReportAvailable($conn, string $reportId): bool
    {
        return match ($reportId) {
            'visit_statistics', 'opd_summary', 'opd_visit', 'diagnosis', 'diagnosis_summary', 'drug_report', 'service_charge', 'patient_list'
                => $this->tableExists($conn, 'ovst'),
            'er_visits' => $this->tableExists($conn, 'er_regist'),
            'lab_report' => $this->tableExists($conn, 'lab_head') && $this->tableExists($conn, 'lab_order'),
            'xray_report' => $this->tableExists($conn, 'xray_report') || $this->tableExists($conn, 'xray_head'),
            'ipd_admission', 'ipd_census' => $this->tableExists($conn, 'ipt'),
            'appointment' => $this->appointmentTable($conn) !== null,
            'disease_506', 'disease_506_summary' => $this->tableExists($conn, 'ovstdiag') && $this->has506Tables($conn),
            'surgery_report' => $this->tableExists($conn, 'operation_list'),
            'medical_supply' => $this->tableExists($conn, 'opitemrece') && $this->tableExists($conn, 'nondrugitems'),
            default => false,
        };
    }

    private function unavailableReason(string $reportId): string
    {
        return match ($reportId) {
            'er_visits' => 'ไม่พบตาราง er_regist ในฐานข้อมูล HOSxP',
            'lab_report' => 'ไม่พบตาราง lab_head หรือ lab_order',
            'xray_report' => 'ไม่พบตาราง xray_report/xray_head',
            'ipd_admission', 'ipd_census' => 'ไม่พบตาราง ipt',
            'appointment' => 'ไม่พบตาราง oapp หรือ appoint',
            'disease_506', 'disease_506_summary' => 'ไม่พบตาราง code506/provis_code506 สำหรับรายงาน 506',
            'surgery_report' => 'ไม่พบตาราง operation_list',
            'medical_supply' => 'ไม่พบตาราง nondrugitems',
            default => 'ตารางหลักของรายงานนี้ไม่พร้อมใช้งาน',
        };
    }

    /** @return array<int, array<string, mixed>> */
    private function buildVisitStatisticsRows($conn, string $startDate, string $endDate): array
    {
        return Cache::remember("hosxp.visit_stats.{$startDate}.{$endDate}", 900, function () use ($conn, $startDate, $endDate) {
            $opd = (int) $conn->table('ovst')->whereBetween('vstdate', [$startDate, $endDate])->count();
            $ipd = (int) $conn->table('ipt')->whereBetween('regdate', [$startDate, $endDate])->count();
            $er = 0;
            if ($this->tableExists($conn, 'er_regist')) {
                $er = (int) $conn->table('er_regist as er')
                    ->join('ovst as o', 'o.vn', '=', 'er.vn')
                    ->whereBetween('o.vstdate', [$startDate, $endDate])
                    ->count();
            }
            $charge = (float) $conn->table('opitemrece')->whereBetween('vstdate', [$startDate, $endDate])->sum('sum_price');
            $patients = (int) $conn->table('ovst')->whereBetween('vstdate', [$startDate, $endDate])->distinct()->count('hn');

            return [
                ['metric' => 'ช่วงวันที่', 'value' => $startDate.' ถึง '.$endDate],
                ['metric' => 'ผู้ป่วยนอก (OPD visits)', 'value' => $opd],
                ['metric' => 'ผู้ป่วยใน Admit (IPD)', 'value' => $ipd],
                ['metric' => 'ผู้ป่วยฉุกเฉิน (ER)', 'value' => $er],
                ['metric' => 'ผู้ป่วยไม่ซ้ำ (OPD)', 'value' => $patients],
                ['metric' => 'ค่ารักษารวม (บาท)', 'value' => number_format($charge, 2, '.', '')],
            ];
        });
    }

    /** @return array{headers: string[], rows: array<int, array<string, mixed>>} */
    private function buildFromQuery($conn, string $reportId, array $params, string $startDate, string $endDate, int $limit): array
    {
        $definition = $this->headerDefinition($reportId);
        $headers = array_column($definition, 'label');
        $keys = array_column($definition, 'key');
        $query = $this->makeQuery($conn, $reportId, $params, $startDate, $endDate);

        $rows = [];
        foreach ($query->limit($limit)->get() as $row) {
            $rows[] = $this->rowToAssoc($row, $keys);
        }

        return ['headers' => $headers, 'rows' => $rows];
    }

    private function countReport($conn, string $reportId, array $params, string $startDate, string $endDate): int
    {
        if ($reportId === 'visit_statistics') {
            return count($this->buildVisitStatisticsRows($conn, $startDate, $endDate));
        }

        $query = $this->makeQuery($conn, $reportId, $params, $startDate, $endDate);

        return (int) $conn->query()->fromSub($query, 'report_count')->count();
    }

    private function makeQuery($conn, string $reportId, array $params, string $startDate, string $endDate): Builder
    {
        return match ($reportId) {
            'opd_summary' => $this->queryOpdSummary($conn, $startDate, $endDate),
            'opd_visit' => $this->queryOpdVisits($conn, $startDate, $endDate, $params),
            'er_visits' => $this->queryErVisits($conn, $startDate, $endDate, $params),
            'diagnosis' => $this->queryDiagnosis($conn, $startDate, $endDate, $params),
            'diagnosis_summary' => $this->queryDiagnosisSummary($conn, $startDate, $endDate, $params),
            'lab_report' => $this->queryLabReport($conn, $startDate, $endDate, $params),
            'drug_report' => $this->queryDrugReport($conn, $startDate, $endDate, $params),
            'service_charge' => $this->queryServiceCharge($conn, $startDate, $endDate, $params),
            'xray_report' => $this->queryXrayReport($conn, $startDate, $endDate),
            'ipd_admission' => $this->queryIpdAdmission($conn, $startDate, $endDate, $params),
            'ipd_census' => $this->queryIpdCensus($conn, $params),
            'appointment' => $this->queryAppointment($conn, $startDate, $endDate),
            'patient_list' => $this->queryPatientList($conn, $startDate, $endDate, $params),
            'disease_506' => $this->queryDisease506($conn, $startDate, $endDate, $params),
            'disease_506_summary' => $this->queryDisease506Summary($conn, $startDate, $endDate),
            'surgery_report' => $this->querySurgeryReport($conn, $startDate, $endDate),
            'medical_supply' => $this->queryMedicalSupply($conn, $startDate, $endDate, $params),
            default => throw new \InvalidArgumentException('รายงานไม่รู้จัก: '.$reportId),
        };
    }

    /** @return array<int, array{key: string, label: string}> */
    private function headerDefinition(string $reportId): array
    {
        return match ($reportId) {
            'visit_statistics' => [
                ['key' => 'metric', 'label' => 'รายการ'],
                ['key' => 'value', 'label' => 'ค่า'],
            ],
            'opd_summary' => [
                ['key' => 'department_code', 'label' => 'รหัสแผนก'],
                ['key' => 'department_name', 'label' => 'แผนก'],
                ['key' => 'visit_count', 'label' => 'จำนวน Visit'],
                ['key' => 'patient_count', 'label' => 'จำนวนผู้ป่วย'],
                ['key' => 'total_charge', 'label' => 'ค่ารักษารวม (บาท)'],
            ],
            'opd_visit' => [
                ['key' => 'vn', 'label' => 'VN'],
                ['key' => 'hn', 'label' => 'HN'],
                ['key' => 'visit_date', 'label' => 'วันที่'],
                ['key' => 'department_name', 'label' => 'แผนก'],
                ['key' => 'pttype_name', 'label' => 'สิทธิ'],
                ['key' => 'symptom', 'label' => 'อาการสำคัญ'],
                ['key' => 'bpsys', 'label' => 'BP บน'],
                ['key' => 'bpdia', 'label' => 'BP ล่าง'],
                ['key' => 'principal_icd10', 'label' => 'ICD-10 หลัก'],
                ['key' => 'principal_dx', 'label' => 'ชื่อโรคหลัก'],
            ],
            'er_visits' => [
                ['key' => 'vn', 'label' => 'VN'],
                ['key' => 'hn', 'label' => 'HN'],
                ['key' => 'visit_date', 'label' => 'วันที่'],
                ['key' => 'pttype_name', 'label' => 'สิทธิ'],
                ['key' => 'er_type', 'label' => 'ประเภท ER'],
                ['key' => 'symptom', 'label' => 'อาการ'],
            ],
            'diagnosis' => [
                ['key' => 'vn', 'label' => 'VN'],
                ['key' => 'hn', 'label' => 'HN'],
                ['key' => 'visit_date', 'label' => 'วันที่'],
                ['key' => 'icd10', 'label' => 'ICD-10'],
                ['key' => 'disease_name', 'label' => 'ชื่อโรค'],
                ['key' => 'diagtype', 'label' => 'ประเภทวินิจฉัย'],
            ],
            'diagnosis_summary' => [
                ['key' => 'icd10', 'label' => 'ICD-10'],
                ['key' => 'disease_name', 'label' => 'ชื่อโรค'],
                ['key' => 'visit_count', 'label' => 'จำนวน Visit'],
                ['key' => 'patient_count', 'label' => 'จำนวนผู้ป่วย'],
            ],
            'lab_report' => [
                ['key' => 'vn', 'label' => 'VN'],
                ['key' => 'hn', 'label' => 'HN'],
                ['key' => 'order_date', 'label' => 'วันที่สั่ง'],
                ['key' => 'lab_code', 'label' => 'รหัส Lab'],
                ['key' => 'lab_name', 'label' => 'รายการ Lab'],
                ['key' => 'result', 'label' => 'ผลตรวจ'],
                ['key' => 'normal_value', 'label' => 'ค่าปกติ'],
                ['key' => 'unit', 'label' => 'หน่วย'],
            ],
            'drug_report' => [
                ['key' => 'vn', 'label' => 'VN'],
                ['key' => 'an', 'label' => 'AN'],
                ['key' => 'hn', 'label' => 'HN'],
                ['key' => 'service_date', 'label' => 'วันที่'],
                ['key' => 'visit_type', 'label' => 'OPD/IPD'],
                ['key' => 'drug_code', 'label' => 'รหัสยา'],
                ['key' => 'drug_name', 'label' => 'ชื่อยา'],
                ['key' => 'qty', 'label' => 'จำนวน'],
                ['key' => 'amount', 'label' => 'ราคา (บาท)'],
            ],
            'service_charge' => [
                ['key' => 'income_group', 'label' => 'กลุ่มรายได้'],
                ['key' => 'visit_type', 'label' => 'OPD/IPD'],
                ['key' => 'item_count', 'label' => 'จำนวนรายการ'],
                ['key' => 'total_qty', 'label' => 'จำนวนรวม'],
                ['key' => 'total_amount', 'label' => 'ยอดรวม (บาท)'],
            ],
            'xray_report' => [
                ['key' => 'vn', 'label' => 'VN'],
                ['key' => 'hn', 'label' => 'HN'],
                ['key' => 'report_date', 'label' => 'วันที่รายงาน'],
                ['key' => 'xray_item', 'label' => 'รายการ'],
                ['key' => 'report_text', 'label' => 'ผล/ข้อความ'],
            ],
            'ipd_admission' => [
                ['key' => 'an', 'label' => 'AN'],
                ['key' => 'hn', 'label' => 'HN'],
                ['key' => 'admit_date', 'label' => 'วันที่ Admit'],
                ['key' => 'discharge_date', 'label' => 'วันที่ Discharge'],
                ['key' => 'los_days', 'label' => 'LOS (วัน)'],
                ['key' => 'ward_name', 'label' => 'หอผู้ป่วย'],
                ['key' => 'pttype_name', 'label' => 'สิทธิ'],
                ['key' => 'principal_icd10', 'label' => 'ICD-10 หลัก'],
                ['key' => 'principal_dx', 'label' => 'ชื่อโรคหลัก'],
            ],
            'ipd_census' => [
                ['key' => 'an', 'label' => 'AN'],
                ['key' => 'hn', 'label' => 'HN'],
                ['key' => 'admit_date', 'label' => 'วันที่ Admit'],
                ['key' => 'ward_name', 'label' => 'หอผู้ป่วย'],
                ['key' => 'pttype_name', 'label' => 'สิทธิ'],
                ['key' => 'principal_icd10', 'label' => 'ICD-10 หลัก'],
            ],
            'appointment' => [
                ['key' => 'hn', 'label' => 'HN'],
                ['key' => 'full_name', 'label' => 'ชื่อ-สกุล'],
                ['key' => 'visit_date', 'label' => 'วันที่มา'],
                ['key' => 'app_date', 'label' => 'วันที่นัด'],
                ['key' => 'app_time', 'label' => 'เวลานัด'],
                ['key' => 'patient_phone', 'label' => 'เบอร์โทรผู้ป่วย'],
                ['key' => 'relative_phone', 'label' => 'เบอร์โทรญาติ'],
                ['key' => 'conduct_note', 'label' => 'การปฏิบัติตน'],
            ],
            'patient_list' => [
                ['key' => 'hn', 'label' => 'HN'],
                ['key' => 'cid', 'label' => 'CID'],
                ['key' => 'full_name', 'label' => 'ชื่อ-สกุล'],
                ['key' => 'sex', 'label' => 'เพศ'],
                ['key' => 'birthdate', 'label' => 'วันเกิด'],
                ['key' => 'age_years', 'label' => 'อายุ (ปี)'],
                ['key' => 'province', 'label' => 'จังหวัด'],
                ['key' => 'district', 'label' => 'อำเภอ'],
                ['key' => 'subdistrict', 'label' => 'ตำบล'],
            ],
            'disease_506' => [
                ['key' => 'vn', 'label' => 'VN'],
                ['key' => 'hn', 'label' => 'HN'],
                ['key' => 'visit_date', 'label' => 'วันที่'],
                ['key' => 'icd10', 'label' => 'ICD-10'],
                ['key' => 'code506', 'label' => 'รหัส 506'],
                ['key' => 'disease_506_name', 'label' => 'ชื่อโรค 506'],
            ],
            'disease_506_summary' => [
                ['key' => 'code506', 'label' => 'รหัส 506'],
                ['key' => 'disease_506_name', 'label' => 'ชื่อโรค'],
                ['key' => 'visit_count', 'label' => 'จำนวน Visit'],
                ['key' => 'patient_count', 'label' => 'จำนวนผู้ป่วย'],
            ],
            'surgery_report' => [
                ['key' => 'hn', 'label' => 'HN'],
                ['key' => 'an', 'label' => 'AN'],
                ['key' => 'operation_date', 'label' => 'วันที่ผ่าตัด'],
                ['key' => 'operation_code', 'label' => 'รหัสหัตถการ'],
                ['key' => 'operation_name', 'label' => 'ชื่อหัตถการ'],
                ['key' => 'surgeon', 'label' => 'ศัลยแพทย์'],
            ],
            'medical_supply' => [
                ['key' => 'vn', 'label' => 'VN'],
                ['key' => 'an', 'label' => 'AN'],
                ['key' => 'hn', 'label' => 'HN'],
                ['key' => 'service_date', 'label' => 'วันที่'],
                ['key' => 'visit_type', 'label' => 'OPD/IPD'],
                ['key' => 'item_code', 'label' => 'รหัส'],
                ['key' => 'item_name', 'label' => 'ชื่อเวชภัณฑ์'],
                ['key' => 'qty', 'label' => 'จำนวน'],
                ['key' => 'amount', 'label' => 'ราคา (บาท)'],
            ],
            default => [],
        };
    }

    private function queryOpdSummary($conn, string $startDate, string $endDate): Builder
    {
        return $conn->table('ovst as o')
            ->leftJoin('kskdepartment as ksk', 'ksk.depcode', '=', 'o.main_dep')
            ->leftJoin('opitemrece as oi', 'oi.vn', '=', 'o.vn')
            ->whereBetween('o.vstdate', [$startDate, $endDate])
            ->selectRaw("COALESCE(NULLIF(o.main_dep, ''), '-') as department_code")
            ->selectRaw("COALESCE(NULLIF(ksk.department, ''), NULLIF(o.main_dep, ''), 'ไม่ระบุแผนก') as department_name")
            ->selectRaw('COUNT(DISTINCT o.vn) as visit_count')
            ->selectRaw('COUNT(DISTINCT o.hn) as patient_count')
            ->selectRaw('COALESCE(SUM(oi.sum_price), 0) as total_charge')
            ->groupBy('o.main_dep', 'ksk.department')
            ->orderByDesc('visit_count');
    }

    private function queryOpdVisits($conn, string $startDate, string $endDate, array $params): Builder
    {
        $query = $conn->table('ovst as o')
            ->leftJoin('opdscreen as s', 's.vn', '=', 'o.vn')
            ->leftJoin('kskdepartment as ksk', 'ksk.depcode', '=', 'o.main_dep')
            ->leftJoin('pttype as pt', 'pt.pttype', '=', 'o.pttype')
            ->leftJoin('ovstdiag as dx', function ($join) {
                $join->on('dx.vn', '=', 'o.vn')->where('dx.diagtype', '=', '1');
            })
            ->leftJoin('icd101 as icd', 'icd.code', '=', 'dx.icd10')
            ->whereBetween('o.vstdate', [$startDate, $endDate])
            ->select([
                'o.vn',
                'o.hn',
                'o.vstdate as visit_date',
            ])
            ->selectRaw("COALESCE(NULLIF(ksk.department, ''), NULLIF(o.main_dep, ''), 'ไม่ระบุแผนก') as department_name")
            ->selectRaw("COALESCE(pt.name, NULLIF(o.pttype, ''), 'ไม่ระบุสิทธิ') as pttype_name")
            ->selectRaw('s.symptom')
            ->selectRaw('s.bpsys')
            ->selectRaw('s.bpdia')
            ->selectRaw("COALESCE(NULLIF(dx.icd10, ''), '-') as principal_icd10")
            ->selectRaw("COALESCE(NULLIF(icd.tname, ''), icd.name, NULLIF(dx.icd10, ''), '-') as principal_dx")
            ->orderByDesc('o.vstdate');

        if (! empty($params['pttype'])) {
            $query->where('o.pttype', $params['pttype']);
        }
        if (! empty($params['department'])) {
            $query->where('o.main_dep', $params['department']);
        }
        if ($this->truthy($params['has_lab'] ?? false)) {
            $query->whereExists(function ($sub) {
                $sub->select(DB::raw(1))->from('lab_head as lh')->whereColumn('lh.vn', 'o.vn');
            });
        }
        if ($this->truthy($params['has_drug'] ?? false)) {
            $query->whereExists(function ($sub) {
                $sub->select(DB::raw(1))
                    ->from('opitemrece as oi')
                    ->join('drugitems as d', 'd.icode', '=', 'oi.icode')
                    ->whereColumn('oi.vn', 'o.vn');
            });
        }

        return $query;
    }

    private function queryErVisits($conn, string $startDate, string $endDate, array $params): Builder
    {
        $erTypeCol = $this->columnExists($conn, 'er_regist', 'er_pt_type') ? 'er.er_pt_type' : "''";

        $query = $conn->table('er_regist as er')
            ->join('ovst as o', 'o.vn', '=', 'er.vn')
            ->leftJoin('opdscreen as s', 's.vn', '=', 'o.vn')
            ->leftJoin('pttype as pt', 'pt.pttype', '=', 'o.pttype')
            ->whereBetween('o.vstdate', [$startDate, $endDate])
            ->select(['o.vn', 'o.hn', 'o.vstdate as visit_date'])
            ->selectRaw("COALESCE(pt.name, NULLIF(o.pttype, ''), 'ไม่ระบุสิทธิ') as pttype_name")
            ->selectRaw("{$erTypeCol} as er_type")
            ->selectRaw('s.symptom')
            ->orderByDesc('o.vstdate');

        if (! empty($params['pttype'])) {
            $query->where('o.pttype', $params['pttype']);
        }

        return $query;
    }

    private function queryDiagnosis($conn, string $startDate, string $endDate, array $params): Builder
    {
        $query = $conn->table('ovstdiag as d')
            ->join('ovst as o', 'o.vn', '=', 'd.vn')
            ->leftJoin('icd101 as icd', 'icd.code', '=', 'd.icd10')
            ->whereBetween('o.vstdate', [$startDate, $endDate])
            ->select(['d.vn', 'd.hn', 'o.vstdate as visit_date', 'd.icd10', 'd.diagtype'])
            ->selectRaw("COALESCE(NULLIF(icd.tname, ''), icd.name, NULLIF(d.icd10, ''), '-') as disease_name")
            ->orderByDesc('o.vstdate');

        if (! empty($params['icd10'])) {
            $query->where('d.icd10', 'like', $params['icd10'].'%');
        }
        if (! empty($params['diagtype'])) {
            $query->where('d.diagtype', $params['diagtype']);
        }

        return $query;
    }

    private function queryDiagnosisSummary($conn, string $startDate, string $endDate, array $params): Builder
    {
        $query = $conn->table('ovstdiag as d')
            ->join('ovst as o', 'o.vn', '=', 'd.vn')
            ->leftJoin('icd101 as icd', 'icd.code', '=', 'd.icd10')
            ->whereBetween('o.vstdate', [$startDate, $endDate])
            ->where('d.diagtype', '1')
            ->select(['d.icd10'])
            ->selectRaw("COALESCE(NULLIF(icd.tname, ''), icd.name, NULLIF(d.icd10, ''), '-') as disease_name")
            ->selectRaw('COUNT(DISTINCT d.vn) as visit_count')
            ->selectRaw('COUNT(DISTINCT d.hn) as patient_count')
            ->groupBy('d.icd10', 'icd.tname', 'icd.name')
            ->orderByDesc('visit_count');

        if (! empty($params['icd10_prefix'])) {
            $query->where('d.icd10', 'like', $params['icd10_prefix'].'%');
        }

        return $query;
    }

    private function queryLabReport($conn, string $startDate, string $endDate, array $params): Builder
    {
        $hasResultTable = $this->tableExists($conn, 'lab_order_result');
        $resultSql = $hasResultTable
            ? 'COALESCE(lr.lab_order_result, lo.lab_order_result)'
            : 'lo.lab_order_result';

        $normalCol = $this->columnExists($conn, 'lab_items', 'lab_items_normal_value')
            ? 'li.lab_items_normal_value'
            : "''";
        $unitCol = $this->columnExists($conn, 'lab_items', 'lab_items_unit')
            ? 'li.lab_items_unit'
            : "''";

        $query = $conn->table('lab_order as lo')
            ->join('lab_head as lh', 'lh.lab_order_number', '=', 'lo.lab_order_number')
            ->leftJoin('lab_items as li', 'li.lab_items_code', '=', 'lo.lab_items_code');

        if ($hasResultTable) {
            $query->leftJoin('lab_order_result as lr', function ($join) {
                $join->on('lr.lab_order_number', '=', 'lo.lab_order_number')
                    ->on('lr.lab_items_code', '=', 'lo.lab_items_code');
            });
        }

        $query->whereBetween('lh.order_date', [$startDate, $endDate])
            ->select(['lh.vn', 'lh.hn', 'lh.order_date'])
            ->selectRaw('lo.lab_items_code as lab_code')
            ->selectRaw('li.lab_items_name as lab_name')
            ->selectRaw("{$resultSql} as result")
            ->selectRaw("{$normalCol} as normal_value")
            ->selectRaw("{$unitCol} as unit")
            ->orderByDesc('lh.order_date');

        if (! empty($params['lab_item_name'])) {
            $query->where('li.lab_items_name', 'like', '%'.$params['lab_item_name'].'%');
        }
        if (isset($params['lab_result_max']) && $params['lab_result_max'] !== '' && $params['lab_result_max'] !== null) {
            $query->whereRaw("CAST({$resultSql} AS DECIMAL(12,2)) <= ?", [(float) $params['lab_result_max']]);
        }
        if (isset($params['lab_result_min']) && $params['lab_result_min'] !== '' && $params['lab_result_min'] !== null) {
            $query->whereRaw("CAST({$resultSql} AS DECIMAL(12,2)) >= ?", [(float) $params['lab_result_min']]);
        }

        return $query;
    }

    private function queryDrugReport($conn, string $startDate, string $endDate, array $params): Builder
    {
        $ipdCond = $this->ipdConditionSql($conn);
        $anSelect = $this->opitemreceHasAn($conn) ? 'oi.an' : 'o.an';

        $query = $conn->table('opitemrece as oi')
            ->join('drugitems as d', 'd.icode', '=', 'oi.icode')
            ->leftJoin('ovst as o', 'o.vn', '=', 'oi.vn')
            ->whereBetween('oi.vstdate', [$startDate, $endDate])
            ->select(['oi.vn', 'oi.hn', 'oi.vstdate as service_date'])
            ->selectRaw("{$anSelect} as an")
            ->selectRaw("CASE WHEN {$ipdCond} THEN 'IPD' ELSE 'OPD' END as visit_type")
            ->selectRaw('oi.icode as drug_code')
            ->selectRaw('d.name as drug_name')
            ->selectRaw('oi.qty')
            ->selectRaw('oi.sum_price as amount')
            ->orderByDesc('oi.vstdate');

        if (! empty($params['drug_name'])) {
            $query->where('d.name', 'like', '%'.$params['drug_name'].'%');
        }
        if (! empty($params['visit_type'])) {
            if (strtoupper($params['visit_type']) === 'IPD') {
                $query->whereRaw($ipdCond);
            } elseif (strtoupper($params['visit_type']) === 'OPD') {
                $query->whereRaw("NOT ({$ipdCond})");
            }
        }

        return $query;
    }

    private function queryServiceCharge($conn, string $startDate, string $endDate, array $params): Builder
    {
        $ipdCond = $this->ipdConditionSql($conn);
        $hasIncome = $this->tableExists($conn, 'income');
        $incomeExpr = $hasIncome
            ? "COALESCE(inc.name, NULLIF(COALESCE(d.income, nd.income), ''), 'ไม่ระบุกลุ่ม')"
            : "COALESCE(NULLIF(COALESCE(d.income, nd.income), ''), 'ไม่ระบุกลุ่ม')";

        $visitTypeExpr = "CASE WHEN {$ipdCond} THEN 'IPD' ELSE 'OPD' END";

        $query = $conn->table('opitemrece as oi')
            ->leftJoin('ovst as o', 'o.vn', '=', 'oi.vn')
            ->leftJoin('drugitems as d', 'd.icode', '=', 'oi.icode')
            ->leftJoin('nondrugitems as nd', 'nd.icode', '=', 'oi.icode');

        if ($hasIncome) {
            $query->leftJoin('income as inc', function ($join) {
                $join->on('inc.income', '=', DB::raw('COALESCE(d.income, nd.income)'));
            });
        }

        $query->whereBetween('oi.vstdate', [$startDate, $endDate])
            ->selectRaw("{$incomeExpr} as income_group")
            ->selectRaw("{$visitTypeExpr} as visit_type")
            ->selectRaw('COUNT(*) as item_count')
            ->selectRaw('COALESCE(SUM(oi.qty), 0) as total_qty')
            ->selectRaw('COALESCE(SUM(oi.sum_price), 0) as total_amount')
            ->groupByRaw("{$incomeExpr}, {$visitTypeExpr}")
            ->orderByDesc('total_amount');

        if (! empty($params['visit_type'])) {
            if (strtoupper($params['visit_type']) === 'IPD') {
                $query->whereRaw($ipdCond);
            } elseif (strtoupper($params['visit_type']) === 'OPD') {
                $query->whereRaw("NOT ({$ipdCond})");
            }
        }

        return $query;
    }

    private function queryXrayReport($conn, string $startDate, string $endDate): Builder
    {
        if ($this->tableExists($conn, 'xray_report')) {
            $dateCol = $this->columnExists($conn, 'xray_report', 'report_date') ? 'xr.report_date' : 'xr.vstdate';

            return $conn->table('xray_report as xr')
                ->leftJoin('xray_items as xi', 'xi.xray_items_code', '=', 'xr.xray_items_code')
                ->whereBetween(DB::raw($dateCol), [$startDate, $endDate])
                ->select(['xr.vn', 'xr.hn'])
                ->selectRaw("{$dateCol} as report_date")
                ->selectRaw('xi.xray_items_name as xray_item')
                ->selectRaw('xr.report_text')
                ->orderByDesc(DB::raw($dateCol));
        }

        $dateCol = $this->columnExists($conn, 'xray_head', 'order_date') ? 'xh.order_date' : 'xh.vstdate';

        return $conn->table('xray_head as xh')
            ->leftJoin('xray_items as xi', 'xi.xray_items_code', '=', 'xh.xray_items_code')
            ->whereBetween(DB::raw($dateCol), [$startDate, $endDate])
            ->select(['xh.vn', 'xh.hn'])
            ->selectRaw("{$dateCol} as report_date")
            ->selectRaw('xi.xray_items_name as xray_item')
            ->selectRaw("'' as report_text")
            ->orderByDesc(DB::raw($dateCol));
    }

    private function queryIpdAdmission($conn, string $startDate, string $endDate, array $params): Builder
    {
        $hasIptDiag = $this->tableExists($conn, 'iptdiag');

        $query = $conn->table('ipt as i')
            ->leftJoin('ward as w', 'w.ward', '=', 'i.ward')
            ->leftJoin('pttype as pt', 'pt.pttype', '=', 'i.pttype');

        if ($hasIptDiag) {
            $query->leftJoin('iptdiag as idg', function ($join) {
                $join->on('idg.an', '=', 'i.an')->where('idg.diagtype', '=', '1');
            })->leftJoin('icd101 as icd', 'icd.code', '=', 'idg.icd10');
        }

        $query->whereBetween('i.regdate', [$startDate, $endDate])
            ->select(['i.an', 'i.hn', 'i.regdate as admit_date', 'i.dchdate as discharge_date'])
            ->selectRaw('CASE WHEN i.dchdate IS NULL OR i.dchdate = "0000-00-00" THEN NULL ELSE DATEDIFF(i.dchdate, i.regdate) END as los_days')
            ->selectRaw("COALESCE(w.name, NULLIF(i.ward, ''), 'ไม่ระบุหอ') as ward_name")
            ->selectRaw("COALESCE(pt.name, NULLIF(i.pttype, ''), 'ไม่ระบุสิทธิ') as pttype_name");

        if ($hasIptDiag) {
            $query->selectRaw("COALESCE(NULLIF(idg.icd10, ''), '-') as principal_icd10")
                ->selectRaw("COALESCE(NULLIF(icd.tname, ''), icd.name, NULLIF(idg.icd10, ''), '-') as principal_dx");
        } else {
            $query->selectRaw("'-' as principal_icd10")->selectRaw("'-' as principal_dx");
        }

        if (! empty($params['ward'])) {
            $query->where('i.ward', $params['ward']);
        }
        if (($params['admit_status'] ?? '') === 'active') {
            $query->where(function ($q) {
                $q->whereNull('i.dchdate')->orWhere('i.dchdate', '0000-00-00');
            });
        } elseif (($params['admit_status'] ?? '') === 'discharged') {
            $query->whereNotNull('i.dchdate')->where('i.dchdate', '<>', '0000-00-00');
        }

        return $query->orderByDesc('i.regdate');
    }

    private function queryIpdCensus($conn, array $params): Builder
    {
        $hasIptDiag = $this->tableExists($conn, 'iptdiag');

        $query = $conn->table('ipt as i')
            ->leftJoin('ward as w', 'w.ward', '=', 'i.ward')
            ->leftJoin('pttype as pt', 'pt.pttype', '=', 'i.pttype')
            ->where(function ($q) {
                $q->whereNull('i.dchdate')->orWhere('i.dchdate', '0000-00-00');
            })
            ->select(['i.an', 'i.hn', 'i.regdate as admit_date'])
            ->selectRaw("COALESCE(w.name, NULLIF(i.ward, ''), 'ไม่ระบุหอ') as ward_name")
            ->selectRaw("COALESCE(pt.name, NULLIF(i.pttype, ''), 'ไม่ระบุสิทธิ') as pttype_name");

        if ($hasIptDiag) {
            $query->leftJoin('iptdiag as idg', function ($join) {
                $join->on('idg.an', '=', 'i.an')->where('idg.diagtype', '=', '1');
            })->selectRaw("COALESCE(NULLIF(idg.icd10, ''), '-') as principal_icd10");
        } else {
            $query->selectRaw("'-' as principal_icd10");
        }

        if (! empty($params['ward'])) {
            $query->where('i.ward', $params['ward']);
        }

        return $query->orderBy('w.name')->orderBy('i.regdate');
    }

    private function queryAppointment($conn, string $startDate, string $endDate): Builder
    {
        if ($this->tableExists($conn, 'oapp')) {
            return $this->queryOappAppointment($conn, $startDate, $endDate);
        }

        $dateCol = $this->columnExists($conn, 'appoint', 'nextdate') ? 'nextdate' : 'appdate';
        $timeCol = $this->columnExists($conn, 'appoint', 'nexttime') ? 'nexttime' : 'apptime';

        return $conn->table('appoint as a')
            ->leftJoin('patient as p', 'p.hn', '=', 'a.hn')
            ->whereBetween("a.{$dateCol}", [$startDate, $endDate])
            ->select(['a.hn'])
            ->selectRaw("TRIM(CONCAT(COALESCE(p.pname, ''), COALESCE(p.fname, ''), ' ', COALESCE(p.lname, ''))) as full_name")
            ->selectRaw('NULL as visit_date')
            ->selectRaw("a.{$dateCol} as app_date")
            ->selectRaw("a.{$timeCol} as app_time")
            ->selectRaw($this->patientPhoneSql($conn, 'p').' as patient_phone')
            ->selectRaw($this->relativePhoneSql($conn, 'p').' as relative_phone')
            ->selectRaw($this->columnExists($conn, 'appoint', 'note')
                ? 'COALESCE(NULLIF(TRIM(a.note), ""), "-") as conduct_note'
                : '"-" as conduct_note')
            ->orderBy("a.{$dateCol}");
    }

    private function queryOappAppointment($conn, string $startDate, string $endDate): Builder
    {
        $conductParts = [];
        foreach (['note', 'note1', 'note2', 'perform_text'] as $col) {
            if ($this->columnExists($conn, 'oapp', $col)) {
                $conductParts[] = "NULLIF(TRIM(o.{$col}), '')";
            }
        }
        $conductExpr = $conductParts !== []
            ? "COALESCE(NULLIF(TRIM(CONCAT_WS(' | ', ".implode(', ', $conductParts).")), ''), '-')"
            : "'-'";

        return $conn->table('oapp as o')
            ->leftJoin('patient as p', 'p.hn', '=', 'o.hn')
            ->whereBetween('o.nextdate', [$startDate, $endDate])
            ->select(['o.hn', 'o.vn'])
            ->selectRaw("TRIM(CONCAT(COALESCE(p.pname, ''), COALESCE(p.fname, ''), ' ', COALESCE(p.lname, ''))) as full_name")
            ->selectRaw('o.vstdate as visit_date')
            ->selectRaw('o.nextdate as app_date')
            ->selectRaw('o.nexttime as app_time')
            ->selectRaw($this->patientPhoneSql($conn, 'p').' as patient_phone')
            ->selectRaw($this->relativePhoneSql($conn, 'p').' as relative_phone')
            ->selectRaw("{$conductExpr} as conduct_note")
            ->orderBy('o.nextdate')
            ->orderBy('o.nexttime');
    }

    private function appointmentTable($conn): ?string
    {
        if ($this->tableExists($conn, 'oapp')) {
            return 'oapp';
        }
        if ($this->tableExists($conn, 'appoint')) {
            return 'appoint';
        }

        return null;
    }

    private function patientPhoneSql($conn, string $alias = 'p'): string
    {
        $hasMobile = $this->columnExists($conn, 'patient', 'mobile_phone_number');
        $hasHome = $this->columnExists($conn, 'patient', 'hometel');

        if ($hasMobile && $hasHome) {
            return "COALESCE(NULLIF(TRIM({$alias}.mobile_phone_number), ''), NULLIF(TRIM({$alias}.hometel), ''), '-')";
        }
        if ($hasMobile) {
            return "COALESCE(NULLIF(TRIM({$alias}.mobile_phone_number), ''), '-')";
        }
        if ($hasHome) {
            return "COALESCE(NULLIF(TRIM({$alias}.hometel), ''), '-')";
        }

        return "'-'";
    }

    private function relativePhoneSql($conn, string $alias = 'p'): string
    {
        if ($this->columnExists($conn, 'patient', 'informtel')) {
            return "COALESCE(NULLIF(TRIM({$alias}.informtel), ''), '-')";
        }

        return "'-'";
    }

    private function queryPatientList($conn, string $startDate, string $endDate, array $params): Builder
    {
        $birthCol = $this->columnExists($conn, 'patient', 'birthday') ? 'p.birthday' : 'p.birthdate';

        $query = $conn->table('patient as p')
            ->leftJoin('thaiaddress as ta', function ($join) {
                $join->on('p.chwpart', '=', 'ta.chwpart')
                    ->on('p.amppart', '=', 'ta.amppart')
                    ->on('p.tmbpart', '=', 'ta.tmbpart');
            })
            ->select(['p.hn', 'p.cid', 'p.sex'])
            ->selectRaw("TRIM(CONCAT(COALESCE(p.pname, ''), COALESCE(p.fname, ''), ' ', COALESCE(p.lname, ''))) as full_name")
            ->selectRaw("{$birthCol} as birthdate")
            ->selectRaw("TIMESTAMPDIFF(YEAR, {$birthCol}, CURDATE()) as age_years")
            ->selectRaw('p.chwpart as province')
            ->selectRaw('p.amppart as district')
            ->selectRaw($this->columnExists($conn, 'thaiaddress', 'name') ? 'ta.name as subdistrict' : 'p.tmbpart as subdistrict');

        if ($this->truthy($params['active_in_range'] ?? false)) {
            $query->whereExists(function ($sub) use ($startDate, $endDate) {
                $sub->select(DB::raw(1))
                    ->from('ovst as o')
                    ->whereColumn('o.hn', 'p.hn')
                    ->whereBetween('o.vstdate', [$startDate, $endDate]);
            });
        }
        if (! empty($params['hn'])) {
            $query->where('p.hn', 'like', '%'.$params['hn'].'%');
        }
        if (! empty($params['cid'])) {
            $query->where('p.cid', 'like', '%'.$params['cid'].'%');
        }
        if (! empty($params['name'])) {
            $query->whereRaw("CONCAT(COALESCE(p.fname, ''), COALESCE(p.lname, '')) LIKE ?", ['%'.$params['name'].'%']);
        }

        return $query->orderBy('p.hn');
    }

    private function has506Tables($conn): bool
    {
        return ($this->tableExists($conn, 'code506') && $this->tableExists($conn, 'name506'))
            || $this->columnExists($conn, 'ovstdiag', 'code506');
    }

    private function queryDisease506($conn, string $startDate, string $endDate, array $params): Builder
    {
        $query = $conn->table('ovstdiag as d')
            ->join('ovst as o', 'o.vn', '=', 'd.vn')
            ->whereBetween('o.vstdate', [$startDate, $endDate])
            ->where('d.diagtype', '1')
            ->select(['d.vn', 'd.hn', 'o.vstdate as visit_date', 'd.icd10']);

        if ($this->tableExists($conn, 'code506') && $this->tableExists($conn, 'name506')) {
            // HOSxP: code506.min/max = ช่วง ICD-10, name506.code = code506.code, name506.code506 = รหัส 506
            $query->leftJoin('code506 as cmap', function ($join) {
                $join->whereRaw('d.icd10 >= cmap.min AND d.icd10 <= cmap.max');
            })
                ->leftJoin('name506 as n506', 'n506.code', '=', 'cmap.code');

            if ($this->tableExists($conn, 'provis_code506')) {
                $query->leftJoin('provis_code506 as p506', 'p506.code', '=', 'n506.code506')
                    ->selectRaw('COALESCE(n506.code506, p506.code, cmap.code, "-") as code506')
                    ->selectRaw('COALESCE(n506.name, p506.name, "-") as disease_506_name');
            } else {
                $query->selectRaw('COALESCE(n506.code506, cmap.code, "-") as code506')
                    ->selectRaw('COALESCE(n506.name, "-") as disease_506_name');
            }
        } elseif ($this->columnExists($conn, 'ovstdiag', 'code506')) {
            $query->selectRaw('d.code506 as code506')
                ->selectRaw("COALESCE(d.code506, '-') as disease_506_name");
        } else {
            $query->selectRaw("'-' as code506")
                ->selectRaw("'-' as disease_506_name");
        }

        if (! empty($params['icd10_prefix'])) {
            $query->where('d.icd10', 'like', $params['icd10_prefix'].'%');
        }

        return $query->orderByDesc('o.vstdate');
    }

    private function queryDisease506Summary($conn, string $startDate, string $endDate): Builder
    {
        $detail = $this->queryDisease506($conn, $startDate, $endDate, []);

        return $conn->query()->fromSub($detail, 'd506')
            ->select(['code506', 'disease_506_name'])
            ->selectRaw('COUNT(DISTINCT vn) as visit_count')
            ->selectRaw('COUNT(DISTINCT hn) as patient_count')
            ->groupBy('code506', 'disease_506_name')
            ->orderByDesc('visit_count');
    }

    private function querySurgeryReport($conn, string $startDate, string $endDate): Builder
    {
        $dateCol = $this->columnExists($conn, 'operation_list', 'operation_date')
            ? 'ol.operation_date'
            : ($this->columnExists($conn, 'operation_list', 'request_date') ? 'ol.request_date' : 'ol.enter_date');

        $query = $conn->table('operation_list as ol')
            ->whereBetween(DB::raw($dateCol), [$startDate, $endDate])
            ->select(['ol.hn', 'ol.an'])
            ->selectRaw("{$dateCol} as operation_date");

        if ($this->tableExists($conn, 'operation_detail')) {
            $query->leftJoin('operation_detail as od', 'od.operation_id', '=', 'ol.operation_id');

            if ($this->tableExists($conn, 'operation_item')) {
                $query->leftJoin('operation_item as op', 'op.operation_item_id', '=', 'od.operation_item_id');
            }

            $codeParts = [];
            if ($this->tableExists($conn, 'operation_item')) {
                if ($this->columnExists($conn, 'operation_item', 'icd9')) {
                    $codeParts[] = "NULLIF(TRIM(op.icd9), '')";
                }
                if ($this->columnExists($conn, 'operation_item', 'icode')) {
                    $codeParts[] = "NULLIF(TRIM(op.icode), '')";
                }
            }
            if ($this->columnExists($conn, 'operation_detail', 'icode')) {
                $codeParts[] = "NULLIF(TRIM(od.icode), '')";
            }
            if ($this->columnExists($conn, 'operation_detail', 'icdcode')) {
                $codeParts[] = "NULLIF(TRIM(od.icdcode), '')";
            }
            $codeExpr = $codeParts !== []
                ? 'COALESCE('.implode(', ', $codeParts).", '-')"
                : "'-'";

            $nameParts = [];
            if ($this->tableExists($conn, 'operation_item') && $this->columnExists($conn, 'operation_item', 'name')) {
                $nameParts[] = "NULLIF(TRIM(op.name), '')";
            }
            if ($this->columnExists($conn, 'operation_list', 'operation_name')) {
                $nameParts[] = "NULLIF(TRIM(ol.operation_name), '')";
            }
            if ($this->columnExists($conn, 'operation_list', 'operation_detail_name')) {
                $nameParts[] = "NULLIF(TRIM(ol.operation_detail_name), '')";
            }
            if ($this->columnExists($conn, 'operation_detail', 'clinical_term')) {
                $nameParts[] = "NULLIF(TRIM(od.clinical_term), '')";
            }
            $nameExpr = $nameParts !== []
                ? 'COALESCE('.implode(', ', $nameParts).", '-')"
                : "'-'";

            $query->selectRaw("{$codeExpr} as operation_code")
                ->selectRaw("{$nameExpr} as operation_name");
        } else {
            $nameExpr = $this->columnExists($conn, 'operation_list', 'operation_name')
                ? "COALESCE(NULLIF(TRIM(ol.operation_name), ''), '-')"
                : "'-'";
            $query->selectRaw("'-' as operation_code")
                ->selectRaw("{$nameExpr} as operation_name");
        }

        $surgeonParts = [];
        if ($this->tableExists($conn, 'operation_detail') && $this->columnExists($conn, 'operation_detail', 'doctor')) {
            $surgeonParts[] = "NULLIF(TRIM(od.doctor), '')";
        }
        if ($this->columnExists($conn, 'operation_list', 'request_doctor')) {
            $surgeonParts[] = "NULLIF(TRIM(ol.request_doctor), '')";
        }
        $surgeonExpr = $surgeonParts !== []
            ? 'COALESCE('.implode(', ', $surgeonParts).", '-')"
            : "'-'";
        $query->selectRaw("{$surgeonExpr} as surgeon");

        return $query->orderByDesc(DB::raw($dateCol));
    }

    private function queryMedicalSupply($conn, string $startDate, string $endDate, array $params): Builder
    {
        $ipdCond = $this->ipdConditionSql($conn);
        $anSelect = $this->opitemreceHasAn($conn) ? 'oi.an' : 'o.an';

        $query = $conn->table('opitemrece as oi')
            ->join('nondrugitems as nd', 'nd.icode', '=', 'oi.icode')
            ->leftJoin('ovst as o', 'o.vn', '=', 'oi.vn')
            ->whereBetween('oi.vstdate', [$startDate, $endDate])
            ->whereNotExists(function ($sub) {
                $sub->select(DB::raw(1))->from('drugitems as d')->whereColumn('d.icode', 'oi.icode');
            })
            ->select(['oi.vn', 'oi.hn', 'oi.vstdate as service_date'])
            ->selectRaw("{$anSelect} as an")
            ->selectRaw("CASE WHEN {$ipdCond} THEN 'IPD' ELSE 'OPD' END as visit_type")
            ->selectRaw('oi.icode as item_code')
            ->selectRaw('nd.name as item_name')
            ->selectRaw('oi.qty')
            ->selectRaw('oi.sum_price as amount')
            ->orderByDesc('oi.vstdate');

        if (! empty($params['visit_type'])) {
            if (strtoupper($params['visit_type']) === 'IPD') {
                $query->whereRaw($ipdCond);
            } elseif (strtoupper($params['visit_type']) === 'OPD') {
                $query->whereRaw("NOT ({$ipdCond})");
            }
        }

        return $query;
    }

    /** @param array<int, string> $keys */
    private function rowToAssoc(object $row, array $keys): array
    {
        $assoc = [];
        foreach ($keys as $key) {
            $assoc[$key] = $row->{$key} ?? '';
        }

        return $assoc;
    }

    /** @param array<int, string> $keys @return array<int, string|int|float|null> */
    private function rowToArray(object $row, array $keys): array
    {
        return array_map(fn ($key) => $row->{$key} ?? '', $keys);
    }

    private function truthy(mixed $value): bool
    {
        return in_array($value, [true, 1, '1', 'true', 'on'], true);
    }
}
