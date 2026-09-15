<?php

namespace App\Services\Finance;

use App\Models\Finance\CgdStmBatch;
use App\Models\Finance\CgdStmRow;
use App\Models\Finance\CgdZeroFundRow;
use App\Support\Finance\ClaimScheme;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

class CgdStmImportService
{
    /**
     * @return array{batch: CgdStmBatch, updated: bool}
     */
    public function import(UploadedFile $file, ?string $notes = null, string $scheme = ClaimScheme::CGD): array
    {
        $ext = strtolower($file->getClientOriginalExtension());
        if (! in_array($ext, ['xls', 'xlsx', 'csv'], true)) {
            throw ValidationException::withMessages([
                'files' => 'รองรับเฉพาะไฟล์ .xls .xlsx หรือ .csv จากระบบ e-Claim (REP / Invoice)',
            ]);
        }

        $originalName = $file->getClientOriginalName() ?: ('rep.'.$ext);
        // ล็อกตาม scheme ที่เรียก (CGD / LGO) — ไม่สลับจากชื่อไฟล์
        CgdClaimFilenameGuard::assertRep($originalName, 'files', $scheme);

        $dir = ClaimScheme::storageDir($scheme);
        $storedName = 'rep_'.now()->format('Ymd_His').'_'.uniqid().'.'.$ext;
        $storedPath = $file->storeAs($dir, $storedName, 'local');
        $absolute = Storage::disk('local')->path($storedPath);

        try {
            return $this->importFromAbsolutePath($absolute, $originalName, $storedPath, $notes, $scheme);
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($storedPath);
            throw $e;
        }
    }

