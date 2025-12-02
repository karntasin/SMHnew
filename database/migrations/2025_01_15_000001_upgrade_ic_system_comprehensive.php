<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Comprehensive IC System Upgrade - มาตรฐาน สรพ.
     * For small hospital without OR, small ER only
     */
    public function up(): void
    {
        // ========================================
        // 1. Hand Hygiene Compliance (WHO 5 Moments)
        // ========================================
        Schema::create('ic_hand_hygiene_observations', function (Blueprint $table) {
            $table->id();
            $table->date('observation_date');
            $table->string('ward_name');
            $table->string('observer_name'); // ผู้สังเกตการณ์
            $table->string('profession'); // nurse, doctor, aide, other
            
            // WHO 5 Moments
            $table->integer('moment_1_opportunities')->default(0); // Before touching patient
            $table->integer('moment_1_compliances')->default(0);
            $table->integer('moment_2_opportunities')->default(0); // Before clean/aseptic procedure
            $table->integer('moment_2_compliances')->default(0);
            $table->integer('moment_3_opportunities')->default(0); // After body fluid exposure risk
            $table->integer('moment_3_compliances')->default(0);
            $table->integer('moment_4_opportunities')->default(0); // After touching patient
            $table->integer('moment_4_compliances')->default(0);
            $table->integer('moment_5_opportunities')->default(0); // After touching patient surroundings
            $table->integer('moment_5_compliances')->default(0);
            
            $table->string('hand_hygiene_method')->nullable(); // alcohol_rub, handwashing, both
            $table->text('notes')->nullable();
            $table->foreignId('reporter_id')->nullable()->constrained('users');
            $table->timestamps();
        });

        // ========================================
        // 2. Environment/Equipment Surveillance
        // ========================================
        Schema::create('ic_environment_checks', function (Blueprint $table) {
            $table->id();
            $table->date('check_date');
            $table->string('area_name'); // ER, Ward, OPD, Lab, etc.
            $table->string('check_type'); // surface_sampling, air_quality, water_quality, equipment_sterilization
            
            // For surface sampling
            $table->string('sampling_site')->nullable(); // bed rail, nurse station, etc.
            $table->string('organism_found')->nullable();
            $table->enum('result', ['pass', 'fail', 'pending'])->default('pending');
            $table->decimal('cfu_count', 10, 2)->nullable(); // Colony Forming Units
            
            // For equipment sterilization check
            $table->string('equipment_name')->nullable();
            $table->string('sterilization_method')->nullable(); // autoclave, EO, chemical
            $table->boolean('indicator_passed')->nullable();
            
            $table->text('corrective_action')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('reporter_id')->nullable()->constrained('users');
            $table->timestamps();
        });

        // ========================================
        // 3. Device Days Tracking (for rate calculation)
        // ========================================
        Schema::create('ic_device_days', function (Blueprint $table) {
            $table->id();
            $table->date('record_date');
            $table->string('ward_name');
            
            // Patient census
            $table->integer('patient_days')->default(0);
            
            // Device days
            $table->integer('urinary_catheter_days')->default(0);
            $table->integer('central_line_days')->default(0);
            $table->integer('ventilator_days')->default(0);
            $table->integer('peripheral_iv_days')->default(0);
            
            // Additional for small hospital
            $table->integer('ng_tube_days')->default(0);
            
            $table->text('notes')->nullable();
            $table->foreignId('reporter_id')->nullable()->constrained('users');
            $table->timestamps();
            
            // Prevent duplicate entries
            $table->unique(['record_date', 'ward_name']);
        });

        // ========================================
        // 4. Antibiotic Stewardship
        // ========================================
        Schema::create('ic_antibiotic_uses', function (Blueprint $table) {
            $table->id();
            $table->string('hn');
            $table->string('an')->nullable(); // For IPD
            $table->string('patient_name');
            $table->string('ward_name');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            
            // Antibiotic details
            $table->string('antibiotic_name');
            $table->string('antibiotic_class')->nullable(); // Penicillins, Cephalosporins, etc.
            $table->string('route'); // IV, Oral, IM
            $table->string('dose')->nullable();
            $table->string('frequency')->nullable();
            $table->string('indication'); // Prophylaxis, Empiric, Definitive
            
            // Culture
            $table->string('culture_site')->nullable();
            $table->string('organism')->nullable();
            $table->text('sensitivity_pattern')->nullable();
            
            // Evaluation
            $table->enum('appropriateness', ['appropriate', 'inappropriate', 'need_review', 'pending'])->default('pending');
            $table->string('reviewed_by')->nullable();
            $table->text('recommendation')->nullable();
            $table->text('notes')->nullable();
            
            $table->foreignId('reporter_id')->nullable()->constrained('users');
            $table->timestamps();
        });

        // ========================================
        // 5. Outbreak Management
        // ========================================
        Schema::create('ic_outbreaks', function (Blueprint $table) {
            $table->id();
            $table->string('outbreak_name');
            $table->date('detection_date');
            $table->date('resolved_date')->nullable();
            
            $table->string('pathogen')->nullable(); // เชื้อก่อโรค
            $table->string('affected_area'); // Ward/Department affected
            $table->integer('total_cases')->default(0);
            $table->integer('staff_cases')->default(0);
            $table->integer('patient_cases')->default(0);
            
            $table->enum('status', ['investigating', 'active', 'controlled', 'resolved'])->default('investigating');
            $table->enum('severity', ['minor', 'moderate', 'major', 'critical'])->default('minor');
            
            $table->text('source_investigation')->nullable();
            $table->text('control_measures')->nullable();
            $table->text('lessons_learned')->nullable();
            
            $table->foreignId('reported_by')->nullable()->constrained('users');
            $table->timestamps();
        });

        // Outbreak Cases (linked to outbreak)
        Schema::create('ic_outbreak_cases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('outbreak_id')->constrained('ic_outbreaks')->onDelete('cascade');
            $table->string('case_type'); // patient, staff, visitor
            $table->string('hn')->nullable();
            $table->string('patient_name')->nullable();
            $table->string('staff_name')->nullable();
            $table->date('symptom_onset_date');
            $table->text('symptoms')->nullable();
            $table->enum('outcome', ['recovered', 'ongoing', 'deceased', 'transferred'])->default('ongoing');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // ========================================
        // 6. IC Education/Training Records
        // ========================================
        Schema::create('ic_education_records', function (Blueprint $table) {
            $table->id();
            $table->string('training_title');
            $table->date('training_date');
            $table->string('training_type'); // orientation, refresher, outbreak_response, audit_feedback
            $table->string('topic'); // hand_hygiene, ppe, isolation, waste_management, sharps_safety
            $table->string('target_audience'); // all_staff, nurses, doctors, aides, housekeeping
            
            $table->integer('total_participants')->default(0);
            $table->integer('total_passed')->default(0);
            $table->decimal('pass_rate', 5, 2)->nullable();
            
            $table->string('trainer_name')->nullable();
            $table->text('content_summary')->nullable();
            $table->text('notes')->nullable();
            
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
        });

        // Individual training records
        Schema::create('ic_education_attendees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('education_record_id')->constrained('ic_education_records')->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->string('attendee_name'); // In case user doesn't exist in system
            $table->string('department')->nullable();
            $table->decimal('pre_test_score', 5, 2)->nullable();
            $table->decimal('post_test_score', 5, 2)->nullable();
            $table->boolean('passed')->default(false);
            $table->timestamps();
        });

        // ========================================
        // 7. IC Settings/Configuration
        // ========================================
        Schema::create('ic_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('type')->default('string'); // string, integer, boolean, json
            $table->string('group')->nullable(); // surveillance, hand_hygiene, environment, etc.
            $table->string('description')->nullable();
            $table->timestamps();
        });

        // ========================================
        // 8. Enhance ic_surveillance_logs
        // ========================================
        Schema::table('ic_surveillance_logs', function (Blueprint $table) {
            // Add columns if not exist
            if (!Schema::hasColumn('ic_surveillance_logs', 'device_related')) {
                $table->string('device_related')->nullable()->after('infection_type'); // catheter, central_line, ventilator
            }
            if (!Schema::hasColumn('ic_surveillance_logs', 'culture_date')) {
                $table->date('culture_date')->nullable()->after('organism');
            }
            if (!Schema::hasColumn('ic_surveillance_logs', 'sensitivity_pattern')) {
                $table->text('sensitivity_pattern')->nullable()->after('culture_date');
            }
            if (!Schema::hasColumn('ic_surveillance_logs', 'onset_type')) {
                $table->string('onset_type')->nullable()->after('status'); // community, hospital
            }
            if (!Schema::hasColumn('ic_surveillance_logs', 'days_after_admission')) {
                $table->integer('days_after_admission')->nullable()->after('onset_type');
            }
            if (!Schema::hasColumn('ic_surveillance_logs', 'outcome')) {
                $table->enum('outcome', ['recovered', 'ongoing', 'deceased', 'transferred'])->nullable()->after('days_after_admission');
            }
        });

        // ========================================
        // 9. Enhance ic_incidents
        // ========================================
        Schema::table('ic_incidents', function (Blueprint $table) {
            if (!Schema::hasColumn('ic_incidents', 'source_patient_hn')) {
                $table->string('source_patient_hn')->nullable()->after('incident_type');
            }
            if (!Schema::hasColumn('ic_incidents', 'source_patient_status')) {
                $table->string('source_patient_status')->nullable()->after('source_patient_hn'); // HIV, HBV, HCV status
            }
            if (!Schema::hasColumn('ic_incidents', 'follow_up_date')) {
                $table->date('follow_up_date')->nullable()->after('action_taken');
            }
            if (!Schema::hasColumn('ic_incidents', 'pep_given')) {
                $table->boolean('pep_given')->default(false)->after('follow_up_date');
            }
            if (!Schema::hasColumn('ic_incidents', 'baseline_labs')) {
                $table->text('baseline_labs')->nullable()->after('pep_given');
            }
            if (!Schema::hasColumn('ic_incidents', 'outcome')) {
                $table->string('outcome')->nullable()->after('baseline_labs'); // negative, seroconverted, lost_to_follow_up
            }
        });

        // ========================================
        // 10. Create IC Submenus
        // ========================================
        $icMenuId = DB::table('menus')->where('route', '/ic')->value('id');
        
        if ($icMenuId) {
            $submenus = [
                ['title' => 'Dashboard', 'icon' => 'LayoutDashboard', 'route' => '/ic', 'order' => 1],
                ['title' => 'เฝ้าระวังการติดเชื้อ', 'icon' => 'Activity', 'route' => '/ic/surveillance', 'order' => 2],
                ['title' => 'อุบัติการณ์', 'icon' => 'AlertTriangle', 'route' => '/ic/incidents', 'order' => 3],
                ['title' => 'Hand Hygiene', 'icon' => 'Hand', 'route' => '/ic/hand-hygiene', 'order' => 4],
                ['title' => 'Environment Check', 'icon' => 'Microscope', 'route' => '/ic/environment', 'order' => 5],
                ['title' => 'Antibiotic Stewardship', 'icon' => 'Pill', 'route' => '/ic/antibiotic', 'order' => 6],
                ['title' => 'Device Days', 'icon' => 'Calendar', 'route' => '/ic/device-days', 'order' => 7],
                ['title' => 'Outbreak', 'icon' => 'Siren', 'route' => '/ic/outbreak', 'order' => 8],
                ['title' => 'อบรม IC', 'icon' => 'GraduationCap', 'route' => '/ic/education', 'order' => 9],
                ['title' => 'รายงาน', 'icon' => 'FileBarChart', 'route' => '/ic/reports', 'order' => 10],
            ];

            foreach ($submenus as $submenu) {
                // Check if exists
                $exists = DB::table('menus')->where('route', $submenu['route'])->exists();
                if (!$exists) {
                    DB::table('menus')->insert([
                        'title' => $submenu['title'],
                        'icon' => $submenu['icon'],
                        'route' => $submenu['route'],
                        'parent_id' => $icMenuId,
                        'order' => $submenu['order'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        // ========================================
        // 11. Insert Default IC Settings
        // ========================================
        $settings = [
            ['key' => 'hand_hygiene_target', 'value' => '85', 'type' => 'integer', 'group' => 'hand_hygiene', 'description' => 'เป้าหมาย Hand Hygiene Compliance (%)'],
            ['key' => 'cauti_target', 'value' => '3.5', 'type' => 'decimal', 'group' => 'surveillance', 'description' => 'เป้าหมาย CAUTI Rate per 1000 catheter days'],
            ['key' => 'clabsi_target', 'value' => '1.5', 'type' => 'decimal', 'group' => 'surveillance', 'description' => 'เป้าหมาย CLABSI Rate per 1000 central line days'],
            ['key' => 'vap_target', 'value' => '5.0', 'type' => 'decimal', 'group' => 'surveillance', 'description' => 'เป้าหมาย VAP Rate per 1000 ventilator days'],
            ['key' => 'antibiotic_review_days', 'value' => '3', 'type' => 'integer', 'group' => 'antibiotic', 'description' => 'จำนวนวันสำหรับ review antibiotic'],
            ['key' => 'outbreak_threshold', 'value' => '3', 'type' => 'integer', 'group' => 'outbreak', 'description' => 'จำนวน case ที่ trigger outbreak alert'],
            ['key' => 'environment_check_frequency', 'value' => 'monthly', 'type' => 'string', 'group' => 'environment', 'description' => 'ความถี่การตรวจสอบสิ่งแวดล้อม'],
        ];

        foreach ($settings as $setting) {
            DB::table('ic_settings')->insertOrIgnore([
                ...$setting,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove submenus
        DB::table('menus')->where('route', 'like', '/ic/%')->delete();

        // Drop tables
        Schema::dropIfExists('ic_education_attendees');
        Schema::dropIfExists('ic_education_records');
        Schema::dropIfExists('ic_outbreak_cases');
        Schema::dropIfExists('ic_outbreaks');
        Schema::dropIfExists('ic_antibiotic_uses');
        Schema::dropIfExists('ic_device_days');
        Schema::dropIfExists('ic_environment_checks');
        Schema::dropIfExists('ic_hand_hygiene_observations');
        Schema::dropIfExists('ic_settings');

        // Remove added columns from ic_surveillance_logs
        Schema::table('ic_surveillance_logs', function (Blueprint $table) {
            $columns = ['device_related', 'culture_date', 'sensitivity_pattern', 'onset_type', 'days_after_admission', 'outcome'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('ic_surveillance_logs', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        // Remove added columns from ic_incidents
        Schema::table('ic_incidents', function (Blueprint $table) {
            $columns = ['source_patient_hn', 'source_patient_status', 'follow_up_date', 'pep_given', 'baseline_labs', 'outcome'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('ic_incidents', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
