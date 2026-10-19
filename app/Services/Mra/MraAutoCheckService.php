<?php

namespace App\Services\Mra;

use App\Models\Mra\MraCriteria;
use Illuminate\Support\Collection;

/**
 * ดึงหลักฐาน MRA OPD/ER/IPD จาก HOSxP
 * — มีหลักฐานชัดเจน = auto ผ่าน (passed=true)
 * — ไม่พบ = ไม่ auto ไม่ผ่าน (passed=null ให้ตรวจเอง)
 */
class MraAutoCheckService
{
    public function __construct(
        protected HosxpEmrVisitBundle $bundleLoader
    ) {}

    /**
     * @return array{
     *   vn: string,
     *   auto_checks: array<string, array<string, mixed>>,
     *   checked_count: int,
     *   evidence_found_count: int,
     *   evidence_missing_count: int,
     *   auto_pass_count: int,
     *   case_meta: array<string, mixed>
     * }
     */
    public function fetchEvidence(string $vn, ?string $auditType = 'opd'): array
    {
        $bundle = $this->bundleLoader->load($vn);
        if (!$bundle) {
            return [
                'vn' => $vn,
                'auto_checks' => [],
                'checked_count' => 0,
                'evidence_found_count' => 0,
                'evidence_missing_count' => 0,
                'auto_pass_count' => 0,
                'case_meta' => [
                    'is_er' => false,
                    'case_type' => 'unknown',
                    'warnings' => ['ไม่พบข้อมูล Visit ใน HOSxP'],
                    'mode' => 'evidence_auto_pass',
                ],
                'error' => 'ไม่พบข้อมูล Visit',
            ];
        }

        $criteria = MraCriteria::active()
            ->when($auditType, function ($q) use ($auditType) {
                $q->whereHas('category', fn ($cq) => $cq->forAuditType($auditType)->active());
            })
            ->with('category')
            ->get();

        $results = [];
        $found = 0;
        $missing = 0;
        $autoPass = 0;

        foreach ($criteria as $criterion) {
            $evidence = $this->evidenceFor($criterion->code, $bundle);
            $details = $this->buildDetails($criterion->code, $bundle);
            $sections = $this->buildSections($criterion->code, $bundle);
            $hasEvidence = (bool) $evidence['evidence_found'];
            if ($hasEvidence) {
                $found++;
                $autoPass++;
            } else {
                $missing++;
            }

            $results[$criterion->code] = [
                'criteria_id' => $criterion->id,
                'criteria_name' => $criterion->name,
                'criteria_code' => $criterion->code,
                // มีหลักฐาน = auto ผ่าน; ไม่พบ = ให้ตรวจเอง (ไม่ auto ไม่ผ่าน)
                'passed' => $hasEvidence ? true : null,
                'value' => $evidence['value'],
                'message' => $hasEvidence
                    ? ('พบหลักฐาน — ตั้งผ่านอัตโนมัติ · '.($evidence['message'] ?? ''))
                    : ($evidence['message'] ?? 'ไม่พบข้อมูลใน HOSxP'),
                'evidence_found' => $hasEvidence,
                'source' => $evidence['source'] ?? null,
                'details' => $details,
                'sections' => $sections,
                'max_score' => $criterion->max_score,
            ];
        }

        $caseMeta = $this->buildCaseMeta($bundle, $criteria, $auditType);

        return [
            'vn' => $vn,
            'auto_checks' => $results,
            'checked_count' => count($results),
            'evidence_found_count' => $found,
            'evidence_missing_count' => $missing,
            'auto_pass_count' => $autoPass,
            'case_meta' => $caseMeta,
        ];
    }

    /**
     * ส่วนแสดงผลคลินิก (ยา / Dx / Lab) ใน Dialog
     *
     * @param  array<string, mixed>  $bundle
     * @return list<array{title: string, items: list<array{label: string, value: string}>}>
     */
    public function buildSections(string $code, array $bundle): array
    {
        $sections = [];
        $wantDx = str_starts_with($code, 'pe_') || str_starts_with($code, 'tx_')
            || str_starts_with($code, 'fu') || str_starts_with($code, 'ih_')
            || str_starts_with($code, 'ipe_') || str_starts_with($code, 'dsd_')
            || in_array($code, ['pe_7', 'ipe_7', 'dsd_1', 'dsd_2'], true);
        $wantDrugs = str_starts_with($code, 'tx_') || str_starts_with($code, 'fu')
            || in_array($code, ['tx_2', 'fu1_6', 'fu2_6', 'fu3_6', 'ipg_4'], true)
            || str_starts_with($code, 'ipg_');
        $wantLabs = str_starts_with($code, 'tx_') || str_starts_with($code, 'fu')
            || str_starts_with($code, 'ipg_') || in_array($code, ['tx_1', 'fu1_5', 'fu2_5', 'fu3_5', 'ipg_6'], true);

        // แสดงยา/Dx/Lab ให้ชัดในข้อที่เกี่ยวข้อง หรือใน profile/history เมื่อมีข้อมูล
        if ($wantDx || in_array($code, ['hist_1', 'hist_2', 'ih_1', 'ih_2'], true)) {
            $dxItems = [];
            foreach (($bundle['diagnoses'] ?? []) as $dx) {
                $dxItems[] = [
                    'label' => ($dx['type'] ?? 'Dx').' '.($dx['icd10'] ?? ''),
                    'value' => $dx['detail'] ?? (($dx['icd10'] ?? '').' '.($dx['name'] ?? '')),
                ];
            }
            if ($dxItems !== []) {
                $sections[] = ['title' => 'คำวินิจฉัย (Diagnosis)', 'items' => $dxItems];
            }
        }

        if ($wantDrugs || str_starts_with($code, 'tx_') || str_starts_with($code, 'fu')) {
            $drugItems = [];
            foreach (($bundle['drugs'] ?? []) as $drug) {
                $drugItems[] = [
                    'label' => $drug['name'] ?? ($drug['icode'] ?? 'ยา'),
                    'value' => $drug['detail'] ?? '',
                ];
            }
            if ($drugItems !== []) {
                $sections[] = ['title' => 'ยาที่ได้รับ ('.count($drugItems).' รายการ)', 'items' => array_slice($drugItems, 0, 25)];
            }
        }

        if ($wantLabs || str_starts_with($code, 'tx_') || str_starts_with($code, 'fu')) {
            $labItems = [];
            foreach (($bundle['labs'] ?? []) as $lab) {
                $labItems[] = [
                    'label' => $lab['item_name'] ?? ($lab['form_name'] ?? 'Lab'),
                    'value' => $lab['detail'] ?? (($lab['result'] ?? '').(!empty($lab['unit']) ? ' '.$lab['unit'] : '')),
                ];
            }
            if ($labItems !== []) {
                $sections[] = ['title' => 'ผล Lab ('.count($labItems).' รายการ)', 'items' => array_slice($labItems, 0, 30)];
            }
            $xray = (int) (($bundle['visit']['xray_count'] ?? 0));
            if ($xray > 0) {
                $sections[] = [
                    'title' => 'รังสี / X-ray',
                    'items' => [['label' => 'จำนวนรายการ', 'value' => (string) $xray.' รายการ']],
                ];
            }
        }

        return $sections;
    }

