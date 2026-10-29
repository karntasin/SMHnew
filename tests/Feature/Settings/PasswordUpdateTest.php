<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_password_can_be_updated_without_current_password()
    {
        $user = User::factory()->create([
            'email' => 'user@example.com',
        ]);

        $response = $this
            ->actingAs($user)
            ->from('/settings/password')
            ->put('/settings/password', [
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/menus-hub');

        $user->refresh();
        $this->assertTrue(Hash::check('new-password', $user->password));
        $this->assertFalse($user->must_change_password);
        $this->assertNotNull($user->password_changed_at);
    }

    public function test_username_required_when_no_real_email()
    {
        $user = User::factory()->create([
            'email' => 'abc123@line.login',
            'username' => null,
            'must_change_password' => true,
        ]);

        $response = $this
            ->actingAs($user)
            ->from('/settings/password')
            ->put('/settings/password', [
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ]);

        $response
            ->assertSessionHasErrors('username')
            ->assertRedirect('/settings/password');
    }

    public function test_initial_password_cannot_be_reused()
    {
        $user = User::factory()->create([
            'must_change_password' => true,
        ]);

        $response = $this
            ->actingAs($user)
            ->from('/settings/password')
            ->put('/settings/password', [
                'password' => User::INITIAL_PASSWORD,
                'password_confirmation' => User::INITIAL_PASSWORD,
            ]);

        $response
            ->assertSessionHasErrors('password')
            ->assertRedirect('/settings/password');
    }
}
