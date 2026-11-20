<?php

/**
 * โมดูลตรวจเบิกตามสิทธิ์ (CGD / LGO / …)
 * แยก prefix ไฟล์ · maininscl ของ e-Claim · pttype HOSxP
 */
return [
    'cgd' => [
        'key' => 'cgd',
        'title' => 'ตรวจเบิกจ่ายตรง กรมบัญชีกลาง',
        'short' => 'จ่ายตรง',
        'route_prefix' => 'finance.cgd.',
        'maininscl' => 'ofc',
        'pttype_like' => env('CGD_HOSXP_PTTYPE_LIKE', '12%'),
        'has_stm' => true,
        'primary_source' => 'stm', // stm | rep
        'reconcile_scope' => 'stm_all',
        'rep_scope' => 'all',
        'filename_prefixes' => [
            'rep' => env('CGD_ECLAIM_REP_FILENAME_PREFIX', 'rep_eclaim_14689_OPCS'),
            'stm' => env('CGD_STM_FILENAME_PREFIX', 'STM_14689_OP'),
        ],
        'validation_path' => env(
            'CGD_ECLAIM_VALIDATION_PATH',
            '/webComponent/validation/ValidationMainAction.do?maininscl=ofc'
        ),
        'statement_path' => env(
            'CGD_ECLAIM_STATEMENT_PATH',
            '/webComponent/nch/StatementReportWebAction.do'
        ),
        'totp_secret' => env('CGD_ECLAIM_TOTP_SECRET', env('NHSO_TOTP_SECRET')),
        'storage_dir' => 'finance/cgd-stm',
        'seed_appeals_from_rep' => false,
    ],

    'lgo' => [
        'key' => 'lgo',
        'title' => 'ตรวจข้อมูล อปท.',
        'short' => 'อปท.',
        'route_prefix' => 'finance.lgo.',
        'maininscl' => 'lgo',
        'pttype_like' => env('LGO_HOSXP_PTTYPE_LIKE', '41%'),
        'has_stm' => false,
        'primary_source' => 'rep',
        'reconcile_scope' => 'all', // ใช้ scope=all แยกด้วย scheme
        'rep_scope' => 'all',
        'filename_prefixes' => [
            // ไฟล์จาก e-Claim / NHSO มักเป็น eclaim_14689_OPLGO… (ไม่มีคำว่า rep_ นำหน้า)
            'rep' => env('LGO_ECLAIM_REP_FILENAME_PREFIX', 'eclaim_14689_OPLGO'),
            'stm' => null,
        ],
        'validation_path' => env(
            'LGO_ECLAIM_VALIDATION_PATH',
            '/webComponent/validation/ValidationMainAction.do?maininscl=lgo'
        ),
        'totp_secret' => env('LGO_ECLAIM_TOTP_SECRET', env('NHSO_TOTP_SECRET')),
        'storage_dir' => 'finance/lgo-rep',
        'seed_appeals_from_rep' => true,
    ],

    'ucs' => [
        'key' => 'ucs',
        'title' => 'ตรวจข้อมูล บัตรทอง (UC)',
        'short' => 'บัตรทอง',
        'route_prefix' => 'rcm.uc.',
        'maininscl' => 'ucs',
        'pttype_like' => env('UCS_HOSXP_PTTYPE_LIKE', '03%'),
        'has_stm' => true,
        'primary_source' => 'rep',
        'reconcile_scope' => 'all',
        'rep_scope' => 'all',
        'filename_prefixes' => [
            'rep' => env('UCS_ECLAIM_REP_FILENAME_PREFIX', 'eclaim_14689_OP'),
            'stm' => env('UCS_STM_FILENAME_PREFIX', '14689_OPUCS'),
        ],
        'validation_path' => env(
            'UCS_ECLAIM_VALIDATION_PATH',
            '/webComponent/validation/ValidationMainAction.do?maininscl=ucs'
        ),
        'statement_path' => env(
            'UCS_ECLAIM_STATEMENT_PATH',
            '/webComponent/ucs/statementUCSAction.do'
        ),
        'totp_secret' => env('UCS_ECLAIM_TOTP_SECRET', env('NHSO_TOTP_SECRET')),
        'storage_dir' => 'finance/ucs-rep',
        'seed_appeals_from_rep' => true,
    ],
];
