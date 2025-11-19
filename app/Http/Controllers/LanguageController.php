<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LanguageController extends Controller
{
    public function switch(string $locale, Request $request): RedirectResponse
    {
        $locale = in_array($locale, ['en', 'th']) ? $locale : config('app.locale');
        session(['locale' => $locale]);
        app()->setLocale($locale);
        return back();
    }

    /**
     * Update locale via POST for faster client-side switching (no redirect).
     */
    public function update(Request $request)
    {
        $locale = $request->input('locale');
        if (!in_array($locale, ['en', 'th'])) {
            return response()->json(['message' => 'Invalid locale'], 422);
        }
        session(['locale' => $locale]);
        app()->setLocale($locale);
        return response()->noContent();
    }
}
