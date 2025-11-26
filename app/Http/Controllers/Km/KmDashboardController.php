<?php

namespace App\Http\Controllers\Km;

use App\Http\Controllers\Controller;
use App\Models\KmAsset;
use App\Models\HrdCourse;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class KmDashboardController extends Controller
{
    public function index()
    {
        // Recent Knowledge Assets
        $recentAssets = KmAsset::with('uploader')
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        // Popular Assets
        $popularAssets = KmAsset::orderBy('views', 'desc')
            ->take(5)
            ->get();

        // Featured Courses (from HRD system)
        $featuredCourses = HrdCourse::where('status', 'published')
            ->orderBy('created_at', 'desc')
            ->take(3)
            ->get();

        return Inertia::render('KM/Dashboard', [
            'recentAssets' => $recentAssets,
            'popularAssets' => $popularAssets,
            'featuredCourses' => $featuredCourses,
        ]);
    }
}
