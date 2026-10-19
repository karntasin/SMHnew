<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $sources = config('mra_auto_check_ipd.sources', []);
        if ($sources === []) {
            return;
        }

        $categoryIds = DB::table('mra_categories')
            ->where('audit_type', 'ipd')
            ->pluck('id')
            ->all();

        if ($categoryIds === []) {
            return;
        }

        foreach ($sources as $code => $meta) {
            DB::table('mra_criteria')
                ->whereIn('mra_category_id', $categoryIds)
                ->where('code', $code)
                ->update([
                    'hosxp_table' => $meta['table'] ?? null,
                    'hosxp_field' => $meta['field'] ?? null,
                    'data_type' => 'both',
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        // no-op
    }
};
