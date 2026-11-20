<?php

namespace Database\Seeders;

use App\Models\Rcm\RcmAuditRule;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RcmDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. ลงข้อมูลกฎ 34 ข้อมาตรฐาน และกฎ C-Deny Precheck
        $rules = [
            [
                'rule_code' => 'AUDIT_NO_DX',
                'category' => 'COMMON',
                'name' => 'ยังไม่ได้ลงผลวินิจฉัยโรค (Missing Diagnosis)',
                'description' => 'ผู้ป่วยมารับบริการ มีค่าใช้จ่ายแต่ยังไม่มีการบันทึกรหัสโรค ICD-10',
                'severity' => 'error',
                'fix_instruction' => 'เปิด HOSxP > บันทึกผลวินิจฉัยโรคของผู้ป่วยให้สมบูรณ์',
            ],
            [
                'rule_code' => 'AUDIT_IPD_DX_CONFIRM',
                'category' => 'CIPN',
                'name' => 'ยืนยันการลงผลวินิจฉัยผู้ป่วยใน (IPD Diagnosis Confirmation)',
                'description' => 'ผู้ป่วยในจำหน่ายแล้วแต่ยังไม่มีการยืนยันรหัสโรคโดยแพทย์หรือผู้ให้รหัส',
                'severity' => 'warning',
                'fix_instruction' => 'เปิด HOSxP > ตรวจสอบและกดยืนยันผลการวินิจฉัยในระบบเวชระเบียนผู้ป่วยใน',
            ],
            [
                'rule_code' => 'AUDIT_ADJRW_ZERO',
                'category' => 'CIPN',
                'name' => 'ผู้ป่วยในจำหน่ายแล้วแต่ AdjRW เป็น 0',
                'description' => 'ผู้ป่วยในมี Principal Dx และจำหน่ายแล้ว แต่ค่าน้ำหนักสัมพัทธ์ AdjRW ยังเป็น 0 หรือยังไม่ได้ Run TDRG Grouper',
                'severity' => 'error',
                'fix_instruction' => 'เปิด HOSxP > ระบบผู้ป่วยใน > คำนวณ DRG / Grouper ใหม่เพื่อให้ได้ค่า AdjRW ที่ถูกต้อง',
            ],
            [
                'rule_code' => 'AUDIT_NED_NO_REASON',
                'category' => 'CSOP',
                'name' => 'ยานอกบัญชี (NED) ยังไม่ได้ระบุเหตุผลการใช้ยา',
                'description' => 'มีการสั่งใช้ยานอกบัญชียาหลักแห่งชาติแต่ไม่ระบุรหัสเหตุผลความจำเป็น (ก-จ)',
                'severity' => 'error',
                'fix_instruction' => 'เปิด HOSxP > บันทึกใบสั่งยา > เลือกระบุเหตุผลการสั่งยานอกบัญชี (NED Reason)',
            ],
            [
                'rule_code' => 'AUDIT_TMT_MISSING',
                'category' => 'CSOP',
                'name' => 'ยาไม่มีรหัส TMT 24 หลัก หรือ TMT ไม่สมบูรณ์',
                'description' => 'รายการยาในใบสั่งยายังไม่ได้ผูกรหัสมาตรฐาน TMT 24 หลัก หรือ DID',
                'severity' => 'error',
                'fix_instruction' => 'เปิด HOSxP > คลังยา/ข้อมูลยา > ตรวจสอบและ Mapping รหัส TMT 24 หลักในตาราง drugitems',
            ],
            [
                'rule_code' => 'AUDIT_SEX_DX_MALE_IN_FEMALE',
                'category' => 'COMMON',
                'name' => 'ให้รหัส ICD-10 โรคเฉพาะเพศชายในผู้ป่วยหญิง',
                'description' => 'ตรวจพบรหัสโรคที่กำหนดเฉพาะเพศชาย (เช่น N40 ต่อมลูกหมากโต) ในผู้ป่วยเพศหญิง',
                'severity' => 'error',
                'fix_instruction' => 'เปิด HOSxP > ตรวจสอบและแก้ไขรหัสโรคให้ตรงกับเพศของผู้ป่วย',
            ],
            [
                'rule_code' => 'AUDIT_SEX_DX_FEMALE_IN_MALE',
                'category' => 'COMMON',
                'name' => 'ให้รหัส ICD-10 โรคเฉพาะเพศหญิงในผู้ป่วยชาย',
                'description' => 'ตรวจพบรหัสโรคเฉพาะเพศหญิง (เช่น O00-O99 ภาวะตั้งครรภ์/คลอด, N80) ในผู้ป่วยเพศชาย',
                'severity' => 'error',
                'fix_instruction' => 'เปิด HOSxP > ตรวจสอบและแก้ไขรหัสโรคให้ถูกต้อง',
            ],
            [
                'rule_code' => 'AUDIT_EXT_CAUSE_AS_PDX',
                'category' => 'COMMON',
                'name' => 'ห้ามใช้รหัสสาเหตุภายนอก (V, W, X, Y) เป็นโรคหลัก',
                'description' => 'รหัสหมวด V, W, X, Y เป็นรหัสบอกสาเหตุภายนอก ห้ามลงเป็น Principal Dx เด็ดขาด',
                'severity' => 'error',
                'fix_instruction' => 'เปิด HOSxP > เปลี่ยนโรคหลัก (Principal Dx) เป็นรหัสการบาดเจ็บ (หมวด S หรือ T) และย้ายรหัส V-Y เป็น External Cause',
            ],
            [
                'rule_code' => 'AUDIT_INJURY_NEED_EXT_CAUSE',
                'category' => 'COMMON',
                'name' => 'โรคหลักหมวดบาดเจ็บ (S, T) ต้องมีรหัสสาเหตุภายนอก (V-Y) ร่วมด้วย',
                'description' => 'การให้รหัสการบาดเจ็บ สปสช. และกรมบัญชีกลางกำหนดให้ต้องมีรหัสสาเหตุการบาดเจ็บกำกับเสมอ',
                'severity' => 'warning',
                'fix_instruction' => 'เปิด HOSxP > เพิ่มรหัสสาเหตุภายนอก (V01-Y98) ในส่วนการวินิจฉัยสาเหตุภายนอก',
            ],
            [
                'rule_code' => 'AUDIT_UNACCEPTABLE_PDX',
                'category' => 'COMMON',
                'name' => 'รหัสโรคหลักที่ไม่สมควรใช้ในประเทศไทย (Unacceptable Principal Dx)',
                'description' => 'ตรวจพบรหัสกำกวมหรือรหัสที่ไม่ยอมรับเป็นโรคหลัก เช่น J02.9, L02.9, T14.9, Z76.8',
                'severity' => 'warning',
                'fix_instruction' => 'เปิด HOSxP > ระบุรหัสโรคที่มีความจำเพาะเจาะจงมากขึ้นตามหลักเกณฑ์การให้รหัสโรค',
            ],
            [
                'rule_code' => 'AUDIT_EDC_AUTH_MISSING',
                'category' => 'CSOP',
                'name' => 'ยังไม่มีเลขที่ขออนุมัติเบิกจ่ายตรง (EDC Auth Code)',
                'description' => 'ผู้ป่วยสิทธิเบิกจ่ายตรงยังไม่มีการบันทึกเลข EDC Approval Code ในระบบ',
                'severity' => 'error',
                'fix_instruction' => 'รูดบัตรตรวจสอบสิทธิผ่านเครื่อง EDC หรือบันทึกรหัสอนุมัติในหน้าการเงิน/ห้องบัตร',
            ],
            [
                'rule_code' => 'AUDIT_IPD_AUTH_MISSING',
                'category' => 'CIPN',
                'name' => 'ผู้ป่วยในยังไม่บันทึกเลขที่ขออนุมัติ (IPD Auth Code)',
                'description' => 'ผู้ป่วยในยังไม่มีการบันทึก Auth_Code ในตาราง ipt_pttype',
                'severity' => 'error',
                'fix_instruction' => 'เปิด HOSxP > บันทึกสิทธิผู้ป่วยใน > บันทึกเลขที่ขออนุมัติเบิกจ่ายตรง (Auth Code)',
            ],
            [
                'rule_code' => 'AUDIT_ROOM_RATE_CAP',
                'category' => 'CIPN',
                'name' => 'ค่าห้องและค่าอาหารเกินเพดานที่เบิกได้ตามเกณฑ์กรมบัญชีกลาง',
                'description' => 'ตรวจพบอัตราค่าห้องต่อวันสูงกว่าเกณฑ์ที่กรมบัญชีกลางกำหนดให้เบิกจ่ายตรง',
                'severity' => 'warning',
                'fix_instruction' => 'ตรวจสอบการแยกค่าห้องส่วนเกินเข้าหมวดชำระเอง หรือปรับประเภทห้องพักให้ถูกต้อง',
            ],
            [
                'rule_code' => 'AUDIT_ZERO_AMOUNT',
                'category' => 'COMMON',
                'name' => 'มีประวัติรับบริการแต่มียอดค่าใช้จ่าย 0 บาท',
                'description' => 'ตรวจพบการบันทึก Visit แต่ไม่มียอดค่ารักษาพยาบาลเกิดขึ้น',
                'severity' => 'warning',
                'fix_instruction' => 'ตรวจสอบการบันทึกค่าบริการ หรือดำเนินการยกเลิก Visit หากผู้ป่วยไม่ได้เข้ารับบริการจริง',
            ],
        ];

        foreach ($rules as $rule) {
            RcmAuditRule::updateOrCreate(
                ['rule_code' => $rule['rule_code']],
                $rule
            );
        }

        // 2. เพิ่มเมนู RCM ในตาราง `menus`
        $mainMenu = DB::table('menus')->where('route', 'rcm.dashboard')->first();
        if (! $mainMenu) {
            $parentId = DB::table('menus')->insertGetId([
                'title' => 'ระบบบริหารวงจรรายได้ (RCM)',
                'icon' => 'Coins',
                'route' => 'rcm.dashboard',
                'permission_name' => null, // null = ทุกคนเห็นตาม rule GEMINI.md
                'parent_id' => null,
                'order' => 8,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $submenus = [
                [
                    'title' => 'ภาพรวมและสถิติ RCM',
                    'icon' => 'LayoutDashboard',
                    'route' => 'rcm.dashboard',
                    'permission_name' => null,
                    'parent_id' => $parentId,
                    'order' => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'title' => 'ตรวจก่อนเบิก',
                    'icon' => 'ShieldCheck',
                    'route' => 'rcm.scrubber',
                    'permission_name' => null,
                    'parent_id' => $parentId,
                    'order' => 2,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'title' => 'เรียกเก็บ CSOP ผู้ป่วยนอก',
                    'icon' => 'Pill',
                    'route' => 'rcm.csop.index',
                    'permission_name' => null,
                    'parent_id' => $parentId,
                    'order' => 3,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'title' => 'เรียกเก็บ CIPN ผู้ป่วยใน',
                    'icon' => 'BedDouble',
                    'route' => 'rcm.cipn.index',
                    'permission_name' => null,
                    'parent_id' => $parentId,
                    'order' => 4,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'title' => 'กระทบยอดและอุทธรณ์ STM',
                    'icon' => 'Receipt',
                    'route' => 'rcm.reconcile.index',
                    'permission_name' => null,
                    'parent_id' => $parentId,
                    'order' => 5,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ];

            DB::table('menus')->insert($submenus);
        }
    }
}
