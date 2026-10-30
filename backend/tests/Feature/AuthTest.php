<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('user can login with valid credentials', function () {
    $user = User::factory()->create([
        'email' => 'admin@inventory.test',
        'password' => bcrypt('Password123!'),
        'role' => User::ROLE_ADMIN,
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'admin@inventory.test',
        'password' => 'Password123!',
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'message',
            'token',
            'user' => ['id', 'name', 'email', 'role'],
        ])
        ->assertJson([
            'user' => [
                'email' => 'admin@inventory.test',
                'role' => User::ROLE_ADMIN,
            ],
        ]);

    expect($response->json('token'))->toBeString();
});

test('user cannot login with invalid credentials', function () {
    User::factory()->create([
        'email' => 'admin@inventory.test',
        'password' => bcrypt('Password123!'),
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'admin@inventory.test',
        'password' => 'WrongPassword',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['email']);
});

test('authenticated user can retrieve own profile via me endpoint', function () {
    $user = User::factory()->create([
        'role' => User::ROLE_MANAGER,
    ]);

    $response = $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/auth/me');

    $response->assertStatus(200)
        ->assertJson([
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'role' => User::ROLE_MANAGER,
            ],
        ]);
});

test('unauthenticated user cannot access me endpoint', function () {
    $response = $this->getJson('/api/v1/auth/me');

    $response->assertStatus(401);
});

test('user can logout and token is revoked', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/auth/logout');

    $response->assertStatus(200)
        ->assertJson(['message' => 'Logged out successfully']);

    expect($user->tokens()->count())->toBe(0);
});
