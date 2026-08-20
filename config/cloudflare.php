<?php

return [
    /*
    | quick  = ลิงก์ชั่วคราว *.trycloudflare.com (กดเปิดจากหน้าตั้งค่า)
    | named  = subdomain ถาวร เช่น smh.yourdomain.com (ติดตั้ง cloudflared เป็น Windows Service)
    */
    'tunnel_mode' => env('CLOUDFLARE_TUNNEL_MODE', 'quick'),

    /** โฮสต์สาธารณะเต็ม เช่น smh.hospital.go.th — มาจาก Public Hostname ใน Zero Trust */
    'public_hostname' => env('CLOUDFLARE_PUBLIC_HOSTNAME'),

    /** ไฟล์ config ของ Named Tunnel (หลัง cloudflared tunnel login + create) */
    'tunnel_config' => env('CLOUDFLARE_TUNNEL_CONFIG', base_path('deploy/cloudflare/config.yml')),

    'cloudflared_bin' => env('CLOUDFLARED_BIN', base_path('cloudflared.exe')),
];