    /**
     * รายละเอียดฟิลด์หลักฐาน (ข้อความเต็ม ไม่ตัด) สำหรับ Dialog
     *
     * @param  array<string, mixed>  $bundle
     * @return list<array{label: string, field: string, source: string, value: ?string, found: bool}>
     */
    public function buildDetails(string $code, array $bundle): array
    {
        $visit = $bundle['visit'] ?? [];
        $patient = $bundle['patient'] ?? [];
        $screen = $bundle['opdscreen'] ?? [];
        $history = $bundle['patient_history'] ?? [];
        $peVisit = $bundle['pe_visit'] ?? [];
        $er = $bundle['er'] ?? [];
        $vital = $visit['vital_signs'] ?? [];
        $rows = [];

        $add = function (string $label, string $field, string $source, mixed $value) use (&$rows): void {
            $text = $value === null ? null : trim((string) $value);
            if ($text === '') {
                $text = null;
            }
            $rows[] = [
                'label' => $label,
                'field' => $field,
                'source' => $source,
                'value' => $text,
                'found' => $this->filled($text),
            ];
        };

        // context ร่วม
        $add('VN', 'vn', 'ovst', $bundle['vn'] ?? $visit['vn'] ?? null);
        $add('HN', 'hn', 'patient', $patient['hn'] ?? $bundle['hn'] ?? null);
        if (!empty($bundle['is_er'])) {
            $add('ER visit', 'er_regist', 'er_regist', 'ใช่');
        }

        if (str_starts_with($code, 'pp_') || $code === 'pp_bonus_blood') {
            $add('ชื่อ-นามสกุล', 'patient_name', 'patient', $patient['patient_name'] ?? null);
            $add('เพศ', 'sex', 'patient', $patient['sex'] ?? null);
            $add('วันเกิด', 'birthday', 'patient', $patient['birthdate'] ?? $patient['birthday'] ?? null);
            $add('อายุ', 'age', 'patient', $patient['age_text'] ?? $patient['age'] ?? null);
            $add('ที่อยู่', 'full_address', 'patient', $patient['full_address'] ?? null);
            $add('เลขบัตรประชาชน', 'cid', 'patient', $patient['cid'] ?? null);
            $add('ประวัติแพ้', 'allergy_text', 'patient/opd_allergy', $visit['allergy_text'] ?? null);
            $add('ผู้ติดต่อฉุกเฉิน', 'informname', 'patient', $patient['informname'] ?? null);
            $add('ความสัมพันธ์', 'informrelation', 'patient', $patient['informrelation'] ?? null);
            $add('โทรศัพท์ผู้ติดต่อ', 'informtel', 'patient', $patient['informtel'] ?? null);
            $add('ที่อยู่ผู้ติดต่อ', 'informaddr', 'patient', $patient['informaddr'] ?? null);
            $add('หมู่เลือด', 'bloodgrp', 'patient', $patient['bloodgrp'] ?? null);
            $add('Rh', 'bloodgroup_rh', 'patient', $patient['bloodgroup_rh'] ?? null);
            $add('วัน Visit', 'vstdate', 'ovst', $visit['vstdate'] ?? null);
            $add('เวลา Visit', 'vsttime', 'ovst', $visit['vsttime'] ?? null);
        }

        if (str_starts_with($code, 'hist_')) {
            $add('Chief complaint', 'cc', 'opdscreen', $visit['chief_complaint'] ?? $screen['cc'] ?? null);
            $add('Present illness / HPI', 'hpi', 'opdscreen', $visit['present_illness'] ?? $screen['hpi'] ?? null);
            $add('HPI expand', 'his_expand', 'opdscreen', $screen['his_expand'] ?? null);
            $add('Past / Family', 'pmh/fh', 'opdscreen', $visit['past_illness'] ?? $screen['pmh'] ?? null);
            $add('PMH (patient_history)', 'pmh', 'patient_history', $history['pmh'] ?? null);
            $add('Chronic disease', 'chronic_disease_text', 'patient_history', $history['chronic_disease_text'] ?? null);
            $add('Allergy', 'allergy_text', 'allergy', $visit['allergy_text'] ?? null);
            $add('Smoking type', 'smoking_type_id', 'opdscreen', $screen['smoking_type_id'] ?? null);
            $add('Drinking type', 'drinking_type_id', 'opdscreen', $screen['drinking_type_id'] ?? null);
            $add('Smoking (history)', 'smoking', 'patient_history', $history['smoking'] ?? null);
            $add('Drink (history)', 'drink', 'patient_history', $history['drink'] ?? null);
            $add('Menstrual', 'menstrual_cycle_type_id', 'opdscreen', $screen['menstrual_cycle_type_id'] ?? null);
            $add('Vaccine', 'vaccine_screen_type_id', 'opdscreen', $screen['vaccine_screen_type_id'] ?? null);
            $add('Growth/dev', 'development_screen_type_id', 'opdscreen', $screen['development_screen_type_id'] ?? null);
            foreach (['his_begin_date', 'his_frequency', 'his_severity', 'his_cause', 'his_cause_increase', 'his_cause_decrease', 'his_related_sign'] as $hisField) {
                $add($hisField, $hisField, 'opdscreen', $screen[$hisField] ?? null);
            }
            if (!empty($peVisit)) {
                $add('PE visit CC', 'chief_complaint', 'patient_history_pe_visit', $peVisit['chief_complaint'] ?? null);
                $add('PE visit PI', 'present_illness', 'patient_history_pe_visit', $peVisit['present_illness'] ?? null);
            }
        }

        if (str_starts_with($code, 'pe_')) {
            $add('วัน Visit', 'vstdate', 'ovst', $visit['vstdate'] ?? null);
            $add('เวลา Visit', 'vsttime', 'ovst', $visit['vsttime'] ?? null);
            $add('ER enter', 'enter_er_time', 'er_regist', $er['enter_er_time'] ?? null);
            $add('ER triage', 'triage_datetime', 'er_regist', $er['triage_datetime'] ?? null);
            $add('ER doctor time', 'doctor_tx_time', 'er_regist', $er['doctor_tx_time'] ?? null);
            $add('Physical exam', 'pe', 'opdscreen', $visit['pe'] ?? $screen['pe'] ?? null);
            foreach (['pe_ga', 'pe_heent', 'pe_heart', 'pe_lung', 'pe_ab', 'pe_chest', 'pe_neuro', 'pe_ext', 'pe_skin'] as $peKey) {
                $flag = $screen[$peKey] ?? null;
                $text = $screen[$peKey.'_text'] ?? null;
                $add($peKey, $peKey, 'opdscreen', $this->joinNonEmpty([
                    $flag !== null && $flag !== '' ? (string) $flag : null,
                    $text,
                ], ' '));
            }
            $add('Pulse', 'pulse', 'opdscreen', $vital['pulse'] ?? $screen['pulse'] ?? $screen['hr'] ?? null);
            $add('RR', 'rr', 'opdscreen', $vital['respiratory_rate'] ?? $screen['rr'] ?? null);
            $add('Temp', 'temperature', 'opdscreen', $vital['temperature'] ?? $screen['temperature'] ?? null);
            $add('BP systolic', 'bps', 'opdscreen', $vital['bp_systolic'] ?? $screen['bps'] ?? null);
            $add('BP diastolic', 'bpd', 'opdscreen', $vital['bp_diastolic'] ?? $screen['bpd'] ?? null);
            $add('น้ำหนัก', 'bw', 'opdscreen', $vital['weight'] ?? $screen['bw'] ?? null);
            $add('ส่วนสูง', 'height', 'opdscreen', $vital['height'] ?? $screen['height'] ?? null);
            $add('PDx', 'pdx', 'ovstdiag', $visit['pdx'] ?? null);
            $add('PDx name', 'pdx_name', 'icd101', $visit['pdx_name'] ?? null);
            $add('Provisional (PE visit)', 'provisional_diagnosis', 'patient_history_pe_visit', $peVisit['provisional_diagnosis'] ?? null);
        }

        if (str_starts_with($code, 'pe_') || str_starts_with($code, 'tx_') || str_starts_with($code, 'ipe_') || str_starts_with($code, 'dsd_')) {
            foreach (($bundle['diagnoses'] ?? []) as $idx => $dx) {
                $add(
                    ($dx['type'] ?? 'Dx').' '.($dx['icd10'] ?? ''),
                    'dx_'.$idx,
                    'ovstdiag',
                    $dx['detail'] ?? null
                );
            }
        }

        if (str_starts_with($code, 'tx_') || str_starts_with($code, 'fu') || str_starts_with($code, 'ipg_')) {
            foreach (array_slice($bundle['drugs'] ?? [], 0, 20) as $idx => $drug) {
                $add(
                    'ยา: '.($drug['name'] ?? $drug['icode'] ?? ''),
                    'drug_'.$idx,
                    'opitemrece/drugitems',
                    $drug['detail'] ?? null
                );
            }
            foreach (array_slice($bundle['labs'] ?? [], 0, 25) as $idx => $lab) {
                $add(
                    'Lab: '.($lab['item_name'] ?? $lab['form_name'] ?? ''),
                    'lab_'.$idx,
                    'lab_order',
                    $lab['detail'] ?? null
                );
            }
        }

        if (str_starts_with($code, 'tx_')) {
            $add('Lab/Xray สรุป', 'labs/xray', 'lab_head/xray', $bundle['lab_summary'] ?? null);
            $add('จำนวน Lab', 'labs_count', 'lab_head', count($bundle['labs'] ?? []));
            $add('จำนวน X-ray', 'xray_count', 'xray', $visit['xray_count'] ?? null);
            $add('รายการยา/หัตถการ', 'opitemrece', 'opitemrece', $bundle['drug_summary'] ?? null);
            $add('จำนวนรายการยา', 'drugs_count', 'opitemrece', count($bundle['drugs'] ?? []));
            for ($i = 1; $i <= 8; $i++) {
                $add('advice'.$i, 'advice'.$i, 'opdscreen', $screen['advice'.$i] ?? null);
            }
            $add('คำแนะนำเพิ่ม', 'advice7_note', 'opdscreen', $screen['advice7_note'] ?? null);
            $add('วันนัด', 'nextdate', 'oapp', $visit['next_appointment'] ?? null);
            $add('แพทย์', 'doctor_name', 'doctor', $visit['doctor_name'] ?? null);
            $add('รหัสแพทย์', 'doctor', 'ovst', $visit['doctor_code'] ?? $visit['doctor'] ?? null);
            $add('ลายเซ็นอิเล็กทรอนิกส์', 'sign_datetime', 'ovst_doctor_sign', $bundle['doctor_sign']['sign_datetime'] ?? null);
            foreach (($bundle['consults'] ?? []) as $idx => $consult) {
                $n = $idx + 1;
                $add("Consult #{$n} วันที่", "consult_date_{$n}", 'doctor_consult', $consult['consult_date'] ?? null);
                $add("Consult #{$n} คำถาม", "consult_question_{$n}", 'doctor_consult', $consult['consult_question'] ?? null);
                $add("Consult #{$n} คำตอบ", "consult_reply_{$n}", 'doctor_consult', $consult['consult_reply'] ?? null);
            }
        }

        if (str_starts_with($code, 'fu')) {
            $add('CC (visit นี้)', 'cc', 'opdscreen', $visit['chief_complaint'] ?? $screen['cc'] ?? null);
            $add('HPI (visit นี้)', 'hpi', 'opdscreen', $visit['present_illness'] ?? $screen['hpi'] ?? null);
            $add('PE', 'pe', 'opdscreen', $visit['pe'] ?? $screen['pe'] ?? null);
            $add('VS', 'vitals', 'opdscreen', sprintf(
                'P:%s R:%s T:%s BP:%s/%s',
                $vital['pulse'] ?? '-',
                $vital['respiratory_rate'] ?? '-',
                $vital['temperature'] ?? '-',
                $vital['bp_systolic'] ?? '-',
                $vital['bp_diastolic'] ?? '-'
            ));
            $add('Lab/Xray', 'labs', 'lab_head', $bundle['lab_summary'] ?? null);
            $add('ยา', 'drugs', 'opitemrece', $bundle['drug_summary'] ?? null);
            $add('นัด', 'nextdate', 'oapp', $visit['next_appointment'] ?? null);
            $add('แพทย์', 'doctor_name', 'doctor', $visit['doctor_name'] ?? null);
            foreach (($bundle['prior_visits'] ?? []) as $idx => $prior) {
                $n = $idx + 1;
                $add("Visit ก่อนหน้า #{$n}", "prior_vn_{$n}", 'ovst', ($prior['vn'] ?? '').' @ '.($prior['vstdate'] ?? ''));
            }
        }

        if (str_starts_with($code, 'op_')) {
            $op = $bundle['operation']['list'] ?? [];
            $note = $bundle['operation']['note'] ?? [];
            $add('ชื่อหัตถการ', 'operation_name', 'operation_list', $op['operation_name'] ?? null);
            $add('วันที่ผ่าตัด', 'operation_date', 'operation_list', $op['operation_date'] ?? null);
            $add('Findings', 'finding_text', 'operation_oper_note', $note['finding_text'] ?? null);
            $add('Procedures', 'operation_text', 'operation_oper_note', $note['operation_text'] ?? null);
            $add('Post-op Dx', 'post_operative_diag_text', 'operation_oper_note', $note['post_operative_diag_text'] ?? null);
            $add('Anes note', 'pre_anes_operation_note', 'operation_list', $op['pre_anes_operation_note'] ?? null);
            $add('เวลาเริ่ม', 'operation_time_start', 'operation_oper_note', $note['operation_time_start'] ?? null);
            $add('เวลาสิ้นสุด', 'operation_time_end', 'operation_oper_note', $note['operation_time_end'] ?? null);
            $add('แพทย์ผ่าตัด', 'surgeon_doctor_code', 'operation_oper_note', $note['surgeon_doctor_code'] ?? null);
        }

        if (str_starts_with($code, 'ic_') || str_starts_with($code, 'iic_')) {
            $form = $bundle['consent']['form'] ?? [];
            $add('ชื่อในใบยินยอม', 'name', 'patient_consent', trim(($form['pname'] ?? '').($form['fname'] ?? '').' '.($form['lname'] ?? '')));
            $add('HN', 'hn', 'patient_consent', $form['hn'] ?? null);
            $add('VN', 'vn', 'patient_consent', $form['vn'] ?? null);
            $add('Form ID', 'patient_consent_form_id', 'patient_consent', $form['patient_consent_form_id'] ?? null);
            $add('วันที่ยินยอม', 'patient_consent_date', 'patient_consent', $form['patient_consent_date'] ?? null);
            $add('เวลา', 'patient_consent_time', 'patient_consent', $form['patient_consent_time'] ?? null);
            $add('เจ้าหน้าที่', 'officer_staff', 'patient_consent', $form['officer_staff'] ?? null);
            $add('มีลายเซ็น', 'has_sign', 'patient_consent_sign', !empty($bundle['consent']['has_sign']) ? 'ใช่' : 'ไม่');
        }

        // IPD discharge / admit fields
        if (str_starts_with($code, 'dso_') || str_starts_with($code, 'dsd_') || str_starts_with($code, 'ih_') || str_starts_with($code, 'ipe_')) {
            $ipt = $bundle['ipt'] ?? [];
            $add('AN', 'an', 'ipt', $bundle['an'] ?? $ipt['an'] ?? null);
            $add('Admit date', 'regdate', 'ipt', $ipt['regdate'] ?? null);
            $add('Discharge date', 'dchdate', 'ipt', $ipt['dchdate'] ?? null);
            $add('Ward', 'ward', 'ipt', $ipt['ward'] ?? null);
            $add('Admit doctor', 'admdoctor', 'ipt', $ipt['admdoctor'] ?? null);
        }

        // เหลือเฉพาะแถวที่มีค่า หรือแถวสำคัญของข้อนั้น — ถ้าไม่มีเลย แสดงแถว context
        $withValue = array_values(array_filter($rows, fn ($r) => $r['found']));
        if ($withValue !== []) {
            // คง VN/HN ไว้บนสุดเสมอ
            $context = array_values(array_filter($rows, fn ($r) => in_array($r['field'], ['vn', 'hn', 'an', 'er_regist'], true)));
            $merged = [];
            $seen = [];
            foreach (array_merge($context, $withValue) as $row) {
                $key = $row['source'].'|'.$row['field'];
                if (isset($seen[$key])) {
                    continue;
                }
                $seen[$key] = true;
                $merged[] = $row;
            }

            return $merged;
        }

        return array_values(array_filter($rows, fn ($r) => in_array($r['field'], ['vn', 'hn', 'an', 'er_regist'], true)));
    }

