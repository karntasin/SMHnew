<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class HelpController extends Controller
{
    public function index(): Response
    {
        $pdfExists = file_exists(public_path('docs/SMH-คู่มือการใช้งาน.pdf'));

        return Inertia::render('Help/Index', [
            'pdfAvailable' => $pdfExists,
            'pdfUrl' => $pdfExists ? url('docs/SMH-คู่มือการใช้งาน.pdf') : null,
        ]);
    }

    public function downloadPdf(): BinaryFileResponse
    {
        $path = public_path('docs/SMH-คู่มือการใช้งาน.pdf');

        abort_unless(file_exists($path), 404, 'ไม่พบไฟล์คู่มือ PDF กรุณาให้ผู้ดูแลระบบรันคำสั่ง php artisan guide:pdf');

        return response()->download($path, 'SMH-คู่มือการใช้งาน.pdf', [
            'Content-Type' => 'application/pdf',
        ]);
    }
}
