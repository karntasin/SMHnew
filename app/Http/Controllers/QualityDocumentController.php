<?php

namespace App\Http\Controllers;

use App\Models\QualityDocument;
use App\Models\QualityDocumentAttachment;
use App\Models\QualityDocumentTaxonomy;
use App\Models\Department;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use ZipArchive;

class QualityDocumentController extends Controller
{
    /**
     * Allowed file extensions and MIME types for quality document attachments.
     */
    protected const ALLOWED_MIMES = 'pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,webp,zip,rar,7z,txt,csv,rtf';
    protected const MAX_FILE_SIZE = 25600; // 25MB per file in kilobytes

    /**
     * Resolve custom display file name, ensuring proper extension.
     */
    protected function resolveFileName($uploadedFile, ?string $customName): string
    {
        $originalName = $uploadedFile->getClientOriginalName();
        $ext = strtolower($uploadedFile->getClientOriginalExtension());
        $cleanCustom = trim((string)$customName);

        if ($cleanCustom === '') {
            return $originalName;
        }

        // If user didn't include extension, append it
        if (!str_ends_with(strtolower($cleanCustom), '.' . $ext)) {
            return $cleanCustom . '.' . $ext;
        }

        return $cleanCustom;
    }

    public function index(Request $request)
    {
        $query = QualityDocument::with(['owner', 'department', 'attachments'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('document_number', 'like', "%{$search}%");
            });
        }

        if ($request->filled('department_id') && $request->department_id !== 'all') {
            $query->where('department_id', $request->department_id);
        }

