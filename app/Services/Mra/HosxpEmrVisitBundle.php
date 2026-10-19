<?php

namespace App\Services\Mra;

use App\Services\HosxpSchema;
use App\Services\HosxpService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * รวมข้อมูล EMR จาก HOSxP สำหรับ MRA OPD/ER/IPD (โหลดครั้งเดียวต่อ VN)
 * แหล่งหลัก: opdscreen + patient_history (+ er_regist / operation / consent / ipt)
 */
class HosxpEmrVisitBundle
{
    public function __construct(
        protected HosxpService $hosxpService
    ) {}

    /**
     * @return array<string, mixed>|null
     */
    public function load(string $vn): ?array
    {
        $visit = $this->hosxpService->getVisitData($vn);
        if (!$visit) {
            return null;
        }

        $hn = (string) ($visit['hn'] ?? '');
        $an = (string) ($visit['an'] ?? '');
        $conn = DB::connection('hosxp');

        $opdScreenExtra = $this->loadOpdScreenExtra($conn, $vn);
        $patientExtra = $this->loadPatientExtra($conn, $hn);
        $patientHistory = $this->loadPatientHistory($conn, $hn);
        $peVisit = $this->loadPeVisit($conn, $vn);
        $er = $this->loadErRegist($conn, $vn);
        $doctorSign = $this->loadDoctorSign($conn, $vn);
        $consults = $this->loadConsults($conn, $vn);
        $operation = $this->loadOperation($conn, $vn, $hn);
        $consent = $this->loadConsent($conn, $vn, $hn);
        $priorVisits = $this->loadPriorVisits($conn, $hn, $vn, (string) ($visit['vstdate'] ?? ''));
        $drugs = $this->loadDrugsDetailed($conn, $vn, $an);
        $labs = $this->loadLabsDetailed($conn, $vn);
        $diagnoses = $this->loadDiagnosesDetailed($visit);
        $ipt = $an !== '' ? $this->loadIpt($conn, $an) : [];
        $drugSummary = $this->summarizeDrugList($drugs);
        $labSummary = $this->summarizeLabList($labs, $visit);

        $patient = array_merge($visit['patient'] ?? [], $patientExtra);

        return [
            'vn' => $vn,
            'hn' => $hn,
            'an' => $an !== '' ? $an : null,
            'visit' => $visit,
            'patient' => $patient,
            'opdscreen' => $opdScreenExtra,
            'patient_history' => $patientHistory,
            'pe_visit' => $peVisit,
            'er' => $er,
            'is_er' => !empty($er),
            'is_ipd' => !empty($visit['is_ipd']) || $an !== '',
            'ipt' => $ipt,
            'doctor_sign' => $doctorSign,
            'consults' => $consults,
            'operation' => $operation,
            'consent' => $consent,
            'prior_visits' => $priorVisits,
            'drugs' => $drugs,
            'labs' => $labs,
            'diagnoses' => $diagnoses,
            'drug_summary' => $drugSummary,
            'lab_summary' => $labSummary,
            'has_followup_history' => count($priorVisits) > 0,
            'age_years' => $patient['age'] ?? null,
            'sex' => $patient['sex'] ?? null,
        ];
    }

