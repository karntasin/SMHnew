<?php

namespace App\Notifications;

use App\Models\LeaveRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class LeaveNotification extends Notification
{
    use Queueable;

    public function __construct(
        public LeaveRequest $leave,
        public string $event,
        public string $remark = '',
        public bool $forwardToFshhChat = true,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $this->leave->loadMissing('user');

        $messages = [
            'new_request' => "มีใบลาใหม่จาก {$this->leave->user->name} รอการอนุมัติ",
            'pending_hr' => "ใบลาเลขที่ {$this->leave->request_number} ผ่านหัวหน้าแล้ว รอฝ่ายธุรการตรวจสอบ",
            'hr_review' => "ใบลาเลขที่ {$this->leave->request_number} จาก {$this->leave->user->name} รอตรวจสอบวันลาและวันลาคงเหลือ",
            'pending_director' => "ใบลาเลขที่ {$this->leave->request_number} รอผู้อำนวยการลงนาม",
            'approved' => "ใบลาเลขที่ {$this->leave->request_number} ได้รับการอนุมัติแล้ว",
            'rejected' => "ใบลาเลขที่ {$this->leave->request_number} ไม่ได้รับอนุมัติ"
                .($this->remark !== '' ? "\nเหตุผล: {$this->remark}" : ''),
        ];

        $titles = [
            'new_request' => 'มีใบลาใหม่',
            'pending_hr' => 'ใบลารอฝ่ายธุรการตรวจสอบ',
            'hr_review' => 'ใบลารอฝ่ายธุรการตรวจสอบ',
            'pending_director' => 'ใบลารอผู้อำนวยการลงนาม',
            'approved' => 'ใบลาได้รับการอนุมัติ',
            'rejected' => 'ใบลาไม่ได้รับอนุมัติ',
        ];

        return [
            'type' => 'leave',
            'event' => $this->event,
            'leave_request_id' => $this->leave->id,
            'request_number' => $this->leave->request_number,
            'title' => $titles[$this->event] ?? 'แจ้งเตือนระบบลา',
            'message' => $messages[$this->event] ?? "มีการอัปเดตใบลา {$this->leave->request_number}",
            'url' => "/administration/leave/{$this->leave->id}",
        ];
    }
}
