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

class DepartmentKpiWorkbookImportService
{
    public function __construct(private QualityIndicatorFamilyService $families) {}

    /**
     * @return array{
     *     created: int,
     *     updated: int,
     *     entries_created: int,
     *     entries_updated: int,
     *     department_name: string,
     *     indicators: list<array{code: string, name: string, entries: int, description: ?string}>
     * }
     */
    public function import(string $path, string $departmentCode): array
    {
        $department = $this->department($departmentCode);
        $prefix = $this->prefix((string) $department->code);
        $specs = $this->buildSpecs($this->readGrid($path), $prefix, (string) $department->name);

        return $this->saveSpecs($department, $specs);
    }

    /**
     * @return array{
     *     created: int,
     *     updated: int,
     *     entries_created: int,
     *     entries_updated: int,
     *     department_name: string,
     *     indicators: list<array{code: string, name: string, entries: int, description: ?string}>
     * }
     */
    public function importFinance(string $path, string $departmentCode): array
    {
        $department = $this->department($departmentCode);
        $prefix = $this->prefix((string) $department->code);
        $specs = $this->buildFinanceSpecs($this->readGrid($path), $prefix, (string) $department->name);

        return $this->saveSpecs($department, $specs);
    }

    /**
     * @param  list<array<string, mixed>>  $specs
     * @return array{
     *     created: int,
     *     updated: int,
     *     entries_created: int,
     *     entries_updated: int,
     *     department_name: string,
     *     indicators: list<array{code: string, name: string, entries: int, description: ?string}>
     * }
     */
    private function saveSpecs(Department $department, array $specs): array
    {
        return DB::transaction(function () use ($specs, $department) {
            $departmentId = (int) $department->id;
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
                        ->where('series_key', '')
                        ->first();

                    $payload = [
                        'series_key' => '',
                        'numerator' => $entry['numerator'],
                        'denominator' => $entry['denominator'],
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
            'department_name' => (string) $department->name,
            'indicators' => $indicators,
        ];
        });
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function parseSpecs(string $path, string $prefix, string $category): array
    {
        return $this->buildSpecs($this->readGrid($path), $this->prefix($prefix), $category);
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function readGrid(string $path): array
    {
        $book = IOFactory::load($path);
        $sheet = $book->getSheetByName('KPI ตามต้นฉบับ') ?? $book->getSheet(0);
        $grid = [];
        $highestColumn = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($sheet->getHighestColumn());

        for ($row = 1; $row <= (int) $sheet->getHighestRow(); $row++) {
            for ($index = 1; $index <= $highestColumn; $index++) {
                $column = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($index);
                $value = trim((string) $sheet->getCell($column.$row)->getFormattedValue());
                $value = trim((string) preg_replace('/\s+/u', ' ', $value));
                if ($value !== '') {
                    $grid[$row][$column] = $value;
                }
            }
        }

        if ($grid === []) {
            throw new RuntimeException('ไม่พบข้อมูลในไฟล์ตัวชี้วัด');
        }

        return $grid;
    }

    /**
     * @param  array<int, array<string, string>>  $grid
     * @return list<array<string, mixed>>
     */
    private function buildSpecs(array $grid, string $prefix, string $category): array
    {
        $headerRow = null;
        $yearColumns = [];
        foreach ($grid as $row => $cells) {
            $columns = $this->yearColumns($cells);
            if ($columns !== []) {
                $headerRow = $row;
                $yearColumns = $columns;
                break;
            }
        }

        if ($headerRow === null) {
            throw new RuntimeException('ไม่พบแถวปีในไฟล์ตัวชี้วัด');
        }

        $specs = [];
        $codes = [];

        foreach ($grid as $row => $cells) {
            if ($row <= $headerRow || preg_match('/^(\d+)\.\s*(.+)$/u', $cells['A'] ?? '', $matches) !== 1) {
                continue;
            }

            $number = (int) $matches[1];
            $name = trim($matches[2]);
            $targetText = trim($cells['B'] ?? '');
            $target = $this->parseTarget($targetText, $name);
            $code = $prefix.'-'.str_pad((string) $number, 2, '0', STR_PAD_LEFT);
            if (isset($codes[$code])) {
                throw new RuntimeException("รหัส {$code} ซ้ำในไฟล์");
            }
            $codes[$code] = true;

            $notes = [];
            $entries = [];
            foreach ($yearColumns as $column) {
                $raw = $cells[$column['column']] ?? '';
                if ($raw === '' || in_array($raw, ['-', '–', '—'], true)) {
                    continue;
                }
                if (preg_match('/^NA\b/iu', $raw) === 1) {
                    $notes[] = 'ปี '.$column['label'].': '.$raw;

                    continue;
                }

                $measurement = $this->measurement($raw, $name, $column['note']);
                $entries[] = [
                    'period_date' => $this->periodDate($column['year']),
                    ...$measurement,
                ];
            }

            $specs[] = [
                'row' => $row,
                'code' => $code,
                'name' => $name,
                'description' => $notes === [] ? null : implode("\n", $notes),
                'category' => $category,
                'unit' => $target['unit'],
                'target_value' => $target['target'],
                'target_operator' => $target['operator'],
                'frequency' => 'Yearly',
                'formula_description' => $targetText !== '' ? $targetText : null,
                'entries' => $entries,
            ];
        }

        if ($specs === []) {
            throw new RuntimeException('ไม่พบตัวชี้วัดในไฟล์');
        }

        return $specs;
    }

    /**
     * ไฟล์การเงิน: คอลัมน์ A เป็นเลขข้อ, B เป็นชื่อ, C เป็นเป้าหมาย
     * แถวที่เป้าหมายเป็นชื่ออัตราส่วนแยกกัน จะกลายเป็นตัวชี้วัดคนละรหัสตามลำดับแถว
     *
     * @param  array<int, array<string, string>>  $grid
     * @return list<array<string, mixed>>
     */
    private function buildFinanceSpecs(array $grid, string $prefix, string $category): array
    {
        $headerRow = null;
        $yearColumns = [];
        foreach ($grid as $row => $cells) {
            $columns = $this->yearColumns($cells);
            if ($columns !== []) {
                $headerRow = $row;
                $yearColumns = $columns;
                break;
            }
        }

        if ($headerRow === null) {
            throw new RuntimeException('ไม่พบแถวปีในไฟล์ตัวชี้วัด');
        }

        $rows = array_values(array_filter(array_keys($grid), fn (int $row) => $row > $headerRow));
        $specs = [];
        $sequence = 1;
        $cursor = 0;

        while ($cursor < count($rows)) {
            $cells = $grid[$rows[$cursor]];
            $itemNo = trim($cells['A'] ?? '');
            $name = trim($cells['B'] ?? '');
            if (preg_match('/^\d+$/', $itemNo) !== 1 || $name === '') {
                $cursor++;

                continue;
            }

            $targetText = trim($cells['C'] ?? '');
            if ($this->namedMeasure($targetText) !== null) {
                while ($cursor < count($rows)) {
                    $subCells = $grid[$rows[$cursor]];
                    $subNo = trim($subCells['A'] ?? '');
                    $subTarget = trim($subCells['C'] ?? '');
                    $measure = $this->namedMeasure($subTarget);
                    if ($subNo !== '' && $cursor > 0 && $specs !== [] && $subNo !== $itemNo) {
                        break;
                    }
                    if ($measure === null) {
                        break;
                    }
                    if ($subNo !== '' && $subNo !== $itemNo) {
                        break;
                    }

                    $specs[] = $this->financeSpec(
                        $rows[$cursor],
                        $prefix,
                        $sequence,
                        $name.' — '.$measure['label'],
                        $measure,
                        $subTarget,
                        $subCells,
                        $yearColumns,
                        $category,
                    );
                    $sequence++;
                    $cursor++;
                }

                continue;
            }

            $specs[] = $this->financeSpec(
                $rows[$cursor],
                $prefix,
                $sequence,
                $name,
                $this->financeTarget($targetText, $name),
                $targetText,
                $cells,
                $yearColumns,
                $category,
            );
            $sequence++;
            $cursor++;
        }

        if ($specs === []) {
            throw new RuntimeException('ไม่พบตัวชี้วัดในไฟล์');
        }

        return $specs;
    }

    /**
     * @param  array{operator: string, target: ?float, unit: string}  $target
     * @param  list<array{column: string, year: int, label: int, note: ?string}>  $yearColumns
     * @param  array<string, string>  $cells
     * @return array<string, mixed>
     */
    private function financeSpec(
        int $row,
        string $prefix,
        int $sequence,
        string $name,
        array $target,
        string $targetText,
        array $cells,
        array $yearColumns,
        string $category,
    ): array {
        $notes = [];
        $entries = [];
        foreach ($yearColumns as $column) {
            $raw = $cells[$column['column']] ?? '';
            if ($raw === '' || in_array($raw, ['-', '–', '—'], true)) {
                continue;
            }
            if (preg_match('/^NA\b/iu', $raw) === 1 || preg_match('/^-?\d/', str_replace(',', '', $raw)) !== 1) {
                $notes[] = 'ปี '.$column['label'].': '.$raw;

                continue;
            }

            $entries[] = [
                'period_date' => $this->periodDate($column['year']),
                ...$this->measurement($raw, $name, $column['note']),
            ];
        }

        return [
            'row' => $row,
            'code' => $prefix.'-'.str_pad((string) $sequence, 2, '0', STR_PAD_LEFT),
            'name' => $name,
            'description' => $notes === [] ? null : implode("\n", $notes),
            'category' => $category,
            'unit' => $target['unit'],
            'target_value' => $target['target'],
            'target_operator' => $target['operator'],
            'frequency' => 'Yearly',
            'formula_description' => $targetText !== '' ? $targetText : null,
            'entries' => $entries,
        ];
    }

    /**
     * @return array{operator: string, target: float, unit: string, label: string}|null
     */
    private function namedMeasure(string $text): ?array
    {
        if (preg_match('/^(.+?)\s*(>=|<=|>|<|=)\s*(\d+(?:\.\d+)?)$/u', $text, $matches) !== 1) {
            return null;
        }

        $label = trim($matches[1]);
        if ($label === '' || preg_match('/^\d/', $label) === 1) {
            return null;
        }

        return [
            'operator' => $matches[2],
            'target' => round((float) $matches[3], 2),
            'unit' => 'เท่า',
            'label' => $label,
        ];
    }

    /**
     * @return array{operator: string, target: ?float, unit: string}
     */
    private function financeTarget(string $text, string $name): array
    {
        if (preg_match('/^มากกว่า\s*(\d+(?:\.\d+)?)/u', $text, $matches) === 1) {
            return [
                'operator' => '>',
                'target' => round((float) $matches[1], 2),
                'unit' => str_contains($name, 'คะแนน') ? 'คะแนน' : 'ครั้ง',
            ];
        }

        return $this->parseTarget($text, $name);
    }

    /**
     * @param  array<string, string>  $cells
     * @return list<array{column: string, year: int, label: int, note: ?string}>
     */
    private function yearColumns(array $cells): array
    {
        $columns = [];
        foreach ($cells as $column => $value) {
            if (preg_match('/ปี\s*(\d{2,4})/u', $value, $matches) === 1) {
                $year = (int) $matches[1];
            } elseif (preg_match('/^(25\d{2}|26\d{2})$/', $value, $matches) === 1) {
                $year = (int) $matches[1];
            } else {
                continue;
            }
            $buddhist = $year > 2400 ? $year : 2500 + $year;
            $note = null;
            if (preg_match('/\(([^)]+)\)/u', $value, $partial) === 1) {
                $note = 'ข้อมูลถึงเดือน '.trim($partial[1]).' '.$buddhist;
            }

            $columns[] = ['column' => $column, 'year' => $year, 'label' => $buddhist, 'note' => $note];
        }

        return $columns;
    }

    /**
     * @return array{operator: string, target: ?float, unit: string}
     */
    private function parseTarget(string $text, string $name): array
    {
        if ($text === '') {
            return ['operator' => '<', 'target' => null, 'unit' => $this->unit($name, $text, null)];
        }

        if (preg_match('/^ไม่พบ/u', $text) === 1) {
            return ['operator' => '<=', 'target' => 0.0, 'unit' => 'ครั้ง'];
        }

        if (preg_match('/^(>=|<=|>|<|=)\s*(\d+(?:\.\d+)?)\s*(นาที|ครั้ง|%)?(?:\s*\/\s*ปี)?$/u', $text, $matches) === 1) {
            return [
                'operator' => $matches[1],
                'target' => round((float) $matches[2], 2),
                'unit' => $this->unit($name, $text, $matches[3] ?? null),
            ];
        }

        if (preg_match('/^(\d+(?:\.\d+)?)\s*(นาที|ครั้ง|%)?$/u', $text, $matches) === 1) {
            $value = round((float) $matches[1], 2);
            $unitHint = $matches[2] ?? null;

            return [
                'operator' => ($value == 0.0 || $unitHint === 'ครั้ง') ? '<=' : '>=',
                'target' => $value,
                'unit' => $this->unit($name, $text, $unitHint),
            ];
        }

        throw new RuntimeException("ไม่รู้จักเป้าหมาย \"{$text}\" ของ {$name}");
    }

    private function unit(string $name, string $targetText, ?string $hint): string
    {
        if ($hint === 'นาที' || str_contains($targetText, 'นาที')) {
            return 'นาที';
        }

        if ($hint === '%' || str_contains($name, 'ร้อยละ') || str_contains($targetText, '%')) {
            return '%';
        }

        return 'ครั้ง';
    }

    /**
     * @return array{result_value: float, numerator: ?float, denominator: ?float, notes: ?string}
     */
    private function measurement(string $raw, string $name, ?string $periodNote): array
    {
        $normalized = str_replace(',', '', trim($raw));
        if (preg_match('/^<\s*(\d*\.\d+|\d+(?:\.\d+)?)$/u', $normalized, $matches) === 1) {
            $notes = $periodNote ? $raw."\n".$periodNote : $raw;

            return [
                'result_value' => round((float) $matches[1], 2),
                'numerator' => null,
                'denominator' => null,
                'notes' => $notes,
            ];
        }

        if (preg_match('/^(-?\d+(?:\.\d+)?)(?:\s*\(\s*(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)\s*\))?$/u', $normalized, $matches) === 1) {
            return [
                'result_value' => round((float) $matches[1], 2),
                'numerator' => isset($matches[2]) ? round((float) $matches[2], 2) : null,
                'denominator' => isset($matches[3]) ? round((float) $matches[3], 2) : null,
                'notes' => $periodNote,
            ];
        }

        if (preg_match('/^ไม่พบ/u', $raw) === 1) {
            $notes = $periodNote ? $raw."\n".$periodNote : $raw;

            return [
                'result_value' => 0.0,
                'numerator' => null,
                'denominator' => null,
                'notes' => $notes,
            ];
        }

        throw new RuntimeException("ไม่รู้จักผล \"{$raw}\" ของ {$name}");
    }

    private function periodDate(int $year): string
    {
        $ce = match (true) {
            $year > 2400 => $year - 543,
            $year > 100 => $year,
            default => 2500 + $year - 543,
        };

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

    private function department(string $code): Department
    {
        $department = Department::query()
            ->whereRaw('UPPER(code) = ?', [strtoupper(trim($code))])
            ->first();

        if (! $department || trim((string) $department->code) === '') {
            throw new RuntimeException("ไม่พบแผนกที่มีรหัส {$code}");
        }

        return $department;
    }

    private function prefix(string $code): string
    {
        $prefix = strtolower(trim($code));
        if (preg_match('/^[a-z][a-z0-9]*$/', $prefix) !== 1) {
            throw new RuntimeException("รหัสแผนกใช้เป็นรหัสตัวชี้วัดไม่ได้: {$code}");
        }

        return $prefix;
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