        if ($request->filled('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        if ($request->filled('document_type') && $request->document_type !== 'all') {
            $query->where('document_type', $request->document_type);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $documents = $query->paginate(10)->withQueryString();
        $departments = Department::select('id', 'name')->get();

        $standards = QualityDocumentTaxonomy::standard()
            ->active()
            ->ordered()
            ->select('code', 'name', 'color')
            ->get();

        $documentTypes = QualityDocumentTaxonomy::documentType()
            ->active()
            ->ordered()
            ->select('code', 'name', 'color')
            ->get();

        // Calculate stats
        $stats = [
            'total' => QualityDocument::count(),
            'published' => QualityDocument::where('status', 'published')->count(),
            'review' => QualityDocument::where('status', 'review')->count(),
            'draft' => QualityDocument::where('status', 'draft')->count(),
        ];

        return Inertia::render('quality-docs/Index', [
            'documents' => $documents,
            'departments' => $departments,
            'standards' => $standards,
            'documentTypes' => $documentTypes,
            'filters' => $request->only(['search', 'department_id', 'category', 'document_type', 'status']),
            'stats' => $stats,
            'canManageSettings' => QualityDocument::canManageSettings(Auth::user()),
        ]);
    }

    public function create()
    {
        $departments = Department::select('id', 'name')->get();
        $teams = DB::table('teamha')->select('abbreviation', 'name_th')->get();

        $standards = QualityDocumentTaxonomy::standard()
            ->active()
            ->ordered()
            ->get();

        $documentTypes = QualityDocumentTaxonomy::documentType()
            ->active()
            ->ordered()
            ->get();
        
        return Inertia::render('quality-docs/Create', [
            'departments' => $departments,
            'teams' => $teams,
            'standards' => $standards,
            'documentTypes' => $documentTypes,
            'canManageSettings' => QualityDocument::canManageSettings(Auth::user()),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'document_number' => [
                'required',
                'string',
                'max:255',
                Rule::unique('quality_documents', 'document_number')->whereNull('deleted_at'),
            ],
            'category' => 'required|string',
            'document_type' => 'required|string',
            'department_id' => 'nullable|exists:departments,id',
            'owner_department' => 'nullable|string|exists:teamha,abbreviation',
            'description' => 'nullable|string',
            'effective_date' => 'required|date',
            'review_date' => 'nullable|date|after:effective_date',
            'files' => 'nullable|array',
            'files.*' => 'file|mimes:' . self::ALLOWED_MIMES . '|max:' . self::MAX_FILE_SIZE,
            'file' => 'nullable|file|mimes:' . self::ALLOWED_MIMES . '|max:' . self::MAX_FILE_SIZE,
        ], [
            'document_number.unique' => 'รหัสเอกสารนี้ถูกใช้งานแล้วในระบบ (สำหรับเอกสารที่ยังใช้งานอยู่)',
            'files.*.mimes' => 'รูปแบบไฟล์ไม่ถูกต้อง รองรับ PDF, Word, Excel, PowerPoint, รูปภาพ, Text และ ZIP',
            'files.*.max' => 'ขนาดไฟล์ต้องไม่เกิน 25MB ต่อไฟล์',
        ]);

        // Require at least one file from either 'files' or 'file'
        $hasFiles = $request->hasFile('files') && count($request->file('files')) > 0;
        $hasSingleFile = $request->hasFile('file');

        if (!$hasFiles && !$hasSingleFile) {
            return back()->withErrors(['files' => 'กรุณาอัปโหลดไฟล์เอกสารอย่างน้อย 1 ไฟล์'])->withInput();
        }

        // Collect all uploaded files
        $uploadedFiles = [];
        if ($hasFiles) {
            foreach ($request->file('files') as $f) {
                if ($f) $uploadedFiles[] = $f;
            }
        }
        if ($hasSingleFile && empty($uploadedFiles)) {
            $uploadedFiles[] = $request->file('file');
        }

        // Create main document record
        $document = QualityDocument::create([
            'title' => $validated['title'],
            'document_number' => $validated['document_number'],
            'category' => $validated['category'],
            'document_type' => $validated['document_type'],
            'department_id' => $validated['department_id'] ?? null,
            'owner_department' => $validated['owner_department'] ?? null,
            'description' => $validated['description'] ?? null,
            'effective_date' => $validated['effective_date'],
            'review_date' => $validated['review_date'] ?? null,
            'status' => 'draft',
            'current_version' => '1.0',
            'file_path' => null,
            'owner_id' => auth()->id(),
        ]);

        // Process attachments
        $primaryPath = null;
        $attachmentRecords = [];
        $fileNames = $request->input('file_names', []);

        foreach ($uploadedFiles as $index => $uploadedFile) {
            $originalName = $uploadedFile->getClientOriginalName();
            $ext = strtolower($uploadedFile->getClientOriginalExtension());
            $mime = $uploadedFile->getClientMimeType();
            $size = $uploadedFile->getSize();

            $path = $uploadedFile->store('quality-docs/attachments', 'public');

            if ($index === 0) {
                $primaryPath = $path;
            }

            $displayName = $this->resolveFileName($uploadedFile, $fileNames[$index] ?? null);

            $attachment = QualityDocumentAttachment::create([
                'quality_document_id' => $document->id,
                'file_name' => $displayName,
                'original_name' => $originalName,
                'file_path' => $path,
                'file_size' => $size,
                'mime_type' => $mime,
                'file_extension' => $ext,
                'uploaded_by' => auth()->id(),
            ]);

            $attachmentRecords[] = $attachment;
        }

        // Update document primary file_path for backward compatibility
        $document->update(['file_path' => $primaryPath]);

        // Create initial version record
        if ($primaryPath) {
            $document->versions()->create([
                'version_number' => '1.0',
                'file_path' => $primaryPath,
                'changes_description' => 'Initial upload with ' . count($attachmentRecords) . ' file(s)',
                'uploaded_by' => auth()->id(),
            ]);
        }

        return redirect()->route('quality-docs.show', $document->id)
            ->with('success', 'สร้างเอกสารและบันทึกไฟล์แนบ ' . count($attachmentRecords) . ' ไฟล์เรียบร้อยแล้ว');
    }

    public function show($id)
    {
        $document = QualityDocument::with([
            'owner',
            'department',
            'attachments.uploader',
            'versions.uploader'
        ])->findOrFail($id);

        if ($document->attachments->isEmpty() && !empty($document->file_path)) {
            $this->backfillLegacyAttachment($document);
            $document->load('attachments.uploader');
        }

        $taxonomies = QualityDocumentTaxonomy::all()
            ->keyBy(function ($item) {
                return $item->type . ':' . $item->code;
            });

        $user = Auth::user();
        $isOwner = $user && $user->id === $document->owner_id;
        $canApprove = QualityDocument::canApprove($user);
        $canManageSettings = QualityDocument::canManageSettings($user);

        return Inertia::render('quality-docs/Show', [
            'document' => $document,
            'can' => [
                'approve' => $canApprove,
                'edit' => $isOwner || $canManageSettings,
                'delete' => $isOwner || $canManageSettings,
            ],
            'canManageSettings' => $canManageSettings,
        ]);
    }

    /**
     * Auto backfill legacy file_path into quality_document_attachments
     */
    protected function backfillLegacyAttachment(QualityDocument $document): void
    {
        if (empty($document->file_path)) {
            return;
        }

        if (Storage::disk('public')->exists($document->file_path)) {
            $fullPath = Storage::disk('public')->path($document->file_path);
            $size = @filesize($fullPath) ?: 0;
            $mime = @mime_content_type($fullPath) ?: 'application/pdf';
            $ext = strtolower(pathinfo($document->file_path, PATHINFO_EXTENSION)) ?: 'pdf';
            $displayName = $document->document_number . ' (ไฟล์ตั้งต้น).' . $ext;

            QualityDocumentAttachment::create([
                'quality_document_id' => $document->id,
                'file_name' => $displayName,
                'original_name' => basename($document->file_path),
                'file_path' => $document->file_path,
                'file_size' => $size,
                'mime_type' => $mime,
                'file_extension' => $ext,
                'uploaded_by' => $document->owner_id ?: Auth::id(),
            ]);
        }
    }

    /**
     * Authorize document modification or deletion.
     * Allowed: admin, superuser, header, boss OR document owner
     */
    protected function authorizeDocumentManage(QualityDocument $document): void
    {
        $user = Auth::user();
        $canManage = QualityDocument::canManageSettings($user);
        $isOwner = $user && $user->id === $document->owner_id;

        if (!$canManage && !$isOwner) {
            abort(403, 'เฉพาะบทบาท Admin, Superuser, Header, Boss หรือเจ้าของเอกสารเท่านั้นที่สามารถแก้ไขหรือลบเอกสารนี้ได้');
        }
    }

    public function edit($id)
    {
        $document = QualityDocument::with([
            'attachments.uploader',
            'department'
        ])->findOrFail($id);

        $this->authorizeDocumentManage($document);

        $departments = Department::select('id', 'name')->get();
        $teams = DB::table('teamha')->select('abbreviation', 'name_th')->get();

        $standards = QualityDocumentTaxonomy::standard()
            ->active()
            ->ordered()
            ->get();

        $documentTypes = QualityDocumentTaxonomy::documentType()
            ->active()
            ->ordered()
            ->get();

        return Inertia::render('quality-docs/Edit', [
            'document' => $document,
            'departments' => $departments,
            'teams' => $teams,
            'standards' => $standards,
            'documentTypes' => $documentTypes,
            'canManageSettings' => QualityDocument::canManageSettings(Auth::user()),
        ]);
    }

    public function update(Request $request, $id)
    {
        $document = QualityDocument::findOrFail($id);
        $this->authorizeDocumentManage($document);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'document_number' => [
                'required',
                'string',
                'max:255',
                Rule::unique('quality_documents', 'document_number')
                    ->ignore($document->id)
                    ->whereNull('deleted_at'),
            ],
            'category' => 'required|string',
            'document_type' => 'required|string',
            'department_id' => 'nullable|exists:departments,id',
            'owner_department' => 'nullable|string|exists:teamha,abbreviation',
            'description' => 'nullable|string',
            'effective_date' => 'required|date',
            'review_date' => 'nullable|date|after:effective_date',
            'status' => 'nullable|in:draft,review,published',
            'files' => 'nullable|array',
            'files.*' => 'file|mimes:' . self::ALLOWED_MIMES . '|max:' . self::MAX_FILE_SIZE,
        ], [
            'document_number.unique' => 'รหัสเอกสารนี้ถูกใช้งานแล้วในระบบ (สำหรับเอกสารที่ยังใช้งานอยู่)',
            'files.*.mimes' => 'รูปแบบไฟล์ไม่ถูกต้อง รองรับ PDF, Word, Excel, PowerPoint, รูปภาพ, Text และ ZIP',
            'files.*.max' => 'ขนาดไฟล์ต้องไม่เกิน 25MB ต่อไฟล์',
        ]);

