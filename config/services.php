<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'line' => [
        'enabled' => env('LINE_INTEGRATION_ENABLED', false),
        'client_id' => env('LINE_LOGIN_CHANNEL_ID'),
        'client_secret' => env('LINE_LOGIN_CHANNEL_SECRET'),
        'redirect' => env('LINE_OAUTH_REDIRECT'),
        'messaging_token' => env('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN'),
        'messaging_secret' => env('LINE_MESSAGING_CHANNEL_SECRET'),
        'welcome_message' => env('LINE_WELCOME_MESSAGE'),
        'add_friend_url' => env('LINE_OA_ADD_FRIEND_URL'),
    ],

    'fshh_chat' => [
        'url' => env('FSHH_CHAT_WORKER_URL', 'https://polished-river-f1bb.karntasin5.workers.dev'),
        'secret' => env('FSHH_CHAT_SYNC_SECRET'),
        'liff_url' => env('FSHH_CHAT_LIFF_URL', 'https://liff.line.me/2011190976-nGVbTYZD'),
        'verify_ssl' => filter_var(env('FSHH_CHAT_VERIFY_SSL', true), FILTER_VALIDATE_BOOLEAN),
    ],

    'telegram' => [
        'bot_token' => env('TELEGRAM_BOT_TOKEN'),
        'chat_id' => env('TELEGRAM_CHAT_ID'),
        'egfr_alerts' => [
            'enabled' => filter_var(env('TELEGRAM_EGFR_ALERTS_ENABLED', false), FILTER_VALIDATE_BOOLEAN),
            /** จำนวนวันย้อนหลังที่สแกน (ค่าเริ่มต้น = วันนี้) */
            'lookback_days' => (int) env('TELEGRAM_EGFR_ALERTS_LOOKBACK_DAYS', 0),
            /**
             * ระดับที่ส่ง: contraindicated,alert,dose_exceeded,missing_egfr
             * ค่าว่าง = contraindicated,alert,dose_exceeded
             */
            'severities' => env('TELEGRAM_EGFR_ALERTS_SEVERITIES', 'contraindicated,alert,dose_exceeded'),
            'max_items' => (int) env('TELEGRAM_EGFR_ALERTS_MAX_ITEMS', 20),
            /** per_item = แจ้งทีละใบสั่งเมื่อเข้าเงื่อนไข | digest = สรุปรวม */
            'mode' => env('TELEGRAM_EGFR_ALERTS_MODE', 'per_item'),
        ],
        'stock_alerts' => [
            'enabled' => filter_var(env('TELEGRAM_STOCK_ALERTS_ENABLED', false), FILTER_VALIDATE_BOOLEAN),
        ],
    ],

    /*
    | HOSxP desktop notify via ksklog (NOTIFYMESSAGE) — เขียนได้เฉพาะตาราง ksklog
    */
    'hosxp_notify' => [
        'enabled' => filter_var(env('HOSXP_NOTIFY_ENABLED', false), FILTER_VALIDATE_BOOLEAN),
        /** IP เครื่อง HOSxP ที่ login อยู่จริง ใช้เป็นตัวตนผู้ส่ง (ต้องมีใน onlineuser) */
        'sender_computer' => env('HOSXP_NOTIFY_SENDER_COMPUTER', ''),
    ],
];
