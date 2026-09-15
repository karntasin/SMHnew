<?php

namespace App\Services\Finance;

use App\Models\Finance\StmDetailRow;
use App\Models\Finance\StmImport;
use App\Models\Finance\StmSummaryRow;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

class StmFileImportService
{
    /**
     * @return array{import: StmImport, updated: bool}
     */
    public function import(UploadedFile $file, ?string $notes = null): array
    {
        $ext = strtolower($file->getClientOriginalExtension());
        if (! in_array($ext, ['xls', 'xlsx'], true)) {
            throw ValidationException::withMessages([
                'stm_files' => 'ไฟล์ STM รองรับเฉพาะ .xls หรือ .xlsx',
            ]);
        }

        $originalName = $file->getClientOriginalName() ?: ('stm.'.$ext);
        CgdClaimFilenameGuard::assertStm($originalName);

        $storedName = 'stm_'.now()->format('Ymd_His').'_'.uniqid().'.'.$ext;
        $storedPath = $file->storeAs('finance/stm', $storedName, 'local');
        $absolute = Storage::disk('local')->path($storedPath);

        try {
            return $this->importFromAbsolutePath($absolute, $originalName, $storedPath, $notes);
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($storedPath);
            throw $e;
        }
    }

    /**
     * @return array{import: StmImport, updated: bool}
     */
    public function importFromAbsolutePath(
        string $absolutePath,
        string $originalName,
        ?string $storedPath = null,
        ?string $notes = null,
    ): array {
        if (! is_file($absolutePath)) {
            throw ValidationException::withMessages([
                'stm_files' => 'ไม่พบไฟล์ STM สำหรับนำเข้า',
            ]);
        }

        CgdClaimFilenameGuard::assertStm($originalName);

        try {
            $parsed = $this->parseWorkbook($absolutePath, $originalName);
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'stm_files' => 'อ่านไฟล์ STM ไม่สำเร็จ: '.$e->getMessage(),
            ]);
        }

        if (($parsed['claim_submission_no'] ?? '') === '') {
            throw ValidationException::withMessages([
                'stm_files' => 'ไม่พบเลขที่เอกสาร (เลขที่นำเบิก) ในไฟล์ STM',
            ]);
        }

        if ($parsed['details'] === [] && $parsed['summaries'] === []) {
            throw ValidationException::withMessages([
                'stm_files' => 'ไม่พบข้อมูลในแท็บพึงรับ / สรุป(พึงรับ)',
            ]);
        }

        return DB::transaction(function () use ($parsed, $originalName, $storedPath, $notes) {
            $existing = StmImport::query()
                ->where('claim_submission_no', $parsed['claim_submission_no'])
                ->first();

            $updated = (bool) $existing;
            if ($existing) {
                $existing->details()->delete();
                $existing->summaries()->delete();
                if ($existing->stored_path && $existing->stored_path !== $storedPath) {
                    Storage::disk('local')->delete($existing->stored_path);
                }
            }

            $import = $existing ?: new StmImport;
            $import->fill([
                'claim_submission_no' => $parsed['claim_submission_no'],
                'filename' => $originalName,
                'stored_path' => $storedPath,
                'hcode' => $parsed['hcode'],
                'hospital_name' => $parsed['hospital_name'],
                'province' => $parsed['province'],
                'channel' => $parsed['channel'],
                'period_label' => $parsed['period_label'],
                'reported_at' => $parsed['reported_at'],
                'detail_count' => count($parsed['details']),
                'summary_count' => count($parsed['summaries']),
                'rep_count' => count($parsed['rep_nos']),
                'total_claim' => round((float) collect($parsed['details'])->sum('amount_claim'), 2),
                'total_approved' => round((float) collect($parsed['details'])->sum('amount_approved'), 2),
                'visit_date_min' => $parsed['visit_date_min'],
                'visit_date_max' => $parsed['visit_date_max'],
                'sheet_names' => $parsed['sheet_names'],
                'notes' => $notes,
                'imported_by' => Auth::id(),
            ]);
            $import->save();

            $now = now();
            foreach (array_chunk($parsed['details'], 300) as $chunk) {
                StmDetailRow::insert(array_map(function (array $row) use ($import, $now) {
                    return array_merge($row, [
                        'import_id' => $import->id,
                        'claim_submission_no' => $import->claim_submission_no,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }, $chunk));
            }

            foreach (array_chunk($parsed['summaries'], 100) as $chunk) {
                StmSummaryRow::insert(array_map(function (array $row) use ($import, $now) {
                    return array_merge($row, [
                        'import_id' => $import->id,
                        'claim_submission_no' => $import->claim_submission_no,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }, $chunk));
            }

            $import = $import->fresh(['importer']);
            // ยอดขาดอุทธรณ์จาก STM อย่างเดียว (ไม่พึ่ง HOSxP)
            app(CgdAppealService::class)->ensureEligibleFromStmImport($import);

            return [
                'import' => $import,
                'updated' => $updated,
            ];
        });
    }

    /**
     * @return array<string,mixed>
     */
    public function parseWorkbook(string $path, string $originalName = ''): array
    {
        $spreadsheet = IOFactory::load($path);

        try {
            $sheetNames = [];
            $details = [];
            $summaries = [];
            $meta = [
                'claim_submission_no' => null,
                'hcode' => null,
                'hospital_name' => null,
                'province' => null,
                'channel' => null,
                'period_label' => null,
                'reported_at' => null,
            ];

            foreach ($spreadsheet->getAllSheets() as $sheet) {
                $title = trim($sheet->getTitle());
                $sheetNames[] = $title;
                $matrix = $sheet->toArray(null, true, true, false);
                $lower = mb_strtolower($title);

                $meta = $this->mergeMeta($meta, $this->extractMeta($matrix, $originalName));

                if (str_contains($lower, 'สรุป')) {
                    $summaries = array_merge($summaries, $this->parseSummarySheet($matrix, $title));
                    continue;
                }

                // แท็บพึงรับ / รายละเอียด (และแท็บอื่นที่โครงสร้างคล้ายกัน)
                if (
                    str_contains($lower, 'พึงรับ')
                    || str_contains($lower, 'stm')
                    || $this->matrixLooksLikeDetail($matrix)
                ) {
                    $parsed = $this->parseDetailSheet($matrix, $title);
                    $details = array_merge($details, $parsed['rows']);
                    $meta = $this->mergeMeta($meta, $parsed['meta']);
                }
            }

            // ถ้าชื่อแท็บไม่ตรง แต่มีแค่ 1–2 ชีต ให้ลอง parse ชีตที่ไม่ใช่สรุปเป็น detail
            if ($details === []) {
                foreach ($spreadsheet->getAllSheets() as $sheet) {
                    $title = trim($sheet->getTitle());
                    if (str_contains(mb_strtolower($title), 'สรุป')) {
                        continue;
                    }
                    $matrix = $sheet->toArray(null, true, true, false);
                    if ($this->matrixLooksLikeDetail($matrix)) {
                        $parsed = $this->parseDetailSheet($matrix, $title);
                        $details = array_merge($details, $parsed['rows']);
                        $meta = $this->mergeMeta($meta, $parsed['meta']);
                    }
                }
            }

            $visitDates = collect($details)->pluck('visit_date')->filter()->sort()->values();
            $repNos = collect($details)->pluck('rep_no')
                ->merge(collect($summaries)->pluck('rep_no'))
                ->filter()
                ->unique()
                ->values()
                ->all();

            if (($meta['claim_submission_no'] ?? null) === null && preg_match('/STM[_-]?(\d+_[A-Z]+\d+_\d+)/i', $originalName, $m)) {
                $meta['claim_submission_no'] = $m[1];
            }

            return [
                'claim_submission_no' => $meta['claim_submission_no'],
                'hcode' => $meta['hcode'],
                'hospital_name' => $meta['hospital_name'],
                'province' => $meta['province'],
                'channel' => $meta['channel'] ?: 'OP',
                'period_label' => $meta['period_label'],
                'reported_at' => $meta['reported_at'],
                'sheet_names' => $sheetNames,
                'details' => $details,
                'summaries' => $summaries,
                'rep_nos' => $repNos,
                'visit_date_min' => $visitDates->first(),
                'visit_date_max' => $visitDates->last(),
            ];
        } finally {
            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet);
        }
    }

    /**
     * @param  array<int,array<int,mixed>>  $matrix
     * @return array{rows:list<array<string,mixed>>,meta:array<string,mixed>}
     */
    private function parseDetailSheet(array $matrix, string $sheetName): array
    {
        $meta = $this->extractMeta($matrix, '');
        $rows = [];
        $map = null;
        $currentRep = null;

        for ($i = 0; $i < count($matrix); $i++) {
            $line = $matrix[$i] ?? [];
            if (! is_array($line)) {
                continue;
            }

            $joined = trim(implode(' ', array_map(fn ($v) => (string) $v, $line)));
            if (preg_match('/REP\s*NO\s*:?\s*([0-9A-Z\-]+)/iu', $joined, $m)) {
                $currentRep = trim($m[1]);
                continue;
            }

            if ($this->isDetailHeaderRow($line)) {
                $map = $this->mapDetailColumns($line, $matrix[$i + 1] ?? []);
                continue;
            }

            if ($map === null) {
                continue;
            }

            if ($this->looksLikeSubHeader($line)) {
                continue;
            }

            $hn = $this->cell($line, $map['hn'] ?? null);
            if ($hn === '') {
                continue;
            }

            $pid = $this->cell($line, $map['pid'] ?? null);
            $rep = $this->cell($line, $map['rep'] ?? null) ?: $currentRep;
            $visitAt = $this->parseDateTime($this->cell($line, $map['visit_at'] ?? null));
            $seq = $this->cell($line, $map['seq'] ?? null);
            if ($seq === '' && $visitAt) {
                $seq = $this->seqFromVisitAt($visitAt) ?: '';
            }
            if ($seq === '') {
                continue;
            }

            $rows[] = [
                'sheet_name' => $sheetName,
                'rep_no' => $rep !== '' ? $rep : null,
                'row_no' => (int) ($this->parseMoney($this->cell($line, $map['row_no'] ?? null)) ?? 0) ?: null,
                'hn' => $hn,
                'an' => $this->normalizeDash($this->cell($line, $map['an'] ?? null)),
                'pid' => CgdClaimMatchKey::normalizePid($pid) ?: ($pid !== '' ? $pid : null),
                'patient_name' => $this->normalizeDash($this->cell($line, $map['name'] ?? null)),
                'visit_at' => $visitAt?->format('Y-m-d H:i:s'),
                'visit_date' => $visitAt?->toDateString(),
                'discharge_at' => $this->parseDateTime($this->cell($line, $map['discharge_at'] ?? null))?->format('Y-m-d H:i:s'),
                'projcode' => $this->normalizeDash($this->cell($line, $map['projcode'] ?? null)),
                'adj_rw' => $this->parseMoney($this->cell($line, $map['adj_rw'] ?? null)),
                'amount_claim' => $this->parseMoney($this->cell($line, $map['claim'] ?? null)) ?? 0,
                'amount_act' => $this->parseMoney($this->cell($line, $map['act'] ?? null)) ?? 0,
                'amount_room' => $this->parseMoney($this->cell($line, $map['room'] ?? null)) ?? 0,
                'amount_organ' => $this->parseMoney($this->cell($line, $map['organ'] ?? null)) ?? 0,
                'amount_drug' => $this->parseMoney($this->cell($line, $map['drug'] ?? null)) ?? 0,
                'amount_treat' => $this->parseMoney($this->cell($line, $map['treat'] ?? null)) ?? 0,
                'amount_transport' => $this->parseMoney($this->cell($line, $map['transport'] ?? null)) ?? 0,
                'amount_wait' => $this->parseMoney($this->cell($line, $map['wait'] ?? null)) ?? 0,
                'amount_other' => $this->parseMoney($this->cell($line, $map['other'] ?? null)) ?? 0,
                'amount_approved' => $this->parseMoney($this->cell($line, $map['approved'] ?? null)) ?? 0,
                'seq_no' => CgdClaimMatchKey::normalizeSeq($seq) ?: $seq,
                'match_key' => CgdClaimMatchKey::make($hn, $pid, $seq),
            ];
        }

        return ['rows' => $rows, 'meta' => $meta];
    }

    /**
     * @param  array<int,array<int,mixed>>  $matrix
     * @return list<array<string,mixed>>
     */
    private function parseSummarySheet(array $matrix, string $sheetName): array
    {
        $rows = [];
        $start = null;
        foreach ($matrix as $i => $line) {
            $joined = mb_strtolower(implode('|', array_map(fn ($v) => trim((string) $v), $line ?? [])));
            if (str_contains($joined, 'hcode') && str_contains($joined, 'rep')) {
                $start = $i + 3; // ข้ามแถวหัว 2 ชั้น
                break;
            }
        }
        if ($start === null) {
            $start = 3;
        }

        for ($i = $start; $i < count($matrix); $i++) {
            $line = $matrix[$i] ?? [];
            $rep = trim((string) ($line[2] ?? ''));
            $hcode = trim((string) ($line[1] ?? ''));
            if ($rep === '' || ! preg_match('/^\d+$/', $rep)) {
                continue;
            }

            $rows[] = [
                'sheet_name' => $sheetName,
                'period' => $this->normalizeDash(trim((string) ($line[0] ?? ''))),
                'hcode' => $hcode !== '' ? $hcode : null,
                'rep_no' => $rep,
                'count_total' => (int) ($this->parseMoney($line[3] ?? null) ?? 0),
                'count_pass' => (int) ($this->parseMoney($line[4] ?? null) ?? 0),
                'count_fail' => (int) ($this->parseMoney($line[5] ?? null) ?? 0),
                'amount_claim' => $this->parseMoney($line[6] ?? null) ?? 0,
                'amount_act' => $this->parseMoney($line[7] ?? null) ?? 0,
                'amount_room' => $this->parseMoney($line[8] ?? null) ?? 0,
                'amount_organ' => $this->parseMoney($line[9] ?? null) ?? 0,
                'amount_drug' => $this->parseMoney($line[10] ?? null) ?? 0,
                'amount_treat' => $this->parseMoney($line[11] ?? null) ?? 0,
                'amount_transport' => $this->parseMoney($line[12] ?? null) ?? 0,
                'amount_wait' => $this->parseMoney($line[13] ?? null) ?? 0,
                'amount_other' => $this->parseMoney($line[14] ?? null) ?? 0,
                'amount_paid_total' => $this->parseMoney($line[15] ?? null) ?? 0,
            ];
        }

        return $rows;
    }

    /**
     * @param  array<int,array<int,mixed>>  $matrix
     * @return array<string,mixed>
     */
    private function extractMeta(array $matrix, string $originalName): array
    {
        $meta = [
            'claim_submission_no' => null,
            'hcode' => null,
            'hospital_name' => null,
            'province' => null,
            'channel' => null,
            'period_label' => null,
            'reported_at' => null,
        ];

        foreach (array_slice($matrix, 0, 20) as $line) {
            $text = trim(implode(' ', array_map(fn ($v) => (string) $v, $line ?? [])));
            if ($text === '') {
                continue;
            }

            if ($meta['claim_submission_no'] === null && preg_match('/เลขที่เอกสาร\s*([A-Z0-9_]+)/u', $text, $m)) {
                $meta['claim_submission_no'] = $m[1];
            }
            if ($meta['hcode'] === null && preg_match('/โรงพยาบาล\s*(\d+)\s*(.*)$/u', $text, $m)) {
                $meta['hcode'] = $m[1];
                $meta['hospital_name'] = trim($m[2]) ?: null;
            }
            if ($meta['province'] === null && preg_match('/จังหวัด\s*(.+)$/u', $text, $m)) {
                $meta['province'] = trim($m[1]) ?: null;
            }
            if ($meta['reported_at'] === null && preg_match('/ออกรายงานวันที่\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*เวลา\s*(\d{1,2}:\d{2})/u', $text, $m)) {
                $meta['reported_at'] = $this->parseThaiReportDate($m[1], $m[2]);
            }
            if (preg_match('/_OP(\d{6})_/i', $text.' '.$originalName, $m)) {
                $meta['channel'] = 'OP';
                $meta['period_label'] = $meta['period_label'] ?: $m[1];
            } elseif (preg_match('/_IP(\d{6})_/i', $text.' '.$originalName, $m)) {
                $meta['channel'] = 'IP';
                $meta['period_label'] = $meta['period_label'] ?: $m[1];
            }
        }

        if ($meta['claim_submission_no'] === null && preg_match('/(\d{5}_[A-Z]{2}\d{6}_\d{2})/i', $originalName, $m)) {
            $meta['claim_submission_no'] = $m[1];
        }

        return $meta;
    }

    /**
     * @param  array<string,mixed>  $base
     * @param  array<string,mixed>  $extra
     * @return array<string,mixed>
     */
    private function mergeMeta(array $base, array $extra): array
    {
        foreach ($extra as $key => $value) {
            if (($base[$key] ?? null) === null && $value !== null && $value !== '') {
                $base[$key] = $value;
            }
        }

        return $base;
    }

    /**
     * @param  array<int,array<int,mixed>>  $matrix
     */
    private function matrixLooksLikeDetail(array $matrix): bool
    {
        foreach (array_slice($matrix, 0, 30) as $line) {
            if ($this->isDetailHeaderRow($line ?? [])) {
                return true;
            }
        }

        return false;
    }

    private function isDetailHeaderRow(array $line): bool
    {
        $joined = mb_strtolower(implode('|', array_map(fn ($v) => trim((string) $v), $line)));

        return (bool) (preg_match('/(^|\|)hn(\||$)/', $joined) && str_contains($joined, 'seq'));
    }

    /**
     * @return array<string,int>
     */
    private function mapDetailColumns(array $header, array $subHeader): array
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
            } elseif (str_contains($token, 'พึงรับทั้งหมด') || str_contains($token, 'approved')) {
                $map['approved'] = $idx;
            } elseif (str_contains($token, 'seq')) {
                $map['seq'] = $idx;
            }
        }

        foreach ($subHeader as $idx => $label) {
            $s = mb_strtolower(trim((string) $label));
            if (str_contains($s, 'ค่าห้อง') && ! isset($map['room'])) {
                $map['room'] = $idx;
            } elseif ((str_contains($s, 'อวัยวะ') || str_contains($s, 'inst')) && ! isset($map['organ'])) {
                $map['organ'] = $idx;
            } elseif (str_contains($s, 'ค่ายา') && ! isset($map['drug'])) {
                $map['drug'] = $idx;
            } elseif (str_contains($s, 'ค่ารักษา') && ! isset($map['treat'])) {
                $map['treat'] = $idx;
            } elseif (str_contains($s, 'ค่ารถ') && ! isset($map['transport'])) {
                $map['transport'] = $idx;
            } elseif (str_contains($s, 'พักรอ') && ! isset($map['wait'])) {
                $map['wait'] = $idx;
            } elseif ((str_contains($s, 'บริการอื่น') || str_contains($s, 'อื่นๆ')) && ! isset($map['other'])) {
                $map['other'] = $idx;
            }
        }

        return $map;
    }

    private function looksLikeSubHeader(array $line): bool
    {
        $joined = mb_strtolower(implode('|', array_map(fn ($v) => trim((string) $v), $line)));

        return str_contains($joined, 'ค่าห้อง')
            || str_contains($joined, 'ค่ายา')
            || str_contains($joined, 'ค่ารักษา');
    }

    private function cell(array $line, ?int $idx): string
    {
        if ($idx === null || ! array_key_exists($idx, $line)) {
            return '';
        }

        return trim((string) $line[$idx]);
    }

    private function normalizeDash(?string $value): ?string
    {
        $value = trim((string) $value);
        if ($value === '' || $value === '-') {
            return null;
        }

        return $value;
    }

    private function parseMoney(mixed $value): ?float
    {
        return CgdClaimMatchKey::parseMoney($value);
    }

    /**
     * สร้าง SEQ แบบ HOSxP จากวัน-เวลารักษา เมื่อไฟล์ STM ไม่มีคอลัมน์ SEQ
     * ตัวอย่าง 2025-11-15 10:56:00 → 681115105600
     */
    private function seqFromVisitAt(Carbon $visitAt): ?string
    {
        $beYear = $visitAt->year + 543;
        $raw = sprintf('%04d%s', $beYear, $visitAt->format('mdHis'));
        $seq = strlen($raw) > 2 ? substr($raw, 2) : $raw;

        return $seq !== '' ? $seq : null;
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
                // fall through
            }
        }

        $value = preg_replace('/\s+/', ' ', $value) ?? $value;
        $value = str_replace(' /', '/', $value);

        foreach (['d/m/Y H:i:s', 'd/m/Y H:i', 'Y-m-d H:i:s', 'Y-m-d'] as $fmt) {
            try {
                $dt = Carbon::createFromFormat($fmt, $value);
                if ($dt !== false) {
                    return $dt;
                }
            } catch (\Throwable) {
                // try next
            }
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }

    private function parseThaiReportDate(string $date, string $time): ?string
    {
        if (! preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $date, $m)) {
            return null;
        }
        $year = (int) $m[3];
        if ($year > 2400) {
            $year -= 543;
        }

        try {
            return Carbon::createFromFormat('Y-m-d H:i', sprintf('%04d-%02d-%02d %s', $year, (int) $m[2], (int) $m[1], $time))
                ?->format('Y-m-d H:i:s');
        } catch (\Throwable) {
            return null;
        }
    }
}
