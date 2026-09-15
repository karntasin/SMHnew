<?php

namespace App\Services;

/**
 * Schema checks for HOSxP MySQL (often older than Laravel's information_schema dump).
 */
class HosxpSchema
{
    public static function tableExists($conn, string $table): bool
    {
        try {
            return (bool) $conn->selectOne(
                'SELECT 1 AS ok FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1',
                [$table]
            );
        } catch (\Throwable) {
            return false;
        }
    }

    public static function columnExists($conn, string $table, string $column): bool
    {
        try {
            return (bool) $conn->selectOne(
                'SELECT 1 AS ok FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1',
                [$table, $column]
            );
        } catch (\Throwable) {
            return false;
        }
    }
}
