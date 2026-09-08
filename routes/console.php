<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule document reminders every 15 minutes
Schedule::command('documents:send-reminders')->everyFifteenMinutes();
Schedule::command('hosxp:backup')->dailyAt('00:10')->timezone('Asia/Bangkok');
Schedule::command('appdb:backup')->dailyAt('05:00')->timezone('Asia/Bangkok');

