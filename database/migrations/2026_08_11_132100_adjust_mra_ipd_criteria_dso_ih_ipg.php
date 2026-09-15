<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // IPD-02: ปิดใช้ข้อ dso_8, dso_9
        DB::table('mra_criteria')
            ->whereIn('code', ['dso_8', 'dso_9'])
            ->update([
                'is_active' => false,
                'updated_at' => now(),
            ]);

        // IPD-04: แก้ข้อความ ih_3
        DB::table('mra_criteria')
            ->where('code', 'ih_3')
            ->update([
                'name' => 'บันทึกการรักษาที่ได้มาแล้ว/ประวัติการรักษา (ระบุการรักษาไม่ชัดเจน)',
                'updated_at' => now(),
            ]);

        // Progress notes: แก้ข้อความ ipg_7
        DB::table('mra_criteria')
            ->where('code', 'ipg_7')
            ->update([
                'name' => 'Progress note ลงตรงตำแหน่งที่หน่วยบริการกำหนด',
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        DB::table('mra_criteria')
            ->whereIn('code', ['dso_8', 'dso_9'])
            ->update([
                'is_active' => true,
                'updated_at' => now(),
            ]);

        DB::table('mra_criteria')
            ->where('code', 'ih_3')
            ->update([
                'name' => 'บันทึกการรักษาที่ได้มาแล้ว/ประวัติการรักษา (ไม่ได้รักษาที่ใดระบุชัดเจน)',
                'updated_at' => now(),
            ]);

        DB::table('mra_criteria')
            ->where('code', 'ipg_7')
            ->update([
                'name' => 'Progress note ลงตำแหน่งที่หน่วยบริการกำหนด',
                'updated_at' => now(),
            ]);
    }
};
