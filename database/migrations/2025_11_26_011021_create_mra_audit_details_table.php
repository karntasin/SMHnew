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
        Schema::create('mra_audit_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mra_audit_id')->constrained('mra_audits')->onDelete('cascade');
            $table->string('category'); // e.g., 'Principal Diagnosis', 'Comorbidity', 'Procedure'
            $table->string('item_code')->nullable(); // ICD-10 or ICD-9
            $table->string('item_description')->nullable();
            $table->boolean('is_correct')->default(true);
            $table->string('correct_value')->nullable(); // If incorrect, what should it be
            $table->string('error_type')->nullable(); // e.g., 'Wrong Code', 'Missed Code'
            $table->text('auditor_comment')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mra_audit_details');
    }
};
