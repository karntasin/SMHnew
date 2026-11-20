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
        if (!Schema::hasTable('quality_document_attachments')) {
            Schema::create('quality_document_attachments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('quality_document_id')->constrained('quality_documents')->cascadeOnDelete();
                $table->foreignId('quality_document_version_id')->nullable()->constrained('quality_document_versions')->nullOnDelete();
                $table->string('file_name', 255);
                $table->string('file_path', 500);
                $table->unsignedBigInteger('file_size')->default(0);
                $table->string('mime_type', 100)->nullable();
                $table->string('file_extension', 20)->nullable();
                $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index(['quality_document_id', 'created_at']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quality_document_attachments');
    }
};
