<?php

namespace App\Http\Middleware;

use App\Services\Auth\UserLineAccountMergeService;
use App\Support\PostLoginRedirect;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureProfileIsCompleted
{
    /**
     * Handle an incoming request.
     * Redirect to profile completion only for incomplete LINE registrations
     * (stub accounts), not for existing email/password users who later linked LINE.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->line_id && ! $user->profile_completed) {
            $isLineStub = app(UserLineAccountMergeService::class)->isIncompleteLineStub($user);

            // Existing email accounts (e.g. seeded admin) may have linked LINE while
            // profile_completed was still false — do not trap them on the welcome form.
            if (! $isLineStub) {
                return $next($request);
            }

            if ($request->routeIs('profile.complete', 'profile.complete.update', 'profile.roster-lookup')) {
                return $next($request);
            }

            if ($request->routeIs('logout')) {
                return $next($request);
            }

            return redirect()->away(PostLoginRedirect::toCurrent('profile/complete', $request));
        }

        return $next($request);
    }
}
