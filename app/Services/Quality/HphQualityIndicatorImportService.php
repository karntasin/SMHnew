<?php

namespace App\Services\Quality;

use App\Models\QualityIndicator;
use App\Models\QualityIndicatorEntry;
use App\Models\TeamHa;
use App\Models\User;
use App\Services\QualityIndicatorFamilyService;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use RuntimeException;

class HphQualityIndicatorImportService
{
    /**
     * @var list<array{key: string, label: string, target_operator: string, target_value: float}>
     */
    private const COMPARISON_SERIES = [
        ['key' => 'normal', 'label' => 'กลุ่มปกติ', 'target_operator' => '>', 'target_value' => 50.0],
        ['key' => 'risk', 'label' => 'กลุ่มเสี่ยง (DM,HT)', 'target_operator' => '<', 'target_value' => 30.0],
        ['key' => 'sick', 'label' => 'กลุ่มป่วย (DM,HT)', 'target_operator' => '<', 'target_value' => 20.0],
    ];

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
            $teamId = $this->teamId();
            $userId = $this->actorId();
            $created = 0;
            $updated = 0;
            $entriesCreated = 0;
            $entriesUpdated = 0;
            $indicators = [];

            foreach ($specs as $spec) {
                [$indicator, $wasCreated] = $this->upsertIndicator($spec, $teamId);
                $wasCreated ? $created++ : $updated++;

                $master = $this->families->masterOf($indicator);
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
     * @return list<array<string, string>>
     */
    private function readRows(string $path): array
    {
        $spreadsheet = IOFactory::load($path);
        $sheet = $spreadsheet->getSheetByName('KPI ตามต้นฉบับ');
        if ($sheet === null) {
            throw new RuntimeException('ไม่พบชีต KPI ตามต้นฉบับ');
        }

        $rows = [];
        for ($row = 1; $row <= $sheet->getHighestRow(); $row++) {
            $cells = [];
            foreach (range('A', 'J') as $letter) {
                $value = trim((string) $sheet->getCell($letter.$row)->getFormattedValue());
                $cells[$letter] = trim((string) preg_replace('/\s+/u', ' ', $value));
            }
            $rows[] = $cells;
        }

        return $rows;
    }

    /**
     * @param  list<array<string, string>>  $rows
     * @return list<array<string, mixed>>
     */
    private function buildSpecs(array $rows): array
    {
        $section = null;
        $columns = [];
        $specs = [];

        foreach ($rows as $cells) {
            $title = $cells['A'] ?? '';
            $yearColumns = $this->yearColumns($cells);
            $batchColumns = $this->batchColumns($cells);

            if ($yearColumns !== [] && str_contains($title, 'ตัวชี้วัด')) {
                $columns = $yearColumns;

                continue;
            }

            if ($batchColumns !== []) {
                $columns = $batchColumns;

                continue;
            }

            if (preg_match('/^(\d+)\.\s*(.*)$/u', $title, $matches) !== 1) {
                if ($title !== '' && $this->rowIsLabel($cells)) {
                    $section = $title;
                }

                continue;
            }

            if ($columns === []) {
                throw new RuntimeException('ยังไม่พบหัวคอลัมน์ปีก่อนตัวชี้วัดข้อ '.$matches[1]);
            }

            $number = (int) $matches[1];
            $name = trim($matches[2]);
            $targetText = $cells['B'] ?? '';
            $isComparison = in_array($number, [2, 8], true);
            if ($isComparison) {
                $name = trim((string) preg_replace('/\s*-\s*กลุ่มปกติ\s*-\s*กลุ่มเสี่ยง.*$/u', '', $name));
                if (! preg_match('/>\s*50\s*%?\s*<\s*30\s*%?\s*<\s*20\s*%?/u', $targetText)) {
                    throw new RuntimeException("เป้าหมายของข้อ {$number} ไม่ใช่ >50% <30% <20%");
                }
            }

            $target = $isComparison
                ? ['operator' => '>', 'target' => 50.0]
                : $this->parseTarget($targetText, $name);
            $code = 'hph-'.str_pad((string) $number, 2, '0', STR_PAD_LEFT);
            $entries = [];

            foreach ($columns as $column) {
                $raw = $cells[$column['letter']] ?? '';
                if ($this->isBlank($raw)) {
                    continue;
                }

                if ($isComparison) {
                    $measurements = $this->comparisonMeasurements($raw, $code, $column['token']);
                    foreach ($measurements as $offset => $measurement) {
                        $entries[] = [
                            'series_key' => self::COMPARISON_SERIES[$offset]['key'],
                            'period_date' => $this->periodDate($column['token']),
                            ...$measurement,
                        ];
                    }

                    continue;
                }

                $measurement = $this->parseMeasurement($raw);
                if ($measurement === null) {
                    continue;
                }

                $entries[] = [
                    'series_key' => '',
                    'period_date' => $this->periodDate($column['token']),
                    ...$measurement,
                ];
            }

            $specs[] = [
                'code' => $code,
                'name' => $name,
                'description' => $section ? 'กลุ่ม: '.$section : null,
                'formula_description' => $targetText,
                'unit' => $this->unit($name, $targetText),
                'target_value' => $target['target'],
                'target_operator' => $target['operator'],
                'frequency' => $number >= 21 && $number <= 26 ? 'รายผลัด' : 'Yearly',
                'series' => $isComparison ? self::COMPARISON_SERIES : null,
                'entries' => $entries,
            ];
        }

        $codes = array_column($specs, 'code');
        $expected = array_map(fn (int $n) => 'hph-'.str_pad((string) $n, 2, '0', STR_PAD_LEFT), range(1, 30));
        if ($codes !== $expected) {
            throw new RuntimeException('ต้องได้ hph-01 ถึง hph-30 แต่พบ '.implode(', ', $codes));
        }

        return $specs;
    }

    /**
     * @param  array<string, string>  $cells
     * @return list<array{letter: string, token: string}>
     */
    private function yearColumns(array $cells): array
    {
        $columns = [];
        foreach ($cells as $letter => $value) {
            if (preg_match('/^ปี\s*\d{2}$/u', $value) === 1) {
                $columns[] = ['letter' => $letter, 'token' => preg_replace('/\s+/u', '', $value) ?? $value];
            }
        }

        return $columns;
    }

    /**
     * @param  array<string, string>  $cells
     * @return list<array{letter: string, token: string}>
     */
    private function batchColumns(array $cells): array
    {
        $columns = [];
        foreach ($cells as $letter => $value) {
            if (preg_match('/^[12]\/\d{2}$/', $value) === 1) {
                $columns[] = ['letter' => $letter, 'token' => $value];
            }
        }

        return $columns;
    }

    /**
     * @param  array<string, string>  $cells
     */
    private function rowIsLabel(array $cells): bool
    {
        foreach ($cells as $letter => $value) {
            if ($letter !== 'A' && $value !== '') {
                return false;
            }
        }

        return true;
    }

    /**
     * @return array{operator: string, target: float}
     */
    private function parseTarget(string $text, string $name): array
    {
        $text = trim((string) preg_replace('/\s+/u', ' ', $text));
        if (preg_match('/^([<>]=?|=)\s*(\d+(?:\.\d+)?)\s*%?$/u', $text, $matches) === 1) {
            return ['operator' => $matches[1], 'target' => (float) $matches[2]];
        }

        if (preg_match('/^(\d+(?:\.\d+)?)\s*%?$/u', $text, $matches) === 1) {
            $value = (float) $matches[1];

            return ['operator' => $value == 0.0 ? '<=' : '>=', 'target' => $value];
        }

        throw new RuntimeException("ไม่รู้จักเป้าหมาย \"{$text}\" ของ {$name}");
    }

    private function unit(string $name, string $targetText): string
    {
        if (str_contains($name, 'ร้อยละ') || str_contains($name, 'อัตรา') || str_contains($targetText, '%')) {
            return '%';
        }

        if (str_contains($name, 'จำนวน')) {
            return 'คน';
        }

        return 'ครั้ง';
    }

    private function isBlank(string $text): bool
    {
        return $text === '' || preg_match('/^(N\/A|NA|—|-)$/iu', $text) === 1 || preg_match('/^(N\/A|NA)\b/iu', $text) === 1;
    }

    /**
     * @return list<array{result_value: float, numerator: ?float, denominator: ?float, notes: ?string}>
     */
    private function comparisonMeasurements(string $text, string $code, string $token): array
    {
        preg_match_all('/\d+(?:\.\d+)?\s*\([^)]*\)/u', $text, $parts);
        if (count($parts[0]) !== 3) {
            throw new RuntimeException("{$code} ปี {$token} ต้องมี 3 ค่า แต่พบ \"{$text}\"");
        }

        $measurements = [];
        foreach ($parts[0] as $part) {
            $parsed = $this->parseMeasurement($part);
            if ($parsed === null) {
                throw new RuntimeException("{$code} ปี {$token} อ่านค่าไม่ได้: {$part}");
            }
            $measurements[] = $parsed;
        }

        return $measurements;
    }

    /**
     * @return array{result_value: float, numerator: ?float, denominator: ?float, notes: ?string}|null
     */
    private function parseMeasurement(string $text): ?array
    {
        $text = trim((string) preg_replace('/\s+/u', ' ', $text));
        if ($this->isBlank($text)) {
            return null;
        }

        if (preg_match('/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*\((\d+(?:\.\d+)?)\)\s*(.*)$/u', $text, $matches) === 1) {
            return [
                'result_value' => round((float) $matches[3], 2),
                'numerator' => round((float) $matches[1], 2),
                'denominator' => round((float) $matches[2], 2),
                'notes' => trim($matches[4]) !== '' ? trim($matches[4]) : null,
            ];
        }

        if (preg_match('/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\)?\s*(.*)$/u', $text, $matches) === 1) {
            return [
                'result_value' => round((float) $matches[1], 2),
                'numerator' => round((float) $matches[2], 2),
                'denominator' => round((float) $matches[3], 2),
                'notes' => trim($matches[4]) !== '' ? trim($matches[4]) : null,
            ];
        }

        if (preg_match('/^(\d+(?:\.\d+)?)\s*(?:\(([^)]*)\))?\s*(.*)$/u', $text, $matches) !== 1) {
            throw new RuntimeException("อ่านค่าไม่ได้: {$text}");
        }

        $numerator = null;
        $denominator = null;
        $notes = trim($matches[3]) !== '' ? trim($matches[3]) : null;
        $inside = str_replace(',', '', trim($matches[2] ?? ''));
        if ($inside !== '') {
            if (preg_match('/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/', $inside, $fraction) === 1) {
                $numerator = round((float) $fraction[1], 2);
                $denominator = round((float) $fraction[2], 2);
            } elseif (is_numeric($inside)) {
                $numerator = round((float) $inside, 2);
            } else {
                $notes = trim($inside.' '.($notes ?? ''));
            }
        }

        return [
            'result_value' => round((float) $matches[1], 2),
            'numerator' => $numerator,
            'denominator' => $denominator,
            'notes' => $notes !== '' ? $notes : null,
        ];
    }

    private function periodDate(string $token): string
    {
        if (preg_match('/^ปี(\d{2})$/u', $token, $matches) === 1) {
            return sprintf('%04d-01-01', 2500 + (int) $matches[1] - 543);
        }

        if (preg_match('/^([12])\/(\d{2})$/', $token, $matches) === 1) {
            return sprintf('%04d-%02d-01', 2500 + (int) $matches[2] - 543, $matches[1] === '2' ? 7 : 1);
        }

        throw new RuntimeException("ไม่รู้จักงวด {$token}");
    }

    /**
     * @param  array<string, mixed>  $spec
     * @return array{0: QualityIndicator, 1: bool}
     */
    private function upsertIndicator(array $spec, int $teamId): array
    {
        $payload = [
            'name' => $spec['name'],
            'description' => $spec['description'],
            'category' => 'Clinical',
            'unit' => $spec['unit'],
            'target_value' => $spec['target_value'],
            'target_operator' => $spec['target_operator'],
            'frequency' => $spec['frequency'],
            'formula_description' => $spec['formula_description'],
            'series' => $spec['series'],
        ];

        $existing = QualityIndicator::query()->where('code', $spec['code'])->first()
            ?? QualityIndicator::onlyTrashed()->where('code', $spec['code'])->orderByDesc('id')->first();

        if ($existing) {
            $this->assertTeamOwner($existing, $teamId);

            if ($existing->trashed()) {
                $this->families->restoreIndicator($existing);
            }

            return [$this->families->updateSharedAndLocal($existing, $payload), false];
        }

        return [$this->families->createStandalone([
            ...$payload,
            'type' => 'ha_team',
            'team_id' => $teamId,
            'code' => $spec['code'],
            'is_active' => true,
        ]), true];
    }

    private function assertTeamOwner(QualityIndicator $indicator, int $teamId): void
    {
        if ($indicator->type !== 'ha_team' || (int) $indicator->team_id !== $teamId) {
            throw new RuntimeException("รหัส {$indicator->code} ถูกใช้โดยสังกัดอื่นแล้ว จึงไม่นำเข้าและไม่เขียนทับ");
        }
    }

    private function teamId(): int
    {
        $teamId = TeamHa::query()->where('abbreviation', 'HPH')->value('id');
        if (! $teamId) {
            throw new RuntimeException('ไม่พบทีม HPH');
        }

        return (int) $teamId;
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
