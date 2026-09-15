<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fortigate_security_logs', function (Blueprint $table) {
            $table->string('device_name', 160)->nullable()->after('srcip');
            $table->string('src_user', 120)->nullable()->after('device_name');
            $table->string('src_mac', 32)->nullable()->after('src_user');
            $table->unsignedInteger('src_port')->nullable()->after('src_mac');
            $table->unsignedInteger('dst_port')->nullable()->after('src_port');
            $table->boolean('is_ti_hit')->default(false)->after('is_threat');
            $table->boolean('is_risky_port')->default(false)->after('is_ti_hit');
            $table->string('ti_feed', 64)->nullable()->after('is_risky_port');
            $table->string('ti_indicator', 512)->nullable()->after('ti_feed');
            $table->string('ti_threat_type', 120)->nullable()->after('ti_indicator');

            $table->index(['is_ti_hit', 'logged_at']);
            $table->index(['is_risky_port', 'logged_at']);
            $table->index('device_name');
        });

        Schema::create('threat_intel_indicators', function (Blueprint $table) {
            $table->id();
            $table->string('feed', 64);
            $table->string('indicator_type', 16); // ip | domain | url | cidr | port
            $table->string('value', 512);
            $table->string('threat_type', 120)->nullable();
            $table->unsignedTinyInteger('confidence')->default(70);
            $table->string('country', 8)->nullable();
            $table->json('meta')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('first_seen_at')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->unique(['feed', 'indicator_type', 'value'], 'ti_feed_type_value_unique');
            $table->index(['indicator_type', 'value']);
            $table->index(['feed', 'is_active']);
            $table->index(['is_active', 'indicator_type']);
        });

        Schema::create('threat_intel_sync_runs', function (Blueprint $table) {
            $table->id();
            $table->string('feed', 64);
            $table->string('status', 24)->default('running');
            $table->unsignedInteger('fetched')->default(0);
            $table->unsignedInteger('upserted')->default(0);
            $table->text('message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();

            $table->index(['feed', 'started_at']);
        });

        Schema::create('fortigate_host_cache', function (Blueprint $table) {
            $table->id();
            $table->string('ip', 64);
            $table->string('hostname', 160)->nullable();
            $table->string('mac', 32)->nullable();
            $table->string('source', 40)->default('dhcp');
            $table->timestamp('seen_at');
            $table->timestamps();

            $table->unique('ip');
            $table->index('hostname');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fortigate_host_cache');
        Schema::dropIfExists('threat_intel_sync_runs');
        Schema::dropIfExists('threat_intel_indicators');

        Schema::table('fortigate_security_logs', function (Blueprint $table) {
            $table->dropIndex(['is_ti_hit', 'logged_at']);
            $table->dropIndex(['is_risky_port', 'logged_at']);
            $table->dropIndex(['device_name']);
            $table->dropColumn([
                'device_name',
                'src_user',
                'src_mac',
                'src_port',
                'dst_port',
                'is_ti_hit',
                'is_risky_port',
                'ti_feed',
                'ti_indicator',
                'ti_threat_type',
            ]);
        });
    }
};
