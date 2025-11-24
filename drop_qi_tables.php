<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

use Illuminate\Support\Facades\Schema;

Schema::dropIfExists('quality_indicator_entries');
Schema::dropIfExists('quality_indicators');

echo "Dropped quality_indicators tables.\n";
