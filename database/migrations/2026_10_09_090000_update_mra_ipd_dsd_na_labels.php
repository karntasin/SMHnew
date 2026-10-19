<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * IPD-01: เปลี่ยนคำอธิบายข้อที่ไม่มีหัตถการ/ไม่เสียชีวิต จากให้ 1 คะแนน เป็นให้ N/A
     */
    public function up(): void
    {
        $this->rename([
            'dsd_3' => 'สรุป Procedure/Operation ถูกต้องครบถ้วน (ไม่มีหัตถการให้ N/A คะแนน)',
            'dsd_4' => 'บันทึกวันเวลาเริ่ม-สิ้นสุดหัตถการในห้องผ่าตัด (ไม่มีให้ N/A คะแนน)',
            'dsd_7' => 'สรุปสาเหตุการตายถูกต้อง (ไม่เสียชีวิตให้ N/A คะแนน)',
        ]);
    }

    public function down(): void
    {
        $this->rename([
            'dsd_3' => 'สรุป Procedure/Operation ถูกต้องครบถ้วน (ไม่มีหัตถการให้ 1 คะแนน)',
            'dsd_4' => 'บันทึกวันเวลาเริ่ม-สิ้นสุดหัตถการในห้องผ่าตัด (ไม่มีให้ 1 คะแนน)',
            'dsd_7' => 'สรุปสาเหตุการตายถูกต้อง (ไม่เสียชีวิตให้ 1 คะแนน)',
        ]);
    }

    /**
     * @param  array<string, string>  $labels
     */
    private function rename(array $labels): void
    {
        $categoryIds = DB::table('mra_categories')
            ->where('audit_type', 'ipd')
            ->pluck('id');

        foreach ($labels as $code => $name) {
            DB::table('mra_criteria')
                ->whereIn('mra_category_id', $categoryIds)
                ->where('code', $code)
                ->update([
                    'name' => $name,
                    'updated_at' => now(),
                ]);
        }
    }
};
