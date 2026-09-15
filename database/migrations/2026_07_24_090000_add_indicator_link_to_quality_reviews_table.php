<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quality_reviews', function (Blueprint $table) {
            $table->string('subject_type')->default('custom')->after('id'); // indicator | custom
            $table->foreignId('quality_indicator_id')
                ->nullable()
                ->after('subject_type')
                ->constrained('quality_indicators')
                ->nullOnDelete();
            $table->text('recommendations')->nullable()->after('findings');
            $table->index(['subject_type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('quality_reviews', function (Blueprint $table) {
            $table->dropConstrainedForeignId('quality_indicator_id');
            $table->dropColumn(['subject_type', 'recommendations']);
        });
    }
};
