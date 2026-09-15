<?php

namespace App\Services\Env;

use App\Models\EnvAsset;
use App\Models\EnvAssetLine;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class EnvAssetRegistryImportService
{
    /** @var array<string, array{code:string,name:string,short:string,sort:int}> */
    public const LINE_FILES = [
        'บัญชีคุมสิ่งอุปกรณ์ของหน่วย สาย พลาธิการ.xls' => [
            'code' => 'supply',
            'name' => 'สาย พลาธิการ',
            'short' => 'พธ.',
            'sort' => 1,
        ],
        'บัญชีคุมสิ่งอุปกรณ์ของหน่วย สาย ยุทธโยธา.xls' => [
            'code' => 'engineer',
            'name' => 'สาย ยุทธโยธา',
            'short' => 'ยย.',
            'sort' => 2,
        ],
        'บัญชีคุมสิ่งอุปกรณ์ของหน่วย สาย วิทยาศาสตร์.xls' => [
            'code' => 'science',
            'name' => 'สาย วิทยาศาสตร์',
            'short' => 'วศ.',
            'sort' => 3,
        ],
        'บัญชีคุมสิ่งอุปกรณ์ของหน่วย สาย สื่อสาร.xls' => [
            'code' => 'signal',
            'name' => 'สาย สื่อสาร',
            'short' => 'ส.',
            'sort' => 4,
        ],
        'บัญชีคุมสิ่งอุปกรณ์ของหน่วย สาย แพทย์.xls' => [
            'code' => 'medical',
            'name' => 'สาย แพทย์',
            'short' => 'พ.',
            'sort' => 5,
        ],
    ];

    /** @var array<string, string> */
    public const SHEET_STATUS = [
        'ปกติ' => 'normal',
        'ส่งซ่อม' => 'repair',
        'รอจำหน่าย' => 'pending_disposal',
        'จำหน่าย' => 'disposed',
        'ตัดยอด' => 'disposed',
        'โทรศัพท์' => 'normal',
        'เสนอ 70' => 'normal',
        'เสนอ' => 'normal',
    ];

    public function defaultSourceDir(): string
    {
        return 'E:\\บัญชีคุม';
    }

    /**
     * @return array{lines:int,imported:int,skipped:int,sheets:list<array<string,mixed>>,errors:list<string>}
     */
    public function importFromDirectory(string $dir, bool $fresh = true): array
    {
        $result = [
            'lines' => 0,
            'imported' => 0,
            'skipped' => 0,
            'sheets' => [],
            'errors' => [],
        ];

        if ($fresh) {
            EnvAsset::query()->whereNotNull('import_key')->delete();
        }

        foreach (self::LINE_FILES as $filename => $meta) {
            $path = rtrim($dir, '\\/').DIRECTORY_SEPARATOR.$filename;
            if (! is_file($path)) {
                $result['errors'][] = "ไม่พบไฟล์: {$filename}";
                continue;
            }

            try {
                $line = EnvAssetLine::updateOrCreate(
                    ['code' => $meta['code']],
                    [
                        'name' => $meta['name'],
                        'short_name' => $meta['short'],
                        'source_filename' => $filename,
                        'sort_order' => $meta['sort'],
                        'is_active' => true,
                    ]
                );
                $result['lines']++;

                $fileStats = $this->importFile($path, $line);
                $result['imported'] += $fileStats['imported'];
                $result['skipped'] += $fileStats['skipped'];
                $result['sheets'] = array_merge($result['sheets'], $fileStats['sheets']);
                foreach ($fileStats['errors'] as $err) {
                    $result['errors'][] = $err;
                }
            } catch (\Throwable $e) {
                $result['errors'][] = "{$filename}: ".$e->getMessage();
            }
        }

        return $result;
    }

    /**
     * @return array{imported:int,skipped:int,sheets:list<array<string,mixed>>,errors:list<string>}
     */
    public function importFile(string $path, EnvAssetLine $line): array
    {
        $reader = IOFactory::createReader('Xls');
        $reader->setReadDataOnly(true);
        $reader->setReadEmptyCells(false);
        $spreadsheet = $reader->load($path);

        $imported = 0;
        $skipped = 0;
        $sheets = [];
        $errors = [];

        foreach ($spreadsheet->getSheetNames() as $sheetName) {
            $status = self::SHEET_STATUS[$sheetName] ?? null;
            if (! $status) {
                $errors[] = "{$line->name} / {$sheetName}: ข้ามแท็บที่ไม่รู้จัก";
                continue;
            }

            $sheet = $spreadsheet->getSheetByName($sheetName);
            if (! $sheet) {
                continue;
            }

            $stats = $this->importSheet($sheet, $line, $sheetName, $status, basename($path));
            $imported += $stats['imported'];
            $skipped += $stats['skipped'];
            $sheets[] = [
                'line' => $line->name,
                'sheet' => $sheetName,
                'registry_status' => $status,
                'imported' => $stats['imported'],
                'skipped' => $stats['skipped'],
                'excel_data_rows' => $stats['excel_data_rows'],
            ];
        }

        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);

        return compact('imported', 'skipped', 'sheets', 'errors');
    }

    /**
     * @return array{imported:int,skipped:int,excel_data_rows:int}
     */
    private function importSheet(
        Worksheet $sheet,
        EnvAssetLine $line,
        string $sheetName,
        string $registryStatus,
        string $sourceFile,
    ): array {
        $highestRow = (int) $sheet->getHighestDataRow();
        $highestCol = $sheet->getHighestDataColumn();
        if ($highestRow < 1) {
            return ['imported' => 0, 'skipped' => 0, 'excel_data_rows' => 0];
        }

        $headerRowIndex = 1;
        $headers = $this->readHeaderMap($sheet, $highestCol, $sheetName);

        // แท็บ "เสนอ 70" ไม่มีหัวตาราง
        if ($sheetName === 'เสนอ 70' || $headers === []) {
            $headers = $this->fallbackHeaders($sheetName, $line->code);
            $headerRowIndex = 0;
        }

        $imported = 0;
        $skipped = 0;
        $excelDataRows = 0;

        for ($row = $headerRowIndex + 1; $row <= $highestRow; $row++) {
            $raw = [];
            foreach ($headers as $col => $header) {
                $val = $sheet->getCell($col.$row)->getCalculatedValue();
                $raw[$header] = $this->normalizeCell($val);
            }

            if ($this->rowIsEmpty($raw)) {
                $skipped++;
                continue;
            }

            // ข้ามแถวที่เป็นหัวซ้ำ
            if (($raw['รายการ'] ?? '') === 'รายการ' || ($raw['ลำดับ'] ?? '') === 'ลำดับ') {
                $skipped++;
                continue;
            }

            $itemName = trim((string) ($raw['รายการ'] ?? ''));
            if ($itemName === '' || $itemName === '(ไม่ระบุรายการ)' || $itemName === '-') {
                $skipped++;
                continue;
            }

            $excelDataRows++;
            $mapped = $this->mapRow($raw, $line, $sheetName, $registryStatus, $sourceFile, $row);
            EnvAsset::updateOrCreate(
                ['import_key' => $mapped['import_key']],
                $mapped
            );
            $imported++;
        }

        return [
            'imported' => $imported,
            'skipped' => $skipped,
            'excel_data_rows' => $excelDataRows,
        ];
    }

    /**
     * @return array<string, string> colLetter => header
     */
    private function readHeaderMap(Worksheet $sheet, string $highestCol, string $sheetName): array
    {
        $row = $sheet->rangeToArray('A1:'.$highestCol.'1', null, true, false, true)[1] ?? [];
        $map = [];
        $hasName = false;
        foreach ($row as $col => $val) {
            $header = $this->normalizeHeader((string) ($val ?? ''));
            if ($header === '') {
                continue;
            }
            $map[$col] = $header;
            if (in_array($header, ['รายการ', 'name'], true)) {
                $hasName = true;
            }
        }

        if (! $hasName) {
            return [];
        }

        return $map;
    }

    /**
     * @return array<string, string>
     */
    private function fallbackHeaders(string $sheetName, string $lineCode): array
    {
        if ($sheetName === 'เสนอ 70') {
            return [
                'A' => 'ลำดับ',
                'B' => 'รายการ',
                'C' => 'ราคา/หน่วย',
                'D' => 'หมายเลข สป. 8 หลัก',
                'E' => 'สถานภาพ สป.',
                'F' => 'ยี่ห้อ',
                'G' => 'รุ่น',
                'H' => 'บริษัท',
                'I' => 'ปีงบประมาณ',
                'J' => 'ประเภทงบประมาณ',
                'K' => 'SN',
                'L' => 'อสอ./สป.4',
                'M' => 'รูปภาพ สป.',
                'N' => 'สถานะสิ่งอุปกรณ์',
                'O' => 'หมายเหตุ',
            ];
        }

        // สื่อสาร/จำหน่าย หรือแท็บที่หัวตารางว่าง
        if ($lineCode === 'signal') {
            return [
                'A' => 'ลำดับ',
                'B' => 'รายการ',
                'C' => 'ราคา/หน่วย',
                'D' => 'หมายเลข สป. 8 หลัก',
                'E' => 'สถานภาพ สป.',
                'F' => 'ยี่ห้อ',
                'G' => 'รุ่น',
                'H' => 'หมายเลข คฉ.',
                'I' => 'ปีงบประมาณ',
                'J' => 'ประเภทงบประมาณ',
                'K' => 'SN',
                'L' => 'อสอ./สป.4',
                'M' => 'รูปภาพ สป.',
                'N' => 'สถานะสิ่งอุปกรณ์',
                'O' => 'หมายเหตุ',
            ];
        }

        return [
            'A' => 'ลำดับ',
            'B' => 'รายการ',
            'C' => 'ราคา/หน่วย',
            'D' => 'หมายเลข สป. 8 หลัก',
            'E' => 'สถานภาพ สป.',
            'F' => 'ยี่ห้อ',
            'G' => 'รุ่น',
            'H' => 'บริษัท',
            'I' => 'ปีงบประมาณ',
            'J' => 'ประเภทงบประมาณ',
            'K' => 'SN',
            'L' => 'อสอ./สป.4',
            'M' => 'รูปภาพ สป.',
            'N' => 'สถานะสิ่งอุปกรณ์',
        ];
    }

    /**
     * @param  array<string, string>  $raw
     * @return array<string, mixed>
     */
    private function mapRow(
        array $raw,
        EnvAssetLine $line,
        string $sheetName,
        string $registryStatus,
        string $sourceFile,
        int $row,
    ): array {
        $get = function (array $keys) use ($raw): ?string {
            foreach ($keys as $key) {
                if (array_key_exists($key, $raw) && $raw[$key] !== '') {
                    return $raw[$key];
                }
            }

            return null;
        };

        $name = (string) $get(['รายการ']);
        $stock = $get(['หมายเลข สป. 8 หลัก', 'หมายเลข สป.']);
        $serial = $get(['SN']);
        $price = $this->parsePrice($get(['ราคา/หน่วย']));

        $registryStatus = EnvAsset::normalizeRegistryStatus($registryStatus);
        $operationalStatus = EnvAsset::operationalStatusForRegistry($registryStatus);

        $location = $get(['อสอ./สป.4', 'สถานะสิ่งอุปกรณ์']);
        $riskRaw = $get(['ประเภทความเสี่ยง Aสูง Bกลาง Cต่ำ', 'ประเภทความเสี่ยง'])
            ?: $this->firstMatching($raw, ['ประเภทความเสี่ยง']);
        $inspectRaw = $get(['ที่ต้องตรวจสภาพ   ( C )', 'ที่ต้องตรวจสภาพ ( C )', 'ชื่อที่ต้องตรวจสภาพ   ( C )', 'ชื่อที่ต้องตรวจสภาพ ( C )'])
            ?: $this->firstMatching($raw, ['ที่ต้องตรวจสภาพ', 'ชื่อที่ต้องตรวจสภาพ']);

        return [
            'line_id' => $line->id,
            'registry_status' => $registryStatus,
            'sheet_name' => $sheetName,
            'item_type' => $get(['ลำดับ', 'ประเภท สป.']),
            'name' => mb_substr($name, 0, 255),
            'model' => $get(['รุ่น']),
            'serial_number' => $serial ? mb_substr($serial, 0, 191) : null,
            'price' => $price,
            'location' => $location ? mb_substr($location, 0, 255) : null,
            'owner' => $line->name,
            'risk_level' => $this->parseRiskLevel($riskRaw, $line->code),
            'inspection_status' => $this->parseInspectionStatus($inspectRaw),
            'status' => $operationalStatus,
            'stock_number' => $stock ? mb_substr($stock, 0, 128) : null,
            'condition_code' => $get(['สถานภาพ สป.']),
            'brand' => $get(['ยี่ห้อ']),
            'company' => $get(['บริษัท']),
            'fiscal_year' => $get(['ปีงบประมาณ']),
            'budget_type' => $get(['ประเภทงบประมาณ']),
            'control_number' => $get(['หมายเลข คฉ.']),
            'reference_doc' => $get(['เอกสารอ้างอิง']),
            'delivery_date' => $get(['วันที่ส่งมอบ']),
            'fan_coil' => $get(['แฟนคอยล์']),
            'condensing_unit' => $get(['คอนเดนซิ่ง']),
            'issue_location' => $get(['อสอ./สป.4']),
            'status_note' => $get(['สถานะสิ่งอุปกรณ์', 'หมายเหตุ']),
            'image_ref' => $get(['รูปภาพ สป.']),
            'inspection_doc' => $get(['เลขที่หนังสือของหน่วยตรวจสภาพ'])
                ?: $this->firstMatching($raw, ['หน่วยตรวจสภาพ']),
            'repair_slip_no' => $get(['เลขที่ใบส่งซ่อม']),
            'repair_job_no' => $this->firstMatching($raw, ['เลขงาน']),
            'disposal_doc' => $this->firstMatching($raw, ['ขออนุมัติจำหน่าย', 'ทบ.400-065']),
            'writeoff_doc' => $this->firstMatching($raw, ['ตัดยอดบัญชีคุม']),
            'scrap_return_doc' => $this->firstMatching($raw, ['ส่งคืนซาก']),
            'source_file' => $sourceFile,
            'source_row' => $row,
            'import_key' => hash('sha1', implode('|', [
                $line->code,
                $sheetName,
                (string) $row,
                $name,
                (string) $stock,
                (string) $serial,
            ])),
            'raw_attributes' => $raw,
        ];
    }

    /**
     * @param  array<string, string>  $raw
     * @param  list<string>  $needles
     */
    private function firstMatching(array $raw, array $needles): ?string
    {
        foreach ($raw as $header => $value) {
            if ($value === '') {
                continue;
            }
            foreach ($needles as $needle) {
                if (str_contains($header, $needle)) {
                    return $value;
                }
            }
        }

        return null;
    }

    /**
     * ประเภทความเสี่ยง จาก Excel → A/B/C หรือ N (ไม่ระบุ)
     */
    public function parseRiskLevel(?string $value, ?string $lineCode = null): string
    {
        $value = trim((string) $value);
        if ($value === '' || $value === '-' || mb_strtolower($value) === 'n/a') {
            return 'N';
        }

        $upper = mb_strtoupper($value);
        if (preg_match('/\bA\b/u', $upper) || str_starts_with($upper, 'A')) {
            return 'A';
        }
        if (preg_match('/\bB\b/u', $upper) || str_starts_with($upper, 'B')) {
            return 'B';
        }
        if (preg_match('/\bC\b/u', $upper) || str_starts_with($upper, 'C')) {
            return 'C';
        }

        return 'N';
    }

    /**
     * การตรวจสภาพ จากคอลัมน์ "ที่ต้องตรวจสภาพ ( C )" → มี C = ตรวจ, ว่าง = ไม่ตรวจ
     */
    public function parseInspectionStatus(?string $value): string
    {
        $value = trim((string) $value);
        if ($value === '' || $value === '-') {
            return 'not_inspect';
        }

        return preg_match('/C/iu', $value) ? 'inspect' : 'not_inspect';
    }

    private function normalizeHeader(string $header): string
    {
        $header = trim(preg_replace("/[ \t]+/u", ' ', str_replace(["\r\n", "\r"], "\n", $header)) ?? '');
        // เก็บเฉพาะบรรทัดแรกของหัวหลายบรรทัดไว้ในคีย์หลัก
        $first = trim(explode("\n", $header)[0] ?? $header);

        return $first !== '' ? $first : $header;
    }

    private function normalizeCell(mixed $value): string
    {
        if ($value === null) {
            return '';
        }
        if (is_bool($value)) {
            return $value ? '1' : '0';
        }
        if (is_float($value) || is_int($value)) {
            if (is_float($value) && floor($value) == $value) {
                return (string) (int) $value;
            }

            return rtrim(rtrim(sprintf('%.6F', (float) $value), '0'), '.');
        }

        return trim(preg_replace("/[ \t]+/u", ' ', str_replace(["\r\n", "\r"], "\n", (string) $value)) ?? '');
    }

    /** @param  array<string, string>  $raw */
    private function rowIsEmpty(array $raw): bool
    {
        foreach ($raw as $value) {
            if (trim((string) $value) !== '') {
                return false;
            }
        }

        return true;
    }

    private function parsePrice(?string $value): ?float
    {
        if ($value === null || $value === '' || $value === '-') {
            return null;
        }
        $clean = str_replace([',', ' '], '', $value);
        if (! is_numeric($clean)) {
            return null;
        }

        return round((float) $clean, 2);
    }

    /**
     * เปรียบเทียบจำนวนแถวข้อมูลใน Excel กับในฐานข้อมูล
     *
     * @return list<array<string, mixed>>
     */
    public function verify(string $dir): array
    {
        $report = [];

        foreach (self::LINE_FILES as $filename => $meta) {
            $path = rtrim($dir, '\\/').DIRECTORY_SEPARATOR.$filename;
            $line = EnvAssetLine::where('code', $meta['code'])->first();
            if (! is_file($path) || ! $line) {
                $report[] = [
                    'line' => $meta['name'],
                    'file' => $filename,
                    'ok' => false,
                    'message' => ! is_file($path) ? 'ไม่พบไฟล์' : 'ยังไม่มีสายงานในฐานข้อมูล',
                ];
                continue;
            }

            $reader = IOFactory::createReader('Xls');
            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($path);

            foreach ($spreadsheet->getSheetNames() as $sheetName) {
                $status = self::SHEET_STATUS[$sheetName] ?? null;
                if (! $status) {
                    continue;
                }
                $sheet = $spreadsheet->getSheetByName($sheetName);
                if (! $sheet) {
                    continue;
                }

                $excelCount = $this->countExcelDataRows($sheet, $sheetName, $line->code);
                $dbCount = EnvAsset::query()
                    ->where('line_id', $line->id)
                    ->where('registry_status', $status)
                    ->where('sheet_name', $sheetName)
                    ->count();

                $samples = $this->sampleCompare($sheet, $sheetName, $line, $status);

                $report[] = [
                    'line' => $line->name,
                    'sheet' => $sheetName,
                    'excel_count' => $excelCount,
                    'db_count' => $dbCount,
                    'ok' => $excelCount === $dbCount && $samples['mismatches'] === 0,
                    'sample_checked' => $samples['checked'],
                    'sample_mismatches' => $samples['mismatches'],
                    'mismatch_examples' => $samples['examples'],
                ];
            }

            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet);
        }

        return $report;
    }

    private function countExcelDataRows(Worksheet $sheet, string $sheetName, string $lineCode): int
    {
        $highestRow = (int) $sheet->getHighestDataRow();
        $highestCol = $sheet->getHighestDataColumn();
        $headers = $this->readHeaderMap($sheet, $highestCol, $sheetName);
        $headerRowIndex = 1;
        if ($sheetName === 'เสนอ 70' || $headers === []) {
            $headers = $this->fallbackHeaders($sheetName, $lineCode);
            $headerRowIndex = 0;
        }

        $count = 0;
        for ($row = $headerRowIndex + 1; $row <= $highestRow; $row++) {
            $raw = [];
            foreach ($headers as $col => $header) {
                $raw[$header] = $this->normalizeCell($sheet->getCell($col.$row)->getCalculatedValue());
            }
            if ($this->rowIsEmpty($raw)) {
                continue;
            }
            if (($raw['รายการ'] ?? '') === 'รายการ' || ($raw['ลำดับ'] ?? '') === 'ลำดับ') {
                continue;
            }
            $itemName = trim((string) ($raw['รายการ'] ?? ''));
            if ($itemName === '' || $itemName === '(ไม่ระบุรายการ)' || $itemName === '-') {
                continue;
            }
            $count++;
        }

        return $count;
    }

    /**
     * @return array{checked:int,mismatches:int,examples:list<string>}
     */
    private function sampleCompare(Worksheet $sheet, string $sheetName, EnvAssetLine $line, string $status): array
    {
        $highestRow = (int) $sheet->getHighestDataRow();
        $highestCol = $sheet->getHighestDataColumn();
        $headers = $this->readHeaderMap($sheet, $highestCol, $sheetName);
        $headerRowIndex = 1;
        if ($sheetName === 'เสนอ 70' || $headers === []) {
            $headers = $this->fallbackHeaders($sheetName, $line->code);
            $headerRowIndex = 0;
        }

        $checked = 0;
        $mismatches = 0;
        $examples = [];

        for ($row = $headerRowIndex + 1; $row <= $highestRow; $row++) {
            $raw = [];
            foreach ($headers as $col => $header) {
                $raw[$header] = $this->normalizeCell($sheet->getCell($col.$row)->getCalculatedValue());
            }
            if ($this->rowIsEmpty($raw) || ($raw['รายการ'] ?? '') === 'รายการ') {
                continue;
            }

            $mapped = $this->mapRow($raw, $line, $sheetName, $status, (string) $line->source_filename, $row);
            $asset = EnvAsset::where('import_key', $mapped['import_key'])->first();
            $checked++;

            if (! $asset) {
                $mismatches++;
                if (count($examples) < 5) {
                    $examples[] = "แถว {$row}: ไม่พบในฐานข้อมูล — {$mapped['name']}";
                }
                continue;
            }

            $nameOk = $asset->name === $mapped['name'];
            $stockOk = (string) $asset->stock_number === (string) $mapped['stock_number'];
            $priceOk = abs(((float) $asset->price) - ((float) ($mapped['price'] ?? 0))) < 0.011
                || ($asset->price === null && $mapped['price'] === null);

            if (! $nameOk || ! $stockOk || ! $priceOk) {
                $mismatches++;
                if (count($examples) < 5) {
                    $examples[] = "แถว {$row}: รายละเอียดไม่ตรง — Excel[{$mapped['name']} / {$mapped['stock_number']}] DB[{$asset->name} / {$asset->stock_number}]";
                }
            }

            if ($checked >= 25) {
                break;
            }
        }

        return compact('checked', 'mismatches', 'examples');
    }
}
