<?php

namespace App\Services;

use App\Models\Menu;
use Illuminate\Support\Collection;
use Spatie\Permission\Models\Permission;

class RoleAccessMenuService
{
    /** @var Collection<string, int>|null */
    private ?Collection $validPermissionNames = null;

    /**
     * @return list<string>
     */
    public function validPermissionNames(): array
    {
        return $this->validPermissionsLookup()->keys()->values()->all();
    }

    /**
     * @return list<array{id: int, title: string, icon: string, permission_name: string|null, permission_valid: bool, children: list<mixed>}>
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
                    $permissionName = $menu->permission_name;

                    return [
                        'id' => $menu->id,
                        'title' => $menu->title,
                        'icon' => $menu->icon ?: 'Folder',
                        'permission_name' => $permissionName,
                        'permission_valid' => $permissionName !== null && $valid->has($permissionName),
                        'children' => $children,
                    ];
                })
                ->filter(function (array $node): bool {
                    if ($node['children'] !== []) {
                        return true;
                    }

                    if ($node['permission_name'] === null) {
                        return false;
                    }

                    return $node['permission_valid'];
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