    /**
     * @param  array<string, mixed>  $bundle
     * @return array{value: ?string, message: string, evidence_found: bool, source: string}
     */
    public function evidenceFor(string $code, array $bundle): array
    {
        $visit = $bundle['visit'] ?? [];
        $patient = $bundle['patient'] ?? [];
        $screen = $bundle['opdscreen'] ?? [];
        $history = $bundle['patient_history'] ?? [];
        $peVisit = $bundle['pe_visit'] ?? [];
        $er = $bundle['er'] ?? [];
        $vital = $visit['vital_signs'] ?? [];

        $cc = $this->firstText(
            $visit['chief_complaint'] ?? null,
            $screen['cc'] ?? null,
            $screen['symptom'] ?? null,
            $peVisit['chief_complaint'] ?? null
        );
        $hpi = $this->firstText(
            $visit['present_illness'] ?? null,
            $screen['hpi'] ?? null,
            $screen['his_expand'] ?? null,
            $peVisit['present_illness'] ?? null
        );
        $pe = $this->firstText(
            $visit['pe'] ?? null,
            $screen['pe'] ?? null,
            $screen['pe_ga_text'] ?? null
        );
        $pmh = $this->firstText(
            $visit['past_illness'] ?? null,
            $screen['pmh'] ?? null,
            $screen['fh'] ?? null,
            $history['pmh'] ?? null,
            $history['fh'] ?? null,
            $history['chronic_disease_text'] ?? null,
            $peVisit['past_history'] ?? null,
            $peVisit['family_history'] ?? null
        );

        return match (true) {
            $code === 'pp_1' => $this->pack(
                $this->joinNonEmpty([
                    $patient['patient_name'] ?? null,
                    'HN:'.($patient['hn'] ?? '-'),
                    'sex:'.($patient['sex'] ?? '-'),
                    'DOB:'.($patient['birthdate'] ?? $patient['birthday'] ?? '-'),
                    'อายุ:'.($patient['age_text'] ?? $patient['age'] ?? '-'),
                ]),
                'patient'
            ),
            $code === 'pp_2' => $this->pack(
                $this->firstText($patient['full_address'] ?? null, $this->joinNonEmpty([
                    $patient['addrpart'] ?? null,
                    isset($patient['moopart']) ? 'หมู่ '.$patient['moopart'] : null,
                ])),
                'patient.address'
            ),
            $code === 'pp_3' => $this->pack($patient['cid'] ?? null, 'patient.cid'),
            in_array($code, ['pp_4', 'hist_6'], true) => $this->pack(
                $visit['allergy_text'] ?? null,
                'allergy'
            ),
            $code === 'pp_5' => $this->pack(
                $this->joinNonEmpty([
                    $patient['informname'] ?? null,
                    $patient['informrelation'] ?? null,
                    $patient['informtel'] ?? null,
                    $patient['informaddr'] ?? null,
                ]),
                'patient.inform*'
            ),
            $code === 'pp_6' => $this->pack(
                $this->joinNonEmpty([
                    $visit['vstdate'] ?? null,
                    $visit['vsttime'] ?? null,
                    !empty($er['enter_er_time']) ? 'ER:'.$er['enter_er_time'] : null,
                ]),
                'ovst/er_regist'
            ),
            $code === 'pp_7' => $this->pack(
                $this->joinNonEmpty([
                    $patient['patient_name'] ?? null,
                    'HN:'.($patient['hn'] ?? '-'),
                ]),
                'patient (ตรวจทุกหน้าด้วยตนเอง)'
            ),
            $code === 'pp_bonus_blood' => $this->pack(
                $this->joinNonEmpty([
                    $patient['bloodgrp'] ?? null,
                    $patient['bloodgroup_rh'] ?? null,
                ]),
                'patient.bloodgrp'
            ),

            $code === 'hist_1' => $this->pack($this->clip($cc), 'opdscreen.cc'),
            $code === 'hist_2' => $this->pack($this->clip($hpi), 'opdscreen.hpi'),
            $code === 'hist_3' => $this->pack(
                $this->clip($this->firstText($hpi, $screen['help4_note'] ?? null, $history['medication_history_text'] ?? null)),
                'opdscreen.hpi/help4_note'
            ),
            $code === 'hist_4' => $this->pack($this->clip($pmh), 'opdscreen.pmh/fh + patient_history'),
            $code === 'hist_5' => $this->pack(
                $this->joinNonEmpty([
                    isset($screen['menstrual_cycle_type_id']) ? 'menstrual:'.$screen['menstrual_cycle_type_id'] : null,
                    isset($screen['vaccine_screen_type_id']) ? 'vaccine:'.$screen['vaccine_screen_type_id'] : null,
                    isset($screen['development_screen_type_id']) ? 'growth:'.$screen['development_screen_type_id'] : null,
                    $this->clip($history['sh'] ?? null, 80),
                ]),
                'opdscreen menstrual/vaccine/growth + social'
            ),
            $code === 'hist_7' => $this->pack($this->smokingDrinkText($screen, $history, $peVisit), 'smoking/drinking'),
            $code === 'hist_bonus_5w2h' => $this->pack($this->fiveW2HText($screen, $hpi), 'opdscreen.his_* / hpi'),

            $code === 'pe_1' => $this->pack(
                $this->joinNonEmpty([
                    $visit['vstdate'] ?? null,
                    $visit['vsttime'] ?? null,
                    !empty($er['triage_datetime']) ? 'triage:'.$er['triage_datetime'] : null,
                    !empty($er['enter_er_time']) ? 'enter:'.$er['enter_er_time'] : null,
                    !empty($er['doctor_tx_time']) ? 'doctor:'.$er['doctor_tx_time'] : null,
                ]),
                'ovst/er_regist'
            ),
            $code === 'pe_2' => $this->pack(
                $this->clip($this->firstText($pe, $this->peSystemsText($screen, ['pe_ga', 'pe_heent', 'pe_skin', 'pe_ext', 'pe_head']))),
                'opdscreen.pe (ดู/เคาะ)'
            ),
            $code === 'pe_3' => $this->pack(
                $this->clip($this->firstText($pe, $this->peSystemsText($screen, ['pe_heart', 'pe_lung', 'pe_ab', 'pe_chest', 'pe_neuro', 'pe_gi']))),
                'opdscreen.pe (คลำ/ฟัง)'
            ),
            $code === 'pe_4' => $this->pack(
                sprintf(
                    'P:%s R:%s T:%s',
                    $vital['pulse'] ?? $screen['pulse'] ?? $screen['hr'] ?? '-',
                    $vital['respiratory_rate'] ?? $screen['rr'] ?? '-',
                    $vital['temperature'] ?? $screen['temperature'] ?? '-'
                ),
                'opdscreen vitals',
                $this->hasAnyVital($vital, $screen, ['pulse', 'hr', 'rr', 'temperature', 'respiratory_rate'])
            ),
            $code === 'pe_5' => $this->pack(
                sprintf(
                    'BP:%s/%s',
                    $vital['bp_systolic'] ?? $screen['bps'] ?? $screen['bpsys'] ?? '-',
                    $vital['bp_diastolic'] ?? $screen['bpd'] ?? $screen['bpdia'] ?? '-'
                ),
                'opdscreen BP',
                $this->hasAnyVital($vital, $screen, ['bp_systolic', 'bps', 'bpsys'])
            ),
            $code === 'pe_6' => $this->pack(
                sprintf(
                    'BW:%s kg / HT:%s cm',
                    $vital['weight'] ?? $screen['bw'] ?? '-',
                    $vital['height'] ?? $screen['height'] ?? '-'
                ),
                'opdscreen bw/height',
                $this->hasAnyVital($vital, $screen, ['weight', 'bw', 'height'])
            ),
            $code === 'pe_7' || $code === 'ipe_7' => $this->pack(
                $this->clip(
                    $this->joinNonEmpty(array_map(
                        fn ($d) => $d['detail'] ?? null,
                        array_slice($bundle['diagnoses'] ?? [], 0, 5)
                    ), ' | ')
                    ?: $this->joinNonEmpty([
                        $visit['pdx'] ?? null,
                        $visit['pdx_name'] ?? null,
                        $peVisit['provisional_diagnosis'] ?? null,
                    ]),
                    220
                ),
                'ovstdiag',
                count($bundle['diagnoses'] ?? []) > 0 || !empty($visit['pdx'])
            ),
            $code === 'pe_bonus_diagram' => $this->pack(null, 'diagram (ตรวจด้วยตนเอง)'),

            $code === 'tx_1' || $code === 'ipg_6' => $this->pack(
                $this->clip($bundle['lab_summary'] ?? null, 220),
                'lab_order/xray',
                count($bundle['labs'] ?? []) > 0 || ($visit['xray_count'] ?? 0) > 0
            ),
            $code === 'tx_2' => $this->pack(
                $this->clip($bundle['drug_summary'] ?? null, 220),
                'opitemrece/drugitems',
                count($bundle['drugs'] ?? []) > 0
            ),
            $code === 'tx_3' => $this->pack($this->adviceText($screen), 'opdscreen.advice*'),
            $code === 'tx_4' => $this->pack(
                $visit['next_appointment'] ?? null,
                'oapp.nextdate'
            ),
            $code === 'tx_5' || str_starts_with($code, 'ico_') => $this->pack(
                $this->consultText($bundle['consults'] ?? []),
                'doctor_consult'
            ),
            in_array($code, ['tx_6', 'tx_7', 'fu1_9', 'fu2_9', 'fu3_9', 'ih_8', 'ipe_9', 'ipg_8', 'ipg_9'], true) => $this->pack(
                $this->joinNonEmpty([
                    $visit['doctor_name'] ?? null,
                    $visit['doctor_code'] ?? $visit['doctor'] ?? null,
                    !empty($bundle['doctor_sign']['sign_datetime']) ? 'signed:'.$bundle['doctor_sign']['sign_datetime'] : null,
                    ($bundle['ipt']['admdoctor'] ?? null) ? 'adm:'.$bundle['ipt']['admdoctor'] : null,
                ]),
                'ovst.doctor / ovst_doctor_sign / ipt'
            ),

            str_starts_with($code, 'fu1_') || str_starts_with($code, 'fu2_') || str_starts_with($code, 'fu3_')
                => $this->followUpEvidence($code, $bundle, $cc, $hpi, $pe, $pmh, $vital, $screen),

            str_starts_with($code, 'op_') => $this->operationEvidence($code, $bundle),
            str_starts_with($code, 'ic_') || str_starts_with($code, 'iic_') => $this->consentEvidence($code, $bundle),

            // ===== IPD =====
            $code === 'dso_1' => $this->pack(
                $this->joinNonEmpty([
                    $patient['patient_name'] ?? null,
                    'sex:'.($patient['sex'] ?? '-'),
                    'อายุ:'.($patient['age_text'] ?? $patient['age'] ?? '-'),
                ]),
                'patient'
            ),
            $code === 'dso_2' => $this->pack($patient['cid'] ?? null, 'patient.cid'),
            $code === 'dso_3' => $this->pack($patient['full_address'] ?? null, 'patient.address'),
            $code === 'dso_4' => $this->pack(
                $this->joinNonEmpty([
                    'HN:'.($patient['hn'] ?? $bundle['hn'] ?? '-'),
                    'AN:'.($bundle['an'] ?? $bundle['ipt']['an'] ?? '-'),
                ]),
                'patient/ipt',
                !empty($bundle['hn']) && !empty($bundle['an'] ?? $bundle['ipt']['an'] ?? null)
            ),
            $code === 'dso_5' => $this->pack(
                $this->joinNonEmpty([
                    isset($bundle['ipt']['regdate']) ? 'admit:'.$bundle['ipt']['regdate'] : null,
                    isset($bundle['ipt']['dchdate']) ? 'discharge:'.$bundle['ipt']['dchdate'] : null,
                ]),
                'ipt.regdate/dchdate'
            ),
            $code === 'dsd_1' || $code === 'dsd_2' => $this->pack(
                $this->clip(implode(' | ', array_map(fn ($d) => $d['detail'] ?? '', array_slice($bundle['diagnoses'] ?? [], 0, 6))), 220),
                'ovstdiag/iptdiag',
                count($bundle['diagnoses'] ?? []) > 0
            ),
            $code === 'dsd_3' || $code === 'dsd_4' => $this->operationEvidence(
                $code === 'dsd_3' ? 'op_3' : 'op_6',
                $bundle
            ),

            $code === 'ih_1' => $this->pack($this->clip($cc), 'opdscreen.cc'),
            $code === 'ih_2' => $this->pack($this->fiveW2HText($screen, $hpi) ?: $this->clip($hpi), 'opdscreen.hpi/his_*'),
            $code === 'ih_3' => $this->pack($this->clip($this->firstText($hpi, $screen['help4_note'] ?? null)), 'opdscreen.hpi'),
            $code === 'ih_4' => $this->pack($this->clip($pmh), 'opdscreen.pmh/patient_history'),
            $code === 'ih_5' => $this->pack($visit['allergy_text'] ?? null, 'allergy'),
            $code === 'ih_6' => $this->pack(
                $this->joinNonEmpty([
                    isset($screen['menstrual_cycle_type_id']) ? 'menstrual:'.$screen['menstrual_cycle_type_id'] : null,
                    isset($screen['vaccine_screen_type_id']) ? 'vaccine:'.$screen['vaccine_screen_type_id'] : null,
                    $this->clip($history['sh'] ?? null, 80),
                    $this->smokingDrinkText($screen, $history, $peVisit),
                ]),
                'social/family/vaccine'
            ),
            $code === 'ih_7' => $this->pack($this->clip($history['ros'] ?? $screen['pe'] ?? null), 'ROS'),
            $code === 'ih_9' => $this->pack($this->clip($screen['note'] ?? $history['note_text'] ?? null), 'source note'),

            $code === 'ipe_1' => $this->pack(
                sprintf(
                    'T:%s P:%s R:%s BP:%s/%s',
                    $vital['temperature'] ?? $screen['temperature'] ?? '-',
                    $vital['pulse'] ?? $screen['pulse'] ?? '-',
                    $vital['respiratory_rate'] ?? $screen['rr'] ?? '-',
                    $vital['bp_systolic'] ?? $screen['bps'] ?? '-',
                    $vital['bp_diastolic'] ?? $screen['bpd'] ?? '-'
                ),
                'opdscreen vitals',
                $this->hasAnyVital($vital, $screen, ['pulse', 'temperature', 'rr', 'bp_systolic', 'bps'])
            ),
            $code === 'ipe_2' => $this->pack(
                sprintf('BW:%s HT:%s', $vital['weight'] ?? $screen['bw'] ?? '-', $vital['height'] ?? $screen['height'] ?? '-'),
                'opdscreen bw/height',
                $this->hasAnyVital($vital, $screen, ['weight', 'bw'])
            ),
            $code === 'ipe_3' || $code === 'ipe_5' => $this->pack(
                $this->clip($this->firstText($pe, $this->peSystemsText($screen, ['pe_ga', 'pe_heent', 'pe_heart', 'pe_lung', 'pe_ab', 'pe_neuro', 'pe_ext']))),
                'opdscreen.pe'
            ),
            $code === 'ipe_6' => $this->pack($this->clip($peVisit['ascessment_detail'] ?? $screen['note'] ?? null), 'problem list'),
            $code === 'ipe_8' => $this->pack(
                $this->clip($peVisit['plan_of_management'] ?? $screen['note'] ?? null),
                'admit plan'
            ),

            str_starts_with($code, 'ipg_') => $this->pack(
                $this->joinNonEmpty([
                    $this->clip($hpi, 80),
                    $this->clip($pe, 60),
                    count($bundle['drugs'] ?? []) > 0 ? 'drugs:'.count($bundle['drugs']) : null,
                    count($bundle['labs'] ?? []) > 0 ? 'labs:'.count($bundle['labs']) : null,
                    $visit['doctor_name'] ?? null,
                ]),
                'progress/order evidence (บางส่วน)',
                !empty($hpi) || !empty($pe) || count($bundle['drugs'] ?? []) > 0 || count($bundle['labs'] ?? []) > 0
            ),

            default => $this->pack(null, 'ไม่มี mapping อัตโนมัติ / ต้องตรวจเอกสาร'),
        };
    }

