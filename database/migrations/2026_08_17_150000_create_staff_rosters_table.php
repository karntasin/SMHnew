<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_rosters', function (Blueprint $table) {
            $table->id();
            $table->string('prefix')->nullable();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('position')->nullable();
            $table->string('phone', 50)->nullable();
            $table->char('cid', 13)->nullable();
            $table->string('role_name')->default('user');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['first_name', 'last_name']);
            $table->index('cid');
            $table->unique('cid');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_rosters');
    }
};
