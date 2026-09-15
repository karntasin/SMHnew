<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quality_indicator_families', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->foreignId('master_indicator_id')->nullable()->constrained('quality_indicators')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('quality_indicators', function (Blueprint $table) {
            $table->foreignId('family_id')->nullable()->after('id')->constrained('quality_indicator_families')->nullOnDelete();
        });

        $indicators = DB::table('quality_indicators')->orderBy('id')->get(['id', 'code']);
        $now = now();

        foreach ($indicators as $indicator) {
            $key = $indicator->code !== null && $indicator->code !== ''
                ? (string) $indicator->code
                : 'QI-'.$indicator->id;

            $familyId = DB::table('quality_indicator_families')->insertGetId([
                'key' => $key,
                'master_indicator_id' => $indicator->id,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('quality_indicators')->where('id', $indicator->id)->update([
                'family_id' => $familyId,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('quality_indicators', function (Blueprint $table) {
            $table->dropConstrainedForeignId('family_id');
        });

        Schema::dropIfExists('quality_indicator_families');
    }
};
