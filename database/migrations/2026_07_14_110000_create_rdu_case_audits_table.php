<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rdu_case_audits', function (Blueprint $table) {
            $table->id();
            $table->string('indicator_id', 64)->index();
            $table->string('vn', 32)->index();
            $table->string('hn', 32)->nullable()->index();
            $table->date('vstdate')->nullable()->index();
            $table->string('status', 32)->default('pending')->index();
            $table->text('notes')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->json('snapshot')->nullable(); // เก็บ ICD/drug ตอนทบทวน เพื่อ Phase 2
            $table->timestamps();

            $table->unique(['indicator_id', 'vn']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rdu_case_audits');
    }
};
