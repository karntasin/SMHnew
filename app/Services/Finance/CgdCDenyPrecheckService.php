<?php

namespace App\Services\Finance;

use App\Support\Finance\CgdCDenyCodes;
use App\Support\Finance\ClaimScheme;
use Illuminate\Support\Facades\DB;

class CgdCDenyPrecheckService
{
    public function __construct(
        protected readonly CgdHosxpClaimService $hosxpClaims,
    ) {}

    /**
     * ตรวจ Visit สิทธิจ่ายตรง (pttype 12%) ตามวันที่เลือก
     *
     * @return array{
     *   visit_date:string,
     *   hosxp_ready:bool,
     *   summary:array{total:int,red:int,yellow:int,green:int},
     *   visits:list<array<string,mixed>>,
     *   references:list<array{title:string,detail:string}>,
     *   catalog_source:string
     * }
     */
    public function auditDay(string $visitDate): array
    {
        $visitDate = substr($visitDate, 0, 10);
        $ready = $this->hosxpClaims->available();
        if (! $ready) {
            return [
                'visit_date' => $visitDate,
                'hosxp_ready' => false,
                'summary' => ['total' => 0, 'red' => 0, 'yellow' => 0, 'green' => 0],
                'visits' => [],
                'references' => $this->references(),
                'catalog_source' => CgdCDenyCodes::source(),
                'stm_insights' => $this->stmErrorInsights(),
            ];
        }

        $pttypeLike = ClaimScheme::pttypeLike('cgd') ?: '12%';
        $claims = $this->hosxpClaims->fetchClaims($visitDate, $visitDate, $pttypeLike, ['021'], [$visitDate]);
        $vns = array_values(array_filter(array_map(fn ($r) => (string) ($r['vn'] ?? ''), $claims)));
        $dxByVn = $this->loadDiagnoses($vns);
        $itemStats = $this->loadItemStats($vns);
        $patientExtras = $this->loadPatientExtras(array_values(array_unique(array_filter(array_map(
            fn ($r) => (string) ($r['hn'] ?? ''),
            $claims
        )))));
        $authByVn = $this->loadApproveAndProjects($vns, $visitDate);
        $hns = array_values(array_unique(array_filter(array_map(
            fn ($r) => (string) ($r['hn'] ?? ''),
            $claims
        ))));
        $nedByVn = $this->loadNedDrugGaps($vns);
        $bloodByVn = $this->loadBloodTransfusionFlags($vns);
        $priorErrorsByHn = $this->loadPriorStmErrors($hns);
        $stmInsights = $this->stmErrorInsights();

        $visits = [];
        $summary = ['total' => 0, 'red' => 0, 'yellow' => 0, 'green' => 0];

        foreach ($claims as $claim) {
            $vn = (string) ($claim['vn'] ?? '');
            $hn = (string) ($claim['hn'] ?? '');
            $dx = $dxByVn[$vn] ?? ['items' => [], 'has_pdx' => false, 'has_any' => false, 'has_hai' => false, 'icd10s' => []];
            $items = $itemStats[$vn] ?? ['count' => 0, 'zero_qty' => 0];
            $patient = $patientExtras[$hn] ?? [];
            $auth = $authByVn[$vn] ?? $this->emptyAuthBundle();
            $ned = $nedByVn[$vn] ?? ['ned_items' => [], 'missing_reason' => []];
            $blood = $bloodByVn[$vn] ?? ['has_transfusion' => false, 'operations' => []];
            $priorErrors = $priorErrorsByHn[$hn] ?? [];

            $findings = $this->evaluate($claim, $dx, $items, $patient, $auth, $ned, $blood, $priorErrors);
            $severity = $this->worstSeverity($findings);

            $visits[] = [
                'vn' => $vn,
                'hn' => $hn,
                'patient_name' => $claim['patient_name'] ?? null,
                'pid' => $claim['pid'] ?? null,
                'visit_date' => $claim['visit_date'] ?? $visitDate,
                'visit_time' => $claim['visit_time'] ?? null,
                'department' => $claim['department'] ?? null,
                'pttype_label' => $claim['pttype_label'] ?? null,
                'total' => (float) ($claim['total'] ?? 0),
                'diagnoses' => $dx['items'],
                'item_count' => $items['count'],
                'approve' => [
                    'codes' => $auth['codes'],
                    'sources' => $auth['sources'],
                    'auth_datetime' => $auth['auth_datetime'],
                    'in_visit_pttype' => $auth['in_visit_pttype'],
                    'from_edc' => $auth['from_edc'],
                ],
                'projects' => [
                    'visit_project_code' => $auth['project_code'],
                    'visit_project_name' => $auth['project_name'],
                    'fee_schedules' => $auth['fee_schedules'],
                    'item_projects' => $auth['item_projects'],
                ],
                'ned' => [
                    'items' => $ned['ned_items'],
                    'missing_reason' => $ned['missing_reason'],
                ],
                'blood' => $blood,
                'prior_stm_errors' => $priorErrors,
                'severity' => $severity,
                'findings' => $findings,
            ];

            $summary['total']++;
            $summary[$severity]++;
        }

        usort($visits, function (array $a, array $b) {
            $rank = ['red' => 0, 'yellow' => 1, 'green' => 2];

            return ($rank[$a['severity']] ?? 9) <=> ($rank[$b['severity']] ?? 9)
                ?: strcmp((string) $a['hn'], (string) $b['hn']);
        });

        return [
            'visit_date' => $visitDate,
            'hosxp_ready' => true,
            'summary' => $summary,
            'visits' => $visits,
            'references' => $this->references(),
            'catalog_source' => CgdCDenyCodes::source(),
            'stm_insights' => $stmInsights,
        ];
    }

