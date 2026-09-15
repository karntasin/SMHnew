<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('env_assets', function (Blueprint $table) {
            $table->string('image_path')->nullable()->after('image_ref');
            $table->date('sent_at')->nullable()->after('repair_job_no');
            $table->date('status_changed_at')->nullable()->after('sent_at');
            $table->text('status_change_note')->nullable()->after('status_changed_at');
        });

        // เปลี่ยนสถานะการใช้งานเป็นภาษาไทย
        DB::statement("ALTER TABLE env_assets MODIFY status VARCHAR(32) NOT NULL DEFAULT 'ใช้งาน'");
        DB::table('env_assets')->where('status', 'Active')->update(['status' => 'ใช้งาน']);
        DB::table('env_assets')->where('status', 'Inactive')->update(['status' => 'ไม่ใช้งาน']);
        DB::table('env_assets')->where('status', 'Maintenance')->update(['status' => 'ซ่อมบำรุง']);
        DB::table('env_assets')->where('status', 'Retired')->update(['status' => 'ปลดระวาง']);

        Schema::create('env_asset_status_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained('env_assets')->cascadeOnDelete();
            $table->string('from_registry_status', 32)->nullable();
            $table->string('to_registry_status', 32);
            $table->string('from_status', 32)->nullable();
            $table->string('to_status', 32)->nullable();
            $table->date('event_date')->nullable();
            $table->string('repair_slip_no', 191)->nullable();
            $table->string('repair_job_no', 191)->nullable();
            $table->text('inspection_doc')->nullable();
            $table->text('disposal_doc')->nullable();
            $table->text('writeoff_doc')->nullable();
            $table->text('scrap_return_doc')->nullable();
            $table->text('note')->nullable();
            $table->json('payload')->nullable();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('env_asset_status_logs');

        DB::table('env_assets')->where('status', 'ใช้งาน')->update(['status' => 'Active']);
        DB::table('env_assets')->where('status', 'ไม่ใช้งาน')->update(['status' => 'Inactive']);
        DB::table('env_assets')->where('status', 'ซ่อมบำรุง')->update(['status' => 'Maintenance']);
        DB::table('env_assets')->where('status', 'ปลดระวาง')->update(['status' => 'Retired']);
        DB::statement("ALTER TABLE env_assets MODIFY status ENUM('Active','Inactive','Maintenance','Retired') NOT NULL DEFAULT 'Active'");

        Schema::table('env_assets', function (Blueprint $table) {
            $table->dropColumn(['image_path', 'sent_at', 'status_changed_at', 'status_change_note']);
        });
    }
};
