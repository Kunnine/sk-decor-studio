<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('user can login with valid credentials and receive permissions and settings', function () {
    $user = User::factory()->admin()->create([
        'email' => 'admin@test.com',
        'password' => 'secret123',
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'admin@test.com',
        'password' => 'secret123',
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'message',
            'token',
            'user' => ['id', 'name', 'email', 'role', 'permissions'],
            'permissions',
            'settings',
        ])
        ->assertJsonPath('user.email', 'admin@test.com')
        ->assertJsonPath('user.role', 'admin');

    expect($response->json('permissions'))->toContain('settings.manage');
});

test('user cannot login with invalid credentials', function () {
    $user = User::factory()->create([
        'email' => 'valid@test.com',
        'password' => 'secret123',
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'valid@test.com',
        'password' => 'wrong-password',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['email']);
});

test('deactivated user cannot login', function () {
    $user = User::factory()->create([
        'email' => 'deactivated@test.com',
        'password' => 'secret123',
        'is_active' => false,
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'deactivated@test.com',
        'password' => 'secret123',
    ]);

    $response->assertStatus(403)
        ->assertJsonPath('message', 'Your account has been deactivated. Please contact an administrator.');
});

test('authenticated user can retrieve own profile with permissions and dynamic settings', function () {
    $user = User::factory()->manager()->create();

    $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/me');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'user' => ['id', 'name', 'email', 'role'],
            'permissions',
            'settings',
        ]);

    expect($response->json('permissions'))->toContain('products.manage');
    expect($response->json('permissions'))->not->toContain('settings.manage');
});

test('unauthenticated user cannot access me endpoint', function () {
    $response = $this->getJson('/api/v1/me');

    $response->assertStatus(401);
});

test('user can logout and token is revoked', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/logout');

    $response->assertStatus(200)
        ->assertJsonPath('message', 'Logged out successfully');

    expect($user->tokens()->count())->toBe(0);
});
