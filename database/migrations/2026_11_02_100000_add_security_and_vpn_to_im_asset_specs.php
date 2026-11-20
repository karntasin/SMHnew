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
        if (Schema::hasTable('im_asset_specs')) {
            Schema::table('im_asset_specs', function (Blueprint $table) {
                if (! Schema::hasColumn('im_asset_specs', 'remote_id')) {
                    $table->string('remote_id', 64)->nullable()->after('mac_address')->index();
                }
                if (! Schema::hasColumn('im_asset_specs', 'threat_level')) {
                    $table->string('threat_level', 20)->default('normal')->after('agent_version')->index();
                }
                if (! Schema::hasColumn('im_asset_specs', 'threat_score')) {
                    $table->integer('threat_score')->default(0)->after('threat_level');
                }
                if (! Schema::hasColumn('im_asset_specs', 'vpn_detected')) {
                    $table->boolean('vpn_detected')->default(false)->after('threat_score')->index();
                }
                if (! Schema::hasColumn('im_asset_specs', 'security_status')) {
                    $table->json('security_status')->nullable()->after('vpn_detected');
                }
                if (! Schema::hasColumn('im_asset_specs', 'threat_detected_at')) {
                    $table->timestamp('threat_detected_at')->nullable()->after('security_status');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('im_asset_specs')) {
            Schema::table('im_asset_specs', function (Blueprint $table) {
                $columnsToDrop = [];
                foreach (['threat_level', 'threat_score', 'vpn_detected', 'security_status', 'threat_detected_at'] as $col) {
                    if (Schema::hasColumn('im_asset_specs', $col)) {
                        $columnsToDrop[] = $col;
                    }
                }
                if (! empty($columnsToDrop)) {
                    $table->dropColumn($columnsToDrop);
                }
            });
        }
    }
};