    /**
     * @param  \Illuminate\Database\Connection  $conn
     * @return array<string, mixed>
     */
    protected function loadOpdScreenExtra($conn, string $vn): array
    {
        try {
            if (!HosxpSchema::tableExists($conn, 'opdscreen')) {
                return [];
            }

            $cols = [
                'cc', 'symptom', 'hpi', 'pmh', 'fh', 'pe', 'note', 'er_note', 'help4_note',
                'his_begin_date', 'his_frequency', 'his_severity', 'his_cause', 'his_expand',
                'his_cause_increase', 'his_cause_decrease', 'his_related_sign',
                'pe_ga', 'pe_heent', 'pe_heart', 'pe_lung', 'pe_ab', 'pe_ext', 'pe_neuro',
                'pe_chest', 'pe_skin', 'pe_head', 'pe_gi', 'pe_gu', 'pe_gy', 'pe_pv', 'pe_pr', 'pe_gen',
                'pe_ga_text', 'pe_heent_text', 'pe_heart_text', 'pe_lung_text', 'pe_ab_text',
                'pe_ext_text', 'pe_neuro_text', 'pe_chest_text', 'pe_skin_text',
                'advice1', 'advice2', 'advice3', 'advice4', 'advice5', 'advice6', 'advice7', 'advice8',
                'advice7_note',
                'smoking_type_id', 'drinking_type_id',
                'menstrual_cycle_type_id', 'vaccine_screen_type_id', 'development_screen_type_id',
                'pe_rtf', 'found_allergy',
                'bps', 'bpd', 'bpsys', 'bpdia', 'pulse', 'hr', 'temperature', 'rr', 'bw', 'height',
            ];

            $select = [];
            foreach ($cols as $col) {
                if (HosxpSchema::columnExists($conn, 'opdscreen', $col)) {
                    $select[] = $col;
                }
            }
            if ($select === []) {
                return [];
            }

            $row = $conn->table('opdscreen')->where('vn', $vn)->select($select)->first();
            if (!$row) {
                return [];
            }

            $data = (array) $row;
            foreach (['cc', 'symptom', 'hpi', 'pmh', 'fh', 'pe', 'pe_ga_text', 'note', 'er_note', 'help4_note', 'pe_rtf'] as $textCol) {
                if (isset($data[$textCol])) {
                    $data[$textCol] = $this->plainText($data[$textCol]);
                }
            }

            return $data;
        } catch (\Throwable $e) {
            Log::warning('HosxpEmrVisitBundle::loadOpdScreenExtra: '.$e->getMessage());

            return [];
        }
    }

    /**
     * @param  \Illuminate\Database\Connection  $conn
     * @return array<string, mixed>
     */
    protected function loadPatientExtra($conn, string $hn): array
    {
        if ($hn === '') {
            return [];
        }

        try {
            $cols = [
                'bloodgrp', 'bloodgroup_rh',
                'informname', 'informrelation', 'informtel', 'informaddr',
                'hometel', 'fathername', 'motherlname',
            ];
            $select = ['hn'];
            foreach ($cols as $col) {
                if (HosxpSchema::columnExists($conn, 'patient', $col)) {
                    $select[] = $col;
                }
            }

            $row = $conn->table('patient')->where('hn', $hn)->select($select)->first();
            if (!$row) {
                $padded = $this->hosxpService->normalizeHn($hn);
                if ($padded !== $hn) {
                    $row = $conn->table('patient')->where('hn', $padded)->select($select)->first();
                }
            }

            return $row ? (array) $row : [];
        } catch (\Throwable $e) {
            Log::warning('HosxpEmrVisitBundle::loadPatientExtra: '.$e->getMessage());

            return [];
        }
    }

    /**
     * @param  \Illuminate\Database\Connection  $conn
     * @return array<string, mixed>
     */
    protected function loadPatientHistory($conn, string $hn): array
    {
        if ($hn === '' || !HosxpSchema::tableExists($conn, 'patient_history')) {
            return [];
        }

        try {
            $row = $conn->table('patient_history')->where('hn', $hn)->first();
            if (!$row) {
                $padded = $this->hosxpService->normalizeHn($hn);
                if ($padded !== $hn) {
                    $row = $conn->table('patient_history')->where('hn', $padded)->first();
                }
            }
            if (!$row) {
                return [];
            }

            $data = (array) $row;
            foreach (['hpi', 'pmh', 'fh', 'sh', 'ros', 'chronic_disease_text', 'doctor_note_text', 'operation_text', 'medication_history_text', 'note_text'] as $col) {
                if (isset($data[$col])) {
                    $data[$col] = $this->plainText($data[$col]);
                }
            }

            return $data;
        } catch (\Throwable $e) {
            return [];
        }
    }

    /**
     * @param  \Illuminate\Database\Connection  $conn
     * @return array<string, mixed>
     */
    protected function loadPeVisit($conn, string $vn): array
    {
        if (!HosxpSchema::tableExists($conn, 'patient_history_pe_visit')) {
            return [];
        }

        try {
            $row = $conn->table('patient_history_pe_visit')->where('vn', $vn)->orderByDesc('patient_history_pe_visit_id')->first();
            if (!$row) {
                return [];
            }

            $data = (array) $row;
            foreach (['chief_complaint', 'present_illness', 'past_history', 'family_history', 'provisional_diagnosis', 'plan_of_management', 'lab_detail', 'xray_detail'] as $col) {
                if (isset($data[$col])) {
                    $data[$col] = $this->plainText($data[$col]);
                }
            }

            return $data;
        } catch (\Throwable $e) {
            return [];
        }
    }

