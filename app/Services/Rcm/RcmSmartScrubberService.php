<?php

namespace App\Services\Rcm;

use App\Models\Rcm\RcmAuditRule;
use Illuminate\Support\Facades\DB;

class RcmSmartScrubberService
{
    public function __construct(
        protected readonly RcmHosxpService $hosxpService,
    ) {}

    /**
     * ดำเนินการ Audit คัดกรองเคสผู้ป่วย (ทั้ง OPD และ IPD) และจำแนกไฟเขียว/ส้ม/แดง
     */
    public function auditVisit(array $visit, string $type = 'CSOP'): array
    {
        $findings = [];
        $rules = RcmAuditRule::where('is_active', true)
            ->whereIn('category', [$type, 'COMMON'])
            ->get()
            ->keyBy('rule_code');

        $pdx = strtoupper(trim((string) ($visit['pdx'] ?? '')));
        $sex = trim((string) ($visit['sex'] ?? ''));
        $totalAmount = (float) ($visit['total_amount'] ?? 0);
        $authCode = trim((string) ($visit['auth_code'] ?? ''));

        // 1. ตรวจสอบ Missing Diagnosis
        if (empty($pdx) && isset($rules['AUDIT_NO_DX'])) {
            $findings[] = $this->makeFinding($rules['AUDIT_NO_DX'], 'ยังไม่ได้ลงรหัสผลวินิจฉัยโรคหลัก (Principal Dx)');
        }

        // 2. ตรวจสอบยอดเงิน 0 บาท
        if ($totalAmount <= 0 && isset($rules['AUDIT_ZERO_AMOUNT'])) {
            $findings[] = $this->makeFinding($rules['AUDIT_ZERO_AMOUNT'], 'ค่าใช้จ่ายการรักษาพยาบาลเป็น 0 บาท');
        }

        // 3. ตรวจสอบรหัสสาเหตุภายนอก (V, W, X, Y) มาเป็น Principal Dx
        if (preg_match('/^[VWXY]/', $pdx) && isset($rules['AUDIT_EXT_CAUSE_AS_PDX'])) {
            $findings[] = $this->makeFinding($rules['AUDIT_EXT_CAUSE_AS_PDX'], "ห้ามใช้รหัส {$pdx} เป็น Principal Dx (ต้องเป็นรหัสหมวด S หรือ T เท่านั้น)");
        }

        // 4. ตรวจสอบรหัสโรคขัดแย้งกับเพศ
        if (! empty($sex) && ! empty($pdx)) {
            // เพศหญิง (sex=2 หรือ 'F') ให้โรคชาย (เช่น ต่อมลูกหมาก N40-N51)
            if (($sex === '2' || $sex === 'F') && preg_match('/^N(4[0-9]|5[0-1])/', $pdx) && isset($rules['AUDIT_SEX_DX_MALE_IN_FEMALE'])) {
                $findings[] = $this->makeFinding($rules['AUDIT_SEX_DX_MALE_IN_FEMALE'], "รหัสโรค {$pdx} เป็นโรคเฉพาะเพศชาย แต่ผู้ป่วยเป็นเพศหญิง");
            }
            // เพศชาย (sex=1 หรือ 'M') ให้โรคหญิง (เช่น ภาวะตั้งครรภ์/คลอด O00-O99, มดลูก/รังไข่ N70-N98)
            if (($sex === '1' || $sex === 'M') && (preg_match('/^O[0-9]/', $pdx) || preg_match('/^N(7[0-9]|8[0-9]|9[0-8])/', $pdx)) && isset($rules['AUDIT_SEX_DX_FEMALE_IN_MALE'])) {
                $findings[] = $this->makeFinding($rules['AUDIT_SEX_DX_FEMALE_IN_MALE'], "รหัสโรค {$pdx} เป็นโรคเฉพาะเพศหญิง แต่ผู้ป่วยเป็นเพศชาย");
            }
        }

        // 5. ตรวจสอบ Unacceptable Principal Dx
        $unacceptable = ['J029', 'L029', 'L039', 'D229', 'T07', 'T140', 'T141', 'T142', 'T148', 'T149', 'Z768', 'Z349'];
        $cleanPdx = str_replace('.', '', $pdx);
        if (in_array($cleanPdx, $unacceptable) && isset($rules['AUDIT_UNACCEPTABLE_PDX'])) {
            $findings[] = $this->makeFinding($rules['AUDIT_UNACCEPTABLE_PDX'], "รหัส {$pdx} เป็นรหัสกำกวม ไม่แนะนำให้ใช้เป็นโรคหลักในประเทศไทย");
        }

        // 6. ตรวจสอบเฉพาะ CSOP (OPD)
        if ($type === 'CSOP') {
            if (empty($authCode) && isset($rules['AUDIT_EDC_AUTH_MISSING'])) {
                $findings[] = $this->makeFinding($rules['AUDIT_EDC_AUTH_MISSING'], 'ยังไม่มีเลขที่ขออนุมัติเบิกจ่ายตรง (EDC Approval Code)');
            }

            // ตรวจสอบรายการยา NED และ TMT
            $vn = (string) ($visit['vn'] ?? '');
            if (! empty($vn)) {
                $rxItems = $this->hosxpService->fetchCsopRxItems($vn);
                foreach ($rxItems as $item) {
                    if ($item['ed_ned'] === 'NED' && empty($item['ned_reason']) && isset($rules['AUDIT_NED_NO_REASON'])) {
                        $findings[] = $this->makeFinding(
                            $rules['AUDIT_NED_NO_REASON'],
                            "ยานอกบัญชี (NED): {$item['drug_name']} ({$item['icode']}) ยังไม่ได้ระบุเหตุผลความจำเป็น"
                        );
                    }
                    if (empty($item['tmt_code']) && isset($rules['AUDIT_TMT_MISSING'])) {
                        $findings[] = $this->makeFinding(
                            $rules['AUDIT_TMT_MISSING'],
                            "ยา: {$item['drug_name']} ({$item['icode']}) ไม่มีรหัสมาตรฐาน TMT 24 หลัก"
                        );
                    }
                }
            }
        }

        // 7. ตรวจสอบเฉพาะ CIPN (IPD)
        if ($type === 'CIPN') {
            $adjrw = (float) ($visit['adj_rw'] ?? 0);
            if ($adjrw <= 0 && isset($rules['AUDIT_ADJRW_ZERO'])) {
                $findings[] = $this->makeFinding($rules['AUDIT_ADJRW_ZERO'], 'ผู้ป่วยในจำหน่ายแล้วแต่ AdjRW เป็น 0 (กรุณาประมวลผล Grouper ใน HOSxP)');
            }

            if (empty($authCode) && isset($rules['AUDIT_IPD_AUTH_MISSING'])) {
                $findings[] = $this->makeFinding($rules['AUDIT_IPD_AUTH_MISSING'], 'ยังไม่มีการบันทึกเลขที่ขออนุมัติผู้ป่วยใน (IPD Auth Code) ใน ipt_pttype');
            }

            // ตรวจสอบค่าห้องเกินเพดาน (Room Rate Cap ปกติ 1,000 - 1,500 บาท/วัน ขึ้นกับระเบียบ)
            $roomTotal = (float) ($visit['categories16']['cat01_room'] ?? 0);
            $los = max(1, (int) ($visit['los'] ?? 1));
            $roomRatePerDay = $roomTotal / $los;
            if ($roomRatePerDay > 2500 && isset($rules['AUDIT_ROOM_RATE_CAP'])) {
                $findings[] = $this->makeFinding(
                    $rules['AUDIT_ROOM_RATE_CAP'],
                    "ค่าห้องเฉลี่ยต่อวัน (" . number_format($roomRatePerDay, 2) . " บาท) สูงกว่าเพดานปกติ กรุณาตรวจการแยกค่าห้องส่วนเกิน"
                );
            }
        }

        // ประเมินสถานะรวม: error > warning > pass
        $hasError = false;
        $hasWarning = false;

        foreach ($findings as $f) {
            if ($f['severity'] === 'error') {
                $hasError = true;
            } elseif ($f['severity'] === 'warning') {
                $hasWarning = true;
            }
        }

        $auditStatus = 'pass';
        if ($hasError) {
            $auditStatus = 'error';
        } elseif ($hasWarning) {
            $auditStatus = 'warning';
        }

        return [
            'audit_status' => $auditStatus, // pass (green), warning (yellow), error (red)
            'findings' => $findings,
            'findings_count' => count($findings),
        ];
    }

    private function makeFinding(RcmAuditRule $rule, string $message): array
    {
        return [
            'rule_code' => $rule->rule_code,
            'rule_name' => $rule->name,
            'severity' => $rule->severity,
            'message' => $message,
            'fix_instruction' => $rule->fix_instruction,
        ];
    }
}
