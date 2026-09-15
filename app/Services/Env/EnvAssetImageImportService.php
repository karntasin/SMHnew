<?php

namespace App\Services\Env;

use App\Models\EnvAsset;
use App\Models\EnvAssetLine;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Worksheet\MemoryDrawing;

class EnvAssetImageImportService
{
    public function defaultSourceDir(): string
    {
        return 'E:\\บัญชีคุม';
    }

    /**
     * @return array{images:int,linked:int,errors:list<string>}
     */
    public function importFile(string $path, EnvAssetLine $line): array
    {
        $reader = IOFactory::createReader('Xls');
        $reader->setReadDataOnly(false);
        $spreadsheet = $reader->load($path);

        $images = 0;
        $linked = 0;
        $errors = [];

        foreach ($spreadsheet->getAllSheets() as $sheet) {
            $sheetName = $sheet->getTitle();
            $statusKey = EnvAssetRegistryImportService::SHEET_STATUS[$sheetName] ?? $this->safeName($sheetName);

            foreach ($sheet->getDrawingCollection() as $drawing) {
                $coord = method_exists($drawing, 'getCoordinates') ? (string) $drawing->getCoordinates() : '';
                if ($coord === '' || ! preg_match('/^([A-Z]+)(\d+)$/', $coord, $m)) {
                    continue;
                }
                $row = (int) $m[2];
                if ($row < 2) {
                    continue;
                }

                $binary = $this->drawingBinary($drawing);
                if ($binary === null) {
                    $errors[] = "{$line->name}/{$sheetName} แถว {$row}: อ่านรูปไม่ได้";
                    continue;
                }

                [$ext, $bytes] = $binary;
                $relative = sprintf('env/assets/%s/%s/row_%d.%s', $line->code, $statusKey, $row, $ext);
                Storage::disk('public')->put($relative, $bytes);
                $images++;

                $asset = EnvAsset::query()
                    ->where('line_id', $line->id)
                    ->where('sheet_name', $sheetName)
                    ->where('source_row', $row)
                    ->first();

                if ($asset) {
                    if ($asset->image_path && $asset->image_path !== $relative) {
                        Storage::disk('public')->delete($asset->image_path);
                    }
                    $asset->update(['image_path' => $relative]);
                    $linked++;
                }
            }
        }

        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);