    /**
     * @param  array<string,mixed>  $claim
     * @param  array{items:list<array<string,mixed>>,has_pdx:bool,has_any:bool,has_hai:bool,icd10s:list<string>}  $dx
     * @param  array{count:int,zero_qty:int}  $items
     * @param  array<string,mixed>  $patient
     * @param  array<string,mixed>  $auth
     * @param  array{ned_items:list<array<string,mixed>>,missing_reason:list<array<string,mixed>>}  $ned
     * @param  array{has_transfusion:bool,operations:list<array<string,mixed>>}  $blood
     * @param  list<array{error_code:string,count:int,last_visit_date:?string}>  $priorErrors
     * @return list<array{severity:string,code:?string,title:string,guide:string,field:string}>
     */
    private function evaluate(
        array $claim,
        array $dx,
        array $items,
        array $patient,
        array $auth,
        array $ned,
        array $blood,
        array $priorErrors,
    ): array {
        $findings = [];
        $pid = preg_replace('/\D+/', '', (string) ($claim['pid'] ?? '')) ?? '';
        $total = (float) ($claim['total'] ?? 0);
        $visitDate = substr((string) ($claim['visit_date'] ?? ''), 0, 10);

        if ($pid === '' || strlen($pid) !== 13) {
            $findings[] = $this->finding(
                'red',
                '322',
                'ไม่มี/เลขบัตรประชาชนไม่ครบ 13 หลัก',
                'ตรวจสอบและบันทึกเลขบัตรประชาชน 13 หลักให้ถูกต้องก่อนส่งเบิก (เสี่ยงติด C Deny)',
                'cid'
            );
        }

        if (! $dx['has_any']) {
            $findings[] = $this->finding(
                'red',
                '492',
                'ไม่มีการบันทึกรหัสวินิจฉัยโรค',
                'บันทึกรหัส ICD-10 (อย่างน้อย Principal Dx) ให้ครบก่อนส่งเบิก',
                'diagnosis'
            );
        } elseif (! $dx['has_pdx']) {
            $findings[] = $this->finding(
                'yellow',
                '492',
                'มีรหัสโรคแต่ยังไม่มี Principal Dx (diagtype=1)',
                'กำหนดโรคหลักให้ถูกต้องตามมาตรฐานการบันทึกเวชระเบียน / สปสช. MRA',
                'diagnosis'
            );
        }

        if ($total <= 0) {
            $findings[] = $this->finding(
                'red',
                '301',
                'ไม่มีค่าใช้จ่ายในการรักษา หรือค่ารักษาเป็นศูนย์/ติดลบ',
                CgdCDenyCodes::find('301')['guide'] ?? 'ตรวจสอบการบันทึกค่ารักษาพยาบาลให้ครบถ้วน',
                'charge'
            );
        } elseif ($items['count'] === 0) {
            $findings[] = $this->finding(
                'yellow',
                '302',
                'มียอดค่ารักษาแต่ไม่มีรายละเอียดค่าใช้จ่ายราย Item',
                CgdCDenyCodes::find('302')['guide'] ?? 'บันทึกรายการค่ารักษาแบบละเอียดในหน้าค่ารักษาพยาบาล',
                'charge'
            );
        }

        if ($items['zero_qty'] > 0) {
            $findings[] = $this->finding(
                'yellow',
                '303',
                'มีรายการยา/บริการที่ไม่มีจำนวนที่ใช้หรือขอเบิก',
                CgdCDenyCodes::find('303')['guide'] ?? 'ระบุจำนวนที่ใช้หรือขอเบิกให้ครบ',
                'charge'
            );
        }

        if (trim((string) ($claim['pttype_code'] ?? '')) === '') {
            $findings[] = $this->finding(
                'red',
                null,
                'ไม่ระบุสิทธิการรักษา (pttype)',
                'ตรวจสอบการลงสิทธิ์จ่ายตรงกรมบัญชีกลาง (กลุ่ม 12%) ให้ถูกต้อง',
                'pttype'
            );
        }

        if (empty($patient['birthday'])) {
            $findings[] = $this->finding(
                'yellow',
                null,
                'ไม่ระบุวันเกิดผู้ป่วย',
                'บันทึกวันเกิดในทะเบียนผู้ป่วยให้ครบ เพื่อลดความเสี่ยงข้อมูลไม่สมบูรณ์ตอนส่งเบิก',
                'demographics'
            );
        }

        if ($dx['has_hai']) {
            $findings[] = $this->finding(
                'yellow',
                null,
                'พบรหัสที่เกี่ยวกับภาวะติดเชื้อในโรงพยาบาล / แทรกซ้อนหัตถการ (Y95 หรือ T80–T88)',
                'ตรวจสอบนิยาม HAIs (CAUTI/VAP/SSI/BSI) ตามแนวทาง ICAT และความครบถ้วนของบันทึกทางคลินิก/แล็บก่อนเบิก — รหัส Y95 และกลุ่ม T80–T88 ต้องสอดคล้องกับการวินิจฉัย',
                'hai'
            );
        }

        $this->evaluateApproveAndProjects($findings, $auth, $visitDate);
        $this->evaluateNedReasons($findings, $ned);
        $this->evaluateAnaemiaNeoplasmBlood($findings, $dx, $blood);
        $this->evaluatePriorStmErrors($findings, $priorErrors, $auth, $ned, $dx);

        if ($findings === []) {
            $codes = implode(', ', $auth['codes'] ?? []);
            $note = 'ตรวจตามเกณฑ์จาก C Deny + แพทเทิร์น error จริงใน STM/REP ของหน่วยบริการแล้ว';
            if (($auth['from_edc'] ?? false) && ! ($auth['in_visit_pttype'] ?? false)) {
                $note .= ' — พบรหัสจาก EDC (ควรบันทึกลง visit_pttype.auth_code ให้ตรงก่อนส่ง e-Claim เพื่อกัน C305)';
            }
            $findings[] = $this->finding(
                'green',
                null,
                'ผ่านเกณฑ์เบื้องต้นที่ระบบตรวจได้'.($codes !== '' ? " (Approve: {$codes})" : ''),
                $note,
                'ok'
            );
        }

        return $findings;
    }

