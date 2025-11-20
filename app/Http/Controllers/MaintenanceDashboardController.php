<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\MaintenanceRequest;
use Illuminate\Support\Facades\DB;

class MaintenanceDashboardController extends Controller
{
    public function index()
    {
        $stats = [
            'total' => MaintenanceRequest::count(),
            'pending' => MaintenanceRequest::where('status', 'pending')->count(),
            'in_progress' => MaintenanceRequest::where('status', 'in_progress')->count(),
            'completed' => MaintenanceRequest::where('status', 'completed')->count(),
        ];

        // Monthly Stats (Last 12 months)
        $monthlyStats = MaintenanceRequest::select(
            DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
            DB::raw('count(*) as count')
        )
            ->where('created_at', '>=', now()->subMonths(12))
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(function ($item) {
                // Convert YYYY-MM to Thai Month Name if needed, or just keep it simple for now
                // Let's return the raw data and format in frontend or here.
                // Let's format here for simplicity in frontend
                $date = \Carbon\Carbon::createFromFormat('Y-m', $item->month);
                return [
                    'name' => $date->locale('th')->isoFormat('MMM YY'), // e.g., ม.ค. 68
                    'count' => $item->count,
                    'full_date' => $item->month
                ];
            });

        // Category Stats
        $categoryStats = MaintenanceRequest::select('category_id', DB::raw('count(*) as count'))
            ->with('category')
            ->groupBy('category_id')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $item->category ? $item->category->name : 'ไม่ระบุ',
                    'count' => $item->count
                ];
            });

        $recentRequests = MaintenanceRequest::with(['category', 'priority', 'requester'])
            ->latest()
            ->take(5)
            ->get();

        return Inertia::render('maintenance/Dashboard', [
            'stats' => $stats,
            'recentRequests' => $recentRequests,
            'monthlyStats' => $monthlyStats,
            'categoryStats' => $categoryStats,
        ]);
    }
}
