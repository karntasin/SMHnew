<?php

namespace App\Services\Rcm;

use Illuminate\Support\Facades\File;

class RcmCDenyCatalog
{
    protected static ?array $catalog = null;

    /**
     * โหลดข้อมูล Catalog C-Deny ทั้งหมด
     */
    public static function load(): array
    {
        if (self::$catalog !== null) {
            return self::$catalog;
        }

        $jsonPath = storage_path('app/rcm_c_deny_catalog.json');
        if (File::exists($jsonPath)) {
            $data = json_decode(File::get($jsonPath), true);
            if (is_array($data)) {
                self::$catalog = $data;
                return self::$catalog;
            }
        }

        // Fallback common codes
        self::$catalog = [
            '101' => ['code' => '101', 'title' => 'ไม่มีชื่อ-สกุลผู้ป่วย', 'solution' => 'ใส่ข้อมูลให้ครบ แล้วส่งใหม่'],
            '104' => ['code' => '104', 'title' => 'เลขบัตรประชาชนของผู้ป่วย ใช้ไม่ได้ หรือไม่มี', 'solution' => 'ตรวจสอบเลขบัตรประชาชน แล้วส่งใหม่'],
            '105' => ['code' => '105', 'title' => 'HN ไม่มี หรือใช้ไม่ได้', 'solution' => 'ใส่ HN ให้ถูกต้อง แล้วส่งใหม่'],
            '106' => ['code' => '106', 'title' => 'AN ไม่มี หรือใช้ไม่ได้', 'solution' => 'ใส่ AN ให้ถูกต้อง แล้วส่งใหม่'],
            '305' => ['code' => '305', 'title' => 'ค่ารักษาเกินเพดานที่กำหนด หรือไม่มีหนังสือส่งตัว', 'solution' => 'ยื่นอุทธรณ์พร้อมแนบเอกสารใบส่งตัว หรือเวชระเบียนยืนยันความจำเป็น'],
            '307' => ['code' => '307', 'title' => 'อัตราเบิกเกินเกณฑ์ Fee Schedule', 'solution' => 'ตรวจสอบรหัสหัตถการ/ค่าบริการให้ตรงเกณฑ์ Fee Schedule'],
            '349' => ['code' => '349', 'title' => 'รายการ Fee Schedule ไม่ตรงเงื่อนไข', 'solution' => 'แก้ไขรหัสหัตถการหรือแนบผลตรวจยืนยัน'],
            '562' => ['code' => '562', 'title' => 'ยาที่บันทึกเบิกไม่พบใน Drug Catalog ของหน่วยบริการ', 'solution' => 'นำเข้า Drug Catalog ของหน่วยบริการ ที่หน้าเว็บ drug.nhso.go.th/DrugCode เมื่อข้อมูลยาผ่านการตรวจสอบแล้วส่งข้อมูลเข้ามาใหม่อีกครั้ง'],
            '565' => ['code' => '565', 'title' => 'บันทึกเบิกยา NED ผู้ป่วยนอก ไม่ระบุเหตุผลความจำเป็น EA–EF', 'solution' => 'ระบุเหตุผลความจำเป็นในการใช้ยา NED (รหัส EA–EF) ในระบบ HOSxP แล้วส่งเบิกใหม่'],
            '808' => ['code' => '808', 'title' => 'รหัสโรค Anaemia in neoplasms (D630) ไม่มีหัตถการให้เลือด', 'solution' => 'ตรวจสอบเวชระเบียนและลงรหัสหัตถการให้เลือดให้ถูกต้องสอดคล้องกับข้อบ่งชี้'],
        ];

        return self::$catalog;
    }

    /**
     * ค้นหารายละเอียดและแนวทางแก้ไขของรหัส C-Deny
     */
    public function lookup(?string $code): ?array
    {
        if (empty($code)) {
            return null;
        }

        $catalog = self::load();
        $code = trim($code);

        // กรณีมีหลายรหัสคั่นด้วยคอมมา เช่น "565,305"
        if (str_contains($code, ',')) {
            $parts = array_map('trim', explode(',', $code));
            $titles = [];
            $solutions = [];
            foreach ($parts as $p) {
                if (isset($catalog[$p])) {
                    $titles[] = "C{$p}: " . $catalog[$p]['title'];
                    $solutions[] = "C{$p}: " . $catalog[$p]['solution'];
                } else {
                    $titles[] = "C{$p}";
                }
            }
            return [
                'code' => $code,
                'title' => implode(' | ', $titles),
                'solution' => implode(' | ', $solutions),
            ];
        }

        // ค้นหาตรงๆ หรือตัดตัวอักษร C นำหน้า
        $cleanCode = ltrim($code, 'Cc');
        if (isset($catalog[$cleanCode])) {
            return $catalog[$cleanCode];
        }

        if (isset($catalog[$code])) {
            return $catalog[$code];
        }

        return [
            'code' => $code,
            'title' => 'รหัสปฏิเสธ/ตัดเงิน e-Claim ' . $code,
            'solution' => 'ตรวจสอบเวชระเบียนและเหตุผลการตัดเงินในระบบ e-Claim เพื่อยื่นอุทธรณ์',
        ];
    }

    /**
     * ดึงรายการรหัสยอดนิยมที่พบบ่อยสำหรับ Dropdown ตัวกรอง
     */
    public function getCommonOptions(): array
    {
        return [
            ['code' => '305', 'label' => 'C305 - ค่ารักษาเกินเพดาน / ขาดใบส่งตัว'],
            ['code' => '565', 'label' => 'C565 - สิทธิไม่ตรงกับฐานข้อมูล ณ วันบริการ'],
            ['code' => '808', 'label' => 'C808 - ผลการตรวจประเมินเวชระเบียน (Audit)'],
            ['code' => '307', 'label' => 'C307 - เกินเกณฑ์ Fee Schedule'],
            ['code' => '349', 'label' => 'C349 - Fee Schedule ไม่ตรงเงื่อนไข'],
            ['code' => '562', 'label' => 'C562 - ส่งเบิกเกินกำหนดเวลา (Late Claim)'],
            ['code' => '211', 'label' => 'C211 - ข้อมูลวินิจฉัยโรคไม่สอดคล้องกับการรักษา'],
            ['code' => '104', 'label' => 'C104 - เลขบัตรประชาชนผิดหรือไม่สมบูรณ์'],
            ['code' => '101', 'label' => 'C101 - ไม่มีชื่อ-สกุลผู้ป่วย'],
        ];
    }
}
