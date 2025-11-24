<?php

namespace App\Http\Controllers;

use App\Services\HosxpService;
use Inertia\Inertia;
use Illuminate\Http\Request;

class FinanceDashboardController extends Controller
{
    protected $hosxpService;

    public function __construct(HosxpService $hosxpService)
    {
        $this->hosxpService = $hosxpService;
    }

    public function index()
    {
        // 1. ลองดึง Session ID จาก API
        $sessionId = $this->hosxpService->getFinanceSessionId();

        // 2. ถ้าดึงไม่ได้ (API ล่ม หรือ Config ผิด) ให้ใช้ค่า Default หรือแจ้งเตือน
        // ในที่นี้ผมใส่ค่าเดิมที่คุณเคยให้ไว้เป็น Fallback ชั่วคราว
        if (!$sessionId) {
            $sessionId = '59B43CF3-999C-4F6E-BA83-B4BAA7523D15'; 
        }

        $url = "https://finance-dashboard.bmscloud.in.th?bms-session-id={$sessionId}";

        return Inertia::render('FinanceDashboard', [
            'financeUrl' => $url
        ]);
    }
}
