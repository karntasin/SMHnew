<?php

namespace App\Http\Controllers;

use App\Services\FshhChat\FshhChatSyncService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class FshhChatController extends Controller
{
    public function __construct(
        protected readonly FshhChatSyncService $chat,
    ) {}

    /**
     * ช่องทางสาธารณะ /s-chat — ผู้ล็อกอินได้ session ทันที, แขกไปหน้า login ของ Worker
     * ลิงก์เดิม (/fshh-chat/open, workers.dev) ยังใช้ได้ตามเดิม
     */
    public function entry(Request $request): RedirectResponse
    {
        if ($request->user()) {
            return $this->open($request);
        }

        return redirect()->away($this->workerChatUrl($request));
    }

    public function open(Request $request): RedirectResponse
    {
        $user = $request->user();
        if (! $user) {
            return redirect()->away(url('/login'));
        }

        if (method_exists($user, 'needsPasswordChange') && $user->needsPasswordChange()) {
            return redirect()->away(url('/settings/password'));
        }

        $result = $this->chat->openWebSession($user);
        if (($result['success'] ?? false) === true && ! empty($result['url'])) {
            return redirect()->away($result['url']);
        }

        $liff = trim((string) config('services.fshh_chat.liff_url'));
        if ($liff !== '' && trim((string) $user->line_id) !== '') {
            return redirect()->away($liff);
        }

        return redirect()->away(url('/dashboard'))
            ->with('error', $result['error'] ?? 'เปิด S-Chat ไม่สำเร็จ กรุณาผูก LINE ที่โปรไฟล์แล้วลองใหม่');
    }

    private function workerChatUrl(Request $request): string
    {
        $base = rtrim((string) config('services.fshh_chat.url'), '/');
        if ($base === '') {
            $base = 'https://polished-river-f1bb.karntasin5.workers.dev';
        }

        $qs = $request->getQueryString();

        return $base.'/chat'.($qs ? '?'.$qs : '');
    }
}
