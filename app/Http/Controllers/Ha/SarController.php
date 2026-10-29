<?php

namespace App\Http\Controllers\Ha;

use App\Http\Controllers\Controller;
use App\Models\SarCycle;
use App\Models\SarPart;
use App\Models\SarSection;
use App\Models\SarRevision;
use App\Models\SarAttachment;
use App\Models\TeamHa;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class SarController extends Controller
{
    /**
     * Dashboard / Part overview page.
     */
    public function index(Request $request): Response
    {
        $year = $request->query('year');
        $cycle = $year 
            ? SarCycle::where('year', $year)->first() 
            : (SarCycle::where('is_current', true)->first() ?? SarCycle::latest()->first());

        $availableCycles = SarCycle::orderByDesc('year')->get(['id', 'year', 'title', 'is_current']);

        $parts = SarPart::with(['sections' => function ($q) {
            $q->select('id', 'sar_part_id', 'code', 'title', 'status', 'current_version', 'updated_at')
              ->orderBy('order');
        }])
        ->when($cycle, fn($q) => $q->where('sar_cycle_id', $cycle->id))
        ->orderBy('order')
        ->get();

        $stats = [
            'total_sections' => SarSection::count(),
            'completed' => SarSection::where('status', 'completed')->count(),
            'in_progress' => SarSection::where('status', 'in_progress')->count(),
            'draft' => SarSection::where('status', 'draft')->count(),
            'latest_revisions' => SarRevision::with(['section', 'creator'])
                ->orderByDesc('created_at')
                ->take(5)
                ->get(),
        ];

        return Inertia::render('Ha/Sar/Index', [
            'currentCycle' => $cycle,
            'availableCycles' => $availableCycles,
            'parts' => $parts,
            'stats' => $stats,
        ]);
    }

    /**
     * Show all sections within a specific Part (I, II, III, IV).
     */
    public function showPart(string $partNumber): Response
    {
        $part = SarPart::with(['sections' => function ($q) {
            $q->with(['leadTeam', 'lastModifiedUser'])->orderBy('order');
        }, 'cycle'])
        ->where('part_number', strtoupper($partNumber))
        ->firstOrFail();

        $allParts = SarPart::orderBy('order')->get(['id', 'part_number', 'part_name']);

        return Inertia::render('Ha/Sar/PartView', [
            'part' => $part,
            'allParts' => $allParts,
        ]);
    }

    /**
     * Detail & editor for a single SAR section.
     */
    public function editSection(SarSection $section): Response
    {
        $section->load([
            'part.cycle',
            'leadTeam',
            'lastModifiedUser',
            'attachments.uploader',
            'revisions' => fn($q) => $q->with('creator')->take(10)
        ]);

        $haTeams = TeamHa::orderBy('name_th')->get(['id', 'name_th', 'abbreviation']);

        // Adjacent sections for quick navigation
        $adjacent = [
            'prev' => SarSection::where('sar_part_id', $section->sar_part_id)
                ->where('order', '<', $section->order)
                ->orderByDesc('order')
                ->first(['id', 'code', 'title']),
            'next' => SarSection::where('sar_part_id', $section->sar_part_id)
                ->where('order', '>', $section->order)
                ->orderBy('order')
                ->first(['id', 'code', 'title']),
        ];

        return Inertia::render('Ha/Sar/SectionEditor', [
            'section' => $section,
            'haTeams' => $haTeams,
            'adjacent' => $adjacent,
        ]);
    }

    /**
     * Update section content, increment version, and create revision snapshot.
     */
    public function updateSection(Request $request, SarSection $section): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'requirement' => 'nullable|string',
            'context' => 'nullable|string',
            'self_assessment_data' => 'nullable|array',
            'process_content' => 'nullable|string',
            'achievements' => 'nullable|string',
            'results_kpi_data' => 'nullable|array',
            'lead_team_id' => 'nullable|exists:teamha,id',
            'lead_person_name' => 'nullable|string|max:255',
            'status' => 'required|in:draft,in_progress,completed,approved',
            'change_summary' => 'nullable|string|max:255',
        ]);

        DB::connection('mysql')->transaction(function () use ($section, $validated, $request) {
            $user = $request->user();
            $newVersion = $section->current_version + 1;

            $section->update([
                'title' => $validated['title'],
                'requirement' => $validated['requirement'] ?? null,
                'context' => $validated['context'] ?? null,
                'self_assessment_data' => $validated['self_assessment_data'] ?? null,
                'process_content' => $validated['process_content'] ?? null,
                'achievements' => $validated['achievements'] ?? null,
                'results_kpi_data' => $validated['results_kpi_data'] ?? null,
                'lead_team_id' => $validated['lead_team_id'] ?? null,
                'lead_person_name' => $validated['lead_person_name'] ?? null,
                'status' => $validated['status'],
                'current_version' => $newVersion,
                'last_modified_by' => $user?->id,
            ]);

            // Create revision snapshot
            SarRevision::create([
                'sar_section_id' => $section->id,
                'version_number' => $newVersion,
                'change_summary' => $validated['change_summary'] ?: 'แก้ไขและบันทึกข้อมูลเนื้อหา',
                'snapshot_data' => $section->createSnapshot(),
                'created_by' => $user?->id,
                'created_at' => now(),
            ]);
        });

        return redirect()->back()->with('success', 'บันทึกข้อมูลและจัดเก็บเวอร์ชันใหม่สำเร็จ');
    }

    /**
     * Get revision history for a section.
     */
    public function revisions(SarSection $section)
    {
        $revisions = $section->revisions()
            ->with('creator:id,name')
            ->orderByDesc('version_number')
            ->get();

        return response()->json([
            'section_id' => $section->id,
            'current_version' => $section->current_version,
            'revisions' => $revisions,
        ]);
    }

    /**
     * Restore a previous revision snapshot.
     */
    public function restoreRevision(SarSection $section, SarRevision $revision, Request $request): RedirectResponse
    {
        if ($revision->sar_section_id !== $section->id) {
            abort(404, 'Revision does not belong to this section.');
        }

        $snapshot = $revision->snapshot_data;
        if (!$snapshot) {
            return redirect()->back()->with('error', 'ไม่พบข้อมูล Snapshot ในรุ่นนี้');
        }

        DB::connection('mysql')->transaction(function () use ($section, $revision, $snapshot, $request) {
            $user = $request->user();
            $newVersion = $section->current_version + 1;

            $section->update([
                'title' => $snapshot['title'] ?? $section->title,
                'requirement' => $snapshot['requirement'] ?? null,
                'context' => $snapshot['context'] ?? null,
                'self_assessment_data' => $snapshot['self_assessment_data'] ?? null,
                'process_content' => $snapshot['process_content'] ?? null,
                'achievements' => $snapshot['achievements'] ?? null,
                'results_kpi_data' => $snapshot['results_kpi_data'] ?? null,
                'lead_team_id' => $snapshot['lead_team_id'] ?? null,
                'lead_person_name' => $snapshot['lead_person_name'] ?? null,
                'status' => $snapshot['status'] ?? $section->status,
                'current_version' => $newVersion,
                'last_modified_by' => $user?->id,
            ]);

            // Create revision log indicating restoration
            SarRevision::create([
                'sar_section_id' => $section->id,
                'version_number' => $newVersion,
                'change_summary' => "กู้คืนข้อมูล (Restore) ย้อนกลับไปจากเวอร์ชัน #{$revision->version_number}",
                'snapshot_data' => $section->createSnapshot(),
                'created_by' => $user?->id,
                'created_at' => now(),
            ]);
        });

        return redirect()->back()->with('success', "กู้คืนข้อมูลจากเวอร์ชัน #{$revision->version_number} เรียบร้อยแล้ว (สร้างเป็นเวอร์ชันใหม่)");
    }

    /**
     * Print-friendly view for a section.
     */
    public function printSection(SarSection $section): Response
    {
        $section->load(['part.cycle', 'leadTeam', 'lastModifiedUser']);

        return Inertia::render('Ha/Sar/PrintView', [
            'mode' => 'section',
            'section' => $section,
        ]);
    }

    /**
     * Print-friendly view for an entire Part.
     */
    public function printPart(string $partNumber): Response
    {
        $part = SarPart::with(['sections' => function ($q) {
            $q->with('leadTeam')->orderBy('order');
        }, 'cycle'])
        ->where('part_number', strtoupper($partNumber))
        ->firstOrFail();

        return Inertia::render('Ha/Sar/PrintView', [
            'mode' => 'part',
            'part' => $part,
        ]);
    }
}
