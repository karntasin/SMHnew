<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('hrd_external_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->string('organizer')->nullable();
            $table->string('location')->nullable();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->decimal('hours', 8, 2);
            $table->string('certificate_path')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('remarks')->nullable();
            $table->timestamps();
        });

        Schema::create('hrd_user_competencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('competency_id')->constrained('hrd_competencies')->onDelete('cascade');
            $table->integer('level')->default(1); // 1-5
            $table->string('source')->nullable(); // training, manual
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('hrd_user_competencies');
        Schema::dropIfExists('hrd_external_records');
    }
};
