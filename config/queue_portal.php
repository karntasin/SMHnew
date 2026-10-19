<?php

/*
| QR บนฟอร์ม HOSxP FORM-RxORDER1-Queue1
| แก้ Expression ของบาร์โค้ดเดิมจากเลขคิวล้วน เป็นลิงก์ตามด้วยเลขคิวเดิม
| ไม่ต้องวาง QR ใหม่ และไม่ต้องแก้ SQL
|
| 'https://fshh-app.online/queue/' + [ovst."oqueue"]
|
| ตัวอย่าง: https://fshh-app.online/queue/125
| อย่าใส่ชื่อ สกุล หรือ HN ต่อท้ายลิงก์
*/

return [
    'screening_dep' => '002',
    'pharmacy_dep' => '013',
    'cache_seconds' => 3,
    'notify_ahead' => 3,
    'vapid_subject' => env('QUEUE_PORTAL_VAPID_SUBJECT', env('APP_URL', 'http://localhost')),
    'vapid_public' => env('QUEUE_PORTAL_VAPID_PUBLIC_KEY'),
    'vapid_private' => env('QUEUE_PORTAL_VAPID_PRIVATE_KEY'),
];
