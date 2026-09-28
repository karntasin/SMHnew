<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $parentMenu = DB::table('menus')->where('id', 13)->first();
        if (! $parentMenu) {
            $parentMenu = DB::table('menus')->where('title', 'ตัวชี้วัดคุณภาพ')->first();
        }

        $parentId = $parentMenu?->id ?? 13;

        $subMenus = [
            [
                'title' => 'แบบประเมินตนเอง SAR',
                'icon' => 'ClipboardCheck',
                'route' => '/quality-indicators?type=organization&category=แบบประเมินตนเอง SAR',
                'permission_name' => null,
                'parent_id' => $parentId,
                'order' => 5,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'แผนยุทธศาสตร์ รพ.',
                'icon' => 'Target',
                'route' => '/quality-indicators?type=organization&category=แผนยุทธศาสตร์ รพ.',
                'permission_name' => null,
                'parent_id' => $parentId,
                'order' => 6,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($subMenus as $menu) {
            $exists = DB::table('menus')
                ->where('parent_id', $parentId)
                ->where('title', $menu['title'])
                ->exists();

            if (! $exists) {
                DB::table('menus')->insert($menu);
            }
        }
    }

    public function down(): void
    {
        DB::table('menus')
            ->whereIn('title', ['แบบประเมินตนเอง SAR', 'แผนยุทธศาสตร์ รพ.'])
            ->where(function ($q) {
                $q->where('parent_id', 13)
                    ->orWhere('route', 'like', '/quality-indicators?type=organization%');
            })
            ->delete();
    }
};
