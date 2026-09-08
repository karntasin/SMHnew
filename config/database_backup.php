<?php

return [
    /*
    | จำนวนไฟล์สำรองสูงสุดต่อชุด (hosxp / appdb แยกกัน)
    | เกินจำนวนนี้จะลบไฟล์เก่าสุดทิ้งอัตโนมัติ
    */
    'keep' => (int) env('DB_BACKUP_KEEP', env('HOSXP_BACKUP_KEEP', 3)),
    'directory' => env('HOSXP_BACKUP_PATH', storage_path('app/hosxp-backups')),
    'dump_binary' => env('HOSXP_BACKUP_DUMP_BIN', 'D:\\Xampp\\mysql\\bin\\mysqldump.exe'),
    'timeout' => (int) env('HOSXP_BACKUP_TIMEOUT', 0),

    'jobs' => [
        'hosxp' => [
            'connection' => 'hosxp_backup',
            'prefix' => 'hosxp',
            'label' => 'HOSxP',
            'performed_by' => 'ระบบอัตโนมัติ (00:10)',
            'keep' => (int) env('HOSXP_BACKUP_KEEP', env('DB_BACKUP_KEEP', 3)),
        ],
        'app' => [
            'connection' => env('DB_CONNECTION', 'mysql'),
            'prefix' => 'appdb',
            'label' => 'app_db',
            'performed_by' => 'ระบบอัตโนมัติ (05:00)',
            'keep' => (int) env('APPDB_BACKUP_KEEP', env('DB_BACKUP_KEEP', env('HOSXP_BACKUP_KEEP', 3))),
        ],
    ],
];
