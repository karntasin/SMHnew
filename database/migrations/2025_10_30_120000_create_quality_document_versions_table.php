<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
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
    }
};