    /**
     * @param  array<string, mixed>  $bundle
     * @param  Collection<int, MraCriteria>  $criteria
     * @return array<string, mixed>
     */
    protected function buildCaseMeta(array $bundle, Collection $criteria, ?string $auditType = 'opd'): array
    {
        $isEr = (bool) ($bundle['is_er'] ?? false);
        $isIpd = (bool) ($bundle['is_ipd'] ?? false) || $auditType === 'ipd';
        $hasFu = (bool) ($bundle['has_followup_history'] ?? false);
        $caseType = $isIpd ? 'ipd' : (($hasFu) ? 'chronic_followup' : ($isEr ? 'emergency' : 'general'));

        $minGeneral = (int) config('mra_auto_check_opd.min_score_general_er', 14);
        $minChronic = (int) config('mra_auto_check_opd.min_score_chronic_followup', 18);
        $hint = $caseType === 'chronic_followup' ? $minChronic : $minGeneral;

        $warnings = [];
        if ($isIpd) {
            $warnings[] = 'IPD — ดึงหลักฐานจาก opdscreen/ipt/ยา/lab; ข้อเอกสารกระดาษยังต้องตรวจเอง';
        }
        if ($isEr) {
            $warnings[] = 'พบใน er_regist — ใช้เกณฑ์ OPD/ER';
        }
        if (!$isIpd && $hasFu) {
            $warnings[] = 'พบ visit ก่อนหน้า — อาจเป็น chronic/follow-up (คะแนนเต็มที่นำมาประเมินควร ≥ '.$minChronic.')';
        } elseif (!$isIpd) {
            $warnings[] = 'General/Emergency: คะแนนเต็มที่นำมาประเมินควร ≥ '.$minGeneral.' ตามคู่มือ MRA';
        }
        $warnings[] = 'พบหลักฐานชัดเจน = ตั้ง「ผ่าน」อัตโนมัติ — แก้ไขคะแนนได้เองทุกเมื่อ';

        return [
            'is_er' => $isEr,
            'is_ipd' => $isIpd,
            'case_type' => $caseType,
            'applicable_max_hint' => $hint,
            'prior_visit_count' => count($bundle['prior_visits'] ?? []),
            'drugs_count' => count($bundle['drugs'] ?? []),
            'labs_count' => count($bundle['labs'] ?? []),
            'diagnoses_count' => count($bundle['diagnoses'] ?? []),
            'has_operation' => !empty($bundle['operation']['list']),
            'has_consent' => !empty($bundle['consent']['form']),
            'mode' => 'evidence_auto_pass',
            'warnings' => $warnings,
            'criteria_total' => $criteria->count(),
        ];
    }

