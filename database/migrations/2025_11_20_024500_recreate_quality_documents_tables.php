<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('quality_document_versions');
        Schema::dropIfExists('quality_documents');
        Schema::enableForeignKeyConstraints();

        Schema::create('quality_documents', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('document_number')->unique();
            $table->text('description')->nullable();
            $table->string('category');
            $table->string('status')->default('draft');
            $table->string('current_version')->nullable();
            $table->string('file_path')->nullable();
            $table->foreignId('owner_id')->constrained('users');
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('quality_document_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quality_document_id')->constrained()->onDelete('cascade');
            $table->string('version_number');
            $table->string('file_path');
            $table->text('changes_description')->nullable();
            $table->foreignId('uploaded_by')->constrained('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quality_document_versions');
        Schema::dropIfExists('quality_documents');
    }
};
