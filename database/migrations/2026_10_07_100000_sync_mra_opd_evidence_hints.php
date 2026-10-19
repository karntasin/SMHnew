<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * อัปเดต metadata เกณฑ์ OPD ให้ดึงหลักฐานจาก HOSxP ได้ (data_type=both)
 * ไม่เปลี่ยนคะแนน — โหมด evidence-only ที่ API
 */
return new class extends Migration
{
    public function up(): void
    {
        $sources = config('mra_auto_check_opd.sources', []);
        if ($sources === []) {
            return;
        }

        $opdCategoryIds = DB::table('mra_categories')
            ->where('audit_type', 'opd')
            ->pluck('id')
            ->all();

        if ($opdCategoryIds === []) {
            return;
        }

        foreach ($sources as $code => $meta) {
            DB::table('mra_criteria')
                ->whereIn('mra_category_id', $opdCategoryIds)
                ->where('code', $code)
                ->update([
                    'hosxp_table' => $meta['table'] ?? null,
                    'hosxp_field' => $meta['field'] ?? null,
                    'data_type' => 'both',
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        // ไม่ย้อน data_type — การ seed เดิมเป็นแหล่งความจริงถ้าต้องการรีเซ็ต
    }
};
