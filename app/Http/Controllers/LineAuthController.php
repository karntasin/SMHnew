<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\Auth\UserLineAccountMergeService;
use App\Services\FshhChat\FshhChatSyncService;
use App\Services\Line\LineMessagingService;
use App\Support\LineUrls;
use App\Support\PostLoginRedirect;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;

class LineAuthController extends Controller
{
    public function redirectToProvider(Request $request)
    {
        if (! config('services.line.enabled') || ! config('services.line.client_id')) {
            return redirect()->route('login')->withErrors(['email' => 'ยังไม่ได้เปิดใช้งาน LINE Login']);
        }

        $state = Str::random(40);
        $nonce = Str::random(32);
        $intent = (string) $request->query('intent', Auth::check() ? 'link' : 'login');
        $ticket = $request->filled('ticket') ? (string) $request->query('ticket') : null;

        session()->put('line_oauth_state', $state);
        session()->put('line_oauth_nonce', $nonce);
        session()->put('line_auth_intent', $intent);
        if ($ticket) {
            session()->put('line_qr_consume', $ticket);
        }

        Cache::put('line_oauth:'.$state, [
            'intent' => $intent,
            'ticket' => $ticket,
            'return_base' => PostLoginRedirect::normalizeBase(PostLoginRedirect::currentBase($request), $request),
            'nonce' => $nonce,
        ], now()->addMinutes(15));

        return redirect(self::authorizeUrl($state, $nonce));
    }

