<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('km_assets', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('file_path');
            $table->string('file_type')->nullable(); // pdf, docx, etc.
            $table->string('category')->nullable(); // Procedure, Manual, Research, etc.
            $table->json('tags')->nullable();
            $table->foreignId('uploaded_by')->constrained('users');
            $table->integer('downloads')->default(0);
            $table->integer('views')->default(0);
            $table->boolean('is_public')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('km_assets');
    }
};
