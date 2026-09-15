<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Session;

class SetLocale
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        $allowed = ['th', 'en'];
        $locale = Session::get('locale', config('app.locale', 'th'));

        if (! in_array($locale, $allowed, true)) {
            $locale = 'th';
        }

        // First visit: persist Thai (or configured default) so UI stays consistent.
        if (! Session::has('locale')) {
            Session::put('locale', $locale);
        }

        App::setLocale($locale);

        return $next($request);
    }
}
