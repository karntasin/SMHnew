<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leave_types', function (Blueprint $table) {
            $table->string('form_code', 40)->nullable()->after('code');
            $table->string('form_number', 20)->nullable()->after('form_code');
            $table->string('subject')->nullable()->after('name');
            $table->boolean('counts_working_days')->default(false)->after('requires_document');
        });

        Schema::table('leave_requests', function (Blueprint $table) {
            $table->string('written_at')->nullable()->after('delegate_name');
            $table->string('addressee')->nullable()->after('written_at');
            $table->string('destination')->nullable()->after('addressee');
            $table->date('return_date')->nullable()->after('destination');
        });
    }

    public function down(): void
    {
        Schema::table('leave_types', function (Blueprint $table) {
            $table->dropColumn(['form_code', 'form_number', 'subject', 'counts_working_days']);
        });

        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropColumn(['written_at', 'addressee', 'destination', 'return_date']);
        });
    }
};
