<?php

namespace App\Services\FshhChat;

use App\Models\Department;
use App\Models\Document;
use App\Models\LeaveRequest;
use App\Models\MedicalEquipmentBorrowing;
use App\Models\RoomBooking;

class AdminHubChatNotifier
{
    public function __construct(
        protected readonly FshhChatSyncService $chat,
    ) {}

    public function roomBookingCreated(RoomBooking $booking): void
    {
        $booking->loadMissing(['room', 'user']);
        $start = optional($booking->start_time)->format('d/m/Y H:i') ?? '-';
        $end = optional($booking->end_time)->format('H:i') ?? '-';

        $this->chat->notifyCard(
            $this->chat->itDepartment(),
            'คำขอจองห้องประชุมใหม่',
            [
                'ผู้จอง' => $booking->user?->display_name ?: 'ไม่ระบุ',
                'ห้อง' => $booking->room?->name ?: 'ไม่ระบุ',
                'หัวข้อ' => $booking->title,
                'วันเวลา' => $start.' - '.$end,
                'ผู้เข้าร่วม' => $booking->attendees_count ? (string) $booking->attendees_count.' คน' : '',
            ],
            '#3B82F6',
        );
    }

    public function documentToDepartment(Document $document, Department $department, string $action, string $actorName = ''): void
    {
        $titles = [
            'forward' => 'มีหนังสือส่งถึงแผนก',
            'approve' => 'ผู้อำนวยการอนุมัติหนังสือแล้ว',
            'reject' => 'ผู้อำนวยการไม่อนุมัติหนังสือ',
            'acknowledged' => 'แผนกรับหนังสือแล้ว',
            'implementation_update' => 'แผนกอัปเดตการปฏิบัติหนังสือ',
            'return_origin' => 'แผนกแจ้งไม่เกี่ยวข้อง',
            'completed' => 'หนังสือดำเนินการเสร็จสิ้น',
        ];

        $this->chat->notifyCard(
            $department,
            $titles[$action] ?? 'แจ้งเตือนหนังสือ',
            [
                'เลขที่' => $document->document_number,
                'เรื่อง' => $document->title,
                'ผู้ดำเนินการ' => $actorName,
                'แผนก' => $department->name,
            ],
            in_array($action, ['reject', 'return_origin'], true) ? '#EF4444' : '#8B5CF6',
            in_array($action, ['reject', 'return_origin'], true) ? 'เร่งด่วน' : '',
        );
    }

    public function leavePendingHr(LeaveRequest $leave): void
    {
        $leave->loadMissing(['user', 'leaveType']);

        $this->chat->notifyCard(
            $this->chat->adminDepartment(),
            'ใบลารอฝ่ายธุรการตรวจสอบ',
            [
                'เลขที่' => $leave->request_number,
                'ผู้ลา' => $leave->user?->display_name ?: 'ไม่ระบุ',
                'ประเภท' => $leave->leaveType?->name ?: '-',
                'ช่วงวันที่' => trim((optional($leave->start_date)->format('d/m/Y') ?? '-').' - '.(optional($leave->end_date)->format('d/m/Y') ?? '-')),
            ],
            '#F43F5E',
        );
    }

    public function equipmentCreated(MedicalEquipmentBorrowing $borrowing): void
    {
        $borrowing->loadMissing(['equipment', 'borrower']);

        $this->chat->notifyCard(
            $this->chat->adminDepartment(),
            'มีคำขอยืมอุปกรณ์ใหม่',
            [
                'เลขที่' => $borrowing->borrowing_number,
                'ผู้ยืม' => $borrowing->borrower?->display_name ?: 'ไม่ระบุ',
                'อุปกรณ์' => $borrowing->equipment?->name ?: 'อุปกรณ์',
                'จำนวน' => (string) $borrowing->quantity,
                'กำหนดคืน' => optional($borrowing->expected_return_date)->format('d/m/Y') ?? '-',
            ],
            '#14B8A6',
            'เร่งด่วน',
        );
    }

    public function equipmentOverdue(MedicalEquipmentBorrowing $borrowing): void
    {
        $borrowing->loadMissing(['equipment', 'borrower']);

        $this->chat->notifyCard(
            $this->chat->adminDepartment(),
            'เลยกำหนดคืนอุปกรณ์',
            [
                'เลขที่' => $borrowing->borrowing_number,
                'ผู้ยืม' => $borrowing->borrower?->display_name ?: 'ไม่ระบุ',
                'อุปกรณ์' => $borrowing->equipment?->name ?: 'อุปกรณ์',
                'กำหนดคืน' => optional($borrowing->expected_return_date)->format('d/m/Y') ?? '-',
            ],
            '#EF4444',
            'วิกฤต',
        );
    }
}
