<?php

return [
    'google' => [
        'sheet_id' => env('IM_TIMESHEET_GOOGLE_SHEET_ID', '1N_JbHz1R2N0yvC2c8Em5fFNcCDPDXJc5UNpRsSBxRdk'),
        'sheet_gid' => env('IM_TIMESHEET_GOOGLE_SHEET_GID', '521989679'),
        'sheet_url' => env(
            'IM_TIMESHEET_GOOGLE_SHEET_URL',
            'https://docs.google.com/spreadsheets/d/1N_JbHz1R2N0yvC2c8Em5fFNcCDPDXJc5UNpRsSBxRdk/edit?gid=521989679#gid=521989679'
        ),
        'tabs' => array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env('IM_TIMESHEET_GOOGLE_SHEET_TABS', 'รายงานการทำงาน,WorkLogs'))
        ))),
        'gas_url' => env('IM_TIMESHEET_GAS_URL'),
        'gas_token' => env('IM_TIMESHEET_GAS_TOKEN'),
        'service_account_json' => env('GOOGLE_SERVICE_ACCOUNT_JSON', storage_path('app/google/service-account.json')),
        'verify_ssl' => filter_var(env('IM_TIMESHEET_VERIFY_SSL', true), FILTER_VALIDATE_BOOLEAN),
        'timeout' => (int) env('IM_TIMESHEET_HTTP_TIMEOUT', 30),
    ],
];
