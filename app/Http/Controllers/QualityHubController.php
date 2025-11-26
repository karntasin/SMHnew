<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;

class QualityHubController extends Controller
{
    public function index()
    {
        return Inertia::render('Quality/Index');
    }
}
