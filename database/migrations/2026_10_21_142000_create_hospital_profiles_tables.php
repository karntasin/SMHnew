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
        if (!Schema::connection('mysql')->hasTable('hospital_profiles')) {
            Schema::connection('mysql')->create('hospital_profiles', function (Blueprint $table) {
                $table->id();
                $table->string('code', 50)->default('SURASINGHANAT');
                $table->string('hospital_name_th', 255)->default('โรงพยาบาลค่ายสุรสิงหนาท');
                $table->string('hospital_name_en', 255)->default('Fort Surasinghanat Hospital');
                $table->string('address', 255)->nullable();
                $table->string('hospital_type', 100)->nullable(); // เช่น โรงพยาบาลชุมชน
                $table->string('hospital_level', 100)->nullable(); // เช่น ทุติยภูมิ
                $table->string('affiliation', 150)->nullable();    // เช่น กรมแพทย์ทหารบก กระทรวงกลาโหม
                $table->integer('registered_beds')->default(60);
                $table->integer('actual_beds')->default(30);
                $table->decimal('occupancy_rate', 5, 2)->nullable();
                $table->text('service_area')->nullable();
                $table->text('network_hospitals')->nullable();
                
                // Direction & Core Identity
                $table->longText('vision')->nullable();
                $table->longText('mission')->nullable();
                $table->longText('core_values')->nullable();
                $table->longText('culture')->nullable();
                $table->longText('core_competencies')->nullable();
                
                // Strategy
                $table->longText('strategic_objectives')->nullable();
                $table->longText('strategic_focus')->nullable();
                $table->longText('strategic_advantages')->nullable();
                $table->longText('strategic_challenges')->nullable();
                
                // 7 Tab Data Structures (JSON)
                $table->longText('front_page_info')->nullable();
                $table->longText('patient_profile')->nullable();
                $table->longText('staff_profile')->nullable();
                $table->longText('workload_data')->nullable();
                $table->longText('entry_data')->nullable();
                $table->longText('one_page_summary')->nullable();
                
                $table->string('status', 20)->default('published');
                $table->integer('current_version')->default(1);
                $table->unsignedBigInteger('last_modified_by')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::connection('mysql')->hasTable('hospital_profile_revisions')) {
            Schema::connection('mysql')->create('hospital_profile_revisions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('hospital_profile_id');
                $table->integer('version_number');
                $table->string('change_summary', 255)->nullable();
                $table->longText('snapshot_data');
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();

                $table->foreign('hospital_profile_id')
                      ->references('id')
                      ->on('hospital_profiles')
                      ->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('hospital_profile_revisions');
        Schema::connection('mysql')->dropIfExists('hospital_profiles');
    }
};
