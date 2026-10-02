<?php

namespace App\Http\Controllers;

use App\Models\TvDisplaySetting;
use App\Models\TvMediaPlaylist;
use App\Services\HosxpQueueService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\View\View;

class TvBoardController extends Controller
{
    /** อายุ cache (วินาที) — สั้นพอที่จอยังดูสดอยู่ แต่กันการยิง query ซ้ำจากหลายจอ/หลาย client พร้อมกัน */
    private const QUEUE_CACHE_TTL = 3;

    public function __construct(private HosxpQueueService $queueService)
    {
    }

    public function show(string $boardKey = 'default'): View
    {
        $settings = TvDisplaySetting::firstOrCreate(['board_key' => $boardKey]);
        $media = TvMediaPlaylist::activeForBoard($boardKey)->get();

        return view('tv.board', compact('settings', 'media', 'boardKey'));
    }

    /**
     * Endpoint ที่ Alpine.js polling เรียกทุก N วินาที — คืน JSON เท่านั้น
     *
     * ป้องกัน HOSxP โหลดสูง: ใช้ Cache::remember ระยะสั้นมาก (3 วินาที) เพื่อให้ทุกจอ/ทุก
     * client ที่ poll เข้ามาพร้อมกันภายในหน้าต่างเวลานั้น "ใช้ผลลัพธ์เดียวกัน" แทนที่จะยิง
     * query ไป HOSxP ซ้ำต่อ request — สำคัญมากเมื่อมีหลายจอทีวีหรือมีคน refresh พร้อมกัน
     */
    public function queueData(string $boardKey = 'default'): JsonResponse
    {
        $grouped = Cache::remember(
            "tv-board:{$boardKey}:queue-data",
            self::QUEUE_CACHE_TTL,
            fn () => $this->queueService->getQueueGroupedByRoom($boardKey)
        );

        $media = Cache::remember(
            "tv-board:{$boardKey}:media",
            self::QUEUE_CACHE_TTL,
            fn () => TvMediaPlaylist::activeForBoard($boardKey)->get()
        );

        $pendingLabXray = Cache::remember(
            "tv-board:{$boardKey}:pending-lab-xray",
            self::QUEUE_CACHE_TTL,
            fn () => $this->queueService->getPendingLabXrayPatients($boardKey)
        );

        $pendingScreening = Cache::remember(
            "tv-board:{$boardKey}:pending-screening",
            self::QUEUE_CACHE_TTL,
            fn () => $this->queueService->getPendingScreeningPatients($boardKey)
        );

        return response()->json([
            'generated_at' => now('Asia/Bangkok')->toIso8601String(),
            'rooms' => $grouped,
            'media' => $media,
            'pending_lab_xray' => $pendingLabXray,
            'pending_screening' => $pendingScreening,
        ]);
    }

    /**
     * Endpoint สำหรับจอ ER ใหม่ (3 sections: คัดกรอง/รอตรวจ/กำลังตรวจ)
     * Alpine.js polling เรียกทุก N วินาที — คืน JSON เท่านั้น
     */
    public function erQueueData(): JsonResponse
    {
        $sections = Cache::remember(
            'tv-board:er:sections',
            self::QUEUE_CACHE_TTL,
            fn () => $this->queueService->getErSections()
        );

        $media = Cache::remember(
            'tv-board:003:media',
            self::QUEUE_CACHE_TTL,
            fn () => TvMediaPlaylist::activeForBoard('003')->get()
        );

        return response()->json([
            'generated_at' => now('Asia/Bangkok')->toIso8601String(),
            'media' => $media,
            ...$sections,
        ]);
    }
}
