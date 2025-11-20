<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class LineAuthController extends Controller
{
    public function redirectToProvider()
    {
        $state = Str::random(40);
        session()->put('line_oauth_state', $state);

        $query = http_build_query([
            'response_type' => 'code',
            'client_id' => config('services.line.client_id', env('LINE_LOGIN_CHANNEL_ID')),
            'redirect_uri' => config('services.line.redirect', env('LINE_OAUTH_REDIRECT')),
            'state' => $state,
            'scope' => 'profile openid email',
        ]);

        return redirect('https://access.line.me/oauth2/v2.1/authorize?' . $query);
    }

    public function handleProviderCallback(Request $request)
    {
        $state = session()->pull('line_oauth_state');

        if (strlen($state) > 0 && $state !== $request->input('state')) {
            return redirect()->route('login')->withErrors(['email' => 'Invalid state parameter']);
        }

        $code = $request->input('code');

        if (!$code) {
            return redirect()->route('login')->withErrors(['email' => 'Login canceled or failed']);
        }

        // Exchange code for access token
        $response = Http::asForm()->post('https://api.line.me/oauth2/v2.1/token', [
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => config('services.line.redirect', env('LINE_OAUTH_REDIRECT')),
            'client_id' => config('services.line.client_id', env('LINE_LOGIN_CHANNEL_ID')),
            'client_secret' => config('services.line.client_secret', env('LINE_LOGIN_CHANNEL_SECRET')),
        ]);

        if ($response->failed()) {
            Log::error('LINE Login Token Error: ' . $response->body());
            return redirect()->route('login')->withErrors(['email' => 'Failed to get access token from LINE']);
        }

        $tokens = $response->json();
        $accessToken = $tokens['access_token'];
        $idToken = $tokens['id_token'] ?? null;

        // Get User Profile
        $profileResponse = Http::withToken($accessToken)->get('https://api.line.me/v2/profile');

        if ($profileResponse->failed()) {
            Log::error('LINE Login Profile Error: ' . $profileResponse->body());
            return redirect()->route('login')->withErrors(['email' => 'Failed to get user profile from LINE']);
        }

        $profile = $profileResponse->json();
        $lineUserId = $profile['userId'];
        $displayName = $profile['displayName'];
        $pictureUrl = $profile['pictureUrl'] ?? null;

        // Handle Linked Account (User already logged in)
        if (Auth::check()) {
            $currentUser = Auth::user();
            
            // Check if this LINE ID is already linked to another account
            $existingUser = User::where('line_id', $lineUserId)->where('id', '!=', $currentUser->id)->first();
            
            if ($existingUser) {
                return redirect()->route('profile.edit')->withErrors(['email' => 'This LINE account is already linked to another user.']);
            }

            // Link the account
            /** @var \App\Models\User $currentUser */
            $currentUser->update([
                'line_id' => $lineUserId,
                'avatar' => $pictureUrl,
            ]);

            return redirect()->route('profile.edit')->with('status', 'line-linked');
        }

        // Try to get email from ID Token if available
        $email = null;
        if ($idToken) {
            // Simple decode of JWT payload (middle part)
            $parts = explode('.', $idToken);
            if (count($parts) === 3) {
                $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
                $email = $payload['email'] ?? null;
            }
        }

        // Find or Create User
        $user = User::where('line_id', $lineUserId)->first();

        if (!$user) {
            // If email exists, link account
            if ($email) {
                $user = User::where('email', $email)->first();
                if ($user) {
                    $user->update([
                        'line_id' => $lineUserId,
                        'avatar' => $pictureUrl,
                    ]);
                }
            }
        }

        if (!$user) {
            // Create new user
            // Note: If email is null, we might need to generate a fake one or ask user to provide it.
            // For now, we'll generate a placeholder email if not provided.
            $email = $email ?? $lineUserId . '@line.login';
            
            // Check if email already exists (collision with placeholder)
            if (User::where('email', $email)->exists()) {
                 return redirect()->route('login')->withErrors(['email' => 'Email already exists. Please login with email and password first to link account.']);
            }

            $user = User::create([
                'name' => $displayName,
                'email' => $email,
                'password' => bcrypt(Str::random(16)), // Random password
                'line_id' => $lineUserId,
                'avatar' => $pictureUrl,
            ]);
        } else {
            // Update avatar if changed
            if ($user->avatar !== $pictureUrl) {
                $user->update(['avatar' => $pictureUrl]);
            }
        }

        Auth::login($user);

        return redirect()->intended(route('dashboard'));
    }
}
