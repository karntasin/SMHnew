<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * รองรับเกณฑ์ MRA ปี 2563 แยก OPD / IPD (ตามคู่มือ สปสช./สรพ./HA)
     */
    public function up(): void
    {
        Schema::table('mra_categories', function (Blueprint $table) {
            if (!Schema::hasColumn('mra_categories', 'audit_type')) {
                $table->string('audit_type', 10)->default('opd')->after('code');
            }
            if (!Schema::hasColumn('mra_categories', 'section_key')) {
                $table->string('section_key', 40)->nullable()->after('audit_type');
            }
            if (!Schema::hasColumn('mra_categories', 'is_conditional')) {
                $table->boolean('is_conditional')->default(false)->after('weight');
            }
            if (!Schema::hasColumn('mra_categories', 'is_required_section')) {
                $table->boolean('is_required_section')->default(true)->after('is_conditional');
            }
            if (!Schema::hasColumn('mra_categories', 'hint')) {
                $table->text('hint')->nullable()->after('description');
            }
        });

        Schema::table('mra_criteria', function (Blueprint $table) {
            if (!Schema::hasColumn('mra_criteria', 'group_key')) {
                $table->string('group_key', 40)->nullable()->after('code');
            }
            if (!Schema::hasColumn('mra_criteria', 'group_title')) {
                $table->string('group_title', 120)->nullable()->after('group_key');
            }
            if (!Schema::hasColumn('mra_criteria', 'is_bonus')) {
                $table->boolean('is_bonus')->default(false)->after('is_required');
            }
        });

        // ขยายความยาว code (MySQL)
        try {
            DB::statement('ALTER TABLE mra_categories MODIFY code VARCHAR(40) NOT NULL');
            DB::statement('ALTER TABLE mra_criteria MODIFY code VARCHAR(40) NOT NULL');
        } catch (\Throwable $e) {
            // ignore if engine/driver differs
        }

        // index สำหรับกรองตามประเภท
        try {
            Schema::table('mra_categories', function (Blueprint $table) {
                $table->index(['audit_type', 'is_active'], 'mra_categories_type_active_idx');
            });
        } catch (\Throwable $e) {
            // already exists
        }
    }

    public function down(): void
    {
        Schema::table('mra_criteria', function (Blueprint $table) {
            foreach (['group_key', 'group_title', 'is_bonus'] as $col) {
                if (Schema::hasColumn('mra_criteria', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('mra_categories', function (Blueprint $table) {
            try {
                $table->dropIndex('mra_categories_type_active_idx');
            } catch (\Throwable $e) {
                //
            }
            foreach (['audit_type', 'section_key', 'is_conditional', 'is_required_section', 'hint'] as $col) {
                if (Schema::hasColumn('mra_categories', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
