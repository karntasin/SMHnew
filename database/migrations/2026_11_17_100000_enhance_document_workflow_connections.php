<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            if (! Schema::hasColumn('documents', 'director_assigned_departments')) {
                $table->json('director_assigned_departments')->nullable()->after('director_comment');
            }
            if (! Schema::hasColumn('documents', 'urgency')) {
                $table->string('urgency')->default('normal')->after('type'); // normal, urgent, very_urgent, most_urgent
            }
        });

        Schema::table('document_actions', function (Blueprint $table) {
            if (! Schema::hasColumn('document_actions', 'attachment_path')) {
                $table->string('attachment_path')->nullable()->after('comment');
            }
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            if (Schema::hasColumn('documents', 'director_assigned_departments')) {
                $table->dropColumn('director_assigned_departments');
            }
            if (Schema::hasColumn('documents', 'urgency')) {
                $table->dropColumn('urgency');
            }
        });

        Schema::table('document_actions', function (Blueprint $table) {
            if (Schema::hasColumn('document_actions', 'attachment_path')) {
                $table->dropColumn('attachment_path');
            }
        });
    }
};