    /**
     * @param  list<array{severity:string,code:?string,title:string,guide:string,field:string}>  $findings
     * @param  array<string,mixed>  $auth
     */
    private function evaluateApproveAndProjects(array &$findings, array $auth, string $visitDate): void
    {
        $codes = $auth['codes'] ?? [];
        $hasAny = $codes !== [];

        if (! $hasAny) {
            $findings[] = $this->finding(
                'red',
                '307',
                'ไม่พบเลข Approve Code ในฐานหน่วยบริการ',
                CgdCDenyCodes::find('307')['guide']
                    ?? 'ตรวจสอบ Approve Code จาก EDC / บัตร และบันทึกลงสิทธิ์ Visit ให้ครบก่อนส่งเบิก',
                'approve'
            );
        } else {
            // แพทเทิร์น STM จริง: C305 เป็น error สูงสุด เมื่อมีรหัสใน EDC แต่ไม่ได้บันทึก/ส่งใน e-Claim ให้ตรง
            if (($auth['from_edc'] ?? false) && ! ($auth['in_visit_pttype'] ?? false)) {
                $codeList = implode(', ', $codes);
                $findings[] = $this->finding(
                    'yellow',
                    '305',
                    "มี Approve Code จาก EDC ({$codeList}) แต่ยังไม่บันทึกใน visit_pttype.auth_code",
                    'จากประวัติ STM ของหน่วยบริการ C305 เป็นสาเหตุ Deny หลัก — บันทึกรหัส Approve จาก EDC ลงสิทธิ์ Visit ให้ตรงก่อนส่ง e-Claim',
                    'approve'
                );
            }

            $visitCodes = array_values(array_filter(array_map(
                'strval',
                $auth['visit_pttype_codes'] ?? []
            )));
            $edcCodes = array_values(array_filter(array_map(
                'strval',
                $auth['edc_codes'] ?? []
            )));

            // มีทั้งในสิทธิ์ Visit และ EDC แต่ชุดรหัสไม่ซ้อนกัน → เสี่ยง C305
            if ($visitCodes !== [] && $edcCodes !== []) {
                $overlap = array_intersect(
                    array_map('strtoupper', $visitCodes),
                    array_map('strtoupper', $edcCodes)
                );
                if ($overlap === []) {
                    $findings[] = $this->finding(
                        'yellow',
                        '305',
                        'Approve Code ใน visit_pttype ('.implode(', ', $visitCodes).') ไม่ตรงกับ EDC ('.implode(', ', $edcCodes).')',
                        CgdCDenyCodes::find('305')['guide']
                            ?? 'ตรวจสอบ Approve Code แก้ไขให้ถูกต้องแล้วส่งเข้ามาใหม่อีกครั้ง',
                        'approve'
                    );
                }
            }

            $authDate = $auth['auth_date'] ?? null;
            if (is_string($authDate) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $authDate) === 1
                && preg_match('/^\d{4}-\d{2}-\d{2}$/', $visitDate) === 1) {
                $diff = (int) ((strtotime($authDate) - strtotime($visitDate)) / 86400);
                // คู่มือ C308: OPD ทำในวัน หรือขอวันถัดไปได้เท่านั้น
                if ($diff > 1) {
                    $findings[] = $this->finding(
                        'yellow',
                        '308',
                        "วันที่ออก Approve Code ({$authDate}) หลังวันรับบริการเกิน 1 วัน",
                        CgdCDenyCodes::find('308')['guide']
                            ?? 'การดำเนินการในระบบ EDC ผู้ป่วยนอกให้ดำเนินการภายในวัน หรือกรณีเหลื่อมวันสามารถขอในวันถัดไปเท่านั้น',
                        'approve'
                    );
                } elseif ($diff < 0) {
                    $findings[] = $this->finding(
                        'yellow',
                        '308',
                        "วันที่ Approve Code ({$authDate}) ก่อนวันรับบริการ ({$visitDate})",
                        'ตรวจสอบว่า Approve Code ตรงกับ Visit ที่จะส่งเบิก และไม่ใช้รหัสของวันอื่น',
                        'approve'
                    );
                }
            }
        }

        $projectCode = strtoupper(trim((string) ($auth['project_code'] ?? '')));
        $projectKnown = (bool) ($auth['project_known'] ?? false);
        $itemProjects = $auth['item_projects'] ?? [];
        $feeSchedules = $auth['fee_schedules'] ?? [];

        if ($projectCode !== '') {
            if (! $projectKnown) {
                $findings[] = $this->finding(
                    'yellow',
                    null,
                    "รหัสโครงการพิเศษ {$projectCode} ไม่พบในตาราง nhso_project",
                    'ตรวจสอบรหัสโครงการพิเศษให้ตรงกับที่ สปสช./กรมบัญชีกลางกำหนด แล้วบันทึกใหม่',
                    'project'
                );
            }

            if ($projectCode === 'SCRCOV' && $itemProjects === []) {
                $findings[] = $this->finding(
                    'yellow',
                    '313',
                    'บันทึกรหัสโครงการพิเศษ SCRCOV แต่ไม่พบรายการที่ผูก nhso_project_code',
                    CgdCDenyCodes::find('313')['guide']
                        ?? 'บันทึกรหัสโครงการพิเศษ SCRCOV และรายการ Lab/เก็บตัวอย่างให้ครบ',
                    'project'
                );
            }
        }

        $itemCodes = [];
        foreach ($itemProjects as $ip) {
            $code = strtoupper(trim((string) ($ip['nhso_project_code'] ?? '')));
            if ($code !== '') {
                $itemCodes[$code] = true;
            }
        }
        $itemCodeList = array_keys($itemCodes);

        if ($itemCodeList !== [] && $projectCode === '') {
            $findings[] = $this->finding(
                'yellow',
                '315',
                'มีรายการเบิกที่ผูกโครงการพิเศษ ('.implode(', ', $itemCodeList).') แต่ Visit ยังไม่ระบุ project_code',
                CgdCDenyCodes::find('315')['guide']
                    ?? 'บันทึกรหัสโครงการพิเศษที่ visit_pttype ให้สอดคล้องกับรายการที่เบิก',
                'project'
            );
        }

        if ($projectCode !== '' && $itemCodeList !== [] && ! isset($itemCodes[$projectCode])) {
            $findings[] = $this->finding(
                'yellow',
                '315',
                "รหัสโครงการพิเศษที่ Visit ({$projectCode}) ไม่ตรงกับรายการเบิก (".implode(', ', $itemCodeList).')',
                CgdCDenyCodes::find('315')['guide']
                    ?? 'ตรวจสอบให้รหัสโครงการพิเศษสอดคล้องกับรายการที่เกี่ยวข้อง',
                'project'
            );
        }