    /**
     * @param  array<string, mixed>  $bundle
     * @param  array<string, mixed>  $vital
     * @param  array<string, mixed>  $screen
     * @return array{value: ?string, message: string, evidence_found: bool}
     */
    protected function followUpEvidence(
        string $code,
        array $bundle,
        ?string $cc,
        ?string $hpi,
        ?string $pe,
        ?string $pmh,
        array $vital,
        array $screen
    ): array {
        $prior = $bundle['prior_visits'] ?? [];
        $priorNote = $prior !== []
            ? 'prior VN: '.implode(', ', array_map(fn ($p) => ($p['vn'] ?? '').'@'.($p['vstdate'] ?? ''), array_slice($prior, 0, 3)))
            : 'ไม่พบ visit ก่อนหน้า';

        $visit = $bundle['visit'] ?? [];
        $suffix = substr($code, -1);

        $value = match ($suffix) {
            '1' => $this->clip($cc),
            '2' => $this->clip($this->firstText($hpi, $pmh)),
            '3' => sprintf(
                'P:%s R:%s T:%s BP:%s/%s PE:%s',
                $vital['pulse'] ?? '-',
                $vital['respiratory_rate'] ?? $screen['rr'] ?? '-',
                $vital['temperature'] ?? '-',
                $vital['bp_systolic'] ?? '-',
                $vital['bp_diastolic'] ?? '-',
                $this->clip($pe, 40) ?? '-'
            ),
            '4' => $this->clip($this->firstText($hpi, $pe, $screen['note'] ?? null)),
            '5' => $bundle['lab_summary'] ?? null,
            '6' => $this->clip($bundle['drug_summary'] ?? null, 120) ?: ((($visit['items_count'] ?? 0) > 0) ? ($visit['items_count'].' รายการ') : null),
            '7' => $this->adviceText($screen),
            '8' => $visit['next_appointment'] ?? null,
            '9' => $this->joinNonEmpty([$visit['doctor_name'] ?? null, $visit['doctor_code'] ?? null]),
            default => null,
        };

        $found = $this->filled($value) || $prior !== [];

        return $this->pack(
            $this->joinNonEmpty([$value, $priorNote]),
            'follow-up evidence (visit ปัจจุบัน + prior)',
            $found && $this->filled($value)
        );
    }

