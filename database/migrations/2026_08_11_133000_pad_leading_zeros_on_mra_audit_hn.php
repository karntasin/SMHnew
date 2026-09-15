<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // เติมศูนย์นำหน้าให้ HN ที่สั้นกว่า 9 หลัก (มาตรฐาน HOSxP)
        $rows = DB::table('mra_audits')
            ->select('id', 'hn')
            ->whereNotNull('hn')
            ->where('hn', '!=', '')
            ->get();

        foreach ($rows as $row) {
            $hn = trim((string) $row->hn);
            if ($hn === '' || ! preg_match('/^\d+$/', $hn) || strlen($hn) >= 9) {
                continue;
            }

            $padded = str_pad($hn, 9, '0', STR_PAD_LEFT);
            if ($padded === $hn) {
                continue;
            }

            DB::table('mra_audits')
                ->where('id', $row->id)
                ->update(['hn' => $padded]);
        }
    }

    public function down(): void
    {
        // ไม่ย้อนศูนย์นำหน้า เพราะไม่ทราบค่าเดิมที่ผู้ใช้พิมพ์
    }
};