    public function handleProviderCallback(Request $request, LineMessagingService $messaging)
    {
        $incomingState = (string) $request->input('state', '');
        $existingQr = $incomingState !== '' ? Cache::get('line_qr:'.$incomingState) : null;
        if (is_array($existingQr) && ($existingQr['status'] ?? '') === 'ready') {
            $readyUser = User::query()->find($existingQr['user_id'] ?? 0);

            return $this->finishQrTicket(
                $request,
                $readyUser,
                $incomingState,
                (string) ($existingQr['intent'] ?? 'login'),
                $messaging,
                (string) ($readyUser?->line_id ?? ''),
            );
        }

        $qrTicket = $this->pendingQrTicket($incomingState);
        $oauthMeta = $incomingState !== '' ? Cache::pull('line_oauth:'.$incomingState) : null;
        $sessionState = session()->pull('line_oauth_state');
        $qrPayload = $qrTicket ? Cache::get('line_qr:'.$qrTicket) : null;
        $intent = 'login';
        if (is_array($qrPayload) && isset($qrPayload['intent'])) {
            $intent = (string) $qrPayload['intent'];
        } elseif (is_array($oauthMeta) && isset($oauthMeta['intent'])) {
            $intent = (string) $oauthMeta['intent'];
        } else {
            $intent = (string) session()->pull('line_auth_intent', 'login');
        }
        $returnBase = PostLoginRedirect::normalizeBase(
            is_array($qrPayload) && ! empty($qrPayload['return_base'])
                ? (string) $qrPayload['return_base']
                : (is_array($oauthMeta) && ! empty($oauthMeta['return_base'])
                    ? (string) $oauthMeta['return_base']
                    : PostLoginRedirect::preferredBase($request)),
            $request
        );

        if (! $qrTicket && ! is_array($oauthMeta) && strlen((string) $sessionState) > 0 && $sessionState !== $incomingState) {
            return redirect()->away(PostLoginRedirect::toCurrent('login', $request))->withErrors(['email' => 'การยืนยัน LINE ไม่ถูกต้อง กรุณาลองใหม่']);
        }

        $code = $request->input('code');
        if (! $code) {
            return redirect()->away(PostLoginRedirect::toCurrent('login', $request))->withErrors(['email' => 'ยกเลิกหรือเข้าสู่ระบบ LINE ไม่สำเร็จ']);
        }

        $redirectUri = LineUrls::callback();
        $response = Http::asForm()
            ->timeout(20)
            ->connectTimeout(10)
            ->post('https://api.line.me/oauth2/v2.1/token', [
                'grant_type' => 'authorization_code',
                'code' => $code,
                'redirect_uri' => $redirectUri,
                'client_id' => config('services.line.client_id'),
                'client_secret' => config('services.line.client_secret'),
            ]);

        if ($response->failed()) {
            Log::error('LINE Login Token Error: '.$response->body());

            return redirect()->away(PostLoginRedirect::toCurrent('login', $request))->withErrors(['email' => 'แลก token จาก LINE ไม่สำเร็จ ตรวจ Callback URL ให้ตรงกับ LINE Developers']);
        }

        $tokens = $response->json();
        $accessToken = $tokens['access_token'] ?? null;
        $idToken = $tokens['id_token'] ?? null;

        $profileResponse = Http::withToken($accessToken)
            ->timeout(20)
            ->connectTimeout(10)
            ->get('https://api.line.me/v2/profile');
        if ($profileResponse->failed()) {
            Log::error('LINE Login Profile Error: '.$profileResponse->body());

            return redirect()->away(PostLoginRedirect::toCurrent('login', $request))->withErrors(['email' => 'ดึงโปรไฟล์จาก LINE ไม่สำเร็จ']);
        }

        $profile = $profileResponse->json();
        $lineUserId = (string) ($profile['userId'] ?? '');
        $displayName = (string) ($profile['displayName'] ?? '');
        $pictureUrl = $profile['pictureUrl'] ?? null;

        if ($lineUserId === '') {
            return redirect()->away(PostLoginRedirect::toCurrent('login', $request))->withErrors(['email' => 'LINE ไม่ส่งรหัสผู้ใช้มา']);
        }

        // QR จากเครื่องเดสก์ท็อป — อย่าใช้เซสชันบนโดเมนอุโมงค์ แล้วเด้งไป /settings/profile ที่ LAN
        if (Auth::check() && ! $qrTicket) {
            return $this->linkCurrentUser($lineUserId, $displayName, $pictureUrl, $returnBase);
        }

        $email = $this->emailFromIdToken(is_string($idToken) ? $idToken : null);

        $user = User::query()->where('line_id', $lineUserId)->first();

        if (! $user && $email) {
            $user = User::query()->where('email', $email)->first();
            if ($user) {
                $user->update([
                    'line_id' => $lineUserId,
                    'line_display_name' => $displayName,
                    'line_picture_url' => $pictureUrl,
                    'avatar' => $user->avatar ?: $pictureUrl,
                ]);
            }
        }

        if (! $user) {
            if ($intent !== 'register') {
                return redirect()->away(PostLoginRedirect::toCurrent('login', $request))->withErrors([
                    'email' => 'ยังไม่มีบัญชีที่ผูก LINE นี้ กรุณาเข้าสู่ระบบด้วยอีเมลแล้วกดเชื่อมต่อ LINE ที่โปรไฟล์ หรือสมัครสมาชิกใหม่ด้วย LINE',
                ]);
            }

            $email = $email ?: $lineUserId.'@line.login';
            if (User::query()->where('email', $email)->exists()) {
                return redirect()->away(PostLoginRedirect::toCurrent('login', $request))->withErrors(['email' => 'พบบัญชีอีเมลนี้อยู่แล้ว กรุณาเข้าสู่ระบบแล้วผูก LINE ที่โปรไฟล์']);
            }

            $user = User::create([
                'name' => '',
                'line_display_name' => $displayName,
                'email' => $email,
                'password' => bcrypt(Str::random(32)),
                'line_id' => $lineUserId,
                'avatar' => $pictureUrl,
                'line_picture_url' => $pictureUrl,
                'profile_completed' => false,
            ]);
            $user->assignRole('user');
        } else {
            $user->update([
                'line_display_name' => $displayName,
                'line_picture_url' => $pictureUrl,
                'avatar' => ($user->avatar === $user->line_picture_url || ! $user->avatar) ? $pictureUrl : $user->avatar,
            ]);
        }

        $ticket = $qrTicket
            ?: session()->pull('line_qr_consume')
            ?: (is_array($oauthMeta) ? ($oauthMeta['ticket'] ?? null) : null);

        if ($ticket) {
            Cache::put('line_qr:'.$ticket, [
                'status' => 'ready',
                'user_id' => $user->id,
                'intent' => $intent,
                'return_base' => $returnBase,
            ], now()->addMinutes(8));

            return $this->finishQrTicket($request, $user, (string) $ticket, $intent, $messaging, $lineUserId);
        }

        return $this->loginOnCurrentHost($request, $user, $intent, $messaging, $lineUserId);
    }