    /**
     * @param  \Illuminate\Database\Connection  $conn
     * @return array<string, mixed>
     */
    protected function loadErRegist($conn, string $vn): array
    {
        if (!HosxpSchema::tableExists($conn, 'er_regist')) {
            return [];
        }

        try {
            $row = $conn->table('er_regist')->where('vn', $vn)->first();

            return $row ? (array) $row : [];
        } catch (\Throwable $e) {
            return [];
        }
    }

    /**
     * @param  \Illuminate\Database\Connection  $conn
     * @return array<string, mixed>
     */
    protected function loadDoctorSign($conn, string $vn): array
    {
        if (!HosxpSchema::tableExists($conn, 'ovst_doctor_sign')) {
            return [];
        }

        try {
            $row = $conn->table('ovst_doctor_sign')->where('vn', $vn)->orderByDesc('sign_datetime')->first();

            return $row ? (array) $row : [];
        } catch (\Throwable $e) {
            return [];
        }
    }

    /**
     * @param  \Illuminate\Database\Connection  $conn
     * @return list<array<string, mixed>>
     */
    protected function loadConsults($conn, string $vn): array
    {
        if (!HosxpSchema::tableExists($conn, 'doctor_consult')) {
            return [];
        }

        try {
            return $conn->table('doctor_consult')
                ->where('vn', $vn)
                ->orderByDesc('consult_date')
                ->limit(5)
                ->get(['consult_id', 'consult_date', 'consult_question', 'consult_reply', 'doctor', 'reply_date'])
                ->map(fn ($r) => (array) $r)
                ->all();
        } catch (\Throwable $e) {
            return [];
        }
    }

    /**
     * @param  \Illuminate\Database\Connection  $conn
     * @return array<string, mixed>
     */
    protected function loadOperation($conn, string $vn, string $hn): array
    {
        if (!HosxpSchema::tableExists($conn, 'operation_list')) {
            return [];
        }

        try {
            $op = $conn->table('operation_list')->where('vn', $vn)->orderByDesc('operation_id')->first();
            if (!$op && $hn !== '') {
                $op = $conn->table('operation_list')
                    ->where('hn', $hn)
                    ->whereDate('operation_date', '>=', now()->subDays(30)->toDateString())
                    ->orderByDesc('operation_id')
                    ->first();
            }
            if (!$op) {
                return [];
            }

            $data = ['list' => (array) $op, 'note' => null];
            if (HosxpSchema::tableExists($conn, 'operation_oper_note')) {
                $note = $conn->table('operation_oper_note')
                    ->where('operation_id', $op->operation_id)
                    ->orderByDesc('operation_oper_note_id')
                    ->first();
                $data['note'] = $note ? (array) $note : null;
            }

            return $data;
        } catch (\Throwable $e) {
            return [];
        }
    }

    /**
     * @param  \Illuminate\Database\Connection  $conn
     * @return array<string, mixed>
     */
    protected function loadConsent($conn, string $vn, string $hn): array
    {
        if (!HosxpSchema::tableExists($conn, 'patient_consent')) {
            return [];
        }

        try {
            $row = $conn->table('patient_consent')->where('vn', $vn)->orderByDesc('patient_consent_id')->first();
            if (!$row && $hn !== '') {
                $row = $conn->table('patient_consent')->where('hn', $hn)->orderByDesc('patient_consent_id')->first();
            }
            if (!$row) {
                return [];
            }

            $data = ['form' => (array) $row, 'has_sign' => false];
            if (HosxpSchema::tableExists($conn, 'patient_consent_sign') && !empty($row->patient_consent_id)) {
                $data['has_sign'] = $conn->table('patient_consent_sign')
                    ->where('patient_consent_id', $row->patient_consent_id)
                    ->exists();
            }

            return $data;
        } catch (\Throwable $e) {
            return [];
        }
    }

