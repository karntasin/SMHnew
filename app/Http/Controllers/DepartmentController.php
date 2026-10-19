<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\DepartmentLeader;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class DepartmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Department::query()->with(['leaders.user:id,name']);

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $departments = $query->orderBy('name')->paginate(15)->withQueryString();

        return Inertia::render('settings/departments/Index', [
            'departments' => $departments,
            'filters' => $request->only(['search']),
        ]);
    }

    public function create()
    {
        return Inertia::render('settings/departments/Form', $this->formProps());
    }

    public function store(Request $request)
    {
        $validated = $this->validateDepartment($request);
        $leaders = $validated['leaders'] ?? [];
        unset($validated['leaders']);
        $validated['is_active'] = $validated['is_active'] ?? true;

        DB::transaction(function () use ($validated, $leaders) {
            $department = Department::create($validated);
            $this->syncLeaders($department, $leaders);
        });

        return redirect()->route('settings.departments.index')
            ->with('success', 'เพิ่มแผนกสำเร็จ');
    }

    public function edit(Department $department)
    {
        $department->load(['leaders.user:id,name']);

        return Inertia::render('settings/departments/Form', array_merge($this->formProps(), [
            'department' => [
                'id' => $department->id,
                'name' => $department->name,
                'code' => $department->code,
                'description' => $department->description,
                'is_active' => $department->is_active,
                'leaders' => $department->leaders->map(fn (DepartmentLeader $leader) => [
                    'id' => $leader->id,
                    'user_id' => $leader->user_id,
                    'name' => $leader->user?->display_name,
                    'role' => $leader->role,
                    'sort_order' => $leader->sort_order,
                ])->values(),
            ],
        ]));
    }

    public function update(Request $request, Department $department)
    {
        $validated = $this->validateDepartment($request, $department);
        $leaders = $validated['leaders'] ?? [];
        unset($validated['leaders']);

        DB::transaction(function () use ($validated, $leaders, $department) {
            $department->update($validated);
            $this->syncLeaders($department, $leaders);
        });

        return redirect()->route('settings.departments.index')
            ->with('success', 'แก้ไขแผนกสำเร็จ');
    }

    public function destroy(Department $department)
    {
        $department->delete();

        return redirect()->route('settings.departments.index')
            ->with('success', 'ลบแผนกสำเร็จ');
    }

    private function formProps(): array
    {
        return [
            'users' => User::query()
                ->orderBy('name')
                ->get(['id', 'name', 'position'])
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->display_name,
                    'position' => $user->position,
                ]),
            'roleOptions' => DepartmentLeader::roleOptions(),
        ];
    }

    private function validateDepartment(Request $request, ?Department $department = null): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50', Rule::unique('departments', 'code')->ignore($department?->id)],
            'description' => ['nullable', 'string', 'max:500'],
            'is_active' => ['boolean'],
            'leaders' => ['nullable', 'array'],
            'leaders.*.user_id' => ['required', 'integer', 'exists:users,id', 'distinct'],
            'leaders.*.role' => ['required', Rule::in(array_keys(DepartmentLeader::ROLES))],
            'leaders.*.sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        if (array_key_exists('code', $validated) && $validated['code'] === '') {
            $validated['code'] = null;
        }

        return $validated;
    }

    private function syncLeaders(Department $department, array $leaders): void
    {
        $department->leaders()->delete();

        $userIds = [];
        foreach (array_values($leaders) as $index => $leader) {
            $userId = (int) ($leader['user_id'] ?? 0);
            if ($userId <= 0) {
                continue;
            }

            $department->leaders()->create([
                'user_id' => $userId,
                'role' => $leader['role'],
                'sort_order' => $leader['sort_order'] ?? $index,
            ]);
            $userIds[] = $userId;
        }

        $this->grantHeaderRoles(array_values(array_unique($userIds)));
    }

    private function grantHeaderRoles(array $userIds): void
    {
        if ($userIds === []) {
            return;
        }

        $role = $this->headerRole();

        User::query()
            ->whereIn('id', $userIds)
            ->get()
            ->each(function (User $user) use ($role) {
                if ($user->hasAnyRole(['header', 'Header'])) {
                    return;
                }

                $user->assignRole($role);
            });
    }

    private function headerRole(): Role
    {
        $existing = Role::query()
            ->where('guard_name', 'web')
            ->whereIn('name', ['header', 'Header'])
            ->orderByRaw("CASE WHEN name = 'header' THEN 0 ELSE 1 END")
            ->first();

        return $existing ?? Role::findOrCreate('header', 'web');
    }
}
