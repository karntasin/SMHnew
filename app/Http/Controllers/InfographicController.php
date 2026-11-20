<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InfographicController extends Controller
{
    /**
     * Display the Smart Hospital Infographic & Presentation showcase.
     */
    public function index(): Response
    {
        // Core metrics and estimated savings highlights
        $stats = [
            'paperless_rate' => 100, // 100% Paperless workflows
            'time_saved_percent' => 65, // ~65% faster processing time
            'workload_reduced_percent' => 70, // ~70% reduction in repetitive manual steps
            'paper_saved_sheets_per_year' => 58000, // Estimated paper sheets saved annually
            'cost_saved_baht_per_year' => 145000, // Estimated annual savings on paper, toner, and printing
            'modules_count' => 12,
            'security_standard' => 'PDPA Compliant & HOSxP Read-Only',
        ];

        return Inertia::render('Infographic', [
            'stats' => $stats,
        ]);
    }
}
