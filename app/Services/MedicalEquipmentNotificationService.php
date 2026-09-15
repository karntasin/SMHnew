<?php

namespace App\Services;

use App\Models\MedicalEquipmentBorrowing;
use App\Models\User;
use App\Notifications\MedicalEquipmentBorrowingNotification;
use App\Services\FshhChat\AdminHubChatNotifier;
use Illuminate\Support\Facades\Auth;

class MedicalEquipmentNotificationService
{
    public function notifyBorrower(MedicalEquipmentBorrowing $borrowing, string $action): void
    {
        $borrowing->borrower?->notify(new MedicalEquipmentBorrowingNotification($borrowing, $action));
    }

    public function notifyAdmins(MedicalEquipmentBorrowing $borrowing, string $action): void
    {
        $admins = User::role(['admin', 'Admin', 'header', 'Header'])->get();

        foreach ($admins as $admin) {
            if ((int) $admin->id === (int) Auth::id() || (int) $admin->id === (int) $borrowing->user_id) {
                continue;
            }
            $forwardChat = ! in_array($action, ['created', 'overdue'], true);
            $admin->notify(new MedicalEquipmentBorrowingNotification($borrowing, $action, $forwardChat));
        }

        $chat = app(AdminHubChatNotifier::class);
        if ($action === 'overdue') {
            $chat->equipmentOverdue($borrowing);
        } elseif ($action === 'created') {
            $chat->equipmentCreated($borrowing);
        }
    }

    public function notifyBorrowing(MedicalEquipmentBorrowing $borrowing, string $action, bool $toBorrower = true, bool $toAdmins = false): void
    {
        if ($toBorrower) {
            $this->notifyBorrower($borrowing, $action);
        }

        if ($toAdmins) {
            $this->notifyAdmins($borrowing, $action);
        }
    }
}
