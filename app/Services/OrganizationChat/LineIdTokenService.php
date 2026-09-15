<?php

namespace App\Services\OrganizationChat;

use Illuminate\Support\Facades\Http;

class LineIdTokenService
{
    public function verify(string $idToken): array
    {
        $channelId = (string) config('services.line.client_id', '');

        if ($channelId === '') {
            return ['success' => false, 'error' => 'LINE channel ID is not configured'];
        }

        $response = Http::asForm()
            ->timeout(20)
            ->post('https://api.line.me/oauth2/v2.1/verify', [
                'id_token' => $idToken,
                'client_id' => $channelId,
            ]);

        if ($response->failed()) {
            return [
                'success' => false,
                'error' => 'LINE Token verification failed: '.$response->body(),
            ];
        }

        $data = $response->json();
        $tokenChannelId = (string) ($data['aud'] ?? $data['client_id'] ?? '');

        if ($tokenChannelId !== $channelId) {
            return [
                'success' => false,
                'error' => 'LINE Channel ID ไม่ตรง (aud='.$tokenChannelId.')',
            ];
        }

        return [
            'success' => true,
            'sub' => (string) ($data['sub'] ?? ''),
            'name' => (string) ($data['name'] ?? 'LINE User'),
            'picture' => $data['picture'] ?? null,
            'email' => $data['email'] ?? null,
        ];
    }
}
