<?php

namespace App\Services\Quality;

use App\Models\Department;
use App\Models\QualityIndicator;
use App\Models\QualityIndicatorEntry;
use App\Models\TeamHa;
use App\Models\User;
use App\Services\QualityIndicatorFamilyService;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use RuntimeException;

class HrdQualityIndicatorImportService
{
    public function __construct(private QualityIndicatorFamilyService $families) {}

    /**
     * @return array{
     *     created: int,
     *     updated: int,
     *     entries_created: int,
     *     entries_updated: int,
     *     team_prefix: string,
     *     department_prefix: string,
     *     department_name: string,
     *     indicators: list<array{team_code: string, department_code: string, name: string, entries: int, series: int}>
     * }
     */
    public function import(string $path): array
    {
        $specs = $this->buildSpecs($this->readGrid($path));

        return DB::transaction(function () use ($specs) {
            $team = $this->team();
            $department = $this->department();
            $teamPrefix = $this->prefix((string) $team->abbreviation, 'HRD');
            $departmentPrefix = $this->prefix((string) $department->code, 'ฝ่ายธุรการ');
            $userId = $this->actorId();
            $created = 0;
            $updated = 0;
            $entriesCreated = 0;
            $entriesUpdated = 0;
            $indicators = [];

            foreach ($specs as $index => $spec) {
                $number = str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT);
                $teamCode = $teamPrefix.'-'.$number;
                $departmentCode = $departmentPrefix.'-'.$number;

                [$master, $wasCreated] = $this->upsertTeamIndicator($spec, $teamCode, (int) $team->id);
                $wasCreated ? $created++ : $updated++;

                $aliasCreated = $this->ensureDepartmentAlias($master, $departmentCode, (int) $department->id);
                if ($aliasCreated) {
                    $created++;
                } else {
                    $updated++;
                }

                $entryCount = 0;
                foreach ($spec['entries'] as $entry) {
                    $existing = $master->entries()
                        ->whereDate('period_date', $entry['period_date'])
                        ->where('series_key', $entry['series_key'])
                        ->first();

                    $payload = [
                        'series_key' => $entry['series_key'],
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
                    'team_code' => $teamCode,
                    'department_code' => $departmentCode,
                    'name' => $spec['name'],
                    'entries' => $entryCount,
                    'series' => count($spec['series'] ?? []),
                ];
            }

            return [
                'created' => $created,
                'updated' => $updated,
                'entries_created' => $entriesCreated,
                'entries_updated' => $entriesUpdated,
                'team_prefix' => $teamPrefix,
                'department_prefix' => $departmentPrefix,
                'department_name' => (string) $department->name,
                'indicators' => $indicators,
            ];
        });
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function readGrid(string $path): array
    {
        $sheet = IOFactory::load($path)->getSheet(0);
        $grid = [];

        for ($row = 1; $row <= (int) $sheet->getHighestRow(); $row++) {
            foreach (range('A', 'J') as $column) {
                $value = trim((string) $sheet->getCell($column.$row)->getFormattedValue());
                $value = trim((string) preg_replace('/\s+/u', ' ', $value));
                if ($value !== '') {
                    $grid[$row][$column] = $value;
                }
            }
        }

        return $grid;
    }

    /**
     * @param  array<int, array<string, string>>  $grid
     * @return list<array<string, mixed>>
     */
    private function buildSpecs(array $grid): array
    {
        $depressionRow = $this->findRow($grid, '/^1\.\s*ร้อยละ.*ซึมเศร้า/u');
        $suicideRow = $this->findRow($grid, '/^2\.\s*ร้อยละ.*ฆ่าตัวตาย/u');
        $volumeHeader = $this->findRow($grid, '/^ตัวชี้วัด$/u', fn (array $cells) => $this->yearColumns($cells) !== []);
        $kpiHeader = $this->findRow($grid, '/^ตัวชี้วัด$/u', fn (array $cells) => ($cells['B'] ?? '') === 'เป้าหมาย');

        $mentalYears = $this->mentalYearColumns($grid, $depressionRow);
        $volumeYears = $this->yearColumns($grid[$volumeHeader]);
        $volumeYears = $this->markPartialYears($grid, $volumeHeader, $volumeYears);
        $kpiYears = $this->kpiYearColumns($grid, $kpiHeader);

        $specs = [];
        $specs[] = $this->seriesSpec(
            $this->indicatorName($grid[$depressionRow]['A']),
            $this->collectLabeledSeries($grid, $depressionRow + 1, $suicideRow, $mentalYears),
            '%',
        );
        $specs[] = $this->seriesSpec(
            $this->indicatorName($grid[$suicideRow]['A']),
            $this->collectLabeledSeries($grid, $suicideRow + 1, $volumeHeader, $mentalYears),
            '%',
        );

        $row = $volumeHeader + 1;
        $last = max(array_keys($grid));
        while ($row <= $last && $row < $kpiHeader) {
            $title = $grid[$row]['A'] ?? '';
            if (preg_match('/^(\d+)\.\s*(.+)$/u', $title, $matches) !== 1) {
                $row++;

                continue;
            }

            $number = (int) $matches[1];
            if ($number === 3) {
                $end = $this->findRow($grid, '/^4\.\s*/u');
                $specs[] = $this->rightsSpec($grid, $row, $end, $volumeYears);
                $row = $end;

                continue;
            }

            $specs[] = $this->simpleSpec(
                $this->indicatorName($title),
                null,
                $this->measureEntries($grid, $row, null, $volumeYears, ''),
                $this->unit($this->indicatorName($title), ''),
            );
            $row++;
        }

        $kpiNumbers = [];
        for ($row = $kpiHeader + 1; $row <= $last; $row++) {
            $title = $grid[$row]['A'] ?? '';
            if (preg_match('/^(\d+)\.\s*(.+)$/u', $title, $matches) !== 1) {
                continue;
            }

            $name = $this->indicatorName($title);
            $target = $this->parseTarget($grid[$row]['B'] ?? '', $name);
            $specs[] = $this->simpleSpec(
                $name,
                $target,
                $this->measureEntries($grid, $row, null, $kpiYears, ''),
                $this->unit($name, $grid[$row]['B'] ?? ''),
            );
            $kpiNumbers[] = (int) $matches[1];
        }

        $this->attachMisalignedYear($grid, $specs, $kpiNumbers);

        $names = array_column($specs, 'name');
        if (count($specs) !== 12) {
            throw new RuntimeException('ต้องได้ 12 ตัวชี้วัด แต่พบ '.count($specs).': '.implode(' | ', $names));
        }

        $seriesCounts = array_map(fn (array $spec) => count($spec['series'] ?? []), $specs);
        if ($seriesCounts[0] !== 3 || $seriesCounts[1] !== 4 || $seriesCounts[4] !== 6) {
            throw new RuntimeException('จำนวนหัวข้อย่อยไม่ตรง: ซึมเศร้า 3, ฆ่าตัวตาย 4, สิทธิกำลังพล 6 แต่พบ '.implode(',', $seriesCounts));
        }

        return $specs;
    }

    /**
     * @param  list<array<string, mixed>>  $series
     * @return array<string, mixed>
     */
    private function seriesSpec(string $name, array $series, string $unit): array
    {
        if ($series === []) {
            throw new RuntimeException("ไม่พบหัวข้อย่อยของ {$name}");
        }

        $keys = array_column($series, 'key');
        if (count($keys) !== count(array_unique($keys))) {
            throw new RuntimeException("รหัสหัวข้อย่อยของ {$name} ซ้ำกัน");
        }

        $entries = [];
        foreach ($series as $item) {
            foreach ($item['entries'] as $entry) {
                $entries[] = $entry;
            }
        }

        $first = $series[0];

        return [
            'name' => $name,
            'description' => implode("\n", array_map(
                fn (array $item) => $item['label'].($item['target_value'] !== null ? ' '.$item['target_operator'].' '.$this->numberText($item['target_value']) : ''),
                $series,
            )),
            'unit' => $unit,
            'target_value' => $first['target_value'],
            'target_operator' => $first['target_operator'] ?? '>=',
            'formula_description' => null,
            'series' => array_map(fn (array $item) => [
                'key' => $item['key'],
                'label' => $item['label'],
                'target_operator' => $item['target_operator'],
                'target_value' => $item['target_value'],
            ], $series),
            'entries' => $entries,
        ];
    }

    /**
     * @param  array{operator: string, target: float}|null  $target
     * @param  list<array<string, mixed>>  $entries
     * @return array<string, mixed>
     */
    private function simpleSpec(string $name, ?array $target, array $entries, string $unit): array
    {
        if ($entries === []) {
            throw new RuntimeException("ไม่พบผลรายปีของ {$name}");
        }

        return [
            'name' => $name,
            'description' => null,
            'unit' => $unit,
            'target_value' => $target['target'] ?? null,
            'target_operator' => $target['operator'] ?? '>=',
            'formula_description' => null,
            'series' => null,
            'entries' => $entries,
        ];
    }

    /**
     * @param  array<int, array<string, string>>  $grid
     * @param  list<array{column: string, yy: int, partial: bool}>  $yearColumns
     * @return array<string, mixed>
     */
    private function rightsSpec(array $grid, int $start, int $end, array $yearColumns): array
    {
        $rewardLabel = 'บำเหน็จประจำปี, ขอเครื่องราชฯ';
        foreach (range($start + 1, $end - 1) as $row) {
            $text = trim($grid[$row]['A'] ?? '', " \t()");
            if ($text !== '' && ! preg_match('/^ครั้ง$/u', $text) && ! $this->rowHasMeasurement($grid[$row], $yearColumns)) {
                $rewardLabel = $text;
                break;
            }
        }

        $series = [[
            'key' => $this->seriesKey($rewardLabel),
            'label' => $rewardLabel,
            'target_operator' => null,
            'target_value' => null,
            'entries' => $this->measureEntries($grid, $start, null, $yearColumns, $this->seriesKey($rewardLabel)),
        ]];

        for ($row = $start + 1; $row < $end; $row++) {
            $label = $this->seriesLabel($grid[$row]['A'] ?? '');
            if ($label === '' || ! $this->rowHasMeasurement($grid[$row], $yearColumns)) {
                continue;
            }

            $key = $this->seriesKey($label);
            $series[] = [
                'key' => $key,
                'label' => $label,
                'target_operator' => null,
                'target_value' => null,
                'entries' => $this->measureEntries($grid, $row, null, $yearColumns, $key),
            ];
        }

        $spec = $this->seriesSpec('งานด้านสิทธิกำลังพล', $series, 'ครั้ง');
        $spec['description'] = "รวมรายการตั้งแต่ข้อ 3 จนถึงก่อนข้อ 4\n".$spec['description'];
        $spec['target_value'] = null;
        $spec['target_operator'] = '>=';

        return $spec;
    }

    /**
     * @param  array<int, array<string, string>>  $grid
     * @param  list<array{column: string, yy: int, partial: bool}>  $yearColumns
     * @return list<array<string, mixed>>
     */
    private function collectLabeledSeries(array $grid, int $start, int $end, array $yearColumns): array
    {
        $series = [];
        $row = $start;

        while ($row < $end) {
            $label = $this->seriesLabel($grid[$row]['A'] ?? '');
            if ($label === '') {
                $row++;

                continue;
            }

            $valueRow = $this->rowHasMeasurement($grid[$row], $yearColumns) ? $row : $row + 1;
            if ($valueRow >= $end) {
                break;
            }

            $fractionRow = $valueRow + 1;
            $target = $this->parseTarget($grid[$valueRow]['B'] ?? '', $label);
            $key = $this->seriesKey($label);
            $series[] = [
                'key' => $key,
                'label' => $label,
                'target_operator' => $target['operator'],
                'target_value' => $target['target'],
                'entries' => $this->measureEntries($grid, $valueRow, $fractionRow, $yearColumns, $key),
            ];

            $row = $this->seriesLabel($grid[$fractionRow]['A'] ?? '') !== '' ? $fractionRow : $fractionRow + 1;
        }

        return $series;
    }

    /**
     * ปี 2569 ของข้อ 5–10 อยู่ในคอลัมน์ J คนละช่วงแถวกับตัวชี้วัด จึงจับคู่ตามลำดับข้อ
     *
     * @param  array<int, array<string, string>>  $grid
     * @param  list<array<string, mixed>>  $specs
     * @param  list<int>  $kpiNumbers
     */
    private function attachMisalignedYear(array $grid, array &$specs, array $kpiNumbers): void
    {
        $headerRow = null;
        foreach ($grid as $row => $cells) {
            if (preg_match('/ปี\s*2569/u', $cells['J'] ?? '') === 1) {
                $headerRow = $row;
                break;
            }
        }

        if ($headerRow === null) {
            return;
        }

        $values = [];
        $partial = false;
        foreach ($grid as $row => $cells) {
            if ($row <= $headerRow || ! isset($cells['J'])) {
                continue;
            }
            if (preg_match('/ก\.ย/u', $cells['J']) === 1) {
                $partial = true;

                continue;
            }
            if ($this->isBlank($cells['J'])) {
                continue;
            }
            $values[] = $cells['J'];
        }

        if (count($values) !== count($kpiNumbers)) {
            throw new RuntimeException('คอลัมน์ปี 2569 มี '.count($values).' ค่า แต่ข้อ 5–10 มี '.count($kpiNumbers).' ตัว');
        }

        $kpiSpecs = [];
        foreach ($specs as $index => $spec) {
            if (($spec['series'] ?? null) === null && $this->isKpiName($spec['name'])) {
                $kpiSpecs[] = $index;
            }
        }

        if (count($kpiSpecs) !== count($values)) {
            throw new RuntimeException('จับคู่ปี 2569 ไม่ได้');
        }

        foreach ($values as $offset => $raw) {
            $measurement = $this->measurement($raw, null);
            if ($measurement === null) {
                continue;
            }

            $specs[$kpiSpecs[$offset]]['entries'][] = [
                'series_key' => '',
                'period_date' => $this->periodDate(2569),
                'notes' => $partial ? 'ข้อมูลถึงเดือน ก.ย. 2569' : null,
                ...$measurement,
            ];
        }
    }

    private function isKpiName(string $name): bool
    {
        foreach (['ไม่ได้ลงทะเบียน', 'สูญหาย', 'ติดตามทวงถาม', 'ล่าช้าหรือผิดพลาด', 'เงินรายได้', 'ตรวจสอบภายใน'] as $needle) {
            if (str_contains($name, $needle)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<int, array<string, string>>  $grid
     * @param  list<array{column: string, yy: int, partial: bool}>  $yearColumns
     * @return list<array<string, mixed>>
     */
    private function measureEntries(array $grid, int $valueRow, ?int $fractionRow, array $yearColumns, string $seriesKey): array
    {
        $entries = [];

        foreach ($yearColumns as $column) {
            $raw = $grid[$valueRow][$column['column']] ?? '';
            if ($this->isBlank($raw)) {
                continue;
            }

            $fraction = $fractionRow ? ($grid[$fractionRow][$column['column']] ?? null) : null;
            $measurement = $this->measurement($raw, $fraction);
            if ($measurement === null) {
                continue;
            }

            $entries[] = [
                'series_key' => $seriesKey,
                'period_date' => $this->periodDate($column['yy']),
                'notes' => $column['partial'] ? 'ข้อมูลถึงเดือน ก.ย. '.$column['yy'] : null,
                ...$measurement,
            ];
        }

        return $entries;
    }

    /**
     * @return array{result_value: float, numerator: ?float, denominator: ?float}|null
     */
    private function measurement(string $raw, ?string $fraction): ?array
    {
        $raw = str_replace(',', '', trim($raw));
        if ($this->isBlank($raw) || ! is_numeric($raw)) {
            return null;
        }

        $numerator = null;
        $denominator = null;
        if (is_string($fraction) && preg_match('/\(?\s*(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)\s*\)?/u', $fraction, $matches) === 1) {
            $numerator = round((float) $matches[1], 2);
            $denominator = round((float) $matches[2], 2);
        }

        return [
            'result_value' => round((float) $raw, 2),
            'numerator' => $numerator,
            'denominator' => $denominator,
        ];
    }

    /**
     * ช่วงสุขภาพจิตไม่มีหัวคอลัมน์ปี คอลัมน์ C–G เรียงตรงกับปี 2562–2566 ของตารางด้านล่าง
     *
     * @param  array<int, array<string, string>>  $grid
     * @return list<array{column: string, yy: int, partial: bool}>
     */
    private function mentalYearColumns(array $grid, int $titleRow): array
    {
        for ($row = 1; $row < $titleRow; $row++) {
            $columns = $this->yearColumns($grid[$row] ?? []);
            if ($columns !== []) {
                return $columns;
            }
        }

        $columns = [];
        foreach (['C' => 2562, 'D' => 2563, 'E' => 2564, 'F' => 2565, 'G' => 2566] as $column => $year) {
            $columns[] = ['column' => $column, 'yy' => $year, 'partial' => false];
        }

        return $columns;
    }

    /**
     * @param  array<string, string>  $cells
     * @return list<array{column: string, yy: int, partial: bool}>
     */
    private function yearColumns(array $cells): array
    {
        $columns = [];
        foreach ($cells as $column => $value) {
            if (preg_match('/ปี\s*(\d{4})/u', $value, $matches) === 1) {
                $columns[] = ['column' => $column, 'yy' => (int) $matches[1], 'partial' => false];
            }
        }

        return $columns;
    }

    /**
     * @param  array<int, array<string, string>>  $grid
     * @param  list<array{column: string, yy: int, partial: bool}>  $columns
     * @return list<array{column: string, yy: int, partial: bool}>
     */
    private function markPartialYears(array $grid, int $headerRow, array $columns): array
    {
        $noteRow = $grid[$headerRow + 1] ?? [];
        foreach ($columns as $index => $column) {
            if (preg_match('/ก\.ย/u', $noteRow[$column['column']] ?? '') === 1) {
                $columns[$index]['partial'] = true;
            }
        }

        return $columns;
    }

    /**
     * @param  array<int, array<string, string>>  $grid
     * @return list<array{column: string, yy: int, partial: bool}>
     */
    private function kpiYearColumns(array $grid, int $headerRow): array
    {
        $columns = [];
        foreach ($grid[$headerRow + 1] ?? [] as $column => $value) {
            if (preg_match('/^(\d{4})$/', $value, $matches) === 1) {
                $columns[] = ['column' => $column, 'yy' => (int) $matches[1], 'partial' => false];
            }
        }

        if ($columns === []) {
            throw new RuntimeException('ไม่พบปีของตัวชี้วัดข้อ 5–10');
        }

        return $columns;
    }

    /**
     * @param  array<string, string>  $cells
     * @param  list<array{column: string, yy: int, partial: bool}>  $yearColumns
     */
    private function rowHasMeasurement(array $cells, array $yearColumns): bool
    {
        foreach ($yearColumns as $column) {
            $raw = str_replace(',', '', $cells[$column['column']] ?? '');
            if (! $this->isBlank($raw) && is_numeric($raw)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<int, array<string, string>>  $grid
     * @param  callable(array<string, string>): bool|null  $extra
     */
    private function findRow(array $grid, string $pattern, ?callable $extra = null): int
    {
        foreach ($grid as $row => $cells) {
            $text = $cells['A'] ?? '';
            if (preg_match($pattern, $text) !== 1) {
                continue;
            }
            if ($extra && ! $extra($cells)) {
                continue;
            }

            return $row;
        }

        throw new RuntimeException('ไม่พบแถวที่ตรงกับ '.$pattern);
    }

    private function indicatorName(string $text): string
    {
        $text = trim((string) preg_replace('/^\d+\.\s*/u', '', trim($text)));
        $text = trim((string) preg_replace('/\s*\(ครั้ง\)\s*$/u', '', $text));

        return $text;
    }

    private function seriesLabel(string $text): string
    {
        $text = trim($text);
        $text = trim((string) preg_replace('/^[-–]\s*/u', '', $text));
        if ($text === '' || preg_match('/^\(?ครั้ง\)?$/u', $text) === 1) {
            return '';
        }

        return trim($text, " \t)");
    }

    private function seriesKey(string $label): string
    {
        $map = [
            'ไม่มีภาวะ' => 'none-mild',
            'ไม่มีแนวโน้ม' => 'none',
            'ระดับน้อย' => 'low',
            'ปานกลาง' => 'moderate',
            'รุนแรง' => 'severe',
            'บำเหน็จ' => 'reward',
            'เครื่องราช' => 'reward',
            'เลื่อนยศ' => 'rank',
            'ปลด' => 'discharge',
            'ย้าย' => 'transfer',
            'ลาออก' => 'resign',
            'เกษียณ' => 'retire',
        ];

        foreach ($map as $needle => $key) {
            if (str_contains($label, $needle)) {
                return $key;
            }
        }

        throw new RuntimeException("ไม่รู้จักหัวข้อย่อย {$label}");
    }

    /**
     * @return array{operator: string, target: float}
     */
    private function parseTarget(string $text, string $name): array
    {
        $text = trim($text);
        if (preg_match('/^(>=|<=|>|<|=)\s*(\d+(?:\.\d+)?)\s*%?$/u', $text, $matches) === 1) {
            return ['operator' => $matches[1], 'target' => round((float) $matches[2], 2)];
        }

        if (preg_match('/^(\d+(?:\.\d+)?)$/', $text, $matches) === 1) {
            $value = round((float) $matches[1], 2);

            return [
                'operator' => str_contains($name, 'คะแนน') ? '>=' : '<=',
                'target' => $value,
            ];
        }

        throw new RuntimeException("ไม่รู้จักเป้าหมาย \"{$text}\" ของ {$name}");
    }

    private function unit(string $name, string $targetText): string
    {
        if (str_contains($name, 'ร้อยละ') || str_contains($targetText, '%')) {
            return '%';
        }

        if (str_contains($name, 'คะแนน')) {
            return 'คะแนน';
        }

        if (str_contains($name, 'เงิน')) {
            return 'บาท';
        }

        return 'ครั้ง';
    }

    private function periodDate(int $year): string
    {
        $ce = $year > 2400 ? $year - 543 : $year;

        return sprintf('%04d-01-01', $ce);
    }

    private function isBlank(string $raw): bool
    {
        return $raw === '' || in_array($raw, ['NA', '-', '–', '—'], true);
    }

    private function numberText(float $value): string
    {
        return $value == (int) $value ? (string) (int) $value : (string) $value;
    }

    /**
     * @param  array<string, mixed>  $spec
     * @return array{0: QualityIndicator, 1: bool}
     */
    private function upsertTeamIndicator(array $spec, string $code, int $teamId): array
    {
        $payload = [
            'name' => $spec['name'],
            'description' => $spec['description'],
            'category' => 'HRD',
            'unit' => $spec['unit'],
            'target_value' => $spec['target_value'],
            'target_operator' => $spec['target_operator'],
            'frequency' => 'Yearly',
            'formula_description' => $spec['formula_description'],
            'series' => $spec['series'],
        ];

        $existing = QualityIndicator::query()->where('code', $code)->first()
            ?? QualityIndicator::onlyTrashed()->where('code', $code)->orderByDesc('id')->first();

        if ($existing) {
            if ($existing->type !== 'ha_team' || (int) $existing->team_id !== $teamId) {
                throw new RuntimeException("รหัส {$code} ถูกใช้โดยสังกัดอื่นแล้ว จึงไม่นำเข้าและไม่เขียนทับ");
            }

            if ($existing->trashed()) {
                $this->families->restoreIndicator($existing);
            }

            return [$this->families->updateSharedAndLocal($existing, $payload), false];
        }

        return [$this->families->createStandalone([
            ...$payload,
            'type' => 'ha_team',
            'team_id' => $teamId,
            'code' => $code,
            'is_active' => true,
        ]), true];
    }

    private function ensureDepartmentAlias(QualityIndicator $master, string $code, int $departmentId): bool
    {
        $family = $this->families->ensureFamily($master);
        $existing = QualityIndicator::query()->where('code', $code)->first()
            ?? QualityIndicator::onlyTrashed()->where('code', $code)->orderByDesc('id')->first();

        if ($existing) {
            if ($existing->type !== 'department' || (int) $existing->department_id !== $departmentId) {
                throw new RuntimeException("รหัส {$code} ถูกใช้โดยสังกัดอื่นแล้ว จึงไม่นำเข้าและไม่เขียนทับ");
            }

            if ((int) $existing->family_id !== (int) $family->id) {
                throw new RuntimeException("รหัส {$code} ไม่อยู่ในชุดข้อมูลเดียวกับ {$master->code}");
            }

            if ($existing->trashed()) {
                $this->families->restoreIndicator($existing);
            }

            return false;
        }

        $this->families->createAlias($master, [
            'type' => 'department',
            'department_id' => $departmentId,
            'code' => $code,
            'is_active' => true,
        ]);

        return true;
    }

    private function team(): TeamHa
    {
        $team = TeamHa::query()->where('abbreviation', 'HRD')->first();
        if (! $team) {
            throw new RuntimeException('ไม่พบทีม HRD');
        }

        return $team;
    }

    private function department(): Department
    {
        $department = Department::query()
            ->where('name', 'แผนกธุรการและกำลังพล')
            ->first();

        if (! $department) {
            $department = Department::query()->get(['id', 'name', 'code'])->first(function (Department $item) {
                return str_contains((string) $item->name, 'ธุรการ') && str_contains((string) $item->name, 'กำลัง');
            });
        }

        if (! $department) {
            $department = Department::query()->where('code', 'AS')->first()
                ?? Department::query()->where('name', 'ฝ่ายธุรการ')->first();
        }

        if (! $department || trim((string) $department->code) === '') {
            throw new RuntimeException('ไม่พบแผนกธุรการพร้อมตัวย่อ');
        }

        return $department;
    }

    private function prefix(string $abbreviation, string $owner): string
    {
        $prefix = strtolower(trim($abbreviation));
        if (preg_match('/^[a-z][a-z0-9]*$/', $prefix) !== 1) {
            throw new RuntimeException("ตัวย่อของ {$owner} ใช้เป็นรหัสตัวชี้วัดไม่ได้: {$abbreviation}");
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
