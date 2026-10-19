<?php

namespace App\Http\Controllers;

use App\Models\QueuePortalSubscription;
use App\Services\QueuePortalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\Response;

class QueuePortalController extends Controller
{
    public function index(Request $request, QueuePortalService $portal): View|Response
    {
        $raw = trim((string) $request->query('oqueue', ''));
        if ($raw !== '') {
            $oqueue = $portal->normalizeOqueue($raw);
            if ($oqueue === null) {
                return view('queue-portal.index', [
                    'error' => 'เลขคิวใช้ได้เฉพาะตัวอักษรหรือตัวเลข ไม่เกิน 12 หลัก',
                ]);
            }

            return redirect()->route('queue-portal.show', ['oqueue' => $oqueue]);
        }

        return view('queue-portal.index', ['error' => null]);
    }

    public function show(string $oqueue, QueuePortalService $portal): View
    {
        $needle = $portal->normalizeOqueue($oqueue);
        abort_unless($needle !== null, 404);

        try {
            $status = $portal->statusForQueue($needle);
            $unavailable = false;
        } catch (\Throwable $e) {
            report($e);
            $status = null;
            $unavailable = true;
        }

        return view('queue-portal.show', [
            'oqueue' => $needle,
            'status' => $status,
            'unavailable' => $unavailable,
            'pushConfigured' => filled(config('queue_portal.vapid_public')),
        ]);
    }

    public function status(string $oqueue, QueuePortalService $portal): JsonResponse
    {
        $needle = $portal->normalizeOqueue($oqueue);
        if ($needle === null) {
            return response()->json(['found' => false], 404);
        }

        try {
            $status = $portal->statusForQueue($needle);
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['found' => false, 'error' => 'unavailable'], 503);
        }

        if ($status === null) {
            return response()->json([
                'found' => false,
                'oqueue' => $needle,
            ]);
        }

        return response()->json(['found' => true] + $status);
    }

    public function pushKey(): JsonResponse
    {
        $key = config('queue_portal.vapid_public');
        if (! is_string($key) || $key === '') {
            return response()->json(['configured' => false], 404);
        }

        return response()->json(['configured' => true, 'key' => $key]);
    }

    public function subscribe(Request $request, string $oqueue, QueuePortalService $portal): JsonResponse
    {
        $needle = $portal->normalizeOqueue($oqueue);
        if ($needle === null) {
            return response()->json(['ok' => false], 404);
        }

        $data = $request->validate([
            'endpoint' => ['required', 'string', 'max:512'],
            'keys.p256dh' => ['required', 'string', 'max:255'],
            'keys.auth' => ['required', 'string', 'max:255'],
        ]);

        $today = now('Asia/Bangkok')->toDateString();
        $existing = QueuePortalSubscription::query()->where('endpoint', $data['endpoint'])->first();
        $sameVisit = $existing
            && $existing->oqueue === $needle
            && optional($existing->visit_date)->toDateString() === $today;

        QueuePortalSubscription::query()->updateOrCreate(
            ['endpoint' => $data['endpoint']],
            [
                'p256dh' => $data['keys']['p256dh'],
                'auth_token' => $data['keys']['auth'],
                'oqueue' => $needle,
                'visit_date' => $today,
                'notified_soon_at' => $sameVisit ? $existing->notified_soon_at : null,
                'notified_called_at' => $sameVisit ? $existing->notified_called_at : null,
            ]
        );

        return response()->json(['ok' => true]);
    }
}
