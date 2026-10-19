<?php

namespace App\Services\Hrd;

use App\Models\HrdAssessmentForm;
use App\Models\HrdAssessmentItem;
use Illuminate\Support\Collection;

class HrdAssessmentScoreService
{
    public function summarize(HrdAssessmentForm $form, array $answers): array
    {
        $form->loadMissing('sections.items');
        $sections = [];
        $weightTotal = 0.0;
        $weighted = 0.0;

        foreach ($form->sections as $section) {
            $items = $section->items;
            if ($items->isEmpty()) {
                continue;
            }
            $scores = $items->map(function (HrdAssessmentItem $item) use ($answers) {
                $value = (int) ($answers[$item->id] ?? $answers[(string) $item->id] ?? 0);

                return $this->itemPercent($value, $item->reverse_scored);
            });
            $sectionScore = round($scores->avg(), 2);
            $weight = (float) $section->weight;
            if ($weight <= 0) {
                $weight = 1;
            }
            $sections[] = [
                'title' => $section->title,
                'score' => $sectionScore,
                'weight' => $weight,
            ];
            $weightTotal += $weight;
            $weighted += $sectionScore * $weight;
        }

        $total = $weightTotal > 0 ? round($weighted / $weightTotal, 2) : 0;
        $band = $this->band($total);

        return [
            'total_score' => $total,
            'band' => $band['band'],
            'band_label' => $band['label'],
            'interpretation' => $this->interpretation($form, $band['band']),
            'section_scores' => $sections,
        ];
    }

    public function itemPercent(int $value, bool $reverse): float
    {
        $points = $reverse ? (6 - $value) : $value;
        $points = max(1, min(5, $points));

        return (($points - 1) / 4) * 100;
    }

    public function band(float $score): array
    {
        if ($score < 60) {
            return ['band' => 'develop', 'label' => 'ควรพัฒนา'];
        }
        if ($score < 80) {
            return ['band' => 'meet', 'label' => 'ตามเกณฑ์'];
        }

        return ['band' => 'good', 'label' => 'อยู่ในเกณฑ์ดี'];
    }

    public function interpretation(HrdAssessmentForm $form, string $band): string
    {
        if ($form->code === 'wellbeing' || $form->visibility === 'aggregate') {
            if ($band === 'develop') {
                return 'คะแนนอยู่ในช่วงควรพัฒนา แนะนำให้ปรึกษาหัวหน้างานหรือฝ่ายบุคคล ผลนี้ไม่ใช่การวินิจฉัย';
            }

            return 'คะแนนสะท้อนสุขภาวะในการทำงานช่วงนี้ ผลนี้ไม่ใช่การวินิจฉัย';
        }

        return match ($band) {
            'develop' => 'คะแนนรวมต่ำกว่า 60 ควรนำผลไปจัดแผนพัฒนา',
            'meet' => 'คะแนนรวมอยู่ในเกณฑ์',
            default => 'คะแนนรวมอยู่ในเกณฑ์ดี',
        };
    }

    public function departmentAverages(Collection $responses): array
    {
        return $responses
            ->groupBy(fn ($row) => $row->department_id ?: 0)
            ->map(function (Collection $rows) {
                $first = $rows->first();

                return [
                    'department' => $first->department?->name ?? 'ไม่ระบุกลุ่มงาน',
                    'count' => $rows->count(),
                    'average' => round($rows->avg('total_score'), 2),
                    'bands' => [
                        'develop' => $rows->where('band', 'develop')->count(),
                        'meet' => $rows->where('band', 'meet')->count(),
                        'good' => $rows->where('band', 'good')->count(),
                    ],
                ];
            })
            ->values()
            ->all();
    }
}
