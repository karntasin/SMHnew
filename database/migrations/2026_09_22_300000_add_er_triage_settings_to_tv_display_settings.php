<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('mysql')->table('tv_display_settings', function (Blueprint $table) {
            // ER Triage and Countdown Customization Settings
            $table->boolean('er_show_triage')->default(true)->after('drug_col2_waiting_title');
            $table->boolean('er_show_countdown')->default(true)->after('er_show_triage');
            $table->unsignedSmallInteger('er_triage_target_1')->default(0)->after('er_show_countdown');   // Resuscitate: 0 mins
            $table->unsignedSmallInteger('er_triage_target_2')->default(15)->after('er_triage_target_1'); // Emergency: 15 mins
            $table->unsignedSmallInteger('er_triage_target_3')->default(30)->after('er_triage_target_2'); // Urgency: 30 mins
            $table->unsignedSmallInteger('er_triage_target_4')->default(60)->after('er_triage_target_3'); // Semi Urgency: 60 mins
            $table->unsignedSmallInteger('er_triage_target_5')->default(120)->after('er_triage_target_4'); // Non Urgency: 120 mins
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->table('tv_display_settings', function (Blueprint $table) {
            $table->dropColumn([
                'er_show_triage',
                'er_show_countdown',
                'er_triage_target_1',
                'er_triage_target_2',
                'er_triage_target_3',
                'er_triage_target_4',
                'er_triage_target_5',
            ]);
        });
    }
};
