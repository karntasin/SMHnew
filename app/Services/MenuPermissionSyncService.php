<?php

namespace App\Services;

use App\Models\Menu;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * ทำให้ทุกเมนูที่นำทางได้มี permission_name ใน Spatie
 * เพื่อให้หน้าจัดการบทบาทครอบคลุมทั้งเมนูเก่าและใหม่
 */
class MenuPermissionSyncService
{
    /**
     * @return array{
     *   menus_ensured: int,
     *   permissions_backfilled: int,
     *   permissions_created: int,
     *   role_assignments: int,
     *   navigable_menus: int,
     *   missing_before: int,
     *   uncovered_after: int
     * }
     */
    public function sync(bool $grantAdmins = true): array
    {
        $missingBefore = Menu::query()
            ->whereNotNull('route')
            ->where('route', '!=', '')
            ->where(function ($q) {
                $q->whereNull('permission_name')->orWhere('permission_name', '');
            })
            ->count();

        $menusEnsured = $this->ensureKnownMenus();
        $backfilled = $this->backfillPermissionNames();
        [$created, $assigned] = $this->syncSpatiePermissions($grantAdmins);

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $navigable = Menu::query()
            ->whereNotNull('route')
            ->where('route', '!=', '')
            ->count();

        $uncoveredAfter = Menu::query()
            ->whereNotNull('route')
            ->where('route', '!=', '')
            ->where(function ($q) {
                $q->whereNull('permission_name')->orWhere('permission_name', '');
            })
            ->count();

        $validNames = Permission::query()->pluck('name')->flip();
        $orphanPerms = Menu::query()
            ->whereNotNull('permission_name')
            ->where('permission_name', '!=', '')
            ->get()
            ->filter(fn (Menu $m) => ! $validNames->has($m->permission_name))
            ->count();

        return [
            'menus_ensured' => $menusEnsured,
            'permissions_backfilled' => $backfilled,
            'permissions_created' => $created,
            'role_assignments' => $assigned,
            'navigable_menus' => $navigable,
            'missing_before' => $missingBefore,
            'uncovered_after' => $uncoveredAfter + $orphanPerms,
        ];
    }

    /**
     * @return array{
     *   total_menus: int,
     *   navigable_menus: int,
     *   assignable_menus: int,
     *   folder_menus: int,
     *   missing_permission: int,
     *   orphan_permission: int,
     *   roots: int
     * }
     */
    public function coverage(): array
    {
        $valid = Permission::query()->pluck('name')->flip();
        $menus = Menu::query()->orderBy('order')->get();

        $navigable = $menus->filter(fn (Menu $m) => filled($m->route));
        $folders = $menus->filter(fn (Menu $m) => ! filled($m->route));
        $assignable = $navigable->filter(
            fn (Menu $m) => filled($m->permission_name) && $valid->has($m->permission_name)
        );
        $missing = $navigable->filter(fn (Menu $m) => ! filled($m->permission_name));
        $orphan = $navigable->filter(
            fn (Menu $m) => filled($m->permission_name) && ! $valid->has($m->permission_name)
        );

        return [
            'total_menus' => $menus->count(),
            'navigable_menus' => $navigable->count(),
            'assignable_menus' => $assignable->count(),
            'folder_menus' => $folders->count(),
            'missing_permission' => $missing->count(),
            'orphan_permission' => $orphan->count(),
            'roots' => $menus->whereNull('parent_id')->count(),
        ];
    }

    public function resolvePermissionName(Menu $menu): ?string
    {
        if (filled($menu->permission_name)) {
            return (string) $menu->permission_name;
        }

        if (! filled($menu->route)) {
            return null;
        }

        return $this->permissionNameFromRoute((string) $menu->route, (string) $menu->title);
    }

    public function permissionNameFromRoute(string $route, ?string $title = null): string
    {
        $route = trim($route);
        if ($route === '') {
            return 'menu.unknown';
        }

        // Laravel route name (ไม่มี / นำหน้า และไม่มี ?)
        if (! str_starts_with($route, '/') && ! str_contains($route, '?') && ! str_contains($route, ' ')) {
            return $route;
        }

        $known = [
            '/quality-indicators?type=organization&category=แบบประเมินตนเอง SAR' => 'quality-indicators.org.sar',
            '/quality-indicators?type=organization&category=แผนยุทธศาสตร์ รพ.' => 'quality-indicators.org.strategy',
        ];
        if (isset($known[$route])) {
            return $known[$route];
        }

        $path = parse_url($route, PHP_URL_PATH);
        $query = parse_url($route, PHP_URL_QUERY);
        $base = $path ? trim(str_replace('/', '.', trim($path, '/')), '.') : 'menu';

        if ($query) {
            parse_str($query, $params);
            $parts = [$base];
            if (! empty($params['type'])) {
                $parts[] = Str::slug((string) $params['type'], '_');
            }
            if (! empty($params['category'])) {
                $cat = (string) $params['category'];
                $slug = Str::slug($cat, '_');
                if ($slug === '' && $title) {
                    $slug = Str::slug($title, '_');
                }
                if ($slug === '') {
                    $slug = substr(sha1($cat), 0, 8);
                }
                $parts[] = $slug;
            }

            return implode('.', array_filter($parts));
        }

        return $base !== '' ? $base : ('menu.'.Str::slug((string) $title, '_') ?: 'item');
    }

