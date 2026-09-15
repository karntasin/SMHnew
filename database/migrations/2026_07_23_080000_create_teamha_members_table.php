<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teamha_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teamha_id')->constrained('teamha')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('role', 50);
            $table->string('job_title')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['teamha_id', 'role']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teamha_members');
    }
};
