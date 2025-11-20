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
        Schema::table('quality_documents', function (Blueprint $table) {
            $table->foreignId('department_id')->nullable()->after('category')->constrained('departments');
            $table->date('effective_date')->nullable()->after('status');
            $table->date('review_date')->nullable()->after('effective_date');
            $table->string('document_type')->nullable()->after('category'); // e.g., WI, SD, Policy
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quality_documents', function (Blueprint $table) {
            $table->dropForeign(['department_id']);
            $table->dropColumn(['department_id', 'effective_date', 'review_date', 'document_type']);
        });
    }
};