        $document->update([
            'title' => $validated['title'],
            'document_number' => $validated['document_number'],
            'category' => $validated['category'],
            'document_type' => $validated['document_type'],
            'department_id' => $validated['department_id'] ?? null,
            'owner_department' => $validated['owner_department'] ?? null,
            'description' => $validated['description'] ?? null,
            'effective_date' => $validated['effective_date'],
            'review_date' => $validated['review_date'] ?? null,
            'status' => $validated['status'] ?? $document->status,
        ]);

        // Process any new attachments uploaded
        if ($request->hasFile('files')) {
            $firstPath = null;
            $newFileNames = $request->input('file_names', []);

            foreach ($request->file('files') as $idx => $file) {
                if ($file) {
                    $path = $file->store('quality-docs/attachments', 'public');
                    if (!$firstPath) $firstPath = $path;

                    $displayName = $this->resolveFileName($file, $newFileNames[$idx] ?? null);

                    QualityDocumentAttachment::create([
                        'quality_document_id' => $document->id,
                        'file_name' => $displayName,
                        'original_name' => $file->getClientOriginalName(),
                        'file_path' => $path,
                        'file_size' => $file->getSize(),
                        'mime_type' => $file->getClientMimeType(),
                        'file_extension' => strtolower($file->getClientOriginalExtension()),
                        'uploaded_by' => Auth::id(),
                    ]);
                }
            }

            if (!$document->file_path && $firstPath) {
                $document->update(['file_path' => $firstPath]);
            }
        }

