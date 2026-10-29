<?php

namespace Database\Seeders;

use App\Models\CalendarEvent;
use App\Models\Menu;
use App\Models\User;
use App\Services\Calendar\CalendarService;
use Illuminate\Database\Seeder;

class CalendarInitialSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Add / Update Menu in app_db
        Menu::updateOrCreate(
            ['route' => '/calendar'],
            [
                'title' => 'ปฏิทินงาน (Calendar)',
                'icon' => 'Calendar',
                'order' => 4,
                'permission_name' => null, // Accessible by all authenticated staff
            ]
        );

        // 2. Find a user to assign seed events to
        $user = User::query()->first();
        if (! $user) {
            $user = User::create([
                'name' => 'ผู้ดูแลระบบ',
                'email' => 'admin@fshh.local',
                'password' => bcrypt('password'),
            ]);
        }

        // 3. Seed tomorrow's events if none exist yet
        $calendarService = app(CalendarService::class);
        $seededCount = $calendarService->seedTomorrowEvents($user);

        echo "Menu seeded: /calendar\n";
        echo "Events seeded: {$seededCount} events for user {$user->name} (ID: {$user->id})\n";
    }
}
