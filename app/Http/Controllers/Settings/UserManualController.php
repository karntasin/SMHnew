<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Services\ThaiPdfService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class UserManualController extends Controller
{
    /**
     * แสดงหน้าคู่มือการใช้งานในโมดูลการตั้งค่า (Interactive Manuals)
     */
    public function index(): Response
    {
        return Inertia::render('settings/manuals', [
            'manuals' => [
                [
                    'id' => 'registration',
                    'title' => 'คู่มือการสมัครสมาชิกและเข้าใช้งานระบบ',
                    'subtitle' => 'สำหรับบุคลากรใหม่ · ยืนยันตัวตนด้วย LINE, ค้นหาประวัติบุคลากร (Staff Roster) และเลือกแผนก/ทีม',
                    'downloadUrl' => route('settings.manuals.registration.download'),
                    'badge' => 'ผู้ใช้งานใหม่ / บุคลากร',
                    'updatedAt' => 'ตุลาคม 2569 (เวอร์ชัน 2.0)',
                    'stepsCount' => 4,
                    'topics' => [
                        'ข้อกำหนดและสิ่งที่ต้องเตรียมก่อนสมัคร (LINE, บัตรประชาชน 13 หลัก, แผนก/ทีม)',
                        'ขั้นตอนที่ 1: เข้าหน้าสมัครสมาชิก (/register)',
                        'ขั้นตอนที่ 2: สแกน LINE QR Code หรือเปิด LINE เพื่อยืนยันตัวตน',
                        'ขั้นตอนที่ 3: ระบบค้นหาข้อมูลบุคลากรอัตโนมัติ (Staff Roster Lookup) พร้อมเลือกแผนกและทีม HA',
                        'ขั้นตอนที่ 4: เพิ่มเพื่อน LINE Official และเปิดใช้งานบัญชีสำเร็จ',
                        'การเข้าสู่ระบบในครั้งถัดไป (เข้าผ่าน LINE QR Code หรือ อีเมล/รหัสผ่าน)',
                        'คำถามที่พบบ่อย (FAQ) และแนวทางแก้ไขปัญหา',
                    ],
                ],
                [
                    'id' => 'profile',
                    'title' => 'คู่มือการตั้งค่าโปรไฟล์และบัญชีผู้ใช้งาน',
                    'subtitle' => 'การจัดการข้อมูลส่วนตัว, รูปโปรไฟล์ (Avatar), สังกัดแผนกหลัก, ทีมนำ HA, บัญชี LINE และรหัสผ่าน',
                    'downloadUrl' => route('settings.manuals.profile.download'),
                    'badge' => 'ผู้ใช้งานทุกคน',
                    'updatedAt' => 'ตุลาคม 2569 (เวอร์ชัน 2.0)',
                    'stepsCount' => 4,
                    'topics' => [
                        'ช่องทางการเข้าสู่หน้าตั้งค่าโปรไฟล์ (/settings/profile)',
                        'การจัดการข้อมูลส่วนตัว: ชื่อ-นามสกุล, อีเมล และชื่อแสดงในแชท (Chat Display Name)',
                        'การเปลี่ยนรูปโปรไฟล์ (Avatar): อัปโหลดรูปใหม่ หรือใช้รูปจากบัญชี LINE',
                        'การจัดการสังกัดแผนก: การเลือกแผนกที่ปฏิบัติงาน และการตั้งค่าแผนกหลัก (Primary Department)',
                        'การเลือกทีมนำทางคลินิกและประสานงาน (HA Team Picker) เช่น PCT, IC, PTC, ENV, RM, IM, HRD',
                        'การจัดการบัญชี LINE: ตรวจสอบสถานะ, การยกเลิกเชื่อมต่อ (Unlink LINE) และผูกบัญชีใหม่',
                        'การตั้งและเปลี่ยนรหัสผ่านเพื่อความปลอดภัย (/settings/password)',
                        'นโยบายความปลอดภัยและการคุ้มครองข้อมูลส่วนบุคคล (PDPA)',
                    ],
                ],
            ],
        ]);
    }

    /**
     * ดาวน์โหลด PDF คู่มือการสมัครสมาชิก
     */
    public function downloadRegistrationManual(ThaiPdfService $pdf): HttpResponse
    {
        [$fontRegularUri, $fontBoldUri] = $pdf->fontUris();
        $now = Carbon::now(config('app.timezone', 'Asia/Bangkok'));
        $thaiYear = $now->year + 543;
        $generatedAt = $now->format('d/m/').$thaiYear.' '.$now->format('H:i').' น.';

        $html = view('settings.manuals.registration-pdf', [
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
            'generatedAt' => $generatedAt,
        ])->render();

        $filename = 'SMH-User-Registration-Manual.pdf';

        return response($pdf->render($html, 'portrait', true, 'sarabun'), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    /**
     * ดาวน์โหลด PDF คู่มือการตั้งค่าโปรไฟล์
     */
    public function downloadProfileManual(ThaiPdfService $pdf): HttpResponse
    {
        [$fontRegularUri, $fontBoldUri] = $pdf->fontUris();
        $now = Carbon::now(config('app.timezone', 'Asia/Bangkok'));
        $thaiYear = $now->year + 543;
        $generatedAt = $now->format('d/m/').$thaiYear.' '.$now->format('H:i').' น.';

        $html = view('settings.manuals.profile-pdf', [
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
            'generatedAt' => $generatedAt,
        ])->render();

        $filename = 'SMH-Profile-Settings-Manual.pdf';

        return response($pdf->render($html, 'portrait', true, 'sarabun'), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }
}
