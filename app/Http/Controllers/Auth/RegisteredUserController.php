<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Controllers\LineAuthController;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Show the LINE-only registration page.
     */
    public function create(): Response
    {
        $lineEnabled = (bool) config('services.line.enabled');

        return Inertia::render('auth/register', [
            'lineLoginEnabled' => $lineEnabled,
            'lineQr' => $lineEnabled ? LineAuthController::createDesktopTicket('register') : null,
        ]);
    }

    /**
     * Email/password signup is disabled — new accounts must start with LINE.
     */
    public function store(): RedirectResponse
    {
        return redirect()->route('register')->withErrors([
            'line' => 'ต้องสมัครสมาชิกด้วย LINE เท่านั้น',
        ]);
    }
}
