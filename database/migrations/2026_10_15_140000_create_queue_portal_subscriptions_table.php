<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('mysql')->create('queue_portal_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->string('endpoint', 512)->unique();
            $table->string('p256dh');
            $table->string('auth_token');
            $table->string('oqueue', 12);
            $table->date('visit_date');
            $table->timestamp('notified_soon_at')->nullable();
            $table->timestamp('notified_called_at')->nullable();
            $table->timestamps();

            $table->index(['visit_date', 'oqueue']);
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('queue_portal_subscriptions');
    }
};
