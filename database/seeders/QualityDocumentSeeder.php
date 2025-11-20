<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\QualityDocument;
use App\Models\User;

class QualityDocumentSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();
        if (!$user) return;

        QualityDocument::create([
            'title' => 'ระเบียบปฏิบัติการป้องกันการติดเชื้อ',
            'document_number' => 'IC-001',
            'category' => 'IC',
            'status' => 'published',
            'current_version' => '1.0',
            'owner_id' => $user->id,
            'description' => 'แนวทางปฏิบัติเพื่อป้องกันการติดเชื้อในโรงพยาบาล',
        ]);

        QualityDocument::create([
            'title' => 'คู่มือการใช้งานเครื่องช่วยหายใจ',
            'document_number' => 'EQ-005',
            'category' => 'Equipment',
            'status' => 'draft',
            'current_version' => '0.1',
            'owner_id' => $user->id,
            'description' => 'คู่มือสำหรับพยาบาลและแพทย์',
        ]);
    }
}