    private function linkCurrentUser(string $lineUserId, string $displayName, ?string $pictureUrl, ?string $returnBase = null)
    {
        $currentUser = Auth::user();
        $existingUser = User::query()->where('line_id', $lineUserId)->where('id', '!=', $currentUser->id)->first();
        $base = $returnBase ?: PostLoginRedirect::preferredBase();

        if ($existingUser) {
            $merge = app(UserLineAccountMergeService::class);
            if ($merge->isIncompleteLineStub($existingUser)) {
                $currentUser = $merge->absorbStub($existingUser, $currentUser);
            } else {
                    return redirect()->away(PostLoginRedirect::join($base, 'settings/profile'))->withErrors(['line' => 'บัญชี LINE นี้ถูกผูกกับผู้ใช้อื่นแล้ว']);
            }
        }

        $currentUser->update([
            'line_id' => $lineUserId,
            'line_display_name' => $displayName,
            'line_picture_url' => $pictureUrl,
            'avatar' => $currentUser->avatar ?: $pictureUrl,
        ]);

        if ($currentUser->profile_completed) {
            $this->syncFshhChat($currentUser);
        }

        return redirect()->away(PostLoginRedirect::join($base, 'settings/profile'))->with('status', 'line-linked');
    }

    private function syncFshhChat(User $user): void
    {
        try {
            app(FshhChatSyncService::class)->syncUser($user->fresh(['departments']) ?? $user);
        } catch (\Throwable $e) {
            Log::warning('FSHH Chat sync after LINE login failed: '.$e->getMessage());
        }
    }

    /**
     * Only new/incomplete LINE stub accounts must finish the welcome form.
     * Existing email users who linked LINE keep using the app normally.
     */
    private function needsProfileCompletion(User $user): bool
    {
        if ($user->profile_completed) {
            return false;
        }

        return app(UserLineAccountMergeService::class)->isIncompleteLineStub($user);
    }

    private function emailFromIdToken(?string $idToken): ?string
    {
        if (! $idToken) {
            return null;
        }

        $parts = explode('.', $idToken);
        if (count($parts) !== 3) {
            return null;
        }

        $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')) ?: '', true);

        return is_array($payload) ? ($payload['email'] ?? null) : null;
    }

    /**
     * QR ชี้ไปที่ LINE Authorize โดยตรง ไม่ผ่านหน้าเว็บ/ngrok ก่อน
     *
     * scanUrl = ให้มือถือสแกนแล้วล็อกอินใน LINE
     * popupUrl = เปิดหน้าต่าง LINE QR บนเดสก์ท็อป
     *
     * @return array{ticket: string, scanUrl: string, popupUrl: string}
     */
    public static function createDesktopTicket(string $intent = 'login'): array
    {
        $ticket = Str::random(48);
        $nonce = Str::random(32);
        Cache::put('line_qr:'.$ticket, [
            'status' => 'pending',
            'user_id' => null,
            'intent' => $intent,
            'nonce' => $nonce,
            'return_base' => PostLoginRedirect::normalizeBase(PostLoginRedirect::currentBase(request())),
        ], now()->addMinutes(8));
        session(['line_qr_ticket' => $ticket]);
        session()->forget('url.intended');

        return [
            'ticket' => $ticket,
            'scanUrl' => self::authorizeUrl($ticket, $nonce, preferLineQr: false),
            'popupUrl' => self::authorizeUrl($ticket, $nonce, preferLineQr: true),
        ];
    }

