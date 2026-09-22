<?php

namespace App\Providers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use RuntimeException;

class HosxpReadOnlyServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        DB::listen(function ($query) {
            if ($query->connectionName !== 'hosxp') {
                return;
            }

            $sql = strtolower(trim($query->sql));

            // Whitelist for HosxpDesktopNotifyService which writes to ksklog
            if (str_starts_with($sql, 'insert') && str_contains($sql, 'ksklog')) {
                return;
            }

            $blocked = ['insert', 'update', 'delete', 'alter', 'drop', 'truncate', 'create', 'replace'];
            foreach ($blocked as $keyword) {
                if (str_starts_with($sql, $keyword)) {
                    throw new RuntimeException(
                        "BLOCKED: Write operation [{$keyword}] attempted on read-only HOSxP connection. SQL: {$sql}"
                    );
                }
            }
        });
    }
}
