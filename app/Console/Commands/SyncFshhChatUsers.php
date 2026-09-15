<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\FshhChat\FshhChatSyncService;
use Illuminate\Console\Command;

class SyncFshhChatUsers extends Command
{
    protected $signature = 'fshh-chat:sync';

    protected $description = 'Sync LINE-linked users and department groups into FSHH Chat';

    public function handle(FshhChatSyncService $sync): int
    {
        $users = User::query()
            ->whereNotNull('line_id')
            ->where('line_id', '!=', '')
            ->with('departments')
            ->get();

        $this->info('Syncing '.$users->count().' LINE users to FSHH Chat...');
        $ok = 0;
        foreach ($users as $user) {
            $sync->syncUser($user);
            $ok++;
            $this->line(' - '.$user->display_name.' ('.$user->departments->count().' แผนก)');
        }
        $this->info('Done: '.$ok);

        return self::SUCCESS;
    }
}