    private static function authorizeUrl(string $state, string $nonce, bool $preferLineQr = false): string
    {
        $params = [
            'response_type' => 'code',
            'client_id' => config('services.line.client_id'),
            'redirect_uri' => LineUrls::callback(),
            'state' => $state,
            'nonce' => $nonce,
            'scope' => 'profile openid',
            'bot_prompt' => 'normal',
        ];

        if ($preferLineQr) {
            $params['initial_amr_display'] = 'lineqr';
            $params['switch_amr'] = 'false';
        }

        $query = http_build_query($params, '', '&', PHP_QUERY_RFC3986);

        return 'https://access.line.me/oauth2/v2.1/authorize?'.$query;
    }

    private function pendingQrTicket(string $state): ?string
    {
        if ($state === '') {
            return null;
        }

        $data = Cache::get('line_qr:'.$state);
        if (! is_array($data) || ($data['status'] ?? '') !== 'pending') {
            return null;
        }

        return $state;
    }

    public function qrStatus()
    {
        $ticket = (string) session('line_qr_ticket');
        if ($ticket === '') {
            return response()->json(['status' => 'expired']);
        }

        $data = Cache::get('line_qr:'.$ticket);

        return response()->json([
            'status' => is_array($data) ? ($data['status'] ?? 'expired') : 'expired',
        ]);
    }

    public function qrClaim(Request $request)
    {
        $ticket = (string) session()->pull('line_qr_ticket');
        $data = $ticket !== '' ? Cache::pull('line_qr:'.$ticket) : null;

        if (! is_array($data) || ($data['status'] ?? '') !== 'ready' || empty($data['user_id'])) {
            return redirect()->away(PostLoginRedirect::to('login'))
                ->withErrors(['email' => 'ยังไม่ได้ยืนยันจาก LINE หรือ QR หมดอายุ กรุณาสแกนใหม่']);
        }

        return $this->loginAndRedirectHome($request, (int) $data['user_id'], $data['return_base'] ?? null);
    }

    public function transfer(Request $request)
    {
        $token = (string) $request->query('token', '');
        $cacheKey = $token !== '' ? 'line_transfer:'.$token : '';
        $data = $cacheKey !== '' ? Cache::get($cacheKey) : null;

        if (! is_array($data) || empty($data['user_id'])) {
            if (Auth::check()) {
                $authed = Auth::user();
                if ($authed && $this->needsProfileCompletion($authed)) {
                    return redirect()->away(PostLoginRedirect::toCurrent('profile/complete', $request));
                }

                return redirect()->away(PostLoginRedirect::toCurrent('dashboard', $request));
            }

            return redirect()->away(PostLoginRedirect::toCurrent('login', $request))
                ->withErrors(['email' => 'ลิงก์เข้าสู่ระบบหมดอายุ กรุณาลองใหม่']);
        }

        Cache::forget($cacheKey);

        return $this->loginAndRedirectHome($request, (int) $data['user_id'], $data['return_base'] ?? null);
    }

    private function loginOnCurrentHost(Request $request, User $user, string $intent, LineMessagingService $messaging, string $lineUserId)
    {
        Auth::login($user);
        $request->session()->regenerate();
        session()->forget('url.intended');

        if ($this->needsProfileCompletion($user)) {
            if ($intent === 'register') {
                $messaging->pushText(
                    $lineUserId,
                    'ยืนยันตัวตนด้วย LINE สำเร็จแล้ว กรุณากลับไปกรอกข้อมูลเพิ่มเติมบนเว็บเพื่อสมัครสมาชิกให้ครบ'
                );
            }

            return redirect()->away(PostLoginRedirect::toCurrent('profile/complete', $request));
        }

        $this->syncFshhChat($user);

        return redirect()->away(PostLoginRedirect::sanitizeIntendedOnCurrentHost(
            null,
            'dashboard',
            $request
        ));
    }

