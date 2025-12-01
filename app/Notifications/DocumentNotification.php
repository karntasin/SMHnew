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

    public function __construct(Document $document, string $action, string $actorName = '')
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
            'approve' => 'หนังสือได้รับการอนุมัติ/สั่งการแล้ว',
            'reject' => 'หนังสือถูกตีกลับ/ไม่อนุมัติ',
            'circular' => 'แจ้งเวียนหนังสือเพื่อทราบ',
            'acknowledged' => 'หนังสือได้รับการรับทราบแล้ว',
            'reminder_sender' => '⚠️ หนังสือยังไม่ได้รับการรับทราบเกิน 3 ชั่วโมง',
            'reminder_receiver' => '⚠️ คุณมีหนังสือรอรับทราบเกิน 3 ชั่วโมง',
        ];

        $title = $messages[$this->action] ?? 'แจ้งเตือนระบบหนังสือ';
        $message = "{$this->document->document_number}: {$this->document->title}";
        
        if ($this->actorName) {
            $message .= " (โดย {$this->actorName})";
        }

        $isUrgent = in_array($this->action, ['submit_boss', 'approve', 'reminder_sender', 'reminder_receiver']);

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
