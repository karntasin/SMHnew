<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('maintenance_requests', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number')->unique(); // MR-20251121-0001
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // Requester
            $table->foreignId('category_id')->nullable()->constrained('maintenance_categories')->nullOnDelete();
            $table->foreignId('priority_id')->nullable()->constrained('maintenance_priorities')->nullOnDelete();
            
            $table->string('title');
            $table->text('description');
            $table->string('location'); // Room, Floor, Building
            
            $table->string('status')->default('pending'); // pending, assigned, in_progress, on_hold, completed, cancelled, rejected
            
            $table->foreignId('technician_id')->nullable()->constrained('users')->nullOnDelete(); // Assigned technician
            
            $table->dateTime('assigned_at')->nullable();
            $table->dateTime('started_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            
            $table->text('resolution_notes')->nullable(); // Notes upon completion
            $table->decimal('cost', 10, 2)->nullable();
            
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down()
    {
        Schema::dropIfExists('maintenance_requests');
    }
};
