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

    public function open(Request $request): RedirectResponse
    {
        $user = $request->user();
        if (! $user) {
            return redirect()->away(url('/login'));
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
            ->with('error', $result['error'] ?? 'เปิด FSHH Chat ไม่สำเร็จ กรุณาผูก LINE ที่โปรไฟล์แล้วลองใหม่');
    }
}
