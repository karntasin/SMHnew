<?php

namespace Database\Seeders;

use App\Models\Menu;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class FirewallMenusSeeder extends Seeder
{
    public function run(): void
    {
        $permissionName = 'firewall.index';
        $permission = Permission::firstOrCreate(
            ['name' => $permissionName, 'guard_name' => 'web'],
            ['group' => 'ระบบ']
        );
        if ($permission->group !== 'ระบบ') {
            $permission->update(['group' => 'ระบบ']);
        }

        foreach (['Super Admin', 'Admin', 'admin', 'Header', 'header'] as $roleName) {
            $role = Role::where('name', $roleName)->first();
            if ($role && ! $role->hasPermissionTo($permission)) {
                $role->givePermissionTo($permission);
            }
        }

        $serverOrder = (int) (Menu::query()
            ->whereNull('parent_id')
            ->where(function ($q) {
                $q->where('route', 'server-monitor.index')
                    ->orWhere('title', 'ตรวจสอบเซิร์ฟเวอร์');
            })
            ->value('order') ?? 101);

        $order = $serverOrder + 1;

        Menu::query()
            ->where(function ($q) {
                $q->where('route', 'like', 'firewall.%')
                    ->orWhere('title', 'ไฟร์วอลล์ FortiGate')
                    ->orWhere('title', 'Firewall');
            })
            ->delete();

        $parent = Menu::create([
            'title' => 'ไฟร์วอลล์ FortiGate',
            'icon' => 'Shield',
            'route' => null,
            'parent_id' => null,
            'order' => $order,
            'permission_name' => null,
        ]);

        $children = [
            [
                'title' => 'แดชบอร์ดไฟร์วอลล์',
                'icon' => 'Activity',
                'route' => 'firewall.index',
                'order' => 1,
            ],
            [
                'title' => 'เฝ้าระวังเว็บ',
                'icon' => 'Globe',
                'route' => 'firewall.web-watch',
                'order' => 2,
            ],
            [
                'title' => 'ภัยคุกคาม',
                'icon' => 'ShieldAlert',
                'route' => 'firewall.threats',
                'order' => 3,
            ],
            [
                'title' => 'Threat Intelligence',
                'icon' => 'Crosshair',
                'route' => 'firewall.threat-intel',
                'order' => 4,
            ],
            [
                'title' => 'บันทึกกิจกรรม',
                'icon' => 'ScrollText',
                'route' => 'firewall.logs',
                'order' => 5,
            ],
        ];

        foreach ($children as $child) {
            Menu::create([
                'title' => $child['title'],
                'icon' => $child['icon'],
                'route' => $child['route'],
                'parent_id' => $parent->id,
                'order' => $child['order'],
                'permission_name' => $permissionName,
            ]);
        }

        $this->command?->info('อัปเดตเมนูไฟร์วอลล์ FortiGate เรียบร้อยแล้ว ('.count($children).' รายการย่อย)');
    }
}
