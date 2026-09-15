<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('im_evaluation_topics', function (Blueprint $table) {
            $table->string('code', 40)->nullable()->unique()->after('id');
            $table->foreignId('parent_id')->nullable()->after('code')->constrained('im_evaluation_topics')->nullOnDelete();
            $table->boolean('is_group')->default(false)->after('parent_id');
        });
    }

    public function down(): void
    {
        Schema::table('im_evaluation_topics', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parent_id');
            $table->dropColumn(['code', 'is_group']);
        });
    }
};
