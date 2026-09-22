<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('pharmacy_items', function (Blueprint $table) {
            $table->string('item_type', 30)->default('drug')->after('name')->comment('drug=ยา, nondrug=ค่าเวชภัณฑ์ที่มิใช่ยา');
            $table->string('income_code', 10)->nullable()->after('item_type')->comment('รหัสหมวดรายได้ HOSxP เช่น 05');
            $table->index('item_type');
            $table->index('income_code');
        });

        // ตรวจสอบและซิงก์รายการเดิมที่ตรงกับ nondrugitems (income = 05) ใน HOSxP
        try {
            $nondrugIcodes = DB::connection('hosxp')->table('nondrugitems')
                ->where('income', '05')
                ->pluck('icode')
                ->filter()
                ->all();

            if (! empty($nondrugIcodes)) {
                DB::table('pharmacy_items')
                    ->whereIn('icode', $nondrugIcodes)
                    ->update([
                        'item_type' => 'nondrug',
                        'income_code' => '05',
                    ]);
            }
        } catch (Throwable) {
            // ignore if hosxp offline during migrate
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pharmacy_items', function (Blueprint $table) {
            $table->dropIndex(['item_type']);
            $table->dropIndex(['income_code']);
            $table->dropColumn(['item_type', 'income_code']);
        });
    }
};
