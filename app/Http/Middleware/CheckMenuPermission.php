<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Menu;

class CheckMenuPermission
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return redirect()->guest(url('/login'));
        }

        $routeName = $request->route()?->getName();
        $currentRoute = $request->route()->uri();

        if (in_array($routeName, [
            'dashboard',
            'dashboard.stats',
            'dashboard.monthly-visits',
            'dashboard.pdf',
            'dashboard.cv-risk-report',
        ], true)) {
            return $next($request);
        }

        $menu = null;
        if ($routeName) {
            $menu = Menu::where('route', $routeName)->first();
        }
        if (! $menu) {
            $menu = Menu::where('route', '/' . ltrim($currentRoute, '/'))->first();
        }

        // Jika menu ditemukan dan punya permission
        if ($menu && $menu->permission_name) {
            if (! $this->userCanAccessMenu($user, $menu->permission_name)) {
                abort(403, 'Anda tidak memiliki izin untuk mengakses halaman ini.');
            }
        }

        return $next($request);
    }

    /**
     * @return list<string>
     */
    private function legacyPermissionFallbacks(string $permissionName): array
    {
        $map = [
            'settings.positions.index' => ['settings-view', 'positions-view'],
            'settings.teamha.index' => ['settings-view', 'teamha-view'],
            'settings.departments.index' => ['settings-view', 'departments-view'],
            'settings.staff.index' => ['settings-view', 'users-view'],
            'setting.edit' => ['settings-view', 'app-settings-view'],
            'setting.database' => ['settings-view', 'app-settings-view'],
            'users.index' => ['access-view', 'users-view'],
            'roles.index' => ['access-view', 'roles-view'],
            'permissions.index' => ['access-view', 'permission-view'],
            'menus.index' => ['settings-view', 'menu-view'],
            'audit-logs.index' => ['utilities-view', 'log-view'],
            'backup.index' => ['settings-view', 'backup-view'],
            'files.index' => ['utilities-view', 'filemanager-view'],
            'finance.cgd.precheck' => ['finance.cgd.dashboard'],
        ];

        return $map[$permissionName] ?? [];
    }

    private function userCanAccessMenu($user, string $permissionName): bool
    {
        if ($user->can($permissionName)) {
            return true;
        }

        if (method_exists($user, 'hasAnyRole') && $user->hasAnyRole(['admin', 'superUser'])) {
            return true;
        }

        foreach ($this->legacyPermissionFallbacks($permissionName) as $fallback) {
            if ($user->can($fallback)) {
                return true;
            }
        }

        return false;
    }
}
