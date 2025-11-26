<?php

namespace App\Http\Controllers\Km;

use App\Http\Controllers\Controller;
use App\Models\KmAsset;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class KmAssetController extends Controller
{
    public function index(Request $request)
    {
        $query = KmAsset::with('uploader');

        if ($request->has('search')) {
            $query->where('title', 'like', '%' . $request->search . '%')
                  ->orWhere('description', 'like', '%' . $request->search . '%');
        }

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        $assets = $query->orderBy('created_at', 'desc')->paginate(12);

        return Inertia::render('KM/Assets/Index', [
            'assets' => $assets,
            'filters' => $request->only(['search', 'category']),
        ]);
    }

    public function create()
    {
        return Inertia::render('KM/Assets/Create');
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'file' => 'required|file|max:10240', // 10MB
            'category' => 'required|string',
        ]);

        $path = $request->file('file')->store('km-assets', 'public');
        $extension = $request->file('file')->getClientOriginalExtension();

        KmAsset::create([
            'title' => $request->title,
            'description' => $request->description,
            'file_path' => $path,
            'file_type' => $extension,
            'category' => $request->category,
            'tags' => $request->tags ? explode(',', $request->tags) : [],
            'uploaded_by' => Auth::id(),
        ]);

        return redirect()->route('km.assets.index')->with('success', 'Document uploaded successfully.');
    }

    public function show(KmAsset $asset)
    {
        $asset->increment('views');
        return Inertia::render('KM/Assets/Show', [
            'asset' => $asset->load('uploader'),
        ]);
    }

    public function destroy(KmAsset $asset)
    {
        if ($asset->uploaded_by !== Auth::id()) {
            abort(403);
        }

        Storage::disk('public')->delete($asset->file_path);
        $asset->delete();

        return back()->with('success', 'Asset deleted.');
    }
}
