<?php

namespace App\Console\Commands;

use App\Models\Document;
use App\Models\DocumentAction;
use App\Notifications\DocumentNotification;
use App\Services\FshhChat\FshhChatSyncService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class CheckDocumentOverdue extends Command
{
    protected $signature = 'documents:check-deadlines';

    protected $description = 'Check document due dates and send warnings/overdue alerts via FSHH Chat';

    public function handle(FshhChatSyncService $fshhChat)
    {
        $now = now();
        $tomorrow = now()->addDay();

        // Find documents that are pending/in_progress and have a due date
        $documents = Document::whereNotIn('status', ['completed', 'cancelled', 'draft'])
            ->whereNotNull('due_date')
            ->get();

        $this->info("Found {$documents->count()} active documents with due dates.");

        foreach ($documents as $doc) {
            $dueDate = Carbon::parse($doc->due_date);
            
            // Determine state
            $isOverdue = $now->gt($dueDate);
            $isWarning = !$isOverdue && $dueDate->isSameDay($tomorrow);

            if (!$isOverdue && !$isWarning) {
                continue; // Not time yet
            }

            // Check if already escalated for this specific condition today
            if ($doc->escalated_at && $doc->escalated_at->isSameDay($now)) {
                continue; // Already notified today
            }

            $actionType = $isOverdue ? 'deadline_overdue' : 'deadline_warning';
            $color = $isOverdue ? '#EF4444' : '#F59E0B'; // Red or Amber

            // Find all current actions to know who is responsible
            $currentActions = DocumentAction::with(['receiverUser', 'receiverDepartment'])
                ->where('document_id', $doc->id)
                ->where('is_current', true)
                ->get();

            $receiverNames = [];
            foreach ($currentActions as $currentAction) {
                if ($currentAction->receiverUser) {
                    // Send personal notification (which forwards to chat)
                    $currentAction->receiverUser->notify(new DocumentNotification($doc, $actionType));
                    $receiverNames[] = $currentAction->receiverUser->name;
                }

                if ($currentAction->receiverDepartment) {
                    // Send department group notification
                    $fshhChat->notifyCard(
                        $currentAction->receiverDepartment,
                        $isOverdue ? "🚨 หนังสือเลยกำหนดส่ง" : "⏳ หนังสือใกล้ถึงกำหนดส่ง",
                        [
                            'เลขที่' => $doc->document_number ?: '-',
                            'เรื่อง' => $doc->title,
                            'กำหนดส่ง' => $dueDate->format('d/m/Y H:i'),
                            'สถานะ' => $isOverdue ? 'เลยกำหนด' : 'ใกล้ถึงกำหนด',
                        ],
                        $color,
                        'high'
                    );
                    $receiverNames[] = $currentAction->receiverDepartment->name;
                }
            }

            $receiverSummary = !empty($receiverNames) ? implode(', ', array_unique($receiverNames)) : 'ผู้รับ';

            // Escalation logic: If it's overdue by more than 1 day, notify the sender/creator
            if ($isOverdue && $now->diffInDays($dueDate) >= 1) {
                if ($doc->creator) {
                    $doc->creator->notify(new DocumentNotification($doc, 'deadline_overdue', "ผู้รับ: $receiverSummary"));
                }
            }

            // Mark as escalated today
            $doc->update(['escalated_at' => $now]);

            $this->info("Sent {$actionType} for document {$doc->document_number} to $receiverSummary");
        }

        return Command::SUCCESS;
    }
}
