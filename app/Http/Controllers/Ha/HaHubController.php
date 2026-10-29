<?php

namespace App\Http\Controllers\Ha;

use App\Http\Controllers\Controller;
use App\Models\SarCycle;
use App\Models\SarPart;
use App\Models\SarSection;
use App\Models\ClinicalTracer;
use App\Models\TeamHa;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\Request;

class HaHubController extends Controller
{
    /**
     * Display the HA (Hospital Accreditation) Hub main page.
     */
    public function index(): Response
    {
        $currentCycle = SarCycle::where('is_current', true)->first() ?? SarCycle::latest()->first();
        
        $sarStats = [
            'total_sections' => SarSection::count(),
            'completed_sections' => SarSection::where('status', 'completed')->count(),
            'in_progress_sections' => SarSection::where('status', 'in_progress')->count(),
            'draft_sections' => SarSection::where('status', 'draft')->count(),
            'parts_count' => SarPart::count(),
            'cycle_year' => $currentCycle?->year ?? '2569',
        ];

        $partsSummary = SarPart::withCount([
            'sections',
            'sections as completed_count' => fn($q) => $q->where('status', 'completed')
        ])->orderBy('order')->get()->map(fn($part) => [
            'id' => $part->id,
            'part_number' => $part->part_number,
            'part_name' => $part->part_name,
            'total_sections' => $part->sections_count,
            'completed_sections' => $part->completed_count,
            'progress_percent' => $part->sections_count > 0 
                ? round(($part->completed_count / $part->sections_count) * 100) 
                : 0,
        ]);

        $haTeamsCount = TeamHa::count();
        $clinicalTracersCount = ClinicalTracer::count();

        return Inertia::render('Ha/Index', [
            'sarStats' => $sarStats,
            'partsSummary' => $partsSummary,
            'haTeamsCount' => $haTeamsCount,
            'clinicalTracersCount' => $clinicalTracersCount,
            'currentCycle' => $currentCycle,
        ]);
    }

    /**
     * Clinical Tracer module placeholder / roadmap page.
     */
    public function clinicalTracerIndex(): Response
    {
        return Inertia::render('Ha/ClinicalTracer/Index');
    }

    /**
     * Service Profile module placeholder / roadmap page.
     */
    public function serviceProfileIndex(): Response
    {
        return Inertia::render('Ha/ServiceProfile/Index');
    }
}
