<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quality_documents', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('document_number')->unique();
            $table->text('description')->nullable();
            $table->string('category');
            $table->string('status')->default('draft'); // draft, review, published, archived
            $table->string('current_version')->nullable();
            $table->string('file_path')->nullable();
            $table->foreignId('owner_id')->constrained('users');
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quality_documents');
    }
};
