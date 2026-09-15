<?php

namespace App\Http\Controllers;

use App\Services\RoleAccessMenuService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function __construct(
        private readonly RoleAccessMenuService $accessMenuService,
    ) {}

    public function index()
    {
        $roles = Role::with('permissions')->withCount('users')->orderBy('name')->get();

        return Inertia::render('roles/Index', [
            'roles' => $roles,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|unique:roles,name',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string',
        ]);

        $permissions = $this->accessMenuService->filterAssignablePermissions($data['permissions'] ?? []);

        $role = Role::create(['name' => $data['name'], 'guard_name' => 'web']);
        $role->syncPermissions($permissions);

        return redirect()->route('roles.index')->with('success', 'สร้างบทบาทแล้ว');
    }

    public function create()
    {
        return Inertia::render('roles/Form', $this->formPayload());
    }

    public function edit(Role $role)
    {
        $role->load('permissions');

        return Inertia::render('roles/Form', [
            ...$this->formPayload(),
            'role' => $role,
        ]);
    }

    public function update(Request $request, Role $role)
    {
        $data = $request->validate([
            'name' => 'required|unique:roles,name,'.$role->id,
            'permissions' => 'nullable|array',
            'permissions.*' => 'string',
        ]);

        $permissions = $this->accessMenuService->filterAssignablePermissions($data['permissions'] ?? []);

        $role->update(['name' => $data['name']]);
        $role->syncPermissions($permissions);

        return redirect()->route('roles.index')->with('success', 'อัปเดตบทบาทแล้ว');
    }

    public function destroy(Role $role)
    {
        $role->delete();

        return redirect()->route('roles.index')->with('success', 'ลบบทบาทแล้ว');
    }

    /**
     * @return array<string, mixed>
     */
    private function formPayload(): array
    {
        return [
            'accessMenuTree' => $this->accessMenuService->buildTree(),
            'extraPermissions' => $this->accessMenuService->extraPermissions(),
            'validPermissionNames' => $this->accessMenuService->validPermissionNames(),
            'roleTemplates' => Role::query()
                ->with('permissions:id,name')
                ->withCount('permissions')
                ->orderBy('name')
                ->get()
                ->map(fn (Role $role) => [
                    'id' => $role->id,
                    'name' => $role->name,
                    'permissions' => $role->permissions->pluck('name')->values(),
                    'permissions_count' => $role->permissions_count,
                ])
                ->values(),
        ];
    }
}
