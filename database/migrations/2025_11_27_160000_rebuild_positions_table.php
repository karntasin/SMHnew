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
        // ลบตาราง position_user เดิม
        Schema::dropIfExists('position_user');
        
        // ลบตาราง positions เดิม
        Schema::dropIfExists('positions');
        
        // สร้างตาราง positions ใหม่ (ไม่มี department_id, teamha_id)
        Schema::create('positions', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // ชื่อตำแหน่ง
            $table->string('description')->nullable(); // คำอธิบาย
            $table->timestamps();
        });

        // สร้างตาราง position_user ใหม่
        Schema::create('position_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('position_id')->constrained()->onDelete('cascade');
            $table->timestamps();

            $table->unique(['user_id', 'position_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('position_user');
        Schema::dropIfExists('positions');
        
        // สร้างตารางเดิมกลับ
        Schema::create('positions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('department_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('teamha_id')->nullable()->constrained('teamha')->onDelete('set null');
            $table->timestamps();
        });

        Schema::create('position_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('position_id')->constrained()->onDelete('cascade');
            $table->timestamps();
            $table->unique(['user_id', 'position_id']);
        });
    }
};
