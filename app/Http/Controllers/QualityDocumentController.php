<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;

class QualityDocumentController extends Controller
{
    public function index()
    {
        return Inertia::render('quality-docs/Index');
    }

    public function create()
    {
        return Inertia::render('quality-docs/Create');
    }

    public function store(Request $request)
    {
        // TODO: Implement store method
        return redirect()->route('quality-docs.index');
    }

    public function show($id)
    {
        return Inertia::render('quality-docs/Show', ['id' => $id]);
    }

    public function download($id)
    {
        // TODO: Implement download method
    }

    public function uploadVersion(Request $request, $id)
    {
        // TODO: Implement version upload
    }

    public function downloadVersion($id, $version)
    {
        // TODO: Implement version download
    }

    public function submitForReview($id)
    {
        // TODO: Implement submit for review
        return back();
    }

    public function approve($id)
    {
        // TODO: Implement approve
        return back();
    }

    public function reject($id)
    {
        // TODO: Implement reject
        return back();
    }
}
