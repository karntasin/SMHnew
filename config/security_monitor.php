<?php

return [
    'enabled' => filter_var(env('SECURITY_MONITOR_ENABLED', true), FILTER_VALIDATE_BOOLEAN),

    /*
    |--------------------------------------------------------------------------
    | Alert destination
    |--------------------------------------------------------------------------
    | แจ้งห้องแชทแผนกศูนย์สารสนเทศ ผ่าน FSHH Chat
    */
    'notify_chat' => filter_var(env('SECURITY_MONITOR_NOTIFY_CHAT', true), FILTER_VALIDATE_BOOLEAN),

    /*
    |--------------------------------------------------------------------------
    | Thresholds (ภายในหน้าต่างเวลา)
    |--------------------------------------------------------------------------
    */
    'window_minutes' => (int) env('SECURITY_MONITOR_WINDOW_MINUTES', 15),

    'failed_logins' => (int) env('SECURITY_MONITOR_FAILED_LOGINS', 8),
    'forbidden' => (int) env('SECURITY_MONITOR_FORBIDDEN', 20),
    'exports' => (int) env('SECURITY_MONITOR_EXPORTS', 8),
    'patient_lookups' => (int) env('SECURITY_MONITOR_PATIENT_LOOKUPS', 40),
    'suspicious_payloads' => (int) env('SECURITY_MONITOR_SUSPICIOUS', 3),

    /*
    |--------------------------------------------------------------------------
    | Cooldown ระหว่างแจ้งซ้ำเหตุการณ์ชนิดเดียวกันจาก IP เดิม
    |--------------------------------------------------------------------------
    */
    'alert_cooldown_minutes' => (int) env('SECURITY_MONITOR_ALERT_COOLDOWN', 30),
];
