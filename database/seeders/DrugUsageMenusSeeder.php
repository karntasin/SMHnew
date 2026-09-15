<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * @deprecated Menus moved under PharmacyMenusSeeder (เภสัชกรรม)
 */
class DrugUsageMenusSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(PharmacyMenusSeeder::class);
    }
}
