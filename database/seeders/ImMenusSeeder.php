<?php

namespace Database\Seeders;

use App\Models\Menu;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class ImMenusSeeder extends Seeder
{
    public function run(): void
    {
        $quality = Menu::query()
            ->whereNull('parent_id')
            ->where(function ($q) {
                $q->whereIn('title', [
                    'ศูนย์พัฒนาคุณภาพ',
                    'ศูนย์คุณภาพ',
                    'ศูนย์รวมงานคุณภาพ',
                    'Quality Hub',
                ])
                    ->orWhere('route', 'quality.index');
            })
            ->first();

        if (! $quality) {
            $quality = Menu::create([
                'title' => 'ศูนย์พัฒนาคุณภาพ',
                'icon' => 'Award',
                'route' => null,
                'order' => 10,
                'permission_name' => null,
            ]);
        }

        $parent = Menu::query()
            ->where(function ($q) {
                $q->where('title', 'งานสารสนเทศ (IM)')
                    ->orWhere('route', 'im.index');
            })
            ->where(function ($q) use ($quality) {
                $q->whereNull('parent_id')->orWhere('parent_id', $quality->id);
            })
            ->first();

        $parentData = [
            'title' => 'งานสารสนเทศ (IM)',
            'icon' => 'MonitorCog',
            'route' => null,
            'parent_id' => $quality->id,
            'order' => 8,
            'permission_name' => null,
        ];

        $parent = $parent ? tap($parent)->update($parentData) : Menu::create($parentData);

        $children = [
            ['title' => 'ภาพรวม IM', 'icon' => 'LayoutDashboard', 'route' => 'im.index', 'order' => 1],
            ['title' => 'แผนแม่บท IT', 'icon' => 'Target', 'route' => 'im.master-plan', 'order' => 2],
            ['title' => 'บริหารความเสี่ยง IT', 'icon' => 'ShieldAlert', 'route' => 'im.risk', 'order' => 3],
            ['title' => 'ความปลอดภัย/PDPA/BCP', 'icon' => 'Lock', 'route' => 'im.security', 'order' => 4],
            ['title' => 'Service Desk & Incident', 'icon' => 'Headset', 'route' => 'im.service-desk', 'order' => 5],
            ['title' => 'ประเมินเจ้าหน้าที่ IT', 'icon' => 'ClipboardCheck', 'route' => 'im.service-desk.evaluation', 'order' => 6],
            ['title' => 'คุณภาพเวชระเบียน', 'icon' => 'FileCheck', 'route' => 'im.medical-record', 'order' => 7],
            ['title' => 'คุณภาพพัฒนาโปรแกรม', 'icon' => 'Code2', 'route' => 'im.software-qa', 'order' => 8],
            ['title' => 'ทรัพยากร/สมรรถนะ/Change', 'icon' => 'Server', 'route' => 'im.resource', 'order' => 9],
            ['title' => 'คู่มือการใช้งาน IM', 'icon' => 'BookOpen', 'route' => 'im.manual', 'order' => 10],
        ];

        $validRoutes = collect($children)->pluck('route')->all();

        Menu::where('parent_id', $parent->id)
            ->whereNotIn('route', $validRoutes)
            ->delete();

        $roles = ['admin', 'Admin', 'user', 'header', 'Header'];

        foreach ($children as $child) {
            Menu::updateOrCreate(
                ['parent_id' => $parent->id, 'route' => $child['route']],
                [
                    'title' => $child['title'],
                    'icon' => $child['icon'],
                    'order' => $child['order'],
                    'permission_name' => $child['route'],
                ]
            );

            $permission = Permission::firstOrCreate([
                'name' => $child['route'],
                'guard_name' => 'web',
            ], [
                'group' => 'งานสารสนเทศ (IM)',
            ]);

            foreach ($roles as $roleName) {
                $role = Role::where('name', $roleName)->first();
                if ($role && ! $role->hasPermissionTo($permission)) {
                    $role->givePermissionTo($permission);
                }
            }
        }

        $this->command?->info('อัปเดตเมนูงานสารสนเทศ (IM) เรียบร้อยแล้ว ('.count($children).' รายการย่อย)');
    }
}
