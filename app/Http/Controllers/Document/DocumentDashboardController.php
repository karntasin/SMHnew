<?php

namespace App\Http\Controllers\Document;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class DocumentDashboardController extends Controller
{
    public function index()
    {
        $stats = [
            'total' => \App\Models\Document::count(),
            'draft' => \App\Models\Document::where('status', 'draft')->count(),
            'pending' => \App\Models\Document::where('status', 'pending_approval')->count(),
            'approved' => \App\Models\Document::where('status', 'approved')->count(),
        ];

        $recentDocuments = \App\Models\Document::with('createdBy')
            ->latest()
            ->take(5)
            ->get();

        // Monthly stats for chart
        $monthlyStats = \App\Models\Document::selectRaw('MONTH(created_at) as month, COUNT(*) as count')
            ->whereYear('created_at', date('Y'))
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => \Carbon\Carbon::create()->month($item->month)->locale('th')->monthName,
                    'total' => $item->count,
                ];
            });

        return \Inertia\Inertia::render('documents/Dashboard', [
            'stats' => $stats,
            'recentDocuments' => $recentDocuments,
            'monthlyStats' => $monthlyStats,
        ]);
    }
}
