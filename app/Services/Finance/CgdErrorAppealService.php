<?php

namespace App\Services\Finance;

use App\Models\Finance\CgdStmBatch;

/**
 * Facade บาง ๆ — แยก Error / Appeal เป็นคนละระบบแล้ว
 *
 * @deprecated ใช้ CgdErrorCaseService และ CgdAppealService โดยตรง
 */
class CgdErrorAppealService
{
    public function __construct(
        private readonly CgdErrorCaseService $errors,
        private readonly CgdAppealService $appeals,
    ) {}

    public static function isAppealFilename(string $filename): bool
    {
        return CgdAppealService::isAppealFilename($filename);
    }

    public static function detectFileKind(string $filename): string
    {
        return CgdAppealService::detectFileKind($filename);
    }

    public function syncFromBatch(CgdStmBatch $batch): void
    {
        if (($batch->file_kind ?? 'rep') === 'appeal') {
            $this->appeals->syncFromAppealBatch($batch);
        } else {
            $this->errors->syncFromRepBatch($batch);
        }
    }
}
