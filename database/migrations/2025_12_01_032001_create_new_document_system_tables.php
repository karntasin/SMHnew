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
        Schema::disableForeignKeyConstraints();

        // Drop old tables if they exist to ensure a clean slate
        Schema::dropIfExists('document_distributions');
        Schema::dropIfExists('document_approvals');
        Schema::dropIfExists('document_attachments');
        Schema::dropIfExists('document_drafts'); // Added based on file list
        Schema::dropIfExists('document_draft_comments'); // Added based on file list
        Schema::dropIfExists('document_draft_revisions'); // Added based on file list
        Schema::dropIfExists('documents');

        Schema::enableForeignKeyConstraints();

        // 1. Documents Table (Main Table)
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('title'); // เรื่อง
            $table->string('document_number')->nullable(); // เลขที่หนังสือ
            $table->date('document_date')->nullable(); // ลงวันที่
            $table->string('origin_type')->default('internal'); // internal, external
            $table->string('sender_name')->nullable(); // For external: Organization name
            $table->foreignId('department_id')->nullable()->constrained('departments'); // For internal: Sender department
            $table->foreignId('user_id')->constrained('users'); // Creator / Registrar
            $table->text('description')->nullable(); // รายละเอียด/สรุปย่อ
            $table->string('file_path')->nullable(); // File attachment
            $table->string('status')->default('draft'); // draft, pending, in_progress, approved, distributed, completed, cancelled
            $table->string('type')->default('normal'); // normal, circular (เวียนทราบ)
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. Document Actions / Routing (Tracking the flow)
        Schema::create('document_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('documents')->onDelete('cascade');
            $table->foreignId('sender_id')->constrained('users'); // Who performed the action
            $table->foreignId('receiver_user_id')->nullable()->constrained('users'); // Specific receiver (e.g., Boss)
            $table->foreignId('receiver_department_id')->nullable()->constrained('departments'); // Department receiver
            $table->string('action_type'); // register, forward, submit_boss, approve, reject, distribute, acknowledge
            $table->text('comment')->nullable(); // Boss comments or forwarding notes
            $table->string('status')->default('pending'); // pending, completed
            $table->boolean('is_current')->default(true); // To easily find the current active step
            $table->timestamps();
        });

        // 3. Document Circular Recipients (For "หนังสือเวียนทราบ")
        Schema::create('document_circular_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('documents')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_circular_recipients');
        Schema::dropIfExists('document_actions');
        Schema::dropIfExists('documents');
    }
};
