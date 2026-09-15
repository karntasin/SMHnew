<?php

namespace Database\Seeders;

use App\Models\Menu;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class DocumentMenusSeeder extends Seeder
{
    public function run(): void
    {
        $parent = Menu::query()
            ->whereNull('parent_id')
            ->where(function ($q) {
                $q->where('title', 'ระบบหนังสือ')
                    ->orWhere('title', 'ระบบรับส่งหนังสือ')
                    ->orWhere('title', 'Document Management');
            })
            ->first();

        if (! $parent) {
            $parent = Menu::create([
                'title' => 'ระบบรับส่งหนังสือ',
                'icon' => 'Mail',
                'route' => null,
                'order' => 40,
                'permission_name' => null,
            ]);
        } else {
            $parent->update([
                'title' => 'ระบบรับส่งหนังสือ',
                'icon' => 'Mail',
                'route' => null,
                'permission_name' => null,
            ]);
        }

        $children = [
            [
                'title' => 'แดชบอร์ดหนังสือ',
                'icon' => 'Layout',
                'route' => 'documents.dashboard',
                'order' => 1,
                'permission_name' => 'documents.dashboard',
            ],
            [
                'title' => 'รายการหนังสือ',
                'icon' => 'List',
                'route' => 'documents.index',
                'order' => 2,
                'permission_name' => 'documents.index',
            ],
            [
                'title' => 'ลงทะเบียนรับหนังสือ',
                'icon' => 'FileText',
                'route' => 'documents.create',
                'order' => 3,
                'permission_name' => 'documents.create',
            ],
            [
                'title' => 'ระหว่างนำเรียน',
                'icon' => 'Clock',
                'route' => 'documents.pendingReview',
                'order' => 4,
                'permission_name' => 'documents.pendingReview',
            ],
            [
                'title' => 'กล่องงานผู้อำนวยการ',
                'icon' => 'PenTool',
                'route' => 'documents.director.index',
                'order' => 5,
                'permission_name' => 'documents.director.index',
            ],
        ];

        $validRoutes = collect($children)->pluck('route')->all();

        // ลบเมนูย่อยเก่าที่ไม่ใช้แล้ว
        Menu::where('parent_id', $parent->id)
            ->whereNotIn('route', $validRoutes)
            ->delete();

        Menu::where('route', '/documents/drafts')->orWhere('route', 'documents.drafts')->delete();
        Menu::where('route', '/documents/templates')->orWhere('route', 'documents.templates')->delete();

        foreach ($children as $child) {
            Menu::updateOrCreate(
                [
                    'parent_id' => $parent->id,
                    'route' => $child['route'],
                ],
                [
                    'title' => $child['title'],
                    'icon' => $child['icon'],
                    'order' => $child['order'],
                    'permission_name' => $child['permission_name'],
                ]
            );

            $permission = Permission::firstOrCreate([
                'name' => $child['permission_name'],
                'guard_name' => 'web',
            ], [
                'group' => 'ระบบรับส่งหนังสือ',
            ]);

            foreach (['admin', 'Admin', 'user', 'header', 'Header'] as $roleName) {
                $role = Role::where('name', $roleName)->first();
                if ($role && ! $role->hasPermissionTo($permission)) {
                    $role->givePermissionTo($permission);
                }
            }
        }

        $this->command?->info('อัปเดตเมนูระบบรับส่งหนังสือเรียบร้อยแล้ว ('.count($children).' รายการย่อย)');
    }
}
