<?php

namespace App\Http\Controllers\AdminDocs;

use App\Data\OfficialMemoForms;
use App\Data\OfficialMemoLayouts;
use App\Http\Controllers\Controller;
use App\Models\OfficialMemo;
use App\Models\OfficialMemoForm;
use App\Models\OfficialMemoSetting;
use App\Models\User;
use App\Services\AdminDocs\OfficialMemoDocxService;
use App\Services\FshhChat\FshhChatClient;
use App\Support\ThaiNameSearch;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class OfficialMemoController extends Controller
{
    public function index(Request $request)
    {
        $kind = $request->string('kind')->toString();
        if (! isset(OfficialMemoForms::kinds()[$kind])) {
            $kind = '';
        }

        $search = trim($request->string('search')->toString());

        $memos = OfficialMemo::query()
            ->where('user_id', auth()->id())
            ->when($kind !== '', fn ($query) => $query->where('kind', $kind))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('subject', 'like', '%'.$search.'%')
                        ->orWhere('document_no', 'like', '%'.$search.'%');
                });
            })
            ->latest('updated_at')
            ->paginate(12)
            ->withQueryString()
            ->through(fn (OfficialMemo $memo) => [
                'id' => $memo->id,
                'kind' => $memo->kind,
                'subject' => $memo->subject,
                'document_no' => $memo->document_no,
                'document_date' => optional($memo->document_date)->toDateString(),
                'updated_at' => $memo->updated_at?->format('Y-m-d H:i'),
            ]);

        return Inertia::render('AdminDocs/Memos/Index', [
            'memos' => $memos,
            'kinds' => OfficialMemoForms::kinds(),
            'filters' => [
                'kind' => $kind,
                'search' => $search,
            ],
        ]);
    }

    public function create(Request $request)
    {
        $kind = $this->kindOrDefault($request->string('kind')->toString());

        return Inertia::render('AdminDocs/Memos/Editor', $this->editorProps($kind));
    }

    public function edit(OfficialMemo $memo)
    {
        $this->authorizeOwner($memo);
        $setting = OfficialMemoSetting::current();
        $kind = $this->kindOrDefault($memo->kind);

        return Inertia::render('AdminDocs/Memos/Editor', array_merge($this->editorProps($kind), [
            'memo' => [
                'id' => $memo->id,
                'kind' => $kind,
                'thai_digits' => $memo->thai_digits,
                'sections' => OfficialMemoForms::mergeSections($kind, $memo->sections ?? [], $setting, auth()->user()),
            ],
        ]));
    }

    public function store(Request $request)
    {
        $payload = $this->validatedPayload($request);

        $memo = OfficialMemo::query()->create([
            'user_id' => auth()->id(),
            ...$payload,
        ]);

        return redirect()
            ->route('admin-docs.memos.edit', $memo)
            ->with('success', 'บันทึกหนังสือแล้ว');
    }

    public function update(Request $request, OfficialMemo $memo)
    {
        $this->authorizeOwner($memo);
        $memo->update($this->validatedPayload($request));

        return redirect()
            ->route('admin-docs.memos.edit', $memo)
            ->with('success', 'บันทึกการแก้ไขแล้ว');
    }

    public function destroy(OfficialMemo $memo)
    {
        $this->authorizeOwner($memo);
        $memo->delete();

        return redirect()
            ->route('admin-docs.memos.index')
            ->with('success', 'ลบหนังสือแล้ว');
    }

    public function docx(OfficialMemo $memo, OfficialMemoDocxService $docx): BinaryFileResponse
    {
        $this->authorizeOwner($memo);

        return $docx->download($memo->kind, $memo->thai_digits, $memo->sections ?? []);
    }

    public function export(Request $request, OfficialMemoDocxService $docx): BinaryFileResponse
    {
        $payload = $this->validatedPayload($request);

        return $docx->download($payload['kind'], $payload['thai_digits'], $payload['sections']);
    }

    public function settings()
    {
        OfficialMemoForms::ensureSystemForms();

        return Inertia::render('AdminDocs/Memos/Settings', [
            'settings' => $this->settingPayload(OfficialMemoSetting::current()),
            'forms' => $this->formsPayload(),
            'defaultLayouts' => [
                'internal' => OfficialMemoForms::defaultLayout('internal'),
                'external' => OfficialMemoForms::defaultLayout('external'),
                'order' => OfficialMemoForms::defaultLayout('order'),
            ],
        ]);
    }

    public function updateSettings(Request $request)
    {
        $data = $request->validate([
            'unit_name' => ['required', 'string', 'max:255'],
            'agency' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'phone' => ['nullable', 'string', 'max:100'],
            'fax' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:255'],
            'signer_name' => ['nullable', 'string', 'max:255'],
            'signer_position' => ['nullable', 'string', 'max:255'],
            'owner_unit' => ['nullable', 'string', 'max:255'],
        ]);

        OfficialMemoSetting::current()->update($data);

        return redirect()
            ->route('admin-docs.memos.settings')
            ->with('success', 'บันทึกหัวกระดาษแล้ว');
    }

    public function storeForm(Request $request)
    {
        OfficialMemoForms::ensureSystemForms();

        if ($request->input('key') === '') {
            $request->merge(['key' => null]);
        }

        $data = $request->validate([
            'label' => ['required', 'string', 'max:255'],
            'key' => ['nullable', 'string', 'max:60', 'regex:/^[a-z][a-z0-9_]*$/'],
            'clone_from' => ['required', 'string', Rule::in(array_keys(OfficialMemoForms::kinds()))],
            'base_layout' => ['nullable', 'in:internal,external,order'],
        ]);

        $source = OfficialMemoForm::query()->where('key', $data['clone_from'])->firstOrFail();
        $baseLayout = $data['base_layout'] ?? $source->base_layout;
        if (! in_array($baseLayout, ['internal', 'external', 'order'], true)) {
            $baseLayout = $source->base_layout;
        }

        $key = OfficialMemoForms::uniqueKeyFromLabel($data['label'], $data['key'] ?? null);
        $maxOrder = (int) OfficialMemoForm::query()->max('sort_order');

        $sourceLayout = is_array($source->layout) && $source->layout !== []
            ? OfficialMemoLayouts::normalize($source->layout, $baseLayout)
            : OfficialMemoForms::defaultLayout($baseLayout);

        OfficialMemoForm::query()->create([
            'key' => $key,
            'label' => $data['label'],
            'base_layout' => $baseLayout,
            'fields' => is_array($source->fields) ? $source->fields : OfficialMemoForms::defaultFields($baseLayout),
            'layout' => $sourceLayout,
            'is_system' => false,
            'sort_order' => $maxOrder + 1,
        ]);

        return redirect()
            ->route('admin-docs.memos.settings', ['tab' => 'forms'])
            ->with('success', 'สร้างแบบฟอร์มแล้ว');
    }

    public function updateForm(Request $request, OfficialMemoForm $form)
    {
        $data = $request->validate([
            'label' => ['required', 'string', 'max:255'],
            'base_layout' => ['nullable', 'in:internal,external,order'],
            'fields' => ['required', 'array', 'min:1'],
            'fields.*.key' => ['required', 'string', 'max:60'],
            'fields.*.label' => ['required', 'string', 'max:255'],
            'fields.*.type' => ['required', 'in:text,textarea,date,rank'],
            'fields.*.enabled' => ['nullable', 'boolean'],
            'fields.*.optional' => ['nullable', 'boolean'],
            'fields.*.placeholder' => ['nullable', 'string', 'max:500'],
            'fields.*.rows' => ['nullable', 'integer', 'min:1', 'max:30'],
            'fields.*.default' => ['nullable', 'string', 'max:2000'],
            'fields.*.options' => ['nullable', 'array'],
            'fields.*.options.*' => ['string', 'max:100'],
            'fields.*.setting' => ['nullable', 'string', 'max:60'],
            'fields.*.fallback_setting' => ['nullable', 'string', 'max:60'],
            'layout' => ['nullable', 'array'],
            'layout.page' => ['nullable', 'array'],
            'layout.page.width_cm' => ['nullable', 'numeric', 'min:10', 'max:30'],
            'layout.page.height_cm' => ['nullable', 'numeric', 'min:15', 'max:42'],
            'layout.page.margin_top_cm' => ['nullable', 'numeric', 'min:0.5', 'max:10'],
            'layout.page.margin_bottom_cm' => ['nullable', 'numeric', 'min:0.5', 'max:10'],
            'layout.page.margin_left_cm' => ['nullable', 'numeric', 'min:0.5', 'max:10'],
            'layout.page.margin_right_cm' => ['nullable', 'numeric', 'min:0.5', 'max:10'],
            'layout.page.orientation' => ['nullable', 'in:portrait,landscape'],
            'layout.page.font_family' => ['nullable', 'string', 'max:100'],
            'layout.page.font_size_pt' => ['nullable', 'integer', 'min:10', 'max:36'],
            'layout.page.line_spacing' => ['nullable', 'numeric', 'min:0.8', 'max:3.0'],
            'layout.blocks' => ['nullable', 'array'],
            'layout.blocks.*.id' => ['required_with:layout.blocks', 'string', 'max:80'],
            'layout.blocks.*.role' => ['required_with:layout.blocks', 'in:garuda,static,field,signature,copies,contact,rule'],
            'layout.blocks.*.x_cm' => ['required_with:layout.blocks', 'numeric', 'min:0', 'max:30'],
            'layout.blocks.*.y_cm' => ['required_with:layout.blocks', 'numeric', 'min:0', 'max:42'],
            'layout.blocks.*.w_cm' => ['required_with:layout.blocks', 'numeric', 'min:0.5', 'max:30'],
            'layout.blocks.*.h_cm' => ['nullable', 'numeric', 'min:0.4', 'max:30'],
            'layout.blocks.*.align' => ['nullable', 'in:left,center,right,justify'],
            'layout.blocks.*.font_pt' => ['nullable', 'integer', 'min:10', 'max:36'],
            'layout.blocks.*.font_family' => ['nullable', 'string', 'max:100'],
            'layout.blocks.*.bold' => ['nullable', 'boolean'],
            'layout.blocks.*.italic' => ['nullable', 'boolean'],
            'layout.blocks.*.underline' => ['nullable', 'boolean'],
            'layout.blocks.*.text_transform' => ['nullable', 'in:none,uppercase,lowercase,capitalize'],
            'layout.blocks.*.line_height' => ['nullable', 'numeric', 'min:0.8', 'max:3.0'],
            'layout.blocks.*.space_before_pt' => ['nullable', 'integer', 'min:0', 'max:72'],
            'layout.blocks.*.space_after_pt' => ['nullable', 'integer', 'min:0', 'max:72'],
            'layout.blocks.*.indent_cm' => ['nullable', 'numeric', 'min:0', 'max:10'],
            'layout.blocks.*.text' => ['nullable', 'string', 'max:500'],
            'layout.blocks.*.field' => ['nullable', 'string', 'max:60'],
            'layout.blocks.*.label' => ['nullable', 'string', 'max:255'],
        ]);

        $fields = [];
        foreach ($data['fields'] as $field) {
            $row = [
                'key' => $field['key'],
                'label' => $field['label'],
                'type' => $field['type'],
                'enabled' => (bool) ($field['enabled'] ?? false),
                'optional' => (bool) ($field['optional'] ?? false),
                'placeholder' => (string) ($field['placeholder'] ?? ''),
            ];
            if (($field['type'] ?? '') === 'textarea') {
                $row['rows'] = (int) ($field['rows'] ?? 3);
            }
            if (! empty($field['default'])) {
                $row['default'] = $field['default'];
            }
            if (! empty($field['options']) && is_array($field['options'])) {
                $row['options'] = array_values($field['options']);
            }
            if (! empty($field['setting'])) {
                $row['setting'] = $field['setting'];
            }
            if (! empty($field['fallback_setting'])) {
                $row['fallback_setting'] = $field['fallback_setting'];
            }
            $fields[] = $row;
        }

        $payload = [
            'label' => $data['label'],
            'fields' => $fields,
        ];

        if (! $form->is_system && ! empty($data['base_layout'])) {
            $payload['base_layout'] = $data['base_layout'];
        }

        $base = $payload['base_layout'] ?? $form->base_layout;
        if (isset($data['layout']) && is_array($data['layout'])) {
            $payload['layout'] = OfficialMemoLayouts::normalize($data['layout'], $base);
        }

        $form->update($payload);

        return redirect()
            ->route('admin-docs.memos.settings', ['tab' => 'forms'])
            ->with('success', 'บันทึกแบบฟอร์มแล้ว');
    }

    public function destroyForm(OfficialMemoForm $form)
    {
        if ($form->is_system) {
            return redirect()
                ->route('admin-docs.memos.settings', ['tab' => 'forms'])
                ->with('error', 'ไม่สามารถลบแบบฟอร์มระบบได้');
        }

        $form->delete();

        return redirect()
            ->route('admin-docs.memos.settings', ['tab' => 'forms'])
            ->with('success', 'ลบแบบฟอร์มแล้ว');
    }

    public function font(string $weight)
    {
        $file = match ($weight) {
            'bold' => resource_path('fonts/THSarabunNew-Bold.ttf'),
            'regular' => resource_path('fonts/THSarabunNew.ttf'),
            default => null,
        };

        if ($file === null || ! is_file($file)) {
            abort(404);
        }

        return response()->file($file, [
            'Content-Type' => 'font/ttf',
            'Cache-Control' => 'public, max-age=604800',
        ]);
    }

    public function dict()
    {
        $file = resource_path('dicts/thai-words.txt');
        if (! is_file($file)) {
            abort(404);
        }

        return response()->file($file, [
            'Content-Type' => 'text/plain; charset=UTF-8',
            'Cache-Control' => 'public, max-age=604800',
        ]);
    }

    public function transcribe(Request $request, FshhChatClient $chat)
    {
        $request->validate([
            'audio' => ['required', 'file', 'max:3072'],
        ]);

        $file = $request->file('audio');
        if (! $file) {
            return response()->json(['success' => false, 'error' => 'ไม่พบไฟล์เสียง', 'code' => 'NO_FILE'], 422);
        }

        $binary = file_get_contents($file->getRealPath());
        if ($binary === false || $binary === '') {
            return response()->json(['success' => false, 'error' => 'อ่านไฟล์เสียงไม่สำเร็จ', 'code' => 'READ'], 422);
        }

        $result = $chat->transcribe(
            $binary,
            $file->getClientOriginalName() ?: 'audio.webm',
            $file->getMimeType() ?: 'audio/webm'
        );

        $status = ($result['success'] ?? false) ? 200 : (
            ($result['code'] ?? '') === 'QUOTA' ? 429 : (
                ($result['code'] ?? '') === 'NOT_CONFIGURED' ? 503 : 502
            )
        );

        return response()->json($result, $status);
    }

    public function searchUsers(Request $request)
    {
        $q = trim($request->string('q')->toString());
        if (mb_strlen($q) < 1) {
            return response()->json(['users' => []]);
        }

        $variants = ThaiNameSearch::variants($q);
        if ($variants === []) {
            $variants = [$q];
        }

        $users = User::query()
            ->where(function ($query) use ($variants) {
                foreach ($variants as $variant) {
                    $like = '%'.$variant.'%';
                    $query->orWhere(function ($inner) use ($like) {
                        $inner->where('name', 'like', $like)
                            ->orWhere('prefix', 'like', $like)
                            ->orWhereRaw("CONCAT(COALESCE(prefix, ''), ' ', name) like ?", [$like]);
                    });
                }
            })
            ->orderBy('name')
            ->limit(40)
            ->get(['id', 'prefix', 'name', 'position']);

        return response()->json([
            'users' => $users->map(function (User $user) {
                $prefix = trim((string) $user->prefix);
                if ($prefix !== '' && preg_match('/^\+?\d+$/', $prefix)) {
                    $prefix = '';
                }
                $name = trim((string) $user->name);
                $display = $name;
                if ($prefix !== '' && $name !== '' && ! str_starts_with($name, $prefix)) {
                    $display = $prefix.' '.$name;
                }

                return [
                    'id' => $user->id,
                    'name' => $display !== '' ? $display : 'ไม่ระบุชื่อ',
                    'position' => filled($user->position) ? trim((string) $user->position) : null,
                ];
            })->values(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function editorProps(string $kind): array
    {
        $setting = OfficialMemoSetting::current();
        $user = auth()->user();
        $blanks = [];
        foreach (array_keys(OfficialMemoForms::kinds()) as $name) {
            $blanks[$name] = OfficialMemoForms::blankSections($name, $setting, $user);
        }

        return [
            'memo' => null,
            'kind' => $kind,
            'catalog' => OfficialMemoForms::catalog(),
            'blanks' => $blanks,
            'fonts' => [
                'regular' => route('admin-docs.memos.font', 'regular'),
                'bold' => route('admin-docs.memos.font', 'bold'),
            ],
        ];
    }

    /**
     * @return array{kind: string, subject: ?string, document_no: ?string, document_date: ?string, thai_digits: bool, sections: array<string, array{enabled: bool, value: string}>}
     */
    private function validatedPayload(Request $request): array
    {
        OfficialMemoForms::ensureSystemForms();
        $kindKeys = array_keys(OfficialMemoForms::kinds());

        $data = $request->validate([
            'kind' => ['required', 'string', Rule::in($kindKeys)],
            'thai_digits' => ['nullable', 'boolean'],
            'sections' => ['required', 'array'],
            'sections.*.enabled' => ['nullable', 'boolean'],
            'sections.*.value' => ['nullable', 'string', 'max:20000'],
        ]);

        $sections = $this->normalizeSections($data['kind'], $data['sections']);
        $subject = $sections['subject']['value'] ?? '';
        $documentNo = $sections['document_no']['value'] ?? '';

        return [
            'kind' => $data['kind'],
            'subject' => $subject !== '' ? mb_substr($subject, 0, 500) : null,
            'document_no' => $documentNo !== '' ? mb_substr($documentNo, 0, 120) : null,
            'document_date' => $this->pickDate($sections),
            'thai_digits' => (bool) ($data['thai_digits'] ?? false),
            'sections' => $sections,
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, array{enabled: bool, value: string}>
     */
    private function normalizeSections(string $kind, array $input): array
    {
        $sections = [];
        foreach (OfficialMemoForms::fields($kind) as $field) {
            $row = $input[$field['key']] ?? [];
            $row = is_array($row) ? $row : [];
            $value = trim((string) ($row['value'] ?? ''));
            if (($field['type'] ?? '') === 'date' && $value !== '' && ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
                $value = '';
            }

            $sections[$field['key']] = [
                'enabled' => array_key_exists('enabled', $row) ? (bool) $row['enabled'] : (bool) $field['enabled'],
                'value' => $value,
            ];
        }

        return $sections;
    }

    /**
     * @param  array<string, array{enabled: bool, value: string}>  $sections
     */
    private function pickDate(array $sections): ?string
    {
        foreach (['document_date', 'order_date'] as $key) {
            $value = $sections[$key]['value'] ?? '';
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
                return $value;
            }
        }

        return null;
    }

    private function kindOrDefault(string $kind): string
    {
        return isset(OfficialMemoForms::kinds()[$kind]) ? $kind : 'internal';
    }

    private function authorizeOwner(OfficialMemo $memo): void
    {
        if ($memo->user_id !== auth()->id()) {
            abort(403);
        }
    }

    /**
     * @return array<string, string|null>
     */
    private function settingPayload(OfficialMemoSetting $setting): array
    {
        return [
            'unit_name' => $setting->unit_name,
            'agency' => $setting->agency,
            'address' => $setting->address,
            'phone' => $setting->phone,
            'fax' => $setting->fax,
            'email' => $setting->email,
            'signer_name' => $setting->signer_name,
            'signer_position' => $setting->signer_position,
            'owner_unit' => $setting->owner_unit,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function formsPayload(): array
    {
        $forms = [];
        foreach (OfficialMemoForms::catalog() as $key => $entry) {
            $row = OfficialMemoForm::query()->where('key', $key)->first();
            $forms[] = [
                'id' => $row?->id,
                'key' => $key,
                'label' => $entry['label'],
                'base_layout' => $entry['base_layout'],
                'fields' => $entry['fields'],
                'layout' => $entry['layout'],
                'is_system' => $entry['is_system'],
                'sort_order' => $row?->sort_order ?? 0,
            ];
        }

        return $forms;
    }
}
