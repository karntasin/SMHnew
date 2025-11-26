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
        Schema::create('mra_audits', function (Blueprint $table) {
            $table->id();
            $table->string('vn')->nullable()->index(); // Visit Number
            $table->string('an')->nullable()->index(); // Admission Number
            $table->string('hn')->index(); // Hospital Number
            $table->string('patient_name');
            $table->date('visit_date');
            $table->string('doctor_name')->nullable();
            $table->string('department')->nullable();
            $table->foreignId('auditor_id')->constrained('users');
            $table->enum('status', ['pending', 'audited', 'corrected'])->default('pending');
            $table->integer('total_score')->default(0);
            $table->boolean('final_diagnosis_accuracy')->nullable();
            $table->boolean('coding_accuracy')->nullable();
            $table->text('summary_notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mra_audits');
    }
};
