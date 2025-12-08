<?php

/**
 * Script to seed MRA categories and criteria
 * Based on สรพ. standards for medical record accuracy
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== Seeding MRA Categories and Criteria ===\n\n";

// Clear existing data
DB::table('mra_audit_details')->delete();
DB::table('mra_criteria')->delete();
DB::table('mra_categories')->delete();

// MRA Categories based on สรพ. standards
$categories = [
    [
        'id' => 1,
        'code' => 'CAT01',
        'name' => 'ข้อมูลทั่วไปผู้ป่วย',
        'name_en' => 'Patient Demographics',
        'description' => 'ความถูกต้องและครบถ้วนของข้อมูลทั่วไปผู้ป่วย',
        'weight' => 10,
        'sort_order' => 1,
        'is_active' => true,
    ],
    [
        'id' => 2,
        'code' => 'CAT02',
        'name' => 'ประวัติการเจ็บป่วย',
        'name_en' => 'History of Present Illness',
        'description' => 'ความครบถ้วนของการบันทึกประวัติการเจ็บป่วย',
        'weight' => 15,
        'sort_order' => 2,
        'is_active' => true,
    ],
    [
        'id' => 3,
        'code' => 'CAT03',
        'name' => 'สัญญาณชีพ',
        'name_en' => 'Vital Signs',
        'description' => 'การบันทึกสัญญาณชีพครบถ้วน',
        'weight' => 10,
        'sort_order' => 3,
        'is_active' => true,
    ],
    [
        'id' => 4,
        'code' => 'CAT04',
        'name' => 'การตรวจร่างกาย',
        'name_en' => 'Physical Examination',
        'description' => 'ความครบถ้วนของการบันทึกการตรวจร่างกาย',
        'weight' => 15,
        'sort_order' => 4,
        'is_active' => true,
    ],
    [
        'id' => 5,
        'code' => 'CAT05',
        'name' => 'การวินิจฉัยโรค',
        'name_en' => 'Diagnosis',
        'description' => 'ความถูกต้องของการวินิจฉัยและรหัส ICD-10',
        'weight' => 20,
        'sort_order' => 5,
        'is_active' => true,
    ],
    [
        'id' => 6,
        'code' => 'CAT06',
        'name' => 'การรักษา',
        'name_en' => 'Treatment',
        'description' => 'ความครบถ้วนของการบันทึกการรักษา',
        'weight' => 15,
        'sort_order' => 6,
        'is_active' => true,
    ],
    [
        'id' => 7,
        'code' => 'CAT07',
        'name' => 'การลงลายมือชื่อ',
        'name_en' => 'Signatures',
        'description' => 'ความครบถ้วนของการลงลายมือชื่อผู้บันทึก',
        'weight' => 10,
        'sort_order' => 7,
        'is_active' => true,
    ],
    [
        'id' => 8,
        'code' => 'CAT08',
        'name' => 'ความทันเวลา',
        'name_en' => 'Timeliness',
        'description' => 'การบันทึกข้อมูลภายในเวลาที่กำหนด',
        'weight' => 5,
        'sort_order' => 8,
        'is_active' => true,
    ],
];

foreach ($categories as $category) {
    DB::table('mra_categories')->insert(array_merge($category, [
        'created_at' => now(),
        'updated_at' => now(),
    ]));
    echo "  ✓ Category: {$category['name']}\n";
}

// MRA Criteria
$criteria = [
    // CAT01 - ข้อมูลทั่วไปผู้ป่วย
    ['mra_category_id' => 1, 'code' => 'C01-01', 'name' => 'HN ถูกต้อง', 'name_en' => 'Correct HN', 'data_type' => 'auto', 'max_score' => 1, 'is_required' => true, 'sort_order' => 1],
    ['mra_category_id' => 1, 'code' => 'C01-02', 'name' => 'ชื่อ-นามสกุล ถูกต้อง', 'name_en' => 'Correct Name', 'data_type' => 'auto', 'max_score' => 1, 'is_required' => true, 'sort_order' => 2],
    ['mra_category_id' => 1, 'code' => 'C01-03', 'name' => 'วันเดือนปีเกิด ถูกต้อง', 'name_en' => 'Correct DOB', 'data_type' => 'auto', 'max_score' => 1, 'is_required' => true, 'sort_order' => 3],
    ['mra_category_id' => 1, 'code' => 'C01-04', 'name' => 'เลขบัตรประชาชน ถูกต้อง', 'name_en' => 'Correct CID', 'data_type' => 'auto', 'max_score' => 1, 'is_required' => true, 'sort_order' => 4],
    ['mra_category_id' => 1, 'code' => 'C01-05', 'name' => 'สิทธิการรักษา ถูกต้อง', 'name_en' => 'Correct Insurance', 'data_type' => 'auto', 'max_score' => 1, 'is_required' => true, 'sort_order' => 5],

    // CAT02 - ประวัติการเจ็บป่วย
    ['mra_category_id' => 2, 'code' => 'C02-01', 'name' => 'บันทึก Chief Complaint', 'name_en' => 'Chief Complaint Recorded', 'data_type' => 'auto', 'max_score' => 2, 'is_required' => true, 'sort_order' => 1, 'audit_guide' => 'ตรวจสอบว่ามีการบันทึกอาการสำคัญที่มา'],
    ['mra_category_id' => 2, 'code' => 'C02-02', 'name' => 'บันทึก Present Illness', 'name_en' => 'HPI Recorded', 'data_type' => 'manual', 'max_score' => 2, 'is_required' => true, 'sort_order' => 2, 'audit_guide' => 'ตรวจสอบว่ามีการบันทึกประวัติการเจ็บป่วยปัจจุบัน'],
    ['mra_category_id' => 2, 'code' => 'C02-03', 'name' => 'บันทึกประวัติโรคประจำตัว', 'name_en' => 'Past History Recorded', 'data_type' => 'auto', 'max_score' => 1, 'is_required' => false, 'sort_order' => 3],
    ['mra_category_id' => 2, 'code' => 'C02-04', 'name' => 'บันทึกประวัติแพ้ยา', 'name_en' => 'Drug Allergy Recorded', 'data_type' => 'auto', 'max_score' => 2, 'is_required' => true, 'sort_order' => 4, 'audit_guide' => 'ตรวจสอบว่ามีการบันทึกประวัติแพ้ยาหรือระบุว่าไม่แพ้'],

    // CAT03 - สัญญาณชีพ
    ['mra_category_id' => 3, 'code' => 'C03-01', 'name' => 'บันทึก Blood Pressure', 'name_en' => 'BP Recorded', 'data_type' => 'auto', 'max_score' => 1, 'is_required' => true, 'sort_order' => 1],
    ['mra_category_id' => 3, 'code' => 'C03-02', 'name' => 'บันทึก Pulse', 'name_en' => 'Pulse Recorded', 'data_type' => 'auto', 'max_score' => 1, 'is_required' => true, 'sort_order' => 2],
    ['mra_category_id' => 3, 'code' => 'C03-03', 'name' => 'บันทึก Temperature', 'name_en' => 'Temp Recorded', 'data_type' => 'auto', 'max_score' => 1, 'is_required' => true, 'sort_order' => 3],
    ['mra_category_id' => 3, 'code' => 'C03-04', 'name' => 'บันทึก Respiratory Rate', 'name_en' => 'RR Recorded', 'data_type' => 'auto', 'max_score' => 1, 'is_required' => false, 'sort_order' => 4],
    ['mra_category_id' => 3, 'code' => 'C03-05', 'name' => 'บันทึก O2 Saturation', 'name_en' => 'SpO2 Recorded', 'data_type' => 'auto', 'max_score' => 1, 'is_required' => false, 'sort_order' => 5],

    // CAT04 - การตรวจร่างกาย
    ['mra_category_id' => 4, 'code' => 'C04-01', 'name' => 'บันทึก General Appearance', 'name_en' => 'GA Recorded', 'data_type' => 'manual', 'max_score' => 2, 'is_required' => true, 'sort_order' => 1],
    ['mra_category_id' => 4, 'code' => 'C04-02', 'name' => 'บันทึกการตรวจตามระบบที่เกี่ยวข้อง', 'name_en' => 'Relevant PE Recorded', 'data_type' => 'manual', 'max_score' => 3, 'is_required' => true, 'sort_order' => 2, 'audit_guide' => 'ตรวจสอบว่ามีการบันทึกการตรวจร่างกายตามระบบที่เกี่ยวข้องกับอาการ'],

    // CAT05 - การวินิจฉัยโรค
    ['mra_category_id' => 5, 'code' => 'C05-01', 'name' => 'บันทึก Primary Diagnosis', 'name_en' => 'PDx Recorded', 'data_type' => 'auto', 'max_score' => 3, 'is_required' => true, 'sort_order' => 1],
    ['mra_category_id' => 5, 'code' => 'C05-02', 'name' => 'รหัส ICD-10 ถูกต้อง', 'name_en' => 'Correct ICD-10', 'data_type' => 'both', 'max_score' => 3, 'is_required' => true, 'sort_order' => 2, 'audit_guide' => 'ตรวจสอบว่ารหัส ICD-10 ตรงกับการวินิจฉัย'],
    ['mra_category_id' => 5, 'code' => 'C05-03', 'name' => 'Diagnosis สอดคล้องกับอาการและการตรวจ', 'name_en' => 'Dx Consistency', 'data_type' => 'manual', 'max_score' => 4, 'is_required' => true, 'sort_order' => 3, 'audit_guide' => 'ตรวจสอบว่าการวินิจฉัยสอดคล้องกับ CC, HPI และ PE'],

    // CAT06 - การรักษา
    ['mra_category_id' => 6, 'code' => 'C06-01', 'name' => 'บันทึกการสั่งยา', 'name_en' => 'Medication Recorded', 'data_type' => 'auto', 'max_score' => 2, 'is_required' => false, 'sort_order' => 1],
    ['mra_category_id' => 6, 'code' => 'C06-02', 'name' => 'ยาสอดคล้องกับการวินิจฉัย', 'name_en' => 'Appropriate Medication', 'data_type' => 'manual', 'max_score' => 2, 'is_required' => false, 'sort_order' => 2],
    ['mra_category_id' => 6, 'code' => 'C06-03', 'name' => 'บันทึกการนัดหมาย/คำแนะนำ', 'name_en' => 'Follow-up Recorded', 'data_type' => 'manual', 'max_score' => 1, 'is_required' => false, 'sort_order' => 3],

    // CAT07 - การลงลายมือชื่อ
    ['mra_category_id' => 7, 'code' => 'C07-01', 'name' => 'ลายมือชื่อแพทย์ผู้ตรวจ', 'name_en' => 'Doctor Signature', 'data_type' => 'auto', 'max_score' => 2, 'is_required' => true, 'sort_order' => 1, 'audit_guide' => 'ตรวจสอบว่ามีรหัสแพทย์/ชื่อแพทย์ผู้ตรวจ'],
    ['mra_category_id' => 7, 'code' => 'C07-02', 'name' => 'วันเวลาที่บันทึก', 'name_en' => 'Date/Time Recorded', 'data_type' => 'auto', 'max_score' => 1, 'is_required' => true, 'sort_order' => 2],

    // CAT08 - ความทันเวลา
    ['mra_category_id' => 8, 'code' => 'C08-01', 'name' => 'บันทึกภายใน 24 ชั่วโมง', 'name_en' => 'Recorded within 24hrs', 'data_type' => 'auto', 'max_score' => 2, 'is_required' => false, 'sort_order' => 1, 'audit_guide' => 'ตรวจสอบว่าบันทึกภายใน 24 ชั่วโมงหลังให้บริการ'],
];

foreach ($criteria as $criterion) {
    DB::table('mra_criteria')->insert(array_merge($criterion, [
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]));
    echo "  ✓ Criteria: {$criterion['code']} - {$criterion['name']}\n";
}

echo "\n=== Seeding Complete ===\n";
echo "Categories: " . count($categories) . "\n";
echo "Criteria: " . count($criteria) . "\n";
echo "\n✅ Done!\n";
