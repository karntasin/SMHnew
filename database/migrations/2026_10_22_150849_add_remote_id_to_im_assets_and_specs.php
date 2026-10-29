<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('im_assets', 'remote_id')) {
            Schema::table('im_assets', function (Blueprint $table) {
                $table->string('remote_id', 64)->nullable()->after('mac_address')->index();
            });
        }

        if (Schema::hasTable('asset_specs') && ! Schema::hasColumn('asset_specs', 'remote_id')) {
            Schema::table('asset_specs', function (Blueprint $table) {
                $table->string('remote_id', 64)->nullable()->after('mac_address')->index();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('im_assets', 'remote_id')) {
            Schema::table('im_assets', function (Blueprint $table) {
                $table->dropColumn('remote_id');
            });
        }

        if (Schema::hasTable('asset_specs') && Schema::hasColumn('asset_specs', 'remote_id')) {
            Schema::table('asset_specs', function (Blueprint $table) {
                $table->dropColumn('remote_id');
            });
        }
    }
};