        return redirect()->route('quality-docs.show', $document->id)
            ->with('success', 'บันทึกการแก้ไขข้อมูลเอกสารเรียบร้อยแล้ว');
    }

    public function destroy($id)
    {
        $document = QualityDocument::findOrFail($id);
        $this->authorizeDocumentManage($document);

        $docNumber = $document->document_number;
        $document->delete();

        return redirect()->route('quality-docs.index')
            ->with('success', "ลบเอกสาร {$docNumber} เรียบร้อยแล้ว (รหัสเอกสารนี้สามารถนำกลับมาสร้างใหม่ได้)");
    }

    public function download($id)
    {
        $document = QualityDocument::with('attachments')->findOrFail($id);

        // If document has attachments, use the first attachment or the main file_path
        if ($document->attachments->isNotEmpty()) {
            $first = $document->attachments->first();
            if (Storage::disk('public')->exists($first->file_path)) {
                return Storage::disk('public')->download($first->file_path, $first->file_name);
            }
        }

        if ($document->file_path && Storage::disk('public')->exists($document->file_path)) {
            $filename = basename($document->file_path);
            return Storage::disk('public')->download($document->file_path, $document->document_number . '_' . $filename);
        }

        return back()->with('error', 'ไม่พบไฟล์เอกสาร');
    }

    public function downloadAttachment($docId, $attachmentId)
    {
        $document = QualityDocument::findOrFail($docId);
        $attachment = $document->attachments()->findOrFail($attachmentId);

        if (!Storage::disk('public')->exists($attachment->file_path)) {
            return back()->with('error', 'ไม่พบไฟล์ที่ต้องการดาวน์โหลดบนเซิร์ฟเวอร์');
        }

        return Storage::disk('public')->download($attachment->file_path, $attachment->file_name);
    }

    public function downloadAllAttachments($id)
    {
        $document = QualityDocument::with('attachments')->findOrFail($id);
        $attachments = $document->attachments;

        if ($attachments->isEmpty()) {
            return back()->with('error', 'ไม่มีไฟล์แนบในเอกสารนี้');
        }

        // If only 1 attachment, download it directly
        if ($attachments->count() === 1) {
            $first = $attachments->first();
            return $this->downloadAttachment($id, $first->id);
        }

        // Create temporary zip
        $zipFileName = 'Doc_' . preg_replace('/[^a-zA-Z0-9_\-]/', '_', $document->document_number) . '_attachments.zip';
        $tempDir = storage_path('app/temp');
        if (!file_exists($tempDir)) {
            mkdir($tempDir, 0755, true);
        }
        $zipPath = $tempDir . '/' . uniqid('zip_') . '.zip';

        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true) {
            $usedNames = [];
            foreach ($attachments as $att) {
                $fullPath = Storage::disk('public')->path($att->file_path);
                if (file_exists($fullPath)) {
                    $entryName = $att->file_name;
                    // Prevent duplicate filenames in zip
                    if (isset($usedNames[$entryName])) {
                        $usedNames[$entryName]++;
                        $parts = pathinfo($entryName);
                        $entryName = $parts['filename'] . '_' . $usedNames[$entryName] . '.' . ($parts['extension'] ?? '');
                    } else {
                        $usedNames[$entryName] = 1;
                    }
                    $zip->addFile($fullPath, $entryName);
                }
            }
            $zip->close();

            if (file_exists($zipPath)) {
                return response()->download($zipPath, $zipFileName)->deleteFileAfterSend(true);
            }
        }

        return back()->with('error', 'ไม่สามารถสร้างไฟล์บีบอัดได้');
    }

    public function uploadAttachments(Request $request, $id)
    {
        $document = QualityDocument::findOrFail($id);
        $user = Auth::user();

        if ($user->id !== $document->owner_id && !QualityDocument::canManageSettings($user)) {
            return back()->with('error', 'คุณไม่มีสิทธิ์เพิ่มไฟล์ในเอกสารนี้');
        }

        $request->validate([
            'files' => 'required|array|min:1',
            'files.*' => 'file|mimes:' . self::ALLOWED_MIMES . '|max:' . self::MAX_FILE_SIZE,
        ], [
            'files.*.mimes' => 'รูปแบบไฟล์ไม่ถูกต้อง รองรับ PDF, Word, Excel, PowerPoint, รูปภาพ, Text และ ZIP',
            'files.*.max' => 'ขนาดไฟล์ต้องไม่เกิน 25MB ต่อไฟล์',
        ]);

        $addedCount = 0;
        $fileNames = $request->input('file_names', []);

        foreach ($request->file('files') as $idx => $file) {
            if ($file) {
                $path = $file->store('quality-docs/attachments', 'public');
                $displayName = $this->resolveFileName($file, $fileNames[$idx] ?? null);

                QualityDocumentAttachment::create([
                    'quality_document_id' => $document->id,
                    'file_name' => $displayName,
                    'original_name' => $file->getClientOriginalName(),
                    'file_path' => $path,
                    'file_size' => $file->getSize(),
                    'mime_type' => $file->getClientMimeType(),
                    'file_extension' => strtolower($file->getClientOriginalExtension()),
                    'uploaded_by' => $user->id,
                ]);
                $addedCount++;
            }
        }

        // If document didn't have file_path set, set it to the newest
        if (!$document->file_path && $addedCount > 0) {
            $latest = $document->attachments()->latest()->first();
            if ($latest) {
                $document->update(['file_path' => $latest->file_path]);
            }
        }

        return back()->with('success', "เพิ่มไฟล์แนบ {$addedCount} รายการเรียบร้อยแล้ว");
    }

    public function deleteAttachment($docId, $attachmentId)
    {
        $document = QualityDocument::findOrFail($docId);
        $user = Auth::user();

        if ($user->id !== $document->owner_id && !QualityDocument::canManageSettings($user)) {
            return back()->with('error', 'คุณไม่มีสิทธิ์ลบไฟล์แนบนี้');
        }

        $attachment = $document->attachments()->findOrFail($attachmentId);

        // Delete physical file
        if (Storage::disk('public')->exists($attachment->file_path)) {
            Storage::disk('public')->delete($attachment->file_path);
        }

        $attachment->delete();

        // If primary file_path matches deleted attachment, fallback to another attachment
        if ($document->file_path === $attachment->file_path) {
            $next = $document->attachments()->first();
            $document->update(['file_path' => $next ? $next->file_path : null]);
        }

        return back()->with('success', 'ลบไฟล์แนบเรียบร้อยแล้ว');
    }

    public function uploadVersion(Request $request, $id)
    {
        $document = QualityDocument::findOrFail($id);
        $user = Auth::user();

        if ($user->id !== $document->owner_id && !QualityDocument::canManageSettings($user)) {
            return back()->with('error', 'คุณไม่มีสิทธิ์อัปโหลดเวอร์ชันใหม่');
        }

        $validated = $request->validate([
            'version_number' => 'required|string|max:20',
            'changes_description' => 'nullable|string',
            'file' => 'required|file|mimes:' . self::ALLOWED_MIMES . '|max:' . self::MAX_FILE_SIZE,
        ]);

        $path = $request->file('file')->store('quality-docs/attachments', 'public');

        $version = $document->versions()->create([
            'version_number' => $validated['version_number'],
            'file_path' => $path,
            'changes_description' => $validated['changes_description'] ?? 'Version update',
            'uploaded_by' => $user->id,
        ]);

        // Also record attachment
        QualityDocumentAttachment::create([
            'quality_document_id' => $document->id,
            'quality_document_version_id' => $version->id,
            'file_name' => $request->file('file')->getClientOriginalName(),
            'file_path' => $path,
            'file_size' => $request->file('file')->getSize(),
            'mime_type' => $request->file('file')->getClientMimeType(),
            'file_extension' => strtolower($request->file('file')->getClientOriginalExtension()),
            'uploaded_by' => $user->id,
        ]);

        $document->update([
            'current_version' => $validated['version_number'],
            'file_path' => $path,
        ]);

        return back()->with('success', 'อัปเดตเวอร์ชันเอกสารเรียบร้อยแล้ว');
    }

    public function downloadVersion($docId, $versionId)
    {
        $document = QualityDocument::findOrFail($docId);
        $version = $document->versions()->findOrFail($versionId);

        if (!Storage::disk('public')->exists($version->file_path)) {
            return back()->with('error', 'ไม่พบไฟล์เวอร์ชันนี้');
        }

        $filename = basename($version->file_path);
        return Storage::disk('public')->download($version->file_path, "{$document->document_number}_v{$version->version_number}_{$filename}");
    }

    public function submitForReview($id)
    {
        $document = QualityDocument::findOrFail($id);
        
        if (Auth::id() !== $document->owner_id && !QualityDocument::canManageSettings(Auth::user())) {
            return back()->with('error', 'คุณไม่มีสิทธิ์ดำเนินการนี้');
        }

        $document->update(['status' => 'review']);
        
        return back()->with('success', 'ส่งเอกสารเพื่อขออนุมัติเรียบร้อยแล้ว');
    }

    public function approve($id)
    {
        $document = QualityDocument::findOrFail($id);
        
        if (!QualityDocument::canApprove(Auth::user())) {
            return back()->with('error', 'คุณไม่มีสิทธิ์อนุมัติเอกสาร');
        }

        $document->update(['status' => 'published']);
        
        return back()->with('success', 'อนุมัติเอกสารเรียบร้อยแล้ว');
    }

    public function reject($id)
    {
        $document = QualityDocument::findOrFail($id);
        
        if (!QualityDocument::canApprove(Auth::user())) {
            return back()->with('error', 'คุณไม่มีสิทธิ์ดำเนินการนี้');
        }

        $document->update(['status' => 'draft']);
        
        return back()->with('success', 'ตีกลับเอกสารเรียบร้อยแล้ว');
    }
}