    /**
     * นำเข้าจากไฟล์บนดิสก์ (ดาวน์โหลดจาก NHSO หรืออัปโหลด) · upsert ตามเลขเอกสาร/ชื่อไฟล์
     *
     * @return array{batch: CgdStmBatch, updated: bool}
     */
    public function importFromAbsolutePath(
        string $absolutePath,
        string $originalName,
        ?string $storedPath = null,
        ?string $notes = null,
        string $scheme = ClaimScheme::CGD,
    ): array {
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION) ?: pathinfo($absolutePath, PATHINFO_EXTENSION));
        if (! in_array($ext, ['xls', 'xlsx', 'csv'], true)) {
            throw ValidationException::withMessages([
                'files' => 'รองรับเฉพาะไฟล์ .xls .xlsx หรือ .csv จากระบบ e-Claim (REP / Invoice)',
            ]);
        }

        if (! is_file($absolutePath)) {
            throw ValidationException::withMessages([
                'files' => 'ไม่พบไฟล์สำหรับนำเข้า',
            ]);
        }

        CgdClaimFilenameGuard::assertRep($originalName, 'files', $scheme);

        $dir = ClaimScheme::storageDir($scheme);
        if ($storedPath === null) {
            $storedName = 'rep_'.now()->format('Ymd_His').'_'.uniqid().'.'.$ext;
            $storedPath = $dir.'/'.$storedName;
            Storage::disk('local')->makeDirectory($dir);
            if (! @copy($absolutePath, Storage::disk('local')->path($storedPath))) {
                throw ValidationException::withMessages([
                    'files' => 'คัดลอกไฟล์เข้า storage ไม่สำเร็จ',
                ]);
            }
            $absolutePath = Storage::disk('local')->path($storedPath);
        }

        try {
            $parsed = $this->parseFile($absolutePath, $originalName);
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'files' => 'อ่านไฟล์ e-Claim ไม่สำเร็จ: '.$e->getMessage(),
            ]);
        }

        if ($parsed['rows'] === []) {
            throw ValidationException::withMessages([
                'files' => 'ไม่พบแถวข้อมูลในแท็บ Detail / REP (ต้องมีคอลัมน์ HN และ SEQ NO)',
            ]);
        }

        if (! $parsed['visit_date_min'] || ! $parsed['visit_date_max']) {
            throw ValidationException::withMessages([
                'files' => 'ไม่พบช่วงวันที่รับบริการในไฟล์ จึงกำหนดช่วงเปรียบเทียบไม่ได้',
            ]);
        }

        return DB::transaction(function () use ($parsed, $originalName, $storedPath, $notes, $scheme) {
            $documentNo = $parsed['document_no'] ?: pathinfo($originalName, PATHINFO_FILENAME);
            $fileKind = CgdAppealService::detectFileKind($originalName);
            $parentHint = $fileKind === 'appeal'
                ? preg_replace('/_APPEAL/i', '', pathinfo($originalName, PATHINFO_FILENAME))
                : null;

            $existing = CgdStmBatch::query()
                ->where('scheme', $scheme)
                ->where('document_no', $documentNo)
                ->first();

            if (! $existing) {
                $existing = CgdStmBatch::query()
                    ->where('scheme', $scheme)
                    ->where('filename', $originalName)
                    ->first();
            }

            $errorRowCount = collect($parsed['rows'])
                ->filter(fn (array $row) => filled($row['error_code'] ?? null))
                ->count();
            $zeroFundCount = count($parsed['zero_fund_rows']);

            $payload = [
                'filename' => $originalName,
                'stored_path' => $storedPath,
                'document_no' => $documentNo,
                'hcode' => $parsed['hcode'],
                'period_label' => $parsed['period_label'],
                'channel' => $parsed['channel'],
                'source_format' => $parsed['source_format'],
                'file_kind' => $fileKind,
                'scheme' => $scheme,
                'parent_document_hint' => $parentHint,
                'row_count' => count($parsed['rows']),
                'error_row_count' => $errorRowCount,
                'zero_fund_count' => $zeroFundCount,
                'total_claim' => round(array_sum(array_column($parsed['rows'], 'amount_claim')), 2),
                'total_approved' => round(array_sum(array_column($parsed['rows'], 'amount_approved')), 2),
                'visit_date_min' => $parsed['visit_date_min'],
                'visit_date_max' => $parsed['visit_date_max'],
                'status' => 'imported',
                'imported_by' => Auth::id(),
            ];

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
                $existing->zeroFundRows()->delete();

                $existing->update(array_merge($payload, [
                    'notes' => $notes ?? $existing->notes,
                ]));

                $batch = $existing->fresh();
            } else {
                $batch = CgdStmBatch::create(array_merge($payload, [
                    'notes' => $notes,
                ]));
            }

            foreach (array_chunk($parsed['rows'], 200) as $chunk) {
                $now = now();
                CgdStmRow::insert(array_map(function (array $row) use ($batch, $now) {
                    return array_merge($row, [
                        'batch_id' => $batch->id,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }, $chunk));
            }

            if (! empty($parsed['zero_fund_rows'])) {
                foreach (array_chunk($parsed['zero_fund_rows'], 200) as $chunk) {
                    $now = now();
                    CgdZeroFundRow::insert(array_map(function (array $row) use ($batch, $now) {
                        return array_merge($row, [
                            'batch_id' => $batch->id,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                    }, $chunk));
                }
            }

            $batch = $batch->fresh();
            if (($batch->file_kind ?? 'rep') === 'appeal') {
                app(CgdAppealService::class)->syncFromAppealBatch($batch);
            } else {
                app(CgdErrorCaseService::class)->syncFromRepBatch($batch);
                if (ClaimScheme::seedAppealsFromRep($scheme)) {
                    app(CgdAppealService::class)->ensureEligibleFromRepBatch($batch);
                }
            }

            return [
                'batch' => $batch,
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
     *   source_format:string,
     *   visit_date_min:?string,
     *   visit_date_max:?string,
     *   rows:array<int,array<string,mixed>>,
     *   zero_fund_rows:array<int,array<string,mixed>>
     * }
     */
    public function parseFile(string $path, string $originalName = ''): array
    {
        $spreadsheet = IOFactory::load($path);

        try {
            if ($this->isEclaimWorkbook($spreadsheet, $originalName)) {
                return $this->parseEclaimWorkbook($spreadsheet, $originalName);
            }

            return $this->parseStmWorkbook($spreadsheet, $originalName);
        } finally {
            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet);
        }
    }

    private function isEclaimWorkbook(Spreadsheet $spreadsheet, string $originalName): bool
    {
        if (preg_match('/^eclaim_/i', $originalName)) {
            return true;
        }

        foreach ($spreadsheet->getAllSheets() as $sheet) {
            $title = mb_strtolower(trim($sheet->getTitle()));
            if ($title === 'detail' || str_contains($title, 'data sheet')) {
                return true;
            }
        }

        $first = $spreadsheet->getSheet(0)->toArray(null, true, true, false);
        foreach (array_slice($first, 0, 12) as $line) {
            $joined = mb_strtolower(implode('|', array_map(fn ($v) => trim((string) $v), $line ?? [])));
            if (str_contains($joined, 'error code') && (str_contains($joined, 'ชดเชยสุทธิ') || str_contains($joined, 'กองทุน'))) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array<string,mixed>
     */
    private function parseEclaimWorkbook(Spreadsheet $spreadsheet, string $originalName): array
    {
        $detail = $spreadsheet->getSheetByName('Detail') ?? $spreadsheet->getSheet(0);
        $matrix = $detail->toArray(null, true, true, false);
        $meta = $this->extractEclaimMeta($matrix, $originalName);

        $headerIndex = $this->findHeaderRow($matrix);
        if ($headerIndex === null) {
            throw new \RuntimeException('ไม่พบแถวหัวตารางในแท็บ Detail (ต้องมี HN / PID / SEQ NO)');
        }

        $map = $this->mapEclaimDetailColumns($matrix[$headerIndex], $matrix[$headerIndex + 1] ?? []);
        $rows = [];
        $minDate = null;
        $maxDate = null;

        for ($i = $headerIndex + 1; $i < count($matrix); $i++) {
            $line = $matrix[$i];
            if (! is_array($line)) {
                continue;
            }

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

            $errorCode = $this->normalizeErrorCode($this->cell($line, $map['error_code'] ?? null));
            $fundCodes = $this->normalizeDash($this->cell($line, $map['fund'] ?? null));

            // ชดเชยสุทธิ = ยอดที่กองทุนจ่ายจริง (เทียบกับ HOSxP หลังหัก Payment)
            $approved = CgdClaimMatchKey::parseMoney($this->cell($line, $map['approved'] ?? null));
            if ($approved === null) {
                $approved = CgdClaimMatchKey::parseMoney($this->cell($line, $map['billable'] ?? null)) ?? 0;
            }

            $rows[] = [
                'rep_no' => $this->normalizeDash($this->cell($line, $map['rep'] ?? null)),
                'tran_id' => $this->normalizeDash($this->cell($line, $map['tran_id'] ?? null)),
                'row_no' => (int) CgdClaimMatchKey::parseMoney($this->cell($line, $map['row_no'] ?? null)) ?: null,
                'hn' => $hn,
                'an' => $this->normalizeDash($this->cell($line, $map['an'] ?? null)),
                'pid' => CgdClaimMatchKey::normalizePid($pid) ?: $pid,
                'patient_name' => $this->normalizeDash($this->cell($line, $map['name'] ?? null)),
                'visit_at' => $visitAt?->format('Y-m-d H:i:s'),
                'visit_date' => $visitDate,
                'discharge_at' => $this->parseDateTime($this->cell($line, $map['discharge_at'] ?? null))?->format('Y-m-d H:i:s'),
                'projcode' => $this->normalizeDash($this->cell($line, $map['projcode'] ?? null)),
                'adj_rw' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['adj_rw'] ?? null)),
                'amount_claim' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['claim'] ?? null)) ?? 0,
                'amount_billable' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['billable'] ?? null)),
                'amount_not_billable' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['not_billable'] ?? null)),
                'amount_self_pay' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['self_pay'] ?? null)),
                'amount_act' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['act'] ?? null)) ?? 0,
                'amount_room' => 0,
                'amount_organ' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['organ'] ?? null)) ?? 0,
                'amount_drug' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['drug'] ?? null)) ?? 0,
                'amount_treat' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['treat'] ?? null)) ?? 0,
                'amount_transport' => 0,
                'amount_wait' => 0,
                'amount_other' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['other'] ?? null)) ?? 0,
                'amount_approved' => $approved ?? 0,
                'seq_no' => CgdClaimMatchKey::normalizeSeq($seq) ?: $seq,
                'error_code' => $errorCode,
                'fund_codes' => $fundCodes,
                'match_key' => CgdClaimMatchKey::make($hn, $pid, $seq),
                'remark' => null,
            ];
        }

        $zeroFundRows = $this->parseZeroFundSheets($spreadsheet);

        return [
            'document_no' => $meta['document_no'],
            'hcode' => $meta['hcode'],
            'period_label' => $meta['period_label'],
            'channel' => $meta['channel'],
            'source_format' => 'eclaim',
            'visit_date_min' => $minDate,
            'visit_date_max' => $maxDate,
            'rows' => $rows,
            'zero_fund_rows' => $zeroFundRows,
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function parseStmWorkbook(Spreadsheet $spreadsheet, string $originalName): array
    {
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

            $rows[] = [
                'rep_no' => $this->cell($line, $map['rep'] ?? null) ?: null,
                'tran_id' => null,
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
                'amount_claim' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['claim'] ?? null)) ?? 0,
                'amount_billable' => null,
                'amount_not_billable' => null,
                'amount_self_pay' => null,
                'amount_act' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['act'] ?? null)) ?? 0,
                'amount_room' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['room'] ?? null)) ?? 0,
                'amount_organ' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['organ'] ?? null)) ?? 0,
                'amount_drug' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['drug'] ?? null)) ?? 0,
                'amount_treat' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['treat'] ?? null)) ?? 0,
                'amount_transport' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['transport'] ?? null)) ?? 0,
                'amount_wait' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['wait'] ?? null)) ?? 0,
                'amount_other' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['other'] ?? null)) ?? 0,
                'amount_approved' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['approved'] ?? null)) ?? 0,
                'seq_no' => CgdClaimMatchKey::normalizeSeq($seq) ?: $seq,
                'error_code' => null,
                'fund_codes' => null,
                'match_key' => CgdClaimMatchKey::make($hn, $pid, $seq),
                'remark' => null,
            ];
        }

        return [
            'document_no' => $meta['document_no'],
            'hcode' => $meta['hcode'],
            'period_label' => $meta['period_label'],
            'channel' => $meta['channel'],
            'source_format' => 'stm',
            'visit_date_min' => $minDate,
            'visit_date_max' => $maxDate,
            'rows' => $rows,
            'zero_fund_rows' => [],
        ];
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function parseZeroFundSheets(Spreadsheet $spreadsheet): array
    {
        $rows = [];

        foreach ($spreadsheet->getAllSheets() as $sheet) {
            $title = trim($sheet->getTitle());
            $matrix = $sheet->toArray(null, true, true, false);
            $isZeroSheet = str_contains(mb_strtolower($title), 'data sheet')
                || $this->matrixContains($matrix, 'รายงานข้อมูลกองทุน จ่าย 0')
                || $this->matrixContains($matrix, 'จ่าย 0 บาท');

            if (! $isZeroSheet) {
                continue;
            }

            $headerIndex = null;
            foreach ($matrix as $i => $line) {
                $joined = mb_strtolower(implode('|', array_map(fn ($v) => trim((string) $v), $line ?? [])));
                if (str_contains($joined, 'tran_id') && str_contains($joined, 'hn') && (str_contains($joined, 'เหตุผล') || str_contains($joined, 'เงินที่จ่าย'))) {
                    $headerIndex = (int) $i;
                    break;
                }
            }
            if ($headerIndex === null) {
                continue;
            }

            $map = $this->mapZeroFundColumns($matrix[$headerIndex]);
            for ($i = $headerIndex + 1; $i < count($matrix); $i++) {
                $line = $matrix[$i];
                if (! is_array($line)) {
                    continue;
                }
                $hn = $this->cell($line, $map['hn'] ?? null);
                $pid = $this->cell($line, $map['pid'] ?? null);
                $remark = $this->cell($line, $map['remark'] ?? null);
                if ($hn === '' && $pid === '' && $remark === '') {
                    continue;
                }
                if ($hn === '' && $pid === '') {
                    continue;
                }

                $visitAt = $this->parseDateTime($this->cell($line, $map['visit_at'] ?? null));

                $rows[] = [
                    'row_no' => (int) CgdClaimMatchKey::parseMoney($this->cell($line, $map['row_no'] ?? null)) ?: null,
                    'tran_id' => $this->normalizeDash($this->cell($line, $map['tran_id'] ?? null)),
                    'hcode' => $this->normalizeDash($this->cell($line, $map['hcode'] ?? null)),
                    'hn' => $hn ?: null,
                    'an' => $this->normalizeDash($this->cell($line, $map['an'] ?? null)),
                    'visit_date' => $visitAt?->toDateString(),
                    'pid' => CgdClaimMatchKey::normalizePid($pid) ?: ($pid ?: null),
                    'patient_name' => $this->normalizeDash($this->cell($line, $map['name'] ?? null)),
                    'fund_code' => $this->normalizeDash($this->cell($line, $map['fund'] ?? null)),
                    'claim_code' => $this->normalizeDash($this->cell($line, $map['claim_code'] ?? null)),
                    'tmt' => $this->normalizeDash($this->cell($line, $map['tmt'] ?? null)),
                    'expense_category' => $this->normalizeDash($this->cell($line, $map['expense_category'] ?? null)),
                    'qty_requested' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['qty_requested'] ?? null)),
                    'qty_paid' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['qty_paid'] ?? null)),
                    'amount_paid' => CgdClaimMatchKey::parseMoney($this->cell($line, $map['amount_paid'] ?? null)) ?? 0,
                    'remark' => $remark !== '' ? $remark : null,
                ];
            }
        }

        return $rows;
    }

    /**
     * @return array<string,int>
     */
    private function mapEclaimDetailColumns(array $header, array $subHeader): array
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
            } elseif (str_contains($token, 'tran')) {
                $map['tran_id'] = $idx;
            } elseif ($token === 'hn') {
                $map['hn'] = $idx;
            } elseif ($token === 'an') {
                $map['an'] = $idx;
            } elseif ($token === 'pid' || str_contains($token, 'บัตร')) {
                $map['pid'] = $idx;
            } elseif ($this->isPatientNameHeader($token) && ! isset($map['name'])) {
                $map['name'] = $idx;
            } elseif (str_contains($token, 'วันเข้ารักษา') || str_contains($token, 'admit')) {
                $map['visit_at'] = $idx;
            } elseif (str_contains($token, 'วันจำหน่าย') || str_contains($token, 'discharge')) {
                $map['discharge_at'] = $idx;
            } elseif (str_contains($token, 'ชดเชยสุทธิ')) {
                $map['approved'] = $idx;
            } elseif (str_contains($token, 'error')) {
                $map['error_code'] = $idx;
            } elseif ($token === 'กองทุน' || str_contains($token, 'fund')) {
                $map['fund'] = $idx;
            } elseif (str_contains($token, 'proj')) {
                $map['projcode'] = $idx;
            } elseif (str_contains($token, 'adjrw') || str_contains($token, 'adj rw')) {
                $map['adj_rw'] = $idx;
            } elseif (str_contains($token, 'เรียกเก็บ') || $token === 'claim') {
                $map['claim'] = $idx;
            } elseif (str_contains($token, 'เบิกได้')) {
                $map['billable'] = $idx;
            } elseif (str_contains($token, 'เบิกไม่ได้')) {
                $map['not_billable'] = $idx;
            } elseif (str_contains($token, 'ชำระเอง')) {
                $map['self_pay'] = $idx;
            } elseif (str_contains($token, 'พรบ') || $token === 'act') {
                $map['act'] = $idx;
            } elseif (str_contains($token, 'seq')) {
                $map['seq'] = $idx;
            }
        }

        // Sub-header ใต้ "กรณี" — ใช้ค่าแรกเท่านั้น (คอลัมน์ซ้ำใต้ Deny/Audit อย่าทับ)
        foreach ($subHeader as $idx => $label) {
            $s = mb_strtoupper(trim((string) $label));
            if ($s === 'INSTCS' && ! isset($map['organ'])) {
                $map['organ'] = $idx;
            } elseif ($s === 'OTCS' && ! isset($map['treat'])) {
                $map['treat'] = $idx;
            } elseif ($s === 'DRUG' && ! isset($map['drug'])) {
                $map['drug'] = $idx;
            } elseif ($s === 'OPCS' && ! isset($map['other'])) {
                $map['other'] = $idx;
            }
        }

        $last = count($header) - 1;
        $map['seq'] = $map['seq'] ?? $last;

        return $map;
    }

    /**
     * @return array<string,int>
     */
    private function mapZeroFundColumns(array $header): array
    {
        $map = [];
        foreach ($header as $idx => $label) {
            $token = mb_strtolower(trim((string) $label));
            if (str_contains($token, 'ลำดับ')) {
                $map['row_no'] = $idx;
            } elseif (str_contains($token, 'tran')) {
                $map['tran_id'] = $idx;
            } elseif ($token === 'hcode') {
                $map['hcode'] = $idx;
            } elseif ($token === 'hn') {
                $map['hn'] = $idx;
            } elseif ($token === 'an') {
                $map['an'] = $idx;
            } elseif (str_contains($token, 'วันเข้ารักษา')) {
                $map['visit_at'] = $idx;
            } elseif ($token === 'pid' || str_contains($token, 'บัตร')) {
                $map['pid'] = $idx;
            } elseif ($this->isPatientNameHeader($token) && ! isset($map['name'])) {
                $map['name'] = $idx;
            } elseif ($token === 'กองทุน') {
                $map['fund'] = $idx;
            } elseif (str_contains($token, 'รหัสเบิก')) {
                $map['claim_code'] = $idx;
            } elseif ($token === 'tmt') {
                $map['tmt'] = $idx;
            } elseif (str_contains($token, 'หมวด')) {
                $map['expense_category'] = $idx;
            } elseif (str_contains($token, 'จำนวนขอเบิก')) {
                $map['qty_requested'] = $idx;
            } elseif (str_contains($token, 'จำนวนจ่าย')) {
                $map['qty_paid'] = $idx;
            } elseif (str_contains($token, 'เงินที่จ่าย')) {
                $map['amount_paid'] = $idx;
            } elseif (str_contains($token, 'เหตุผล') || str_contains($token, 'หมายเหตุ') || str_contains($token, 'remark')) {
                $map['remark'] = $idx;
            }
        }

        return $map;
    }

    private function extractEclaimMeta(array $matrix, string $originalName): array
    {
        $documentNo = null;
        $hcode = null;
        $periodLabel = null;
        $channel = 'OP';

        if (preg_match('/eclaim_(\d+)_([A-Z0-9]+)_(\d{8})_(\d+)/i', $originalName, $m)) {
            $hcode = $m[1];
            $channel = strtoupper($m[2]);
            $periodLabel = $m[3];
            $documentNo = pathinfo($originalName, PATHINFO_FILENAME);
        }

        foreach (array_slice($matrix, 0, 10) as $line) {
            $text = trim(implode(' ', array_map(fn ($v) => (string) $v, $line ?? [])));
            if ($documentNo === null && preg_match('/เลขที่เอกสาร\s*([A-Za-z0-9_\-\.]+)/u', $text, $m)) {
                $documentNo = $m[1];
            }
            if ($hcode === null && preg_match('/โรงพยาบาล\s*(\d+)/u', $text, $m)) {
                $hcode = $m[1];
            }
            if (preg_match('/_([A-Z]+)CS_/i', $text, $m) || preg_match('/eclaim_\d+_([A-Z0-9]+)_/i', $text, $m)) {
                $channel = strtoupper($m[1]);
            }
        }

        return [
            'document_no' => $documentNo,
            'hcode' => $hcode,
            'period_label' => $periodLabel,
            'channel' => $channel,
        ];
    }

    private function extractMeta(array $matrix, string $originalName): array
    {
        $documentNo = null;
        $hcode = null;
        $periodLabel = null;
        $channel = 'OP';

        if (preg_match('/(?:STM|REP)_(\d+)_([A-Z]+)(\d{6})_(\d+)/i', $originalName, $m)) {
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
            $hasHn = preg_match('/(^|\|)hn(\||$)/', $joined) === 1;
            $hasPid = str_contains($joined, 'pid') || str_contains($joined, 'เลขบัตร');
            $hasSeq = str_contains($joined, 'seq');
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
            } elseif ($this->isPatientNameHeader($token) && ! isset($map['name'])) {
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

        // STM: แถวย่อยใต้พึงรับ / eClaim: แถวย่อยใต้ "กรณี" ที่ไม่มี HN/SEQ เป็นตัวเลขยาว
        if (str_contains($joined, 'ค่าห้อง') && str_contains($joined, 'ค่ายา')) {
            return true;
        }

        return str_contains($joined, 'IPCS_ORS')
            && str_contains($joined, 'INSTCS')
            && ! preg_match('/\d{8,}/', $joined);
    }

    private function matrixContains(array $matrix, string $needle): bool
    {
        $needle = mb_strtolower($needle);
        foreach (array_slice($matrix, 0, 8) as $line) {
            $joined = mb_strtolower(implode(' ', array_map(fn ($v) => trim((string) $v), $line ?? [])));
            if (str_contains($joined, $needle)) {
                return true;
            }
        }

        return false;
    }

    private function normalizeErrorCode(string $value): ?string
    {
        $value = trim($value);
        if ($value === '' || $value === '-' || strcasecmp($value, 'null') === 0) {
            return null;
        }

        return $value;
    }

    private function normalizeDash(string $value): ?string
    {
        $value = trim($value);
        if ($value === '' || $value === '-') {
            return null;
        }

        return $value;
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

    /**
     * หัวคอลัมน์ชื่อผู้ป่วย — ไม่นับ "ชื่อหน่วยงาน" / agency name
     */
    private function isPatientNameHeader(string $token): bool
    {
        $token = mb_strtolower(trim($token));
        if ($token === '') {
            return false;
        }
        if (
            str_contains($token, 'หน่วยงาน')
            || str_contains($token, 'โรงพยาบาล')
            || str_contains($token, 'hospital')
            || str_contains($token, 'hname')
            || str_contains($token, 'office')
        ) {
            return false;
        }

        return str_contains($token, 'ชื่อ')
            || str_contains($token, 'name')
            || str_contains($token, 'fullname')
            || str_contains($token, 'lname');
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
