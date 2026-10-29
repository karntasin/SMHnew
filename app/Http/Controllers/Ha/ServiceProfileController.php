<?php

namespace App\Http\Controllers\Ha;

use App\Http\Controllers\Controller;
use App\Models\ServiceProfile;
use App\Models\ServiceProfileRevision;
use App\Models\Department;
use App\Models\TeamHa;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class ServiceProfileController extends Controller
{
    /**
     * Display a listing of all Service Profiles with multi-faceted filtering.
     */
    public function index(Request $request): Response
    {
        $departmentId = $request->query('department_id');
        $teamId = $request->query('team_id');
        $serviceGroup = $request->query('service_group');
        $search = $request->query('search');

        $profiles = ServiceProfile::with(['department', 'team', 'lastModifiedUser'])
            ->when($departmentId && $departmentId !== 'all', fn($q) => $q->where('department_id', $departmentId))
            ->when($teamId && $teamId !== 'all', fn($q) => $q->where('team_ha_id', $teamId))
            ->when($serviceGroup && $serviceGroup !== 'all', fn($q) => $q->where('service_group', $serviceGroup))
            ->when($search, fn($q) => $q->where(function ($sub) use ($search) {
                $sub->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('leader_name', 'like', "%{$search}%")
                    ->orWhere('purpose', 'like', "%{$search}%");
            }))
            ->orderBy('order')
            ->get();

        $stats = [
            'total' => ServiceProfile::count(),
            'clinical' => ServiceProfile::where('service_group', 'clinical')->count(),
            'diagnostic_support' => ServiceProfile::where('service_group', 'diagnostic_support')->count(),
            'general_support' => ServiceProfile::where('service_group', 'general_support')->count(),
            'quality_safety' => ServiceProfile::where('service_group', 'quality_safety')->count(),
            'latest_revisions' => ServiceProfileRevision::with(['serviceProfile', 'creator'])
                ->orderByDesc('created_at')
                ->take(5)
                ->get(),
        ];

        $departments = Department::orderBy('name')->get(['id', 'name', 'code']);
        $haTeams = TeamHa::orderBy('name_th')->get(['id', 'name_th', 'abbreviation']);

        return Inertia::render('Ha/ServiceProfile/Index', [
            'profiles' => $profiles,
            'stats' => $stats,
            'departments' => $departments,
            'haTeams' => $haTeams,
            'currentDepartment' => $departmentId ?: 'all',
            'currentTeam' => $teamId ?: 'all',
            'currentGroup' => $serviceGroup ?: 'all',
            'searchQuery' => $search ?: '',
        ]);
    }

    /**
     * Display a single Service Profile in view mode.
     */
    public function show(ServiceProfile $serviceProfile): Response
    {
        $serviceProfile->load([
            'department',
            'team',
            'lastModifiedUser',
            'attachments.uploader',
            'revisions' => fn($q) => $q->with('creator')->take(10)
        ]);

        $allProfiles = ServiceProfile::orderBy('order')->get(['id', 'code', 'name', 'service_group']);

        return Inertia::render('Ha/ServiceProfile/Show', [
            'profile' => $serviceProfile,
            'allProfiles' => $allProfiles,
        ]);
    }

    /**
     * Edit form for a Service Profile.
     */
    public function edit(ServiceProfile $serviceProfile): Response
    {
        $serviceProfile->load([
            'department',
            'team',
            'lastModifiedUser',
            'attachments.uploader',
            'revisions' => fn($q) => $q->with('creator')->take(10)
        ]);

        $departments = Department::orderBy('name')->get(['id', 'name', 'code']);
        $haTeams = TeamHa::orderBy('name_th')->get(['id', 'name_th', 'abbreviation']);

        // Adjacent profiles for quick navigation
        $adjacent = [
            'prev' => ServiceProfile::where('order', '<', $serviceProfile->order)
                ->orderByDesc('order')
                ->first(['id', 'code', 'name']),
            'next' => ServiceProfile::where('order', '>', $serviceProfile->order)
                ->orderBy('order')
                ->first(['id', 'code', 'name']),
        ];

        return Inertia::render('Ha/ServiceProfile/Editor', [
            'profile' => $serviceProfile,
            'departments' => $departments,
            'haTeams' => $haTeams,
            'adjacent' => $adjacent,
        ]);
    }

    /**
     * Update a Service Profile with automated snapshot revisioning.
     */
    public function update(Request $request, ServiceProfile $serviceProfile): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50'],
            'name' => ['required', 'string', 'max:255'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'team_ha_id' => ['nullable', 'exists:teamha,id'],
            'service_group' => ['required', 'in:clinical,diagnostic_support,general_support,quality_safety'],
            'cycle_year' => ['required', 'string', 'max:10'],
            'leader_name' => ['nullable', 'string', 'max:255'],
            'purpose' => ['nullable', 'string'],
            'scope_of_service' => ['nullable', 'string'],
            'target_customers' => ['nullable', 'array'],
            'key_quality_issues' => ['nullable', 'string'],
            'key_risks_challenges' => ['nullable', 'string'],
            'workload_and_resources' => ['nullable', 'array'],
            'key_processes' => ['nullable', 'array'],
            'performance_indicators' => ['nullable', 'array'],
            'current_systems' => ['nullable', 'string'],
            'ongoing_improvements' => ['nullable', 'string'],
            'future_plans' => ['nullable', 'string'],
            'status' => ['required', 'in:draft,review,published'],
            'change_summary' => ['nullable', 'string', 'max:255'],
        ]);

        DB::transaction(function () use ($serviceProfile, $validated, $request) {
            // Save Snapshot of previous state
            $serviceProfile->revisions()->create([
                'version_number' => $serviceProfile->current_version,
                'change_summary' => $validated['change_summary'] ?? 'แก้ไขข้อมูล Service Profile ผ่านระบบจัดการ',
                'snapshot_data' => $serviceProfile->createSnapshot(),
                'created_by' => $request->user()?->id,
                'created_at' => now(),
            ]);

            // Update attributes
            $serviceProfile->update([
                'code' => $validated['code'],
                'name' => $validated['name'],
                'department_id' => $validated['department_id'] ?? null,
                'team_ha_id' => $validated['team_ha_id'] ?? null,
                'service_group' => $validated['service_group'],
                'cycle_year' => $validated['cycle_year'],
                'leader_name' => $validated['leader_name'] ?? null,
                'purpose' => $validated['purpose'] ?? null,
                'scope_of_service' => $validated['scope_of_service'] ?? null,
                'target_customers' => $validated['target_customers'] ?? [],
                'key_quality_issues' => $validated['key_quality_issues'] ?? null,
                'key_risks_challenges' => $validated['key_risks_challenges'] ?? null,
                'workload_and_resources' => $validated['workload_and_resources'] ?? [],
                'key_processes' => $validated['key_processes'] ?? [],
                'performance_indicators' => $validated['performance_indicators'] ?? [],
                'current_systems' => $validated['current_systems'] ?? null,
                'ongoing_improvements' => $validated['ongoing_improvements'] ?? null,
                'future_plans' => $validated['future_plans'] ?? null,
                'status' => $validated['status'],
                'current_version' => $serviceProfile->current_version + 1,
                'last_modified_by' => $request->user()?->id,
            ]);
        });

        return redirect()
            ->route('ha.service-profile.show', $serviceProfile->id)
            ->with('success', "บันทึกข้อมูล Service Profile '{$serviceProfile->name}' เวอร์ชัน #{$serviceProfile->current_version} เรียบร้อยแล้ว");
    }

    /**
     * Restore a Service Profile from a past revision snapshot.
     */
    public function restoreRevision(Request $request, ServiceProfile $serviceProfile, ServiceProfileRevision $revision): RedirectResponse
    {
        if ($revision->service_profile_id !== $serviceProfile->id) {
            abort(403, 'ประวัติเวอร์ชันนี้ไม่ตรงกับหน่วยงานที่เลือก');
        }

        $snapshot = $revision->snapshot_data;
        if (!is_array($snapshot)) {
            return back()->with('error', 'ไม่พบข้อมูล Snapshot สำหรับกู้คืน');
        }

        DB::transaction(function () use ($serviceProfile, $revision, $snapshot, $request) {
            // Backup current state before restoring
            $serviceProfile->revisions()->create([
                'version_number' => $serviceProfile->current_version,
                'change_summary' => "สำรองอัตโนมัติก่อนกู้คืนค่าจากเวอร์ชัน #{$revision->version_number}",
                'snapshot_data' => $serviceProfile->createSnapshot(),
                'created_by' => $request->user()?->id,
                'created_at' => now(),
            ]);

            // Restore from snapshot
            $serviceProfile->update([
                'code' => $snapshot['code'] ?? $serviceProfile->code,
                'name' => $snapshot['name'] ?? $serviceProfile->name,
                'department_id' => $snapshot['department_id'] ?? $serviceProfile->department_id,
                'team_ha_id' => $snapshot['team_ha_id'] ?? $serviceProfile->team_ha_id,
                'service_group' => $snapshot['service_group'] ?? $serviceProfile->service_group,
                'cycle_year' => $snapshot['cycle_year'] ?? $serviceProfile->cycle_year,
                'leader_name' => $snapshot['leader_name'] ?? $serviceProfile->leader_name,
                'purpose' => $snapshot['purpose'] ?? $serviceProfile->purpose,
                'scope_of_service' => $snapshot['scope_of_service'] ?? $serviceProfile->scope_of_service,
                'target_customers' => $snapshot['target_customers'] ?? [],
                'key_quality_issues' => $snapshot['key_quality_issues'] ?? $serviceProfile->key_quality_issues,
                'key_risks_challenges' => $snapshot['key_risks_challenges'] ?? $serviceProfile->key_risks_challenges,
                'workload_and_resources' => $snapshot['workload_and_resources'] ?? [],
                'key_processes' => $snapshot['key_processes'] ?? [],
                'performance_indicators' => $snapshot['performance_indicators'] ?? [],
                'current_systems' => $snapshot['current_systems'] ?? $serviceProfile->current_systems,
                'ongoing_improvements' => $snapshot['ongoing_improvements'] ?? $serviceProfile->ongoing_improvements,
                'future_plans' => $snapshot['future_plans'] ?? $serviceProfile->future_plans,
                'status' => $snapshot['status'] ?? $serviceProfile->status,
                'current_version' => $serviceProfile->current_version + 1,
                'last_modified_by' => $request->user()?->id,
            ]);
        });

        return redirect()
            ->route('ha.service-profile.show', $serviceProfile->id)
            ->with('success', "กู้คืนข้อมูล Service Profile กลับสู่เวอร์ชัน #{$revision->version_number} เรียบร้อยแล้ว (สร้างเวอร์ชันใหม่ #{$serviceProfile->current_version})");
    }

    /**
     * Printable standard view for a single Service Profile.
     */
    public function print(ServiceProfile $serviceProfile): Response
    {
        $serviceProfile->load([
            'department',
            'team',
            'lastModifiedUser',
        ]);

        return Inertia::render('Ha/ServiceProfile/PrintView', [
            'profile' => $serviceProfile,
        ]);
    }

    /**
     * Executive Overview Master Print View for all or filtered Service Profiles.
     */
    public function overviewPrint(Request $request): Response
    {
        $departmentId = $request->query('department_id');
        $teamId = $request->query('team_id');
        $serviceGroup = $request->query('service_group');

        $profiles = ServiceProfile::with(['department', 'team'])
            ->when($departmentId && $departmentId !== 'all', fn($q) => $q->where('department_id', $departmentId))
            ->when($teamId && $teamId !== 'all', fn($q) => $q->where('team_ha_id', $teamId))
            ->when($serviceGroup && $serviceGroup !== 'all', fn($q) => $q->where('service_group', $serviceGroup))
            ->orderBy('order')
            ->get();

        $stats = [
            'total' => ServiceProfile::count(),
            'clinical' => ServiceProfile::where('service_group', 'clinical')->count(),
            'diagnostic_support' => ServiceProfile::where('service_group', 'diagnostic_support')->count(),
            'general_support' => ServiceProfile::where('service_group', 'general_support')->count(),
            'quality_safety' => ServiceProfile::where('service_group', 'quality_safety')->count(),
            'total_kpis' => (int) ServiceProfile::all()->sum(fn($p) => count($p->performance_indicators ?? [])),
        ];

        return Inertia::render('Ha/ServiceProfile/OverviewPrint', [
            'profiles' => $profiles,
            'currentDepartment' => $departmentId ?: 'all',
            'currentTeam' => $teamId ?: 'all',
            'currentGroup' => $serviceGroup ?: 'all',
            'stats' => $stats,
        ]);
    }
}
