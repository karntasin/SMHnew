<?php

namespace App\Services\Quality;

use App\Models\Department;
use App\Models\QualityIndicator;
use App\Models\QualityIndicatorEntry;
use App\Models\User;
use App\Services\QualityIndicatorFamilyService;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use RuntimeException;

class MplQualityIndicatorImportService
{
    public function __construct(private QualityIndicatorFamilyService $families) {}

    /**
     * @return array{
     *     created: int,
     *     updated: int,
     *     entries_created: int,
     *     entries_updated: int,
     *     indicators: list<array{code: string, name: string, entries: int, description: ?string}>
     * }
     */
    public function import(string $path): array
    {
        $specs = $this->buildSpecs($path);

        return DB::transaction(function () use ($specs) {
            $departmentId = $this->departmentId();
            $userId = $this->actorId();
            $created = 0;
            $updated = 0;
            $entriesCreated = 0;
            $entriesUpdated = 0;
            $indicators = [];

            foreach ($specs as $spec) {
                [$indicator, $wasCreated] = $this->upsertIndicator($spec, $departmentId);
                $wasCreated ? $created++ : $updated++;

                $master = $this->families->masterOf($indicator);
                $entryCount = 0;

                foreach ($spec['entries'] as $entry) {
                    $existing = $master->entries()
                        ->whereDate('period_date', $entry['period_date'])
                        ->first();

                    $payload = [
                        'numerator' => null,
                        'denominator' => null,
                        'result_value' => $entry['result_value'],
                        'notes' => $entry['notes'],
                    ];

                    if ($existing) {
                        $existing->update($payload);
                        $entriesUpdated++;
                    } else {
                        QualityIndicatorEntry::create([
                            'quality_indicator_id' => $master->id,
                            'period_date' => $entry['period_date'],
                            'created_by' => $userId,
                            ...$payload,
                        ]);
                        $entriesCreated++;
                    }

                    $entryCount++;
                }

                $indicators[] = [
                    'code' => $spec['code'],
                    'name' => $spec['name'],
                    'entries' => $entryCount,
                    'description' => $spec['description'],
                ];
            }

            return [
                'created' => $created,
                'updated' => $updated,
                'entries_created' => $entriesCreated,
                'entries_updated' => $entriesUpdated,
                'indicators' => $indicators,
            ];
        });
    }

    /**
     * @return list<array{
     *     code: string,
     *     name: string,
     *     description: ?string,
     *     category: string,
     *     unit: string,
     *     target_value: float,
     *     target_operator: string,
     *     frequency: string,
     *     formula_description: null,
     *     entries: list<array{period_date: string, result_value: float, notes: ?string}>
     * }>
     */
    private function buildSpecs(string $path): array
    {
        $sheet = IOFactory::load($path)->getSheet(0);
        $rows = $sheet->toArray(null, true, true, false);
        $headerIndex = $this->headerIndex($rows);
        $yearColumns = $this->yearColumns($rows[$headerIndex]);
        $specs = [];
        $sequence = 0;

        for ($i = $headerIndex + 1, $count = count($rows); $i < $count; $i++) {
            $name = $this->indicatorName((string) ($rows[$i][0] ?? ''));
            if ($name === '') {
                continue;
            }

            $sequence++;
            $targetText = trim((string) ($rows[$i][1] ?? ''));
            $target = $this->leadingNumber($targetText);
            if ($target === null) {
                throw new RuntimeException("ไม่พบค่าเป้าหมายของ {$name}");
            }

            $unit = 'ครั้ง';
            $notes = [];
            $entries = [];

            foreach ($yearColumns as $column) {
                $raw = trim((string) ($rows[$i][$column['index']] ?? ''));
                if ($raw === '' || in_array($raw, ['-', '–', '—'], true)) {
                    continue;
                }
                if (preg_match('/^NA\b/iu', $raw) === 1) {
                    $notes[] = 'ปี '.$column['yy'].': '.$raw;

                    continue;
                }

                $value = $this->leadingNumber($raw);
                if ($value === null) {
                    $notes[] = 'ปี '.$column['yy'].': '.$raw;

                    continue;
                }

                if (str_contains($raw, '%')) {
                    $unit = '%';
                }

                $bare = preg_match('/^-?\d+(?:\.\d+)?$/u', $raw) === 1
                    || preg_match('/^-?\d+(?:\.\d+)?\s*ครั้ง$/u', $raw) === 1;

                $entries[] = [
                    'period_date' => $this->periodDate($column['yy']),
                    'result_value' => round($value, 2),
                    'notes' => $bare ? null : $raw,
                ];
            }

            $specs[] = [
                'code' => 'mp-'.str_pad((string) $sequence, 2, '0', STR_PAD_LEFT),
                'name' => $name,
                'description' => $notes === [] ? null : implode("\n", $notes),
                'category' => 'หมวดพลเสนารักษ์',
                'unit' => $unit,
                'target_value' => round($target, 2),
                'target_operator' => $this->operator($name, $target),
                'frequency' => 'Yearly',
                'formula_description' => null,
                'entries' => $entries,
            ];
        }

        if ($specs === []) {
            throw new RuntimeException('ไม่พบตัวชี้วัดในไฟล์หมวดพล');
        }

        return $specs;
    }

