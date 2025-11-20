<?php

namespace App\Http\Controllers\Document;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DocumentSettingController extends Controller
{
    public function index()
    {
        // Fetch document types if table exists, otherwise mock or use config
        $documentTypes = [];
        if (\Illuminate\Support\Facades\Schema::hasTable('document_types')) {
            $documentTypes = DB::table('document_types')->get();
        }

        return Inertia::render('documents/Settings', [
            'documentTypes' => $documentTypes,
        ]);
    }

    public function storeType(Request $request)
    {
        $request->validate(['name' => 'required|string|max:255']);
        
        if (\Illuminate\Support\Facades\Schema::hasTable('document_types')) {
            DB::table('document_types')->insert([
                'name' => $request->name,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return back()->with('success', 'Document type added.');
    }

    public function deleteType($id)
    {
        if (\Illuminate\Support\Facades\Schema::hasTable('document_types')) {
            DB::table('document_types')->where('id', $id)->delete();
        }
        return back()->with('success', 'Document type deleted.');
    }
}
