<?php

namespace Tests\Feature\Auth;

use App\Models\StaffRoster;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::findOrCreate('user', 'web');
        Role::findOrCreate('admin', 'web');
    }

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_email_registration_is_rejected(): void
    {
        StaffRoster::query()->create([
            'first_name' => 'ทดสอบ',
            'last_name' => 'ระบบ',
            'cid' => '1100500033487',
            'phone' => '0812345678',
            'position' => 'เจ้าหน้าที่',
            'role_name' => 'user',
            'is_active' => true,
        ]);

        $response = $this->from('/register')->post('/register', [
            'first_name' => 'ทดสอบ',
            'last_name' => 'ระบบ',
            'phone' => '0812345678',
            'position' => 'เจ้าหน้าที่',
            'email' => 'test@example.com',
            'cid' => '1100500033487',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ]);

        $this->assertGuest();
        $response->assertRedirect(route('register', absolute: false));
        $response->assertSessionHasErrors('line');
        $this->assertDatabaseMissing('users', ['email' => 'test@example.com']);
    }
}
