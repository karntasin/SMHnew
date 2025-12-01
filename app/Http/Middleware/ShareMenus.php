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

            // Recursive builder (filtered by permission)
            $buildTree = function ($parentId = null) use (&$buildTree, $indexed, $user) {
                return $indexed
                    ->filter(function ($menu) use ($parentId, $user) {
                        if ($menu->parent_id !== $parentId) return false;

                        // Hide specific menus requested by user
                        $hiddenTitles = ['ระบบแจ้งซ่อม', 'ใบงานซ่อมบำรุง'];
                        if (in_array($menu->title, $hiddenTitles)) {
                            return false;
                        }

                        // Special check for Technician menu
                        if ($menu->route === '/technician/work-orders') {
                            $technicianPositions = ['ช่างส่งกำลัง', 'ช่างIT', 'ช่างไฟฟ้า', 'ช่างประปา', 'ช่างทั่วไป'];
                            $userPositions = $user->positions->pluck('name')->toArray();
                            
                            // Debug logging
                            // \Illuminate\Support\Facades\Log::info('Checking technician menu for user: ' . $user->name);
                            // \Illuminate\Support\Facades\Log::info('User positions: ' . implode(', ', $userPositions));
                            // \Illuminate\Support\Facades\Log::info('Intersect: ' . implode(', ', array_intersect($technicianPositions, $userPositions)));

                            if (!empty(array_intersect($technicianPositions, $userPositions))) {
                                return true;
                            }
                        }

                        return !$menu->permission_name || $user->can($menu->permission_name);
                    })
                    ->map(function ($menu) use (&$buildTree) {
                        $menu->children = $buildTree($menu->id)->values();
                        return $menu;
                    })
                    ->filter(
                        fn($menu) =>
                        $menu->route || $menu->children->isNotEmpty()
                    )
                    ->values();
            };

            $menus = $buildTree();

            // Force specific menus to be leaf nodes (no dropdown)
            $menus->transform(function ($menu) {
                if (in_array($menu->route, ['/quality', '/admin-hub'])) {
                    $menu->children = collect([]);
                }
                return $menu;
            });

            return $menus;
        });

        return $next($request);
    }
}
