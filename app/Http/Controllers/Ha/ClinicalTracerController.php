<?php

namespace App\Http\Controllers\Ha;

use App\Http\Controllers\Controller;
use App\Models\ClinicalTracer;
use App\Models\ClinicalTracerRevision;
use App\Models\TeamHa;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class ClinicalTracerController extends Controller
{
    /**
     * Display a listing of all Clinical Tracers.
     */
    public function index(Request $request): Response
    {
        $category = $request->query('category');
        $search = $request->query('search');

        $tracers = ClinicalTracer::with(['team', 'lastModifiedUser'])
            ->when($category && $category !== 'all', fn($q) => $q->where('category', $category))
            ->when($search, fn($q) => $q->where(function ($sub) use ($search) {
                $sub->where('title', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('subtitle', 'like', "%{$search}%");
            }))
            ->orderBy('order')
            ->get();

        $stats = [
            'total' => ClinicalTracer::count(),
            'emergency' => ClinicalTracer::where('category', 'emergency')->count(),
            'chronic' => ClinicalTracer::where('category', 'chronic')->count(),
            'infectious' => ClinicalTracer::where('category', 'infectious')->count(),
            'mental_health' => ClinicalTracer::where('category', 'mental_health')->count(),
            'latest_revisions' => ClinicalTracerRevision::with(['tracer', 'creator'])
                ->orderByDesc('created_at')
                ->take(5)
                ->get(),
        ];

        return Inertia::render('Ha/ClinicalTracer/Index', [
            'tracers' => $tracers,
            'stats' => $stats,
            'currentCategory' => $category ?: 'all',
            'searchQuery' => $search ?: '',
        ]);
    }

    /**
     * Display a single Clinical Tracer in view mode.
     */
    public function show(ClinicalTracer $tracer): Response
    {
        $tracer->load([
            'team',
            'lastModifiedUser',
            'attachments.uploader',
            'revisions' => fn($q) => $q->with('creator')->take(10)
        ]);

        return Inertia::render('Ha/ClinicalTracer/Show', [
            'tracer' => $tracer,
        ]);
    }

    /**
     * Edit form for a Clinical Tracer.
     */
    public function edit(ClinicalTracer $tracer): Response
    {
        $tracer->load([
            'team',
            'lastModifiedUser',
            'attachments.uploader',
            'revisions' => fn($q) => $q->with('creator')->take(10)
        ]);

        $haTeams = TeamHa::orderBy('name_th')->get(['id', 'name_th', 'abbreviation']);

        // Adjacent tracers for quick navigation
        $adjacent = [
            'prev' => ClinicalTracer::where('order', '<', $tracer->order)
                ->orderByDesc('order')
                ->first(['id', 'code', 'title']),
            'next' => ClinicalTracer::where('order', '>', $tracer->order)
                ->orderBy('order')
                ->first(['id', 'code', 'title']),
        ];

        return Inertia::render('Ha/ClinicalTracer/Editor', [
            'tracer' => $tracer,
            'haTeams' => $haTeams,
            'adjacent' => $adjacent,
        ]);
    }

    /**
     * Update Clinical Tracer content, increment version, and record revision snapshot.
     */
    public function update(Request $request, ClinicalTracer $tracer): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'subtitle' => 'nullable|string|max:255',
            'category' => 'required|in:emergency,chronic,infectious,mental_health,surgical,other',
            'team_ha_id' => 'nullable|exists:teamha,id',
            'lead_doctor_name' => 'nullable|string|max:255',
            'lead_nurse_name' => 'nullable|string|max:255',
            'context' => 'nullable|string',
            'key_issues' => 'nullable|string',
            'goals' => 'nullable|string',
            'processes' => 'nullable|string',
            'kpi_data' => 'nullable|array',
            'results_analysis' => 'nullable|string',
            'next_plans' => 'nullable|string',
            'status' => 'required|in:draft,in_progress,completed,approved',
            'change_summary' => 'nullable|string|max:255',
        ]);

        DB::connection('mysql')->transaction(function () use ($tracer, $validated, $request) {
            $user = $request->user();
            $newVersion = $tracer->current_version + 1;

            $tracer->update([
                'title' => $validated['title'],
                'subtitle' => $validated['subtitle'] ?? null,
                'category' => $validated['category'],
                'team_ha_id' => $validated['team_ha_id'] ?? null,
                'lead_doctor_name' => $validated['lead_doctor_name'] ?? null,
                'lead_nurse_name' => $validated['lead_nurse_name'] ?? null,
                'context' => $validated['context'] ?? null,
                'key_issues' => $validated['key_issues'] ?? null,
                'goals' => $validated['goals'] ?? null,
                'processes' => $validated['processes'] ?? null,
                'kpi_data' => $validated['kpi_data'] ?? null,
                'results_analysis' => $validated['results_analysis'] ?? null,
                'next_plans' => $validated['next_plans'] ?? null,
                'status' => $validated['status'],
                'current_version' => $newVersion,
                'last_modified_by' => $user?->id,
            ]);

            // Create revision snapshot
            ClinicalTracerRevision::create([
                'clinical_tracer_id' => $tracer->id,
                'version_number' => $newVersion,
                'change_summary' => $validated['change_summary'] ?: 'ปรับปรุงข้อมูล Clinical Tracer',
                'snapshot_data' => $tracer->createSnapshot(),
                'created_by' => $user?->id,
                'created_at' => now(),
            ]);
        });

        return redirect()->back()->with('success', 'บันทึกข้อมูล Clinical Tracer และจัดเก็บเวอร์ชันใหม่สำเร็จ');
    }

    /**
     * Get revision history for a Clinical Tracer.
     */
    public function revisions(ClinicalTracer $tracer)
    {
        $revisions = $tracer->revisions()
            ->with('creator:id,name')
            ->orderByDesc('version_number')
            ->get();

        return response()->json([
            'tracer_id' => $tracer->id,
            'current_version' => $tracer->current_version,
            'revisions' => $revisions,
        ]);
    }

    /**
     * Restore a previous revision snapshot.
     */
    public function restoreRevision(ClinicalTracer $tracer, ClinicalTracerRevision $revision, Request $request): RedirectResponse
    {
        if ($revision->clinical_tracer_id !== $tracer->id) {
            abort(404, 'Revision does not belong to this Clinical Tracer.');
        }

        $snapshot = $revision->snapshot_data;
        if (!$snapshot) {
            return redirect()->back()->with('error', 'ไม่พบข้อมูล Snapshot ในรุ่นนี้');
        }

        DB::connection('mysql')->transaction(function () use ($tracer, $revision, $snapshot, $request) {
            $user = $request->user();
            $newVersion = $tracer->current_version + 1;

            $tracer->update([
                'title' => $snapshot['title'] ?? $tracer->title,
                'subtitle' => $snapshot['subtitle'] ?? null,
                'category' => $snapshot['category'] ?? $tracer->category,
                'team_ha_id' => $snapshot['team_ha_id'] ?? null,
                'lead_doctor_name' => $snapshot['lead_doctor_name'] ?? null,
                'lead_nurse_name' => $snapshot['lead_nurse_name'] ?? null,
                'context' => $snapshot['context'] ?? null,
                'key_issues' => $snapshot['key_issues'] ?? null,
                'goals' => $snapshot['goals'] ?? null,
                'processes' => $snapshot['processes'] ?? null,
                'kpi_data' => $snapshot['kpi_data'] ?? null,
                'results_analysis' => $snapshot['results_analysis'] ?? null,
                'next_plans' => $snapshot['next_plans'] ?? null,
                'status' => $snapshot['status'] ?? $tracer->status,
                'current_version' => $newVersion,
                'last_modified_by' => $user?->id,
            ]);

            // Create revision log indicating restoration
            ClinicalTracerRevision::create([
                'clinical_tracer_id' => $tracer->id,
                'version_number' => $newVersion,
                'change_summary' => "กู้คืนข้อมูล (Restore) ย้อนกลับไปจากเวอร์ชัน #{$revision->version_number}",
                'snapshot_data' => $tracer->createSnapshot(),
                'created_by' => $user?->id,
                'created_at' => now(),
            ]);
        });

        return redirect()->back()->with('success', "กู้คืนข้อมูลจากเวอร์ชัน #{$revision->version_number} เรียบร้อยแล้ว (สร้างเป็นเวอร์ชันใหม่)");
    }

    /**
     * Print-friendly view for a Clinical Tracer.
     */
    public function printView(ClinicalTracer $tracer): Response
    {
        $tracer->load(['team', 'lastModifiedUser']);

        return Inertia::render('Ha/ClinicalTracer/PrintView', [
            'tracer' => $tracer,
        ]);
    }

    /**
     * Print-friendly overview of all Clinical Tracers (Executive Summary & Full Dossier).
     */
    public function overviewPrint(Request $request): Response
    {
        $category = $request->query('category', 'all');

        $tracers = ClinicalTracer::with(['team', 'lastModifiedUser'])
            ->when($category && $category !== 'all', fn($q) => $q->where('category', $category))
            ->orderBy('order')
            ->get();

        $stats = [
            'total' => ClinicalTracer::count(),
            'emergency' => ClinicalTracer::where('category', 'emergency')->count(),
            'chronic' => ClinicalTracer::where('category', 'chronic')->count(),
            'infectious' => ClinicalTracer::where('category', 'infectious')->count(),
            'mental_health' => ClinicalTracer::where('category', 'mental_health')->count(),
            'total_kpis' => ClinicalTracer::all()->reduce(fn($carry, $t) => $carry + (count($t->kpi_data['rows'] ?? [])), 0),
        ];

        return Inertia::render('Ha/ClinicalTracer/OverviewPrint', [
            'tracers' => $tracers,
            'currentCategory' => $category,
            'stats' => $stats,
        ]);
    }
}
