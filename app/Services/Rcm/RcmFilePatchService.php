<?php

namespace App\Services\Rcm;

use App\Models\Rcm\RcmFilePatchBatch;
use App\Models\Rcm\RcmFilePatchItem;
use App\Support\PiiMask;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class RcmFilePatchService
{
    protected string $defaultBaseDir = 'E:\\ec';

    /**
     * ดึงรายชื่อโฟลเดอร์ใน E:\ec ที่มีแฟ้มส่งออก e-Claim
     */
    public function getAvailableFolders(?string $baseDir = null): array
    {
        $dir = $baseDir ?: $this->defaultBaseDir;
        if (! File::isDirectory($dir)) {
            return [];
        }

        $directories = File::directories($dir);
        $result = [];

        foreach ($directories as $path) {
            $name = basename($path);
            $hasAdp = false;
            $adpCount = 0;

            // ตรวจสอบว่าในโฟลเดอร์หรือโฟลเดอร์ย่อยมี ADP หรือไม่
            $files = @scandir($path) ?: [];
            foreach ($files as $file) {
                if (str_starts_with(strtoupper($file), 'ADP')) {
                    $hasAdp = true;
                    $adpCount++;
                }
            }

            // ถ้ามีโฟลเดอร์ย่อยซ้อนอีกชั้น (เช่น sub-batch)
            $subDirs = File::directories($path);
            $subCount = count($subDirs);

            $result[] = [
                'name' => $name,
                'path' => $path,
                'last_modified' => date('Y-m-d H:i:s', File::lastModified($path)),
                'has_adp' => $hasAdp,
                'adp_count' => $adpCount,
                'sub_dirs_count' => $subCount,
            ];
        }

        // เรียงลำดับจากโฟลเดอร์ล่าสุด
        usort($result, fn ($a, $b) => strcmp($b['name'], $a['name']));

        return $result;
    }

    /**
     * สแกนโฟลเดอร์เพื่อตรวจสอบรายการ use_status ที่ต้องปรับปรุง (Dry Run)
     */
    public function scanFolder(string $folderPath, string $targetValue = '1'): array
    {
        if (! File::isDirectory($folderPath)) {
            throw new RuntimeException("ไม่พบโฟลเดอร์: {$folderPath}");
        }

        $folderName = basename($folderPath);
        $adpFiles = $this->findAdpFiles($folderPath);

        if (empty($adpFiles)) {
            return [
                'folder_path' => $folderPath,
                'folder_name' => $folderName,
                'files' => [],
                'total_records' => 0,
                'issues_count' => 0,
                'items' => [],
            ];
        }

        $totalRecords = 0;
        $allItems = [];
        $fileSummaries = [];

        foreach ($adpFiles as $filePath) {
            $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
            $fileName = basename($filePath);

            if ($ext === 'txt') {
                $scan = $this->scanTxtFile($filePath, $targetValue);
                $fileSummaries[] = [
                    'file_name' => $fileName,
                    'file_path' => $filePath,
                    'type' => 'TXT',
                    'total_records' => $scan['total_records'],
                    'non_empty_use_status' => count($scan['items']),
                ];
                $totalRecords = max($totalRecords, $scan['total_records']);
                // รวมรายการที่พบ (ใช้ไฟล์หลัก ADP.txt หรือไฟล์แรกเป็นหลักเพื่อไม่ให้ข้อมูลรายงานซ้ำซ้อน)
                if (empty($allItems) || strcasecmp($fileName, 'ADP.txt') === 0) {
                    $allItems = $scan['items'];
                }
            } elseif ($ext === 'dbf') {
                $scan = $this->scanDbfFile($filePath, $targetValue);
                $fileSummaries[] = [
                    'file_name' => $fileName,
                    'file_path' => $filePath,
                    'type' => 'DBF',
                    'total_records' => $scan['total_records'],
                    'non_empty_use_status' => count($scan['items']),
                ];
                if (empty($allItems)) {
                    $allItems = $scan['items'];
                }
            }
        }

        return [
            'folder_path' => $folderPath,
            'folder_name' => $folderName,
            'files' => $fileSummaries,
            'total_records' => $totalRecords,
            'issues_count' => count($allItems),
            'items' => $allItems,
        ];
    }

    /**
     * ดำเนินการปรับปรุงแฟ้ม (ปรับ use_status เป็น targetValue + Log to DB)
     */
    public function executePatch(string $folderPath, ?int $userId = null, string $targetValue = '1'): array
    {
        if (! File::isDirectory($folderPath)) {
            throw new RuntimeException("ไม่พบโฟลเดอร์: {$folderPath}");
        }

        $folderName = basename($folderPath);
        $adpFiles = $this->findAdpFiles($folderPath);

        if (empty($adpFiles)) {
            throw new RuntimeException("ไม่พบแฟ้ม ADP ในโฟลเดอร์: {$folderPath}");
        }

        $modifiedFilesCount = 0;
        $totalRecordsScanned = 0;
        $loggedItems = [];

        // 1. ปรับแก้ไฟล์ TXT
        foreach ($adpFiles as $filePath) {
            $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
            $fileName = basename($filePath);

            if ($ext === 'txt') {
                $res = $this->patchTxtFile($filePath, $targetValue);
                $modifiedFilesCount++;
                $totalRecordsScanned = max($totalRecordsScanned, $res['total_records']);
                if (empty($loggedItems) || strcasecmp($fileName, 'ADP.txt') === 0) {
                    $loggedItems = $res['modified_items'];
                }
            } elseif ($ext === 'dbf') {
                $this->patchDbfFile($filePath, $targetValue);
                $modifiedFilesCount++;
            }
        }

        // 2. บันทึกประวัติและรายการที่ปรับปรุงลงใน MySQL
        $batch = DB::transaction(function () use ($folderName, $folderPath, $modifiedFilesCount, $totalRecordsScanned, $loggedItems, $userId, $targetValue) {
            $batch = RcmFilePatchBatch::create([
                'batch_name' => $folderName,
                'folder_path' => $folderPath,
                'target_file' => 'ADP',
                'total_files_modified' => $modifiedFilesCount,
                'total_records_scanned' => $totalRecordsScanned,
                'total_records_modified' => count($loggedItems),
                'backup_path' => null,
                'status' => 'completed',
                'created_by' => $userId,
            ]);

            foreach ($loggedItems as $item) {
                RcmFilePatchItem::create([
                    'batch_id' => $batch->id,
                    'file_name' => $item['file_name'] ?? 'ADP.txt',
                    'line_number' => $item['line_number'] ?? 0,
                    'hn' => $item['hn'] ?? null,
                    'an' => $item['an'] ?? null,
                    'dateopd' => $item['dateopd'] ?? null,
                    'type' => $item['type'] ?? null,
                    'code' => $item['code'] ?? null,
                    'qty' => !empty($item['qty']) ? (float) str_replace(',', '', $item['qty']) : null,
                    'rate' => !empty($item['rate']) ? (float) str_replace(',', '', $item['rate']) : null,
                    'seq' => $item['seq'] ?? null,
                    'total' => !empty($item['total']) ? (float) str_replace(',', '', $item['total']) : null,
                    'old_use_status' => $item['old_use_status'] ?? '2',
                    'new_use_status' => $targetValue,
                    'raw_line_before' => $item['raw_line'] ?? null,
                ]);
            }

            return $batch;
        });

        return [
            'batch_id' => $batch->id,
            'batch_name' => $batch->batch_name,
            'folder_path' => $batch->folder_path,
            'total_files_modified' => $modifiedFilesCount,
            'total_records_scanned' => $totalRecordsScanned,
            'total_records_modified' => count($loggedItems),
            'backup_path' => null,
            'items' => $loggedItems,
        ];
    }

    /**
     * ค้นหาไฟล์ ADP ทั้งหมดในโฟลเดอร์ (รวมโฟลเดอร์ย่อยหากมี)
     */
    protected function findAdpFiles(string $folderPath): array
    {
        $all = @scandir($folderPath) ?: [];
        $files = [];

        foreach ($all as $item) {
            if ($item === '.' || $item === '..') continue;
            // ข้ามโฟลเดอร์สำรอง backup
            if (str_starts_with($item, 'backup_')) continue;

            $fullPath = $folderPath . DIRECTORY_SEPARATOR . $item;
            if (is_file($fullPath) && str_starts_with(strtoupper($item), 'ADP')) {
                $ext = strtolower(pathinfo($item, PATHINFO_EXTENSION));
                if (in_array($ext, ['txt', 'dbf'], true)) {
                    $files[] = $fullPath;
                }
            } elseif (is_dir($fullPath)) {
                // ค้นหาในโฟลเดอร์ย่อย 1 ชั้น
                $subFiles = @scandir($fullPath) ?: [];
                foreach ($subFiles as $subItem) {
                    if (str_starts_with(strtoupper($subItem), 'ADP')) {
                        $subExt = strtolower(pathinfo($subItem, PATHINFO_EXTENSION));
                        if (in_array($subExt, ['txt', 'dbf'], true)) {
                            $files[] = $fullPath . DIRECTORY_SEPARATOR . $subItem;
                        }
                    }
                }
            }
        }

        return $files;
    }

    /**
     * สแกนไฟล์ TXT เพื่อหาบรรทัดที่ use_status ไม่ตรงกับค่าเป้าหมาย
     */
    protected function scanTxtFile(string $filePath, string $targetValue = '1'): array
    {
        $fileName = basename($filePath);
        $lines = file($filePath, FILE_IGNORE_NEW_LINES);
        if ($lines === false) {
            return ['total_records' => 0, 'items' => []];
        }

        $items = [];
        $totalRecords = count($lines);

        foreach ($lines as $idx => $line) {
            $lineTrim = trim($line);
            if ($lineTrim === '') continue;

            $parts = explode('|', $lineTrim);
            // Index 13 = USE_STATUS ใน 16 แฟ้ม NHSO ADP
            $useStatus = isset($parts[13]) ? trim($parts[13]) : '';

            // ตรวจสอบบรรทัดที่มี use_status ไม่ว่าง และยังไม่ใช่ค่าเป้าหมาย (เช่น เป็น '2')
            if ($useStatus !== '' && $useStatus !== $targetValue) {
                $items[] = [
                    'file_name' => $fileName,
                    'line_number' => $idx + 1,
                    'hn' => $parts[0] ?? '',
                    'an' => $parts[1] ?? '',
                    'dateopd' => $parts[2] ?? '',
                    'type' => $parts[3] ?? '',
                    'code' => $parts[4] ?? '',
                    'qty' => $parts[5] ?? '',
                    'rate' => $parts[6] ?? '',
                    'seq' => $parts[7] ?? '',
                    'old_use_status' => $useStatus,
                    'new_use_status' => $targetValue,
                    'total' => $parts[14] ?? '',
                    'raw_line' => $lineTrim,
                ];
            }
        }

        return [
            'total_records' => $totalRecords,
            'items' => $items,
        ];
    }

    /**
     * ปรับแก้ไฟล์ TXT: ปรับ Index 13 ให้เป็นค่าเป้าหมาย (targetValue เช่น '1')
     */
    protected function patchTxtFile(string $filePath, string $targetValue = '1'): array
    {
        $fileName = basename($filePath);
        $content = File::get($filePath);
        // รักษา Line Endings (CRLF / LF)
        $eol = str_contains($content, "\r\n") ? "\r\n" : "\n";
        $lines = explode($eol, $content);

        $modifiedItems = [];
        $totalRecords = 0;
        $modifiedCount = 0;

        foreach ($lines as $idx => &$line) {
            $lineTrim = trim($line);
            if ($lineTrim === '') continue;

            $totalRecords++;
            $parts = explode('|', $lineTrim);
            $useStatus = isset($parts[13]) ? trim($parts[13]) : '';

            if ($useStatus !== '' && $useStatus !== $targetValue) {
                $modifiedItems[] = [
                    'file_name' => $fileName,
                    'line_number' => $idx + 1,
                    'hn' => $parts[0] ?? '',
                    'an' => $parts[1] ?? '',
                    'dateopd' => $parts[2] ?? '',
                    'type' => $parts[3] ?? '',
                    'code' => $parts[4] ?? '',
                    'qty' => $parts[5] ?? '',
                    'rate' => $parts[6] ?? '',
                    'seq' => $parts[7] ?? '',
                    'old_use_status' => $useStatus,
                    'new_use_status' => $targetValue,
                    'total' => $parts[14] ?? '',
                    'raw_line' => $lineTrim,
                ];

                // ปรับให้เป็นค่าเป้าหมาย
                $parts[13] = $targetValue;
                $line = implode('|', $parts);
                $modifiedCount++;
            }
        }
        unset($line);

        if ($modifiedCount > 0) {
            File::put($filePath, implode($eol, $lines));
        }

        return [
            'total_records' => $totalRecords,
            'modified_count' => $modifiedCount,
            'modified_items' => $modifiedItems,
        ];
    }

    /**
     * สแกนไฟล์ DBF
     */
    protected function scanDbfFile(string $filePath, string $targetValue = '1'): array
    {
        $bytes = @file_get_contents($filePath);
        if ($bytes === false || strlen($bytes) < 32) {
            return ['total_records' => 0, 'items' => []];
        }

        $header = unpack('Cversion/Cyy/Cmm/Cdd/VnumRecords/vheaderLen/vrecordLen', substr($bytes, 0, 12));
        $numRecords = $header['numRecords'];
        $headerLen = $header['headerLen'];
        $recordLen = $header['recordLen'];

        $fieldOffset = $this->findDbfFieldOffset($bytes, $headerLen, 'USE_STATUS');
        if ($fieldOffset === null) {
            return ['total_records' => $numRecords, 'items' => []];
        }

        $targetChar = $targetValue !== '' ? $targetValue[0] : ' ';
        $items = [];
        for ($r = 0; $r < $numRecords; $r++) {
            $recStart = $headerLen + ($r * $recordLen);
            $statusChar = $bytes[$recStart + $fieldOffset];
            if ($statusChar !== ' ' && $statusChar !== "\x00" && $statusChar !== $targetChar) {
                $items[] = [
                    'file_name' => basename($filePath),
                    'line_number' => $r + 1,
                    'old_use_status' => $statusChar,
                    'new_use_status' => $targetValue,
                ];
            }
        }

        return [
            'total_records' => $numRecords,
            'items' => $items,
        ];
    }

    /**
     * ปรับแก้ไฟล์ DBF: แทนที่ไบต์ของ USE_STATUS ด้วยค่า targetValue (ASCII '1' = 0x31 หรือ Blank = 0x20)
     */
    protected function patchDbfFile(string $filePath, string $targetValue = '1'): int
    {
        $bytes = @file_get_contents($filePath);
        if ($bytes === false || strlen($bytes) < 32) {
            return 0;
        }

        $header = unpack('Cversion/Cyy/Cmm/Cdd/VnumRecords/vheaderLen/vrecordLen', substr($bytes, 0, 12));
        $numRecords = $header['numRecords'];
        $headerLen = $header['headerLen'];
        $recordLen = $header['recordLen'];

        $fieldOffset = $this->findDbfFieldOffset($bytes, $headerLen, 'USE_STATUS');
        if ($fieldOffset === null) {
            return 0;
        }

        $targetChar = $targetValue !== '' ? $targetValue[0] : ' ';
        $modified = 0;
        for ($r = 0; $r < $numRecords; $r++) {
            $recStart = $headerLen + ($r * $recordLen);
            $pos = $recStart + $fieldOffset;
            $statusChar = $bytes[$pos];
            if ($statusChar !== ' ' && $statusChar !== "\x00" && $statusChar !== $targetChar) {
                $bytes[$pos] = $targetChar;
                $modified++;
            }
        }

        if ($modified > 0) {
            file_put_contents($filePath, $bytes);
        }

        return $modified;
    }

    /**
     * ค้นหา offset ของฟิลด์ใน DBF Record (รวม deletion flag 1 byte)
     */
    protected function findDbfFieldOffset(string $bytes, int $headerLen, string $targetFieldName): ?int
    {
        $numFields = (int) floor(($headerLen - 33) / 32);
        $currentOffset = 1; // เริ่มที่ 1 เนื่องจาก byte 0 คือ deletion flag

        for ($i = 0; $i < $numFields; $i++) {
            $descriptorOffset = 32 + ($i * 32);
            $fieldNameBytes = substr($bytes, $descriptorOffset, 11);
            $fieldName = strtoupper(rtrim(explode("\x00", $fieldNameBytes)[0]));
            $fieldLen = ord($bytes[$descriptorOffset + 16]);

            if ($fieldName === strtoupper($targetFieldName)) {
                return $currentOffset;
            }

            $currentOffset += $fieldLen;
        }

        return null;
    }

    /**
     * ดึงประวัติการปรับปรุงย้อนหลัง
     */
    public function getRecentBatches(int $limit = 20): array
    {
        return RcmFilePatchBatch::with('creator:id,name')
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->map(function ($b) {
                return [
                    'id' => $b->id,
                    'batch_name' => $b->batch_name,
                    'folder_path' => $b->folder_path,
                    'total_files_modified' => $b->total_files_modified,
                    'total_records_scanned' => $b->total_records_scanned,
                    'total_records_modified' => $b->total_records_modified,
                    'backup_path' => $b->backup_path,
                    'created_at' => $b->created_at?->format('Y-m-d H:i:s'),
                    'creator_name' => $b->creator?->name ?? 'ระบบ',
                ];
            })
            ->toArray();
    }

    /**
     * ดึงรายการที่ปรับปรุงใน batch ตาม id
     */
    public function getBatchItems(int $batchId): array
    {
        $items = RcmFilePatchItem::where('batch_id', $batchId)
            ->orderBy('id')
            ->get();

        return $items->map(function ($item) {
            return [
                'id' => $item->id,
                'file_name' => $item->file_name,
                'line_number' => $item->line_number,
                'hn' => PiiMask::hn($item->hn),
                'an' => $item->an,
                'dateopd' => $item->dateopd,
                'type' => $item->type,
                'code' => $item->code,
                'qty' => (float) $item->qty,
                'rate' => (float) $item->rate,
                'seq' => $item->seq,
                'total' => (float) $item->total,
                'old_use_status' => $item->old_use_status,
                'new_use_status' => ($item->new_use_status !== null && $item->new_use_status !== '') ? $item->new_use_status : '(ค่าว่าง)',
            ];
        })->toArray();
    }
}
