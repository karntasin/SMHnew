<?php

return [
    /*
    | คีย์มาสเตอร์และ refresh token อยู่ไฟล์นอกโปรเจกต์
    | ใน .env มีแค่ path ไม่มีตัวคีย์
    */
    'key_file' => env('BACKUP_DRIVE_KEY_FILE'),
    'token_file' => env('BACKUP_DRIVE_TOKEN_FILE'),
    'folder_name' => env('BACKUP_DRIVE_FOLDER_NAME', 'SSS-Backups'),
    'keep' => (int) env('BACKUP_DRIVE_KEEP', 14),
    'temp_directory' => storage_path('app/drive-backup-temp'),
];
