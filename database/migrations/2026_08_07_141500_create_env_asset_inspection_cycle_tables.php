<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('env_asset_inspection_cycles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('fiscal_year', 16)->nullable();
            $table->string('status', 32)->default('draft');
            $table->date('default_scheduled_date')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('env_asset_inspection_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cycle_id')->constrained('env_asset_inspection_cycles')->cascadeOnDelete();
            $table->foreignId('asset_id')->constrained('env_assets')->cascadeOnDelete();
            $table->string('department_label', 255)->nullable();
            $table->date('scheduled_date')->nullable();
            $table->string('result', 16)->default('pending');
            $table->text('notes')->nullable();
            $table->timestamp('inspected_at')->nullable();
            $table->foreignId('inspected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['cycle_id', 'asset_id']);
            $table->index(['cycle_id', 'result']);
            $table->index(['cycle_id', 'scheduled_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('env_asset_inspection_items');
        Schema::dropIfExists('env_asset_inspection_cycles');
    }
};
