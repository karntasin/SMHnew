<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $parentMenu = DB::table('menus')
            ->whereNull('parent_id')
            ->where(function ($q) {
                $q->where('title', 'Financial Data Hub')
                    ->orWhere('title', 'ศูนย์ข้อมูลการเงิน')
                    ->orWhere('route', 'finance.data-hub');
            })
            ->first();

        if (! $parentMenu) {
            return;
        }

        $parentId = $parentMenu->id;

        $compareMenu = [
            'title' => 'เปรียบเทียบสิทธิ์จ่ายตรง',
            'icon' => 'ArrowLeftRight',
            'route' => 'finance.cgd.compare',
            'permission_name' => 'finance.cgd.dashboard',
            'parent_id' => $parentId,
            'order' => 3,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        // ปรับ order ของเมนูอื่นๆ ที่อยู่หลังลำดับที่ 2 เพื่อแทรกเมนูเปรียบเทียบ
        DB::table('menus')
            ->where('parent_id', $parentId)
            ->where('order', '>=', 3)
            ->where('route', '!=', 'finance.cgd.compare')
            ->increment('order');

        $exists = DB::table('menus')
            ->where('parent_id', $parentId)
            ->where(function ($q) {
                $q->where('route', 'finance.cgd.compare')
                    ->orWhere('title', 'เปรียบเทียบสิทธิ์จ่ายตรง');
            })
            ->first();

        if (! $exists) {
            DB::table('menus')->insert($compareMenu);
        } else {
            DB::table('menus')
                ->where('id', $exists->id)
                ->update([
                    'title' => 'เปรียบเทียบสิทธิ์จ่ายตรง',
                    'icon' => 'ArrowLeftRight',
                    'route' => 'finance.cgd.compare',
                    'order' => 3,
                    'parent_id' => $parentId,
                    'permission_name' => 'finance.cgd.dashboard',
                ]);
        }
    }

    public function down(): void
    {
        DB::table('menus')
            ->where('route', 'finance.cgd.compare')
            ->delete();
    }
};
