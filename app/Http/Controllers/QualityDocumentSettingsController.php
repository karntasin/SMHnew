<?php

namespace App\Http\Controllers;

use App\Models\QualityDocument;
use App\Models\QualityDocumentTaxonomy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class QualityDocumentSettingsController extends Controller
{
    /**
     * Ensure the user has permission to manage quality document settings.
     * Allowed roles: admin, superuser, header, boss
     */
    protected function authorizeSettings(): void
    {
        if (!QualityDocument::canManageSettings(Auth::user())) {
            abort(403, 'เฉพาะบทบาท Admin, Superuser, Header, Boss เท่านั้นที่สามารถเข้าถึงการตั้งค่าหมวดหมู่เอกสารคุณภาพได้');
        }
    }

    public function index()
    {
        $this->authorizeSettings();

        $standards = QualityDocumentTaxonomy::standard()
            ->ordered()
            ->get();

        $documentTypes = QualityDocumentTaxonomy::documentType()
            ->ordered()
            ->get();

        // Calculate usage counts
        $categoryCounts = QualityDocument::selectRaw('category, count(*) as count')
            ->groupBy('category')
            ->pluck('count', 'category')
            ->toArray();

        $typeCounts = QualityDocument::selectRaw('document_type, count(*) as count')
            ->groupBy('document_type')
            ->pluck('count', 'document_type')
            ->toArray();

        return Inertia::render('quality-docs/Settings', [
            'standards' => $standards,
            'documentTypes' => $documentTypes,
            'usage' => [
                'categories' => $categoryCounts,
                'documentTypes' => $typeCounts,
            ],
            'canManageSettings' => true,
        ]);
    }

    public function store(Request $request)
    {
        $this->authorizeSettings();

        $validated = $request->validate([
            'type' => 'required|in:standard,document_type',
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('quality_document_taxonomies')->where(function ($query) use ($request) {
                    return $query->where('type', $request->type);
                }),
            ],
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'color' => 'nullable|string|max:50',
            'sort_order' => 'nullable|integer|min:0|max:9999',
            'is_active' => 'nullable|boolean',
        ], [
            'code.unique' => 'รหัสนี้มีอยู่ในระบบแล้วสำหรับหมวดหมู่นี้',
            'code.required' => 'กรุณากรอกรหัส',
            'name.required' => 'กรุณากรอกชื่อหมวดหมู่',
        ]);

        QualityDocumentTaxonomy::create([
            'type' => $validated['type'],
            'code' => trim($validated['code']),
            'name' => trim($validated['name']),
            'description' => $validated['description'] ?? null,
            'color' => $validated['color'] ?? 'blue',
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
            'created_by' => Auth::id(),
            'updated_by' => Auth::id(),
        ]);

        return back()->with('success', 'เพิ่มข้อมูลหมวดหมู่เรียบร้อยแล้ว');
    }

    public function update(Request $request, $id)
    {
        $this->authorizeSettings();

        $taxonomy = QualityDocumentTaxonomy::findOrFail($id);

        $validated = $request->validate([
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('quality_document_taxonomies')
                    ->where('type', $taxonomy->type)
                    ->ignore($taxonomy->id),
            ],
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'color' => 'nullable|string|max:50',
            'sort_order' => 'nullable|integer|min:0|max:9999',
            'is_active' => 'nullable|boolean',
        ], [
            'code.unique' => 'รหัสนี้มีอยู่ในระบบแล้วสำหรับหมวดหมู่นี้',
            'code.required' => 'กรุณากรอกรหัส',
            'name.required' => 'กรุณากรอกชื่อหมวดหมู่',
        ]);

        $taxonomy->update([
            'code' => trim($validated['code']),
            'name' => trim($validated['name']),
            'description' => $validated['description'] ?? null,
            'color' => $validated['color'] ?? $taxonomy->color,
            'sort_order' => $validated['sort_order'] ?? $taxonomy->sort_order,
            'is_active' => $validated['is_active'] ?? $taxonomy->is_active,
            'updated_by' => Auth::id(),
        ]);

        return back()->with('success', 'บันทึกการแก้ไขหมวดหมู่เรียบร้อยแล้ว');
    }

    public function destroy($id)
    {
        $this->authorizeSettings();

        $taxonomy = QualityDocumentTaxonomy::findOrFail($id);

        // Check if in use by documents
        $field = $taxonomy->type === 'standard' ? 'category' : 'document_type';
        $inUseCount = QualityDocument::where($field, $taxonomy->code)->count();

        if ($inUseCount > 0) {
            return back()->with('error', "ไม่สามารถลบได้เนื่องจากมีเอกสารกำลังใช้งานหมวดหมู่นี้อยู่ {$inUseCount} ฉบับ แนะนำให้ปิดการใช้งานแทน");
        }

        $taxonomy->delete();

        return back()->with('success', 'ลบหมวดหมู่เรียบร้อยแล้ว');
    }

    public function toggleActive($id)
    {
        $this->authorizeSettings();

        $taxonomy = QualityDocumentTaxonomy::findOrFail($id);
        $taxonomy->is_active = !$taxonomy->is_active;
        $taxonomy->updated_by = Auth::id();
        $taxonomy->save();

        $statusText = $taxonomy->is_active ? 'เปิดใช้งาน' : 'ปิดการใช้งาน';
        return back()->with('success', "{$statusText} {$taxonomy->name} เรียบร้อยแล้ว");
    }
}
