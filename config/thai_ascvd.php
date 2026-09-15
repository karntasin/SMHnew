<?php

return [
    'enabled' => env('THAI_ASCVD_ENABLED', true),

    /*
    |--------------------------------------------------------------------------
    | Thai CV Risk Score settings
    |--------------------------------------------------------------------------
    |
    | Uses the official Ramathibodi Thai CV Risk Score 2.5 formula:
    | lipid model first, then waist/height model when lipid is unavailable.
    | The public estimator is intended for Thai adults age 35-70 without prior
    | ASCVD, valvular heart disease, or arrhythmia.
    |
    */
    'age_min' => 35,
    'age_max' => 70,
    'high_risk_threshold' => 20,
    'very_high_risk_threshold' => 30,
    'lab_max_age_days' => 365,

    'lab_codes' => [
        // Local HOSxP cholesterol item codes found in this database, plus text codes for portability.
        'tc' => ['1190', '102', '736', 'CHOL', 'TC'],
    ],

    'lab_name_keywords' => [
        'tc' => ['cholesterol', 'total cholesterol', 'chol'],
    ],

    // HOSxP smoking_type_id values that mean current smoker. Adjust if local master data differs.
    'smoking_current_ids' => [3],
];
