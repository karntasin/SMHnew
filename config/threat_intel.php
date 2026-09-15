<?php

return [
    'enabled' => filter_var(env('THREAT_INTEL_ENABLED', true), FILTER_VALIDATE_BOOLEAN),

    'abusech_auth_key' => (string) env('ABUSECH_AUTH_KEY', ''),

    'phishtank_api_key' => (string) env('PHISHTANK_API_KEY', ''),

    'retention_days' => (int) env('THREAT_INTEL_RETENTION_DAYS', 30),

    'notify_on_hit' => filter_var(env('THREAT_INTEL_NOTIFY', true), FILTER_VALIDATE_BOOLEAN),

    /*
    |--------------------------------------------------------------------------
    | Open-source feeds (free). abuse.ch feeds need ABUSECH_AUTH_KEY (free signup).
    |--------------------------------------------------------------------------
    */
    'feeds' => [
        'urlhaus' => [
            'enabled' => filter_var(env('TI_FEED_URLHAUS', true), FILTER_VALIDATE_BOOLEAN),
            'label' => 'URLhaus (abuse.ch)',
            'requires_auth' => 'abusech',
            'url' => 'https://urlhaus-api.abuse.ch/v1/urls/recent/',
            'method' => 'get',
            'type' => 'urlhaus_json',
        ],
        'threatfox' => [
            'enabled' => filter_var(env('TI_FEED_THREATFOX', true), FILTER_VALIDATE_BOOLEAN),
            'label' => 'ThreatFox (abuse.ch)',
            'requires_auth' => 'abusech',
            'url' => 'https://threatfox-api.abuse.ch/api/v1/',
            'method' => 'post',
            'type' => 'threatfox_json',
            'body' => ['query' => 'get_iocs', 'days' => 3],
            'as_json' => true,
        ],
        'feodo' => [
            'enabled' => filter_var(env('TI_FEED_FEODO', true), FILTER_VALIDATE_BOOLEAN),
            'label' => 'Feodo Tracker (abuse.ch)',
            'requires_auth' => false,
            'url' => 'https://feodotracker.abuse.ch/downloads/ipblocklist.txt',
            'method' => 'get',
            'type' => 'ip_lines',
            'threat_type' => 'botnet-c2',
        ],
        'blocklist_de' => [
            'enabled' => filter_var(env('TI_FEED_BLOCKLIST_DE', true), FILTER_VALIDATE_BOOLEAN),
            'label' => 'Blocklist.de',
            'requires_auth' => false,
            'url' => 'https://lists.blocklist.de/lists/all.txt',
            'method' => 'get',
            'type' => 'ip_lines',
            'threat_type' => 'scanner-bruteforce',
        ],
        'spamhaus_drop' => [
            'enabled' => filter_var(env('TI_FEED_SPAMHAUS', true), FILTER_VALIDATE_BOOLEAN),
            'label' => 'Spamhaus DROP',
            'requires_auth' => false,
            'url' => 'https://www.spamhaus.org/drop/drop.txt',
            'method' => 'get',
            'type' => 'spamhaus_drop',
            'threat_type' => 'drop-netblock',
        ],
        'openphish' => [
            'enabled' => filter_var(env('TI_FEED_OPENPHISH', true), FILTER_VALIDATE_BOOLEAN),
            'label' => 'OpenPhish',
            'requires_auth' => false,
            'url' => 'https://openphish.com/feed.txt',
            'method' => 'get',
            'type' => 'url_lines',
            'threat_type' => 'phishing',
        ],
        'phishtank' => [
            'enabled' => filter_var(env('TI_FEED_PHISHTANK', true), FILTER_VALIDATE_BOOLEAN),
            'label' => 'PhishTank',
            // New registration is disabled; public CSV.gz works without a key (rate-limited).
            'requires_auth' => false,
            'url' => 'https://data.phishtank.com/data/online-valid.csv.gz',
            'url_with_key' => 'https://data.phishtank.com/data/%s/online-valid.csv.gz',
            'method' => 'get',
            'type' => 'phishtank_csv',
            'threat_type' => 'phishing',
            'gzip' => true,
            // Cap size — full dump is huge; keep newest N domains (+ matching hosts)
            'max_items' => (int) env('TI_PHISHTANK_MAX', 8000),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Thailand + org custom lists (seeded / editable in DB as feed=custom|thai)
    |--------------------------------------------------------------------------
    */
    'thai_domains' => array_values(array_filter(array_map('trim', explode(',', (string) env(
        'TI_THAI_DOMAINS',
        // curated starter set — extend via UI / env (gambling / scam style patterns)
        'huay.com,huaydee.com,lottoonline.co.th,casino-th.com,linebet88.com,ufa747.com,sbobet.com,fun88.com'
    ))))),

    'custom_domains' => array_values(array_filter(array_map('trim', explode(',', (string) env(
        'TI_CUSTOM_DOMAINS',
        ''
    ))))),

    'custom_ips' => array_values(array_filter(array_map('trim', explode(',', (string) env(
        'TI_CUSTOM_IPS',
        ''
    ))))),

    /*
    |--------------------------------------------------------------------------
    | High-risk / watch ports (IANA-aligned names)
    |--------------------------------------------------------------------------
    */
    'risky_ports' => [
        21 => ['name' => 'FTP', 'risk' => 'high', 'note' => 'Plaintext credentials'],
        22 => ['name' => 'SSH', 'risk' => 'high', 'note' => 'Brute-force target'],
        23 => ['name' => 'Telnet', 'risk' => 'critical', 'note' => 'Plaintext remote access'],
        135 => ['name' => 'MSRPC', 'risk' => 'high', 'note' => 'Worm / lateral movement'],
        137 => ['name' => 'NetBIOS-NS', 'risk' => 'high', 'note' => 'Worm propagation'],
        138 => ['name' => 'NetBIOS-DGM', 'risk' => 'high', 'note' => 'Worm propagation'],
        139 => ['name' => 'NetBIOS-SSN', 'risk' => 'high', 'note' => 'Worm propagation'],
        445 => ['name' => 'SMB', 'risk' => 'critical', 'note' => 'Ransomware / worm'],
        1433 => ['name' => 'MSSQL', 'risk' => 'high', 'note' => 'DB should not egress'],
        3306 => ['name' => 'MySQL', 'risk' => 'high', 'note' => 'DB should not egress'],
        3389 => ['name' => 'RDP', 'risk' => 'critical', 'note' => 'Brute-force / ransomware'],
        6667 => ['name' => 'IRC', 'risk' => 'medium', 'note' => 'Botnet C2 classic'],
        9001 => ['name' => 'Tor-OR', 'risk' => 'medium', 'note' => 'Tor network'],
        9050 => ['name' => 'Tor-SOCKS', 'risk' => 'medium', 'note' => 'Tor SOCKS proxy'],
    ],
];
