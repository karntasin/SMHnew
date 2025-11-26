<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create IC Menu
        $parentId = DB::table('menus')->where('title', 'ระบบงานคุณภาพ')->value('id');
        
        if ($parentId) {
            DB::table('menus')->insert([
                'title' => 'IC (ควบคุมการติดเชื้อ)',
                'icon' => 'ShieldAlert',
                'route' => '/ic',
                'parent_id' => $parentId,
                'order' => 20,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 2. Create IC Surveillance Table
        Schema::create('ic_surveillance_logs', function (Blueprint $table) {
            $table->id();
            $table->string('hn');
            $table->string('vn')->nullable();
            $table->string('an')->nullable(); // For Inpatient
            $table->string('patient_name');
            $table->date('admit_date')->nullable();
            $table->date('infection_date');
            $table->string('ward_name')->nullable(); // Store name for snapshot
            $table->string('infection_type'); // CAUTI, VAP, CLABSI, SSI, Other
            $table->string('organism')->nullable(); // Pathogen name
            $table->enum('status', ['suspected', 'confirmed', 'rejected'])->default('suspected');
            $table->text('notes')->nullable();
            $table->foreignId('reporter_id')->nullable()->constrained('users');
            $table->timestamps();
        });

        // 3. Create IC Incidents Table (อุบัติการณ์ / Needle Stick / Breach)
        Schema::create('ic_incidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reporter_id')->constrained('users');
            $table->dateTime('incident_date');
            $table->string('location');
            $table->string('incident_type'); // Needle Stick, PPE Breach, Exposure
            $table->text('description');
            $table->enum('severity', ['low', 'medium', 'high', 'critical']);
            $table->enum('status', ['reported', 'investigating', 'resolved'])->default('reported');
            $table->text('action_taken')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ic_incidents');
        Schema::dropIfExists('ic_surveillance_logs');
        DB::table('menus')->where('route', '/ic')->delete();
    }
};
