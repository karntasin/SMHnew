<?php

namespace App\Services\Env;

use App\Models\QualityIndicator;
use App\Models\QualityIndicatorEntry;
use App\Models\TeamHa;
use App\Models\User;
use App\Services\QualityIndicatorFamilyService;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use ZipArchive;

class EnvQualityIndicatorImportService
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
        $specs = $this->buildSpecs($this->readRows($path));

        return DB::transaction(function () use ($specs) {
            $teamId = $this->envTeamId();
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
                        ->first();

                    $payload = [
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
            throw new RuntimeException('ไม่พบเนื้อหาในไฟล์ ENV.docx');
        }

        $dom = new \DOMDocument();
        if (! $dom->loadXML($xml)) {
            throw new RuntimeException('อ่านตารางใน ENV.docx ไม่ได้');
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
            throw new RuntimeException('ไม่พบตารางตัวชี้วัดใน ENV.docx');
        }

        return $rows;
    }

    /**
     * @param  list<list<list<string>>>  $rows
     * @return list<array{
     *     code: string,
     *     name: string,
     *     description: ?string,
     *     category: string,
     *     unit: string,
     *     target_value: float,
     *     target_operator: string,
     *     frequency: string,
     *     formula_description: ?string,
     *     entries: list<array{
     *         period_date: string,
     *         numerator: ?float,
     *         denominator: ?float,
     *         result_value: float,
     *         notes: ?string
     *     }>
     * }>
     */
    private function buildSpecs(array $rows): array
    {
        $headerIndex = $this->headerIndex($rows);
        $header = $rows[$headerIndex];
        $yearColumns = $this->yearColumns($header);
        $specs = [];

        for ($i = $headerIndex + 1, $count = count($rows); $i < $count; $i++) {
            $cells = $rows[$i];
            $heading = $this->heading($cells[0][0] ?? '', $i + 1);
            $profile = $this->profile($heading['number']);
            $targetParas = $cells[1] ?? [];

            if ($profile['mode'] === 'split12') {
                array_push($specs, ...$this->splitUtilitySpecs($heading, $cells, $targetParas, $yearColumns));

                continue;
            }

            $descriptionParts = [];
            if ($heading['marker'] !== '') {
                $descriptionParts[] = 'เครื่องหมายในไฟล์ต้นทาง: '.$heading['marker'];
            }
            array_push($descriptionParts, ...$this->descriptiveTargetLines($targetParas, $profile['mode']));

            $entries = [];
            foreach ($yearColumns as $column) {
                $parsed = $this->parseYearCell($cells[$column['index']] ?? [], $profile['mode'], $column['yy']);
                if ($parsed['note'] !== null) {
                    $descriptionParts[] = $parsed['note'];
                }
                if ($parsed['entry'] !== null) {
                    $entries[] = [
                        'period_date' => $this->periodDate($column['yy']),
                        ...$parsed['entry'],
                    ];
                }
            }

            $specs[] = $this->spec(
                $this->code($heading['number']),
                $heading['name'],
                $descriptionParts,
                $profile,
                $this->targetValue($profile, $targetParas, $this->code($heading['number'])),
                null,
                $entries,
            );
        }

        if ($specs === []) {
            throw new RuntimeException('ไม่พบหัวข้อตัวชี้วัดในตาราง');
        }

        return $specs;
    }

    /**
     * @param  array{number: int, name: string, marker: string}  $heading
     * @param  list<list<string>>  $cells
     * @param  list<string>  $targetParas
     * @param  list<array{index: int, yy: int}>  $yearColumns
     * @return list<array<string, mixed>>
     */
    private function splitUtilitySpecs(array $heading, array $cells, array $targetParas, array $yearColumns): array
    {
        $subNames = [];
        foreach (array_slice($cells[0], 1) as $line) {
            $name = trim((string) preg_replace('/^[-–]\s*/u', '', $line));
            $name = trim((string) preg_replace('/\*+\s*$/u', '', $name));
            if ($name !== '') {
                $subNames[] = $name;
            }
        }

        if (count($subNames) !== 3) {
            throw new RuntimeException('หัวข้อ 12 ต้องมีตัวชี้วัดย่อย 3 รายการ');
        }

        $specs = [];
        foreach ($subNames as $offset => $name) {
            $sub = $offset + 1;
            $code = $this->code(12, $sub);
            $standard = trim($targetParas[$sub] ?? '');
            if ($standard === '') {
                throw new RuntimeException("ไม่พบมาตรฐานของ {$code}");
            }

            $descriptionParts = ['กลุ่ม: '.$heading['name']];
            if ($heading['marker'] !== '') {
                $descriptionParts[] = 'เครื่องหมายในไฟล์ต้นทาง: '.$heading['marker'];
            }

            $entries = [];
            foreach ($yearColumns as $column) {
                $lines = $cells[$column['index']] ?? [];
                if (! array_key_exists($offset, $lines)) {
                    throw new RuntimeException("ปี {$column['yy']} ของ {$code} ไม่มีค่า");
                }

                $parsed = $this->parseYearCell([$lines[$offset]], 'count', $column['yy']);
                if ($parsed['note'] !== null) {
                    $descriptionParts[] = $parsed['note'];
                }
                if ($parsed['entry'] !== null) {
                    $entries[] = [
                        'period_date' => $this->periodDate($column['yy']),
                        ...$parsed['entry'],
                    ];
                }
            }

            $profile = $this->profile(12);
            $specs[] = $this->spec($code, $name, $descriptionParts, $profile, 0.0, $standard, $entries);
        }

        return $specs;
    }

    /**
     * @param  list<string>  $descriptionParts
     * @param  array{mode: string, unit: string, operator: string, target: ?float}  $profile
     * @param  list<array{period_date: string, numerator: ?float, denominator: ?float, result_value: float, notes: ?string}>  $entries
     * @return array<string, mixed>
     */
    private function spec(
        string $code,
        string $name,
        array $descriptionParts,
        array $profile,
        float $target,
        ?string $formula,
        array $entries,
    ): array {
        $descriptionParts = array_values(array_filter(
            array_map(fn ($part) => trim((string) $part), $descriptionParts),
            fn ($part) => $part !== '',
        ));

        return [
            'code' => $code,
            'name' => $name,
            'description' => $descriptionParts === [] ? null : implode("\n", $descriptionParts),
            'category' => 'ENV',
            'unit' => $profile['unit'],
            'target_value' => $target,
            'target_operator' => $profile['operator'],
            'frequency' => 'Yearly',
            'formula_description' => $formula,
            'entries' => $entries,
        ];
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
            $this->assertEnvOwner($existing, $teamId);

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

    private function assertEnvOwner(QualityIndicator $indicator, int $teamId): void
    {
        if ($indicator->type !== 'ha_team' || (int) $indicator->team_id !== $teamId) {
            throw new RuntimeException("รหัส {$indicator->code} ถูกใช้โดยสังกัดอื่นแล้ว จึงไม่นำเข้าและไม่เขียนทับ");
        }
    }

    /**
     * @param  list<string>  $paras
     * @return array{entry: ?array{numerator: ?float, denominator: ?float, result_value: float, notes: ?string}, note: ?string}
     */
    private function parseYearCell(array $paras, string $mode, int $yy): array
    {
        if ($this->isDashCell($paras)) {
            return ['entry' => null, 'note' => null];
        }

        if (! $this->isMeasurement($paras, $mode)) {
            return ['entry' => null, 'note' => 'ปี '.$yy.': '.implode(' ', $paras)];
        }

        return ['entry' => $this->measurementEntry($paras, $mode), 'note' => null];
    }

    /**
     * @param  list<string>  $paras
     * @return array{numerator: ?float, denominator: ?float, result_value: float, notes: ?string}
     */
    private function measurementEntry(array $paras, string $mode): array
    {
        $joined = implode(' ', $paras);
        $fraction = $this->fraction($joined);

        if ($mode === 'passfail') {
            if ($fraction === null || $fraction[1] == 0.0) {
                throw new RuntimeException("ผลผ่าน/ไม่ผ่านไม่มีเศษส่วน: {$joined}");
            }

            return [
                'result_value' => round($fraction[0] / $fraction[1] * 100, 2),
                'numerator' => $fraction[0],
                'denominator' => $fraction[1],
                'notes' => $joined,
            ];
        }

        $result = $this->leadingNumber($paras[0] ?? '');
        if ($result === null) {
            throw new RuntimeException("ไม่พบตัวเลขผลวัด: {$joined}");
        }

        $single = $fraction === null ? $this->singleParen($joined) : null;
        $bare = count($paras) === 1 && preg_match('/^-?\d+(?:\.\d+)?$/u', trim($paras[0])) === 1;

        return [
            'result_value' => round($result, 2),
            'numerator' => $fraction[0] ?? $single,
            'denominator' => $fraction[1] ?? null,
            'notes' => $bare ? null : $joined,
        ];
    }

    /**
     * @param  array{mode: string, unit: string, operator: string, target: ?float}  $profile
     * @param  list<string>  $targetParas
     */
    private function targetValue(array $profile, array $targetParas, string $code): float
    {
        if ($profile['target'] !== null) {
            return $profile['target'];
        }

        $value = $this->leadingNumber($targetParas[0] ?? '');
        if ($value === null) {
            throw new RuntimeException("ไม่พบค่าเป้าหมายของ {$code}");
        }

        return round($value, 2);
    }

    /**
     * @param  list<string>  $paras
     * @return list<string>
     */
    private function descriptiveTargetLines(array $paras, string $mode): array
    {
        if ($mode === 'split12') {
            return [];
        }

        $lines = [];
        $skippedNumber = false;

        foreach ($paras as $para) {
            $para = trim($para);
            if ($para === '') {
                continue;
            }
            if ($mode === 'passfail' && ($para === 'ผ่าน' || $para === 'ไม่ผ่าน')) {
                continue;
            }
            if (! $skippedNumber && preg_match('/^-?\d+(?:\.\d+)?$/u', $para) === 1) {
                $skippedNumber = true;

                continue;
            }
            $lines[] = $para;
        }

        return $lines;
    }

    /**
     * @return array{mode: string, unit: string, operator: string, target: ?float}
     */
    private function profile(int $heading): array
    {
        return match ($heading) {
            1, 2, 6, 10, 11 => ['mode' => 'percent', 'unit' => '%', 'operator' => '>=', 'target' => null],
            4 => ['mode' => 'count', 'unit' => 'ครั้ง', 'operator' => '<=', 'target' => 0.0],
            5 => ['mode' => 'count', 'unit' => 'ครั้ง', 'operator' => '>=', 'target' => 1.0],
            7, 8, 9 => ['mode' => 'passfail', 'unit' => '%', 'operator' => '>=', 'target' => 100.0],
            12 => ['mode' => 'split12', 'unit' => 'ครั้ง', 'operator' => '<=', 'target' => 0.0],
            default => throw new RuntimeException("ไม่รู้จักหัวข้อตัวชี้วัด {$heading}"),
        };
    }

    /**
     * @param  list<list<list<string>>>  $rows
     */
    private function headerIndex(array $rows): int
    {
        foreach ($rows as $index => $cells) {
            $first = $cells[0][0] ?? '';
            if (str_contains($first, 'ตัวชี้วัด') || str_contains($first, 'ข้อมูล')) {
                return $index;
            }
        }

        throw new RuntimeException('ไม่พบแถวหัวตารางตัวชี้วัด');
    }

    /**
     * @param  list<list<string>>  $header
     * @return list<array{index: int, yy: int}>
     */
    private function yearColumns(array $header): array
    {
        $columns = [];
        foreach ($header as $index => $paras) {
            $text = implode(' ', $paras);
            if (preg_match('/ปี\s*(\d{2,4})/u', $text, $matches) === 1) {
                $columns[] = ['index' => $index, 'yy' => (int) $matches[1]];
            }
        }

        if ($columns === []) {
            throw new RuntimeException('ไม่พบคอลัมน์ปีในตาราง');
        }

        return $columns;
    }

    /**
     * @return array{number: int, name: string, marker: string}
     */
    private function heading(string $text, int $rowNumber): array
    {
        if (preg_match('/^(\d+)\s*\.\s*(.*)$/u', trim($text), $matches) !== 1) {
            throw new RuntimeException("แถวที่ {$rowNumber} ไม่มีเลขหัวข้อตัวชี้วัด");
        }

        $name = trim($matches[2]);
        $marker = '';
        if (preg_match('/(\*+)\s*$/u', $name, $mark) === 1) {
            $marker = $mark[1];
            $name = trim((string) preg_replace('/\*+\s*$/u', '', $name));
        }

        return [
            'number' => (int) $matches[1],
            'name' => $name,
            'marker' => $marker,
        ];
    }

    private function code(int $number, ?int $sub = null): string
    {
        $code = 'env-'.str_pad((string) $number, 2, '0', STR_PAD_LEFT);

        return $sub === null ? $code : $code.'-'.$sub;
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

    /**
     * @param  list<string>  $paras
     */
    private function isDashCell(array $paras): bool
    {
        if ($paras === []) {
            return true;
        }

        foreach ($paras as $para) {
            if (! in_array(trim($para), ['-', '–', '—'], true)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  list<string>  $paras
     */
    private function isMeasurement(array $paras, string $mode): bool
    {
        $first = trim($paras[0] ?? '');
        if ($first === '' || preg_match('/^NA\b/iu', $first) === 1) {
            return false;
        }

        if ($mode === 'passfail') {
            return str_starts_with($first, 'ไม่ผ่าน') || str_starts_with($first, 'ผ่าน');
        }

        return $this->leadingNumber($first) !== null;
    }

    private function leadingNumber(string $text): ?float
    {
        if (preg_match('/^(-?\d+(?:\.\d+)?)/u', trim($text), $matches) !== 1) {
            return null;
        }

        return (float) $matches[1];
    }

    /**
     * @return array{0: float, 1: float}|null
     */
    private function fraction(string $text): ?array
    {
        if (preg_match('/\((\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\)/u', $text, $matches) !== 1) {
            return null;
        }

        return [(float) $matches[1], (float) $matches[2]];
    }

    private function singleParen(string $text): ?float
    {
        if (preg_match('/\((\d+(?:\.\d+)?)\)/u', $text, $matches) !== 1) {
            return null;
        }

        return (float) $matches[1];
    }

    private function envTeamId(): int
    {
        $teamId = TeamHa::query()->where('abbreviation', 'ENV')->value('id')
            ?? TeamHa::query()->where('abbreviation', 'like', 'ENV%')->orderBy('id')->value('id')
            ?? TeamHa::query()->where('name_th', 'like', '%สิ่งแวดล้อม%')->orderBy('id')->value('id');

        if (! $teamId) {
            throw new RuntimeException('ไม่พบทีม ENV ในตาราง teamha');
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
