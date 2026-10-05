<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\FshhChat\FshhChatSyncService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RefreshLineProfilesCommand extends Command
{
    protected $signature = 'line:refresh-profiles {--user= : Specific user ID}';

    protected $description = 'Refresh LINE profile pictures and names from LINE Messaging API';

    public function handle(FshhChatSyncService $chatSync): int
    {
        $token = (string) config('services.line.messaging_token');
        if (trim($token) === '') {
            $this->error('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN is not configured.');
            return self::FAILURE;
        }

        $userId = $this->option('user');
        $query = User::query()->whereNotNull('line_id')->where('line_id', '!=', '');
        if ($userId) {
            $query->where('id', $userId);
        }

        $users = $query->get();
        $this->info("Found {$users->count()} users with LINE ID. Starting profile refresh...");

        $updated = 0;
        $failed = 0;

        foreach ($users as $user) {
            $lineId = trim((string) $user->line_id);
            $this->line("Checking User #{$user->id}: {$user->name} (LINE: {$lineId})");

            try {
                $response = Http::withToken($token)
                    ->timeout(10)
                    ->get("https://api.line.me/v2/bot/profile/{$lineId}");

                if ($response->successful()) {
                    $profile = $response->json();
                    $freshPic = $profile['pictureUrl'] ?? null;
                    $freshName = $profile['displayName'] ?? null;

                    $changes = [];
                    if ($freshName && $freshName !== $user->line_display_name) {
                        $changes['line_display_name'] = $freshName;
                    }

                    if ($freshPic && $freshPic !== $user->line_picture_url) {
                        $changes['line_picture_url'] = $freshPic;
                        // If user avatar was the old LINE picture or empty, update avatar too
                        if (empty($user->avatar) || str_starts_with((string) $user->avatar, 'https://profile.line-scdn.net')) {
                            $changes['avatar'] = $freshPic;
                        }
                    }

                    if (!empty($changes)) {
                        $user->update($changes);
                        $this->info("  --> Updated: " . json_encode($changes, JSON_UNESCAPED_UNICODE));
                        $updated++;
                    } else {
                        $this->comment("  --> Up to date.");
                    }
                } else {
                    $this->warn("  --> LINE API response ({$response->status()}): {$response->body()}");
                    
                    // If current avatar is broken (404), reset it so fallback avatar shows instead of broken image
                    if (!empty($user->avatar) && str_starts_with((string) $user->avatar, 'https://profile.line-scdn.net')) {
                        $isBroken = $this->isUrlBroken($user->avatar);
                        if ($isBroken) {
                            $user->update([
                                'avatar' => null,
                                'line_picture_url' => null,
                            ]);
                            $this->error("  --> Cleared expired 404 avatar URL for User #{$user->id}");
                            $updated++;
                        }
                    }
                    $failed++;
                }
            } catch (\Throwable $e) {
                $this->error("  --> Exception: {$e->getMessage()}");
                $failed++;
            }

            // Sync fresh profile to FSHH Chat
            try {
                $chatSync->syncUser($user);
            } catch (\Throwable) {
                // ignore
            }
        }

        $this->info("Completed. Updated: {$updated}, Failed/Unchanged: {$failed}");
        return self::SUCCESS;
    }

    private function isUrlBroken(string $url): bool
    {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 4);
        curl_setopt($ch, CURLOPT_RANGE, '0-10');
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ($code < 200 || $code >= 400);
    }
}
