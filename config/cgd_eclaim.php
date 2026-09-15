<?php

return [
    'base_url' => rtrim(env('CGD_ECLAIM_BASE_URL', 'https://eclaim.nhso.go.th'), '/'),
    'username' => env('CGD_ECLAIM_USERNAME'),
    'password' => env('CGD_ECLAIM_PASSWORD'),
    // ปัจจุบัน e-Claim ใช้ NHSO IAM (Keycloak SSO) ผ่าน LoginSSOAction
    'login_path' => env('CGD_ECLAIM_LOGIN_PATH', '/webComponent/LoginSSOAction.do'),
    'iam_host' => env('CGD_ECLAIM_IAM_HOST', 'iam.nhso.go.th'),
    'validation_path' => env(
        'CGD_ECLAIM_VALIDATION_PATH',
        '/webComponent/validation/ValidationMainAction.do?maininscl=ofc'
    ),
    'timeout' => (int) env('CGD_ECLAIM_TIMEOUT', 90),
    'session_ttl_minutes' => (int) env('CGD_ECLAIM_SESSION_TTL', 25),
    // เว็บ e-Claim มักมี self-signed ใน chain — ปิด verify ได้ผ่าน env
    'verify_ssl' => filter_var(env('CGD_ECLAIM_VERIFY_SSL', false), FILTER_VALIDATE_BOOL),

    // บังคับชื่อไฟล์ก่อนนำเข้า / ดาวน์โหลด (ขึ้นต้นด้วย prefix นี้)
    'filename_prefixes' => [
        'rep' => env('CGD_ECLAIM_REP_FILENAME_PREFIX', 'rep_eclaim_14689_OPCS'),
        'stm' => env('CGD_STM_FILENAME_PREFIX', 'STM_14689_OP'),
    ],
];
