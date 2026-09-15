<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * @deprecated Menus moved under PharmacyMenusSeeder (เภสัชกรรม)
 */
class RduMenusSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(PharmacyMenusSeeder::class);
    }
}
