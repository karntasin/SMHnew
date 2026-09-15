<?php

namespace App\Http\Controllers;

use App\Models\QualityIndicatorGuide;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class QualityIndicatorGuideController extends Controller
{
    public function show(Request $request): Response
    {
        $guide = QualityIndicatorGuide::current()->loadMissing('editor');

        return Inertia::render('QualityIndicators/Guide', [
            'guide' => $guide->toPageArray(),
            'can_edit' => $this->canEdit($request),
        ]);
    }

    public function edit(Request $request): Response
    {
        abort_unless($this->canEdit($request), 403);

        $guide = QualityIndicatorGuide::current()->loadMissing('editor');

        return Inertia::render('QualityIndicators/GuideEdit', [
            'guide' => $guide->toPageArray(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        abort_unless($this->canEdit($request), 403);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'intro' => ['nullable', 'string', 'max:5000'],
            'sections' => ['required', 'array', 'min:1'],
            'sections.*.id' => ['nullable', 'string', 'max:80'],
            'sections.*.title' => ['required', 'string', 'max:255'],
            'sections.*.icon' => ['nullable', 'string', 'max:50'],
            'sections.*.summary' => ['nullable', 'string', 'max:500'],
            'sections.*.body' => ['nullable', 'string', 'max:10000'],
            'sections.*.bullets' => ['nullable', 'array'],
            'sections.*.bullets.*' => ['nullable', 'string', 'max:1000'],
            'sections.*.steps' => ['nullable', 'array'],
            'sections.*.steps.*' => ['nullable', 'string', 'max:1000'],
            'sections.*.tips' => ['nullable', 'array'],
            'sections.*.tips.*' => ['nullable', 'string', 'max:1000'],
            'sections.*.warnings' => ['nullable', 'array'],
            'sections.*.warnings.*' => ['nullable', 'string', 'max:1000'],
        ]);

        $sections = collect($validated['sections'])
            ->values()
            ->map(function (array $section, int $index) {
                $title = trim((string) ($section['title'] ?? ''));
                $id = trim((string) ($section['id'] ?? ''));

                if ($id === '') {
                    $id = Str::slug($title) ?: 'section-'.($index + 1);
                }

                return [
                    'id' => $id,
                    'title' => $title,
                    'icon' => trim((string) ($section['icon'] ?? 'BookOpen')) ?: 'BookOpen',
                    'summary' => trim((string) ($section['summary'] ?? '')),
                    'body' => trim((string) ($section['body'] ?? '')),
                    'bullets' => $this->cleanList($section['bullets'] ?? []),
                    'steps' => $this->cleanList($section['steps'] ?? []),
                    'tips' => $this->cleanList($section['tips'] ?? []),
                    'warnings' => $this->cleanList($section['warnings'] ?? []),
                ];
            })
            ->all();

        $guide = QualityIndicatorGuide::current();
        $guide->fill([
            'title' => $validated['title'],
            'subtitle' => $validated['subtitle'] ?? null,
            'intro' => $validated['intro'] ?? null,
            'sections' => $sections,
            'updated_by' => $request->user()?->id,
        ])->save();

        return redirect()
            ->route('quality-indicators.guide')
            ->with('success', 'บันทึกคู่มือเรียบร้อยแล้ว');
    }

    public function reset(Request $request): RedirectResponse
    {
        abort_unless($this->canEdit($request), 403);

        QualityIndicatorGuide::current()->resetToDefaults($request->user()?->id);

        return redirect()
            ->route('quality-indicators.guide.edit')
            ->with('success', 'คืนค่าคู่มือเป็นค่าเริ่มต้นของระบบแล้ว');
    }

    private function canEdit(Request $request): bool
    {
        $user = $request->user();

        if (! $user) {
            return false;
        }

        return method_exists($user, 'hasRole') && $user->hasRole('admin');
    }

    /**
     * @param  array<int, mixed>  $items
     * @return array<int, string>
     */
    private function cleanList(array $items): array
    {
        return collect($items)
            ->map(fn ($item) => trim((string) $item))
            ->filter(fn ($item) => $item !== '')
            ->values()
            ->all();
    }
}