    private function ensureKnownMenus(): int
    {
        $created = 0;

        $created += $this->ensureGroupWithChildren(
            parentTitles: ['ระบบคิว (FSHH-Q)', 'FSHH-Q', 'ระบบคิว'],
            title: 'ระบบคิว (FSHH-Q)',
            icon: 'MonitorPlay',
            order: 99,
            children: [
                ['title' => 'ตั้งค่าจอแสดงผล', 'icon' => 'Settings', 'route' => 'admin.tv.settings.edit', 'order' => 1],
                ['title' => 'จัดการสื่อ/ประกาศ', 'icon' => 'Clapperboard', 'route' => 'admin.tv.playlist.index', 'order' => 2],
                ['title' => 'ตั้งค่าห้องตรวจ', 'icon' => 'Stethoscope', 'route' => 'admin.tv.rooms.index', 'order' => 3],
            ],
            permissionGroup: 'ระบบคิว (FSHH-Q)',
        );

        $qiParent = Menu::query()
            ->whereIn('title', ['ตัวชี้วัดคุณภาพ', 'Quality Indicators'])
            ->first();
        if ($qiParent) {
            $created += $this->ensureChildren($qiParent, [
                [
                    'title' => 'แบบประเมินตนเอง SAR',
                    'icon' => 'ClipboardCheck',
                    'route' => '/quality-indicators?type=organization&category=แบบประเมินตนเอง SAR',
                    'order' => 5,
                    'permission_name' => 'quality-indicators.org.sar',
                ],
                [
                    'title' => 'แผนยุทธศาสตร์ รพ.',
                    'icon' => 'Target',
                    'route' => '/quality-indicators?type=organization&category=แผนยุทธศาสตร์ รพ.',
                    'order' => 6,
                    'permission_name' => 'quality-indicators.org.strategy',
                ],
            ], 'ตัวชี้วัดคุณภาพ');
        }

        // รวมตั้งค่าระบบ + ศูนย์ตั้งค่า เป็น hub เดียว (sidebar แสดงลิงก์เดียว)
        $created += $this->ensureSettingsHub();

        return $created;
    }

