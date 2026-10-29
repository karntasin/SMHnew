<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule document reminders every 15 minutes
Schedule::command('calendar:send-reminders')->everyFiveMinutes();
Schedule::command('documents:send-reminders')->everyFifteenMinutes();
Schedule::command('documents:check-deadlines')->dailyAt('08:00')->timezone('Asia/Bangkok');
Schedule::command('pm:generate-work-orders')->dailyAt('07:30')->timezone('Asia/Bangkok');
Schedule::command('equipment-borrowing:send-reminders')->hourly();
Schedule::command('hosxp:check-connection')->everyFifteenMinutes();
Schedule::command('hosxp:run-scheduled-reports')->hourly();
Schedule::command('server:monitor')->everyMinute();
Schedule::command('fortigate:poll')->everyFiveMinutes();
Schedule::command('fortigate:prune')->dailyAt('03:20')->timezone('Asia/Bangkok');
Schedule::command('threat-intel:sync --prune')->dailyAt('04:10')->timezone('Asia/Bangkok');
Schedule::command('fshh-chat:sync-ai')->everyTenMinutes();
Schedule::command('im:sync-timesheets')->hourly();
Schedule::command('queue-portal:notify')
    ->everyFifteenSeconds()
    ->timezone('Asia/Bangkok')
    ->withoutOverlapping(2)
    ->runInBackground();

Schedule::command('pharmacy:send-egfr-telegram-alerts')
    ->everyMinute()
    ->timezone('Asia/Bangkok')
    ->withoutOverlapping(5)
    ->runInBackground();

Schedule::command('pharmacy:sync-dispense-stock --notify')
    ->everyFiveMinutes()
    ->timezone('Asia/Bangkok')
    ->withoutOverlapping(10)
    ->runInBackground();

Schedule::command('pharmacy:send-stock-telegram-alerts')
    ->hourly()
    ->timezone('Asia/Bangkok')
    ->withoutOverlapping(30)
    ->runInBackground();

// เปิดคนละโปรเซสผ่าน wscript เพื่อไม่ให้ dump ที่ใช้เวลาหลายชั่วโมงถือ handle ของ scheduler log
// กันงานซ้อนด้วยไฟล์ล็อกในคำสั่งสำรองเอง ไม่ใช้ mutex 180 นาทีที่หมดอายุทั้งที่ mysqldump ยังไม่จบ
$detachedBackup = 'wscript.exe //B //Nologo "'.str_replace('/', '\\', base_path('scripts/run-backup-detached.vbs')).'"';

Schedule::exec($detachedBackup.' hosxp')
    ->dailyAt('00:10')
    ->timezone('Asia/Bangkok');

Schedule::exec($detachedBackup.' appdb')
    ->dailyAt('05:00')
    ->timezone('Asia/Bangkok');

Schedule::exec($detachedBackup.' dotenv')
    ->dailyAt('05:30')
    ->timezone('Asia/Bangkok');
