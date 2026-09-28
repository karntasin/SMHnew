<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Http;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\SimpleType\Jc;

class AdminDocumentController extends Controller
{
    public function aiSummarizer()
    {
        return Inertia::render('AdminDocs/AiSummarizer');
    }

    public function summarizeAi(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf,jpeg,png,jpg|max:10240',
        ]);

        $apiKey = config('services.gemini.api_key');
        if (empty($apiKey)) {
            return response()->json(['error' => 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY ในระบบ (.env)'], 400);
        }

        $file = $request->file('file');
        $mimeType = $file->getMimeType();
        $base64Data = base64_encode(file_get_contents($file->path()));

        $response = Http::post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={$apiKey}", [
            'contents' => [
                [
                    'parts' => [
                        ['text' => 'คุณเป็นผู้ช่วยงานธุรการของโรงพยาบาล หน้าที่ของคุณคือการสรุปเอกสารฉบับนี้ เพื่อนำไปกรอกในช่อง "สรุปเนื้อหาสำหรับผู้อำนวยการ" กรุณาสรุปให้กระชับ ได้ใจความ ครอบคลุม: เรื่องอะไร, ใครส่งถึงใคร, และต้องการให้ทำอะไร (Action Required) โดยสรุปไม่เกิน 3-5 บรรทัด'],
                        [
                            'inline_data' => [
                                'mime_type' => $mimeType,
                                'data' => $base64Data
                            ]
                        ]
                    ]
                ]
            ]
        ]);

        if ($response->successful()) {
            $summary = $response->json('candidates.0.content.parts.0.text');
            return response()->json(['summary' => trim($summary ?? '')]);
        }

        file_put_contents(storage_path('logs/gemini_error.txt'), $response->body());
        return response()->json(['error' => 'ไม่สามารถสรุปเนื้อหาได้จาก AI: ' . $response->body()], 500);
    }

    public function exportDocx(Request $request)
    {
        $request->validate([
            'summary' => 'required|string',
        ]);

        $summary = $request->input('summary');
        
        $phpWord = new PhpWord();
        $phpWord->setDefaultFontName('TH SarabunPSK');
        $phpWord->setDefaultFontSize(16);
        
        $section = $phpWord->addSection();
        
        $section->addText('สรุปสาระสำคัญหนังสือ', ['bold' => true, 'size' => 20], ['alignment' => Jc::CENTER]);
        $section->addTextBreak(1);
        
        $lines = explode("\n", $summary);
        foreach ($lines as $line) {
            $line = trim($line);
            if (!empty($line)) {
                $section->addText($line);
            } else {
                $section->addTextBreak(1);
            }
        }
        
        $fileName = 'Document_Summary_' . date('Ymd_His') . '.docx';
        $tempFile = storage_path('app/temp/' . $fileName);
        
        if (!file_exists(storage_path('app/temp'))) {
            mkdir(storage_path('app/temp'), 0755, true);
        }
        
        $objWriter = IOFactory::createWriter($phpWord, 'Word2007');
        $objWriter->save($tempFile);
        
        return response()->download($tempFile)->deleteFileAfterSend(true);
    }
}
