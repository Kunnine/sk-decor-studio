<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('authenticated users can list categories and view category tree', function () {
    $cashier = User::factory()->cashier()->create();
    $root = Category::factory()->create(['name' => 'Computers', 'parent_id' => null]);
    Category::factory()->create(['name' => 'Laptops', 'parent_id' => $root->id]);

    $response = $this->actingAs($cashier, 'sanctum')->getJson('/api/v1/categories');
    $response->assertStatus(200);

    $treeResponse = $this->actingAs($cashier, 'sanctum')->getJson('/api/v1/categories/tree');
    $treeResponse->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                '*' => ['id', 'name', 'children'],
            ],
        ]);
});

test('admin and manager can create and update category', function () {
    $manager = User::factory()->manager()->create();

    $response = $this->actingAs($manager, 'sanctum')->postJson('/api/v1/categories', [
        'name' => 'Gaming Peripherals',
        'description' => 'Mice, pads, headsets',
        'sort_order' => 2,
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'Gaming Peripherals')
        ->assertJsonPath('data.slug', 'gaming-peripherals');

    $catId = $response->json('data.id');

    $update = $this->actingAs($manager, 'sanctum')->putJson("/api/v1/categories/{$catId}", [
        'name' => 'Pro Gaming Peripherals',
    ]);

    $update->assertStatus(200)
        ->assertJsonPath('data.name', 'Pro Gaming Peripherals');
});

test('category move rejects circular hierarchy cycles', function () {
    $admin = User::factory()->admin()->create();

    // A -> B -> C
    $catA = Category::factory()->create(['name' => 'Category A', 'parent_id' => null]);
    $catB = Category::factory()->create(['name' => 'Category B', 'parent_id' => $catA->id]);
    $catC = Category::factory()->create(['name' => 'Category C', 'parent_id' => $catB->id]);

    // Attempting to move A under C (its descendant) or under itself must be rejected!
    $responseUnderChild = $this->actingAs($admin, 'sanctum')
        ->postJson("/api/v1/categories/{$catA->id}/move", ['parent_id' => $catC->id]);

    $responseUnderChild->assertStatus(422)
        ->assertJsonPath('message', 'Cannot move category under itself or one of its descendants (circular hierarchy).');

    // Attempting to move A under A
    $responseUnderSelf = $this->actingAs($admin, 'sanctum')
        ->postJson("/api/v1/categories/{$catA->id}/move", ['parent_id' => $catA->id]);

    $responseUnderSelf->assertStatus(422);
});

test('cannot delete category that still has child categories', function () {
    $admin = User::factory()->admin()->create();
    $parent = Category::factory()->create();
    Category::factory()->create(['parent_id' => $parent->id]);

    $response = $this->actingAs($admin, 'sanctum')->deleteJson("/api/v1/categories/{$parent->id}");

    $response->assertStatus(422)
        ->assertJsonPath('message', 'Cannot delete category that still contains products or child subcategories.');

    $this->assertDatabaseHas('categories', ['id' => $parent->id]);
});

test('cannot delete category that has products', function () {
    $admin = User::factory()->admin()->create();
    $cat = Category::factory()->create();
    Product::factory()->create(['category_id' => $cat->id]);

    $response = $this->actingAs($admin, 'sanctum')->deleteJson("/api/v1/categories/{$cat->id}");

    $response->assertStatus(422)
        ->assertJsonPath('message', 'Cannot delete category that still contains products or child subcategories.');

    $this->assertDatabaseHas('categories', ['id' => $cat->id]);
});

test('descendant filtering works: filtering products by root category includes products in nested children', function () {
    $user = User::factory()->cashier()->create();

    // Level 1 -> Level 2 -> Level 3
    $root = Category::factory()->create(['name' => 'Electronics', 'parent_id' => null]);
    $child = Category::factory()->create(['name' => 'Computers', 'parent_id' => $root->id]);
    $grandchild = Category::factory()->create(['name' => 'Laptops', 'parent_id' => $child->id]);

    $otherRoot = Category::factory()->create(['name' => 'Food', 'parent_id' => null]);

    // Product directly in root
    $p1 = Product::factory()->create(['category_id' => $root->id, 'name' => 'Electronic Gadget']);
    // Product in child
    $p2 = Product::factory()->create(['category_id' => $child->id, 'name' => 'Desktop PC']);
    // Product in grandchild
    $p3 = Product::factory()->create(['category_id' => $grandchild->id, 'name' => 'MacBook Pro']);
    // Product in unrelated category
    $pOther = Product::factory()->create(['category_id' => $otherRoot->id, 'name' => 'Snack Bar']);

    $response = $this->actingAs($user, 'sanctum')->getJson("/api/v1/products?category_id={$root->id}");

    $response->assertStatus(200)
        ->assertJsonCount(3, 'data');

    $returnedIds = collect($response->json('data'))->pluck('id')->all();
    expect($returnedIds)->toContain($p1->id, $p2->id, $p3->id);
    expect($returnedIds)->not->toContain($pOther->id);
});

test('cashier cannot create, update, or delete categories', function () {
    $cashier = User::factory()->cashier()->create();
    $cat = Category::factory()->create();

    $this->actingAs($cashier, 'sanctum')->postJson('/api/v1/categories', ['name' => 'Hacked'])->assertStatus(403);
    $this->actingAs($cashier, 'sanctum')->putJson("/api/v1/categories/{$cat->id}", ['name' => 'Hacked'])->assertStatus(403);
    $this->actingAs($cashier, 'sanctum')->deleteJson("/api/v1/categories/{$cat->id}")->assertStatus(403);
});
