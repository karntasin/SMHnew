<?php
/**
 * ทดสอบระบบ Auto-check MRA
 */

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\HosxpService;
use App\Models\Mra\MraCriteria;

echo "=== ทดสอบระบบตรวจสอบอัตโนมัติ MRA ===\n\n";

// ตรวจสอบ criteria ที่เป็น auto
$autoCriteria = MraCriteria::active()
    ->whereIn('data_type', ['auto', 'both'])
    ->orderBy('code')
    ->get();

echo "จำนวน Criteria ที่ตรวจอัตโนมัติได้: " . $autoCriteria->count() . "\n\n";

echo "รหัส\t| ชื่อเกณฑ์\t\t\t\t\t| ประเภท\n";
echo str_repeat("-", 80) . "\n";

foreach ($autoCriteria as $criteria) {
    printf("%-6s | %-40s | %s\n", 
        $criteria->code, 
        mb_substr($criteria->name, 0, 35), 
        $criteria->data_type
    );
}

echo "\n";

// ทดสอบกับ VN จริง (ถ้ามี)
$hosxpService = app(HosxpService::class);

// ลองหา VN จากฐานข้อมูล HOSxP
try {
    $testVn = null;
    
    // พยายามดึง VN ล่าสุดจาก hosxp
    $pdo = new PDO(
        sprintf(
            'mysql:host=%s;port=%s;dbname=%s',
            env('DB_HOST_HOSXP', env('DB_HOST', '127.0.0.1')),
            env('DB_PORT_HOSXP', env('DB_PORT', '3306')),
            env('DB_DATABASE_HOSXP', 'hosxp')
        ),
        env('DB_USERNAME_HOSXP', env('DB_USERNAME', 'root')),
        env('DB_PASSWORD_HOSXP', env('DB_PASSWORD', '')),
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    $stmt = $pdo->query("SELECT vn FROM ovst ORDER BY vstdate DESC, vsttime DESC LIMIT 1");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($row) {
        $testVn = $row['vn'];
        echo "=== ทดสอบกับ VN: $testVn ===\n\n";
        
        foreach ($autoCriteria as $criteria) {
            $result = $hosxpService->autoCheckCriteria($testVn, $criteria->code);
            
            $status = 'N/A';
            if ($result['passed'] === true) {
                $status = '✅ ผ่าน';
            } elseif ($result['passed'] === false) {
                $status = '❌ ไม่ผ่าน';
            } else {
                $status = '⚠️ ต้องตรวจด้วยตนเอง';
            }
            
            printf("[%s] %s: %s\n", 
                $criteria->code, 
                $criteria->name,
                $status
            );
            
            if ($result['value'] !== null) {
                echo "     ค่าที่พบ: " . (is_array($result['value']) ? json_encode($result['value']) : $result['value']) . "\n";
            }
        }
    } else {
        echo "⚠️ ไม่พบ VN ในฐานข้อมูล HOSxP\n";
    }
} catch (\Exception $e) {
    echo "⚠️ ไม่สามารถเชื่อมต่อ HOSxP: " . $e->getMessage() . "\n";
    echo "ระบบ auto-check จะทำงานได้เมื่อมีการเชื่อมต่อกับ HOSxP\n";
}

echo "\n=== สรุป ===\n";
echo "• Criteria ทั้งหมด: " . MraCriteria::active()->count() . "\n";
echo "• Auto-check ได้: " . $autoCriteria->count() . "\n";
echo "• Manual เท่านั้น: " . MraCriteria::active()->where('data_type', 'manual')->count() . "\n";
echo "✅ ระบบตรวจสอบอัตโนมัติพร้อมใช้งาน\n";
