<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with(['roles', 'positions'])->latest();

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->paginate(10)->withQueryString();
        $allRoles = Role::all(['id', 'name']);

        return Inertia::render('users/Index', [
            'users' => $users,
            'filters' => $request->only(['search']),
            'allRoles' => $allRoles,
        ]);
    }

    public function create()
    {
        $roles = Role::all();
        $positions = \App\Models\Position::orderBy('name')->get();

        return Inertia::render('users/Form', [
            'roles' => $roles,
            'positions' => $positions,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'role'     => ['required', Rule::exists('roles', 'name')],
            'positions' => ['nullable', 'array'],
            'positions.*' => ['exists:positions,id'],
        ]);

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $user->assignRole($validated['role']);

        if (isset($validated['positions'])) {
            $user->positions()->sync($validated['positions']);
        }

        return redirect()->route('users.index')->with('success', 'สร้างผู้ใช้งานสำเร็จ');
    }

    public function edit(User $user)
    {
        $roles = Role::all();
        $positions = \App\Models\Position::orderBy('name')->get();

        return Inertia::render('users/Form', [
            'user'         => array_merge(
                $user->only(['id', 'name', 'email']),
                [
                    'positions' => $user->positions->pluck('id')->toArray(),
                ]
            ),
            'roles'        => $roles,
            'positions'     => $positions,
            'currentRole'  => $user->roles->pluck('name')->first(), // satu role saja
        ]);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:6'],
            'role'     => ['required', Rule::exists('roles', 'name')],
            'positions' => ['nullable', 'array'],
            'positions.*' => ['exists:positions,id'],
        ]);

        $user->update([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => $validated['password']
                ? Hash::make($validated['password'])
                : $user->password,
        ]);

        $user->syncRoles([$validated['role']]);

        if (isset($validated['positions'])) {
            $user->positions()->sync($validated['positions']);
        }

        return redirect()->route('users.index')->with('success', 'อัปเดตข้อมูลผู้ใช้งานสำเร็จ');
    }

    public function destroy(User $user)
    {
        $user->delete();

        return redirect()->route('users.index')->with('success', 'ลบผู้ใช้งานสำเร็จ');
    }

    public function resetPassword(User $user)
    {
        $user->update([
            'password' => Hash::make('ResetPasswordNya'),
        ]);

        return redirect()->back()->with('success', 'รีเซ็ตรหัสผ่านเป็นค่าเริ่มต้นสำเร็จ');
    }

    public function updateRoles(Request $request, User $user)
    {
        $request->validate([
            'roles' => 'array'
        ]);

        $user->syncRoles($request->roles);

        return back()->with('success', 'อัปเดตบทบาทเรียบร้อยแล้ว');
    }

    public function bulkRolesIndex()
    {
        $users = User::with('roles')->orderBy('name')->get(['id', 'name', 'email']);
        $roles = Role::all(['id', 'name']);

        return Inertia::render('users/BulkRoles', [
            'users' => $users,
            'roles' => $roles,
        ]);
    }

    public function bulkRolesUpdate(Request $request)
    {
        $validated = $request->validate([
            'userIds' => ['required', 'array'],
            'userIds.*' => ['exists:users,id'],
            'roleName' => ['required', 'exists:roles,name'],
            'action' => ['required', 'in:sync'],
        ]);

        $users = User::whereIn('id', $validated['userIds'])->get();
        $role = $validated['roleName'];

        foreach ($users as $user) {
            // Always sync to enforce single role
            $user->syncRoles([$role]);
        }

        // Clear permission cache to ensure fresh data
        app()->make(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        return redirect()->route('users.bulk-roles')->with('success', 'อัปเดตบทบาทผู้ใช้งานเรียบร้อยแล้ว');
    }
}
