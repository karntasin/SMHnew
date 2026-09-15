<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule document reminders every 15 minutes
Schedule::command('documents:send-reminders')->everyFifteenMinutes();
Schedule::command('equipment-borrowing:send-reminders')->hourly();
Schedule::command('hosxp:check-connection')->everyFifteenMinutes();
Schedule::command('hosxp:run-scheduled-reports')->hourly();
Schedule::command('server:monitor')->everyMinute();
Schedule::command('fortigate:poll')->everyFiveMinutes();
Schedule::command('fortigate:prune')->dailyAt('03:20')->timezone('Asia/Bangkok');
Schedule::command('threat-intel:sync --prune')->dailyAt('04:10')->timezone('Asia/Bangkok');
Schedule::command('fshh-chat:sync-ai')->everyTenMinutes();
Schedule::command('im:sync-timesheets')->hourly();
Schedule::command('pharmacy:send-egfr-telegram-alerts')->everyMinute()->timezone('Asia/Bangkok')->withoutOverlapping(5);
Schedule::command('pharmacy:sync-dispense-stock --notify')->everyFiveMinutes()->timezone('Asia/Bangkok')->withoutOverlapping(10);
Schedule::command('pharmacy:send-stock-telegram-alerts')->hourly()->timezone('Asia/Bangkok');
Schedule::command('hosxp:backup')->dailyAt('00:10')->timezone('Asia/Bangkok');
Schedule::command('appdb:backup')->dailyAt('05:00')->timezone('Asia/Bangkok');