    /**
     * @param  array<string, mixed>  $bundle
     * @return array{value: ?string, message: string, evidence_found: bool}
     */
    protected function operationEvidence(string $code, array $bundle): array
    {
        $op = $bundle['operation']['list'] ?? null;
        $note = $bundle['operation']['note'] ?? null;
        if (!$op) {
            return $this->pack(null, 'ไม่พบ operation_list สำหรับ VN นี้');
        }

        $value = match ($code) {
            'op_1' => $this->joinNonEmpty([
                'HN:'.($op['hn'] ?? '-'),
                'VN:'.($op['vn'] ?? '-'),
                $op['operation_name'] ?? null,
            ]),
            'op_2' => $this->clip($note['finding_text'] ?? $op['operation_note'] ?? null),
            'op_3' => $this->clip($note['operation_text'] ?? $op['operation_name'] ?? null),
            'op_4' => $this->joinNonEmpty([
                isset($op['require_anes']) ? 'require_anes:'.$op['require_anes'] : null,
                $this->clip($op['pre_anes_operation_note'] ?? null, 80),
                $this->clip($op['intra_anes_operation_note'] ?? null, 80),
            ]),
            'op_5' => $this->clip($this->firstText(
                $note['post_operative_diag_text'] ?? null,
                $op['post_diagnosis_text_list'] ?? null,
                $op['provision_diagnosis_text'] ?? null
            )),
            'op_6' => $this->joinNonEmpty([
                $note['operation_date'] ?? $op['operation_date'] ?? null,
                isset($note['operation_time_start']) ? 'start:'.$note['operation_time_start'] : null,
                isset($note['operation_time_end']) ? 'end:'.$note['operation_time_end'] : null,
                isset($op['enter_date']) ? 'enter:'.$op['enter_date'].' '.$op['enter_time'] : null,
                isset($op['leave_date']) ? 'leave:'.$op['leave_date'].' '.$op['leave_time'] : null,
            ]),
            'op_7' => $this->joinNonEmpty([
                $note['surgeon_doctor_code'] ?? null,
                $op['request_doctor'] ?? null,
            ]),
            default => $op['operation_name'] ?? null,
        };

        return $this->pack($value, 'operation_list / operation_oper_note');
    }

