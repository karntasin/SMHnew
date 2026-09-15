<?php

namespace App\Http\Controllers;

use App\Models\SettingApp;
use App\Models\TeamHa;
use App\Models\TeamHaMember;
use App\Models\User;
use App\Services\ThaiPdfService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class TeamhaController extends Controller
{
    public function index(Request $request)
    {
        $query = TeamHa::query()->withCount('members');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('abbreviation', 'like', "%{$search}%")
                    ->orWhere('name_th', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%");
            });
        }

        $teams = $query->orderBy('abbreviation')->paginate(15)->withQueryString();

        return Inertia::render('settings/teamha/Index', [
            'teams' => $teams,
            'filters' => $request->only(['search']),
        ]);
    }

    public function create()
    {
        return Inertia::render('settings/teamha/Form', $this->formProps());
    }

    public function store(Request $request)
    {
        $validated = $this->validateTeam($request);

        DB::transaction(function () use ($validated) {
            $team = TeamHa::create([
                'abbreviation' => $validated['abbreviation'],
                'name_th' => $validated['name_th'],
                'name_en' => $validated['name_en'] ?? null,
            ]);

            $this->syncMembers($team, $validated['members'] ?? []);
        });

        return redirect()->route('settings.teamha.index')
            ->with('success', 'เพิ่มทีม HA สำเร็จ');
    }

    public function edit(TeamHa $teamha)
    {
        $teamha->load(['members.user:id,name,position']);

        return Inertia::render('settings/teamha/Form', array_merge($this->formProps(), [
            'team' => [
                'id' => $teamha->id,
                'abbreviation' => $teamha->abbreviation,
                'name_th' => $teamha->name_th,
                'name_en' => $teamha->name_en,
                'members' => $teamha->members->map(fn (TeamHaMember $m) => [
                    'id' => $m->id,
                    'user_id' => $m->user_id,
                    'name' => $m->name,
                    'role' => $m->role,
                    'job_title' => $m->job_title,
                    'sort_order' => $m->sort_order,
                ])->values(),
            ],
        ]));
    }

    public function update(Request $request, TeamHa $teamha)
    {
        $validated = $this->validateTeam($request, $teamha);

        DB::transaction(function () use ($validated, $teamha) {
            $teamha->update([
                'abbreviation' => $validated['abbreviation'],
                'name_th' => $validated['name_th'],
                'name_en' => $validated['name_en'] ?? null,
            ]);

            $this->syncMembers($teamha, $validated['members'] ?? []);
        });

        return redirect()->route('settings.teamha.index')
            ->with('success', 'แก้ไขทีม HA สำเร็จ');
    }

    public function destroy(TeamHa $teamha)
    {
        $teamha->delete();

        return redirect()->route('settings.teamha.index')
            ->with('success', 'ลบทีม HA สำเร็จ');
    }

    public function exportPdf(Request $request, ThaiPdfService $pdf): Response
    {
        $teamId = $request->integer('team_id') ?: null;

        $teamsQuery = TeamHa::query()
            ->with(['members' => fn ($q) => $q->with('user:id,name,position')])
            ->orderBy('abbreviation');

        if ($teamId) {
            $teamsQuery->where('id', $teamId);
        }

        $teams = $teamsQuery->get();
        $setting = SettingApp::first();
        [$fontRegularUri, $fontBoldUri] = $pdf->fontUris();

        $html = view('settings.teamha-members-pdf', [
            'teams' => $teams,
            'roles' => TeamHaMember::ROLES,
            'appName' => $setting?->nama_app ?: config('app.name'),
            'generatedAt' => now()->timezone(config('app.timezone'))->format('d/m/Y H:i'),
            'singleTeam' => (bool) $teamId,
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
        ])->render();

        $filename = $teamId && $teams->first()
            ? 'ทีมHA-'.$teams->first()->abbreviation.'-สมาชิก.pdf'
            : 'รายงานรายชื่อทีมHA.pdf';

        return response($pdf->render($html, 'portrait'), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }

    private function formProps(): array
    {
        return [
            'users' => User::query()
                ->orderBy('name')
                ->get(['id', 'name', 'position'])
                ->map(fn (User $u) => [
                    'id' => $u->id,
                    'name' => $u->display_name,
                    'position' => $u->position,
                ]),
            'roleOptions' => TeamHaMember::roleOptions(),
        ];
    }

    private function validateTeam(Request $request, ?TeamHa $team = null): array
    {
        return $request->validate([
            'abbreviation' => [
                'required',
                'string',
                'max:50',
                Rule::unique('teamha', 'abbreviation')->ignore($team?->id),
            ],
            'name_th' => ['required', 'string', 'max:255'],
            'name_en' => ['nullable', 'string', 'max:255'],
            'members' => ['nullable', 'array'],
            'members.*.user_id' => ['nullable', 'integer', 'exists:users,id'],
            'members.*.name' => ['required', 'string', 'max:255'],
            'members.*.role' => ['required', Rule::in(array_keys(TeamHaMember::ROLES))],
            'members.*.job_title' => ['nullable', 'string', 'max:255'],
            'members.*.sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
    }

    private function syncMembers(TeamHa $team, array $members): void
    {
        $team->members()->delete();

        foreach (array_values($members) as $index => $member) {
            $name = trim((string) ($member['name'] ?? ''));
            if ($name === '') {
                continue;
            }

            $team->members()->create([
                'user_id' => $member['user_id'] ?? null,
                'name' => $name,
                'role' => $member['role'],
                'job_title' => $member['job_title'] ?? null,
                'sort_order' => $member['sort_order'] ?? $index,
            ]);
        }
    }
}
