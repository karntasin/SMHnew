<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        // Change the column to VARCHAR(255) to allow more flexible statuses
        // and match the original migration intent.
        DB::statement("ALTER TABLE maintenance_requests MODIFY COLUMN status VARCHAR(255) NOT NULL DEFAULT 'pending'");
    }

    public function down()
    {
        // Revert back to ENUM if needed (optional, but good practice)
        DB::statement("ALTER TABLE maintenance_requests MODIFY COLUMN status ENUM('pending','assigned','in_progress','on_hold','completed','cancelled') NOT NULL DEFAULT 'pending'");
    }
};
