<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Drop existing strict unique index on document_number
        Schema::table('quality_documents', function (Blueprint $table) {
            $table->dropUnique('quality_documents_document_number_unique');
        });

        // 2. Add generated column for active documents only (NULL if deleted_at is set)
        DB::statement('ALTER TABLE quality_documents ADD COLUMN document_number_unique_active VARCHAR(255) GENERATED ALWAYS AS (IF(deleted_at IS NULL, document_number, NULL)) STORED');

        // 3. Create unique index on active documents only
        DB::statement('CREATE UNIQUE INDEX quality_documents_number_unique_active ON quality_documents (document_number_unique_active)');

        // 4. Create standard index on document_number for fast query lookups and search
        DB::statement('CREATE INDEX quality_documents_document_number_index ON quality_documents (document_number)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX quality_documents_document_number_index ON quality_documents');
        DB::statement('DROP INDEX quality_documents_number_unique_active ON quality_documents');
        DB::statement('ALTER TABLE quality_documents DROP COLUMN document_number_unique_active');

        Schema::table('quality_documents', function (Blueprint $table) {
            $table->unique('document_number');
        });
    }
};
