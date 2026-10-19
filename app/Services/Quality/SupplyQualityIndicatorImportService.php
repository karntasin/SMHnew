<?php

namespace App\Services\Quality;

use App\Models\Department;
use App\Models\QualityIndicator;
use App\Models\QualityIndicatorEntry;
use App\Models\User;
use App\Services\QualityIndicatorFamilyService;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use ZipArchive;

class SupplyQualityIndicatorImportService
{
    private const DEPARTMENT_NAME = 'แผนกส่งกำลังและบริการ+ยานยนต์';

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
        $specs = $this->buildSpecs($this->readRows($path));

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
                        'notes' => null,
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
                    'description' => $spec['formula_description'],
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
     * @return list<list<list<string>>>
     */
    private function readRows(string $path): array
    {
        $zip = new ZipArchive();
        if ($zip->open($path) !== true) {
            throw new RuntimeException("เปิดไฟล์ไม่ได้: {$path}");
        }

        $xml = $zip->getFromName('word/document.xml');
        $zip->close();

        if (! is_string($xml) || $xml === '') {
            throw new RuntimeException('ไม่พบเนื้อหาในไฟล์ส่งกำลัง.docx');
        }

        $dom = new \DOMDocument();
        if (! $dom->loadXML($xml)) {
            throw new RuntimeException('อ่านตารางในส่งกำลัง.docx ไม่ได้');
        }

        $xpath = new \DOMXPath($dom);
        $xpath->registerNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');

        $rows = [];
        foreach ($xpath->query('//w:tbl/w:tr') as $tr) {
            $cells = [];
            foreach ($xpath->query('./w:tc', $tr) as $tc) {
                $paras = [];
                foreach ($xpath->query('.//w:p', $tc) as $paragraph) {
                    $text = '';
                    foreach ($xpath->query('.//w:t', $paragraph) as $node) {
                        $text .= $node->textContent;
                    }
                    $text = trim($text);
                    if ($text !== '') {
                        $paras[] = $text;
                    }
                }
                $cells[] = $paras;
            }
            $rows[] = $cells;
        }

        if ($rows === []) {
            throw new RuntimeException('ไม่พบตารางตัวชี้วัดในส่งกำลัง.docx');
        }

        return $rows;
    }

    /**
     * @param  list<list<list<string>>>  $rows
     * @return list<array{
     *     code: string,
     *     name: string,
     *     formula_description: string,
     *     unit: string,
     *     target_value: float,
     *     target_operator: string,
     *     entries: list<array{period_date: string, result_value: float}>
     * }>
     */
    private function buildSpecs(array $rows): array
    {
        $specs = [];
        $yearColumns = [];

        foreach ($rows as $index => $cells) {
            $flat = array_map(fn (array $paras) => trim(implode(' ', $paras)), $cells);

            if ($this->isHeader($flat)) {
                $yearColumns = $this->yearColumns($flat);

                continue;
            }

            if ($yearColumns === [] || ! preg_match('/^\d+$/u', $flat[0] ?? '') ) {
                continue;
            }

            $number = (int) $flat[0];
            $name = $flat[1] ?? '';
            $targetText = $flat[2] ?? '';
            if ($name === '' || $targetText === '') {
                throw new RuntimeException('แถวที่ '.($index + 1).' ไม่มีชื่อหรือเป้าหมาย');
            }

            $target = $this->parseTarget($targetText, $name);
            $code = 'ssa-'.str_pad((string) $number, 2, '0', STR_PAD_LEFT);
            $entries = [];

            foreach ($yearColumns as $column) {
                $raw = $flat[$column['index']] ?? '';
                if ($raw === '' || in_array($raw, ['-', '–', '—'], true)) {
                    continue;
                }
                if (! is_numeric($raw)) {
                    throw new RuntimeException("ผลปี {$column['yy']} ของ {$code} ไม่ใช่ตัวเลข: {$raw}");
                }

                $entries[] = [
                    'period_date' => $this->periodDate($column['yy']),
                    'result_value' => round((float) $raw, 2),
                ];
            }

            if ($entries === []) {
                throw new RuntimeException("ไม่พบผลรายปีของ {$code}");
            }

            $specs[] = [
                'code' => $code,
                'name' => $name,
                'formula_description' => $targetText,
                'unit' => $target['unit'],
                'target_value' => $target['target'],
                'target_operator' => $target['operator'],
                'entries' => $entries,
            ];
        }

        if (count($specs) !== 9) {
            throw new RuntimeException('ต้องได้ตัวชี้วัด 9 รายการ แต่พบ '.count($specs).' รายการ');
        }

        $codes = array_column($specs, 'code');
        if ($codes !== ['ssa-01', 'ssa-02', 'ssa-03', 'ssa-04', 'ssa-05', 'ssa-06', 'ssa-07', 'ssa-08', 'ssa-09']) {
            throw new RuntimeException('รหัสไม่ครบ ssa-01 ถึง ssa-09');
        }

        return $specs;
    }

