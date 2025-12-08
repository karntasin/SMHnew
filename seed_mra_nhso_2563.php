<?php

/**
 * Script to seed MRA categories and criteria
 * Based on สปสช. standards 2563 (NHSO Medical Record Audit Standards 2020)
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== Seeding MRA Categories and Criteria (สปสช. 2563) ===\n\n";

// Clear existing data
DB::table('mra_audit_details')->delete();
DB::table('mra_criteria')->delete();
DB::table('mra_categories')->delete();

// MRA Categories based on สปสช. 2563 standards
$categories = [
    [
        'id' => 1,
        'code' => 'A',
        'name' => 'ข้อมูลทั่วไปของผู้ป่วย (Patient Identification)',
        'name_en' => 'Patient Identification',
        'description' => 'ความถูกต้องครบถ้วนของข้อมูลประจำตัวผู้ป่วย',
        'weight' => 10,
        'sort_order' => 1,
        'is_active' => true,
    ],
    [
        'id' => 2,
        'code' => 'B',
        'name' => 'ข้อมูลการรักษาพยาบาล (Clinical Information)',
        'name_en' => 'Clinical Information',
        'description' => 'ความถูกต้องครบถ้วนของข้อมูลทางคลินิก',
        'weight' => 30,
        'sort_order' => 2,
        'is_active' => true,
    ],
    [
        'id' => 3,
        'code' => 'C',
        'name' => 'ความสมบูรณ์ของการบันทึก (Documentation Completeness)',
        'name_en' => 'Documentation Completeness',
        'description' => 'ความครบถ้วนสมบูรณ์ของการบันทึกเวชระเบียน',
        'weight' => 25,
        'sort_order' => 3,
        'is_active' => true,
    ],
    [
        'id' => 4,
        'code' => 'D',
        'name' => 'ความถูกต้องของรหัสโรค (Coding Accuracy)',
        'name_en' => 'Coding Accuracy',
        'description' => 'ความถูกต้องของการให้รหัส ICD-10 และ ICD-9-CM',
        'weight' => 25,
        'sort_order' => 4,
        'is_active' => true,
    ],
    [
        'id' => 5,
        'code' => 'E',
        'name' => 'ความสอดคล้องของข้อมูล (Data Consistency)',
        'name_en' => 'Data Consistency',
        'description' => 'ความสอดคล้องกันของข้อมูลในเวชระเบียน',
        'weight' => 10,
        'sort_order' => 5,
        'is_active' => true,
    ],
];

foreach ($categories as $category) {
    DB::table('mra_categories')->insert(array_merge($category, [
        'created_at' => now(),
        'updated_at' => now(),
    ]));
    echo "  ✓ Category: {$category['code']} - {$category['name']}\n";
}

// MRA Criteria based on สปสช. 2563
$criteria = [
    // ========================================
    // A. ข้อมูลทั่วไปของผู้ป่วย (Patient Identification)
    // ========================================
    [
        'mra_category_id' => 1,
        'code' => 'A1',
        'name' => 'เลขประจำตัวผู้ป่วย (HN) ถูกต้องครบถ้วน',
        'name_en' => 'Hospital Number (HN) is correct and complete',
        'description' => 'ตรวจสอบว่า HN ตรงกันทุกหน้าของเวชระเบียน',
        'audit_guide' => 'ตรวจสอบ HN ในทุกแผ่นเอกสาร ต้องตรงกันและอ่านออกชัดเจน',
        'data_type' => 'auto',
        'max_score' => 2,
        'is_required' => true,
        'sort_order' => 1,
    ],
    [
        'mra_category_id' => 1,
        'code' => 'A2',
        'name' => 'ชื่อ-นามสกุล ผู้ป่วยถูกต้องครบถ้วน',
        'name_en' => 'Patient name is correct and complete',
        'description' => 'ชื่อ-นามสกุล ตรงกับบัตรประชาชน',
        'audit_guide' => 'เปรียบเทียบกับเอกสารยืนยันตัวตน ตรวจสอบการสะกดชื่อ',
        'data_type' => 'auto',
        'max_score' => 2,
        'is_required' => true,
        'sort_order' => 2,
    ],
    [
        'mra_category_id' => 1,
        'code' => 'A3',
        'name' => 'เลขประจำตัวประชาชน 13 หลัก ถูกต้อง',
        'name_en' => 'National ID (13 digits) is correct',
        'description' => 'เลขประจำตัวประชาชนครบ 13 หลัก และถูกต้อง',
        'audit_guide' => 'ตรวจสอบความถูกต้องของเลข 13 หลัก ตรงกับบัตรประชาชน',
        'data_type' => 'auto',
        'max_score' => 2,
        'is_required' => true,
        'sort_order' => 3,
    ],
    [
        'mra_category_id' => 1,
        'code' => 'A4',
        'name' => 'วัน เดือน ปีเกิด ถูกต้อง',
        'name_en' => 'Date of birth is correct',
        'description' => 'วันเดือนปีเกิดตรงกับเอกสารยืนยันตัวตน',
        'audit_guide' => 'ตรวจสอบ วัน/เดือน/ปีเกิด ให้ตรงกับบัตรประชาชน',
        'data_type' => 'auto',
        'max_score' => 1,
        'is_required' => true,
        'sort_order' => 4,
    ],
    [
        'mra_category_id' => 1,
        'code' => 'A5',
        'name' => 'เพศ ถูกต้อง',
        'name_en' => 'Gender is correct',
        'description' => 'ระบุเพศถูกต้องตามเอกสารยืนยันตัวตน',
        'audit_guide' => 'ตรวจสอบเพศให้ตรงกับข้อมูลจริง',
        'data_type' => 'auto',
        'max_score' => 1,
        'is_required' => true,
        'sort_order' => 5,
    ],
    [
        'mra_category_id' => 1,
        'code' => 'A6',
        'name' => 'สิทธิการรักษาพยาบาล ถูกต้อง',
        'name_en' => 'Health insurance scheme is correct',
        'description' => 'ระบุสิทธิการรักษาถูกต้องตามที่ตรวจสอบสิทธิ',
        'audit_guide' => 'ตรวจสอบสิทธิจากระบบตรวจสอบสิทธิ สปสช.',
        'data_type' => 'auto',
        'max_score' => 2,
        'is_required' => true,
        'sort_order' => 6,
    ],

    // ========================================
    // B. ข้อมูลการรักษาพยาบาล (Clinical Information)
    // ========================================
    [
        'mra_category_id' => 2,
        'code' => 'B1',
        'name' => 'บันทึกอาการสำคัญ (Chief Complaint)',
        'name_en' => 'Chief complaint is recorded',
        'description' => 'มีการบันทึกอาการสำคัญที่มาพบแพทย์',
        'audit_guide' => 'ตรวจสอบว่ามีการบันทึก CC ที่ชัดเจน ระบุอาการ ระยะเวลา',
        'data_type' => 'auto',
        'max_score' => 3,
        'is_required' => true,
        'sort_order' => 1,
    ],
    [
        'mra_category_id' => 2,
        'code' => 'B2',
        'name' => 'บันทึกประวัติการเจ็บป่วยปัจจุบัน (HPI)',
        'name_en' => 'History of present illness is recorded',
        'description' => 'มีการบันทึกประวัติการเจ็บป่วยปัจจุบันอย่างละเอียด',
        'audit_guide' => 'ตรวจสอบรายละเอียด: onset, duration, character, severity, progression',
        'data_type' => 'manual',
        'max_score' => 3,
        'is_required' => true,
        'sort_order' => 2,
    ],
    [
        'mra_category_id' => 2,
        'code' => 'B3',
        'name' => 'บันทึกประวัติการเจ็บป่วยในอดีต (PMH)',
        'name_en' => 'Past medical history is recorded',
        'description' => 'มีการบันทึกโรคประจำตัว การผ่าตัด การนอนโรงพยาบาล',
        'audit_guide' => 'ตรวจสอบประวัติโรคประจำตัว ยาที่ใช้ประจำ การผ่าตัด',
        'data_type' => 'auto',
        'max_score' => 2,
        'is_required' => true,
        'sort_order' => 3,
    ],
    [
        'mra_category_id' => 2,
        'code' => 'B4',
        'name' => 'บันทึกประวัติการแพ้ยา/อาหาร',
        'name_en' => 'Drug/food allergy history is recorded',
        'description' => 'มีการบันทึกประวัติแพ้ยา/อาหาร หรือระบุว่าไม่แพ้',
        'audit_guide' => 'ต้องระบุชื่อยา/อาหารที่แพ้ และอาการแพ้ หรือระบุ "ไม่มีประวัติแพ้"',
        'data_type' => 'auto',
        'max_score' => 3,
        'is_required' => true,
        'sort_order' => 4,
    ],
    [
        'mra_category_id' => 2,
        'code' => 'B5',
        'name' => 'บันทึกสัญญาณชีพครบถ้วน (Vital Signs)',
        'name_en' => 'Vital signs are completely recorded',
        'description' => 'มีการบันทึก BP, PR, RR, Temp ครบถ้วน',
        'audit_guide' => 'ตรวจสอบ: BP, Pulse, RR, Temperature (อาจรวม SpO2, Pain score)',
        'data_type' => 'auto',
        'max_score' => 2,
        'is_required' => true,
        'sort_order' => 5,
    ],
    [
        'mra_category_id' => 2,
        'code' => 'B6',
        'name' => 'บันทึกการตรวจร่างกาย (Physical Examination)',
        'name_en' => 'Physical examination is recorded',
        'description' => 'มีการบันทึกผลการตรวจร่างกายตามระบบที่เกี่ยวข้อง',
        'audit_guide' => 'ตรวจสอบ PE ตามระบบที่เกี่ยวข้องกับ CC และ Diagnosis',
        'data_type' => 'manual',
        'max_score' => 3,
        'is_required' => true,
        'sort_order' => 6,
    ],
    [
        'mra_category_id' => 2,
        'code' => 'B7',
        'name' => 'บันทึกผลการตรวจทางห้องปฏิบัติการ/รังสี',
        'name_en' => 'Laboratory/Radiology results are recorded',
        'description' => 'มีการบันทึกผล Lab/X-ray ที่เกี่ยวข้อง',
        'audit_guide' => 'ตรวจสอบว่ามีการบันทึกผล Lab/X-ray ที่สั่งตรวจ',
        'data_type' => 'auto',
        'max_score' => 2,
        'is_required' => false,
        'sort_order' => 7,
    ],
    [
        'mra_category_id' => 2,
        'code' => 'B8',
        'name' => 'บันทึกการวินิจฉัยโรคหลัก (Principal Diagnosis)',
        'name_en' => 'Principal diagnosis is recorded',
        'description' => 'มีการบันทึกการวินิจฉัยโรคหลักชัดเจน',
        'audit_guide' => 'ตรวจสอบว่ามี PDx ที่ชัดเจน สอดคล้องกับอาการและการตรวจ',
        'data_type' => 'auto',
        'max_score' => 3,
        'is_required' => true,
        'sort_order' => 8,
    ],
    [
        'mra_category_id' => 2,
        'code' => 'B9',
        'name' => 'บันทึกการวินิจฉัยโรคร่วม (Secondary Diagnosis)',
        'name_en' => 'Secondary diagnosis is recorded (if applicable)',
        'description' => 'มีการบันทึกโรคร่วม/โรคแทรกซ้อน (ถ้ามี)',
        'audit_guide' => 'ตรวจสอบว่าโรคร่วมที่บันทึกมีหลักฐานสนับสนุนในเวชระเบียน',
        'data_type' => 'manual',
        'max_score' => 2,
        'is_required' => false,
        'sort_order' => 9,
    ],
    [
        'mra_category_id' => 2,
        'code' => 'B10',
        'name' => 'บันทึกแผนการรักษา/คำสั่งการรักษา',
        'name_en' => 'Treatment plan is recorded',
        'description' => 'มีการบันทึกแผนการรักษา ยา การนัดตรวจ',
        'audit_guide' => 'ตรวจสอบคำสั่งยา หัตถการ การนัดหมาย คำแนะนำ',
        'data_type' => 'auto',
        'max_score' => 2,
        'is_required' => true,
        'sort_order' => 10,
    ],

    // ========================================
    // C. ความสมบูรณ์ของการบันทึก (Documentation Completeness)
    // ========================================
    [
        'mra_category_id' => 3,
        'code' => 'C1',
        'name' => 'ลายมือชื่อแพทย์ผู้ตรวจ/ผู้รักษา',
        'name_en' => 'Physician signature is present',
        'description' => 'มีลายมือชื่อแพทย์ผู้ตรวจรักษาและอ่านออก',
        'audit_guide' => 'ตรวจสอบลายเซ็นแพทย์ พร้อมรหัสแพทย์หรือชื่อที่อ่านออก',
        'data_type' => 'auto',
        'max_score' => 3,
        'is_required' => true,
        'sort_order' => 1,
    ],
    [
        'mra_category_id' => 3,
        'code' => 'C2',
        'name' => 'วันที่และเวลาที่บันทึก',
        'name_en' => 'Date and time of documentation',
        'description' => 'มีการระบุวันที่และเวลาที่ให้บริการ/บันทึก',
        'audit_guide' => 'ตรวจสอบวันที่ เวลา ในทุกรายการบันทึก',
        'data_type' => 'auto',
        'max_score' => 2,
        'is_required' => true,
        'sort_order' => 2,
    ],
    [
        'mra_category_id' => 3,
        'code' => 'C3',
        'name' => 'ความชัดเจนของลายมือ/ข้อความที่บันทึก',
        'name_en' => 'Legibility of documentation',
        'description' => 'ลายมือและข้อความอ่านออกชัดเจน',
        'audit_guide' => 'ตรวจสอบว่าข้อความอ่านออก ไม่มีคำย่อที่ไม่เป็นมาตรฐาน',
        'data_type' => 'manual',
        'max_score' => 2,
        'is_required' => true,
        'sort_order' => 3,
    ],
    [
        'mra_category_id' => 3,
        'code' => 'C4',
        'name' => 'การแก้ไขข้อความถูกต้องตามหลักการ',
        'name_en' => 'Corrections are made properly',
        'description' => 'การแก้ไขขีดฆ่าเส้นเดียว ลงวันที่ ลายเซ็น',
        'audit_guide' => 'ตรวจสอบการแก้ไข: ขีดฆ่าเส้นเดียว เห็นข้อความเดิม มีลายเซ็นกำกับ',
        'data_type' => 'manual',
        'max_score' => 2,
        'is_required' => false,
        'sort_order' => 4,
    ],
    [
        'mra_category_id' => 3,
        'code' => 'C5',
        'name' => 'ความต่อเนื่องของการบันทึก',
        'name_en' => 'Continuity of documentation',
        'description' => 'มีการบันทึกต่อเนื่องตามลำดับเวลา',
        'audit_guide' => 'ตรวจสอบลำดับเวลาของการบันทึก ไม่มีช่องว่าง',
        'data_type' => 'manual',
        'max_score' => 2,
        'is_required' => true,
        'sort_order' => 5,
    ],
    [
        'mra_category_id' => 3,
        'code' => 'C6',
        'name' => 'บันทึกการให้ข้อมูลและคำแนะนำแก่ผู้ป่วย',
        'name_en' => 'Patient education is documented',
        'description' => 'มีการบันทึกการให้ข้อมูล คำแนะนำ การปฏิบัติตัว',
        'audit_guide' => 'ตรวจสอบบันทึกคำแนะนำ Health Education อาการที่ต้องมาพบแพทย์',
        'data_type' => 'manual',
        'max_score' => 2,
        'is_required' => false,
        'sort_order' => 6,
    ],
    [
        'mra_category_id' => 3,
        'code' => 'C7',
        'name' => 'ใบยินยอมรับการรักษา (Informed Consent)',
        'name_en' => 'Informed consent is documented',
        'description' => 'มีใบยินยอมรับการรักษา/หัตถการ (กรณีที่จำเป็น)',
        'audit_guide' => 'ตรวจสอบใบยินยอมในกรณีหัตถการ การผ่าตัด การรักษาที่มีความเสี่ยง',
        'data_type' => 'manual',
        'max_score' => 2,
        'is_required' => false,
        'sort_order' => 7,
    ],

    // ========================================
    // D. ความถูกต้องของรหัสโรค (Coding Accuracy)
    // ========================================
    [
        'mra_category_id' => 4,
        'code' => 'D1',
        'name' => 'รหัส ICD-10 ของ PDx ถูกต้อง',
        'name_en' => 'ICD-10 code for PDx is correct',
        'description' => 'รหัส ICD-10 ตรงกับการวินิจฉัยโรคหลัก',
        'audit_guide' => 'ตรวจสอบความถูกต้องของรหัสกับ diagnosis ที่ระบุ',
        'data_type' => 'both',
        'max_score' => 5,
        'is_required' => true,
        'sort_order' => 1,
    ],
    [
        'mra_category_id' => 4,
        'code' => 'D2',
        'name' => 'รหัส ICD-10 ของ SDx ถูกต้อง (ถ้ามี)',
        'name_en' => 'ICD-10 codes for SDx are correct',
        'description' => 'รหัส ICD-10 ของโรคร่วมถูกต้อง',
        'audit_guide' => 'ตรวจสอบรหัสโรคร่วมทุกรายการ',
        'data_type' => 'both',
        'max_score' => 3,
        'is_required' => false,
        'sort_order' => 2,
    ],
    [
        'mra_category_id' => 4,
        'code' => 'D3',
        'name' => 'รหัส ICD-9-CM ของหัตถการถูกต้อง (ถ้ามี)',
        'name_en' => 'ICD-9-CM procedure codes are correct',
        'description' => 'รหัสหัตถการตรงกับการทำหัตถการจริง',
        'audit_guide' => 'ตรวจสอบรหัสหัตถการกับบันทึกการทำหัตถการ',
        'data_type' => 'both',
        'max_score' => 3,
        'is_required' => false,
        'sort_order' => 3,
    ],
    [
        'mra_category_id' => 4,
        'code' => 'D4',
        'name' => 'การเลือก PDx ถูกต้องตามหลักเกณฑ์',
        'name_en' => 'PDx selection follows guidelines',
        'description' => 'การเลือกโรคหลักถูกต้องตามหลักเกณฑ์การให้รหัส',
        'audit_guide' => 'ตรวจสอบว่า PDx เป็นสาเหตุหลักของการมารักษา/การนอนโรงพยาบาล',
        'data_type' => 'manual',
        'max_score' => 3,
        'is_required' => true,
        'sort_order' => 4,
    ],
    [
        'mra_category_id' => 4,
        'code' => 'D5',
        'name' => 'ความครบถ้วนของรหัส (ไม่ตกหล่น)',
        'name_en' => 'Coding completeness (no missing codes)',
        'description' => 'รหัสโรคและหัตถการครบถ้วน ไม่ตกหล่น',
        'audit_guide' => 'ตรวจสอบว่าทุกโรค ทุกหัตถการ ได้รับการลงรหัสครบถ้วน',
        'data_type' => 'manual',
        'max_score' => 3,
        'is_required' => true,
        'sort_order' => 5,
    ],
    [
        'mra_category_id' => 4,
        'code' => 'D6',
        'name' => 'ไม่มีการให้รหัสเกินจริง (Upcoding)',
        'name_en' => 'No upcoding present',
        'description' => 'ไม่มีการให้รหัสเกินกว่าที่มีหลักฐานในเวชระเบียน',
        'audit_guide' => 'ตรวจสอบว่าทุกรหัสมีหลักฐานสนับสนุนในเวชระเบียน',
        'data_type' => 'manual',
        'max_score' => 3,
        'is_required' => true,
        'sort_order' => 6,
    ],

    // ========================================
    // E. ความสอดคล้องของข้อมูล (Data Consistency)
    // ========================================
    [
        'mra_category_id' => 5,
        'code' => 'E1',
        'name' => 'ความสอดคล้องระหว่าง CC กับ Diagnosis',
        'name_en' => 'CC is consistent with Diagnosis',
        'description' => 'อาการสำคัญสอดคล้องกับการวินิจฉัย',
        'audit_guide' => 'ตรวจสอบว่า CC นำไปสู่ Diagnosis ได้อย่างสมเหตุสมผล',
        'data_type' => 'manual',
        'max_score' => 2,
        'is_required' => true,
        'sort_order' => 1,
    ],
    [
        'mra_category_id' => 5,
        'code' => 'E2',
        'name' => 'ความสอดคล้องระหว่าง PE กับ Diagnosis',
        'name_en' => 'PE is consistent with Diagnosis',
        'description' => 'ผลตรวจร่างกายสอดคล้องกับการวินิจฉัย',
        'audit_guide' => 'ตรวจสอบว่าผล PE สนับสนุน Diagnosis',
        'data_type' => 'manual',
        'max_score' => 2,
        'is_required' => true,
        'sort_order' => 2,
    ],
    [
        'mra_category_id' => 5,
        'code' => 'E3',
        'name' => 'ความสอดคล้องระหว่าง Diagnosis กับ Treatment',
        'name_en' => 'Diagnosis is consistent with Treatment',
        'description' => 'การวินิจฉัยสอดคล้องกับการรักษาที่ได้รับ',
        'audit_guide' => 'ตรวจสอบว่าการรักษาเหมาะสมกับ Diagnosis',
        'data_type' => 'manual',
        'max_score' => 2,
        'is_required' => true,
        'sort_order' => 3,
    ],
    [
        'mra_category_id' => 5,
        'code' => 'E4',
        'name' => 'ความสอดคล้องระหว่าง Lab/X-ray กับ Diagnosis',
        'name_en' => 'Lab/X-ray results support Diagnosis',
        'description' => 'ผล Lab/X-ray สนับสนุนการวินิจฉัย',
        'audit_guide' => 'ตรวจสอบว่าผลการตรวจสนับสนุน Diagnosis (ถ้ามีการส่งตรวจ)',
        'data_type' => 'manual',
        'max_score' => 2,
        'is_required' => false,
        'sort_order' => 4,
    ],
    [
        'mra_category_id' => 5,
        'code' => 'E5',
        'name' => 'ข้อมูลในเวชระเบียนไม่ขัดแย้งกัน',
        'name_en' => 'No contradictory information in record',
        'description' => 'ข้อมูลในเวชระเบียนสอดคล้องกัน ไม่ขัดแย้ง',
        'audit_guide' => 'ตรวจสอบว่าไม่มีข้อมูลที่ขัดแย้งกันในเวชระเบียน',
        'data_type' => 'manual',
        'max_score' => 2,
        'is_required' => true,
        'sort_order' => 5,
    ],
];

foreach ($criteria as $criterion) {
    DB::table('mra_criteria')->insert(array_merge($criterion, [
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]));
    echo "  ✓ Criteria: {$criterion['code']} - {$criterion['name']}\n";
}

// Calculate total score
$totalScore = array_sum(array_column($criteria, 'max_score'));

echo "\n=== Seeding Complete (สปสช. 2563) ===\n";
echo "Categories: " . count($categories) . "\n";
echo "Criteria: " . count($criteria) . "\n";
echo "Total Max Score: " . $totalScore . " คะแนน\n";
echo "\n✅ Done!\n";
