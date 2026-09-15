<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\Line\LineMessagingService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class LineWebhookController extends Controller
{
    public function __invoke(Request $request, LineMessagingService $messaging): Response
    {
        $secret = (string) (config('services.line.messaging_secret') ?: config('services.line.client_secret'));
        $body = $request->getContent();
        $signature = (string) $request->header('X-Line-Signature');

        if ($secret !== '' && $signature !== '') {
            $expected = base64_encode(hash_hmac('sha256', $body, $secret, true));
            if (! hash_equals($expected, $signature)) {
                Log::warning('LINE webhook signature mismatch');

                return response('invalid signature', 400);
            }
        }

        $events = $request->input('events', []);
        if (! is_array($events)) {
            return response('OK', 200);
        }

        foreach ($events as $event) {
            $type = $event['type'] ?? null;
            $lineUserId = $event['source']['userId'] ?? null;
            if (! is_string($lineUserId) || $lineUserId === '') {
                continue;
            }

            if ($type === 'follow') {
                $user = User::query()->where('line_id', $lineUserId)->first();
                $text = $user
                    ? 'ยินดีต้อนรับกลับสู่ '.config('app.name').($user->profile_completed ? '' : "\nกรุณากรอกข้อมูลเพิ่มเติมบนเว็บเพื่อใช้งานระบบ")
                    : 'สวัสดีครับ กรุณากดสมัครสมาชิกด้วย LINE บนเว็บไซต์ของ '.config('app.name').' แล้วกรอกข้อมูลเพิ่มเติมให้ครบ';
                $messaging->pushText($lineUserId, $text);
            }
        }

        return response('OK', 200);
    }
}