    /**
     * @param  list<string>  $cells
     */
    private function isHeader(array $cells): bool
    {
        $hasName = false;
        $hasYear = false;
        foreach ($cells as $cell) {
            if (str_contains($cell, 'ตัวชี้วัด')) {
                $hasName = true;
            }
            if (preg_match('/^\d{4}$/u', $cell) === 1) {
                $hasYear = true;
            }
        }

        return $hasName && $hasYear;
    }

    /**
     * @param  list<string>  $cells
     * @return list<array{index: int, yy: int}>
     */
    private function yearColumns(array $cells): array
    {
        $columns = [];
        foreach ($cells as $index => $cell) {
            if (preg_match('/^\d{4}$/u', $cell) === 1) {
                $columns[] = ['index' => $index, 'yy' => (int) $cell];
            }
        }

        if ($columns === []) {
            throw new RuntimeException('ไม่พบคอลัมน์ปีในตาราง');
        }

        return $columns;
    }

    /**
     * @return array{operator: string, target: float, unit: string}
     */
    private function parseTarget(string $text, string $name): array
    {
        $text = trim(preg_replace('/\s+/u', ' ', $text) ?? $text);

        if (preg_match('/^มากกว่า\s+(\d+(?:\.\d+)?)\s*%$/u', $text, $matches) === 1) {
            return ['operator' => '>', 'target' => (float) $matches[1], 'unit' => '%'];
        }

        if (preg_match('/^น้อยกว่า\s+(\d+(?:\.\d+)?)\s*ครั้ง$/u', $text, $matches) === 1) {
            return ['operator' => '<', 'target' => (float) $matches[1], 'unit' => 'ครั้ง'];
        }

        if ($text === '100%') {
            return ['operator' => '>=', 'target' => 100.0, 'unit' => '%'];
        }

        if ($text === '0 ครั้ง') {
            return ['operator' => '<=', 'target' => 0.0, 'unit' => 'ครั้ง'];
        }

        if ($text === '0' && str_contains($name, 'ร้อยละ')) {
            return ['operator' => '<=', 'target' => 0.0, 'unit' => '%'];
        }

        throw new RuntimeException("ไม่รู้จักเป้าหมาย \"{$text}\" ของ {$name}");
    }

    private function periodDate(int $yy): string
    {
        $ce = $yy > 2400 ? $yy - 543 : $yy;

        return sprintf('%04d-01-01', $ce);
    }

    /**
     * @param  array<string, mixed>  $spec
     * @return array{0: QualityIndicator, 1: bool}
     */
    private function upsertIndicator(array $spec, int $departmentId): array
    {
        $payload = [
            'name' => $spec['name'],
            'description' => null,
            'category' => 'Non-Clinical',
            'unit' => $spec['unit'],
            'target_value' => $spec['target_value'],
            'target_operator' => $spec['target_operator'],
            'frequency' => 'Yearly',
            'formula_description' => $spec['formula_description'],
        ];

        $existing = QualityIndicator::query()->where('code', $spec['code'])->first()
            ?? QualityIndicator::onlyTrashed()->where('code', $spec['code'])->orderByDesc('id')->first();

        if ($existing) {
            $this->assertDepartmentOwner($existing, $departmentId);

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

    private function assertDepartmentOwner(QualityIndicator $indicator, int $departmentId): void
    {
        if ($indicator->type !== 'department' || (int) $indicator->department_id !== $departmentId) {
            throw new RuntimeException("รหัส {$indicator->code} ถูกใช้โดยสังกัดอื่นแล้ว จึงไม่นำเข้าและไม่เขียนทับ");
        }
    }

    private function departmentId(): int
    {
        $id = Department::query()->where('name', self::DEPARTMENT_NAME)->value('id');
        if ($id) {
            return (int) $id;
        }

        $matched = Department::query()->get(['id', 'name'])->first(function (Department $department) {
            $name = $this->toUtf8((string) $department->name);

            return str_contains($name, 'ส่งกำลัง') && str_contains($name, 'ยานยนต์');
        });

        if (! $matched) {
            throw new RuntimeException('ไม่พบแผนก '.self::DEPARTMENT_NAME);
        }

        return (int) $matched->id;
    }

    private function toUtf8(string $value): string
    {
        if (mb_check_encoding($value, 'UTF-8') && preg_match('/\p{Thai}/u', $value) === 1) {
            return $value;
        }

        $converted = iconv('CP874', 'UTF-8//IGNORE', $value);

        return is_string($converted) && $converted !== '' ? $converted : $value;
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
