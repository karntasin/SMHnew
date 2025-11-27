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
        Schema::create('positions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedBigInteger('department_id')->nullable();
            $table->unsignedBigInteger('teamha_id')->nullable();
            $table->timestamps();

            $table->foreign('department_id')->references('id')->on('departments')->nullOnDelete();
            $table->foreign('teamha_id')->references('id')->on('teamha')->nullOnDelete();
        });

        Schema::create('position_user', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('position_id');
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('position_id')->references('id')->on('positions')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('position_user');
        Schema::dropIfExists('positions');
    }
};
