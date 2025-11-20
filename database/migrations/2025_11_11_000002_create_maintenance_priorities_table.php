<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('maintenance_priorities', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Low, Medium, High, Critical
            $table->string('color')->default('#808080');
            $table->integer('level')->default(1); // 1=Low, 5=Critical
            $table->integer('response_time_hours')->nullable(); // Target response time
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down()
    {
        Schema::dropIfExists('maintenance_priorities');
    }
};