    /**
     * @param  array<string, mixed>  $bundle
     * @return array{value: ?string, message: string, evidence_found: bool}
     */
    protected function consentEvidence(string $code, array $bundle): array
    {
        $form = $bundle['consent']['form'] ?? null;
        if (!$form) {
            return $this->pack(null, 'ไม่พบ patient_consent สำหรับ VN/HN นี้');
        }

        $patientName = trim(($form['pname'] ?? '').($form['fname'] ?? '').' '.($form['lname'] ?? ''));
        $value = match ($code) {
            'ic_1', 'iic_1' => $this->joinNonEmpty([
                $patientName,
                'HN:'.($form['hn'] ?? '-'),
                'VN:'.($form['vn'] ?? '-'),
            ]),
            'ic_2', 'ic_3', 'iic_6', 'iic_7', 'iic_8' => isset($form['patient_consent_form_id'])
                ? 'form_id:'.$form['patient_consent_form_id'].' (ตรวจรายละเอียดในเอกสาร)'
                : null,
            'ic_4', 'iic_4', 'iic_5' => isset($form['status_specify'])
                ? 'specify:'.$form['status_specify']
                : (!empty($bundle['consent']['has_sign']) ? 'มีบันทึก consent' : null),
            'ic_5', 'iic_3' => !empty($bundle['consent']['has_sign'])
                ? 'มีลายเซ็นใน patient_consent_sign'
                : 'ไม่พบลายเซ็นอิเล็กทรอนิกส์',
            'ic_6', 'iic_2' => $this->firstText($form['officer_staff'] ?? null, $form['smartcard_staff'] ?? null),
            'ic_7', 'iic_9' => $this->joinNonEmpty([
                $form['patient_consent_date'] ?? null,
                $form['patient_consent_time'] ?? null,
            ]),
            default => $patientName !== '' ? $patientName : 'พบ patient_consent',
        };

        $found = in_array($code, ['ic_5', 'iic_3'], true)
            ? !empty($bundle['consent']['has_sign'])
            : $this->filled($value);

        return $this->pack($value, 'patient_consent', $found);
    }

