<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class HosxpService
{
    protected $baseUrl;
    protected $apiKey;

    public function __construct()
    {
        // กำหนดค่า Config จาก .env (เดี๋ยวเราไปเพิ่มกัน)
        $this->baseUrl = config('services.hosxp.api_url'); 
        $this->apiKey = config('services.hosxp.api_key');
    }

    /**
     * ดึง Session ID จาก HOSxP API
     */
    public function getFinanceSessionId()
    {
        try {
            // ตัวอย่างการยิง Request (ต้องปรับแก้ตาม API Spec จริงของ HOSxP/BMS)
            $response = Http::timeout(5)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $this->apiKey,
                    'Accept' => 'application/json',
                ])
                ->get($this->baseUrl . '/api/get-finance-session'); // <-- แก้ Path นี้ตามจริง

            if ($response->successful()) {
                // สมมติว่า API ตอบกลับมาเป็น JSON: { "session_id": "XYZ..." }
                return $response->json('session_id');
            }

            Log::error('HOSxP API Error: ' . $response->body());
            return null;

        } catch (\Exception $e) {
            Log::error('HOSxP Connection Error: ' . $e->getMessage());
            return null;
        }
    }
}
