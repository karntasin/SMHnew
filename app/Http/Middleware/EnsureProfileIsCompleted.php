<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureProfileIsCompleted
{
    /**
     * Handle an incoming request.
     * Redirect to profile completion page if LINE user hasn't completed their profile.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // If user is authenticated, has LINE ID, but profile is not completed
        if ($user && $user->line_id && !$user->profile_completed) {
            // Allow access to profile completion routes
            if ($request->routeIs('profile.complete', 'profile.complete.update')) {
                return $next($request);
            }

            // Allow logout
            if ($request->routeIs('logout')) {
                return $next($request);
            }

            return redirect()->route('profile.complete');
        }

        return $next($request);
    }
}
