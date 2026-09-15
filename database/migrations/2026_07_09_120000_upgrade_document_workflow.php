<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            if (! Schema::hasColumn('documents', 'summary_for_director')) {
                $table->text('summary_for_director')->nullable()->after('description');
            }
            if (! Schema::hasColumn('documents', 'director_signature_path')) {
                $table->string('director_signature_path')->nullable()->after('file_path');
            }
            if (! Schema::hasColumn('documents', 'stamp_path')) {
                $table->string('stamp_path')->nullable()->after('director_signature_path');
            }
            if (! Schema::hasColumn('documents', 'director_signed_at')) {
                $table->timestamp('director_signed_at')->nullable()->after('stamp_path');
            }
            if (! Schema::hasColumn('documents', 'director_comment')) {
                $table->text('director_comment')->nullable()->after('director_signed_at');
            }
        });

        Schema::table('document_actions', function (Blueprint $table) {
            if (! Schema::hasColumn('document_actions', 'implementation_status')) {
                $table->string('implementation_status')->nullable()->after('status');
            }
            if (! Schema::hasColumn('document_actions', 'implementation_comment')) {
                $table->text('implementation_comment')->nullable()->after('implementation_status');
            }
            if (! Schema::hasColumn('document_actions', 'implementation_updated_at')) {
                $table->timestamp('implementation_updated_at')->nullable()->after('implementation_comment');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'signature_path')) {
                $table->string('signature_path')->nullable()->after('avatar');
            }
            if (! Schema::hasColumn('users', 'stamp_path')) {
                $table->string('stamp_path')->nullable()->after('signature_path');
            }
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn([
                'summary_for_director',
                'director_signature_path',
                'stamp_path',
                'director_signed_at',
                'director_comment',
            ]);
        });

        Schema::table('document_actions', function (Blueprint $table) {
            $table->dropColumn(['implementation_status', 'implementation_comment', 'implementation_updated_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['signature_path', 'stamp_path']);
        });
    }
};
