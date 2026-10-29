<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const INITIAL_PASSWORD = '123456';

    private const LEGACY_ADMIN_RESET = 'ResetPasswordNya';

    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('must_change_password')->default(false)->after('password');
            $table->timestamp('password_changed_at')->nullable()->after('must_change_password');
        });

        $hashedInitial = Hash::make(self::INITIAL_PASSWORD);

        foreach (DB::table('users')->whereNotNull('line_id')->where('line_id', '!=', '')->cursor() as $row) {
            $email = strtolower(trim((string) $row->email));
            $name = trim((string) ($row->name ?? ''));
            $profileCompleted = (bool) ($row->profile_completed ?? false);
            $password = (string) ($row->password ?? '');

            $isLineLoginEmail = str_ends_with($email, '@line.login');
            $isIncompleteStub = ! $profileCompleted && ($isLineLoginEmail || $name === '');
            $isLegacyAdminReset = $password !== '' && Hash::check(self::LEGACY_ADMIN_RESET, $password);
            $alreadyInitial = $password !== '' && Hash::check(self::INITIAL_PASSWORD, $password);

            if ($isLineLoginEmail || $isLegacyAdminReset || $isIncompleteStub) {
                DB::table('users')->where('id', $row->id)->update([
                    'password' => $alreadyInitial ? $password : $hashedInitial,
                    'must_change_password' => true,
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['must_change_password', 'password_changed_at']);
        });
    }
};
