<?php

namespace App\Console\Commands;

use App\Models\MedicalEquipmentBorrowing;
use App\Services\MedicalEquipmentNotificationService;
use Illuminate\Console\Command;

class SendEquipmentBorrowingReminders extends Command
{
    protected $signature = 'equipment-borrowing:send-reminders';

    protected $description = 'Send pickup/return reminders and mark overdue equipment borrowings';

    public function handle(MedicalEquipmentNotificationService $notificationService): int
    {
        $now = now()->timezone('Asia/Bangkok');

        MedicalEquipmentBorrowing::with(['borrower', 'equipment'])
            ->where('status', 'approved')
            ->where('reminder_sent', false)
            ->chunkById(50, function ($borrowings) use ($notificationService, $now) {
                foreach ($borrowings as $borrowing) {
                    $scheduled = $borrowing->borrowScheduledCarbon();
                    if (! $scheduled) {
                        continue;
                    }

                    $hoursUntil = $now->diffInHours($scheduled, false);
                    if ($hoursUntil >= 0 && $hoursUntil <= 24) {
                        $notificationService->notifyBorrower($borrowing, 'reminder_pickup');
                        $borrowing->update(['reminder_sent' => true]);
                    }
                }
            });

        MedicalEquipmentBorrowing::with(['borrower', 'equipment'])
            ->whereIn('status', ['borrowed', 'overdue'])
            ->chunkById(50, function ($borrowings) use ($notificationService, $now) {
                foreach ($borrowings as $borrowing) {
                    $due = $borrowing->expectedReturnScheduledCarbon();
                    if (! $due) {
                        continue;
                    }

                    $hoursUntil = $now->diffInHours($due, false);
                    if ($hoursUntil >= 0 && $hoursUntil <= 24) {
                        $notificationService->notifyBorrower($borrowing, 'reminder_return');
                    }
                }
            });

        MedicalEquipmentBorrowing::with(['borrower', 'equipment'])
            ->whereIn('status', ['borrowed', 'approved'])
            ->where('overdue_notified', false)
            ->chunkById(50, function ($borrowings) use ($notificationService, $now) {
                foreach ($borrowings as $borrowing) {
                    $due = $borrowing->expectedReturnScheduledCarbon();
                    if (! $due || $due->gte($now)) {
                        continue;
                    }

                    $borrowing->update(['status' => 'overdue']);
                    $notificationService->notifyBorrower($borrowing, 'overdue');
                    $notificationService->notifyAdmins($borrowing, 'overdue');
                    $borrowing->update(['overdue_notified' => true]);
                }
            });

        $this->info('Equipment borrowing reminders processed.');

        return self::SUCCESS;
    }
}