    /**
     * รวม root ตั้งค่าระบบ/ศูนย์ตั้งค่า เป็น hub เดียว → settings.hub
     * เมนูย่อยยังอยู่ใต้ parent สำหรับหน้าจัดการบทบาท (sidebar จะไม่แสดงลูก)
     */
    private function ensureSettingsHub(): int
    {
        $created = 0;
        $permissionGroup = 'ตั้งค่าระบบ';

        $children = [
            ['title' => 'คู่มือการใช้งาน', 'icon' => 'BookOpen', 'route' => 'settings.manuals', 'order' => 1, 'permission_name' => 'settings.manuals'],
            ['title' => 'คู่มือระบบ (Help)', 'icon' => 'HelpCircle', 'route' => 'help.index', 'order' => 2, 'permission_name' => 'help.index'],
            ['title' => 'จัดการผู้ใช้', 'icon' => 'Users', 'route' => 'users.index', 'order' => 10, 'permission_name' => 'users.index'],
            ['title' => 'จัดการบทบาท', 'icon' => 'Shield', 'route' => 'roles.index', 'order' => 11, 'permission_name' => 'roles.index'],
            ['title' => 'จัดการสิทธิ์', 'icon' => 'Key', 'route' => 'permissions.index', 'order' => 12, 'permission_name' => 'permissions.index'],
            ['title' => 'จัดการเมนู', 'icon' => 'Menu', 'route' => 'menus.index', 'order' => 13, 'permission_name' => 'menus.index'],
            ['title' => 'ตำแหน่ง', 'icon' => 'Briefcase', 'route' => 'settings.positions.index', 'order' => 14, 'permission_name' => 'settings.positions.index'],
            ['title' => 'ทีม HA', 'icon' => 'UsersRound', 'route' => 'settings.teamha.index', 'order' => 15, 'permission_name' => 'settings.teamha.index'],
            ['title' => 'แผนก', 'icon' => 'Building2', 'route' => 'settings.departments.index', 'order' => 16, 'permission_name' => 'settings.departments.index'],
            ['title' => 'จัดการเจ้าหน้าที่', 'icon' => 'UserCog', 'route' => 'settings.staff.index', 'order' => 17, 'permission_name' => 'settings.staff.index'],
            ['title' => 'ตั้งค่าแอป', 'icon' => 'Cog', 'route' => 'setting.edit', 'order' => 18, 'permission_name' => 'setting.edit'],
            ['title' => 'ตั้งค่าฐานข้อมูล', 'icon' => 'Database', 'route' => 'setting.database', 'order' => 19, 'permission_name' => 'setting.database'],
            ['title' => 'บันทึกระบบ', 'icon' => 'History', 'route' => 'audit-logs.index', 'order' => 20, 'permission_name' => 'audit-logs.index'],
            ['title' => 'สำรองข้อมูล', 'icon' => 'HardDrive', 'route' => 'backup.index', 'order' => 21, 'permission_name' => 'backup.index'],
            ['title' => 'ไฟล์', 'icon' => 'FolderOpen', 'route' => 'files.index', 'order' => 22, 'permission_name' => 'files.index'],
        ];

        $candidates = Menu::query()
            ->whereNull('parent_id')
            ->where(function ($q) {
                $q->whereIn('title', ['ตั้งค่าระบบ', 'ศูนย์ตั้งค่า'])
                    ->orWhere('route', 'settings.hub');
            })
            ->orderBy('id')
            ->get();

        /** @var Menu|null $hub */
        $hub = $candidates->firstWhere('title', 'ตั้งค่าระบบ')
            ?? $candidates->firstWhere('route', 'settings.hub')
            ?? $candidates->first();

        if (! $hub) {
            $hub = Menu::create([
                'title' => 'ตั้งค่าระบบ',
                'icon' => 'Settings',
                'route' => 'settings.hub',
                'parent_id' => null,
                'order' => 100,
                'permission_name' => 'settings.hub',
            ]);
            $created++;
        } else {
            $hub->update([
                'title' => 'ตั้งค่าระบบ',
                'icon' => 'Settings',
                'route' => 'settings.hub',
                'order' => 100,
                'permission_name' => 'settings.hub',
            ]);
        }

        foreach ($candidates->where('id', '!=', $hub->id) as $duplicate) {
            Menu::query()
                ->where('parent_id', $duplicate->id)
                ->update(['parent_id' => $hub->id]);
            $duplicate->delete();
        }

        // ย้ายเมนูตั้งค่าที่อยู่ระดับ root มาไว้ใต้ hub
        $childRoutes = collect($children)->pluck('route')->all();
        Menu::query()
            ->whereNull('parent_id')
            ->where('id', '!=', $hub->id)
            ->whereIn('route', $childRoutes)
            ->update(['parent_id' => $hub->id]);

        $this->ensurePermission('settings.hub', $permissionGroup);
        $created += $this->ensureChildren($hub, $children, $permissionGroup);

        return $created;
    }

    /**
     * @param  list<array{title:string,icon:string,route:string,order:int,permission_name:string,group:string,parent_id?:int|null}>  $items
     */
    private function ensureMenusExist(array $items): int
    {
        $created = 0;

        foreach ($items as $item) {
            $existing = Menu::query()->where('route', $item['route'])->first();
            if ($existing) {
                if (! filled($existing->permission_name)) {
                    $existing->update(['permission_name' => $item['permission_name']]);
                }
                $this->ensurePermission($item['permission_name'], $item['group']);
                continue;
            }

            Menu::create([
                'title' => $item['title'],
                'icon' => $item['icon'],
                'route' => $item['route'],
                'parent_id' => $item['parent_id'] ?? null,
                'order' => $item['order'],
                'permission_name' => $item['permission_name'],
            ]);
            $this->ensurePermission($item['permission_name'], $item['group']);
            $created++;
        }

        return $created;
    }