    /**
     * @param  array<string, mixed>  $spec
     * @return array{0: QualityIndicator, 1: bool}
     */
    private function upsertIndicator(array $spec, int $departmentId): array
    {
        $payload = [
            'name' => $spec['name'],
            'description' => $spec['description'],
            'category' => $spec['category'],
            'unit' => $spec['unit'],
            'target_value' => $spec['target_value'],
            'target_operator' => $spec['target_operator'],
            'frequency' => $spec['frequency'],
            'formula_description' => $spec['formula_description'],
        ];

        $existing = QualityIndicator::query()->where('code', $spec['code'])->first()
            ?? QualityIndicator::onlyTrashed()->where('code', $spec['code'])->orderByDesc('id')->first();

        if ($existing) {
            if ($existing->type !== 'department' || (int) $existing->department_id !== $departmentId) {
                throw new RuntimeException("รหัส {$spec['code']} ถูกใช้โดยสังกัดอื่นแล้ว จึงไม่นำเข้าและไม่เขียนทับ");
            }

            if ($existing->trashed()) {
                $this->families->restoreIndicator($existing);
            }

            return [$this->families->updateSharedAndLocal($existing, $payload), false];
        }

        return [$this->families->createStandalone([
            ...$payload,
            'type' => 'department',
            'department_id' => $departmentId,
            'code' => $spec['code'],
            'is_active' => true,
        ]), true];
    }

    /**
     * @param  list<array<int, mixed>>  $rows
     */
    private function headerIndex(array $rows): int
    {
        foreach ($rows as $index => $row) {
            foreach ($row as $cell) {
                if (preg_match('/ปี\s*\d{2,4}/u', (string) $cell) === 1) {
                    return $index;
                }
            }
        }

        throw new RuntimeException('ไม่พบแถวปีในไฟล์หมวดพล');
    }

    /**
     * @param  array<int, mixed>  $header
     * @return list<array{index: int, yy: int}>
     */
    private function yearColumns(array $header): array
    {
        $columns = [];
        foreach ($header as $index => $cell) {
            if (preg_match('/ปี\s*(\d{2,4})/u', (string) $cell, $matches) === 1) {
                $columns[] = ['index' => $index, 'yy' => (int) $matches[1]];
            }
        }

        if ($columns === []) {
            throw new RuntimeException('ไม่พบคอลัมน์ปีในไฟล์หมวดพล');
        }

        return $columns;
    }

    private function indicatorName(string $text): string
    {
        $text = trim($text);
        $text = trim((string) preg_replace('/^[-–]\s*/u', '', $text));
        if (in_array($text, ['', 'ตัวชี้วัด', '(KPI)', 'KPI'], true)) {
            return '';
        }

        return $text;
    }

    private function operator(string $name, float $target): string
    {
        if (str_contains($name, 'ผ่าน')) {
            return '>=';
        }

        if ($target == 0.0 || str_contains($name, 'ร้องเรียน') || str_contains($name, 'Heat Stroke') || str_contains($name, 'เกิด')) {
            return '<=';
        }

        return '>=';
    }

    private function periodDate(int $yy): string
    {
        $ce = match (true) {
            $yy > 2400 => $yy - 543,
            $yy > 100 => $yy,
            default => 2500 + $yy - 543,
        };

        return sprintf('%04d-01-01', $ce);
    }

    private function leadingNumber(string $text): ?float
    {
        if (preg_match('/^(-?\d+(?:\.\d+)?)/u', trim($text), $matches) !== 1) {
            return null;
        }

        return (float) $matches[1];
    }

    private function departmentId(): int
    {
        $departmentId = Department::query()->where('name', 'หมวดพลเสนารักษ์')->value('id');
        if (! $departmentId) {
            throw new RuntimeException('ไม่พบแผนกหมวดพลเสนารักษ์');
        }

        return (int) $departmentId;
    }

    private function actorId(): int
    {
        $userId = User::query()->orderBy('id')->value('id');
        if (! $userId) {
            throw new RuntimeException('ไม่พบผู้ใช้สำหรับบันทึกงวดตัวชี้วัด');
        }

        return (int) $userId;
    }
}
