<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
// A generated Composer file may emit a UTF-8 BOM. Discard only that prefix so
// binary downloads (Excel, PDF) are not prefixed and rejected by the client.
ob_start();
require __DIR__.'/../vendor/autoload.php';
$autoloadLeak = ob_get_clean();
if (is_string($autoloadLeak) && $autoloadLeak !== '') {
    $autoloadLeak = preg_replace('/^\xEF\xBB\xBF/', '', $autoloadLeak) ?? $autoloadLeak;
    if ($autoloadLeak !== '') {
        echo $autoloadLeak;
    }
}

// Bootstrap Laravel and handle the request...
(require_once __DIR__.'/../bootstrap/app.php')
    ->handleRequest(Request::capture());
