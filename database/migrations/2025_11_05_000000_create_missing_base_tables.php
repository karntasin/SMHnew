<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Documents table
        if (!Schema::hasTable('documents')) {
            Schema::create('documents', function (Blueprint $table) {
                $table->id();
                $table->string('document_number')->unique();
                $table->string('title');
                $table->text('description')->nullable();
                $table->string('type'); // incoming, outgoing, circular
                $table->string('source')->nullable();
                $table->string('destination')->nullable();
                $table->date('document_date');
                $table->date('received_date')->nullable();
                $table->string('urgency')->default('normal');
                $table->string('status')->default('draft');
                $table->string('file_path')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('department_id')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // Document actions table
        if (!Schema::hasTable('document_actions')) {
            Schema::create('document_actions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('document_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('action'); // created, forwarded, approved, rejected, acknowledged
                $table->text('comment')->nullable();
                $table->foreignId('to_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('to_department_id')->nullable();
                $table->boolean('acknowledged')->default(false);
                $table->timestamp('acknowledged_at')->nullable();
                $table->timestamps();
            });
        }

        // Maintenance settings table
        if (!Schema::hasTable('maintenance_settings')) {
            Schema::create('maintenance_settings', function (Blueprint $table) {
                $table->id();
                $table->string('key')->unique();
                $table->text('value')->nullable();
                $table->timestamps();
            });
        }

        // LINE profiles table
        if (!Schema::hasTable('line_profiles')) {
            Schema::create('line_profiles', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('line_user_id')->unique();
                $table->string('display_name')->nullable();
                $table->string('picture_url')->nullable();
                $table->string('status_message')->nullable();
                $table->timestamps();
            });
        }

        // LINE messaging tokens table
        if (!Schema::hasTable('line_messaging_tokens')) {
            Schema::create('line_messaging_tokens', function (Blueprint $table) {
                $table->id();
                $table->string('channel_id')->unique();
                $table->string('channel_secret');
                $table->text('channel_access_token');
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('document_actions');
        Schema::dropIfExists('documents');
        Schema::dropIfExists('maintenance_settings');
        Schema::dropIfExists('line_profiles');
        Schema::dropIfExists('line_messaging_tokens');
    }
};
