<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('vehicles') && ! Schema::hasColumn('vehicles', 'deleted_at')) {
            Schema::table('vehicles', function (Blueprint $table) {
                $table->softDeletes();
            });
        }

        if (Schema::hasTable('vehicle_categories') && ! Schema::hasColumn('vehicle_categories', 'deleted_at')) {
            Schema::table('vehicle_categories', function (Blueprint $table) {
                $table->softDeletes();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('vehicles', 'deleted_at')) {
            Schema::table('vehicles', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }

        if (Schema::hasColumn('vehicle_categories', 'deleted_at')) {
            Schema::table('vehicle_categories', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }
    }
};
