<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rcm_file_patch_batches', function (Blueprint $table) {
            $table->id();
            $table->string('batch_name', 128);
            $table->string('folder_path', 255);
            $table->string('target_file', 64)->default('ADP');
            $table->integer('total_files_modified')->default(0);
            $table->integer('total_records_scanned')->default(0);
            $table->integer('total_records_modified')->default(0);
            $table->string('backup_path', 255)->nullable();
            $table->string('status', 32)->default('completed');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('rcm_file_patch_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('rcm_file_patch_batches')->cascadeOnDelete();
            $table->string('file_name', 128);
            $table->integer('line_number')->default(0);
            $table->string('hn', 32)->nullable();
            $table->string('an', 32)->nullable();
            $table->string('dateopd', 16)->nullable();
            $table->string('type', 16)->nullable();
            $table->string('code', 64)->nullable();
            $table->decimal('qty', 12, 2)->nullable();
            $table->decimal('rate', 14, 2)->nullable();
            $table->string('seq', 32)->nullable();
            $table->decimal('total', 14, 2)->nullable();
            $table->string('old_use_status', 32)->nullable();
            $table->string('new_use_status', 32)->nullable();
            $table->text('raw_line_before')->nullable();
            $table->timestamps();

            $table->index(['batch_id', 'hn']);
            $table->index(['batch_id', 'seq']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rcm_file_patch_items');
        Schema::dropIfExists('rcm_file_patch_batches');
    }
};
