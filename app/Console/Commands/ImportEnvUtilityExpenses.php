<?php

namespace App\Console\Commands;

use App\Services\Env\EnvUtilityExpenseImportService;
use Illuminate\Console\Command;

class ImportEnvUtilityExpenses extends Command
{
    protected $signature = 'env:import-utility-expenses
        {path? : Path to Excel file}
        {--fresh : Clear existing expense/meter data before import}';

    protected $description = 'Import ENV utility expenses from ค่าใช้จ่ายสาธารณูปโภค.xlsx';

    public function handle(EnvUtilityExpenseImportService $service): int
    {
        $path = $this->argument('path')
            ?: storage_path('app/utility-source.xlsx');

        if (! is_file($path)) {
            $this->error("File not found: {$path}");

            return self::FAILURE;
        }

        $this->info("Importing from {$path} ...");
        $stats = $service->import($path, (bool) $this->option('fresh'));

        $this->table(
            ['Metric', 'Count'],
            collect($stats)->map(fn ($v, $k) => [$k, $v])->values()->all()
        );

        $this->info('Done.');

        return self::SUCCESS;
    }
}
