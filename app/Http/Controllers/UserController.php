<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\TeamHa;
use App\Models\User;
use App\Services\FshhChat\FshhChatSyncService;
use Collator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
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
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('line_display_name', 'like', "%{$search}%");
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
        [$departments, $haTeams] = $this->organizationOptions();

        return Inertia::render('users/Form', [
            'roles' => $roles,
            'positions' => $positions,
            'departments' => $departments,
            'haTeams' => $haTeams,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate(array_merge([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'role'     => ['required', Rule::exists('roles', 'name')],
            'positions' => ['nullable', 'array'],
            'positions.*' => ['exists:positions,id'],
        ], $this->organizationRules()), $this->organizationMessages());

        $this->assertPrimaryDepartment($validated);

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $user->assignRole($validated['role']);

        if (isset($validated['positions'])) {
            $user->positions()->sync($validated['positions']);
        }

        $this->syncOrganization($user, $validated);
        $this->syncChat($user);

        return redirect()->route('users.index')->with('success', 'สร้างผู้ใช้งานสำเร็จ');
    }

    public function edit(User $user)
    {
        $roles = Role::all();
        $positions = \App\Models\Position::orderBy('name')->get();
        $user->load(['departments', 'haTeams']);
        [$departments, $haTeams] = $this->organizationOptions($user);

        $departmentIds = $user->departments->pluck('id')->map(fn ($id) => (int) $id)->values()->all();
        if ($departmentIds === [] && $user->department_id) {
            $departmentIds = [(int) $user->department_id];
        }

        $primary = $user->departments->first(fn ($dept) => (bool) $dept->pivot->is_primary);
        $primaryId = $primary?->id ?? $user->department_id;

        return Inertia::render('users/Form', [
            'user'         => array_merge(
                $user->only(['id', 'name', 'email']),
                [
                    'positions' => $user->positions->pluck('id')->toArray(),
                    'department_ids' => $departmentIds,
                    'primary_department_id' => $primaryId ? (int) $primaryId : null,
                    'ha_team_ids' => $user->haTeams->pluck('id')->map(fn ($id) => (int) $id)->values()->all(),
                ]
            ),
            'roles'        => $roles,
            'positions'     => $positions,
            'departments' => $departments,
            'haTeams' => $haTeams,
            'currentRole'  => $user->roles->pluck('name')->first(), // satu role saja
        ]);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate(array_merge([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:6'],
            'role'     => ['required', Rule::exists('roles', 'name')],
            'positions' => ['nullable', 'array'],
            'positions.*' => ['exists:positions,id'],
        ], $this->organizationRules()), $this->organizationMessages());

        $this->assertPrimaryDepartment($validated);

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

        $this->syncOrganization($user, $validated);
        $this->syncChat($user);

        return redirect()->route('users.index')->with('success', 'อัปเดตข้อมูลผู้ใช้งานสำเร็จ');
    }

    public function destroy(User $user)
    {
        if ($user->id === auth()->id()) {
            return back()->with('error', 'ไม่สามารถลบบัญชีของตัวเองได้');
        }

        $user->syncRoles([]);
        $user->positions()->detach();
        $user->departments()->detach();
        if (method_exists($user, 'clearMediaCollection')) {
            $user->clearMediaCollection();
        }

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

    /**
     * @return array{0: \Illuminate\Support\Collection<int, Department>, 1: \Illuminate\Support\Collection<int, TeamHa>}
     */
    private function organizationOptions(?User $user = null): array
    {
        $assignedIds = $user
            ? $user->departments->pluck('id')->push($user->department_id)->filter()->unique()->values()->all()
            : [];

        $departments = Department::query()
            ->where(function ($query) use ($assignedIds) {
                $query->where('is_active', true);
                if ($assignedIds !== []) {
                    $query->orWhereIn('id', $assignedIds);
                }
            })
            ->orderBy('name')
            ->get(['id', 'name']);

        $haTeams = TeamHa::query()
            ->orderBy('abbreviation')
            ->get(['id', 'abbreviation', 'name_th']);

        return [$departments, $haTeams];
    }

    /**
     * @return array<string, mixed>
     */
    private function organizationRules(): array
    {
        return [
            'department_ids' => ['required', 'array', 'min:1'],
            'department_ids.*' => ['integer', 'exists:departments,id'],
            'primary_department_id' => ['required', 'integer', 'exists:departments,id'],
            'ha_team_ids' => ['nullable', 'array'],
            'ha_team_ids.*' => ['integer', 'exists:teamha,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    private function organizationMessages(): array
    {
        return [
            'department_ids.required' => 'กรุณาเลือกแผนกอย่างน้อย 1 แผนก',
            'department_ids.min' => 'กรุณาเลือกแผนกอย่างน้อย 1 แผนก',
            'primary_department_id.required' => 'กรุณาเลือกแผนกหลัก',
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function assertPrimaryDepartment(array $validated): void
    {
        $selected = array_map('intval', $validated['department_ids']);
        if (! in_array((int) $validated['primary_department_id'], $selected, true)) {
            throw ValidationException::withMessages([
                'primary_department_id' => 'แผนกหลักต้องอยู่ในแผนกที่เลือก',
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function syncOrganization(User $user, array $validated): void
    {
        $primaryId = (int) $validated['primary_department_id'];
        $departmentData = [];
        foreach ($validated['department_ids'] as $deptId) {
            $departmentData[(int) $deptId] = [
                'is_primary' => (int) $deptId === $primaryId,
            ];
        }

        $user->departments()->sync($departmentData);
        $user->update(['department_id' => $primaryId]);
        $user->haTeams()->sync($validated['ha_team_ids'] ?? []);
    }

    private function syncChat(User $user): void
    {
        try {
            app(FshhChatSyncService::class)->syncUser($user->fresh(['departments', 'haTeams']) ?? $user);
        } catch (\Throwable $e) {
            Log::warning('S-Chat sync after user update failed: '.$e->getMessage());
        }
    }

    public function directory()
    {
        $pivotUserIds = DB::table('department_user')->distinct()->pluck('user_id');
        $legacyUsers = User::query()
            ->whereNotNull('department_id')
            ->whereNotIn('id', $pivotUserIds->all() ?: [0])
            ->get(['id', 'prefix', 'name', 'position', 'department_id']);

        $memberDepartmentIds = DB::table('department_user')->distinct()->pluck('department_id')
            ->merge($legacyUsers->pluck('department_id'))
            ->unique()
            ->filter()
            ->values();

        $departments = Department::query()
            ->where(function ($query) use ($memberDepartmentIds) {
                $query->where('is_active', true)
                    ->orWhereIn('id', $memberDepartmentIds->all() ?: [0]);
            })
            ->with(['users' => function ($query) {
                $query->select('users.id', 'users.prefix', 'users.name', 'users.position');
            }])
            ->get();

        $departmentGroups = $departments->map(function (Department $department) use ($legacyUsers) {
            $members = $department->users->map(function (User $user) {
                return $this->directoryMember($user, (bool) $user->pivot->is_primary);
            });

            $legacyMembers = $legacyUsers
                ->where('department_id', $department->id)
                ->map(fn (User $user) => $this->directoryMember($user, true));

            return [
                'id' => $department->id,
                'name' => $department->name,
                'code' => $department->code,
                'unassigned' => false,
                'members' => $this->sortDirectoryMembers($members->concat($legacyMembers)->all()),
            ];
        })->all();

        $this->sortDirectoryGroups($departmentGroups);

        $shownDepartmentUserIds = collect($departmentGroups)
            ->flatMap(fn (array $group) => collect($group['members'])->pluck('id'))
            ->unique()
            ->all();
        $unassignedDepartmentUsers = User::query()
            ->whereNotIn('id', $shownDepartmentUserIds ?: [0])
            ->get(['id', 'prefix', 'name', 'position']);
        $unassignedDepartment = $this->sortDirectoryMembers(
            $unassignedDepartmentUsers->map(fn (User $user) => $this->directoryMember($user, false))->all()
        );

        $teams = TeamHa::query()
            ->with(['users' => function ($query) {
                $query->select('users.id', 'users.prefix', 'users.name', 'users.position');
            }])
            ->get();

        $teamGroups = $teams->map(function (TeamHa $team) {
            $label = trim((string) ($team->name_th ?: $team->name_en ?: ''));
            $abbreviation = trim((string) $team->abbreviation);

            return [
                'id' => $team->id,
                'name' => $abbreviation !== '' ? $abbreviation : ($label !== '' ? $label : 'ไม่ระบุชื่อทีม'),
                'code' => null,
                'unassigned' => false,
                'members' => $this->sortDirectoryMembers(
                    $team->users->map(fn (User $user) => $this->directoryMember($user))->all()
                ),
            ];
        })->all();

        $this->sortDirectoryGroups($teamGroups);

        $shownTeamUserIds = collect($teamGroups)
            ->flatMap(fn (array $group) => collect($group['members'])->pluck('id'))
            ->unique()
            ->all();
        $unassignedTeamUsers = User::query()
            ->whereNotIn('id', $shownTeamUserIds ?: [0])
            ->get(['id', 'prefix', 'name', 'position']);
        $unassignedTeam = $this->sortDirectoryMembers(
            $unassignedTeamUsers->map(fn (User $user) => $this->directoryMember($user))->all()
        );

        return Inertia::render('users/Directory', [
            'summary' => [
                'total_users' => User::count(),
                'department_count' => $departments->count(),
                'team_count' => $teams->count(),
            ],
            'departments' => $departmentGroups,
            'teams' => $teamGroups,
            'unassigned_department' => $unassignedDepartment,
            'unassigned_team' => $unassignedTeam,
            'unique_members' => $this->buildUniqueDirectoryMembers(
                $departmentGroups,
                $teamGroups,
                $unassignedDepartment,
                $unassignedTeam,
            ),
        ]);
    }

    /**
     * @param  list<array{id: int|null, name: string, members: list<array{id: int, name: string, position: ?string}>}>  $departmentGroups
     * @param  list<array{id: int|null, name: string, members: list<array{id: int, name: string, position: ?string}>}>  $teamGroups
     * @param  list<array{id: int, name: string, position: ?string}>  $unassignedDepartment
     * @param  list<array{id: int, name: string, position: ?string}>  $unassignedTeam
     * @return list<array{id: int, name: string, position: ?string, departments: list<string>, teams: list<string>}>
     */
    private function buildUniqueDirectoryMembers(
        array $departmentGroups,
        array $teamGroups,
        array $unassignedDepartment,
        array $unassignedTeam,
    ): array {
        $unique = [];

        $ensure = function (array $member) use (&$unique): void {
            $id = $member['id'];
            if (! isset($unique[$id])) {
                $unique[$id] = [
                    'id' => $id,
                    'name' => $member['name'],
                    'prefix' => $member['prefix'] ?? '',
                    'position' => $member['position'] ?? null,
                    'departments' => [],
                    'teams' => [],
                ];
            }
        };

        foreach ($departmentGroups as $group) {
            foreach ($group['members'] as $member) {
                $ensure($member);
                $unique[$member['id']]['departments'][] = $group['name'];
            }
        }

        foreach ($teamGroups as $group) {
            foreach ($group['members'] as $member) {
                $ensure($member);
                $unique[$member['id']]['teams'][] = $group['name'];
            }
        }

        foreach ($unassignedDepartment as $member) {
            $ensure($member);
        }

        foreach ($unassignedTeam as $member) {
            $ensure($member);
        }

        foreach ($unique as &$row) {
            $row['departments'] = array_values(array_unique($row['departments']));
            $row['teams'] = array_values(array_unique($row['teams']));
        }
        unset($row);

        return $this->sortDirectoryMembers(array_values($unique));
    }

    /**
     * @return array{id: int, name: string, position: ?string, is_primary?: bool}
     */
    private function directoryMember(User $user, ?bool $isPrimary = null): array
    {
        $member = [
            'id' => $user->id,
            'name' => $this->directoryDisplayName($user),
            'prefix' => $this->directoryPrefix($user),
            'position' => filled($user->position) ? $user->position : null,
        ];

        if ($isPrimary !== null) {
            $member['is_primary'] = $isPrimary;
        }

        return $member;
    }

    private function directoryPrefix(User $user): string
    {
        $prefix = trim((string) $user->prefix);
        if ($prefix === '' || preg_match('/^\+?\d+$/', $prefix)) {
            return '';
        }

        return $prefix;
    }

    private function directoryDisplayName(User $user): string
    {
        $prefix = $this->directoryPrefix($user);
        $name = trim((string) $user->name);

        if ($name === '') {
            return 'ไม่ระบุชื่อ';
        }

        if ($prefix === '' || str_starts_with($name, $prefix)) {
            return $name;
        }

        return $prefix.' '.$name;
    }

    private function directoryRankOrder(string $prefix): int
    {
        $compact = preg_replace('/\s+/u', '', $prefix) ?? '';
        if ($compact === '') {
            return 400;
        }

        $isSpecial = preg_match('/\(พ\.?\)/u', $compact) === 1;
        $base = preg_replace('/หญิง$/u', '', $compact) ?? $compact;
        $base = preg_replace('/\(พ\.?\)/u', '', $base) ?? $base;

        $ranks = [
            'พล.อ.' => 10,
            'พล.ท.' => 20,
            'พล.ต.' => 30,
            'พ.อ.' => 40,
            'พ.ท.' => 50,
            'พ.ต.' => 60,
            'ร.อ.' => 70,
            'ร.ท.' => 80,
            'ร.ต.' => 90,
            'จ.ส.อ.' => 100,
            'จ.ส.ท.' => 110,
            'จ.ส.ต.' => 120,
            'ส.อ.' => 130,
            'ส.ท.' => 140,
            'ส.ต.' => 150,
        ];

        if (isset($ranks[$base])) {
            return $ranks[$base] - ($isSpecial ? 1 : 0);
        }

        $civilians = [
            'นาย' => 200,
            'นาง' => 210,
            'น.ส.' => 220,
            'น.ส' => 220,
            'นางสาว' => 220,
        ];

        return $civilians[$compact] ?? $civilians[$base] ?? 300;
    }

    private function directorySortName(array $member): string
    {
        $name = (string) ($member['name'] ?? '');
        $prefix = trim((string) ($member['prefix'] ?? ''));
        if ($prefix !== '' && str_starts_with($name, $prefix)) {
            return trim(mb_substr($name, mb_strlen($prefix)));
        }

        return $name;
    }

    /**
     * @param  list<array{id: int, name: string, position: ?string, is_primary?: bool}>  $members
     * @return list<array{id: int, name: string, position: ?string, is_primary?: bool}>
     */
    private function sortDirectoryMembers(array $members): array
    {
        $collator = $this->thaiCollator();
        usort($members, function (array $left, array $right) use ($collator) {
            $rank = $this->directoryRankOrder((string) ($left['prefix'] ?? ''))
                <=> $this->directoryRankOrder((string) ($right['prefix'] ?? ''));
            if ($rank !== 0) {
                return $rank;
            }

            $leftOrder = $this->directoryRankOrder((string) ($left['prefix'] ?? ''));
            if ($leftOrder >= 300) {
                $prefixCompare = $collator
                    ? ($collator->compare((string) ($left['prefix'] ?? ''), (string) ($right['prefix'] ?? '')) ?: 0)
                    : strcasecmp((string) ($left['prefix'] ?? ''), (string) ($right['prefix'] ?? ''));
                if ($prefixCompare !== 0) {
                    return $prefixCompare;
                }
            }

            $leftName = $this->directorySortName($left);
            $rightName = $this->directorySortName($right);
            if (! $collator) {
                return strcasecmp($leftName, $rightName);
            }

            return $collator->compare($leftName, $rightName) ?: 0;
        });

        return array_values($members);
    }

    /**
     * @param  list<array{id: int|null, name: string, code: ?string, unassigned: bool, members: list<array<string, mixed>>}>  $groups
     */
    private function sortDirectoryGroups(array &$groups): void
    {
        $collator = $this->thaiCollator();
        usort($groups, function (array $left, array $right) use ($collator) {
            $leftKey = trim(($left['code'] ? $left['code'].' ' : '').$left['name']);
            $rightKey = trim(($right['code'] ? $right['code'].' ' : '').$right['name']);

            if (! $collator) {
                return strcasecmp($leftKey, $rightKey);
            }

            return $collator->compare($leftKey, $rightKey) ?: 0;
        });
    }

    private function thaiCollator(): ?Collator
    {
        if (! class_exists(Collator::class)) {
            return null;
        }

        $collator = new Collator('th_TH');
        $collator->setAttribute(Collator::NUMERIC_COLLATION, Collator::ON);

        return $collator;
    }
}
