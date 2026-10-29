<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Controllers\LineAuthController;
use App\Http\Requests\Auth\LoginRequest;
use App\Support\PostLoginRedirect;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /** @var list<string> */
    private const ALLOWED_POST_LOGIN_REDIRECTS = [
        '/settings/password',
        '/settings/profile',
    ];

    /**
     * Show the login page.
     */
    public function create(Request $request): Response
    {
        $lineEnabled = (bool) config('services.line.enabled');
        // createDesktopTicket clears stale url.intended — capture ?redirect= after that
        $lineQr = $lineEnabled ? LineAuthController::createDesktopTicket('login') : null;
        $this->captureSafeRedirect($request);

        return Inertia::render('auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => $request->session()->get('status'),
            'lineLoginEnabled' => $lineEnabled,
            'lineQr' => $lineQr,
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $user = $request->user();

        if ($user && ! $user->hasPasswordSet()) {
            return redirect()->away(PostLoginRedirect::toCurrent('settings/password', $request))
                ->with('status', 'กรุณากำหนดรหัสผ่านสำหรับการเข้าสู่ระบบ');
        }

        $intended = $request->session()->pull('url.intended');

        return redirect()->away(PostLoginRedirect::sanitizeIntendedOnCurrentHost(
            is_string($intended) ? $intended : null,
            'menus-hub',
            $request,
        ));
    }

    /**
     * รับ ?redirect= จาก S-Chat (อนุญาตเฉพาะ path ใน whitelist)
     */
    private function captureSafeRedirect(Request $request): void
    {
        $redirect = $request->query('redirect');
        if (! is_string($redirect) || $redirect === '') {
            return;
        }

        $path = '/'.ltrim(parse_url($redirect, PHP_URL_PATH) ?: $redirect, '/');
        if (! in_array($path, self::ALLOWED_POST_LOGIN_REDIRECTS, true)) {
            return;
        }

        $request->session()->put('url.intended', $path);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
