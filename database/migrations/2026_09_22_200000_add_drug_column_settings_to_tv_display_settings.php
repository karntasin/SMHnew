<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('mysql')->table('tv_display_settings', function (Blueprint $table) {
            // Drug Queue 2-Column Customization Settings
            $table->string('drug_col1_title', 100)->nullable()->default('รอจ่ายยา')->after('show_wait_badge');
            $table->string('drug_col2_title', 100)->nullable()->default('รอจัดยา')->after('drug_col1_title');
            $table->string('drug_col1_border_color', 30)->nullable()->default('#06b6d4')->after('drug_col2_title');
            $table->string('drug_col2_border_color', 30)->nullable()->default('#f59e0b')->after('drug_col1_border_color');
            $table->string('drug_col1_waiting_title', 100)->nullable()->default('คิวรอจ่ายยา')->after('drug_col2_border_color');
            $table->string('drug_col2_waiting_title', 100)->nullable()->default('คิวรอจัดยา')->after('drug_col1_waiting_title');
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->table('tv_display_settings', function (Blueprint $table) {
            $table->dropColumn([
                'drug_col1_title',
                'drug_col2_title',
                'drug_col1_border_color',
                'drug_col2_border_color',
                'drug_col1_waiting_title',
                'drug_col2_waiting_title',
            ]);
        });
    }
};