    /**
     * @param  list<string>  $parentTitles
     * @param  list<array{title:string,icon:string,route:string,order:int,permission_name?:string}>  $children
     */
    private function ensureGroupWithChildren(
        array $parentTitles,
        string $title,
        string $icon,
        int $order,
        array $children,
        string $permissionGroup,
    ): int {
        $created = 0;

        $parent = Menu::query()
            ->whereNull('parent_id')
            ->where(function ($q) use ($parentTitles) {
                foreach ($parentTitles as $name) {
                    $q->orWhere('title', $name);
                }
            })
            ->first();

        if (! $parent) {
            $parent = Menu::create([
                'title' => $title,
                'icon' => $icon,
                'route' => null,
                'parent_id' => null,
                'order' => $order,
                'permission_name' => null,
            ]);
            $created++;
        } else {
            $parent->update([
                'title' => $title,
                'icon' => $icon,
                'route' => null,
                'order' => $parent->order ?: $order,
            ]);
        }

        $created += $this->ensureChildren($parent, $children, $permissionGroup);

        return $created;
    }

    /**
     * @param  list<array{title:string,icon:string,route:string,order:int,permission_name?:string}>  $children
     */
    private function ensureChildren(Menu $parent, array $children, string $permissionGroup, bool $matchByTitle = false): int
    {
        $created = 0;

        foreach ($children as $child) {
            $permission = $child['permission_name'] ?? $child['route'];

            $query = Menu::query()->where('parent_id', $parent->id);
            if ($matchByTitle) {
                $existing = (clone $query)->where('title', $child['title'])->first()
                    ?? (clone $query)->where('route', $child['route'])->first();
            } else {
                $existing = $query->where('route', $child['route'])->first();
            }

            if ($existing) {
                $existing->update([
                    'title' => $child['title'],
                    'icon' => $child['icon'],
                    'route' => $child['route'],
                    'order' => $child['order'],
                    'permission_name' => $permission,
                ]);
            } else {
                // หลีกเลี่ยงซ้ำถ้าเมนูเดียวกันอยู่คนละ parent
                $elsewhere = Menu::query()->where('route', $child['route'])->first();
                if ($elsewhere && ! $matchByTitle) {
                    $elsewhere->update([
                        'title' => $child['title'],
                        'icon' => $child['icon'],
                        'parent_id' => $parent->id,
                        'order' => $child['order'],
                        'permission_name' => $permission,
                    ]);
                } else {
                    Menu::create([
                        'title' => $child['title'],
                        'icon' => $child['icon'],
                        'route' => $child['route'],
                        'parent_id' => $parent->id,
                        'order' => $child['order'],
                        'permission_name' => $permission,
                    ]);
                    $created++;
                }
            }

            $this->ensurePermission($permission, $permissionGroup);
        }

        return $created;
    }

    private function backfillPermissionNames(): int
    {
        $updated = 0;

        Menu::query()
            ->whereNotNull('route')
            ->where('route', '!=', '')
            ->where(function ($q) {
                $q->whereNull('permission_name')->orWhere('permission_name', '');
            })
            ->orderBy('id')
            ->each(function (Menu $menu) use (&$updated) {
                $name = $this->permissionNameFromRoute((string) $menu->route, (string) $menu->title);
                $menu->update(['permission_name' => $name]);
                $updated++;
            });

        return $updated;
    }

    /**
     * @return array{0: int, 1: int}
     */
    private function syncSpatiePermissions(bool $grantAdmins): array
    {
        $created = 0;
        $assigned = 0;

        $grantRoles = collect();
        if ($grantAdmins) {
            $grantRoles = Role::query()
                ->whereIn('name', ['admin', 'superUser', 'Admin'])
                ->get();
        }

        $menus = Menu::query()
            ->whereNotNull('permission_name')
            ->where('permission_name', '!=', '')
            ->orderBy('id')
            ->get();

        foreach ($menus as $menu) {
            $group = $this->resolveGroup($menu);
            $permission = Permission::firstOrCreate(
                ['name' => $menu->permission_name, 'guard_name' => 'web'],
                ['group' => $group],
            );

            if ($permission->wasRecentlyCreated) {
                $created++;
            } elseif ($permission->group !== $group && $group !== 'เมนู') {
                $permission->update(['group' => $group]);
            }

            foreach ($grantRoles as $role) {
                if (! $role->hasPermissionTo($permission)) {
                    $role->givePermissionTo($permission);
                    $assigned++;
                }
            }
        }

        return [$created, $assigned];
    }

    private function ensurePermission(string $name, string $group): void
    {
        $permission = Permission::firstOrCreate(
            ['name' => $name, 'guard_name' => 'web'],
            ['group' => $group],
        );

        if ($permission->group !== $group && $group !== 'เมนู') {
            $permission->update(['group' => $group]);
        }
    }

    private function resolveGroup(Menu $menu): string
    {
        if ($menu->parent_id) {
            $parent = Menu::query()->find($menu->parent_id);
            if ($parent?->title) {
                return $parent->title;
            }
        }

        return 'เมนู';
    }
}
