<?php

namespace Database\Seeders;

use App\Models\Menu;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class FinanceMenusSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedFinanceReports();
        $this->seedFinancialDataHub();
    }

    private function seedFinanceReports(): void
    {
        $parent = Menu::query()
            ->whereNull('parent_id')
            ->where(function ($q) {
                $q->where('title', 'Finance Reports')
                    ->orWhere('title', 'รายงานการเงิน')
                    ->orWhere('route', 'finance.dashboard');
            })
            ->first();

        if (! $parent) {
            $parent = Menu::create([
                'title' => 'Finance Reports',
                'icon' => 'DollarSign',
                'route' => null,
                'order' => 90,
                'permission_name' => null,
            ]);
        } else {
            $parent->update([
                'title' => 'Finance Reports',
                'icon' => 'DollarSign',
                'route' => null,
                'permission_name' => null,
            ]);
        }

        $children = [
            [
                'title' => 'BMS Dashboard',
                'icon' => 'Layout',
                'route' => 'finance.dashboard',
                'order' => 1,
                'permission_name' => 'finance.dashboard',
            ],
            [
                'title' => 'HOSxP Revenue by Coverage',
                'icon' => 'BarChart3',
                'route' => 'finance.revenue',
                'order' => 2,
                'permission_name' => 'finance.revenue',
            ],
        ];

        $this->syncChildren($parent, $children, 'รายงานการเงิน');
        $this->command?->info('อัปเดตเมนู Finance Reports เรียบร้อยแล้ว ('.count($children).' รายการย่อย)');
    }

    private function seedFinancialDataHub(): void
    {
        $parent = Menu::query()
            ->whereNull('parent_id')
            ->where(function ($q) {
                $q->where('title', 'Financial Data Hub')
                    ->orWhere('title', 'ศูนย์ข้อมูลการเงิน')
                    ->orWhere('route', 'finance.data-hub');
            })
            ->first();

        if (! $parent) {
            $parent = Menu::create([
                'title' => 'Financial Data Hub',
                'icon' => 'Wallet',
                'route' => null,
                'order' => 91,
                'permission_name' => null,
            ]);
        } else {
            $parent->update([
                'title' => 'Financial Data Hub',
                'icon' => 'Wallet',
                'route' => null,
                'order' => 91,
                'permission_name' => null,
            ]);
        }

        // ย้ายเมนูที่เคยอยู่ใต้ parent อื่นออก
        Menu::query()
            ->whereIn('route', [
                'finance.data-hub',
                'finance.cgd.dashboard',
                'finance.cgd.import',
                'finance.lgo.dashboard',
                'finance.sso.dashboard',
                'finance.uc.dashboard',
            ])
            ->where('parent_id', '!=', $parent->id)
            ->delete();

        $children = [
            [
                'title' => 'ภาพรวมศูนย์ข้อมูลการเงิน',
                'icon' => 'Layout',
                'route' => 'finance.data-hub',
                'order' => 1,
                'permission_name' => 'finance.data-hub',
            ],
            [
                'title' => 'ตรวจเบิกจ่ายตรง กรมบัญชีกลาง',
                'icon' => 'ClipboardList',
                'route' => 'finance.cgd.dashboard',
                'order' => 2,
                'permission_name' => 'finance.cgd.dashboard',
            ],
            [
                'title' => 'ตรวจข้อมูล อปท.',
                'icon' => 'Building2',
                'route' => 'finance.lgo.dashboard',
                'order' => 3,
                'permission_name' => 'finance.lgo.dashboard',
            ],
            [
                'title' => 'ตรวจข้อมูล ประกันสังคม',
                'icon' => 'Shield',
                'route' => 'finance.sso.dashboard',
                'order' => 4,
                'permission_name' => 'finance.sso.dashboard',
            ],
            [
                'title' => 'ตรวจข้อมูล บัตรทอง',
                'icon' => 'Heart',
                'route' => 'finance.uc.dashboard',
                'order' => 5,
                'permission_name' => 'finance.uc.dashboard',
            ],
        ];

        $this->syncChildren($parent, $children, 'ศูนย์ข้อมูลการเงิน');

        // สิทธิ์หน้าต่างนำเข้าแยกตามโมดูล (ไม่ใส่ sidebar — เข้าจากหน้าระบบย่อย)
        foreach ([
            'finance.cgd.import',
            'finance.lgo.import',
            'finance.sso.import',
            'finance.uc.import',
        ] as $importPermission) {
            $this->ensurePermission($importPermission, 'ศูนย์ข้อมูลการเงิน');
        }

        $this->command?->info('อัปเดตเมนู Financial Data Hub เรียบร้อยแล้ว ('.count($children).' รายการย่อย)');
    }

    private function ensurePermission(string $name, string $group): void
    {
        $permission = Permission::firstOrCreate([
            'name' => $name,
            'guard_name' => 'web',
        ], [
            'group' => $group,
        ]);

        if ($permission->group !== $group) {
            $permission->update(['group' => $group]);
        }

        foreach (['admin', 'Admin', 'user', 'header', 'Header'] as $roleName) {
            $role = Role::where('name', $roleName)->first();
            if ($role && ! $role->hasPermissionTo($permission)) {
                $role->givePermissionTo($permission);
            }
        }
    }

    /**
     * @param  list<array{title:string,icon:string,route:string,order:int,permission_name:string}>  $children
     */
    private function syncChildren(Menu $parent, array $children, string $permissionGroup): void
    {
        $validRoutes = collect($children)->pluck('route')->all();

        Menu::where('parent_id', $parent->id)
            ->whereNotIn('route', $validRoutes)
            ->delete();

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

            $this->ensurePermission($child['permission_name'], $permissionGroup);
        }
    }
}
