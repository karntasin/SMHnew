<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

$modelPath = app_path('Models');
$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($modelPath));
$issues = [];

foreach ($iterator as $file) {
    if (! $file->isFile() || $file->getExtension() !== 'php') {
        continue;
    }

    $relative = str_replace('\\', '/', Str::after($file->getPathname(), app_path().DIRECTORY_SEPARATOR));
    $class = 'App\\'.str_replace(['/', '.php'], ['\\', ''], $relative);

    if (! class_exists($class)) {
        continue;
    }

    $reflection = new ReflectionClass($class);
    if ($reflection->isAbstract() || ! $reflection->isSubclassOf(Model::class)) {
        continue;
    }

    /** @var Model $model */
    $model = new $class;
    $table = $model->getTable();

    if (! Schema::hasTable($table)) {
        $issues[] = "{$class} ({$table}): table missing";
        continue;
    }

    $columns = Schema::getColumnListing($table);
    $fillable = $model->getFillable();

    $missingFillable = array_values(array_diff($fillable, $columns));
    if ($missingFillable) {
        $issues[] = "{$table} missing fillable columns: ".implode(', ', $missingFillable);
    }

    $usesSoftDeletes = in_array(SoftDeletes::class, class_uses_recursive($class), true);
    if ($usesSoftDeletes && ! in_array('deleted_at', $columns, true)) {
        $issues[] = "{$table} missing deleted_at (SoftDeletes enabled)";
    }
}

if ($issues) {
    foreach ($issues as $issue) {
        echo $issue.PHP_EOL;
    }
} else {
    echo "All model columns OK".PHP_EOL;
}
