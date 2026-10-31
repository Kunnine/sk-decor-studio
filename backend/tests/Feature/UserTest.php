<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('admin can list users with pagination and search', function () {
    $admin = User::factory()->admin()->create();
    User::factory()->create(['name' => 'Alice Worker', 'email' => 'alice@work.test']);
    User::factory()->count(3)->create();

    $response = $this->actingAs($admin, 'sanctum')->getJson('/api/v1/users?search=Alice');

    $response->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Alice Worker');
});

test('admin can create user', function () {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/users', [
        'name' => 'Bob Manager',
        'email' => 'bob@inventory.test',
        'password' => 'SecurePass123!',
        'role' => 'manager',
        'is_active' => true,
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.email', 'bob@inventory.test')
        ->assertJsonPath('data.role', 'manager');

    $this->assertDatabaseHas('users', ['email' => 'bob@inventory.test']);
});

test('admin can toggle active status of user', function () {
    $admin = User::factory()->admin()->create();
    $cashier = User::factory()->cashier()->create(['is_active' => true]);

    $response = $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/v1/users/{$cashier->id}/toggle-active");

    $response->assertStatus(200)
        ->assertJsonPath('data.is_active', false);

    expect($cashier->fresh()->is_active)->toBeFalse();
});

test('admin cannot deactivate themselves', function () {
    $admin = User::factory()->admin()->create(['is_active' => true]);

    $response = $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/v1/users/{$admin->id}/toggle-active");

    $response->assertStatus(422)
        ->assertJsonPath('message', 'You cannot deactivate your own account.');

    expect($admin->fresh()->is_active)->toBeTrue();
});

test('manager and cashier cannot access user management endpoints', function () {
    $manager = User::factory()->manager()->create();
    $cashier = User::factory()->cashier()->create();

    $this->actingAs($manager, 'sanctum')->getJson('/api/v1/users')->assertStatus(403);
    $this->actingAs($cashier, 'sanctum')->getJson('/api/v1/users')->assertStatus(403);
});
