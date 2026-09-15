<?php

namespace App\Console\Commands;

use App\Data\ImStaffEvaluationTopicCatalog;
use App\Models\Im\EvaluationTopic;
use App\Models\Im\StaffEvaluation;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SeedImStaffEvaluations extends Command
{
    protected $signature = 'im:seed-staff-evaluations {--fresh : ลบผลประเมินเดิมของรายชื่อชุดนี้ก่อนสร้างใหม่}';

    protected $description = 'สร้างแบบประเมินเจ้าหน้าที่ IT รอบ 6 เดือน ย้อนหลัง 5 ปี คะแนนสุ่มเกิน 3';

    /** @var list<string> */
    private array $staffNames = [
        'จ.ส.อ.กานต์ กานตะศิลป์',
        'นาย เกรียงไกร เกิดทะโสม',
        'นางสาว วิลัยรัตน์ มิดจังหรีด',
    ];

    public function handle(): int
    {
        $this->syncTopics();

        $topics = EvaluationTopic::query()
            ->where('is_active', true)
            ->where('is_group', false)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        if ($topics->isEmpty()) {
            $this->error('ไม่พบหัวข้อย่อยสำหรับให้คะแนน');

            return self::FAILURE;
        }

        if ($this->option('fresh')) {
            StaffEvaluation::query()
                ->whereIn('staff_name', $this->staffNames)
                ->where('period_months', 6)
                ->delete();
        }

        $cycles = $this->cycles();
        $created = 0;
        $updated = 0;

        DB::transaction(function () use ($topics, $cycles, &$created, &$updated) {
            foreach ($cycles as $cycle) {
                foreach ($this->staffNames as $name) {
                    $user = $this->matchUser($name);
                    $scoreRows = [];
                    $total = 0.0;
                    $maxTotal = 0.0;

                    foreach ($topics as $topic) {
                        $max = max(1, (int) $topic->max_score);
                        $weight = (float) $topic->weight;
                        $score = $this->randomScoreAboveThree($name, $cycle['start']->toDateString(), (int) $topic->id, $max);
                        $total += $score * $weight;
                        $maxTotal += $max * $weight;
                        $scoreRows[] = [
                            'topic_id' => $topic->id,
                            'topic_title' => $topic->title,
                            'max_score' => $max,
                            'weight' => $weight,
                            'score' => $score,
                            'note' => null,
                        ];
                    }

                    $percent = $maxTotal > 0 ? round(($total / $maxTotal) * 100, 2) : 0;
                    $payload = [
                        'user_id' => $user?->id,
                        'evaluator_id' => null,
                        'evaluator_name' => 'หัวหน้างานสารสนเทศ',
                        'period_months' => 6,
                        'period_end' => $cycle['end']->toDateString(),
                        'evaluated_at' => $cycle['end']->toDateString(),
                        'next_due_at' => $cycle['end']->copy()->addDay()->addMonths(6)->toDateString(),
                        'total_score' => round($total, 2),
                        'max_total_score' => round($maxTotal, 2),
                        'percent_score' => $percent,
                        'overall_comment' => $this->commentFor($percent),
                        'status' => 'completed',
                    ];

                    $evaluation = StaffEvaluation::query()->updateOrCreate(
                        [
                            'staff_name' => $name,
                            'period_start' => $cycle['start']->toDateString(),
                            'period_months' => 6,
                        ],
                        $payload
                    );

                    $evaluation->scores()->delete();
                    $evaluation->scores()->createMany($scoreRows);

                    if ($evaluation->wasRecentlyCreated) {
                        $created++;
                    } else {
                        $updated++;
                    }
                }
            }
        });

        $this->info('วงรอบ '.count($cycles).' รอบ · เจ้าหน้าที่ '.count($this->staffNames).' คน · สร้างใหม่ '.$created.' · อัปเดต '.$updated);
        $this->table(
            ['วงรอบ', 'เริ่ม', 'สิ้นสุด'],
            collect($cycles)->map(fn ($c, $i) => [
                $i + 1,
                $c['start']->toDateString(),
                $c['end']->toDateString(),
            ])->all()
        );

        return self::SUCCESS;
    }

    /** @return list<array{start: Carbon, end: Carbon}> */
    private function cycles(): array
    {
        $cycles = [];
        $start = Carbon::create(2021, 8, 1)->startOfDay();
        for ($i = 0; $i < 10; $i++) {
            $periodStart = $start->copy()->addMonths($i * 6);
            $periodEnd = $periodStart->copy()->addMonths(6)->subDay();
            $cycles[] = ['start' => $periodStart, 'end' => $periodEnd];
        }

        return $cycles;
    }

    private function matchUser(string $staffName): ?User
    {
        $needle = match (true) {
            str_contains($staffName, 'กานตะศิลป์') => 'กานตะศิลป์',
            str_contains($staffName, 'เกิดทะโสม') => 'เกิดทะโสม',
            str_contains($staffName, 'มิดจังหรีด') => 'มิดจังหรีด',
            default => null,
        };

        if (! $needle) {
            return null;
        }

        return User::query()->where('name', 'like', '%'.$needle.'%')->first();
    }

    private function randomScoreAboveThree(string $staff, string $periodStart, int $topicId, int $max): float
    {
        $pool = [3.5, 3.5, 4.0, 4.0, 4.0, 4.5, 4.5, 4.5, 5.0, 5.0];
        $index = abs(crc32($staff.'|'.$periodStart.'|'.$topicId)) % count($pool);
        $score = $pool[$index];

        return min($max, max(3.5, $score));
    }

    private function commentFor(float $percent): string
    {
        if ($percent >= 90) {
            return 'ผลการปฏิบัติงานสูงกว่าเกณฑ์มาตรฐาน HA/HAIT ในรอบนี้ ควรรักษาคุณภาพและเป็นแบบอย่างให้ทีม';
        }
        if ($percent >= 80) {
            return 'ปฏิบัติงานได้ตามเกณฑ์มาตรฐาน HA/HAIT ควรพัฒนาจุดที่ยังไม่เต็มคะแนนอย่างต่อเนื่อง';
        }

        return 'ผ่านเกณฑ์ขั้นต่ำของรอบนี้ ควรจัดทำแผนพัฒนารายบุคคลในหัวข้อที่ได้คะแนนต่ำกว่าค่าเฉลี่ยทีม';
    }

    private function syncTopics(): void
    {
        $sort = 0;
        foreach (ImStaffEvaluationTopicCatalog::tree() as $group) {
            $sort += 10;
            $parent = EvaluationTopic::query()->updateOrCreate(
                ['code' => $group['code']],
                [
                    'title' => $group['title'],
                    'description' => $group['description'],
                    'parent_id' => null,
                    'is_group' => true,
                    'max_score' => 0,
                    'weight' => 0,
                    'sort_order' => $sort,
                    'is_active' => true,
                ]
            );

            $childSort = $sort;
            foreach ($group['children'] as $child) {
                $childSort++;
                EvaluationTopic::query()->updateOrCreate(
                    ['code' => $child['code']],
                    [
                        'title' => $child['title'],
                        'description' => $child['description'],
                        'parent_id' => $parent->id,
                        'is_group' => false,
                        'max_score' => 5,
                        'weight' => 1,
                        'sort_order' => $childSort,
                        'is_active' => true,
                    ]
                );
            }
        }
    }
}
