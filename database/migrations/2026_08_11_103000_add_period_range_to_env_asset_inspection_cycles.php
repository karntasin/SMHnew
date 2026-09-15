<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('env_asset_inspection_cycles', function (Blueprint $table) {
            if (! Schema::hasColumn('env_asset_inspection_cycles', 'period_start')) {
                $table->date('period_start')->nullable()->after('default_scheduled_date');
            }
            if (! Schema::hasColumn('env_asset_inspection_cycles', 'period_end')) {
                $table->date('period_end')->nullable()->after('period_start');
            }
        });

        if (Schema::hasColumn('env_asset_inspection_cycles', 'period_start')) {
            DB::table('env_asset_inspection_cycles')
                ->whereNotNull('default_scheduled_date')
                ->whereNull('period_start')
                ->update([
                    'period_start' => DB::raw('default_scheduled_date'),
                    'period_end' => DB::raw('default_scheduled_date'),
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('env_asset_inspection_cycles', function (Blueprint $table) {
            if (Schema::hasColumn('env_asset_inspection_cycles', 'period_end')) {
                $table->dropColumn('period_end');
            }
            if (Schema::hasColumn('env_asset_inspection_cycles', 'period_start')) {
                $table->dropColumn('period_start');
            }
        });
    }
};
