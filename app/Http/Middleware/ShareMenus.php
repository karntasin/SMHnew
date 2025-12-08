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

        Inertia::share('menus', function () use ($user) {
            if (!$user) return [];

            // Ambil semua menu secara flat
            $allMenus = Menu::orderBy('order')->get();

            // Index berdasarkan ID
            $indexed = $allMenus->keyBy('id');

            // Helper function to convert route name to URL
            $getRouteUrl = function ($routeName) {
                if (!$routeName) return null;
                // If already a URL path, return as-is
                if (str_starts_with($routeName, '/') || str_starts_with($routeName, 'http')) {
                    return $routeName;
                }
                // Try to convert route name to URL
                try {
                    return route($routeName, [], false); // false = relative URL
                } catch (\Exception $e) {
                    return null;
                }
            };

            // Recursive builder (filtered by permission)
            $buildTree = function ($parentId = null) use (&$buildTree, $indexed, $user, $getRouteUrl) {
                return $indexed
                    ->filter(function ($menu) use ($parentId, $user, $getRouteUrl) {
                        if ($menu->parent_id !== $parentId) return false;

                        // Special check for Technician menu
                        if ($menu->route === 'technician.work-orders.index') {
                            $technicianPositions = ['ช่างส่งกำลัง', 'ช่างIT', 'ช่างไฟฟ้า', 'ช่างประปา', 'ช่างทั่วไป'];
                            $userPositions = $user->positions->pluck('name')->toArray();

                            if (!empty(array_intersect($technicianPositions, $userPositions))) {
                                return true;
                            }
                        }

                        return !$menu->permission_name || $user->can($menu->permission_name);
                    })
                    ->map(function ($menu) use (&$buildTree, $getRouteUrl) {
                        $menuData = [
                            'id' => $menu->id,
                            'title' => $menu->title,
                            'icon' => $menu->icon,
                            'route' => $getRouteUrl($menu->route),
                            'children' => $buildTree($menu->id)->values(),
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