    /**
     * @param  \Illuminate\Database\Connection  $conn
     * @return list<array<string, mixed>>
     */
    protected function loadPriorVisits($conn, string $hn, string $vn, string $vstdate): array
    {
        if ($hn === '' || !HosxpSchema::tableExists($conn, 'ovst')) {
            return [];
        }

        try {
            $q = $conn->table('ovst')
                ->where('hn', $hn)
                ->where('vn', '!=', $vn)
                ->orderByDesc('vstdate')
                ->orderByDesc('vsttime')
                ->limit(3);

            if ($vstdate !== '') {
                $q->where('vstdate', '<', $vstdate);
            }

            return $q->get(['vn', 'vstdate', 'vsttime', 'doctor', 'main_dep'])
                ->map(fn ($r) => (array) $r)
                ->all();
        } catch (\Throwable $e) {
            return [];
        }
    }

    /**
     * @param  \Illuminate\Database\Connection  $conn
     * @return list<array<string, mixed>>
     */
    protected function loadDrugsDetailed($conn, string $vn, string $an = ''): array
    {
        if (!HosxpSchema::tableExists($conn, 'opitemrece')) {
            return [];
        }

        try {
            $q = $conn->table('opitemrece as oi');
            if ($an !== '' && HosxpSchema::columnExists($conn, 'opitemrece', 'an')) {
                $q->where(function ($w) use ($vn, $an) {
                    $w->where('oi.vn', $vn)->orWhere('oi.an', $an);
                });
            } else {
                $q->where('oi.vn', $vn);
            }

            $hasDrugitems = HosxpSchema::tableExists($conn, 'drugitems');
            if ($hasDrugitems) {
                $q->leftJoin('drugitems as d', 'd.icode', '=', 'oi.icode')
                    ->select([
                        'oi.icode',
                        'oi.qty',
                        'oi.drugusage',
                        'oi.sum_price',
                        'd.name as drug_name',
                        'd.generic_name',
                        'd.strength',
                        'd.units',
                    ]);
            } else {
                $q->select(['oi.icode', 'oi.qty', 'oi.drugusage', 'oi.sum_price']);
            }

            return $q->limit(40)->get()->map(function ($r) {
                $row = (array) $r;
                $name = $this->firstFilled($row['drug_name'] ?? null, $row['generic_name'] ?? null, $row['icode'] ?? null);
                $strength = trim((string) ($row['strength'] ?? ''));
                $units = trim((string) ($row['units'] ?? ''));
                $qty = $row['qty'] ?? '';
                $usage = trim((string) ($row['drugusage'] ?? ''));
                $label = trim($name.($strength !== '' ? " {$strength}" : '').($units !== '' ? " {$units}" : ''));
                $detail = trim("{$label} · จำนวน {$qty}".($usage !== '' ? " · วิธีใช้ {$usage}" : ''));

                return [
                    'icode' => $row['icode'] ?? null,
                    'name' => $name,
                    'strength' => $strength !== '' ? $strength : null,
                    'units' => $units !== '' ? $units : null,
                    'qty' => $qty,
                    'drugusage' => $usage !== '' ? $usage : null,
                    'sum_price' => $row['sum_price'] ?? null,
                    'label' => $label,
                    'detail' => $detail,
                ];
            })->all();
        } catch (\Throwable $e) {
            Log::warning('HosxpEmrVisitBundle::loadDrugsDetailed: '.$e->getMessage());

            return [];
        }
    }

