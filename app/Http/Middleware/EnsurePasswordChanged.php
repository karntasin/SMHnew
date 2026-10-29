<?php

namespace App\Http\Middleware;

use App\Support\PostLoginRedirect;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordChanged
{
    /**
     * บังคับไปตั้งรหัสผ่านใหม่เมื่อยังใช้รหัสเริ่มต้น / must_change_password
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || (! $user->needsPasswordChange() && ! $user->needsUsername())) {
            return $next($request);
        }

        if ($request->routeIs(
            'password.edit',
            'password.update',
            'logout',
            'profile.complete',
            'profile.complete.update',
            'profile.roster-lookup',
            'profile.edit',
            'profile.update',
            'profile.avatar.update',
            'profile.line.unlink',
            'settings.manuals',
            'settings.manuals.*',
        )) {
            return $next($request);
        }

        return redirect()->away(PostLoginRedirect::toCurrent('settings/password', $request));
    }
}
