<?php

namespace App\Http\Controllers\AdminDocs;

use App\Data\OfficialMemoForms;
use App\Http\Controllers\Controller;
use App\Models\OfficialMemo;
use App\Models\OfficialMemoSetting;
use App\Services\AdminDocs\OfficialMemoDocxService;
use Illuminate\Http\Request;
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
        return Inertia::render('AdminDocs/Memos/Settings', [
            'settings' => $this->settingPayload(OfficialMemoSetting::current()),
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
        $data = $request->validate([
            'kind' => ['required', 'in:internal,external,order'],
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
}
