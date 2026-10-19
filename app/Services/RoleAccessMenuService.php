<?php

namespace App\Services;

use App\Models\Menu;
use Illuminate\Support\Collection;
use Spatie\Permission\Models\Permission;

class RoleAccessMenuService
{
    /** @var Collection<string, int>|null */
    private ?Collection $validPermissionNames = null;

    public function __construct(
        private readonly MenuPermissionSyncService $menuPermissionSync,
    ) {}

    /**
     * ซิงก์เมนู/สิทธิ์แล้วสร้างต้นไม้สำหรับหน้าจัดการบทบาท
     *
     * @return array{
     *   tree: list<array<string, mixed>>,
     *   coverage: array<string, int>,
     *   sync: array<string, int>
     * }
     */
    public function prepareForRoleForm(bool $sync = true): array
    {
        $syncResult = $sync
            ? $this->menuPermissionSync->sync()
            : [
                'menus_ensured' => 0,
                'permissions_backfilled' => 0,
                'permissions_created' => 0,
                'role_assignments' => 0,
                'navigable_menus' => 0,
                'missing_before' => 0,
                'uncovered_after' => 0,
            ];

        $this->validPermissionNames = null;

        return [
            'tree' => $this->buildTree(),
            'coverage' => $this->menuPermissionSync->coverage(),
            'sync' => $syncResult,
        ];
    }

    /**
     * @return list<string>
     */
    public function validPermissionNames(): array
    {
        return $this->validPermissionsLookup()->keys()->values()->all();
    }

    /**
     * @return list<array{id: int, title: string, icon: string, route: string|null, permission_name: string|null, permission_valid: bool, children: list<mixed>}>
     */
    public function buildTree(): array
    {
        $valid = $this->validPermissionsLookup();

        /** @var Collection<int, Menu> $indexed */
        $indexed = Menu::query()->orderBy('order')->get()->keyBy('id');

        $build = function (?int $parentId = null) use (&$build, $indexed, $valid): array {
            return $indexed
                ->filter(fn (Menu $menu) => $menu->parent_id === $parentId)
                ->map(function (Menu $menu) use (&$build, $valid): array {
                    $children = $build($menu->id);
                    $permissionName = $menu->permission_name ?: null;

                    // ถ้ามี route แต่ยังไม่มี permission ให้ derive เพื่อแสดงใน UI
                    if ($permissionName === null && filled($menu->route)) {
                        $permissionName = $this->menuPermissionSync->permissionNameFromRoute(
                            (string) $menu->route,
                            (string) $menu->title,
                        );
                    }

                    return [
                        'id' => $menu->id,
                        'title' => $menu->title,
                        'icon' => $menu->icon ?: 'Folder',
                        'route' => $menu->route,
                        'permission_name' => $permissionName,
                        'permission_valid' => $permissionName !== null && $valid->has($permissionName),
                        'children' => $children,
                    ];
                })
                ->filter(function (array $node): bool {
                    // เก็บโฟลเดอร์ที่มีลูก หรือใบที่มีสิทธิ์ใช้งานได้ หรือใบที่มี route (รอซิงก์)
                    if ($node['children'] !== []) {
                        return true;
                    }

                    if ($node['permission_name'] === null) {
                        return false;
                    }

                    return $node['permission_valid'] || filled($node['route'] ?? null);
                })
                ->values()
                ->all();
        };

        return $build();
    }

    /**
     * @return list<array{id: int, name: string, group: string|null}>
     */
    public function extraPermissions(): array
    {
        $menuPermissionNames = Menu::query()
            ->whereNotNull('permission_name')
            ->pluck('permission_name')
            ->unique()
            ->values();

        return Permission::query()
            ->whereNotIn('name', $menuPermissionNames)
            ->orderBy('group')
            ->orderBy('name')
            ->get()
            ->map(fn (Permission $permission) => [
                'id' => $permission->id,
                'name' => $permission->name,
                'group' => $permission->group,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<string>
     */
    public function menuPermissionNames(): array
    {
        return Menu::query()
            ->whereNotNull('permission_name')
            ->pluck('permission_name')
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @param  list<string>  $requested
     * @return list<string>
     */
    public function filterAssignablePermissions(array $requested): array
    {
        if ($requested === []) {
            return [];
        }

        $valid = $this->validPermissionsLookup();

        return collect($requested)
            ->filter(fn (mixed $name) => is_string($name) && $name !== '' && $valid->has($name))
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @return Collection<string, int>
     */
    private function validPermissionsLookup(): Collection
    {
        if ($this->validPermissionNames === null) {
            $this->validPermissionNames = Permission::query()
                ->pluck('id', 'name');
        }

        return $this->validPermissionNames;
    }
}