        return compact('images', 'linked', 'errors');
    }

    /**
     * เชื่อมรูปจากโฟลเดอร์ที่ export แล้ว โดยจับคู่ line_code + source_row (+ sheet ถ้าอ่านได้)
     *
     * @return array{linked:int,files:int}
     */
    public function linkExportedDirectories(): array
    {
        $base = storage_path('app/public/env/assets');
        $linked = 0;
        $files = 0;

        if (! is_dir($base)) {
            return ['linked' => 0, 'files' => 0];
        }

        $sheetAliases = [
            'normal' => 'ปกติ',
            'repair' => 'ส่งซ่อม',
            'pending_disposal' => 'รอจำหน่าย',
            'disposed' => 'จำหน่าย',
            'written_off' => 'ตัดยอด',
            'telephone' => 'โทรศัพท์',
            'proposed' => 'เสนอ 70',
            'ปกต' => 'ปกติ',
            'ปกติ' => 'ปกติ',
            'ส่งซ่อม' => 'ส่งซ่อม',
            'รอจำหน่าย' => 'รอจำหน่าย',
            'จำหน่าย' => 'จำหน่าย',
            'ตัดยอด' => 'ตัดยอด',
            'โทรศัพท์' => 'โทรศัพท์',
            'เสนอ_70' => 'เสนอ 70',
            'เสนอ 70' => 'เสนอ 70',
        ];

        foreach (File::directories($base) as $lineDir) {
            $lineCode = basename($lineDir);
            $line = EnvAssetLine::where('code', $lineCode)->first();
            if (! $line) {
                continue;
            }

            foreach (File::directories($lineDir) as $sheetDir) {
                $folder = basename($sheetDir);
                $sheetName = $sheetAliases[$folder] ?? null;

                // เดาจาก prefix ไทยที่อาจถูกตัด
                if (! $sheetName) {
                    foreach (['ปกติ', 'ส่งซ่อม', 'รอจำหน่าย', 'จำหน่าย', 'ตัดยอด', 'โทรศัพท์', 'เสนอ 70'] as $candidate) {
                        if (str_starts_with($candidate, $folder) || str_starts_with($folder, mb_substr($candidate, 0, 2))) {
                            // weak match — prefer exact registry folders later
                        }
                    }
                }

                foreach (File::files($sheetDir) as $file) {
                    if (! preg_match('/row_(\d+)\.(jpe?g|png|gif)$/i', $file->getFilename(), $m)) {
                        continue;
                    }
                    $files++;
                    $row = (int) $m[1];

                    $query = EnvAsset::query()->where('line_id', $line->id)->where('source_row', $row);
                    if ($sheetName) {
                        $query->where('sheet_name', $sheetName);
                    }

                    $asset = $query->first();
                    // ถ้าเดาชีทไม่ได้ แต่แถวไม่ซ้ำในสายนี้
                    if (! $asset && ! $sheetName) {
                        $matches = EnvAsset::query()
                            ->where('line_id', $line->id)
                            ->where('source_row', $row)
                            ->get();
                        if ($matches->count() === 1) {
                            $asset = $matches->first();
                        }
                    }

                    if (! $asset) {
                        continue;
                    }

                    $relative = 'env/assets/'.$lineCode.'/'.$folder.'/'.$file->getFilename();
                    $asset->update(['image_path' => $relative]);
                    $linked++;
                }
            }
        }

        // manifest UTF-8 (ถ้า path ตรง)
        $manifestPath = $base.DIRECTORY_SEPARATOR.'_manifest.json';
        if (is_file($manifestPath)) {
            $rows = json_decode((string) file_get_contents($manifestPath), true) ?: [];
            foreach ($rows as $row) {
                $line = EnvAssetLine::where('code', $row['line_code'] ?? '')->first();
                if (! $line) {
                    continue;
                }
                $rel = (string) ($row['path'] ?? '');
                if ($rel === '' || ! is_file(storage_path('app/public/'.$rel))) {
                    // ลองหาไฟล์ row_N ในโฟลเดอร์สายนั้น
                    $rowNo = (int) ($row['source_row'] ?? 0);
                    $sheet = (string) ($row['sheet_name'] ?? '');
                    $found = $this->findExportedFile($line->code, $rowNo, $sheet);
                    if (! $found) {
                        continue;
                    }
                    $rel = $found;
                }

                $asset = EnvAsset::query()
                    ->where('line_id', $line->id)
                    ->where('sheet_name', $row['sheet_name'] ?? '')
                    ->where('source_row', (int) ($row['source_row'] ?? 0))
                    ->first();
                if (! $asset) {
                    continue;
                }
                $asset->update(['image_path' => $rel]);
                $linked++;
            }
        }

        return compact('linked', 'files');
    }

    private function findExportedFile(string $lineCode, int $row, string $sheetName): ?string
    {
        $base = storage_path('app/public/env/assets/'.$lineCode);
        if (! is_dir($base) || $row < 2) {
            return null;
        }

        $candidates = [];
        foreach (File::directories($base) as $sheetDir) {
            foreach (['jpg', 'jpeg', 'png'] as $ext) {
                $path = $sheetDir.DIRECTORY_SEPARATOR."row_{$row}.{$ext}";
                if (is_file($path)) {
                    $candidates[] = 'env/assets/'.$lineCode.'/'.basename($sheetDir).'/row_'.$row.'.'.$ext;
                }
            }
        }

        if ($candidates === []) {
            return null;
        }
        if (count($candidates) === 1) {
            return $candidates[0];
        }

        // เลือกโฟลเดอร์ที่ชื่อใกล้ sheet
        foreach ($candidates as $rel) {
            $folder = basename(dirname(storage_path('app/public/'.$rel)));
            if ($sheetName !== '' && (str_contains($sheetName, mb_substr($folder, 0, 2)) || str_contains($folder, mb_substr($sheetName, 0, 2)))) {
                return $rel;
            }
        }

        return $candidates[0];
    }

    /**
     * @return array{0:string,1:string}|null
     */
    private function drawingBinary(object $drawing): ?array
    {
        if ($drawing instanceof MemoryDrawing) {
            $resource = $drawing->getImageResource();
            if (! $resource) {
                return null;
            }
            $mime = $drawing->getMimeType();
            $ext = match ($mime) {
                MemoryDrawing::MIMETYPE_PNG, 'image/png' => 'png',
                MemoryDrawing::MIMETYPE_GIF, 'image/gif' => 'gif',
                default => 'jpg',
            };
            ob_start();
            match ($ext) {
                'png' => imagepng($resource),
                'gif' => imagegif($resource),
                default => imagejpeg($resource, null, 88),
            };
            $binary = (string) ob_get_clean();

            return $binary !== '' ? [$ext, $binary] : null;
        }

        if ($drawing instanceof Drawing) {
            $path = $drawing->getPath();
            if (! is_file($path)) {
                return null;
            }
            $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION) ?: 'jpg');
            if ($ext === 'jpeg') {
                $ext = 'jpg';
            }

            return [$ext, (string) file_get_contents($path)];
        }

        return null;
    }

    private function safeName(string $value): string
    {
        $value = preg_replace('/[^\p{L}\p{N}_-]+/u', '_', $value) ?? 'sheet';

        return trim($value, '_') ?: 'sheet';
    }
}
