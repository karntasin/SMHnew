<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('pharmacy_packaging_types')) {
            return;
        }

        $now = now();
        $types = [
            ['blister', 'บลิสเตอร์'],
            ['tray', 'ถาด'],
            ['cart', 'รถเข็นยา'],
            ['crate', 'ตะกร้า/ลังโปร่ง'],
            ['bundle', 'มัด'],
            ['jar', 'กระปุก'],
            ['can', 'กระป๋อง'],
            ['dropper', 'ขวดหยด'],
            ['syringe', 'ไซริงค์'],
            ['cartridge', 'คาร์ทริดจ์'],
            ['inhaler', 'หลอดพ่น'],
            ['patch', 'แผ่นแปะ'],
            ['suppository', 'แท่งสอด'],
            ['kit', 'คิต/ชุดยา'],
            ['inner_box', 'กล่องย่อย'],
            ['outer_box', 'กล่องใหญ่'],
            ['shipping_carton', 'ลังขนส่ง'],
            ['cool_box', 'กล่องควบคุมอุณหภูมิ'],
        ];

        foreach ($types as $index => [$code, $name]) {
            DB::table('pharmacy_packaging_types')->updateOrInsert(
                ['code' => $code],
                [
                    'name' => $name,
                    'is_active' => true,
                    'sort_order' => 100 + $index,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('pharmacy_packaging_types')) {
            DB::table('pharmacy_packaging_types')->whereIn('code', [
                'blister', 'tray', 'cart', 'crate', 'bundle', 'jar', 'can', 'dropper',
                'syringe', 'cartridge', 'inhaler', 'patch', 'suppository', 'kit',
                'inner_box', 'outer_box', 'shipping_carton', 'cool_box',
            ])->delete();
        }
    }
};
