<?php

use App\Data\HrdWorkEvaluationCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hrd_work_topics', function (Blueprint $table) {
            $table->json('rubric')->nullable()->after('description');
        });

        $now = now();
        foreach (HrdWorkEvaluationCatalog::tree() as $group) {
            foreach ($group['items'] as $item) {
                DB::table('hrd_work_topics')
                    ->where('title', $item['title'])
                    ->where('is_group', false)
                    ->update([
                        'description' => $item['description'],
                        'rubric' => json_encode($item['rubric'], JSON_UNESCAPED_UNICODE),
                        'updated_at' => $now,
                    ]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('hrd_work_topics', function (Blueprint $table) {
            $table->dropColumn('rubric');
        });
    }
};
