<?php

return [
    'hospital_name' => env('HOSPITAL_NAME', 'โรงพยาบาลค่ายสุรสิงหนาท'),

    /*
    |--------------------------------------------------------------------------
    | Departments
    |--------------------------------------------------------------------------
    | source = ovst  → กรองด้วย ovst.main_dep
    | source = ipt   → กรองด้วย ipt.ward (ผู้ป่วยใน)
    | source = lab     → ตาราง lab_head (+ lab_order / lab_order_service)
    | source = xray    → ตาราง xray_head (+ xray_report / xray_items)
    | source = checkup    → ovst.pttype + patient_regiment (+ lab_head/lab_order)
    | source = opd_screen → ovst.main_dep + opdscreen (คัดกรอง OPD)
    */
    'departments' => [
        '002' => [
            'code' => '002',
            'name' => 'จุดคัดกรองห้องตรวจโรคผู้ป่วยนอก',
            'short' => 'คัดกรอง OPD',
            'icon' => 'Stethoscope',
            'color' => '#0ea5e9',
            'accent' => 'sky',
            'source' => 'opd_screen',
            // QI ที่เกี่ยวข้อง: QI-OPD-001 ระยะเวลารอคอย, QI-OPD-006 %ได้รับการคัดกรอง
            'wait_target_minutes' => 60,
            'wait_mode' => 'opd',
        ],
        '003' => [
            'code' => '003',
            'name' => 'ห้องฉุกเฉิน',
            'short' => 'ฉุกเฉิน (ER)',
            'icon' => 'Siren',
            'color' => '#f43f5e',
            'accent' => 'rose',
            'source' => 'ovst',
            'wait_target_minutes' => 60,
            'wait_mode' => 'er',
        ],
        '004' => [
            'code' => '004',
            'name' => 'แผนกพยาธิวิทยา',
            'short' => 'พยาธิวิทยา',
            'icon' => 'Microscope',
            'color' => '#8b5cf6',
            'accent' => 'violet',
            'source' => 'lab',
        ],
        '005' => [
            'code' => '005',
            'name' => 'แผนกรังสีกรรม',
            'short' => 'รังสีกรรม',
            'icon' => 'Scan',
            'color' => '#6366f1',
            'accent' => 'indigo',
            'source' => 'xray',
        ],
        '011' => [
            'code' => '011',
            'name' => 'แผนกผู้ป่วยสามัญ',
            'short' => 'ผู้ป่วยสามัญ',
            'icon' => 'Bed',
            'color' => '#14b8a6',
            'accent' => 'teal',
            'source' => 'ipt',
            // HOSxP ward: 03 ผู้ป่วยสามัญชาย, 06 ผู้ป่วยสามัญหญิง, 01 ตึกผู้ป่วยใน
            'wards' => ['03', '06', '01'],
            'ward_name_keywords' => ['สามัญ', 'ตึกผู้ป่วยใน'],
        ],
        '014' => [
            'code' => '014',
            'name' => 'กายภาพบำบัด',
            'short' => 'กายภาพบำบัด',
            'icon' => 'Activity',
            'color' => '#10b981',
            'accent' => 'emerald',
            'source' => 'ovst',
            'wait_target_minutes' => 60,
            'wait_mode' => 'clinic',
        ],
        '020' => [
            'code' => '020',
            'name' => 'หอผู้ป่วยพิเศษ',
            'short' => 'หอผู้ป่วยพิเศษ',
            'icon' => 'Building2',
            'color' => '#06b6d4',
            'accent' => 'cyan',
            'source' => 'ipt',
            // HOSxP ward: 04 ผู้ป่วยพิเศษ (ไม่รวม SEMI ICU / COWARD)
            'wards' => ['04'],
            'ward_name_keywords' => ['พิเศษ'],
        ],
        '021' => [
            'code' => '021',
            'name' => 'หน่วยไตเทียม',
            'short' => 'ไตเทียม',
            'icon' => 'HeartPulse',
            'color' => '#f59e0b',
            'accent' => 'amber',
            'source' => 'ovst',
            'wait_target_minutes' => 60,
            'wait_mode' => 'clinic',
        ],
        '025' => [
            'code' => '025',
            'name' => 'ห้องแพทย์แผนไทย',
            'short' => 'แพทย์แผนไทย',
            'icon' => 'Leaf',
            'color' => '#84cc16',
            'accent' => 'lime',
            'source' => 'ovst',
            'wait_target_minutes' => 60,
            'wait_mode' => 'clinic',
        ],
        '030' => [
            'code' => '030',
            'name' => 'ตรวจร่างกายประจำปี',
            'short' => 'ตรวจสุขภาพประจำปี',
            'icon' => 'ClipboardCheck',
            'color' => '#3b82f6',
            'accent' => 'blue',
            'source' => 'checkup',
            // HOSxP: สิทธิตรวจร่างกายประจำปี
            'pttype' => '40',
        ],
        '034' => [
            'code' => '034',
            'name' => 'แพทย์แผนจีน',
            'short' => 'แพทย์แผนจีน',
            'icon' => 'Sparkles',
            'color' => '#ec4899',
            'accent' => 'pink',
            'source' => 'ovst',
            'wait_target_minutes' => 60,
            'wait_mode' => 'clinic',
        ],
    ],

    'sections' => [
        'summary' => 'สรุปภาพรวม',
        'trend' => 'แนวโน้มรายวัน',
        'diagnoses' => 'วินิจฉัยโรคยอดนิยม',
        'rights' => 'สิทธิการรักษา',
        'hourly' => 'ช่วงเวลารับบริการ',
    ],

    'sections_ipt' => [
        'summary' => 'สรุปภาพรวมผู้ป่วยใน',
        'trend' => 'แนวโน้มการ Admit รายวัน',
        'diagnoses' => 'วินิจฉัยโรคยอดนิยม (IPD)',
        'rights' => 'สิทธิการรักษา',
        'hourly' => 'ช่วงเวลา Admit',
        'wards' => 'แยกตามหอผู้ป่วย',
    ],

    'sections_lab' => [
        'summary' => 'สรุปภาพรวมห้องแล็บ',
        'trend' => 'แนวโน้มใบสั่งแล็บรายวัน',
        'forms' => 'ฟอร์มตรวจยอดนิยม',
        'items' => 'รายการตรวจยอดนิยม',
        'groups' => 'กลุ่มการตรวจ',
        'departments' => 'หน่วยงานที่ส่งตรวจ',
        'hourly' => 'ช่วงเวลาสั่งตรวจ',
    ],

    'sections_xray' => [
        'summary' => 'สรุปภาพรวมรังสี',
        'trend' => 'แนวโน้มส่งตรวจรายวัน',
        'items' => 'รายการตรวจยอดนิยม',
        'groups' => 'กลุ่ม/ชนิดการตรวจ',
        'departments' => 'หน่วยงานที่ส่งตรวจ',
        'hourly' => 'ช่วงเวลาขอตรวจ',
    ],

    'sections_checkup' => [
        'summary' => 'สรุปภาพรวมตรวจสุขภาพประจำปี',
        'trend' => 'แนวโน้มผู้มารับบริการ',
        'regiments' => 'แยกตามหน่วยงาน/หน่วยทหาร',
        'personnel' => 'แยกตามประเภทบุคลากร',
        'ages' => 'ช่วงอายุ',
        'lab_overview' => 'สรุปผล Lab (ปกติ/ผิดปกติ)',
        'lab_markers' => 'ผลตรวจ Lab สำคัญ',
        'hourly' => 'ช่วงเวลามารับบริการ',
    ],

    'sections_opd_screen' => [
        // โซนตัวชี้วัดคุณภาพ (รอตรวจสอบก่อนเชื่อมระบบ QI)
        'wait_time' => 'ระยะเวลารอคอย (QI-OPD-001)',
        'vitals' => 'QI-OPD-006 สัญญาณชีพ/%คัดกรอง',
        // โซนรายงานทั่วไป / ปฏิบัติการ
        'summary' => 'สรุปภาพรวมคัดกรอง OPD',
        'trend' => 'แนวโน้มรายวัน',
        'ages' => 'ช่วงอายุ',
        'specialties' => 'คลินิกที่ส่งต่อ',
        'visit_status' => 'สถานะการรับบริการ',
        'destinations' => 'ปลายทางหลังคัดกรอง',
        'complaints' => 'อาการสำคัญ (CC)',
        'diagnoses' => 'วินิจฉัยโรคยอดนิยม',
        'rights' => 'สิทธิการรักษา',
        'weekdays' => 'แยกตามวันในสัปดาห์',
        'hourly' => 'ช่วงเวลามารับบริการ',
    ],

    'zones_opd_screen' => [
        'qi' => ['wait_time', 'vitals'],
        'ops' => ['summary', 'trend', 'ages', 'specialties', 'visit_status', 'destinations', 'complaints', 'diagnoses', 'rights', 'weekdays', 'hourly'],
    ],

    'sections_er' => [
        'wait_time' => 'ระยะเวลารอคอย (service_time)',
        'er_types' => 'ระดับความฉุกเฉิน / ประเภทผู้ป่วย ER',
        'vitals' => 'สัญญาณชีพ / การคัดกรอง',
        'summary' => 'สรุปภาพรวมห้องฉุกเฉิน',
        'trend' => 'แนวโน้มรายวัน',
        'ages' => 'ช่วงอายุ',
        'specialties' => 'คลินิก/สาขา',
        'visit_status' => 'สถานะการรับบริการ',
        'destinations' => 'ปลายทางหลังรับบริการ',
        'complaints' => 'อาการสำคัญ (CC)',
        'diagnoses' => 'วินิจฉัยโรคยอดนิยม',
        'rights' => 'สิทธิการรักษา',
        'weekdays' => 'แยกตามวันในสัปดาห์',
        'hourly' => 'ช่วงเวลามารับบริการ',
    ],

    'zones_er' => [
        'qi' => ['wait_time', 'er_types', 'vitals'],
        'ops' => ['summary', 'trend', 'ages', 'specialties', 'visit_status', 'destinations', 'complaints', 'diagnoses', 'rights', 'weekdays', 'hourly'],
    ],

    'sections_ovst' => [
        'wait_time' => 'ระยะเวลารอคอย (service_time)',
        'vitals' => 'สัญญาณชีพ / การคัดกรอง',
        'summary' => 'สรุปภาพรวม',
        'trend' => 'แนวโน้มรายวัน',
        'ages' => 'ช่วงอายุ',
        'specialties' => 'คลินิก/สาขา',
        'visit_status' => 'สถานะการรับบริการ',
        'destinations' => 'ปลายทางปัจจุบัน',
        'complaints' => 'อาการสำคัญ (CC)',
        'diagnoses' => 'วินิจฉัยโรคยอดนิยม',
        'rights' => 'สิทธิการรักษา',
        'weekdays' => 'แยกตามวันในสัปดาห์',
        'hourly' => 'ช่วงเวลามารับบริการ',
    ],

    'zones_ovst' => [
        'qi' => ['wait_time', 'vitals'],
        'ops' => ['summary', 'trend', 'ages', 'specialties', 'visit_status', 'destinations', 'complaints', 'diagnoses', 'rights', 'weekdays', 'hourly'],
    ],

    'zones_ipt' => [
        'qi' => ['summary'],
        'ops' => ['trend', 'diagnoses', 'rights', 'hourly', 'wards'],
    ],

    'zones_lab' => [
        'qi' => ['summary'],
        'ops' => ['trend', 'forms', 'items', 'groups', 'departments', 'hourly'],
    ],

    'zones_xray' => [
        'qi' => ['summary'],
        'ops' => ['trend', 'items', 'groups', 'departments', 'hourly'],
    ],

    'zones_checkup' => [
        'qi' => ['summary', 'lab_overview', 'lab_markers'],
        'ops' => ['trend', 'regiments', 'personnel', 'ages', 'hourly'],
    ],

    /*
    | รายการ Lab สำคัญสำหรับตรวจสุขภาพประจำปี
    | ใช้เทียบกับ lab_items.range_check_* และ lab_order.lab_order_result
    */
    'checkup_lab_markers' => [
        ['code' => '1204', 'label' => 'FBS', 'unit' => 'mg/dL'],
        ['code' => '1190', 'label' => 'Cholesterol', 'unit' => 'mg/dL'],
        ['code' => '1192', 'label' => 'Triglyceride', 'unit' => 'mg/dL'],
        ['code' => '1188', 'label' => 'Uric acid', 'unit' => 'mg/dL'],
        ['code' => '1200', 'label' => 'AST/SGOT', 'unit' => 'U/L'],
        ['code' => '1202', 'label' => 'ALT/SGPT', 'unit' => 'U/L'],
        ['code' => '78', 'label' => 'Creatinine', 'unit' => 'mg/dL'],
        ['code' => '1062', 'label' => 'eGFR', 'unit' => '', 'fallback_min' => 60, 'fallback_max' => 9999],
        ['code' => '3', 'label' => 'Hb', 'unit' => 'g/dL'],
        ['code' => '4', 'label' => 'Hct', 'unit' => '%'],
    ],
];