    private function loginAndRedirectHome(Request $request, int $userId, ?string $returnBase = null)
    {
        $user = User::query()->find($userId);
        if (! $user) {
            return redirect()->away(PostLoginRedirect::toCurrent('login', $request))
                ->withErrors(['email' => 'ไม่พบบัญชีผู้ใช้']);
        }

        Auth::login($user);
        $request->session()->regenerate();
        session()->forget('url.intended');

        $onPublicHost = PostLoginRedirect::isPublicTunnelHost($request->getHost());
        $base = $onPublicHost
            ? PostLoginRedirect::currentBase($request)
            : PostLoginRedirect::normalizeBase(
                $returnBase ?: PostLoginRedirect::preferredBase($request),
                $request
            );

        if ($this->needsProfileCompletion($user)) {
            return redirect()->away(PostLoginRedirect::join($base, 'profile/complete', $request));
        }

        $this->syncFshhChat($user);

        return redirect()->away(PostLoginRedirect::join($base, 'dashboard', $request));
    }

    /**
     * QR จากเดสก์ท็อป: ถ้าเป็น popup ให้ปิดแล้วให้แท็บเดิม claim
     * ถ้าเป็นมือถือ/แท็บเดียวกัน (ไม่มี opener) ให้ล็อกอินบนเครื่องนี้แล้วไปกรอกข้อมูลต่อ
     */
    private function finishQrTicket(
        Request $request,
        ?User $user,
        string $ticket,
        string $intent,
        LineMessagingService $messaging,
        string $lineUserId,
    ) {
        if (! $user) {
            return redirect()->away(PostLoginRedirect::toCurrent('login', $request))
                ->withErrors(['email' => 'ไม่พบบัญชีผู้ใช้']);
        }

        $sameSession = (string) session('line_qr_ticket') === $ticket;
        if ($sameSession) {
            session()->forget('line_qr_ticket');

            return $this->loginOnCurrentHost($request, $user, $intent, $messaging, $lineUserId);
        }

        return $this->renderQrScanDonePage(
            $user->display_name,
            $this->makeCurrentHostContinueUrl($user->id, $intent, $request),
            $intent,
        );
    }

    private function renderQrScanDonePage(?string $displayName, string $continueUrl = '', string $intent = 'login')
    {
        return response()->view('auth.line-scan-done', [
            'displayName' => $displayName,
            'continueUrl' => $continueUrl,
            'intent' => $intent,
        ]);
    }

    private function makeCurrentHostContinueUrl(int $userId, string $intent, Request $request): string
    {
        $token = Str::random(48);
        $base = PostLoginRedirect::currentBase($request);

        Cache::put('line_transfer:'.$token, [
            'user_id' => $userId,
            'intent' => $intent,
            'return_base' => $base,
        ], now()->addMinutes(5));

        return PostLoginRedirect::toCurrent('auth/line/transfer?token='.$token, $request);
    }

    private function shouldHandoffToReturnBase(Request $request, string $returnBase): bool
    {
        $here = strtolower($request->getHost());
        $returnHost = strtolower((string) (parse_url($returnBase, PHP_URL_HOST) ?: ''));

        if ($returnHost === '' || $returnHost === $here) {
            return false;
        }

        return PostLoginRedirect::isPublicTunnelHost($here);
    }

    private function makeLocalTransferUrl(int $userId, string $returnBase, string $intent): string
    {
        $token = Str::random(48);
        $base = PostLoginRedirect::normalizeBase($returnBase);
        if ($base === '' || PostLoginRedirect::isPublicTunnelHost(parse_url($base, PHP_URL_HOST))) {
            $base = PostLoginRedirect::preferredBase();
        }

        Cache::put('line_transfer:'.$token, [
            'user_id' => $userId,
            'intent' => $intent,
            'return_base' => $base,
        ], now()->addMinutes(5));

        return PostLoginRedirect::join($base, 'auth/line/transfer?token='.$token);
    }
}
