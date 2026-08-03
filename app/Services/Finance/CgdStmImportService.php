<?php

namespace App\Services\Finance;

use App\Models\Finance\CgdStmBatch;
use App\Models\Finance\CgdStmRow;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class CgdStmImportService
{
    /**
     * @return array{batch: CgdStmBatch, updated: bool}
     */
    public function import(UploadedFile $file, ?string $notes = null): array
    {
        $ext = strtolower($file->getClientOriginalExtension());
        if (! in_array($ext, ['xls', 'xlsx', 'csv'], true)) {
            throw ValidationException::withMessages([
                'file' => 'รองรับเฉพาะไฟล์ .xls .xlsx หรือ .csv จากระบบ e-Claim (STM)',
            ]);
        }

        $storedName = 'stm_'.now()->format('Ymd_His').'_'.uniqid().'.'.$ext;
        $storedPath = $file->storeAs('finance/cgd-stm', $storedName, 'local');
        $absolute = Storage::disk('local')->path($storedPath);

        try {
            $parsed = $this->parseFile($absolute, $file->getClientOriginalName());
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($storedPath);
            throw ValidationException::withMessages([
                'file' => 'อ่านไฟล์ STM ไม่สำเร็จ: '.$e->getMessage(),
            ]);
        }

        if ($parsed['rows'] === []) {
            Storage::disk('local')->delete($storedPath);
            throw ValidationException::withMessages([
                'file' => 'ไม่พบแถวข้อมูลในไฟล์ STM (ต้องมีคอลัมน์ HN, PID, SEQ NO)',
            ]);
        }

        if (! $parsed['visit_date_min'] || ! $parsed['visit_date_max']) {
            Storage::disk('local')->delete($storedPath);
            throw ValidationException::withMessages([
                'file' => 'ไม่พบช่วงวันที่รับบริการในไฟล์ STM จึงกำหนดช่วงเปรียบเทียบไม่ได้',
            ]);
        }

        return DB::transaction(function () use ($parsed, $file, $storedPath, $notes) {
            $documentNo = $parsed['document_no'] ?: pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
            $existing = CgdStmBatch::query()
                ->where('document_no', $documentNo)
                ->first();

            if (! $existing) {
                $existing = CgdStmBatch::query()
                    ->where('filename', $file->getClientOriginalName())
                    ->first();
            }

            $updated = false;
            if ($existing) {
                $updated = true;
                if ($existing->stored_path && $existing->stored_path !== $storedPath) {
                    Storage::disk('local')->delete($existing->stored_path);
                }

                $existing->reconciliations()->each(function ($old) {
                    $old->items()->delete();
                    $old->delete();
                });
                $existing->rows()->delete();

                $existing->update([
                    'filename' => $file->getClientOriginalName(),
                    'stored_path' => $storedPath,
                    'document_no' => $documentNo,
                    'hcode' => $parsed['hcode'],
                    'period_label' => $parsed['period_label'],
                    'channel' => $parsed['channel'],
                    'row_count' => count($parsed['rows']),
                    'total_claim' => round(array_sum(array_column($parsed['rows'], 'amount_claim')), 2),
                    'total_approved' => round(array_sum(array_column($parsed['rows'], 'amount_approved')), 2),
                    'visit_date_min' => $parsed['visit_date_min'],
                    'visit_date_max' => $parsed['visit_date_max'],
                    'status' => 'imported',
                    'notes' => $notes ?? $existing->notes,
                    'imported_by' => Auth::id(),
                ]);

                $batch = $existing->fresh();
            } else {
                $batch = CgdStmBatch::create([
                    'filename' => $file->getClientOriginalName(),
                    'stored_path' => $storedPath,
                    'document_no' => $documentNo,
                    'hcode' => $parsed['hcode'],
                    'period_label' => $parsed['period_label'],
                    'channel' => $parsed['channel'],
                    'row_count' => count($parsed['rows']),
                    'total_claim' => round(array_sum(array_column($parsed['rows'], 'amount_claim')), 2),
                    'total_approved' => round(array_sum(array_column($parsed['rows'], 'amount_approved')), 2),
                    'visit_date_min' => $parsed['visit_date_min'],
                    'visit_date_max' => $parsed['visit_date_max'],
                    'status' => 'imported',
                    'notes' => $notes,
                    'imported_by' => Auth::id(),
                ]);
            }

            foreach (array_chunk($parsed['rows'], 200) as $chunk) {
                $now = now();
                $insert = array_map(function (array $row) use ($batch, $now) {
                    return array_merge($row, [
                        'batch_id' => $batch->id,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }, $chunk);
                CgdStmRow::insert($insert);
            }

            return [
                'batch' => $batch->fresh(),
                'updated' => $updated,
            ];
        });
    }

    /**
     * @return array{
     *   document_no:?string,
     *   hcode:?string,
     *   period_label:?string,
     *   channel:string,
     *   visit_date_min:?string,
     *   visit_date_max:?string,
     *   rows:array<int,array<string,mixed>>
     * }
     */
    public function parseFile(string $path, string $originalName = ''): array
    {
        $spreadsheet = IOFactory::load($path);
        $sheet = $spreadsheet->getSheet(0);
        $matrix = $sheet->toArray(null, true, true, false);

        $meta = $this->extractMeta($matrix, $originalName);
        $headerIndex = $this->findHeaderRow($matrix);
        if ($headerIndex === null) {
            throw new \RuntimeException('ไม่พบแถวหัวตารางที่มี HN / PID / SEQ NO');
        }

        $map = $this->mapColumns($matrix[$headerIndex], $matrix[$headerIndex + 1] ?? []);
        $rows = [];
        $minDate = null;
        $maxDate = null;

        for ($i = $headerIndex + 1; $i < count($matrix); $i++) {
            $line = $matrix[$i];
            if (! is_array($line)) {
                continue;
            }

            // Skip sub-header like ค่าห้อง/ค่ายา under พึงรับ
            $hn = $this->cell($line, $map['hn'] ?? null);
            $pid = $this->cell($line, $map['pid'] ?? null);
            $seq = $this->cell($line, $map['seq'] ?? null);
            if ($hn === '' && $pid === '' && $seq === '') {
                continue;
            }
            if ($this->looksLikeSubHeader($line)) {
                continue;
            }
            if ($hn === '' || $seq === '') {
                continue;
            }

            $visitAt = $this->parseDateTime($this->cell($line, $map['visit_at'] ?? null));
            $visitDate = $visitAt?->toDateString();
            if ($visitDate) {
                $minDate = $minDate === null || $visitDate < $minDate ? $visitDate : $minDate;
                $maxDate = $maxDate === null || $visitDate > $maxDate ? $visitDate : $maxDate;
            }

            $row = [
                'rep_no' => $this->cell($line, $map['rep'] ?? null) ?: null,
                'row_no' => (int) CgdClaimMatchKey::parseMoney($this->cell($line, $map['row_no'] ?? null)) ?: null,
                'hn' => $hn,
                'an' => $this->cell($line, $map['an'] ?? null) ?: null,
                'pid' => CgdClaimMatchKey::normalizePid($pid) ?: $pid,
                'patient_name' => $this->cell($line, $map['name'] ?? null) ?: null,
                'visit_at' => $visitAt?->format('Y-m-d H:i:s'),
                'visit_date' => $visitDate,
                'discharge_at' => $this->parseDateTime($this->cell($line, $map['discharge_at'] ?? null))?->format('Y-m-d H:i:s'),
                'projcode' => $this->cell($line, $map['projcode'] ?? null) ?: null,
                'adj_rw' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['adj_rw'] ?? null)),
                'amount_claim' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['claim'] ?? null)),
                'amount_act' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['act'] ?? null)),
                'amount_room' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['room'] ?? null)),
                'amount_organ' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['organ'] ?? null)),
                'amount_drug' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['drug'] ?? null)),
                'amount_treat' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['treat'] ?? null)),
                'amount_transport' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['transport'] ?? null)),
                'amount_wait' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['wait'] ?? null)),
                'amount_other' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['other'] ?? null)),
                'amount_approved' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['approved'] ?? null)),
                'seq_no' => CgdClaimMatchKey::normalizeSeq($seq) ?: $seq,
                'match_key' => CgdClaimMatchKey::make($hn, $pid, $seq),
            ];

            if ($row['amount_approved'] <= 0 && $row['amount_claim'] > 0) {
                // some files put approved total in last money column already mapped
            }

            $rows[] = $row;
        }

        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);

        return [
            'document_no' => $meta['document_no'],
            'hcode' => $meta['hcode'],
            'period_label' => $meta['period_label'],
            'channel' => $meta['channel'],
            'visit_date_min' => $minDate,
            'visit_date_max' => $maxDate,
            'rows' => $rows,
        ];
    }

    private function extractMeta(array $matrix, string $originalName): array
    {
        $documentNo = null;
        $hcode = null;
        $periodLabel = null;
        $channel = 'OP';

        if (preg_match('/STM_(\d+)_([A-Z]+)(\d{6})_(\d+)/i', $originalName, $m)) {
            $hcode = $m[1];
            $channel = strtoupper($m[2]);
            $periodLabel = $m[3];
            $documentNo = $m[1].'_'.$m[2].$m[3].'_'.$m[4];
        }

        foreach (array_slice($matrix, 0, 15) as $line) {
            $text = trim(implode(' ', array_map(fn ($v) => (string) $v, $line ?? [])));
            if ($documentNo === null && preg_match('/เลขที่เอกสาร\s*([A-Z0-9_]+)/u', $text, $m)) {
                $documentNo = $m[1];
            }
            if ($hcode === null && preg_match('/โรงพยาบาล\s*(\d+)/u', $text, $m)) {
                $hcode = $m[1];
            }
            if (preg_match('/_OP(\d{6})_/i', $text, $m)) {
                $channel = 'OP';
                $periodLabel = $periodLabel ?: $m[1];
            }
        }

        return [
            'document_no' => $documentNo,
            'hcode' => $hcode,
            'period_label' => $periodLabel,
            'channel' => $channel,
        ];
    }

    private function findHeaderRow(array $matrix): ?int
    {
        foreach ($matrix as $i => $line) {
            if (! is_array($line)) {
                continue;
            }
            $joined = mb_strtolower(implode('|', array_map(fn ($v) => trim((string) $v), $line)));
            $hasHn = str_contains($joined, 'hn');
            $hasPid = str_contains($joined, 'pid') || str_contains($joined, 'เลขบัตร');
            $hasSeq = str_contains($joined, 'seq') || str_contains($joined, 'seq no');
            if ($hasHn && ($hasPid || $hasSeq)) {
                return (int) $i;
            }
        }

        return null;
    }

    /**
     * @return array<string,int>
     */
    private function mapColumns(array $header, array $subHeader): array
    {
        $map = [];
        foreach ($header as $idx => $label) {
            $h = mb_strtolower(trim((string) $label));
            $s = mb_strtolower(trim((string) ($subHeader[$idx] ?? '')));
            $token = $h !== '' ? $h : $s;

            if ($token === 'rep' || str_contains($token, 'rep no')) {
                $map['rep'] = $idx;
            } elseif (str_contains($token, 'ลำดับ')) {
                $map['row_no'] = $idx;
            } elseif ($token === 'hn') {
                $map['hn'] = $idx;
            } elseif ($token === 'an') {
                $map['an'] = $idx;
            } elseif ($token === 'pid' || str_contains($token, 'บัตร')) {
                $map['pid'] = $idx;
            } elseif (str_contains($token, 'ชื่อ') || str_contains($token, 'name')) {
                $map['name'] = $idx;
            } elseif (str_contains($token, 'วันเข้ารักษา') || str_contains($token, 'admit')) {
                $map['visit_at'] = $idx;
            } elseif (str_contains($token, 'วันจำหน่าย') || str_contains($token, 'discharge')) {
                $map['discharge_at'] = $idx;
            } elseif (str_contains($token, 'proj')) {
                $map['projcode'] = $idx;
            } elseif (str_contains($token, 'adjrw') || str_contains($token, 'adj rw')) {
                $map['adj_rw'] = $idx;
            } elseif (str_contains($token, 'เรียกเก็บ') || $token === 'claim') {
                $map['claim'] = $idx;
            } elseif (str_contains($token, 'พรบ') || $token === 'act') {
                $map['act'] = $idx;
            } elseif (str_contains($token, 'พึงรับทั้งหมด') || str_contains($token, 'approved') || str_contains($token, 'total paid')) {
                $map['approved'] = $idx;
            } elseif (str_contains($token, 'seq')) {
                $map['seq'] = $idx;
            } elseif (str_contains($s, 'ค่าห้อง') || str_contains($token, 'ค่าห้อง')) {
                $map['room'] = $idx;
            } elseif (str_contains($s, 'อวัยวะ') || str_contains($token, 'อวัยวะ')) {
                $map['organ'] = $idx;
            } elseif (str_contains($s, 'ค่ายา') || $token === 'drug') {
                $map['drug'] = $idx;
            } elseif (str_contains($s, 'ค่ารักษา') || str_contains($token, 'ค่ารักษา')) {
                $map['treat'] = $idx;
            } elseif (str_contains($s, 'ค่ารถ') || str_contains($token, 'ค่ารถ')) {
                $map['transport'] = $idx;
            } elseif (str_contains($s, 'พักรอ') || str_contains($token, 'พักรอ')) {
                $map['wait'] = $idx;
            } elseif (str_contains($s, 'บริการอื่น') || str_contains($token, 'บริการอื่น')) {
                $map['other'] = $idx;
            }
        }

        // Fallback: last column often SEQ NO, second-last พึงรับทั้งหมด
        $last = count($header) - 1;
        $map['seq'] = $map['seq'] ?? $last;
        if (! isset($map['approved']) && $last >= 1) {
            $map['approved'] = $last - 1;
        }

        return $map;
    }

    private function looksLikeSubHeader(array $line): bool
    {
        $joined = implode('|', array_map(fn ($v) => trim((string) $v), $line));

        return str_contains($joined, 'ค่าห้อง') && str_contains($joined, 'ค่ายา');
    }

    private function cell(array $line, ?int $idx): string
    {
        if ($idx === null || ! array_key_exists($idx, $line)) {
            return '';
        }

        $value = $line[$idx];
        if ($value === null) {
            return '';
        }

        return trim((string) $value);
    }

    private function parseDateTime(?string $value): ?Carbon
    {
        $value = trim((string) $value);
        if ($value === '' || $value === '-') {
            return null;
        }

        if (is_numeric($value)) {
            try {
                return Carbon::instance(ExcelDate::excelToDateTimeObject((float) $value));
            } catch (\Throwable) {
                // continue
            }
        }

        // e.g. 30/06 /2026 13:22:00
        $value = preg_replace('/\s+/', ' ', $value) ?? $value;
        $value = str_replace(' /', '/', $value);

        $formats = [
            'd/m/Y H:i:s',
            'd/m/Y H:i',
            'd/m/Y',
            'Y-m-d H:i:s',
            'Y-m-d',
        ];

        foreach ($formats as $format) {
            try {
                $dt = Carbon::createFromFormat($format, $value);
                if ($dt !== false) {
                    // Buddhist year heuristic
                    if ($dt->year > 2400) {
                        $dt->subYears(543);
                    }

                    return $dt;
                }
            } catch (\Throwable) {
                // try next
            }
        }

        try {
            $dt = Carbon::parse($value);
            if ($dt->year > 2400) {
                $dt->subYears(543);
            }

            return $dt;
        } catch (\Throwable) {
            return null;
        }
    }
}
