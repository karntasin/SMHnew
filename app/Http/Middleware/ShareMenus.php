<?php

namespace App\Http\Middleware;

use App\Models\Menu;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class ShareMenus
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        $routeName = (string) $request->route()?->getName();
        $inventoryCatalog = str_starts_with($routeName, 'pharmacy.supplies.')
            ? 'nondrug'
            : (str_starts_with($routeName, 'pharmacy.inventory.') ? 'drug' : null);
        Inertia::share('inventoryCatalog', $inventoryCatalog);

        Inertia::share('menus', function () use ($user) {
            if (!$user) return [];

            // Ambil semua menu secara flat
            $allMenus = Menu::orderBy('order')->get();

            // Index berdasarkan ID
            $indexed = $allMenus->keyBy('id');

            // Helper function to convert route name to URL
            $getRouteUrl = function ($routeName) {
                return app_route_url($routeName);
            };

            // Recursive builder (filtered by permission)
            $buildTree = function ($parentId = null) use (&$buildTree, $indexed, $user, $getRouteUrl) {
                return $indexed
                    ->filter(function ($menu) use ($parentId, $user, $indexed) {
                        if ($menu->parent_id !== $parentId) return false;

                        if (in_array((string) $menu->route, ['dashboard', '/dashboard'], true)
                            || $menu->permission_name === 'dashboard-view') {
                            return true;
                        }

                        // Special check for Technician menu
                        if ($menu->route === 'technician.work-orders.index') {
                            $technicianPositions = ['ช่างส่งกำลัง', 'ช่างIT', 'ช่างไฟฟ้า', 'ช่างประปา', 'ช่างทั่วไป'];
                            $userPositions = $user->positions->pluck('name')->toArray();

                            if (!empty(array_intersect($technicianPositions, $userPositions))) {
                                return true;
                            }
                        }

                        // Settings Hub: เห็นได้ถ้ามีสิทธิ์ hub หรือเมนูย่อยอย่างน้อยหนึ่งรายการ
                        if (in_array($menu->route, ['settings.hub', 'km.learn.hub'], true)) {
                            if (! $menu->permission_name || $user->can($menu->permission_name) || $user->can('km.learn.dashboard')) {
                                return true;
                            }

                            return $indexed
                                ->filter(fn ($child) => (int) $child->parent_id === (int) $menu->id)
                                ->contains(function ($child) use ($user) {
                                    return filled($child->permission_name) && $user->can($child->permission_name);
                                });
                        }

                        return !$menu->permission_name || $user->can($menu->permission_name);
                    })
                    ->map(function ($menu) use (&$buildTree, $getRouteUrl) {
                        // Settings Hub, Learning Hub & HA Hub: sidebar แสดงลิงก์เดียว ไม่ขยายเมนูย่อย
                        $children = in_array($menu->route, ['settings.hub', 'km.learn.hub', '/ha', 'ha.hub'], true)
                            ? collect()
                            : $buildTree($menu->id)->values();

                        $menuData = [
                            'id' => $menu->id,
                            'title' => $menu->title,
                            'icon' => $menu->icon,
                            'route' => $getRouteUrl($menu->route),
                            'children' => $children,
                        ];
                        return (object) $menuData;
                    })
                    ->filter(
                        fn($menu) =>
                        $menu->route || (isset($menu->children) && count($menu->children) > 0)
                    )
                    ->values();
            };

            $menus = $buildTree();

            return $menus;
        });

        return $next($request);
    }
}
