<?php

namespace App\Services\Auth;

use App\Models\User;
use App\Services\FshhChat\FshhChatSyncService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class UserLineAccountMergeService
{
    public function __construct(
        protected readonly FshhChatSyncService $fshhChat,
    ) {}

    public function isIncompleteLineStub(User $user): bool
    {
        $email = strtolower(trim((string) $user->email));
        $name = trim((string) $user->name);

        return ! $user->profile_completed
            && (str_ends_with($email, '@line.login') || $name === '');
    }

    /**
     * ย้าย LINE จากบัญชีชั่วคราวไปบัญชีจริง แล้วลบบัญชีชั่วคราว
     */
    public function absorbStub(User $stub, User $keep): User
    {
        if ($stub->id === $keep->id) {
            return $keep;
        }

        DB::transaction(function () use ($stub, $keep): void {
            $keep->update([
                'line_id' => $stub->line_id ?: $keep->line_id,
                'line_display_name' => $stub->line_display_name ?: $keep->line_display_name,
                'line_picture_url' => $stub->line_picture_url ?: $keep->line_picture_url,
                'avatar' => $keep->avatar ?: $stub->avatar,
            ]);

            if ($keep->departments()->count() === 0 && $stub->departments()->count() > 0) {
                $sync = [];
                foreach ($stub->departments as $dept) {
                    $sync[$dept->id] = ['is_primary' => (bool) $dept->pivot->is_primary];
                }
                $keep->departments()->sync($sync);
            }

            $stub->departments()->detach();
            $stub->positions()->detach();
            $stub->roles()->detach();
            $stub->forceFill([
                'line_id' => null,
                'email' => 'merged-'.$stub->id.'@line.invalid',
            ])->save();
            $stub->delete();
        });

        $keep = $keep->fresh(['departments']) ?? $keep;

        try {
            $this->fshhChat->syncUser($keep);
        } catch (\Throwable $e) {
            Log::warning('FSHH Chat sync after LINE stub merge failed: '.$e->getMessage());
        }

        return $keep;
    }
}