    /**
     * @param  \Illuminate\Database\Connection  $conn
     * @return list<array<string, mixed>>
     */
    protected function loadLabsDetailed($conn, string $vn): array
    {
        if (!HosxpSchema::tableExists($conn, 'lab_head')) {
            return [];
        }

        try {
            $heads = $conn->table('lab_head')
                ->where('vn', $vn)
                ->orderByDesc('order_date')
                ->limit(10)
                ->get(['lab_order_number', 'form_name', 'order_date', 'confirm_report']);

            $rows = [];
            $hasOrder = HosxpSchema::tableExists($conn, 'lab_order');
            $hasItems = HosxpSchema::tableExists($conn, 'lab_items');

            foreach ($heads as $head) {
                $orderNo = $head->lab_order_number ?? null;
                $formName = $head->form_name ?? ('Order '.$orderNo);
                $confirmed = !empty($head->confirm_report);

                if ($orderNo && $hasOrder) {
                    $q = $conn->table('lab_order as lo')->where('lo.lab_order_number', $orderNo);
                    if ($hasItems) {
                        $q->leftJoin('lab_items as li', 'li.lab_items_code', '=', 'lo.lab_items_code')
                            ->select([
                                'lo.lab_items_code',
                                'lo.lab_order_result',
                                'li.lab_items_name',
                                'li.lab_items_unit',
                                'li.lab_items_normal_value',
                            ]);
                    } else {
                        $q->select(['lo.lab_items_code', 'lo.lab_order_result']);
                    }

                    $orders = $q->limit(30)->get();
                    if ($orders->isEmpty()) {
                        $rows[] = [
                            'form_name' => $formName,
                            'order_date' => $head->order_date ?? null,
                            'confirm_report' => $confirmed,
                            'item_name' => $formName,
                            'result' => $confirmed ? 'มีรายงาน' : 'รอผล/ยังไม่ confirm',
                            'unit' => null,
                            'normal' => null,
                            'detail' => trim("{$formName} · ".($confirmed ? 'มีรายงาน' : 'รอผล')),
                        ];
                        continue;
                    }

                    foreach ($orders as $ord) {
                        $itemName = $this->firstFilled($ord->lab_items_name ?? null, 'code:'.($ord->lab_items_code ?? ''));
                        $result = $this->firstFilled($ord->lab_order_result ?? null, $confirmed ? 'มีรายงาน' : 'ยังไม่มีผล');
                        $unit = $ord->lab_items_unit ?? null;
                        $normal = $ord->lab_items_normal_value ?? null;
                        $rows[] = [
                            'form_name' => $formName,
                            'order_date' => $head->order_date ?? null,
                            'confirm_report' => $confirmed,
                            'item_name' => $itemName,
                            'result' => $result,
                            'unit' => $unit,
                            'normal' => $normal,
                            'detail' => trim(
                                "{$itemName} = {$result}"
                                .($unit ? " {$unit}" : '')
                                .($normal ? " (ปกติ: {$normal})" : '')
                            ),
                        ];
                    }
                } else {
                    $rows[] = [
                        'form_name' => $formName,
                        'order_date' => $head->order_date ?? null,
                        'confirm_report' => $confirmed,
                        'item_name' => $formName,
                        'result' => $confirmed ? 'มีรายงาน' : 'รอผล',
                        'unit' => null,
                        'normal' => null,
                        'detail' => trim("{$formName} · ".($confirmed ? 'มีรายงาน' : 'รอผล')),
                    ];
                }
            }

            return array_slice($rows, 0, 50);
        } catch (\Throwable $e) {
            Log::warning('HosxpEmrVisitBundle::loadLabsDetailed: '.$e->getMessage());

            return [];
        }
    }

    /**
     * @param  array<string, mixed>  $visit
     * @return list<array<string, mixed>>
     */
    protected function loadDiagnosesDetailed(array $visit): array
    {
        $rows = [];
        $pdx = $visit['pdx'] ?? null;
        if ($pdx) {
            $rows[] = [
                'icd10' => $pdx,
                'name' => $visit['pdx_name'] ?? null,
                'type' => 'PDx',
                'detail' => trim('PDx '.$pdx.(!empty($visit['pdx_name']) ? ' — '.$visit['pdx_name'] : '')),
            ];
        }

        $diags = $visit['diagnoses'] ?? [];
        if ($diags instanceof \Illuminate\Support\Collection) {
            $diags = $diags->all();
        }
        foreach ($diags as $d) {
            $row = is_array($d) ? $d : (array) $d;
            $code = $row['icd10'] ?? null;
            if (!$code || $code === $pdx) {
                continue;
            }
            $type = !empty($row['is_principal']) || ($row['diagtype'] ?? '') == '1' ? 'PDx' : 'SDx';
            $name = $row['diagtype_name'] ?? null;
            // try secondary names map
            $rows[] = [
                'icd10' => $code,
                'name' => $name,
                'type' => $type,
                'detail' => trim("{$type} {$code}".($name ? " — {$name}" : '')),
            ];
        }

        $secondary = $visit['secondary_diagnoses_with_names'] ?? $visit['secondary_diagnoses'] ?? [];
        if (is_array($secondary)) {
            foreach ($secondary as $item) {
                if (is_string($item)) {
                    $code = $item;
                    $name = null;
                } else {
                    $row = (array) $item;
                    $code = $row['icd10'] ?? $row['code'] ?? null;
                    $name = $row['name'] ?? $row['icd10_name'] ?? null;
                }
                if (!$code) {
                    continue;
                }
                $exists = collect($rows)->contains(fn ($r) => ($r['icd10'] ?? null) === $code);
                if ($exists) {
                    continue;
                }
                $rows[] = [
                    'icd10' => $code,
                    'name' => $name,
                    'type' => 'SDx',
                    'detail' => trim('SDx '.$code.($name ? " — {$name}" : '')),
                ];
            }
        }

        return $rows;
    }

