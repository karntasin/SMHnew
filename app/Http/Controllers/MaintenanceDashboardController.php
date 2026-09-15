<?php

namespace App\Http\Controllers;

use App\Models\MaintenanceCategory;
use App\Models\MaintenanceRequest;
use Inertia\Inertia;

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

        $categories = MaintenanceCategory::where('is_active', true)
            ->orderBy('order')
            ->get();

        $recentRequests = MaintenanceRequest::with(['category', 'priority', 'requester', 'images'])
            ->latest()
            ->take(8)
            ->get();

        $pendingRequests = MaintenanceRequest::with(['category', 'priority', 'requester', 'images'])
            ->where('status', 'pending')
            ->latest()
            ->take(8)
            ->get();

        return Inertia::render('maintenance/Dashboard', [
            'stats' => $stats,
            'categories' => $categories,
            'recentRequests' => $recentRequests,
            'pendingRequests' => $pendingRequests,
        ]);
    }
}
