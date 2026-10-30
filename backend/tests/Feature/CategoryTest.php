<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('authenticated users can list categories', function () {
    $user = User::factory()->cashier()->create();
    $parent = Category::factory()->create(['name' => 'Hardware']);
    Category::factory()->create(['name' => 'CPUs', 'parent_id' => $parent->id]);

    $response = $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/categories');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                '*' => ['id', 'name', 'slug', 'parent_id'],
            ],
        ]);
});

test('admin can create category', function () {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson('/api/v1/categories', [
            'name' => 'Storage Devices',
            'description' => 'Solid state drives and hard drives',
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'Storage Devices')
        ->assertJsonPath('data.slug', 'storage-devices');

    $this->assertDatabaseHas('categories', [
        'name' => 'Storage Devices',
    ]);
});

test('manager can create category', function () {
    $manager = User::factory()->manager()->create();

    $response = $this->actingAs($manager, 'sanctum')
        ->postJson('/api/v1/categories', [
            'name' => 'Networking Hubs',
        ]);

    $response->assertStatus(201);
});

test('cashier cannot create category', function () {
    $cashier = User::factory()->cashier()->create();

    $response = $this->actingAs($cashier, 'sanctum')
        ->postJson('/api/v1/categories', [
            'name' => 'Unauthorized Category',
        ]);

    $response->assertStatus(403);
});

test('admin can update category', function () {
    $admin = User::factory()->admin()->create();
    $category = Category::factory()->create(['name' => 'Old Name']);

    $response = $this->actingAs($admin, 'sanctum')
        ->putJson("/api/v1/categories/{$category->id}", [
            'name' => 'Updated Name',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.name', 'Updated Name');

    $this->assertDatabaseHas('categories', [
        'id' => $category->id,
        'name' => 'Updated Name',
    ]);
});

test('cashier cannot update category', function () {
    $cashier = User::factory()->cashier()->create();
    $category = Category::factory()->create();

    $response = $this->actingAs($cashier, 'sanctum')
        ->putJson("/api/v1/categories/{$category->id}", [
            'name' => 'Forbidden Update',
        ]);

    $response->assertStatus(403);
});

test('cannot delete category that contains products', function () {
    $admin = User::factory()->admin()->create();
    $category = Category::factory()->create();
    Product::factory()->create(['category_id' => $category->id]);

    $response = $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/v1/categories/{$category->id}");

    $response->assertStatus(422)
        ->assertJsonFragment(['message' => 'Cannot delete category that contains products. Reassign or delete products first.']);

    $this->assertDatabaseHas('categories', ['id' => $category->id]);
});

test('admin can delete empty category', function () {
    $admin = User::factory()->admin()->create();
    $category = Category::factory()->create();

    $response = $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/v1/categories/{$category->id}");

    $response->assertStatus(200);
    $this->assertDatabaseMissing('categories', ['id' => $category->id]);
});