    /**
     * @return array{value: ?string, message: string, evidence_found: bool, source: string}
     */
    protected function pack(?string $value, string $source, ?bool $found = null): array
    {
        $filled = $found ?? $this->filled($value);

        return [
            'value' => $filled ? $value : null,
            'message' => $filled ? "พบหลักฐาน ({$source})" : "ไม่พบข้อมูลใน HOSxP ({$source})",
            'evidence_found' => $filled,
            'source' => $source,
        ];
    }

    protected function filled(mixed $value): bool
    {
        if ($value === null) {
            return false;
        }
        $text = trim((string) $value);
        if ($text === '' || $text === '-' || $text === 'null') {
            return false;
        }
        // placeholder like P:- R:- T:-
        if (preg_match('/^(P:- R:- T:-|BP:-\/-|BW:- kg \/ HT:- cm)$/', $text)) {
            return false;
        }

        return true;
    }

    protected function firstText(mixed ...$values): ?string
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

    /**
     * @param  list<?string>  $parts
     */
    protected function joinNonEmpty(array $parts, string $sep = ' · '): ?string
    {
        $clean = [];
        foreach ($parts as $part) {
            if ($part === null) {
                continue;
            }
            $text = trim((string) $part);
            if ($text !== '' && $text !== '-') {
                $clean[] = $text;
            }
        }

        return $clean === [] ? null : implode($sep, $clean);
    }

    protected function clip(?string $text, int $max = 160): ?string
    {
        return $this->bundleLoader->clip($text, $max);
    }

    /**
     * @param  array<string, mixed>  $screen
     * @param  list<string>  $keys
     */
    protected function peSystemsText(array $screen, array $keys): ?string
    {
        $parts = [];
        foreach ($keys as $key) {
            $flag = $screen[$key] ?? null;
            $textKey = $key.'_text';
            $text = $screen[$textKey] ?? null;
            if ($flag !== null && $flag !== '') {
                $parts[] = $key.'='.$flag.($text ? "({$text})" : '');
            } elseif ($this->filled($text)) {
                $parts[] = $key.':'.$text;
            }
        }

        return $parts === [] ? null : implode('; ', $parts);
    }

    /**
     * @param  array<string, mixed>  $screen
     * @param  array<string, mixed>  $history
     * @param  array<string, mixed>  $peVisit
     */
    protected function smokingDrinkText(array $screen, array $history, array $peVisit): ?string
    {
        return $this->joinNonEmpty([
            isset($screen['smoking_type_id']) ? 'smoking_type:'.$screen['smoking_type_id'] : null,
            isset($screen['drinking_type_id']) ? 'drinking_type:'.$screen['drinking_type_id'] : null,
            isset($history['smoking']) ? 'smoking:'.$history['smoking'] : null,
            isset($history['smoking_roll_perday']) ? 'roll/day:'.$history['smoking_roll_perday'] : null,
            isset($history['drink']) ? 'drink:'.$history['drink'] : null,
            isset($history['drink_glass_perday']) ? 'glass/day:'.$history['drink_glass_perday'] : null,
            $history['smoking_remark'] ?? null,
            $history['drink_remark'] ?? null,
            isset($peVisit['personal_smoking']) ? 'pe_smoking:'.$peVisit['personal_smoking'] : null,
            isset($peVisit['personal_drinking']) ? 'pe_drink:'.$peVisit['personal_drinking'] : null,
        ]);
    }

    /**
     * @param  array<string, mixed>  $screen
     */
    protected function fiveW2HText(array $screen, ?string $hpi): ?string
    {
        $fields = [
            'his_begin_date', 'his_frequency', 'his_severity', 'his_cause',
            'his_expand', 'his_cause_increase', 'his_cause_decrease', 'his_related_sign',
        ];
        $parts = [];
        $filled = 0;
        foreach ($fields as $field) {
            if ($this->filled($screen[$field] ?? null)) {
                $filled++;
                $parts[] = $field.'='.$this->clip((string) $screen[$field], 40);
            }
        }

        if ($filled === 0) {
            return $this->clip($hpi);
        }

        return "5W2H fields:{$filled}/8 · ".implode('; ', $parts);
    }

    /**
     * @param  array<string, mixed>  $screen
     */
    protected function adviceText(array $screen): ?string
    {
        $flags = [];
        for ($i = 1; $i <= 8; $i++) {
            $key = 'advice'.$i;
            if (!empty($screen[$key]) && in_array($screen[$key], ['Y', 'y', '1', 1, 'X', 'x'], true)) {
                $flags[] = $key;
            }
        }
        $note = $this->clip($screen['advice7_note'] ?? null, 80);

        return $this->joinNonEmpty([
            $flags !== [] ? implode(',', $flags) : null,
            $note,
        ]);
    }

    /**
     * @param  list<array<string, mixed>>  $consults
     */
    protected function consultText(array $consults): ?string
    {
        if ($consults === []) {
            return null;
        }
        $first = $consults[0];

        return $this->joinNonEmpty([
            'n:'.count($consults),
            isset($first['consult_date']) ? (string) $first['consult_date'] : null,
            $this->clip($first['consult_question'] ?? null, 60),
            $this->clip($first['consult_reply'] ?? null, 60),
        ]);
    }

    /**
     * @param  array<string, mixed>  $vital
     * @param  array<string, mixed>  $screen
     * @param  list<string>  $keys
     */
    protected function hasAnyVital(array $vital, array $screen, array $keys): bool
    {
        foreach ($keys as $key) {
            $v = $vital[$key] ?? $screen[$key] ?? null;
            if ($v !== null && $v !== '' && (float) $v != 0.0) {
                return true;
            }
        }

        return false;
    }
}
