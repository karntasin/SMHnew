<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Mra\MraCategory;
use App\Models\Mra\MraCriteria;

class MraCriteriaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * เกณฑ์การตรวจสอบคุณภาพการบันทึกเวชระเบียน ตามมาตรฐาน สรพ. 2563
     */
    public function run(): void
    {
        // ปิด foreign key check ก่อน truncate
        \DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        MraCriteria::truncate();
        MraCategory::truncate();
        \DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $categories = [
            // หมวดที่ 1: ข้อมูลทั่วไปผู้ป่วย
            [
                'code' => 'CAT01',
                'name' => 'ข้อมูลทั่วไปผู้ป่วย',
                'name_en' => 'Patient Identification',
                'description' => 'การบันทึกข้อมูลระบุตัวตนผู้ป่วย ได้แก่ ชื่อ-สกุล, HN, เลขบัตรประชาชน, วันเกิด, ที่อยู่, สิทธิการรักษา',
                'sort_order' => 1,
                'weight' => 1.00,
                'criteria' => [
                    [
                        'code' => '1.1',
                        'name' => 'ชื่อ-นามสกุล ถูกต้อง ครบถ้วน',
                        'name_en' => 'Patient Name',
                        'audit_guide' => 'ตรวจสอบว่าชื่อ-นามสกุลตรงกับบัตรประชาชน มีคำนำหน้าชื่อ',
                        'hosxp_table' => 'patient',
                        'hosxp_field' => 'pname,fname,lname',
                        'data_type' => 'auto',
                        'max_score' => 1,
                    ],
                    [
                        'code' => '1.2',
                        'name' => 'HN (Hospital Number) ถูกต้อง',
                        'name_en' => 'Hospital Number',
                        'audit_guide' => 'ตรวจสอบว่า HN ถูกต้องตามรูปแบบของโรงพยาบาล',
                        'hosxp_table' => 'patient',
                        'hosxp_field' => 'hn',
                        'data_type' => 'auto',
                        'max_score' => 1,
                    ],
                    [
                        'code' => '1.3',
                        'name' => 'เลขบัตรประชาชน 13 หลัก ถูกต้อง',
                        'name_en' => 'Citizen ID',
                        'audit_guide' => 'ตรวจสอบว่าเลขบัตรประชาชนครบ 13 หลัก และถูกต้อง',
                        'hosxp_table' => 'patient',
                        'hosxp_field' => 'cid',
                        'data_type' => 'auto',
                        'max_score' => 1,
                    ],
                    [
                        'code' => '1.4',
                        'name' => 'วันเดือนปีเกิด ถูกต้อง',
                        'name_en' => 'Date of Birth',
                        'audit_guide' => 'ตรวจสอบว่าวันเกิดสอดคล้องกับอายุและบัตรประชาชน',
                        'hosxp_table' => 'patient',
                        'hosxp_field' => 'birthdate',
                        'data_type' => 'auto',
                        'max_score' => 1,
                    ],
                    [
                        'code' => '1.5',
                        'name' => 'ที่อยู่ ครบถ้วน',
                        'name_en' => 'Address',
                        'audit_guide' => 'ตรวจสอบว่ามีที่อยู่ บ้านเลขที่ ตำบล อำเภอ จังหวัด',
                        'hosxp_table' => 'patient',
                        'hosxp_field' => 'addrpart,mession,road,chwpart,amppart,tmbpart',
                        'data_type' => 'auto',
                        'max_score' => 1,
                    ],
                    [
                        'code' => '1.6',
                        'name' => 'สิทธิการรักษา ถูกต้อง',
                        'name_en' => 'Insurance Type',
                        'audit_guide' => 'ตรวจสอบว่าสิทธิการรักษาถูกต้องตรงกับข้อมูลสิทธิ',
                        'hosxp_table' => 'ovst',
                        'hosxp_field' => 'pttype',
                        'data_type' => 'auto',
                        'max_score' => 1,
                    ],
                ],
            ],

            // หมวดที่ 2: ประวัติการเจ็บป่วย
            [
                'code' => 'CAT02',
                'name' => 'ประวัติการเจ็บป่วย',
                'name_en' => 'History Taking',
                'description' => 'การซักประวัติอาการสำคัญ ประวัติการเจ็บป่วยปัจจุบัน ประวัติโรคประจำตัว ประวัติแพ้ยา',
                'sort_order' => 2,
                'weight' => 1.50,
                'criteria' => [
                    [
                        'code' => '2.1',
                        'name' => 'Chief Complaint (CC) บันทึกอาการสำคัญครบถ้วน',
                        'name_en' => 'Chief Complaint',
                        'audit_guide' => 'ตรวจสอบว่ามีการบันทึกอาการสำคัญที่นำมาพบแพทย์ ระยะเวลา',
                        'hosxp_table' => 'opdscreen',
                        'hosxp_field' => 'cc',
                        'data_type' => 'both',
                        'max_score' => 2,
                    ],
                    [
                        'code' => '2.2',
                        'name' => 'Present Illness (PI) บันทึกประวัติการเจ็บป่วยปัจจุบันครบถ้วน',
                        'name_en' => 'Present Illness',
                        'audit_guide' => 'ตรวจสอบว่ามีการบันทึก Onset, Duration, Location, Quality, Severity, Aggravating/Relieving factors',
                        'hosxp_table' => 'opdscreen',
                        'hosxp_field' => 'symptom',
                        'data_type' => 'both',
                        'max_score' => 2,
                    ],
                    [
                        'code' => '2.3',
                        'name' => 'Past History บันทึกประวัติโรคประจำตัวครบถ้วน',
                        'name_en' => 'Past Medical History',
                        'audit_guide' => 'ตรวจสอบว่ามีการบันทึกโรคประจำตัว โรคเรื้อรัง ประวัติผ่าตัด',
                        'hosxp_table' => null,
                        'hosxp_field' => null,
                        'data_type' => 'manual',
                        'max_score' => 1,
                    ],
                    [
                        'code' => '2.4',
                        'name' => 'ประวัติแพ้ยา/แพ้อาหาร บันทึกครบถ้วน',
                        'name_en' => 'Drug Allergy',
                        'audit_guide' => 'ตรวจสอบว่ามีการบันทึกประวัติแพ้ยา หรือระบุ "ไม่ทราบ" / "ปฏิเสธ"',
                        'hosxp_table' => 'patient',
                        'hosxp_field' => 'drugallergy',
                        'data_type' => 'auto',
                        'max_score' => 1,
                    ],
                    [
                        'code' => '2.5',
                        'name' => 'ประวัติครอบครัว/สังคม (ถ้าเกี่ยวข้อง)',
                        'name_en' => 'Family/Social History',
                        'audit_guide' => 'ตรวจสอบว่ามีการบันทึกประวัติครอบครัวหรือสังคมที่เกี่ยวข้องกับโรค',
                        'hosxp_table' => null,
                        'hosxp_field' => null,
                        'data_type' => 'manual',
                        'max_score' => 1,
                        'is_required' => false,
                    ],
                ],
            ],

            // หมวดที่ 3: การตรวจร่างกาย
            [
                'code' => 'CAT03',
                'name' => 'การตรวจร่างกาย',
                'name_en' => 'Physical Examination',
                'description' => 'การบันทึก Vital Signs และการตรวจร่างกายตามระบบ',
                'sort_order' => 3,
                'weight' => 1.50,
                'criteria' => [
                    [
                        'code' => '3.1',
                        'name' => 'Vital Signs: ความดันโลหิต (BP) บันทึกครบถ้วน',
                        'name_en' => 'Blood Pressure',
                        'audit_guide' => 'ตรวจสอบว่ามีการบันทึก BP ทั้ง systolic และ diastolic',
                        'hosxp_table' => 'opdscreen',
                        'hosxp_field' => 'bpsys,bpdia',
                        'data_type' => 'auto',
                        'max_score' => 1,
                    ],
                    [
                        'code' => '3.2',
                        'name' => 'Vital Signs: ชีพจร (Pulse) บันทึกครบถ้วน',
                        'name_en' => 'Pulse Rate',
                        'audit_guide' => 'ตรวจสอบว่ามีการบันทึกอัตราชีพจร',
                        'hosxp_table' => 'opdscreen',
                        'hosxp_field' => 'pulse',
                        'data_type' => 'auto',
                        'max_score' => 1,
                    ],
                    [
                        'code' => '3.3',
                        'name' => 'Vital Signs: อุณหภูมิ (Temperature) บันทึกครบถ้วน',
                        'name_en' => 'Body Temperature',
                        'audit_guide' => 'ตรวจสอบว่ามีการบันทึกอุณหภูมิร่างกาย',
                        'hosxp_table' => 'opdscreen',
                        'hosxp_field' => 'temperature',
                        'data_type' => 'auto',
                        'max_score' => 1,
                    ],
                    [
                        'code' => '3.4',
                        'name' => 'Vital Signs: อัตราการหายใจ (RR) บันทึกครบถ้วน',
                        'name_en' => 'Respiratory Rate',
                        'audit_guide' => 'ตรวจสอบว่ามีการบันทึกอัตราการหายใจ',
                        'hosxp_table' => 'opdscreen',
                        'hosxp_field' => 'rr',
                        'data_type' => 'auto',
                        'max_score' => 1,
                    ],
                    [
                        'code' => '3.5',
                        'name' => 'น้ำหนัก/ส่วนสูง/BMI บันทึก (ถ้าเกี่ยวข้อง)',
                        'name_en' => 'Weight/Height/BMI',
                        'audit_guide' => 'ตรวจสอบว่ามีการบันทึกน้ำหนัก ส่วนสูง โดยเฉพาะผู้ป่วยโรคเรื้อรัง',
                        'hosxp_table' => 'opdscreen',
                        'hosxp_field' => 'bw,height,bmi',
                        'data_type' => 'auto',
                        'max_score' => 1,
                    ],
                    [
                        'code' => '3.6',
                        'name' => 'การตรวจร่างกายตามระบบสอดคล้องกับอาการสำคัญ',
                        'name_en' => 'Systemic Physical Examination',
                        'audit_guide' => 'ตรวจสอบว่ามีการบันทึกการตรวจร่างกายตามระบบที่เกี่ยวข้องกับ CC',
                        'hosxp_table' => 'opdscreen',
                        'hosxp_field' => 'pe',
                        'data_type' => 'manual',
                        'max_score' => 2,
                    ],
                ],
            ],

            // หมวดที่ 4: การวินิจฉัยโรค
            [
                'code' => 'CAT04',
                'name' => 'การวินิจฉัยโรค',
                'name_en' => 'Diagnosis',
                'description' => 'การบันทึกการวินิจฉัยโรคหลัก โรคร่วม และรหัส ICD-10',
                'sort_order' => 4,
                'weight' => 2.00,
                'criteria' => [
                    [
                        'code' => '4.1',
                        'name' => 'Principal Diagnosis (PDx) บันทึกถูกต้อง ชัดเจน',
                        'name_en' => 'Principal Diagnosis',
                        'audit_guide' => 'ตรวจสอบว่ามีการบันทึกการวินิจฉัยหลักที่ชัดเจน สอดคล้องกับอาการ',
                        'hosxp_table' => 'ovstdiag',
                        'hosxp_field' => 'icd10',
                        'data_type' => 'auto',
                        'max_score' => 2,
                    ],
                    [
                        'code' => '4.2',
                        'name' => 'รหัส ICD-10 ของ PDx ถูกต้อง ตรงกับการวินิจฉัย',
                        'name_en' => 'ICD-10 Code Accuracy',
                        'audit_guide' => 'ตรวจสอบว่ารหัส ICD-10 ตรงกับชื่อการวินิจฉัยที่บันทึก',
                        'hosxp_table' => 'ovstdiag',
                        'hosxp_field' => 'icd10',
                        'data_type' => 'manual',
                        'max_score' => 2,
                    ],
                    [
                        'code' => '4.3',
                        'name' => 'Secondary Diagnosis บันทึกครบถ้วน (ถ้ามี)',
                        'name_en' => 'Secondary Diagnosis',
                        'audit_guide' => 'ตรวจสอบว่ามีการบันทึกโรคร่วม โรคแทรกซ้อนครบถ้วน',
                        'hosxp_table' => 'ovstdiag',
                        'hosxp_field' => 'icd10',
                        'data_type' => 'both',
                        'max_score' => 1,
                        'is_required' => false,
                    ],
                    [
                        'code' => '4.4',
                        'name' => 'การวินิจฉัยสอดคล้องกับ CC, PE และ Investigation',
                        'name_en' => 'Diagnosis Consistency',
                        'audit_guide' => 'ตรวจสอบว่าการวินิจฉัยสอดคล้องกับอาการ การตรวจร่างกาย และผลตรวจ',
                        'hosxp_table' => null,
                        'hosxp_field' => null,
                        'data_type' => 'manual',
                        'max_score' => 2,
                    ],
                ],
            ],

            // หมวดที่ 5: แผนการรักษา
            [
                'code' => 'CAT05',
                'name' => 'แผนการรักษา',
                'name_en' => 'Treatment Plan',
                'description' => 'การบันทึกแผนการรักษา การสั่งยา และการส่งตรวจ',
                'sort_order' => 5,
                'weight' => 1.50,
                'criteria' => [
                    [
                        'code' => '5.1',
                        'name' => 'แผนการรักษาสอดคล้องกับการวินิจฉัย',
                        'name_en' => 'Treatment Plan Appropriateness',
                        'audit_guide' => 'ตรวจสอบว่าแผนการรักษาเหมาะสมกับการวินิจฉัย',
                        'hosxp_table' => null,
                        'hosxp_field' => null,
                        'data_type' => 'manual',
                        'max_score' => 2,
                    ],
                    [
                        'code' => '5.2',
                        'name' => 'การสั่งยาเหมาะสม ครบถ้วน',
                        'name_en' => 'Medication Order',
                        'audit_guide' => 'ตรวจสอบว่ามีการสั่งยาเหมาะสม ระบุชื่อยา ขนาด วิธีใช้ จำนวน',
                        'hosxp_table' => 'opitemrece',
                        'hosxp_field' => 'icode,qty',
                        'data_type' => 'both',
                        'max_score' => 2,
                    ],
                    [
                        'code' => '5.3',
                        'name' => 'การส่งตรวจ Lab เหมาะสม (ถ้ามี)',
                        'name_en' => 'Laboratory Order',
                        'audit_guide' => 'ตรวจสอบว่าการส่งตรวจ Lab สอดคล้องกับการวินิจฉัยและจำเป็น',
                        'hosxp_table' => 'lab_order',
                        'hosxp_field' => 'lab_items_code',
                        'data_type' => 'both',
                        'max_score' => 1,
                        'is_required' => false,
                    ],
                    [
                        'code' => '5.4',
                        'name' => 'การส่งตรวจ X-ray/Special Investigation เหมาะสม (ถ้ามี)',
                        'name_en' => 'X-ray/Special Investigation',
                        'audit_guide' => 'ตรวจสอบว่าการส่งตรวจพิเศษสอดคล้องกับการวินิจฉัย',
                        'hosxp_table' => null,
                        'hosxp_field' => null,
                        'data_type' => 'manual',
                        'max_score' => 1,
                        'is_required' => false,
                    ],
                ],
            ],

            // หมวดที่ 6: Progress Note (สำหรับ IPD หรือ OPD ที่มี Follow-up)
            [
                'code' => 'CAT06',
                'name' => 'บันทึกความก้าวหน้า',
                'name_en' => 'Progress Note',
                'description' => 'การบันทึกความก้าวหน้าการรักษา (สำหรับ IPD หรือ OPD ที่มีการติดตาม)',
                'sort_order' => 6,
                'weight' => 1.00,
                'criteria' => [
                    [
                        'code' => '6.1',
                        'name' => 'บันทึก Progress Note ตามรูปแบบ SOAP',
                        'name_en' => 'SOAP Format',
                        'audit_guide' => 'ตรวจสอบว่ามีการบันทึก Subjective, Objective, Assessment, Plan',
                        'hosxp_table' => null,
                        'hosxp_field' => null,
                        'data_type' => 'manual',
                        'max_score' => 2,
                        'is_required' => false,
                    ],
                    [
                        'code' => '6.2',
                        'name' => 'ความต่อเนื่องของการบันทึก',
                        'name_en' => 'Continuity of Care',
                        'audit_guide' => 'ตรวจสอบว่ามีการบันทึกต่อเนื่องสม่ำเสมอ',
                        'hosxp_table' => null,
                        'hosxp_field' => null,
                        'data_type' => 'manual',
                        'max_score' => 1,
                        'is_required' => false,
                    ],
                ],
            ],

            // หมวดที่ 7: คำสั่งการรักษา
            [
                'code' => 'CAT07',
                'name' => 'คำสั่งการรักษา',
                'name_en' => "Doctor's Order",
                'description' => 'ความชัดเจนของคำสั่งการรักษา',
                'sort_order' => 7,
                'weight' => 1.00,
                'criteria' => [
                    [
                        'code' => '7.1',
                        'name' => 'คำสั่งการรักษาชัดเจน อ่านออก',
                        'name_en' => 'Legibility of Order',
                        'audit_guide' => 'ตรวจสอบว่าคำสั่งการรักษาอ่านออกชัดเจน ไม่คลุมเครือ',
                        'hosxp_table' => null,
                        'hosxp_field' => null,
                        'data_type' => 'manual',
                        'max_score' => 1,
                    ],
                    [
                        'code' => '7.2',
                        'name' => 'คำสั่งยาระบุครบถ้วน (ชื่อ ขนาด วิธี จำนวน)',
                        'name_en' => 'Complete Drug Order',
                        'audit_guide' => 'ตรวจสอบว่าคำสั่งยาระบุครบ: ชื่อยา, ขนาด, วิธีใช้, จำนวน',
                        'hosxp_table' => 'opitemrece',
                        'hosxp_field' => 'icode,qty,drugusage',
                        'data_type' => 'both',
                        'max_score' => 2,
                    ],
                ],
            ],

            // หมวดที่ 8: การลงลายมือชื่อ
            [
                'code' => 'CAT08',
                'name' => 'การลงลายมือชื่อ',
                'name_en' => 'Signature & Authentication',
                'description' => 'การลงลายมือชื่อผู้ให้บริการและการระบุวันเวลา',
                'sort_order' => 8,
                'weight' => 1.00,
                'criteria' => [
                    [
                        'code' => '8.1',
                        'name' => 'ลายมือชื่อแพทย์ครบถ้วน',
                        'name_en' => "Doctor's Signature",
                        'audit_guide' => 'ตรวจสอบว่ามีลายมือชื่อแพทย์ผู้ตรวจรักษาครบทุกจุดที่กำหนด',
                        'hosxp_table' => null,
                        'hosxp_field' => null,
                        'data_type' => 'manual',
                        'max_score' => 1,
                    ],
                    [
                        'code' => '8.2',
                        'name' => 'ระบุวันที่-เวลาบันทึกครบถ้วน',
                        'name_en' => 'Date/Time Documentation',
                        'audit_guide' => 'ตรวจสอบว่ามีการระบุวันที่และเวลาในการบันทึกครบถ้วน',
                        'hosxp_table' => 'ovst',
                        'hosxp_field' => 'vstdate,vsttime',
                        'data_type' => 'auto',
                        'max_score' => 1,
                    ],
                    [
                        'code' => '8.3',
                        'name' => 'เลขใบประกอบวิชาชีพ (ว.) ระบุ',
                        'name_en' => 'Medical License Number',
                        'audit_guide' => 'ตรวจสอบว่ามีการระบุเลขใบประกอบวิชาชีพแพทย์',
                        'hosxp_table' => 'doctor',
                        'hosxp_field' => 'licenseno',
                        'data_type' => 'auto',
                        'max_score' => 1,
                    ],
                ],
            ],

            // หมวดที่ 9: สรุปการรักษา (Discharge Summary) - สำหรับ IPD
            [
                'code' => 'CAT09',
                'name' => 'สรุปการรักษา',
                'name_en' => 'Discharge Summary',
                'description' => 'การบันทึกสรุปการรักษาและคำแนะนำ (สำหรับ IPD)',
                'sort_order' => 9,
                'weight' => 1.50,
                'criteria' => [
                    [
                        'code' => '9.1',
                        'name' => 'สรุปการวินิจฉัยครบถ้วน',
                        'name_en' => 'Final Diagnosis Summary',
                        'audit_guide' => 'ตรวจสอบว่ามีการสรุปการวินิจฉัยครบถ้วน',
                        'hosxp_table' => null,
                        'hosxp_field' => null,
                        'data_type' => 'manual',
                        'max_score' => 1,
                        'is_required' => false,
                    ],
                    [
                        'code' => '9.2',
                        'name' => 'สรุปการรักษาที่ได้รับ',
                        'name_en' => 'Treatment Summary',
                        'audit_guide' => 'ตรวจสอบว่ามีการสรุปการรักษาที่ได้รับระหว่าง admit',
                        'hosxp_table' => null,
                        'hosxp_field' => null,
                        'data_type' => 'manual',
                        'max_score' => 1,
                        'is_required' => false,
                    ],
                    [
                        'code' => '9.3',
                        'name' => 'คำแนะนำการปฏิบัติตัวเมื่อกลับบ้าน',
                        'name_en' => 'Discharge Instructions',
                        'audit_guide' => 'ตรวจสอบว่ามีคำแนะนำการปฏิบัติตัว การรับประทานยา นัดติดตาม',
                        'hosxp_table' => null,
                        'hosxp_field' => null,
                        'data_type' => 'manual',
                        'max_score' => 1,
                        'is_required' => false,
                    ],
                    [
                        'code' => '9.4',
                        'name' => 'วันนัด Follow-up ระบุ',
                        'name_en' => 'Follow-up Appointment',
                        'audit_guide' => 'ตรวจสอบว่ามีการระบุวันนัดติดตามการรักษา',
                        'hosxp_table' => 'oapp',
                        'hosxp_field' => 'nextdate',
                        'data_type' => 'auto',
                        'max_score' => 1,
                        'is_required' => false,
                    ],
                ],
            ],
        ];

        // สร้างข้อมูลในฐานข้อมูล
        foreach ($categories as $categoryData) {
            $criteriaData = $categoryData['criteria'];
            unset($categoryData['criteria']);

            $category = MraCategory::create($categoryData);

            $sortOrder = 1;
            foreach ($criteriaData as $criterion) {
                $criterion['mra_category_id'] = $category->id;
                $criterion['sort_order'] = $sortOrder++;
                $criterion['is_required'] = $criterion['is_required'] ?? true;
                $criterion['is_active'] = true;

                MraCriteria::create($criterion);
            }
        }

        $this->command->info('MRA Criteria seeded successfully!');
        $this->command->info('Total Categories: ' . MraCategory::count());
        $this->command->info('Total Criteria: ' . MraCriteria::count());
    }
}
