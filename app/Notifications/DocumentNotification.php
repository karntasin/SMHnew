<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Document;

class DocumentNotification extends Notification
{
    use Queueable;

    protected $document;
    protected $action;
    protected $actorName;

    public function __construct(Document $document, string $action, string $actorName = '', public bool $forwardToFshhChat = true)
    {
        $this->document = $document;
        $this->action = $action;
        $this->actorName = $actorName;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $messages = [
            'register' => 'มีการลงทะเบียนหนังสือใหม่',
            'forward' => 'มีหนังสือส่งต่อถึงแผนกของคุณ',
            'submit_boss' => 'มีหนังสือนำเรียนเพื่อพิจารณา',
            'approve' => 'ผู้อำนวยการอนุมัติหนังสือแล้ว',
            'reject' => 'ผู้อำนวยการไม่อนุมัติ — ส่งกลับต้นทาง',
            'circular' => 'แจ้งเวียนหนังสือเพื่อทราบ',
            'acknowledged' => 'แผนกรับหนังสือแล้ว',
            'implementation_update' => 'แผนกอัปเดตสถานะการปฏิบัติ',
            'return_origin' => 'แผนกแจ้งไม่เกี่ยวข้อง — ส่งกลับต้นทาง',
            'completed' => 'หนังสือดำเนินการเสร็จสิ้นทุกแผนก',
            'reminder_sender' => '⚠️ หนังสือยังไม่ได้รับการรับทราบเกิน 3 ชั่วโมง',
            'reminder_receiver' => '⚠️ คุณมีหนังสือรอรับทราบเกิน 3 ชั่วโมง',
        ];

        $title = $messages[$this->action] ?? 'แจ้งเตือนระบบหนังสือ';
        $message = "{$this->document->document_number}: {$this->document->title}";
        
        if ($this->actorName) {
            $message .= " (โดย {$this->actorName})";
        }

        $isUrgent = in_array($this->action, ['submit_boss', 'approve', 'reject', 'return_origin', 'reminder_sender', 'reminder_receiver']);

        return [
            'title' => $title,
            'message' => $message,
            'action_url' => route('documents.show', $this->document->id),
            'type' => 'document',
            'document_id' => $this->document->id,
            'document_number' => $this->document->document_number,
            'priority' => $isUrgent ? 'high' : 'normal',
            'is_urgent' => $isUrgent,
            'action_type' => $this->action,
        ];
    }
}
