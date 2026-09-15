<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Mask PII ในทุก response ของเว็บ (ค่าเริ่มต้น: เปิด)
    |--------------------------------------------------------------------------
    | ระบบใหม่ภายใต้ web middleware จะถูก mask อัตโนมัติ
    | CID + นามสกุลผู้ป่วย / last_name — ไม่ mask HN
    */
    'enabled' => filter_var(env('PII_MASK_ENABLED', true), FILTER_VALIDATE_BOOLEAN),

    /*
    |--------------------------------------------------------------------------
    | Route ที่อนุญาตส่งค่าเต็ม (เฉพาะกรอกข้อมูลเจ้าหน้าที่/โปรไฟล์ตัวเอง)
    | ห้ามใส่ route ที่แสดงข้อมูลผู้ป่วย
    |--------------------------------------------------------------------------
    */
    'raw_route_names' => [
        'profile.complete',
        'profile.complete.update',
        'profile.roster-lookup',
        'profile.edit',
        'profile.update',
        'settings.staff.create',
        'settings.staff.store',
        'settings.staff.edit',
        'settings.staff.update',
    ],
];