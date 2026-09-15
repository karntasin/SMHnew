<?php

namespace App\Console\Commands;

use App\Models\DocumentAction;
use App\Models\User;
use App\Notifications\DocumentNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

class SendDocumentReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'documents:send-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send reminders for documents not acknowledged within 3 hours';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $threeHoursAgo = now()->subHours(3);
        
        // Find all forwarded actions that:
        // - Are not acknowledged
        // - Were created more than 3 hours ago
        // - Haven't had a reminder sent yet
        $overdueActions = DocumentAction::with(['document', 'sender', 'receiverDepartment'])
            ->where('action_type', 'forward')
            ->whereNull('acknowledged_at')
            ->whereNull('reminder_sent_at')
            ->where('created_at', '<', $threeHoursAgo)
            ->get();
        
        $this->info("Found {$overdueActions->count()} overdue document actions");
        
        foreach ($overdueActions as $action) {
            $document = $action->document;

            if (! $document) {
                continue;
            }

            $notifiedIds = collect();

            if ($action->sender) {
                $receiverName = $action->receiverDepartment?->name ?? 'ผู้รับ';
                $action->sender->notify(new DocumentNotification(
                    $document,
                    'reminder_sender',
                    $receiverName
                ));
                $notifiedIds->push((int) $action->sender->id);
                $this->info("Sent reminder to sender: {$action->sender->name} for document {$document->document_number}");
            }

            $receivers = collect();
            if ($action->receiver_department_id) {
                $receivers = $receivers->merge(User::where('department_id', $action->receiver_department_id)->get());
            }
            if ($action->receiver_user_id && $action->receiverUser) {
                $receivers->push($action->receiverUser);
            }

            $receivers = $receivers->unique('id')->reject(fn (User $user) => $notifiedIds->contains((int) $user->id));
            foreach ($receivers as $receiver) {
                $receiver->notify(new DocumentNotification(
                    $document,
                    'reminder_receiver',
                    $action->sender?->name ?? 'ผู้ส่ง'
                ));
            }

            if ($receivers->isNotEmpty()) {
                $this->info("Sent reminders to {$receivers->count()} receivers for document {$document->document_number}");
            }

            $action->update(['reminder_sent_at' => now()]);
        }
        
        $this->info('Document reminder process completed');
        
        return Command::SUCCESS;
    }
}