    /**
     * @param  \Illuminate\Database\Connection  $conn
     * @return array<string, mixed>
     */
    protected function loadIpt($conn, string $an): array
    {
        if ($an === '' || !HosxpSchema::tableExists($conn, 'ipt')) {
            return [];
        }

        try {
            $row = $conn->table('ipt')->where('an', $an)->first();
            if (!$row) {
                return [];
            }

            return [
                'an' => $row->an ?? $an,
                'hn' => $row->hn ?? null,
                'regdate' => $row->regdate ?? null,
                'dchdate' => $row->dchdate ?? null,
                'ward' => $row->ward ?? null,
                'admdoctor' => $row->admdoctor ?? null,
            ];
        } catch (\Throwable $e) {
            return [];
        }
    }

    /**
     * @param  list<array<string, mixed>>  $drugs
     */
    protected function summarizeDrugList(array $drugs): string
    {
        if ($drugs === []) {
            return '';
        }

        $parts = array_slice(array_map(fn ($d) => $d['detail'] ?? $d['label'] ?? '', $drugs), 0, 6);
        $more = count($drugs) > 6 ? ' …(+'.(count($drugs) - 6).')' : '';

        return implode(' | ', array_filter($parts)).$more;
    }

    /**
     * @param  list<array<string, mixed>>  $labs
     * @param  array<string, mixed>  $visit
     */
    protected function summarizeLabList(array $labs, array $visit): string
    {
        $xray = (int) ($visit['xray_count'] ?? 0);
        if ($labs === []) {
            return 'Lab:0 Xray:'.$xray;
        }

        $confirmed = count(array_filter($labs, fn ($l) => !empty($l['confirm_report'])));
        $sample = array_slice(array_map(fn ($l) => $l['detail'] ?? '', $labs), 0, 4);

        return 'Lab:'.count($labs)." (confirm≈{$confirmed}) Xray:{$xray} · ".implode(' | ', array_filter($sample));
    }

    protected function firstFilled(mixed ...$values): ?string
    {
        foreach ($values as $value) {
            if ($value === null) {
                continue;
            }
            $text = trim((string) $value);
            if ($text !== '') {
                return $text;
            }
        }

        return null;
    }

    public function plainText(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $text = trim((string) $value);
        if ($text === '') {
            return null;
        }

        if (str_contains($text, '{\\rtf') || str_starts_with($text, '{\\rtf')) {
            $text = preg_replace('/\{\\\\rtf.*?\}/s', ' ', $text) ?? $text;
            $text = preg_replace('/\\\\[a-z]+\d* ?/i', ' ', $text) ?? $text;
            $text = str_replace(['{', '}', '\\'], ' ', $text);
            $text = html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $text = preg_replace('/\s+/u', ' ', $text) ?? $text;
            $text = trim($text);
        }

        return $text === '' ? null : $text;
    }

    public function clip(?string $text, int $max = 160): ?string
    {
        if ($text === null || $text === '') {
            return null;
        }
        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;
        if (mb_strlen($text) <= $max) {
            return $text;
        }

        return mb_substr($text, 0, $max - 1).'…';
    }
}
