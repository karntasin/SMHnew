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
        if (!Schema::hasTable('ipd_admission_notes')) {
            Schema::create('ipd_admission_notes', function (Blueprint $table) {
                $table->id();
                $table->string('an', 20)->nullable()->index();
                $table->string('hn', 20)->index();
                $table->string('vn', 20)->nullable();
                $table->string('patient_name');
                $table->string('age', 10)->nullable();
                $table->string('gender', 20)->nullable();
                $table->string('ward')->nullable();
                $table->string('pttype')->nullable();
                $table->string('admit_date', 30)->nullable();
                $table->string('admit_time', 20)->nullable();
                $table->string('hospital_name')->default('โรงพยาบาลค่ายสุรสิงหนาท');
                $table->json('form_data');
                $table->longText('lesion_image')->nullable();
                $table->boolean('lesion_na')->default(true);
                $table->string('doctor_name')->nullable();
                $table->string('doctor_license', 50)->nullable();
                $table->string('status', 20)->default('completed');
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ipd_admission_notes');
    }
};
