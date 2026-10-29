<?php

namespace App\Console\Commands;

use App\Services\Calendar\CalendarNotificationService;
use Illuminate\Console\Command;

class SendCalendarRemindersCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'calendar:send-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check and send due calendar reminders via S-Chat and in-app system';

    /**
     * Execute the console command.
     */
    public function handle(CalendarNotificationService $notificationService): int
    {
        $count = $notificationService->processDueReminders();
        $this->info("Processed {$count} calendar reminders.");

        return Command::SUCCESS;
    }
}
