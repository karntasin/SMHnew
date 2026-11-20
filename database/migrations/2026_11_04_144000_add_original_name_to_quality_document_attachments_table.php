<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('quality_document_attachments')) {
            Schema::table('quality_document_attachments', function (Blueprint $table) {
                if (!Schema::hasColumn('quality_document_attachments', 'original_name')) {
                    $table->string('original_name', 255)->nullable()->after('file_name');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('quality_document_attachments')) {
            Schema::table('quality_document_attachments', function (Blueprint $table) {
                if (Schema::hasColumn('quality_document_attachments', 'original_name')) {
                    $table->dropColumn('original_name');
                }
            });
        }
    }
};
