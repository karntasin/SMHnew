<?php

namespace App\Notifications;

use App\Models\MedicalEquipmentBorrowing;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class MedicalEquipmentBorrowingNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected MedicalEquipmentBorrowing $borrowing,
        protected string $action = 'created',
        public bool $forwardToFshhChat = true,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $equipmentName = $this->borrowing->equipment?->name ?? 'อุปกรณ์';
        $borrowerName = $this->borrowing->borrower?->name ?? 'ผู้ยืม';

        $messages = [
            'created' => 'มีคำขอยืมอุปกรณ์ใหม่',
            'approved' => 'คำขอยืมอุปกรณ์ได้รับการอนุมัติ',
            'rejected' => 'คำขอยืมอุปกรณ์ถูกปฏิเสธ',
            'issued' => 'อุปกรณ์พร้อมให้รับ / มอบอุปกรณ์แล้ว',
            'returned' => 'คืนอุปกรณ์เรียบร้อย',
            'cancelled' => 'ยกเลิกคำขอยืมอุปกรณ์',
            'reminder_pickup' => 'ใกล้ถึงเวลามารับอุปกรณ์',
            'reminder_return' => 'ใกล้ถึงกำหนดคืนอุปกรณ์',
            'overdue' => 'เลยกำหนดคืนอุปกรณ์',
        ];

        return [
            'title' => $messages[$this->action] ?? 'ระบบยืมอุปกรณ์',
            'message' => sprintf(
                '%s: %s x%d — %s (กำหนดคืน %s)',
                $this->borrowing->borrowing_number,
                $equipmentName,
                $this->borrowing->quantity,
                $borrowerName,
                $this->borrowing->expected_return_date?->format('d/m/Y') ?? '-'
            ),
            'action_url' => route('equipment-borrowing.borrowings.show', $this->borrowing->id),
            'action_text' => 'ดูรายละเอียด',
            'type' => 'equipment_borrowing',
            'action_type' => $this->action,
            'borrowing_id' => $this->borrowing->id,
            'borrowing_number' => $this->borrowing->borrowing_number,
            'priority' => in_array($this->action, ['overdue', 'created'], true) ? 'high' : 'normal',
        ];
    }
}
