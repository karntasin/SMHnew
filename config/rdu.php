<?php

/**
 * RDU Phase 1 — ตัวชี้วัดและกฎการจับคู่ ICD / ยา
 * ปรับรายการได้ตาม Guideline คกก.ยาของโรงพยาบาล
 */
return [

    /*
    |--------------------------------------------------------------------------
    | Case audit retention (local app DB)
    |--------------------------------------------------------------------------
    */
    'audit_statuses' => [
        'pending' => 'รอทบทวน',
        'reviewed' => 'ทบทวนแล้ว',
        'justified' => 'มีเหตุผลเหมาะสม',
        'unjustified' => 'ไม่เหมาะสม',
        'excluded' => 'ตัดออกจากตัวชี้วัด',
    ],

    /*
    |--------------------------------------------------------------------------
    | Lab for eGFR (CKD)
    |--------------------------------------------------------------------------
    */
    'egfr' => [
        'lab_items_codes' => [1062],
        'name_patterns' => ['eGFR', 'egfr', 'GFR'],
        'threshold' => 60,
        'lookback_days' => 365,
    ],

    /*
    |--------------------------------------------------------------------------
    | Drug matching
    |--------------------------------------------------------------------------
    | antibiotic: ใช้คอลัมน์ drugitems.antibiotic = Y เป็นหลัก
    | name_patterns: fallback / กลุ่มยาเฉพาะ
    */
    'drugs' => [
        'antibiotic_column' => 'antibiotic',
        'antibiotic_value' => 'Y',
        // HOSxP มักตั้ง antibiotic=Y ไม่ครบ — ใช้ pattern เป็นหลัก และ OR กับ flag
        'antibiotic_patterns' => [
            'amox', 'ampi', 'cepha', 'cefurox', 'ceftri', 'cefix', 'cefotax', 'cefdinir',
            'cipro', 'norflox', 'oflox', 'levofl', 'moxiflox',
            'azithro', 'erythro', 'clarithro', 'clinda', 'metro',
            'co-trim', 'cotrim', 'bactrim', 'augmentin', 'penicillin', 'cloxacil',
            'doxy', 'tetracyc', 'gentamicin', 'amikacin', 'vancomy', 'meropenem',
            'imipenem', 'piperacil', 'tazo', 'nitrofur', 'fosfomy',
        ],
        'nsaid_patterns' => [
            'ibuprofen', 'diclofenac', 'naproxen', 'mefenamic', 'piroxicam',
            'meloxicam', 'celecoxib', 'etoricoxib', 'indomethacin', 'ketorolac',
            'ketoprofen', 'aceclofenac', 'nimesulide', 'aspirin', 'ASA',
        ],
        // ยานอก NSAID ที่ไม่ควรนับเป็น duplicate/NSAIDs risk (เช่น aspirin ต่ำขนาด CV)
        'nsaid_exclude_patterns' => [
            'aspirin 81', 'ASA 81', 'aspirin (baby)', 'child aspirin',
            'gel', 'cream', 'ointment', 'spray', 'patch', 'plaster',
        ],
        'long_acting_bz_patterns' => [
            'diazepam', 'clonazepam', 'chlordiazepoxide', 'flurazepam',
            'clorazepate', 'nitrazepam', 'medazepam',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Indicators
    |--------------------------------------------------------------------------
    */
    'indicators' => [
        'uri_ab' => [
            'id' => 'uri_ab',
            'group' => 'A',
            'group_label' => 'Antibiotic RDU',
            'name' => 'URI + Antibiotic',
            'name_th' => 'URI ที่ได้รับยาปฏิชีวนะ',
            'description' => 'ผู้ป่วยวินิจฉัยติดเชื้อทางเดินหายใจส่วนบน (URI) และได้รับยาปฏิชีวนะใน visit เดียวกัน',
            'icd_prefixes' => ['J00', 'J01', 'J02', 'J03', 'J04', 'J05', 'J06'],
            'drug_set' => 'antibiotic',
            'color' => 'rose',
        ],
        'diarrhea_ab' => [
            'id' => 'diarrhea_ab',
            'group' => 'A',
            'group_label' => 'Antibiotic RDU',
            'name' => 'Acute Diarrhea + Antibiotic',
            'name_th' => 'ท้องเสียเฉียบพลันที่ได้รับยาปฏิชีวนะ',
            'description' => 'ผู้ป่วยวินิจฉัยท้องเสียเฉียบพลันและได้รับยาปฏิชีวนะใน visit เดียวกัน',
            'icd_prefixes' => ['A09'],
            'drug_set' => 'antibiotic',
            'color' => 'orange',
        ],
        'wound_ab' => [
            'id' => 'wound_ab',
            'group' => 'A',
            'group_label' => 'Antibiotic RDU',
            'name' => 'Fresh Traumatic Wound + Antibiotic',
            'name_th' => 'แผลสดจากอุบัติเหตุที่ได้รับยาปฏิชีวนะ',
            'description' => 'ผู้ป่วยวินิจฉัยแผลเปิด/แผลสดจากอุบัติเหตุและได้รับยาปฏิชีวนะใน visit เดียวกัน',
            'icd_prefixes' => [
                'S01', 'S11', 'S21', 'S31', 'S41', 'S51', 'S61', 'S71', 'S81', 'S91',
                'T01', 'T09', 'T11', 'T13', 'T14',
            ],
            'drug_set' => 'antibiotic',
            'color' => 'amber',
        ],
        'ckd_nsaid' => [
            'id' => 'ckd_nsaid',
            'group' => 'B',
            'group_label' => 'High-risk Drug',
            'name' => 'CKD / eGFR < 60 + NSAIDs',
            'name_th' => 'CKD หรือ eGFR < 60 ที่ได้รับ NSAIDs',
            'description' => 'ผู้ป่วย CKD stage 3+ (N18.3–N18.5) หรือมีผล eGFR < 60 ภายใน 1 ปี และได้รับ NSAIDs ใน visit',
            'icd_prefixes' => ['N183', 'N184', 'N185', 'N18.3', 'N18.4', 'N18.5'],
            'drug_set' => 'nsaid',
            'color' => 'violet',
        ],
        'dup_nsaid' => [
            'id' => 'dup_nsaid',
            'group' => 'B',
            'group_label' => 'High-risk Drug',
            'name' => 'Duplicate NSAIDs',
            'name_th' => 'NSAIDs ซ้ำใน visit เดียวกัน',
            'description' => 'ผู้ป่วยได้รับ NSAIDs คนละชนิด ≥ 2 รายการ ใน visit เดียวกัน',
            'drug_set' => 'nsaid',
            'min_distinct_drugs' => 2,
            'color' => 'fuchsia',
        ],
        'elderly_bz' => [
            'id' => 'elderly_bz',
            'group' => 'B',
            'group_label' => 'High-risk Drug',
            'name' => 'Elderly ≥ 65 + Long-acting BZD',
            'name_th' => 'ผู้สูงอายุ ≥ 65 ปี ที่ได้ Long-acting Benzodiazepine',
            'description' => 'ผู้ป่วยอายุ ≥ 65 ปี ในวันที่มารับบริการ และได้รับ Long-acting Benzodiazepine',
            'min_age' => 65,
            'drug_set' => 'long_acting_bz',
            'color' => 'sky',
        ],
    ],
];