        if ($feeSchedules !== [] && $projectCode === '' && $itemCodeList === []) {
            $labels = array_values(array_unique(array_filter(array_map(
                fn ($f) => trim((string) ($f['type_name'] ?? $f['type_code'] ?? '')),
                $feeSchedules
            ))));
            if ($labels !== []) {
                $findings[] = $this->finding(
                    'yellow',
                    null,
                    'พบเงื่อนไข Fee Schedule / โครงการเบิก: '.implode(', ', $labels),
                    'ทบทวนว่าต้องบันทึกรหัสโครงการพิเศษหรือเงื่อนไขเรียกเก็บเพิ่มใน e-Claim หรือไม่',
                    'project'
                );
            }
        }
    }

    /**
     * @return array{severity:string,code:?string,title:string,guide:string,field:string}
     */
    private function finding(string $severity, ?string $code, string $title, string $guide, string $field): array
    {
        if ($code) {
            $meta = CgdCDenyCodes::find($code);
            if ($meta) {
                if ($guide === '' || $guide === ($meta['guide'] ?? null)) {
                    $guide = $meta['guide'] ?: $guide;
                }
                if (! str_contains($title, $code)) {
                    $title = "[C{$code}] {$title}";
                }
            }
        }

        return [
            'severity' => $severity,
            'code' => $code,
            'title' => $title,
            'guide' => $guide,
            'field' => $field,
        ];
    }

    /**
     * @param  list<array{severity:string}>  $findings
     */
    private function worstSeverity(array $findings): string
    {
        foreach (['red', 'yellow', 'green'] as $level) {
            foreach ($findings as $f) {
                if (($f['severity'] ?? '') === $level) {
                    return $level;
                }
            }
        }

        return 'green';
    }

    /**
     * @param  list<string>  $vns
     * @return array<string, array{items:list<array<string,mixed>>,has_pdx:bool,has_any:bool,has_hai:bool,icd10s:list<string>}>
     */
    private function loadDiagnoses(array $vns): array
    {
        $out = [];
        if ($vns === []) {
            return $out;
        }

        try {
            foreach (array_chunk($vns, 200) as $chunk) {
                $rows = DB::connection('hosxp')->table('ovstdiag')
                    ->whereIn('vn', $chunk)
                    ->orderBy('vn')
                    ->orderBy('diagtype')
                    ->get(['vn', 'icd10', 'diagtype']);

                foreach ($rows as $row) {
                    $vn = (string) $row->vn;
                    $icd = strtoupper(trim((string) $row->icd10));
                    $type = (string) $row->diagtype;
                    if (! isset($out[$vn])) {
                        $out[$vn] = ['items' => [], 'has_pdx' => false, 'has_any' => false, 'has_hai' => false, 'icd10s' => []];
                    }
                    $out[$vn]['has_any'] = true;
                    if ($type === '1') {
                        $out[$vn]['has_pdx'] = true;
                    }
                    if ($this->isHaiCode($icd)) {
                        $out[$vn]['has_hai'] = true;
                    }
                    $out[$vn]['icd10s'][] = $icd;
                    $out[$vn]['items'][] = [
                        'icd10' => $icd,
                        'diagtype' => $type,
                        'is_principal' => $type === '1',
                        'is_hai' => $this->isHaiCode($icd),
                    ];
                }
            }
        } catch (\Throwable) {
            return [];
        }

        return $out;
    }

    /**
     * @param  list<string>  $vns
     * @return array<string, array{count:int,zero_qty:int}>
     */
    private function loadItemStats(array $vns): array
    {
        $out = [];
        if ($vns === []) {
            return $out;
        }

        try {
            foreach (array_chunk($vns, 200) as $chunk) {
                $rows = DB::connection('hosxp')->table('opitemrece')
                    ->selectRaw('vn, COUNT(*) AS item_count, SUM(CASE WHEN qty IS NULL OR qty = 0 THEN 1 ELSE 0 END) AS zero_qty')
                    ->whereIn('vn', $chunk)
                    ->groupBy('vn')
                    ->get();

                foreach ($rows as $row) {
                    $out[(string) $row->vn] = [
                        'count' => (int) $row->item_count,
                        'zero_qty' => (int) $row->zero_qty,
                    ];
                }
            }
        } catch (\Throwable) {
            return [];
        }

        return $out;
    }

    /**
     * @param  list<string>  $hns
     * @return array<string, array{birthday:?string,sex:?string}>
     */
    private function loadPatientExtras(array $hns): array
    {
        $out = [];
        if ($hns === []) {
            return $out;
        }

        try {
            foreach (array_chunk($hns, 200) as $chunk) {
                $rows = DB::connection('hosxp')->table('patient')
                    ->whereIn('hn', $chunk)
                    ->get(['hn', 'birthday', 'sex']);

                foreach ($rows as $row) {
                    $out[(string) $row->hn] = [
                        'birthday' => isset($row->birthday) ? (string) $row->birthday : null,
                        'sex' => isset($row->sex) ? (string) $row->sex : null,
                    ];
                }
            }
        } catch (\Throwable) {
            return [];
        }

        return $out;
    }

    /**
     * รวม Approve Code / โครงการพิเศษจากหลายตาราง HOSxP
     *
     * @param  list<string>  $vns
     * @return array<string, array<string,mixed>>
     */
    private function loadApproveAndProjects(array $vns, string $visitDate): array
    {
        $out = [];
        foreach ($vns as $vn) {
            $out[$vn] = $this->emptyAuthBundle();
        }
        if ($vns === []) {
            return $out;
        }

        $projectNames = $this->loadNhsoProjectNames();

        foreach (array_chunk($vns, 200) as $chunk) {
            $this->mergeVisitPttypeAuth($out, $chunk, $projectNames);
            $this->mergeOvstSeqAuth($out, $chunk);
            $this->mergeKtbEdcAuth($out, $chunk);
            $this->mergeNhsoConfirmAuth($out, $chunk);
            $this->mergeNhsoAppAuth($out, $chunk);
            $this->mergeFeeSchedules($out, $chunk);
            $this->mergeItemProjects($out, $chunk, $projectNames);
        }

        foreach ($out as &$bundle) {
            $bundle['codes'] = array_values(array_unique(array_filter($bundle['codes'])));
            sort($bundle['codes']);
            $bundle['visit_pttype_codes'] = array_values(array_unique(array_filter($bundle['visit_pttype_codes'])));
            $bundle['edc_codes'] = array_values(array_unique(array_filter($bundle['edc_codes'])));
            $bundle['sources'] = array_values(array_unique(array_filter($bundle['sources'])));
            if ($bundle['project_code'] !== null && $bundle['project_code'] !== '') {
                $key = strtoupper($bundle['project_code']);
                $bundle['project_known'] = isset($projectNames[$key]);
                $bundle['project_name'] = $projectNames[$key] ?? null;
            }
        }
        unset($bundle);

        return $out;
    }

    /**
     * @return array<string,mixed>
     */
    private function emptyAuthBundle(): array
    {
        return [
            'codes' => [],
            'visit_pttype_codes' => [],
            'edc_codes' => [],
            'sources' => [],
            'auth_datetime' => null,
            'auth_date' => null,
            'in_visit_pttype' => false,
            'from_edc' => false,
            'project_code' => null,
            'project_name' => null,
            'project_known' => false,
            'fee_schedules' => [],
            'item_projects' => [],
        ];
    }

    /**
     * @return array<string,string>
     */
    private function loadNhsoProjectNames(): array
    {
        try {
            $rows = DB::connection('hosxp')->table('nhso_project')->get(['nhso_project_code', 'nhso_project_name']);
            $map = [];
            foreach ($rows as $row) {
                $code = strtoupper(trim((string) $row->nhso_project_code));
                if ($code !== '') {
                    $map[$code] = trim((string) $row->nhso_project_name);
                }
            }

            return $map;
        } catch (\Throwable) {
            return [];
        }
    }

    /**
     * @param  array<string, array<string,mixed>>  $out
     * @param  list<string>  $chunk
     * @param  array<string,string>  $projectNames
     */
    private function mergeVisitPttypeAuth(array &$out, array $chunk, array $projectNames): void
    {
        try {
            $rows = DB::connection('hosxp')->table('visit_pttype')
                ->whereIn('vn', $chunk)
                ->get(['vn', 'pttype', 'auth_code', 'project_code', 'Auth_DateTime', 'claim_code']);

            foreach ($rows as $row) {
                $vn = (string) $row->vn;
                if (! isset($out[$vn])) {
                    continue;
                }
                $auth = trim((string) ($row->auth_code ?? ''));
                if ($auth !== '') {
                    $out[$vn]['codes'][] = $auth;
                    $out[$vn]['visit_pttype_codes'][] = $auth;
                    $out[$vn]['sources'][] = 'visit_pttype.auth_code';
                    $out[$vn]['in_visit_pttype'] = true;
                }
                $claim = trim((string) ($row->claim_code ?? ''));
                if ($claim !== '') {
                    $out[$vn]['codes'][] = $claim;
                    $out[$vn]['visit_pttype_codes'][] = $claim;
                    $out[$vn]['sources'][] = 'visit_pttype.claim_code';
                }
                $dt = $row->Auth_DateTime ?? null;
                if ($dt) {
                    $this->rememberAuthDatetime($out[$vn], (string) $dt);
                }
                $project = strtoupper(trim((string) ($row->project_code ?? '')));
                if ($project !== '' && ($out[$vn]['project_code'] ?? null) === null) {
                    $out[$vn]['project_code'] = $project;
                    $out[$vn]['project_name'] = $projectNames[$project] ?? null;
                    $out[$vn]['project_known'] = isset($projectNames[$project]);
                    $out[$vn]['sources'][] = 'visit_pttype.project_code';
                }
            }
        } catch (\Throwable) {
            // ignore missing table/columns
        }
    }

    /**
     * @param  array<string, array<string,mixed>>  $out
     * @param  list<string>  $chunk
     */
    private function mergeOvstSeqAuth(array &$out, array $chunk): void
    {
        try {
            $rows = DB::connection('hosxp')->table('ovst_seq')
                ->whereIn('vn', $chunk)
                ->get(['vn', 'edc_approve_list_text', 'nhso_fee_schedule_list_text']);

            foreach ($rows as $row) {
                $vn = (string) $row->vn;
                if (! isset($out[$vn])) {
                    continue;
                }
                $text = trim((string) ($row->edc_approve_list_text ?? ''));
                if ($text !== '') {
                    foreach ($this->splitCodes($text) as $code) {
                        $out[$vn]['codes'][] = $code;
                        $out[$vn]['edc_codes'][] = $code;
                    }
                    $out[$vn]['sources'][] = 'ovst_seq.edc_approve_list_text';
                    $out[$vn]['from_edc'] = true;
                }
            }
        } catch (\Throwable) {
            // ignore
        }
    }

    /**
     * @param  array<string, array<string,mixed>>  $out
     * @param  list<string>  $chunk
     */
    private function mergeKtbEdcAuth(array &$out, array $chunk): void
    {
        try {
            $rows = DB::connection('hosxp')->table('ktb_edc_transaction')
                ->whereIn('vn', $chunk)
                ->whereNotNull('approval_code')
                ->whereRaw("TRIM(approval_code) <> ''")
                ->get(['vn', 'approval_code', 'transaction_date', 'transaction_time', 'response_message']);

            foreach ($rows as $row) {
                $vn = (string) $row->vn;
                if (! isset($out[$vn])) {
                    continue;
                }
                $code = trim((string) ($row->approval_code ?? ''));
                if ($code === '') {
                    continue;
                }
                $out[$vn]['codes'][] = $code;
                $out[$vn]['edc_codes'][] = $code;
                $out[$vn]['sources'][] = 'ktb_edc_transaction.approval_code';
                $out[$vn]['from_edc'] = true;

                $ymd = $this->parseYyMmDd((string) ($row->transaction_date ?? ''));
                if ($ymd) {
                    $time = preg_replace('/\D+/', '', (string) ($row->transaction_time ?? '')) ?? '';
                    $his = strlen($time) >= 6
                        ? substr($time, 0, 2).':'.substr($time, 2, 2).':'.substr($time, 4, 2)
                        : '00:00:00';
                    $this->rememberAuthDatetime($out[$vn], $ymd.' '.$his);
                }
            }
        } catch (\Throwable) {
            // ignore
        }
    }

    /**
     * @param  array<string, array<string,mixed>>  $out
     * @param  list<string>  $chunk
     */
    private function mergeNhsoConfirmAuth(array &$out, array $chunk): void
    {
        try {
            $rows = DB::connection('hosxp')->table('nhso_confirm_privilege')
                ->whereIn('vn', $chunk)
                ->get(['vn', 'nhso_authen_code', 'nhso_requst_datetime', 'nhso_response_datetime']);

            foreach ($rows as $row) {
                $vn = (string) $row->vn;
                if (! isset($out[$vn])) {
                    continue;
                }
                $code = trim((string) ($row->nhso_authen_code ?? ''));
                if ($code !== '') {
                    $out[$vn]['codes'][] = $code;
                    $out[$vn]['sources'][] = 'nhso_confirm_privilege.nhso_authen_code';
                }
                $dt = $row->nhso_response_datetime ?? $row->nhso_requst_datetime ?? null;
                if ($dt) {
                    $this->rememberAuthDatetime($out[$vn], (string) $dt);
                }
            }
        } catch (\Throwable) {
            // ignore
        }
    }

    /**
     * @param  array<string, array<string,mixed>>  $out
     * @param  list<string>  $chunk
     */
    private function mergeNhsoAppAuth(array &$out, array $chunk): void
    {
        try {
            $rows = DB::connection('hosxp')->table('nhso_app_transaction')
                ->whereIn('vn', $chunk)
                ->get(['vn', 'ref_ktb_approval_code', 'transaction_datetime', 'confirm_privilege_datetime']);

            foreach ($rows as $row) {
                $vn = (string) $row->vn;
                if (! isset($out[$vn])) {
                    continue;
                }
                $code = trim((string) ($row->ref_ktb_approval_code ?? ''));
                if ($code !== '') {
                    $out[$vn]['codes'][] = $code;
                    $out[$vn]['edc_codes'][] = $code;
                    $out[$vn]['sources'][] = 'nhso_app_transaction.ref_ktb_approval_code';
                    $out[$vn]['from_edc'] = true;
                }
                $dt = $row->confirm_privilege_datetime ?? $row->transaction_datetime ?? null;
                if ($dt) {
                    $this->rememberAuthDatetime($out[$vn], (string) $dt);
                }
            }
        } catch (\Throwable) {
            // ignore
        }
    }

    /**
     * @param  array<string, array<string,mixed>>  $out
     * @param  list<string>  $chunk
     */
    private function mergeFeeSchedules(array &$out, array $chunk): void
    {
        try {
            $rows = DB::connection('hosxp')->table('ovst_fee_schedule as ofs')
                ->leftJoin('nhso_fee_schedule_type as t', 't.nhso_fee_schedule_type_id', '=', 'ofs.nhso_fee_schedule_type_id')
                ->leftJoin('nhso_fee_schedule_sub_type as st', 'st.nhso_fee_schedule_sub_type_id', '=', 'ofs.nhso_fee_schedule_sub_type_id')
                ->whereIn('ofs.vn', $chunk)
                ->get([
                    'ofs.vn',
                    'ofs.nhso_fee_schedule_type_id',
                    't.nhso_fee_schedule_type_code',
                    't.nhso_fee_schedule_type_name',
                    'st.nhso_fee_schedule_sub_type_name',
                ]);

            foreach ($rows as $row) {
                $vn = (string) $row->vn;
                if (! isset($out[$vn])) {
                    continue;
                }
                $out[$vn]['fee_schedules'][] = [
                    'type_id' => $row->nhso_fee_schedule_type_id,
                    'type_code' => $row->nhso_fee_schedule_type_code,
                    'type_name' => $row->nhso_fee_schedule_type_name,
                    'sub_type_name' => $row->nhso_fee_schedule_sub_type_name,
                ];
                $out[$vn]['sources'][] = 'ovst_fee_schedule';
            }
        } catch (\Throwable) {
            // ignore
        }
    }

    /**
     * @param  array<string, array<string,mixed>>  $out
     * @param  list<string>  $chunk
     * @param  array<string,string>  $projectNames
     */
    private function mergeItemProjects(array &$out, array $chunk, array $projectNames): void
    {
        try {
            $rows = DB::connection('hosxp')->table('opitemrece as oi')
                ->join('nondrugitems as nd', 'nd.icode', '=', 'oi.icode')
                ->whereIn('oi.vn', $chunk)
                ->whereNotNull('nd.nhso_project_code')
                ->whereRaw("TRIM(nd.nhso_project_code) <> ''")
                ->get(['oi.vn', 'oi.icode', 'nd.name', 'nd.nhso_project_code', 'oi.qty']);

            foreach ($rows as $row) {
                $vn = (string) $row->vn;
                if (! isset($out[$vn])) {
                    continue;
                }
                $code = strtoupper(trim((string) $row->nhso_project_code));
                $out[$vn]['item_projects'][] = [
                    'icode' => (string) $row->icode,
                    'name' => (string) $row->name,
                    'nhso_project_code' => $code,
                    'nhso_project_name' => $projectNames[$code] ?? null,
                    'qty' => $row->qty,
                ];
                $out[$vn]['sources'][] = 'nondrugitems.nhso_project_code';
            }
        } catch (\Throwable) {
            // ignore
        }
    }

    /**
     * @param  array<string,mixed>  $bundle
     */
    private function rememberAuthDatetime(array &$bundle, string $datetime): void
    {
        $datetime = trim($datetime);
        if ($datetime === '') {
            return;
        }
        $ts = strtotime($datetime);
        if ($ts === false) {
            return;
        }
        $normalized = date('Y-m-d H:i:s', $ts);
        $current = $bundle['auth_datetime'] ?? null;
        if ($current === null || strtotime((string) $current) === false || $ts < strtotime((string) $current)) {
            $bundle['auth_datetime'] = $normalized;
            $bundle['auth_date'] = date('Y-m-d', $ts);
        }
    }

    /**
     * @return list<string>
     */
    private function splitCodes(string $text): array
    {
        $parts = preg_split('/[\s,;|\/]+/', $text) ?: [];
        $out = [];
        foreach ($parts as $part) {
            $code = trim($part);
            if ($code !== '' && preg_match('/^[A-Za-z0-9\-]{4,}$/', $code) === 1) {
                $out[] = $code;
            }
        }

        return $out;
    }

    private function parseYyMmDd(string $raw): ?string
    {
        $raw = preg_replace('/\D+/', '', $raw) ?? '';
        if (strlen($raw) !== 6) {
            return null;
        }
        $yy = (int) substr($raw, 0, 2);
        $mm = (int) substr($raw, 2, 2);
        $dd = (int) substr($raw, 4, 2);
        $year = $yy >= 70 ? 1900 + $yy : 2000 + $yy;
        if (! checkdate($mm, $dd, $year)) {
            return null;
        }

        return sprintf('%04d-%02d-%02d', $year, $mm, $dd);
    }

    private function isHaiCode(string $icd10): bool
    {
        $code = strtoupper(preg_replace('/[^A-Z0-9]/', '', $icd10) ?? '');
        if ($code === '') {
            return false;
        }
        if (str_starts_with($code, 'Y95')) {
            return true;
        }

        // T80–T88 complications of surgical/medical care
        if (preg_match('/^T8[0-8]/', $code) === 1) {
            return true;
        }

        return false;
    }

    /**
     * @param  list<array{severity:string,code:?string,title:string,guide:string,field:string}>  $findings
     * @param  array{ned_items:list<array<string,mixed>>,missing_reason:list<array<string,mixed>>}  $ned
     */
    private function evaluateNedReasons(array &$findings, array $ned): void
    {
        $missing = $ned['missing_reason'] ?? [];
        if ($missing === []) {
            return;
        }

        $labels = [];
        foreach ($missing as $row) {
            $icode = (string) ($row['icode'] ?? '');
            $name = (string) ($row['name'] ?? '');
            $labels[] = $icode.($name !== '' ? " {$name}" : '');
        }
        $sample = implode(', ', array_slice($labels, 0, 4));
        if (count($labels) > 4) {
            $sample .= ' …';
        }

        $findings[] = $this->finding(
            'yellow',
            '565',
            'มียา NED ที่ยังไม่ระบุเหตุผล EA–EF ('.count($missing).' รายการ: '.$sample.')',
            CgdCDenyCodes::find('565')['guide']
                ?? 'กรณีใช้ยานอกบัญชี NED ของผู้ป่วยนอกสิทธิ OFC ต้องระบุเหตุผล EA–EF ใน ovst_presc_ned ก่อนส่งเบิก',
            'ned'
        );
    }

    /**
     * @param  list<array{severity:string,code:?string,title:string,guide:string,field:string}>  $findings
     * @param  array{items:list<array<string,mixed>>,icd10s:list<string>}  $dx
     * @param  array{has_transfusion:bool,operations:list<array<string,mixed>>}  $blood
     */
    private function evaluateAnaemiaNeoplasmBlood(array &$findings, array $dx, array $blood): void
    {
        $hasD630 = false;
        foreach ($dx['icd10s'] ?? [] as $icd) {
            $norm = strtoupper(preg_replace('/[^A-Z0-9]/', '', (string) $icd) ?? '');
            if (str_starts_with($norm, 'D630')) {
                $hasD630 = true;
                break;
            }
        }
        if (! $hasD630) {
            return;
        }

        if (! ($blood['has_transfusion'] ?? false)) {
            $findings[] = $this->finding(
                'yellow',
                '808',
                'พบรหัส D630 (Anaemia in neoplasms) แต่ไม่พบหัตถการให้เลือด',
                CgdCDenyCodes::find('808')['guide']
                    ?? 'กรณีให้รหัส D630 ต้องมีหัตถการให้เลือด หากไม่มีการให้เลือด ให้เลือกประเภทโรครองเป็น Other',
                'blood'
            );
        }
    }

    /**
     * @param  list<array{severity:string,code:?string,title:string,guide:string,field:string}>  $findings
     * @param  list<array{error_code:string,count:int,last_visit_date:?string}>  $priorErrors
     * @param  array<string,mixed>  $auth
     * @param  array{ned_items:list<array<string,mixed>>,missing_reason:list<array<string,mixed>>}  $ned
     * @param  array{icd10s:list<string>}  $dx
     */
    private function evaluatePriorStmErrors(
        array &$findings,
        array $priorErrors,
        array $auth,
        array $ned,
        array $dx,
    ): void {
        if ($priorErrors === []) {
            return;
        }

        $priorCodes = [];
        foreach ($priorErrors as $row) {
            $priorCodes[(string) ($row['error_code'] ?? '')] = $row;
        }

        $hints = [];
        if (isset($priorCodes['305']) || isset($priorCodes['307'])) {
            if (($auth['from_edc'] ?? false) && ! ($auth['in_visit_pttype'] ?? false)) {
                $hints[] = 'เคยติด C305/C307 และวันนี้ยังไม่ลง Approve ใน visit_pttype';
            } elseif (($auth['codes'] ?? []) === []) {
                $hints[] = 'เคยติด C305/C307 และวันนี้ยังไม่พบ Approve Code';
            }
        }
        if (isset($priorCodes['565']) && ($ned['missing_reason'] ?? []) !== []) {
            $hints[] = 'เคยติด C565 และวันนี้มียา NED ที่ยังไม่มีเหตุผล EA–EF';
        }
        if (isset($priorCodes['808'])) {
            foreach ($dx['icd10s'] ?? [] as $icd) {
                $norm = strtoupper(preg_replace('/[^A-Z0-9]/', '', (string) $icd) ?? '');
                if (str_starts_with($norm, 'D630')) {
                    $hints[] = 'เคยติด C808 และวันนี้พบ D630 อีก';
                    break;
                }
            }
        }

        if ($hints === []) {
            return;
        }

        $findings[] = $this->finding(
            'yellow',
            null,
            'ประวัติ STM ซ้ำกับความเสี่ยงวันนี้: '.implode(' · ', $hints),
            'ทบทวนสาเหตุเดิมก่อนส่งเบิก เพื่อไม่ให้ติด C ซ้ำในรอบนี้',
            'history'
        );
    }

    /**
     * @param  list<string>  $vns
     * @return array<string, array{ned_items:list<array<string,mixed>>,missing_reason:list<array<string,mixed>>}>
     */
    private function loadNedDrugGaps(array $vns): array
    {
        $out = [];
        foreach ($vns as $vn) {
            $out[$vn] = ['ned_items' => [], 'missing_reason' => []];
        }
        if ($vns === []) {
            return $out;
        }

        try {
            foreach (array_chunk($vns, 200) as $chunk) {
                $drugs = DB::connection('hosxp')->table('opitemrece as oi')
                    ->join('drugitems as d', 'd.icode', '=', 'oi.icode')
                    ->whereIn('oi.vn', $chunk)
                    ->where(function ($q) {
                        $q->where('d.name', 'like', '%#NED%')
                            ->orWhere('d.name', 'like', '%(NED)%');
                    })
                    ->get(['oi.vn', 'oi.icode', 'd.name', 'oi.qty']);

                $reasons = DB::connection('hosxp')->table('ovst_presc_ned')
                    ->whereIn('vn', $chunk)
                    ->get(['vn', 'icode', 'presc_reason', 'reason_ea', 'reason_eb', 'reason_ec', 'reason_ed', 'reason_ee', 'reason_ef', 'reason_all']);

                $reasonOk = [];
                foreach ($reasons as $row) {
                    $vn = (string) $row->vn;
                    $icode = trim((string) $row->icode);
                    if ($icode === '' || ! $this->hasNedEaEfReason($row)) {
                        continue;
                    }
                    $reasonOk[$vn][$icode] = true;
                }

                foreach ($drugs as $row) {
                    $vn = (string) $row->vn;
                    $item = [
                        'icode' => (string) $row->icode,
                        'name' => (string) $row->name,
                        'qty' => $row->qty,
                    ];
                    $out[$vn]['ned_items'][] = $item;
                    if (! isset($reasonOk[$vn][(string) $row->icode])) {
                        $out[$vn]['missing_reason'][] = $item;
                    }
                }
            }
        } catch (\Throwable) {
            return $out;
        }

        return $out;
    }

    private function hasNedEaEfReason(object $row): bool
    {
        $presc = strtoupper(trim((string) ($row->presc_reason ?? '')));
        if (preg_match('/^E[A-F]$/', $presc) === 1) {
            return true;
        }
        foreach (['reason_ea', 'reason_eb', 'reason_ec', 'reason_ed', 'reason_ee', 'reason_ef'] as $flag) {
            if (strtoupper(trim((string) ($row->{$flag} ?? ''))) === 'Y') {
                return true;
            }
        }
        $all = strtoupper(trim((string) ($row->reason_all ?? '')));

        return $all !== '' && preg_match('/E[A-F]/', $all) === 1;
    }

    /**
     * @param  list<string>  $vns
     * @return array<string, array{has_transfusion:bool,operations:list<array<string,mixed>>}>
     */
    private function loadBloodTransfusionFlags(array $vns): array
    {
        $out = [];
        foreach ($vns as $vn) {
            $out[$vn] = ['has_transfusion' => false, 'operations' => []];
        }
        if ($vns === []) {
            return $out;
        }

        try {
            foreach (array_chunk($vns, 200) as $chunk) {
                $rows = DB::connection('hosxp')->table('doctor_operation as dop')
                    ->leftJoin('er_oper_code as eoc', 'eoc.er_oper_code', '=', 'dop.er_oper_code')
                    ->whereIn('dop.vn', $chunk)
                    ->get([
                        'dop.vn',
                        'dop.icd9',
                        'dop.er_oper_code',
                        'eoc.name as oper_name',
                        'eoc.icd9cm',
                    ]);

                foreach ($rows as $row) {
                    $vn = (string) $row->vn;
                    $icd9 = strtoupper(preg_replace('/[^A-Z0-9]/', '', (string) ($row->icd9 ?? $row->icd9cm ?? '')) ?? '');
                    $name = (string) ($row->oper_name ?? '');
                    $isBlood = str_starts_with($icd9, '990')
                        || str_contains($name, 'ถ่ายเปลี่ยนเลือด')
                        || str_contains(strtolower($name), 'transfus');
                    if (! $isBlood) {
                        continue;
                    }
                    $out[$vn]['has_transfusion'] = true;
                    $out[$vn]['operations'][] = [
                        'icd9' => $row->icd9,
                        'er_oper_code' => $row->er_oper_code,
                        'name' => $name,
                    ];
                }
            }
        } catch (\Throwable) {
            return $out;
        }

        return $out;
    }

    /**
     * @param  list<string>  $hns
     * @return array<string, list<array{error_code:string,count:int,last_visit_date:?string}>>
     */
    private function loadPriorStmErrors(array $hns): array
    {
        $out = [];
        if ($hns === []) {
            return $out;
        }

        try {
            if (! \Illuminate\Support\Facades\Schema::hasTable('finance_cgd_stm_rows')) {
                return $out;
            }

            foreach (array_chunk($hns, 200) as $chunk) {
                $rows = DB::table('finance_cgd_stm_rows')
                    ->selectRaw('hn, error_code, COUNT(*) AS c, MAX(visit_date) AS last_visit_date')
                    ->whereIn('hn', $chunk)
                    ->whereNotNull('error_code')
                    ->where('error_code', '!=', '')
                    ->groupBy('hn', 'error_code')
                    ->orderByDesc('c')
                    ->get();

                foreach ($rows as $row) {
                    $hn = (string) $row->hn;
                    $out[$hn][] = [
                        'error_code' => (string) $row->error_code,
                        'count' => (int) $row->c,
                        'last_visit_date' => $row->last_visit_date ? substr((string) $row->last_visit_date, 0, 10) : null,
                    ];
                }
            }
        } catch (\Throwable) {
            return [];
        }

        return $out;
    }

    /**
     * สรุป error จริงจาก STM ที่นำเข้าแล้ว เพื่ออธิบาย rule ที่ระบบใช้กันซ้ำ
     *
     * @return array{total_error_rows:int,top_codes:list<array{code:string,count:int,description:string,rule:string}>}
     */
    private function stmErrorInsights(): array
    {
        $empty = ['total_error_rows' => 0, 'top_codes' => []];
        try {
            if (! \Illuminate\Support\Facades\Schema::hasTable('finance_cgd_stm_rows')) {
                return $empty;
            }

            $total = (int) DB::table('finance_cgd_stm_rows')
                ->whereNotNull('error_code')
                ->where('error_code', '!=', '')
                ->count();

            $rows = DB::table('finance_cgd_stm_rows')
                ->selectRaw('error_code, COUNT(*) AS c')
                ->whereNotNull('error_code')
                ->where('error_code', '!=', '')
                ->groupBy('error_code')
                ->orderByDesc('c')
                ->limit(8)
                ->get();

            $ruleMap = [
                '305' => 'ตรวจ Approve จาก EDC แล้วบังคับให้ลง visit_pttype.auth_code ให้ตรงก่อนส่ง',
                '307' => 'ถ้าไม่พบ Approve จากทุกแหล่งใน HOSxP ให้ติดแดงทันที',
                '565' => 'ยาชื่อมี #NED ต้องมีเหตุผล EA–EF ใน ovst_presc_ned ครบทุก icode',
                '808' => 'ถ้ามี D630 ต้องมีหัตถการให้เลือด (doctor_operation / er_oper)',
                '562' => 'แจ้งเตือนเชิงประวัติ — ตรวจ Drug Catalog บน drug.nhso.go.th',
                '211' => 'ตรวจ Principal Dx ให้ใช้รหัสที่เข้าเกณฑ์ DRG ได้',
            ];

            $top = [];
            foreach ($rows as $row) {
                $code = (string) $row->error_code;
                $meta = CgdCDenyCodes::find($code);
                $top[] = [
                    'code' => $code,
                    'count' => (int) $row->c,
                    'description' => (string) ($meta['description'] ?? ''),
                    'rule' => $ruleMap[$code] ?? 'ใช้เป็นสัญญาณเตือนจากประวัติ STM ของ HN',
                ];
            }

            return [
                'total_error_rows' => $total,
                'top_codes' => $top,
            ];
        } catch (\Throwable) {
            return $empty;
        }
    }

    /**
     * @return list<array{title:string,detail:string}>
     */
    private function references(): array
    {
        return [
            [
                'title' => 'เรียนรู้จาก error จริงใน STM/REP ของหน่วยบริการ',
                'detail' => 'ระบบวิเคราะห์ finance_cgd_stm_rows.error_code แล้วแปลงเป็น rule กันซ้ำ โดยเฉพาะ C305 (Approve), C565 (NED), C808 (D630+เลือด), C307 (ไม่มี Approve)',
            ],
            [
                'title' => 'รายละเอียดคำอธิบาย C Deny (กรมบัญชีกลาง / e-Claim)',
                'detail' => 'ใช้รหัส Corrective จากไฟล์ “รายละเอียดคำอธิบาย C Deny.xlsx” เป็นเกณฑ์แจ้งสาเหตุและวิธีแก้ไขเมื่อข้อมูลเสี่ยงถูก Deny',
            ],
            [
                'title' => 'แหล่ง Approve Code ใน HOSxP',
                'detail' => 'ดึงจาก visit_pttype.auth_code, ovst_seq.edc_approve_list_text, ktb_edc_transaction.approval_code, nhso_confirm_privilege และ nhso_app_transaction',
            ],
            [
                'title' => 'แหล่งยา NED / หัตถการให้เลือด',
                'detail' => 'ยา NED จากชื่อใน drugitems (#NED) คู่กับ ovst_presc_ned (EA–EF) · หัตถการให้เลือดจาก doctor_operation / er_oper_code',
            ],
            [
                'title' => 'คู่มือตรวจประเมินคุณภาพการบันทึกเวชระเบียน (MRA) — สปสช.',
                'detail' => 'เกณฑ์ความสมบูรณ์บันทึกเวชระเบียนที่ใช้ตรวจการดึงจ่ายชดเชย และความสอดคล้องของรหัสโรค/หัตถการ',
            ],
            [
                'title' => 'ICD-10-TM / ICD-9-CM มาตรฐานประเทศไทย',
                'detail' => 'D630 ต้องคู่กับหัตถการให้เลือด · Y95 และ T80–T88 สำหรับภาวะติดเชื้อในโรงพยาบาล/แทรกซ้อน',
            ],
        ];
    }
}
