<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('im_backup_logs', function (Blueprint $table) {
            $table->decimal('size_gb', 14, 4)->nullable()->change();
        });

        // แก้ค่า 0.00 ที่เกิดจาก round 2 ทศนิยม ของไฟล์เล็กกว่า ~5 MB — ดึงขนาดจาก notes ถ้ามี
        $rows = DB::table('im_backup_logs')
            ->where('status', 'success')
            ->whereNotNull('notes')
            ->where(function ($q) {
                $q->whereNull('size_gb')->orWhere('size_gb', 0);
            })
            ->get(['id', 'notes']);

        foreach ($rows as $row) {
            if (! preg_match('/\(([0-9]+(?:\.[0-9]+)?)\s*MB\)/u', (string) $row->notes, $m)) {
                continue;
            }
            $gb = round(((float) $m[1]) / 1024, 4);
            DB::table('im_backup_logs')->where('id', $row->id)->update(['size_gb' => $gb]);
        }
    }

    public function down(): void
    {
        Schema::table('im_backup_logs', function (Blueprint $table) {
            $table->decimal('size_gb', 10, 2)->nullable()->change();
        });
    }
};
