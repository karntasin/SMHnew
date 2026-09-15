<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class HosxpScheduledReportReadyNotification extends Notification
{
    use Queueable;

    public function __construct(
        private string $reportName,
        private string $fileName,
        private string $downloadUrl,
    ) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'hosxp_scheduled_report',
            'title' => 'รายงาน HOSxP พร้อมดาวน์โหลด',
            'message' => $this->reportName.' — '.$this->fileName,
            'url' => $this->downloadUrl,
            'urgent' => false,
        ];
    }
}
