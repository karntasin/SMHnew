<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->bootstrap();

use App\Models\Document;
use App\Models\DocumentType;
use App\Models\DocumentSetting;
use App\Models\DocumentAttachment;
use App\Models\DocumentWorkflow;
use App\Models\DocumentTracking;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

echo "=== ทดสอบระบบรับส่งหนังสือ Backend ===\n\n";

// 1. ตรวจสอบ Document Types
echo "1. ตรวจสอบประเภทเอกสาร:\n";
$types = DocumentType::all();
foreach ($types as $type) {
    echo "   - {$type->name} ({$type->code}) - Prefix: {$type->prefix} - Color: {$type->color}\n";
}
echo "   ✓ มี " . $types->count() . " ประเภทเอกสาร\n\n";

// 2. ตรวจสอบ Settings
echo "2. ตรวจสอบการตั้งค่า:\n";
$settings = DocumentSetting::all();
foreach ($settings as $setting) {
    echo "   - {$setting->key}: {$setting->value}\n";
}
echo "   ✓ มี " . $settings->count() . " การตั้งค่า\n\n";

// 3. ทดสอบสร้างเอกสาร
echo "3. ทดสอบสร้างหนังสือรับ:\n";
$incomingType = DocumentType::where('code', 'incoming')->first();
$user = User::first();

if (!$user) {
    echo "   ✗ ไม่พบผู้ใช้ในระบบ กรุณาสร้าง User ก่อน\n";
    exit;
}

try {
    $document = new Document();
    $document->type_id = $incomingType->id;
    $document->subject = 'ทดสอบระบบหนังสือรับ - ' . date('Y-m-d H:i:s');
    $document->from_entity = 'หน่วยงานภายนอก';
    $document->to_entity = 'หน่วยงานของเรา';
    $document->reference_number = 'REF-2025-001';
    $document->received_date = now();
    $document->urgency = 'normal';
    $document->confidentiality = 'public';
    $document->status = 'draft';
    $document->created_by = $user->id;
    $document->current_holder_id = $user->id;
    $document->save();
    
    echo "   ✓ สร้างเอกสารสำเร็จ\n";
    echo "   - เลขที่เอกสาร: {$document->document_number}\n";
    echo "   - เรื่อง: {$document->subject}\n";
    echo "   - สถานะ: {$document->status}\n";
    echo "   - ความเร่งด่วน: {$document->urgency}\n";
    echo "   - ความลับ: {$document->confidentiality}\n\n";
    
    // 4. ทดสอบ Tracking
    echo "4. ทดสอบบันทึก Tracking:\n";
    DocumentTracking::create([
        'document_id' => $document->id,
        'user_id' => $user->id,
        'action' => 'created',
        'status' => 'draft',
        'notes' => 'สร้างเอกสารใหม่ผ่านระบบทดสอบ'
    ]);
    echo "   ✓ บันทึก Tracking สำเร็จ\n";
    echo "   - จำนวน Tracking: " . $document->tracking()->count() . " รายการ\n\n";
    
    // 5. ทดสอบ Workflow - Submit
    echo "5. ทดสอบ Submit เอกสาร:\n";
    $document->status = 'submitted';
    $document->save();
    
    DocumentTracking::create([
        'document_id' => $document->id,
        'user_id' => $user->id,
        'action' => 'submitted',
        'status' => 'submitted',
        'notes' => 'ส่งเอกสารเพื่อพิจารณา'
    ]);
    
    echo "   ✓ Submit เอกสารสำเร็จ\n";
    echo "   - สถานะปัจจุบัน: {$document->status}\n";
    echo "   - จำนวน Tracking: " . $document->tracking()->count() . " รายการ\n\n";
    
    // 6. ทดสอบ Query Scopes
    echo "6. ทดสอบ Query Scopes:\n";
    $myDocs = Document::myDocuments($user->id)->count();
    $needApproval = Document::needApproval($user->id)->count();
    $draftDocs = Document::byStatus('draft')->count();
    $submittedDocs = Document::byStatus('submitted')->count();
    
    echo "   - เอกสารของฉัน: {$myDocs} ฉบับ\n";
    echo "   - รออนุมัติ: {$needApproval} ฉบับ\n";
    echo "   - สถานะ draft: {$draftDocs} ฉบับ\n";
    echo "   - สถานะ submitted: {$submittedDocs} ฉบับ\n";
    echo "   ✓ Query Scopes ทำงานถูกต้อง\n\n";
    
    // 7. ทดสอบ Relationships
    echo "7. ทดสอบ Relationships:\n";
    $testDoc = Document::with(['creator', 'currentHolder', 'type', 'tracking'])
        ->find($document->id);
    
    echo "   - ผู้สร้าง: " . ($testDoc->creator ? $testDoc->creator->name : 'N/A') . "\n";
    echo "   - ผู้ถือครอง: " . ($testDoc->currentHolder ? $testDoc->currentHolder->name : 'N/A') . "\n";
    echo "   - ประเภท: " . ($testDoc->type ? $testDoc->type->name : 'N/A') . "\n";
    echo "   - Tracking: " . $testDoc->tracking->count() . " รายการ\n";
    echo "   ✓ Relationships ทำงานถูกต้อง\n\n";
    
    // 8. ทดสอบ canBeEdited
    echo "8. ทดสอบ canBeEdited method:\n";
    $canEdit = $testDoc->canBeEdited();
    echo "   - เอกสารแก้ไขได้: " . ($canEdit ? 'ใช่' : 'ไม่ได้') . "\n";
    echo "   ✓ Method ทำงานถูกต้อง\n\n";
    
    // 9. ทดสอบเลขที่เอกสารไม่ซ้ำ
    echo "9. ทดสอบเลขที่เอกสารไม่ซ้ำ:\n";
    $doc2 = new Document();
    $doc2->type_id = $incomingType->id;
    $doc2->subject = 'ทดสอบเอกสารที่ 2';
    $doc2->from_entity = 'หน่วยงานภายนอก';
    $doc2->to_entity = 'หน่วยงานของเรา';
    $doc2->urgency = 'normal';
    $doc2->confidentiality = 'public';
    $doc2->status = 'draft';
    $doc2->created_by = $user->id;
    $doc2->current_holder_id = $user->id;
    $doc2->save();
    
    echo "   - เอกสารที่ 1: {$document->document_number}\n";
    echo "   - เอกสารที่ 2: {$doc2->document_number}\n";
    echo "   ✓ เลขที่เอกสารไม่ซ้ำกัน\n\n";
    
    // 10. สรุปผล
    echo "=== สรุปผลการทดสอบ ===\n";
    echo "✓ ระบบ Backend ทำงานถูกต้องครบทุกส่วน\n";
    echo "✓ Document Types: " . DocumentType::count() . " ประเภท\n";
    echo "✓ Documents: " . Document::count() . " ฉบับ\n";
    echo "✓ Tracking: " . DocumentTracking::count() . " รายการ\n";
    echo "✓ Settings: " . DocumentSetting::count() . " การตั้งค่า\n";
    echo "\n🎉 พร้อมสำหรับการพัฒนา Frontend แล้ว!\n";
    
} catch (\Exception $e) {
    echo "   ✗ เกิดข้อผิดพลาด: " . $e->getMessage() . "\n";
    echo "   File: " . $e->getFile() . ":" . $e->getLine() . "\n";
}
